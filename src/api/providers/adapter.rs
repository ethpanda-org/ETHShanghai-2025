//! 供应商适配器接口
//! 
//! 定义统一的供应商适配器 trait，所有 LLM 供应商都需要实现此接口
//! 支持 chat completions、embeddings 等核心功能

use async_trait::async_trait;
use futures::Stream;
use std::pin::Pin;

use crate::api::{
    ApiResult,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionChunk,
    EmbeddingRequest,
    EmbeddingResponse,
};
use super::config::ProviderConfig;

/// 流式响应类型别名
pub type StreamResponse = Pin<Box<dyn Stream<Item = ApiResult<ChatCompletionChunk>> + Send>>;

/// 供应商适配器 trait
/// 
/// 所有 LLM 供应商适配器都需要实现此 trait，提供统一的接口
/// 用于将 OpenAI 格式的请求转换为各供应商的格式，并将响应转换回 OpenAI 格式
#[async_trait]
pub trait ProviderAdapter: Send + Sync {
    /// 供应商名称
    /// 
    /// 返回供应商的唯一标识符，用于日志和监控
    fn name(&self) -> &'static str;
    
    /// Chat completions 请求处理
    /// 
    /// 处理标准的 chat completions 请求（非流式）
    /// 
    /// # 参数
    /// 
    /// * `config` - 供应商配置
    /// * `request` - OpenAI 格式的请求
    /// 
    /// # 返回
    /// 
    /// 返回 OpenAI 格式的响应
    /// 
    /// # 错误
    /// 
    /// 当请求失败时返回 ApiError
    async fn chat_completions(
        &self,
        config: &ProviderConfig,
        request: ChatCompletionRequest,
    ) -> ApiResult<ChatCompletionResponse>;
    
    /// Chat completions 流式请求处理
    /// 
    /// 处理流式 chat completions 请求，返回 SSE 流
    /// 
    /// # 参数
    /// 
    /// * `config` - 供应商配置
    /// * `request` - OpenAI 格式的请求
    /// 
    /// # 返回
    /// 
    /// 返回流式响应，每个块都是 OpenAI 格式的 ChatCompletionChunk
    /// 
    /// # 错误
    /// 
    /// 当请求失败时返回 ApiError
    async fn chat_completions_stream(
        &self,
        config: &ProviderConfig,
        request: ChatCompletionRequest,
    ) -> ApiResult<StreamResponse>;
    
    /// Embeddings 请求处理
    /// 
    /// 处理 embeddings 请求，将文本转换为向量表示
    /// 
    /// # 参数
    /// 
    /// * `config` - 供应商配置
    /// * `request` - OpenAI 格式的请求
    /// 
    /// # 返回
    /// 
    /// 返回 OpenAI 格式的 embedding 响应
    /// 
    /// # 错误
    /// 
    /// 当请求失败时返回 ApiError
    async fn embeddings(
        &self,
        config: &ProviderConfig,
        request: EmbeddingRequest,
    ) -> ApiResult<EmbeddingResponse>;
    
    /// 模型名称映射
    /// 
    /// 将 OpenAI 格式的模型名称映射到供应商的实际模型名称
    /// 例如：gpt-4 -> glm-4 (智谱)
    /// 
    /// # 参数
    /// 
    /// * `openai_model` - OpenAI 格式的模型名称
    /// * `config` - 供应商配置（包含自定义映射）
    /// 
    /// # 返回
    /// 
    /// 返回供应商的实际模型名称
    fn map_model_name(&self, openai_model: &str, config: &ProviderConfig) -> String;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::{Message, EmbeddingInput};
    use std::collections::HashMap;
    
    // Mock 适配器用于测试
    struct MockAdapter;
    
    #[async_trait]
    impl ProviderAdapter for MockAdapter {
        fn name(&self) -> &'static str {
            "mock"
        }
        
        async fn chat_completions(
            &self,
            _config: &ProviderConfig,
            request: ChatCompletionRequest,
        ) -> ApiResult<ChatCompletionResponse> {
            use crate::api::{Choice, Usage};
            
            Ok(ChatCompletionResponse {
                id: "mock-123".to_string(),
                object: "chat.completion".to_string(),
                created: 1234567890,
                model: request.model,
                choices: vec![Choice {
                    index: 0,
                    message: Message {
                        role: "assistant".to_string(),
                        content: "Mock response".to_string(),
                        name: None,
                    },
                    finish_reason: "stop".to_string(),
                }],
                usage: Usage {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15,
                },
            })
        }
        
        async fn chat_completions_stream(
            &self,
            _config: &ProviderConfig,
            _request: ChatCompletionRequest,
        ) -> ApiResult<StreamResponse> {
            use futures::stream;
            use crate::api::{ChunkChoice, Delta};
            
            let chunks = vec![
                Ok(ChatCompletionChunk {
                    id: "mock-stream-123".to_string(),
                    object: "chat.completion.chunk".to_string(),
                    created: 1234567890,
                    model: "mock-model".to_string(),
                    choices: vec![ChunkChoice {
                        index: 0,
                        delta: Delta {
                            role: Some("assistant".to_string()),
                            content: None,
                        },
                        finish_reason: None,
                    }],
                }),
                Ok(ChatCompletionChunk {
                    id: "mock-stream-123".to_string(),
                    object: "chat.completion.chunk".to_string(),
                    created: 1234567890,
                    model: "mock-model".to_string(),
                    choices: vec![ChunkChoice {
                        index: 0,
                        delta: Delta {
                            role: None,
                            content: Some("Hello".to_string()),
                        },
                        finish_reason: None,
                    }],
                }),
            ];
            
            Ok(Box::pin(stream::iter(chunks)))
        }
        
        async fn embeddings(
            &self,
            _config: &ProviderConfig,
            request: EmbeddingRequest,
        ) -> ApiResult<EmbeddingResponse> {
            use crate::api::{EmbeddingData, EmbeddingUsage};
            
            let texts = request.get_texts();
            let data = texts
                .iter()
                .enumerate()
                .map(|(i, _)| EmbeddingData {
                    object: "embedding".to_string(),
                    index: i as u32,
                    embedding: vec![0.1, 0.2, 0.3],
                })
                .collect();
            
            Ok(EmbeddingResponse {
                object: "list".to_string(),
                data,
                model: request.model,
                usage: EmbeddingUsage {
                    prompt_tokens: 10,
                    total_tokens: 10,
                },
            })
        }
        
        fn map_model_name(&self, openai_model: &str, config: &ProviderConfig) -> String {
            // 首先检查配置中的自定义映射
            if let Some(mapped) = config.model_mapping.get(openai_model) {
                return mapped.clone();
            }
            
            // 使用默认映射
            match openai_model {
                "gpt-4" => "mock-gpt-4".to_string(),
                "gpt-3.5-turbo" => "mock-gpt-3.5".to_string(),
                _ => openai_model.to_string(),
            }
        }
    }
    
    #[tokio::test]
    async fn test_mock_adapter_name() {
        let adapter = MockAdapter;
        assert_eq!(adapter.name(), "mock");
    }
    
    #[tokio::test]
    async fn test_mock_adapter_chat_completions() {
        let adapter = MockAdapter;
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
        
        let response = adapter.chat_completions(&config, request).await.unwrap();
        assert_eq!(response.id, "mock-123");
        assert_eq!(response.choices[0].message.content, "Mock response");
    }
    
    #[tokio::test]
    async fn test_mock_adapter_embeddings() {
        let adapter = MockAdapter;
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
        
        let request = EmbeddingRequest {
            model: "text-embedding-ada-002".to_string(),
            input: EmbeddingInput::String("Hello world".to_string()),
            user: None,
        };
        
        let response = adapter.embeddings(&config, request).await.unwrap();
        assert_eq!(response.data.len(), 1);
        assert_eq!(response.data[0].embedding, vec![0.1, 0.2, 0.3]);
    }
    
    #[tokio::test]
    async fn test_mock_adapter_model_mapping() {
        let adapter = MockAdapter;
        
        // 测试默认映射
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
        
        assert_eq!(adapter.map_model_name("gpt-4", &config), "mock-gpt-4");
        assert_eq!(adapter.map_model_name("gpt-3.5-turbo", &config), "mock-gpt-3.5");
        
        // 测试自定义映射
        let mut custom_mapping = HashMap::new();
        custom_mapping.insert("gpt-4".to_string(), "custom-model".to_string());
        
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
        
        assert_eq!(adapter.map_model_name("gpt-4", &config_with_mapping), "custom-model");
    }
    
    #[tokio::test]
    async fn test_mock_adapter_stream() {
        use futures::StreamExt;
        
        let adapter = MockAdapter;
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
            stream: true,
            user: None,
            tools: None,
            tool_choice: None,
        };
        
        let mut stream = adapter.chat_completions_stream(&config, request).await.unwrap();
        
        // 验证第一个块
        let chunk1 = stream.next().await.unwrap().unwrap();
        assert_eq!(chunk1.id, "mock-stream-123");
        assert_eq!(chunk1.choices[0].delta.role, Some("assistant".to_string()));
        
        // 验证第二个块
        let chunk2 = stream.next().await.unwrap().unwrap();
        assert_eq!(chunk2.choices[0].delta.content, Some("Hello".to_string()));
    }
}
