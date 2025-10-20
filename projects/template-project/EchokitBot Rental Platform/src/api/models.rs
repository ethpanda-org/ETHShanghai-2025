//! OpenAI-Compatible API 模型定义
//! 
//! 本模块定义与 OpenAI API 完全兼容的数据结构
//! 支持 chat/completions、embeddings 等核心端点
//! 
//! 这些结构可以与 Rig 框架的内部类型进行转换，实现供应商适配

use serde::{Deserialize, Serialize};

// ============================================================================
// OpenAI API 兼容的请求/响应结构
// ============================================================================

/// Chat Completions 请求（OpenAI 格式）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    /// 模型名称
    pub model: String,
    /// 消息列表
    pub messages: Vec<Message>,
    /// 温度参数 (0.0-2.0)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    /// 最大 token 数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u64>,
    /// Top-p 参数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,
    /// 频率惩罚
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f64>,
    /// 存在惩罚
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f64>,
    /// 停止词
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop: Option<Vec<String>>,
    /// 是否流式返回
    #[serde(default)]
    pub stream: bool,
    /// 用户标识
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
    /// 工具列表
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<Tool>>,
    /// 工具选择策略
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<ToolChoice>,
}

/// 消息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    /// 角色
    pub role: String,
    /// 内容
    pub content: String,
    /// 消息名称（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

/// 工具定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    /// 工具类型（通常是 "function"）
    pub r#type: String,
    /// 函数定义
    pub function: FunctionDefinition,
}

/// 函数定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDefinition {
    /// 函数名称
    pub name: String,
    /// 函数描述
    pub description: String,
    /// 参数定义（JSON Schema）
    pub parameters: serde_json::Value,
}

/// 工具选择策略
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ToolChoice {
    /// 自动选择
    String(String), // "auto", "none", "required"
    /// 指定函数
    Function {
        r#type: String,
        function: FunctionChoice,
    },
}

/// 函数选择
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionChoice {
    /// 函数名称
    pub name: String,
}

/// Chat Completions 响应（OpenAI 格式）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionResponse {
    /// 响应 ID
    pub id: String,
    /// 对象类型
    pub object: String,
    /// 创建时间戳
    pub created: u64,
    /// 使用的模型
    pub model: String,
    /// 选择列表
    pub choices: Vec<Choice>,
    /// Token 使用情况
    pub usage: Usage,
}

/// 选择项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Choice {
    /// 索引
    pub index: u32,
    /// 消息
    pub message: Message,
    /// 结束原因
    pub finish_reason: String,
}

/// Token 使用情况
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    /// 提示 tokens
    pub prompt_tokens: u32,
    /// 完成 tokens
    pub completion_tokens: u32,
    /// 总 tokens
    pub total_tokens: u32,
}

/// 流式响应块
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionChunk {
    /// 响应 ID
    pub id: String,
    /// 对象类型
    pub object: String,
    /// 创建时间戳
    pub created: u64,
    /// 使用的模型
    pub model: String,
    /// 选择列表
    pub choices: Vec<ChunkChoice>,
}

/// 流式选择项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkChoice {
    /// 索引
    pub index: u32,
    /// 增量消息
    pub delta: Delta,
    /// 结束原因
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,
}

/// 增量消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Delta {
    /// 角色（仅在第一个块中出现）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    /// 内容增量
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
}

// ============================================================================
// Embeddings API Models
// ============================================================================

/// Embeddings 请求（OpenAI 格式）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingRequest {
    /// 模型名称
    pub model: String,
    /// 输入文本（字符串或字符串数组）
    pub input: EmbeddingInput,
    /// 用户标识（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}

/// Embeddings 输入
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EmbeddingInput {
    /// 单个字符串
    String(String),
    /// 字符串数组
    Array(Vec<String>),
}

/// Embeddings 响应（OpenAI 格式）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingResponse {
    /// 对象类型
    pub object: String,
    /// 嵌入向量列表
    pub data: Vec<EmbeddingData>,
    /// 使用的模型
    pub model: String,
    /// Token 使用情况
    pub usage: EmbeddingUsage,
}

/// 嵌入向量数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingData {
    /// 对象类型
    pub object: String,
    /// 索引
    pub index: u32,
    /// 嵌入向量
    pub embedding: Vec<f32>,
}

/// Embeddings Token 使用情况
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingUsage {
    /// 提示 tokens
    pub prompt_tokens: u32,
    /// 总 tokens
    pub total_tokens: u32,
}

// ============================================================================
// 辅助函数和转换实现
// ============================================================================

impl ChatCompletionRequest {
    /// 验证请求参数
    pub fn validate(&self) -> Result<(), String> {
        if self.model.is_empty() {
            return Err("model cannot be empty".to_string());
        }
        if self.messages.is_empty() {
            return Err("messages cannot be empty".to_string());
        }
        if let Some(temp) = self.temperature {
            if !(0.0..=2.0).contains(&temp) {
                return Err("temperature must be between 0.0 and 2.0".to_string());
            }
        }
        if let Some(p) = self.top_p {
            if !(0.0..=1.0).contains(&p) {
                return Err("top_p must be between 0.0 and 1.0".to_string());
            }
        }
        Ok(())
    }
}

impl EmbeddingRequest {
    /// 验证请求参数
    pub fn validate(&self) -> Result<(), String> {
        if self.model.is_empty() {
            return Err("model cannot be empty".to_string());
        }
        match &self.input {
            EmbeddingInput::String(s) if s.is_empty() => {
                Err("input string cannot be empty".to_string())
            }
            EmbeddingInput::Array(arr) if arr.is_empty() => {
                Err("input array cannot be empty".to_string())
            }
            _ => Ok(()),
        }
    }
    
    /// 获取输入文本列表
    pub fn get_texts(&self) -> Vec<String> {
        match &self.input {
            EmbeddingInput::String(s) => vec![s.clone()],
            EmbeddingInput::Array(arr) => arr.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chat_completion_request_serialization() {
        let request = ChatCompletionRequest {
            model: "gpt-4".to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: "Hello".to_string(),
                name: None,
            }],
            temperature: Some(0.7),
            max_tokens: Some(100),
            top_p: None,
            frequency_penalty: None,
            presence_penalty: None,
            stop: None,
            stream: false,
            user: None,
            tools: None,
            tool_choice: None,
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("gpt-4"));
        assert!(json.contains("Hello"));
    }

    #[test]
    fn test_chat_completion_request_validation() {
        // Valid request
        let valid_request = ChatCompletionRequest {
            model: "gpt-4".to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: "Hello".to_string(),
                name: None,
            }],
            temperature: Some(0.7),
            max_tokens: Some(100),
            top_p: Some(0.9),
            frequency_penalty: None,
            presence_penalty: None,
            stop: None,
            stream: false,
            user: None,
            tools: None,
            tool_choice: None,
        };
        assert!(valid_request.validate().is_ok());

        // Empty model
        let empty_model = ChatCompletionRequest {
            model: "".to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: "Hello".to_string(),
                name: None,
            }],
            temperature: None,
            max_tokens: None,
            top_p: None,
            frequency_penalty: None,
            presence_penalty: None,
            stop: None,
            stream: false,
            user: None,
            tools: None,
            tool_choice: None,
        };
        assert!(empty_model.validate().is_err());

        // Empty messages
        let empty_messages = ChatCompletionRequest {
            model: "gpt-4".to_string(),
            messages: vec![],
            temperature: None,
            max_tokens: None,
            top_p: None,
            frequency_penalty: None,
            presence_penalty: None,
            stop: None,
            stream: false,
            user: None,
            tools: None,
            tool_choice: None,
        };
        assert!(empty_messages.validate().is_err());

        // Invalid temperature
        let invalid_temp = ChatCompletionRequest {
            model: "gpt-4".to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: "Hello".to_string(),
                name: None,
            }],
            temperature: Some(3.0),
            max_tokens: None,
            top_p: None,
            frequency_penalty: None,
            presence_penalty: None,
            stop: None,
            stream: false,
            user: None,
            tools: None,
            tool_choice: None,
        };
        assert!(invalid_temp.validate().is_err());

        // Invalid top_p
        let invalid_top_p = ChatCompletionRequest {
            model: "gpt-4".to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: "Hello".to_string(),
                name: None,
            }],
            temperature: None,
            max_tokens: None,
            top_p: Some(1.5),
            frequency_penalty: None,
            presence_penalty: None,
            stop: None,
            stream: false,
            user: None,
            tools: None,
            tool_choice: None,
        };
        assert!(invalid_top_p.validate().is_err());
    }

    #[test]
    fn test_embedding_request_serialization() {
        let request = EmbeddingRequest {
            model: "text-embedding-ada-002".to_string(),
            input: EmbeddingInput::String("Hello world".to_string()),
            user: None,
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("text-embedding-ada-002"));
        assert!(json.contains("Hello world"));
    }

    #[test]
    fn test_embedding_input_array() {
        let request = EmbeddingRequest {
            model: "text-embedding-ada-002".to_string(),
            input: EmbeddingInput::Array(vec![
                "First text".to_string(),
                "Second text".to_string(),
            ]),
            user: None,
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("First text"));
        assert!(json.contains("Second text"));
    }

    #[test]
    fn test_embedding_request_validation() {
        // Valid string input
        let valid_string = EmbeddingRequest {
            model: "text-embedding-ada-002".to_string(),
            input: EmbeddingInput::String("Hello".to_string()),
            user: None,
        };
        assert!(valid_string.validate().is_ok());

        // Valid array input
        let valid_array = EmbeddingRequest {
            model: "text-embedding-ada-002".to_string(),
            input: EmbeddingInput::Array(vec!["Hello".to_string()]),
            user: None,
        };
        assert!(valid_array.validate().is_ok());

        // Empty model
        let empty_model = EmbeddingRequest {
            model: "".to_string(),
            input: EmbeddingInput::String("Hello".to_string()),
            user: None,
        };
        assert!(empty_model.validate().is_err());

        // Empty string input
        let empty_string = EmbeddingRequest {
            model: "text-embedding-ada-002".to_string(),
            input: EmbeddingInput::String("".to_string()),
            user: None,
        };
        assert!(empty_string.validate().is_err());

        // Empty array input
        let empty_array = EmbeddingRequest {
            model: "text-embedding-ada-002".to_string(),
            input: EmbeddingInput::Array(vec![]),
            user: None,
        };
        assert!(empty_array.validate().is_err());
    }

    #[test]
    fn test_embedding_request_get_texts() {
        // String input
        let string_request = EmbeddingRequest {
            model: "text-embedding-ada-002".to_string(),
            input: EmbeddingInput::String("Hello".to_string()),
            user: None,
        };
        assert_eq!(string_request.get_texts(), vec!["Hello".to_string()]);

        // Array input
        let array_request = EmbeddingRequest {
            model: "text-embedding-ada-002".to_string(),
            input: EmbeddingInput::Array(vec![
                "First".to_string(),
                "Second".to_string(),
            ]),
            user: None,
        };
        assert_eq!(
            array_request.get_texts(),
            vec!["First".to_string(), "Second".to_string()]
        );
    }

    #[test]
    fn test_chat_completion_response_serialization() {
        let response = ChatCompletionResponse {
            id: "chatcmpl-123".to_string(),
            object: "chat.completion".to_string(),
            created: 1677652288,
            model: "gpt-4".to_string(),
            choices: vec![Choice {
                index: 0,
                message: Message {
                    role: "assistant".to_string(),
                    content: "Hello! How can I help you?".to_string(),
                    name: None,
                },
                finish_reason: "stop".to_string(),
            }],
            usage: Usage {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
            },
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("chatcmpl-123"));
        assert!(json.contains("gpt-4"));
        assert!(json.contains("Hello! How can I help you?"));
    }

    #[test]
    fn test_embedding_response_serialization() {
        let response = EmbeddingResponse {
            object: "list".to_string(),
            data: vec![EmbeddingData {
                object: "embedding".to_string(),
                index: 0,
                embedding: vec![0.1, 0.2, 0.3],
            }],
            model: "text-embedding-ada-002".to_string(),
            usage: EmbeddingUsage {
                prompt_tokens: 5,
                total_tokens: 5,
            },
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("text-embedding-ada-002"));
        assert!(json.contains("0.1"));
    }

    #[test]
    fn test_openai_format_compatibility() {
        // Test that our structures can deserialize OpenAI API responses
        let openai_chat_response = r#"{
            "id": "chatcmpl-123",
            "object": "chat.completion",
            "created": 1677652288,
            "model": "gpt-4",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Hello!"
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 5,
                "total_tokens": 15
            }
        }"#;

        let response: ChatCompletionResponse = serde_json::from_str(openai_chat_response).unwrap();
        assert_eq!(response.id, "chatcmpl-123");
        assert_eq!(response.model, "gpt-4");
        assert_eq!(response.choices[0].message.content, "Hello!");
    }
}