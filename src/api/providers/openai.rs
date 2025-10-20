//! OpenAI 适配器实现
//! 
//! 实现 OpenAI API 的适配器，作为标准参考实现

use async_trait::async_trait;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde_json::json;
use std::pin::Pin;
use std::time::Duration;

use crate::api::{
    ApiError, ApiResult,
    ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk,
    EmbeddingRequest, EmbeddingResponse,
};
use super::{ProviderAdapter, StreamResponse, ProviderConfig};

/// OpenAI 适配器
pub struct OpenAIAdapter {
    client: Client,
}

impl OpenAIAdapter {
    /// 创建新的 OpenAI 适配器
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .expect("Failed to create HTTP client");
            
        Self { client }
    }
}

impl Default for OpenAIAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ProviderAdapter for OpenAIAdapter {
    fn name(&self) -> &'static str {
        "openai"
    }
    
    async fn chat_completions(
        &self,
        config: &ProviderConfig,
        mut request: ChatCompletionRequest,
    ) -> ApiResult<ChatCompletionResponse> {
        // 映射模型名称
        request.model = self.map_model_name(&request.model, config);
        
        let base_url = config.base_url.as_deref().unwrap_or("https://api.openai.com/v1");
        let url = format!("{}/chat/completions", base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .timeout(Duration::from_secs(config.timeout))
            .json(&request)
            .send()
            .await
            .map_err(|e| ApiError::ProviderError(format!("OpenAI request failed: {}", e)))?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(ApiError::ProviderError(format!(
                "OpenAI API error {}: {}", status, error_text
            )));
        }
        
        let completion: ChatCompletionResponse = response
            .json()
            .await
            .map_err(|e| ApiError::ProviderError(format!("Failed to parse OpenAI response: {}", e)))?;
            
        Ok(completion)
    }
    
    async fn chat_completions_stream(
        &self,
        config: &ProviderConfig,
        mut request: ChatCompletionRequest,
    ) -> ApiResult<StreamResponse> {
        // 映射模型名称
        request.model = self.map_model_name(&request.model, config);
        request.stream = true;
        
        let base_url = config.base_url.as_deref().unwrap_or("https://api.openai.com/v1");
        let url = format!("{}/chat/completions", base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .timeout(Duration::from_secs(config.timeout))
            .json(&request)
            .send()
            .await
            .map_err(|e| ApiError::ProviderError(format!("OpenAI stream request failed: {}", e)))?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(ApiError::ProviderError(format!(
                "OpenAI stream API error {}: {}", status, error_text
            )));
        }
        
        let stream = response.bytes_stream()
            .map(|result| {
                result.map_err(|e| ApiError::ProviderError(format!("Stream error: {}", e)))
            })
            .filter_map(|chunk_result| async move {
                match chunk_result {
                    Ok(chunk) => {
                        let chunk_str = String::from_utf8_lossy(&chunk);
                        
                        // 解析 SSE 格式
                        for line in chunk_str.lines() {
                            if line.starts_with("data: ") {
                                let data = &line[6..];
                                if data == "[DONE]" {
                                    return None;
                                }
                                
                                match serde_json::from_str::<ChatCompletionChunk>(data) {
                                    Ok(chunk) => return Some(Ok(chunk)),
                                    Err(e) => return Some(Err(ApiError::ProviderError(
                                        format!("Failed to parse chunk: {}", e)
                                    ))),
                                }
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
        mut request: EmbeddingRequest,
    ) -> ApiResult<EmbeddingResponse> {
        // 映射模型名称
        request.model = self.map_model_name(&request.model, config);
        
        let base_url = config.base_url.as_deref().unwrap_or("https://api.openai.com/v1");
        let url = format!("{}/embeddings", base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .timeout(Duration::from_secs(config.timeout))
            .json(&request)
            .send()
            .await
            .map_err(|e| ApiError::ProviderError(format!("OpenAI embeddings request failed: {}", e)))?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(ApiError::ProviderError(format!(
                "OpenAI embeddings API error {}: {}", status, error_text
            )));
        }
        
        let embedding: EmbeddingResponse = response
            .json()
            .await
            .map_err(|e| ApiError::ProviderError(format!("Failed to parse OpenAI embeddings response: {}", e)))?;
            
        Ok(embedding)
    }
    
    fn map_model_name(&self, openai_model: &str, config: &ProviderConfig) -> String {
        // 首先检查配置中的自定义映射
        if let Some(mapped) = config.model_mapping.get(openai_model) {
            return mapped.clone();
        }
        
        // OpenAI 适配器直接使用原始模型名称
        openai_model.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::api::{Message, EmbeddingInput};
    
    #[test]
    fn test_openai_adapter_name() {
        let adapter = OpenAIAdapter::new();
        assert_eq!(adapter.name(), "openai");
    }
    
    #[test]
    fn test_openai_adapter_model_mapping() {
        let adapter = OpenAIAdapter::new();
        
        // 测试默认映射（应该保持原样）
        let config = ProviderConfig {
            provider_type: crate::api::providers::ProviderType::OpenAI,
            enabled: true,
            base_url: Some("https://api.openai.com/v1".to_string()),
            api_key: "test-key".to_string(),
            timeout: 30,
            priority: 1,
            weight: 1,
            model_mapping: HashMap::new(),
        };
        
        assert_eq!(adapter.map_model_name("gpt-4", &config), "gpt-4");
        assert_eq!(adapter.map_model_name("gpt-3.5-turbo", &config), "gpt-3.5-turbo");
        
        // 测试自定义映射
        let mut custom_mapping = HashMap::new();
        custom_mapping.insert("gpt-4".to_string(), "gpt-4-turbo".to_string());
        
        let config_with_mapping = ProviderConfig {
            provider_type: crate::api::providers::ProviderType::OpenAI,
            enabled: true,
            base_url: Some("https://api.openai.com/v1".to_string()),
            api_key: "test-key".to_string(),
            timeout: 30,
            priority: 1,
            weight: 1,
            model_mapping: custom_mapping,
        };
        
        assert_eq!(adapter.map_model_name("gpt-4", &config_with_mapping), "gpt-4-turbo");
    }
    
    // 注意：实际的 HTTP 测试需要 mock 服务器或集成测试环境
    // 这里只测试基本的结构和映射逻辑
}