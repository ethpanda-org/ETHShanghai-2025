// 消息类型定义
use serde::Deserialize;
use std::collections::HashMap;
use serde_json::Value;

// 消息内容结构
#[derive(Clone, Debug)]
pub struct ChatMessageContent {
    pub content: String,
    pub name: Option<String>,
    // openai api tool_call_id 参数
    pub additional_kwargs: HashMap<String, Value>,
}

// 简化的消息类型系统（与langchain-core对齐）
#[derive(Clone, Debug)]
pub enum ChatMessage {
    System(ChatMessageContent),
    Human(ChatMessageContent),
    AIMessage(ChatMessageContent),
    ToolMessage(ChatMessageContent),
}

// 令牌使用统计
#[derive(Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: usize,
    pub completion_tokens: usize,
    pub total_tokens: usize,
}