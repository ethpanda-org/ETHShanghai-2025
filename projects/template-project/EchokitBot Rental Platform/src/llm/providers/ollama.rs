//! Ollama 客户端实现

use crate::config::ModelConfig;
use crate::error::{AiContractError, Result};
use crate::llm::client::LlmClient;
use crate::llm::{ChatRequest, ChatResponse, ChatMessage, MessageRole, TokenUsage};
use async_trait::async_trait;
use reqwest::Client;
use std::collections::HashMap;
use std::time::Duration;

/// Ollama 客户端
pub struct OllamaClient {
    client: Client,
    base_url: String,
    models: HashMap<String, ModelConfig>,
}

impl OllamaClient {
    /// 创建新的 Ollama 客户端
    pub async fn new(
        base_url: String,
        models: HashMap<String, ModelConfig>,
    ) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(120)) // Ollama 可能需要更长的超时时间
            .build()
            .map_err(|e| AiContractError::llm_provider_error(format!("创建 HTTP 客户端失败: {}", e)))?;
        
        let ollama_client = Self {
            client,
            base_url,
            models,
        };
        
        // 验证连接
        ollama_client.health_check().await?;
        
        Ok(ollama_client)
    }
}

#[async_trait]
impl LlmClient for OllamaClient {
    async fn chat(&self, request: ChatRequest) -> Result<ChatResponse> {
        // TODO: 实现 Ollama API 调用
        // 这里是一个简化的实现，实际需要根据 Ollama API 文档完善
        
        let model = request.model.unwrap_or_else(|| "llama2".to_string());
        
        if !self.supports_model(&model) {
            return Err(AiContractError::llm_provider_error(
                format!("不支持的模型: {}", model)
            ));
        }
        
        // 暂时返回一个模拟响应
        Ok(ChatResponse {
            message: ChatMessage {
                role: MessageRole::Assistant,
                content: "Ollama 客户端暂未完全实现".to_string(),
            },
            usage: Some(TokenUsage {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            }),
            model,
            finish_reason: Some("stop".to_string()),
        })
    }
    
    async fn health_check(&self) -> Result<()> {
        // TODO: 实现 Ollama 健康检查
        // 暂时返回成功
        Ok(())
    }
    
    fn name(&self) -> &str {
        "Ollama"
    }
    
    fn supported_models(&self) -> Vec<String> {
        self.models.keys().cloned().collect()
    }
}