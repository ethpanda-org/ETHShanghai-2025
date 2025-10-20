// OpenAI模型实现 - 基于LangChain设计
use super::chat::{ChatCompletion, ChatModel};
use super::message::{ChatMessage, ChatMessageContent, TokenUsage};
use anyhow::Error;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json;
use std::collections::HashMap;
use log::info;
#[derive(Serialize, Deserialize, Clone)]
struct OpenAIMessage {
    role: String,
    content: String,
    name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_call_id: Option<String>,
}

// 令牌使用详情结构体 - 参考LangChain的InputTokenDetails和OutputTokenDetails
#[derive(Deserialize, Default)]
struct InputTokenDetails {
    audio_tokens: Option<usize>,
    cache_read: Option<usize>,
    reasoning_tokens: Option<usize>,
    // 其他可能的字段
}

#[derive(Deserialize, Default)]
struct OutputTokenDetails {
    cache_write: Option<usize>,
    reasoning_tokens: Option<usize>,
    // 其他可能的字段
}

// OpenAI传统API使用统计
#[derive(Deserialize, Default)]
struct OpenAIUsage {
    prompt_tokens: usize,
    completion_tokens: usize,
    total_tokens: usize,
    // 扩展字段，支持更多细节
    input_tokens_details: Option<InputTokenDetails>,
    output_tokens_details: Option<OutputTokenDetails>,
}

// Responses API使用统计格式
#[derive(Deserialize, Default)]
struct OpenAIResponsesUsage {
    input_tokens: Option<usize>,
    output_tokens: Option<usize>,
    total_tokens: Option<usize>,
    // Responses API特有的字段
    input_tokens_details: Option<InputTokenDetails>,
    output_tokens_details: Option<OutputTokenDetails>,
}

// 通用API响应结构 - 兼容OpenAI和其他提供商
#[derive(Deserialize)]
struct OpenAIResponse {
    id: Option<String>,
    object: Option<String>,
    created: Option<u64>,
    model: Option<String>,
    choices: Vec<OpenAIChoice>, // 这个字段通常是必需的
    usage: Option<OpenAIUsage>,
    // 兼容Responses API的字段
    output: Option<Vec<OpenAIChoice>>,
    // 其他可能的响应字段
}

#[derive(Deserialize)]
struct OpenAIChoice {
    index: u32,
    message: OpenAIMessage,
    finish_reason: String,
}

// API类型枚举 - 支持传统Chat Completions API和新的Responses API
#[derive(Debug, Clone, Copy)]
enum OpenAIApiType {
    ChatCompletions,
    Responses,
}

// OpenAI模型实现 - 支持多种API格式
#[derive(Clone)]
pub struct OpenAIChatModel {
    client: Client,
    api_key: String,
    base_url: String,
    model_name: Option<String>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
    api_type: OpenAIApiType,
    additional_headers: HashMap<String, String>,
    additional_params: HashMap<String, serde_json::Value>,
}

impl OpenAIChatModel {
    /// 创建新的OpenAI聊天模型实例
    pub fn new(api_key: String, base_url: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string()),
            model_name: None,
            temperature: Some(0.7),
            max_tokens: None,
            api_type: OpenAIApiType::ChatCompletions,
            additional_headers: HashMap::new(),
            additional_params: HashMap::new(),
        }
    }

    /// 获取模型名称
    pub fn model_name(&self) -> Option<&String> {
        self.model_name.as_ref()
    }

    /// 获取基础URL
    pub fn base_url(&self) -> &String {
        &self.base_url
    }

    /// 获取温度参数
    pub fn temperature(&self) -> Option<f32> {
        self.temperature
    }

    /// 获取最大令牌数
    pub fn max_tokens(&self) -> Option<u32> {
        self.max_tokens
    }

    /// 设置模型名称
    pub fn with_model(mut self, model_name: String) -> Self {
        self.model_name = Some(model_name);
        self
    }

    /// 设置温度参数
    pub fn with_temperature(mut self, temperature: f32) -> Self {
        self.temperature = Some(temperature);
        self
    }

    /// 设置最大令牌数
    pub fn with_max_tokens(mut self, max_tokens: u32) -> Self {
        self.max_tokens = Some(max_tokens);
        self
    }

    /// 设置API类型（Chat Completions或Responses）
    pub fn with_api_type(mut self, api_type: OpenAIApiType) -> Self {
        self.api_type = api_type;
        self
    }

    /// 添加额外的请求头
    pub fn with_additional_header(mut self, key: String, value: String) -> Self {
        self.additional_headers.insert(key, value);
        self
    }

    /// 添加额外的请求参数
    pub fn with_additional_param(mut self, key: String, value: serde_json::Value) -> Self {
        self.additional_params.insert(key, value);
        self
    }

    /// 构建请求载荷 - 参考LangChain的_get_request_payload方法
    fn _get_request_payload(&self, messages: &[OpenAIMessage]) -> Result<serde_json::Value, Error> {
        Ok(serde_json::json!({"messages": messages}))
    }

    /// 转换消息到字典格式 - 参考LangChain的_convert_message_to_dict
    fn _convert_message_to_dict(&self, message: &OpenAIMessage) -> Result<serde_json::Value, Error> {
        Ok(serde_json::to_value(message)?)  
    }

    /// 构建Responses API载荷 - 参考LangChain的_construct_responses_api_payload
    fn _construct_responses_api_payload(&self, messages: &[OpenAIMessage]) -> Result<serde_json::Value, Error> {
        Ok(serde_json::json!({"messages": messages}))
    }

    /// 创建使用元数据 - 参考LangChain的_create_usage_metadata
    fn _create_usage_metadata(&self, usage: &OpenAIUsage) -> TokenUsage {
        TokenUsage {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
        }
    }

    /// 创建Responses API的使用元数据 - 参考LangChain的_create_usage_metadata_responses
    fn _create_usage_metadata_responses(&self, usage: &OpenAIResponsesUsage) -> TokenUsage {
        TokenUsage {
            prompt_tokens: usage.input_tokens.unwrap_or(0),
            completion_tokens: usage.output_tokens.unwrap_or(0),
            total_tokens: usage.total_tokens.unwrap_or(0),
        }
    }

    /// 转换字典到消息 - 参考LangChain的_convert_dict_to_message
    fn _convert_dict_to_message(&self, message_dict: serde_json::Value) -> Result<ChatMessage, Error> {
        // 简单实现：尝试从JSON中提取role和content
        let role = message_dict.get("role").and_then(|v| v.as_str()).unwrap_or("assistant");
        let content = message_dict.get("content").and_then(|v| v.as_str()).unwrap_or("").to_string();
        
        let chat_content = ChatMessageContent {
            content,
            name: None,
            additional_kwargs: HashMap::new(),
        };
        
        match role {
            "system" => Ok(ChatMessage::System(chat_content)),
            "user" => Ok(ChatMessage::Human(chat_content)),
            "assistant" => Ok(ChatMessage::AIMessage(chat_content)),
            "tool" => Ok(ChatMessage::ToolMessage(chat_content)),
            _ => Ok(ChatMessage::AIMessage(chat_content)),
        }
    }
}

impl ChatModel for OpenAIChatModel {
    fn model_name(&self) -> Option<&str> {
        self.model_name.as_deref()
    }

    fn base_url(&self) -> String {
        self.base_url.to_string()
    }

    fn invoke(&self, messages: Vec<ChatMessage>) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<ChatCompletion, Error>> + Send + '_>> {
        let messages = messages;
        let client = self.client.clone();
        let api_key = self.api_key.clone();
        let base_url = self.base_url.clone();
        let model_name = self.model_name.clone();
        let temperature = self.temperature;
        let max_tokens = self.max_tokens;
        let additional_headers = self.additional_headers.clone();
        let additional_params = self.additional_params.clone();

        Box::pin(async move {
            // 转换消息格式
            let openai_messages: Vec<OpenAIMessage> = messages
                .into_iter()
                .map(|msg| match msg {
                    ChatMessage::System(content) => OpenAIMessage {
                        role: "system".to_string(),
                        content: content.content,
                        name: content.name,
                        tool_call_id: None,
                    },
                    ChatMessage::Human(content) => OpenAIMessage {
                        role: "user".to_string(),
                        content: content.content,
                        name: content.name,
                        tool_call_id: None,
                    },
                    ChatMessage::AIMessage(content) => OpenAIMessage {
                        role: "assistant".to_string(),
                        content: content.content,
                        name: content.name,
                        tool_call_id: None,
                    },
                    ChatMessage::ToolMessage(content) => {
                        info!("转换工具消息: role=tool, content={}", content.content);
                        // 为工具消息添加tool_call_id
                        let tool_call_id = content.additional_kwargs.get("tool_call_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("default_tool_call_id").to_string();
                        OpenAIMessage {
                            role: "tool".to_string(),
                            content: content.content,
                            name: content.name,
                            tool_call_id: Some(tool_call_id),
                        }
                    },
                })
                .collect();

            // 构建请求体
            let mut request_body = serde_json::json!({
                "messages": openai_messages,
                "model": model_name.clone().unwrap_or("".to_string()),
            });

            // 添加可选参数
            if let Some(temp) = temperature {
                request_body["temperature"] = serde_json::json!(temp);
            }
            if let Some(max) = max_tokens {
                request_body["max_tokens"] = serde_json::json!(max);
            }
            
            // 添加额外参数
            for (key, value) in additional_params {
                request_body[key] = value;
            }

            // 构建完整的API路径，将base_url与具体端点拼接
            let api_url = format!("{}/chat/completions", base_url);
            
            // 构建请求
            let mut request = client.post(&api_url)
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json");

            // 添加额外的请求头
            for (key, value) in additional_headers {
                request = request.header(key, value);
            }
            
            // 发送请求
            let response = request.json(&request_body).send().await?;
            
            // 检查响应状态
            let status = response.status();
            if !status.is_success() {
                let error_text = response.text().await?;
                return Err(Error::msg(format!("API request failed: {} - {}", status, error_text)));
            }

            // 解析响应
            let response: OpenAIResponse = response.json().await?;

            // 处理响应
            let chat_message = match response.choices.first() {
                Some(choice) => {
                    let message = &choice.message;
                    match message.role.as_str() {
                        "assistant" => ChatMessage::AIMessage(ChatMessageContent {
                            content: message.content.clone(),
                            name: message.name.clone(),
                            additional_kwargs: HashMap::new(),
                        }),
                        _ => {
                            return Err(Error::msg(format!("Unexpected message role: {}", message.role)));
                        }
                    }
                },
                None => {
                    // 尝试使用output字段（Responses API）
                    match &response.output {
                        Some(outputs) => {
                            match outputs.first() {
                                Some(choice) => {
                                    let message = &choice.message;
                                    ChatMessage::AIMessage(ChatMessageContent {
                                        content: message.content.clone(),
                                        name: message.name.clone(),
                                        additional_kwargs: HashMap::new(),
                                    })
                                },
                                None => return Err(Error::msg("No output returned from API")),
                            }
                        },
                        None => return Err(Error::msg("No choices or output returned from API")),
                    }
                },
            };

            // 转换使用统计
            let usage = match &response.usage {
                Some(openai_usage) => {
                    Some(TokenUsage {
                        prompt_tokens: openai_usage.prompt_tokens,
                        completion_tokens: openai_usage.completion_tokens,
                        total_tokens: openai_usage.total_tokens,
                    })
                },
                None => None,
            };

            let model_name_str = response.model.as_deref().unwrap_or("unknown");
            Ok(ChatCompletion {
                message: chat_message,
                usage,
                model_name: model_name_str.to_string(),
            })
        })
    }
}