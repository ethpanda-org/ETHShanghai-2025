//! LLM 提供商管理模块
//! 
//! 提供统一的 LLM 接口，支持多个提供商和故障转移

pub mod client;
pub mod providers;
pub mod failover;

pub use client::LlmClient;
pub use providers::*;
pub use failover::FailoverManager;

use crate::config::{LlmProvidersConfig, LlmProvider, LlmProviderType};
use crate::error::{AiContractError, Result};
use std::sync::Arc;
use tokio::sync::RwLock;

/// LLM 管理器
pub struct LlmManager {
    /// 主要客户端
    primary_client: Arc<dyn LlmClient>,
    
    /// 备用客户端列表
    fallback_clients: Vec<Arc<dyn LlmClient>>,
    
    /// 故障转移管理器
    failover_manager: FailoverManager,
    
    /// 当前活跃的客户端索引
    active_client_index: Arc<RwLock<usize>>,
}

impl LlmManager {
    /// 创建新的 LLM 管理器
    pub async fn new(config: LlmProvidersConfig) -> Result<Self> {
        tracing::info!("初始化 LLM 管理器");
        
        // 创建主要客户端
        let primary_client = Self::create_client(&config.primary_provider).await?;
        
        // 创建备用客户端
        let mut fallback_clients = Vec::new();
        for provider in &config.fallback_providers {
            if provider.enabled {
                match Self::create_client(provider).await {
                    Ok(client) => fallback_clients.push(client),
                    Err(e) => {
                        tracing::warn!("创建备用客户端失败: {}, 跳过", e);
                    }
                }
            }
        }
        
        let failover_manager = FailoverManager::new(config.failover);
        
        tracing::info!(
            "LLM 管理器初始化完成，主要客户端: {}，备用客户端数量: {}",
            config.primary_provider.name,
            fallback_clients.len()
        );
        
        Ok(Self {
            primary_client,
            fallback_clients,
            failover_manager,
            active_client_index: Arc::new(RwLock::new(0)),
        })
    }
    
    /// 创建客户端
    async fn create_client(provider: &LlmProvider) -> Result<Arc<dyn LlmClient>> {
        if !provider.enabled {
            return Err(AiContractError::llm_provider_error(
                format!("提供商 {} 未启用", provider.name)
            ));
        }
        
        let api_key = provider.api_key.as_ref()
            .ok_or_else(|| AiContractError::llm_provider_error(
                format!("提供商 {} 缺少 API 密钥", provider.name)
            ))?;
        
        match &provider.provider_type {
            LlmProviderType::OpenAI => {
                let client = OpenAiClient::new(
                    api_key.clone(),
                    provider.base_url.clone(),
                    provider.models.clone(),
                ).await?;
                Ok(Arc::new(client))
            }
            LlmProviderType::Anthropic => {
                let client = AnthropicClient::new(
                    api_key.clone(),
                    provider.base_url.clone(),
                    provider.models.clone(),
                ).await?;
                Ok(Arc::new(client))
            }
            LlmProviderType::Cohere => {
                let client = CohereClient::new(
                    api_key.clone(),
                    provider.base_url.clone(),
                    provider.models.clone(),
                ).await?;
                Ok(Arc::new(client))
            }
            LlmProviderType::Ollama => {
                let client = OllamaClient::new(
                    provider.base_url.clone().unwrap_or_else(|| "http://localhost:11434".to_string()),
                    provider.models.clone(),
                ).await?;
                Ok(Arc::new(client))
            }
            LlmProviderType::Custom(name) => {
                Err(AiContractError::llm_provider_error(
                    format!("不支持的自定义提供商: {}", name)
                ))
            }
        }
    }

    /// 发送聊天请求
    pub async fn chat(&self, request: ChatRequest) -> Result<ChatResponse> {
        let active_index = *self.active_client_index.read().await;
        
        // 尝试使用主要客户端
        if active_index == 0 {
            match self.primary_client.chat(request.clone()).await {
                Ok(response) => return Ok(response),
                Err(e) => {
                    tracing::warn!("主要客户端请求失败: {}", e);
                    
                    if self.failover_manager.should_failover(&e) {
                        return self.try_failover(request).await;
                    } else {
                        return Err(e);
                    }
                }
            }
        }
        
        // 使用备用客户端
        if active_index > 0 && active_index <= self.fallback_clients.len() {
            let client = &self.fallback_clients[active_index - 1];
            match client.chat(request.clone()).await {
                Ok(response) => return Ok(response),
                Err(e) => {
                    tracing::warn!("备用客户端 {} 请求失败: {}", active_index, e);
                    
                    if self.failover_manager.should_failover(&e) {
                        return self.try_failover(request).await;
                    } else {
                        return Err(e);
                    }
                }
            }
        }
        
        Err(AiContractError::llm_provider_error("没有可用的客户端"))
    }
    
    /// 尝试故障转移
    async fn try_failover(&self, request: ChatRequest) -> Result<ChatResponse> {
        let total_clients = 1 + self.fallback_clients.len();
        
        for attempt in 0..self.failover_manager.max_retries() {
            tracing::info!("尝试故障转移，第 {} 次尝试", attempt + 1);
            
            // 尝试所有可用的客户端
            for client_index in 0..total_clients {
                let result = if client_index == 0 {
                    self.primary_client.chat(request.clone()).await
                } else {
                    self.fallback_clients[client_index - 1].chat(request.clone()).await
                };
                
                match result {
                    Ok(response) => {
                        // 更新活跃客户端索引
                        *self.active_client_index.write().await = client_index;
                        tracing::info!("故障转移成功，切换到客户端 {}", client_index);
                        return Ok(response);
                    }
                    Err(e) => {
                        tracing::warn!("客户端 {} 失败: {}", client_index, e);
                        continue;
                    }
                }
            }
            
            // 如果所有客户端都失败，等待后重试
            if attempt < self.failover_manager.max_retries() - 1 {
                let delay = self.failover_manager.retry_delay();
                tracing::info!("等待 {} 秒后重试", delay.as_secs());
                tokio::time::sleep(delay).await;
            }
        }
        
        Err(AiContractError::llm_provider_error("所有客户端都不可用"))
    }
    
    /// 获取当前活跃的客户端名称
    pub async fn active_client_name(&self) -> String {
        let active_index = *self.active_client_index.read().await;
        
        if active_index == 0 {
            "Primary".to_string()
        } else if active_index <= self.fallback_clients.len() {
            format!("Fallback-{}", active_index)
        } else {
            "Unknown".to_string()
        }
    }
    
    /// 检查客户端健康状态
    pub async fn health_check(&self) -> Vec<ClientHealth> {
        let mut health_status = Vec::new();
        
        // 检查主要客户端
        let primary_health = self.primary_client.health_check().await;
        health_status.push(ClientHealth {
            name: "Primary".to_string(),
            healthy: primary_health.is_ok(),
            error: primary_health.err().map(|e| e.to_string()),
        });
        
        // 检查备用客户端
        for (index, client) in self.fallback_clients.iter().enumerate() {
            let health = client.health_check().await;
            health_status.push(ClientHealth {
                name: format!("Fallback-{}", index + 1),
                healthy: health.is_ok(),
                error: health.err().map(|e| e.to_string()),
            });
        }
        
        health_status
    }
}

/// 客户端健康状态
#[derive(Debug, Clone)]
pub struct ClientHealth {
    pub name: String,
    pub healthy: bool,
    pub error: Option<String>,
}

/// 聊天请求
#[derive(Debug, Clone)]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
    pub model: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub stream: bool,
}

/// 聊天消息
#[derive(Debug, Clone)]
pub struct ChatMessage {
    pub role: MessageRole,
    pub content: String,
}

/// 消息角色
#[derive(Debug, Clone)]
pub enum MessageRole {
    System,
    User,
    Assistant,
}

/// 聊天响应
#[derive(Debug, Clone)]
pub struct ChatResponse {
    pub message: ChatMessage,
    pub usage: Option<TokenUsage>,
    pub model: String,
    pub finish_reason: Option<String>,
}

/// Token 使用情况
#[derive(Debug, Clone)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{LlmProvidersConfig, FailoverConfig};

    #[tokio::test]
    async fn test_llm_manager_creation() {
        let config = LlmProvidersConfig::default();
        
        // 注意：这个测试需要有效的 API 密钥才能通过
        // 在实际测试中，我们应该使用 mock 客户端
        if std::env::var("OPENAI_API_KEY").is_ok() {
            let manager = LlmManager::new(config).await;
            assert!(manager.is_ok());
        }
    }
}