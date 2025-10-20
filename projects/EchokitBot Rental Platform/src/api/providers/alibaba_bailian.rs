//! 阿里巴巴百炼适配器实现
//! 
//! 实现阿里巴巴百炼 API 的适配器，将 OpenAI 格式转换为百炼格式

use async_trait::async_trait;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde_json::{json, Value};
use std::pin::Pin;
use std::time::Duration;

use crate::api::{
    ApiError, ApiResult,
    ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk,
    EmbeddingRequest, EmbeddingResponse,
    Message, Choice, Usage, ChunkChoice, Delta,
    EmbeddingData, EmbeddingUsage,
};
use super::{ProviderAdapter, StreamResponse, ProviderConfig};

/// 阿里巴巴百炼适配器
pub struct AlibabaBailianAdapter {
    client: Client,
}

impl AlibabaBailianAdapter {
    /// 创建新的阿里巴巴百炼适配器
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .expect("Failed to create HTTP client");
            
        Self { client }
    }
    
    /// 将 OpenAI 格式的消息转换为百炼格式
    fn convert_messages_to_bailian(&self, messages: &[Message]) -> Value {
        let mut bailian_messages = Vec::new();
        
        for message in messages {
            let bailian_message = json!({
                "role": message.role,
                "content": message.content
            });
            bailian_messages.push(bailian_message);
        }
        
        json!(bailian_messages)
    }
    
    /// 将百炼响应转换为 OpenAI 格式
    fn convert_bailian_response_to_openai(
        &self,
        bailian_response: Value,
        model: String,
    ) -> ApiResult<ChatCompletionResponse> {
        let output = bailian_response
            .get("output")
            .ok_or_else(|| ApiError::ProviderError("Missing output in Bailian response".to_string()))?;
            
        let text = output
            .get("text")
            .and_then(|t| t.as_str())
            .ok_or_else(|| ApiError::ProviderError("Missing text in Bailian output".to_string()))?;
            
        let usage = bailian_response.get("usage");
        let prompt_tokens = usage
            .and_then(|u| u.get("input_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0) as u32;
        let completion_tokens = usage
            .and_then(|u| u.get("output_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0) as u32;
            
        Ok(ChatCompletionResponse {
            id: format!("bailian-{}", uuid::Uuid::new_v4()),
            object: "chat.completion".to_string(),
            created: chrono::Utc::now().timestamp() as u64,
            model,
            choices: vec![Choice {
                index: 0,
                message: Message {
                    role: "assistant".to_string(),
                    content: text.to_string(),
                    name: None,
                },
                finish_reason: "stop".to_string(),
            }],
            usage: Usage {
                prompt_tokens,
                completion_tokens,
                total_tokens: prompt_tokens + completion_tokens,
            },
        })
    }
}

impl Default for AlibabaBailianAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ProviderAdapter for AlibabaBailianAdapter {
    fn name(&self) -> &'static str {
        "alibaba_bailian"
    }
    
    async fn chat_completions(
        &self,
        config: &ProviderConfig,
        request: ChatCompletionRequest,
    ) -> ApiResult<ChatCompletionResponse> {
        let model = self.map_model_name(&request.model, config);
        
        // 构建百炼 API 请求
        let bailian_request = json!({
            "model": model,
            "input": {
                "messages": self.convert_messages_to_bailian(&request.messages)
            },
            "parameters": {
                "temperature": request.temperature.unwrap_or(0.7),
                "max_tokens": request.max_tokens.unwrap_or(1500),
                "top_p": request.top_p.unwrap_or(1.0)
            }
        });
        
        let base_url = config.base_url.as_deref()
            .unwrap_or("https://dashscope.aliyuncs.com/api/v1");
        let url = format!("{}/services/aigc/text-generation/generation", base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .timeout(Duration::from_secs(config.timeout))
            .json(&bailian_request)
            .send()
            .await
            .map_err(|e| ApiError::ProviderError(format!("Bailian request failed: {}", e)))?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(ApiError::ProviderError(format!(
                "Bailian API error {}: {}", status, error_text
            )));
        }
        
        let bailian_response: Value = response
            .json()
            .await
            .map_err(|e| ApiError::ProviderError(format!("Failed to parse Bailian response: {}", e)))?;
            
        self.convert_bailian_response_to_openai(bailian_response, request.model)
    }
    
    async fn chat_completions_stream(
        &self,
        config: &ProviderConfig,
        request: ChatCompletionRequest,
    ) -> ApiResult<StreamResponse> {
        let model = self.map_model_name(&request.model, config);
        
        // 构建百炼流式 API 请求
        let bailian_request = json!({
            "model": model,
            "input": {
                "messages": self.convert_messages_to_bailian(&request.messages)
            },
            "parameters": {
                "temperature": request.temperature.unwrap_or(0.7),
                "max_tokens": request.max_tokens.unwrap_or(1500),
                "top_p": request.top_p.unwrap_or(1.0),
                "incremental_output": true
            }
        });
        
        let base_url = config.base_url.as_deref()
            .unwrap_or("https://dashscope.aliyuncs.com/api/v1");
        let url = format!("{}/services/aigc/text-generation/generation", base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .header("Accept", "text/event-stream")
            .header("X-DashScope-SSE", "enable")
            .timeout(Duration::from_secs(config.timeout))
            .json(&bailian_request)
            .send()
            .await
            .map_err(|e| ApiError::ProviderError(format!("Bailian stream request failed: {}", e)))?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(ApiError::ProviderError(format!(
                "Bailian stream API error {}: {}", status, error_text
            )));
        }
        
        let model_name = request.model.clone();
        let stream = response.bytes_stream()
            .map(move |result| {
                let model_name = model_name.clone();
                result.map_err(|e| ApiError::ProviderError(format!("Stream error: {}", e)))
                    .and_then(move |chunk| {
                        let chunk_str = String::from_utf8_lossy(&chunk);
                        
                        // 解析百炼 SSE 格式
                        for line in chunk_str.lines() {
                            if line.starts_with("data:") {
                                let data = line[5..].trim();
                                if data.is_empty() || data == "[DONE]" {
                                    continue;
                                }
                                
                                match serde_json::from_str::<Value>(data) {
                                    Ok(bailian_chunk) => {
                                        // 转换为 OpenAI 格式
                                        if let Some(output) = bailian_chunk.get("output") {
                                            if let Some(text) = output.get("text").and_then(|t| t.as_str()) {
                                                return Ok(ChatCompletionChunk {
                                                    id: format!("bailian-stream-{}", uuid::Uuid::new_v4()),
                                                    object: "chat.completion.chunk".to_string(),
                                                    created: chrono::Utc::now().timestamp() as u64,
                                                    model: model_name,
                                                    choices: vec![ChunkChoice {
                                                        index: 0,
                                                        delta: Delta {
                                                            role: None,
                                                            content: Some(text.to_string()),
                                                        },
                                                        finish_reason: None,
                                                    }],
                                                });
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        return Err(ApiError::ProviderError(
                                            format!("Failed to parse Bailian chunk: {}", e)
                                        ));
                                    }
                                }
                            }
                        }
                        
                        // 如果没有找到有效数据，返回空的 chunk
                        Ok(ChatCompletionChunk {
                            id: format!("bailian-stream-{}", uuid::Uuid::new_v4()),
                            object: "chat.completion.chunk".to_string(),
                            created: chrono::Utc::now().timestamp() as u64,
                            model: model_name,
                            choices: vec![ChunkChoice {
                                index: 0,
                                delta: Delta {
                                    role: None,
                                    content: Some("".to_string()),
                                },
                                finish_reason: None,
                            }],
                        })
                    })
            })
            .filter_map(|result| async move {
                match result {
                    Ok(chunk) => {
                        // 过滤掉空内容的 chunk
                        if let Some(content) = &chunk.choices[0].delta.content {
                            if !content.is_empty() {
                                return Some(Ok(chunk));
                            }
                        }
                        None
                    }
                    Err(e) => Some(Err(e)),
                }
            });
            
        Ok(Box::pin(stream))
    }
    
    async fn embeddings(
        &self,
        config: &ProviderConfig,
        request: EmbeddingRequest,
    ) -> ApiResult<EmbeddingResponse> {
        let model = self.map_model_name(&request.model, config);
        let texts = request.get_texts();
        
        // 百炼 embeddings API 请求
        let bailian_request = json!({
            "model": model,
            "input": {
                "texts": texts
            }
        });
        
        let base_url = config.base_url.as_deref()
            .unwrap_or("https://dashscope.aliyuncs.com/api/v1");
        let url = format!("{}/services/embeddings/text-embedding/text-embedding", base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .timeout(Duration::from_secs(config.timeout))
            .json(&bailian_request)
            .send()
            .await
            .map_err(|e| ApiError::ProviderError(format!("Bailian embeddings request failed: {}", e)))?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(ApiError::ProviderError(format!(
                "Bailian embeddings API error {}: {}", status, error_text
            )));
        }
        
        let bailian_response: Value = response
            .json()
            .await
            .map_err(|e| ApiError::ProviderError(format!("Failed to parse Bailian embeddings response: {}", e)))?;
            
        // 转换为 OpenAI 格式
        let output = bailian_response
            .get("output")
            .ok_or_else(|| ApiError::ProviderError("Missing output in Bailian embeddings response".to_string()))?;
            
        let embeddings = output
            .get("embeddings")
            .and_then(|e| e.as_array())
            .ok_or_else(|| ApiError::ProviderError("Missing embeddings in Bailian output".to_string()))?;
            
        let data: Result<Vec<_>, _> = embeddings
            .iter()
            .enumerate()
            .map(|(i, embedding)| {
                let embedding_vec = embedding
                    .get("embedding")
                    .and_then(|e| e.as_array())
                    .ok_or_else(|| ApiError::ProviderError("Invalid embedding format".to_string()))?
                    .iter()
                    .map(|v| v.as_f64().unwrap_or(0.0) as f32)
                    .collect();
                    
                Ok(EmbeddingData {
                    object: "embedding".to_string(),
                    index: i as u32,
                    embedding: embedding_vec,
                })
            })
            .collect();
            
        let usage = bailian_response.get("usage");
        let total_tokens = usage
            .and_then(|u| u.get("total_tokens"))
            .and_then(|t| t.as_u64())
            .unwrap_or(0) as u32;
            
        Ok(EmbeddingResponse {
            object: "list".to_string(),
            data: data?,
            model: request.model,
            usage: EmbeddingUsage {
                prompt_tokens: total_tokens,
                total_tokens,
            },
        })
    }
    
    fn map_model_name(&self, openai_model: &str, config: &ProviderConfig) -> String {
        // 首先检查配置中的自定义映射
        if let Some(mapped) = config.model_mapping.get(openai_model) {
            return mapped.clone();
        }
        
        // 使用默认的百炼模型映射
        match openai_model {
            "gpt-4" => "qwen-turbo".to_string(),
            "gpt-3.5-turbo" => "qwen-plus".to_string(),
            "text-embedding-ada-002" => "text-embedding-v1".to_string(),
            _ => openai_model.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::api::EmbeddingInput;
    
    #[test]
    fn test_bailian_adapter_name() {
        let adapter = AlibabaBailianAdapter::new();
        assert_eq!(adapter.name(), "alibaba_bailian");
    }
    
    #[test]
    fn test_bailian_adapter_model_mapping() {
        let adapter = AlibabaBailianAdapter::new();
        
        // 测试默认映射
        let config = ProviderConfig {
            provider_type: crate::api::providers::ProviderType::AlibabaBailian,
            enabled: true,
            base_url: Some("https://dashscope.aliyuncs.com/api/v1".to_string()),
            api_key: "test-key".to_string(),
            timeout: 30,
            priority: 1,
            weight: 1,
            model_mapping: HashMap::new(),
        };
        
        assert_eq!(adapter.map_model_name("gpt-4", &config), "qwen-turbo");
        assert_eq!(adapter.map_model_name("gpt-3.5-turbo", &config), "qwen-plus");
        assert_eq!(adapter.map_model_name("text-embedding-ada-002", &config), "text-embedding-v1");
        
        // 测试自定义映射
        let mut custom_mapping = HashMap::new();
        custom_mapping.insert("gpt-4".to_string(), "qwen-max".to_string());
        
        let config_with_mapping = ProviderConfig {
            provider_type: crate::api::providers::ProviderType::AlibabaBailian,
            enabled: true,
            base_url: Some("https://dashscope.aliyuncs.com/api/v1".to_string()),
            api_key: "test-key".to_string(),
            timeout: 30,
            priority: 1,
            weight: 1,
            model_mapping: custom_mapping,
        };
        
        assert_eq!(adapter.map_model_name("gpt-4", &config_with_mapping), "qwen-max");
    }
    
    #[test]
    fn test_convert_messages_to_bailian() {
        let adapter = AlibabaBailianAdapter::new();
        let messages = vec![
            Message {
                role: "user".to_string(),
                content: "Hello".to_string(),
                name: None,
            },
            Message {
                role: "assistant".to_string(),
                content: "Hi there!".to_string(),
                name: None,
            },
        ];
        
        let bailian_messages = adapter.convert_messages_to_bailian(&messages);
        let expected = json!([
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ]);
        
        assert_eq!(bailian_messages, expected);
    }
}