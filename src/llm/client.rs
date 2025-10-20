//! LLM 客户端接口定义

use crate::error::Result;
use crate::llm::{ChatRequest, ChatResponse};
use async_trait::async_trait;

/// LLM 客户端接口
#[async_trait]
pub trait LlmClient: Send + Sync {
    /// 发送聊天请求
    async fn chat(&self, request: ChatRequest) -> Result<ChatResponse>;
    
    /// 健康检查
    async fn health_check(&self) -> Result<()>;
    
    /// 获取客户端名称
    fn name(&self) -> &str;
    
    /// 获取支持的模型列表
    fn supported_models(&self) -> Vec<String>;
    
    /// 检查是否支持指定模型
    fn supports_model(&self, model: &str) -> bool {
        self.supported_models().contains(&model.to_string())
    }
}