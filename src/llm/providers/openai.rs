//! OpenAI 客户端实现

use crate::config::ModelConfig;
use crate::error::{AiContractError, Result};
use crate::llm::client::LlmClient;
use crate::llm::{ChatRequest, ChatResponse, ChatMessage, MessageRole, TokenUsage};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

/// OpenAI 客户端
pub struct OpenAiClient {
    client: Client,
    api_key: String,
    base_url: String,
    models: HashMap<String, ModelConfig>,
}

impl OpenAiClient {
    /// 创建新的 OpenAI 客户端
    pub async fn new(
        api_key: String,
        base_url: Option<String>,
        models: HashMap<String, ModelConfig>,
    ) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .map_err(|e| AiContractError::llm_provider_error(format!("创建 HTTP 客户端失败: {}", e)))?;
        
        let base_url = base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string());
        
        let openai_client = Self {
            client,
            api_key,
            base_url,
            models,
        };
        
        // 验证 API 密钥
        openai_client.health_check().await?;
        
        Ok(openai_client)
    }
}

#[async_trait]
impl LlmClient for OpenAiClient {
    async fn chat(&self, request: ChatRequest) -> Result<ChatResponse> {
        let model = request.model.unwrap_or_else(|| "gpt-4o".to_string());
        
        if !self.supports_model(&model) {
            return Err(AiContractError::llm_provider_error(
                format!("不支持的模型: {}", model)
            ));
        }
        
        let model_config = self.models.get(&model)
            .ok_or_else(|| AiContractError::llm_provider_error(
                format!("找不到模型配置: {}", model)
            ))?;
        
        let openai_request = OpenAiChatRequest {
            model: model.clone(),
            messages: request.messages.into_iter().map(|msg| OpenAiMessage {
                role: match msg.role {
                    MessageRole::System => "system".to_string(),
                    MessageRole::User => "user".to_string(),
                    MessageRole::Assistant => "assistant".to_string(),
                },
                content: msg.content,
            }).collect(),
            temperature: request.temperature.or(Some(model_config.temperature)),
            max_tokens: request.max_tokens.or(Some(model_config.max_tokens)),
            top_p: model_config.top_p,
            frequency_penalty: model_config.frequency_penalty,
            presence_penalty: model_config.presence_penalty,
            stream: Some(request.stream),
        };
        
        let response = self.client
            .post(&format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&openai_request)
            .send()
            .await
            .map_err(|e| AiContractError::llm_provider_error(format!("请求失败: {}", e)))?;
        
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "未知错误".to_string());
            return Err(AiContractError::llm_provider_error(
                format!("OpenAI API 错误: {}", error_text)
            ));
        }
        
        let openai_response: OpenAiChatResponse = response.json().await
            .map_err(|e| AiContractError::llm_provider_error(format!("解析响应失败: {}", e)))?;
        
        let choice = openai_response.choices.into_iter().next()
            .ok_or_else(|| AiContractError::llm_provider_error("响应中没有选择项".to_string()))?;
        
        Ok(ChatResponse {
            message: ChatMessage {
                role: match choice.message.role.as_str() {
                    "system" => MessageRole::System,
                    "user" => MessageRole::User,
                    "assistant" => MessageRole::Assistant,
                    _ => MessageRole::Assistant,
                },
                content: choice.message.content,
            },
            usage: openai_response.usage.map(|usage| TokenUsage {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens,
            }),
            model: openai_response.model,
            finish_reason: choice.finish_reason,
        })
    }
    
    async fn health_check(&self) -> Result<()> {
        let response = self.client
            .get(&format!("{}/models", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| AiContractError::llm_provider_error(format!("健康检查失败: {}", e)))?;
        
        if response.status().is_success() {
            Ok(())
        } else {
            Err(AiContractError::llm_provider_error(
                format!("OpenAI API 不可用，状态码: {}", response.status())
            ))
        }
    }
    
    fn name(&self) -> &str {
        "OpenAI"
    }
    
    fn supported_models(&self) -> Vec<String> {
        self.models.keys().cloned().collect()
    }
}

/// OpenAI 聊天请求
#[derive(Debug, Serialize)]
struct OpenAiChatRequest {
    model: String,
    messages: Vec<OpenAiMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    frequency_penalty: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    presence_penalty: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
}

/// OpenAI 消息
#[derive(Debug, Serialize, Deserialize)]
struct OpenAiMessage {
    role: String,
    content: String,
}

/// OpenAI 聊天响应
#[derive(Debug, Deserialize)]
struct OpenAiChatResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<OpenAiChoice>,
    usage: Option<OpenAiUsage>,
}

/// OpenAI 选择项
#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    index: u32,
    message: OpenAiMessage,
    finish_reason: Option<String>,
}

/// OpenAI 使用情况
#[derive(Debug, Deserialize)]
struct OpenAiUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::ModelConfig;

    #[tokio::test]
    async fn test_openai_client_creation() {
        if let Ok(api_key) = std::env::var("OPENAI_API_KEY") {
            let mut models = HashMap::new();
            models.insert(
                "gpt-4o".to_string(),
                ModelConfig {
                    name: "gpt-4o".to_string(),
                    temperature: 0.3,
                    max_tokens: 4096,
                    top_p: Some(1.0),
                    frequency_penalty: Some(0.0),
                    presence_penalty: Some(0.0),
                },
            );
            
            let client = OpenAiClient::new(api_key, None, models).await;
            assert!(client.is_ok());
        }
    }
}