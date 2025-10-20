// 聊天模型接口和相关结构体定义
use anyhow::Error;
use crate::models::message::{ChatMessage, TokenUsage};

// 简化的聊天完成结构
pub struct ChatCompletion {
    pub message: ChatMessage,
    pub usage: Option<TokenUsage>,
    pub model_name: String,
}

// 聊天模型接口
pub trait ChatModel: Send + Sync {
    // 模型基本信息
    fn model_name(&self) -> Option<&str> {
        None
    }

    // 模型基础URL
    fn base_url(&self) -> String {
        "https://api.openai.com/v1".to_string()
    }
    
    // 核心方法：处理聊天消息
    fn invoke(&self, messages: Vec<ChatMessage>) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<ChatCompletion, Error>> + Send + '_>> {
        let _messages = messages;
        Box::pin(async move {
            Err(Error::msg("The model does not implement the invoke method"))
        })
    }
}