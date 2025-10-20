//! API 请求处理器
//! 
//! 实现 OpenAI-compatible API 的请求处理逻辑
//! 支持流式响应（SSE）和标准响应

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response, Sse},
    Json,
};
use futures::stream::{Stream, StreamExt};
use std::convert::Infallible;
use std::sync::Arc;
use serde_json;

use crate::api::{
    ApiResult, ApiError,
    ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk,
    EmbeddingRequest, EmbeddingResponse,
};
use crate::api::providers::ProviderRegistry;

/// API 状态
#[derive(Clone)]
pub struct ApiState {
    /// 供应商注册表
    pub registry: Arc<ProviderRegistry>,
    /// 服务启动时间
    pub start_time: std::time::Instant,
}

/// Chat Completions 处理器
/// 
/// 处理 POST /v1/chat/completions 请求
/// 支持流式和非流式响应
pub async fn chat_completions_handler(
    State(state): State<ApiState>,
    Json(request): Json<ChatCompletionRequest>,
) -> Result<Response, ApiError> {
    // 验证请求
    request.validate()
        .map_err(|e| ApiError::invalid_request(e))?;
    
    tracing::info!(
        "Chat completions request: model={}, stream={}, messages={}",
        request.model,
        request.stream,
        request.messages.len()
    );
    
    // 选择供应商
    let (adapter, config) = state.registry.select_provider().await?;
    
    tracing::debug!(
        "Selected provider: {} for model {}",
        adapter.name(),
        request.model
    );
    
    // 根据 stream 参数决定响应类型
    if request.stream {
        // 流式响应
        handle_chat_completions_stream(adapter, config, request, state.registry.clone()).await
    } else {
        // 标准响应
        handle_chat_completions_standard(adapter, config, request, state.registry.clone()).await
    }
}

/// 处理标准（非流式）chat completions 请求
async fn handle_chat_completions_standard(
    adapter: Arc<dyn crate::api::providers::ProviderAdapter>,
    config: crate::api::providers::ProviderConfig,
    request: ChatCompletionRequest,
    registry: Arc<ProviderRegistry>,
) -> Result<Response, ApiError> {
    let provider_type = config.provider_type;
    
    // 调用适配器
    match adapter.chat_completions(&config, request).await {
        Ok(response) => {
            // 记录成功
            registry.record_success(provider_type).await;
            Ok(Json(response).into_response())
        }
        Err(e) => {
            // 记录失败
            registry.record_failure(provider_type).await;
            tracing::error!("Chat completions failed: {}", e);
            Err(e)
        }
    }
}

/// 处理流式 chat completions 请求
async fn handle_chat_completions_stream(
    adapter: Arc<dyn crate::api::providers::ProviderAdapter>,
    config: crate::api::providers::ProviderConfig,
    request: ChatCompletionRequest,
    registry: Arc<ProviderRegistry>,
) -> Result<Response, ApiError> {
    let provider_type = config.provider_type;
    
    // 获取流式响应
    let stream = adapter.chat_completions_stream(&config, request).await?;
    
    // 转换为 SSE 格式
    let sse_stream = stream.map(move |result| {
        match result {
            Ok(chunk) => {
                // 序列化为 JSON
                match serde_json::to_string(&chunk) {
                    Ok(json) => Ok::<_, Infallible>(axum::response::sse::Event::default().data(json)),
                    Err(e) => {
                        tracing::error!("Failed to serialize chunk: {}", e);
                        // 返回错误事件而不是失败
                        Ok(axum::response::sse::Event::default()
                            .event("error")
                            .data(format!("{{\"error\": \"Serialization error: {}\"}}", e)))
                    }
                }
            }
            Err(e) => {
                tracing::error!("Stream error: {}", e);
                // SSE 不能直接返回错误，记录并继续
                Ok(axum::response::sse::Event::default()
                    .event("error")
                    .data(format!("{{\"error\": \"{}\"}}", e)))
            }
        }
    })
    .chain(futures::stream::once(async {
        // 发送 [DONE] 标记
        Ok::<_, Infallible>(axum::response::sse::Event::default().data("[DONE]"))
    }));
    
    // 记录成功（流开始）
    registry.record_success(provider_type).await;
    
    Ok(Sse::new(sse_stream).into_response())
}

/// Embeddings 处理器
/// 
/// 处理 POST /v1/embeddings 请求
pub async fn embeddings_handler(
    State(state): State<ApiState>,
    Json(request): Json<EmbeddingRequest>,
) -> Result<Json<EmbeddingResponse>, ApiError> {
    // 验证请求
    request.validate()
        .map_err(|e| ApiError::invalid_request(e))?;
    
    tracing::info!(
        "Embeddings request: model={}, inputs={}",
        request.model,
        request.get_texts().len()
    );
    
    // 选择供应商
    let (adapter, config) = state.registry.select_provider().await?;
    
    tracing::debug!(
        "Selected provider: {} for model {}",
        adapter.name(),
        request.model
    );
    
    let provider_type = config.provider_type;
    
    // 调用适配器
    match adapter.embeddings(&config, request).await {
        Ok(response) => {
            // 记录成功
            state.registry.record_success(provider_type).await;
            Ok(Json(response))
        }
        Err(e) => {
            // 记录失败
            state.registry.record_failure(provider_type).await;
            tracing::error!("Embeddings failed: {}", e);
            Err(e)
        }
    }
}

/// 健康检查处理器
/// 
/// 处理 GET /health 请求
pub async fn health_check_handler(
    State(state): State<ApiState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let uptime = state.start_time.elapsed().as_secs();
    let _health_status = state.registry.get_health_status().await;
    
    let provider_count = state.registry.provider_count().await;
    let healthy_count = state.registry.healthy_provider_count().await;
    
    let status = if healthy_count > 0 {
        "healthy"
    } else {
        "unhealthy"
    };
    
    let response = serde_json::json!({
        "status": status,
        "uptime_seconds": uptime,
        "providers": {
            "total": provider_count,
            "healthy": healthy_count,
            "unhealthy": provider_count - healthy_count,
        },
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });
    
    tracing::debug!("Health check: {}", response);
    
    Ok(Json(response))
}

/// Models 列表处理器
/// 
/// 返回所有可用模型的列表，符合 OpenAI API 格式
pub async fn models_handler(
    State(state): State<ApiState>,
) -> ApiResult<Json<serde_json::Value>> {
    tracing::info!("Models list request");
    
    // 创建模型列表
    let models = vec![
        serde_json::json!({
            "id": "gpt-4",
            "object": "model",
            "created": 1677610602,
            "owned_by": "openai"
        }),
        serde_json::json!({
            "id": "gpt-3.5-turbo",
            "object": "model", 
            "created": 1677610602,
            "owned_by": "openai"
        }),
        serde_json::json!({
            "id": "text-embedding-ada-002",
            "object": "model",
            "created": 1671217299,
            "owned_by": "openai"
        }),
        // 阿里百炼模型
        serde_json::json!({
            "id": "qwen-max",
            "object": "model",
            "created": 1677610602,
            "owned_by": "alibaba"
        }),
        serde_json::json!({
            "id": "qwen-turbo",
            "object": "model",
            "created": 1677610602,
            "owned_by": "alibaba"
        }),
        serde_json::json!({
            "id": "text-embedding-v2",
            "object": "model",
            "created": 1671217299,
            "owned_by": "alibaba"
        }),
    ];
    
    let response = serde_json::json!({
        "object": "list",
        "data": models
    });
    
    tracing::debug!("Models list: {} models", models.len());
    
    Ok(Json(response))
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::{Message, EmbeddingInput};
    use crate::api::providers::{
        MultiProviderConfig, ProviderConfig, ProviderType, RoutingStrategy,
    };
    use std::collections::HashMap;
    
    fn create_test_state() -> ApiState {
        let config = MultiProviderConfig {
            providers: vec![
                ProviderConfig {
                    provider_type: ProviderType::OpenAI,
                    enabled: true,
                    base_url: Some("https://api.openai.com/v1".to_string()),
                    api_key: "test-key".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 30,
                    priority: 1,
                    weight: 1,
                },
            ],
            routing_strategy: RoutingStrategy::Priority,
        };
        
        let registry = Arc::new(ProviderRegistry::new(config).unwrap());
        
        ApiState {
            registry,
            start_time: std::time::Instant::now(),
        }
    }
    
    #[tokio::test]
    async fn test_health_check_handler() {
        let state = create_test_state();
        
        let result = health_check_handler(State(state)).await;
        assert!(result.is_ok());
        
        let response = result.unwrap();
        let json = response.0;
        
        assert!(json.get("status").is_some());
        assert!(json.get("uptime_seconds").is_some());
        assert!(json.get("providers").is_some());
    }
    
    #[tokio::test]
    async fn test_chat_completions_validation() {
        let state = create_test_state();
        
        // Invalid request - empty model
        let invalid_request = ChatCompletionRequest {
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
        
        let result = chat_completions_handler(
            State(state),
            Json(invalid_request),
        ).await;
        
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(matches!(e, ApiError::InvalidRequest(_)));
        }
    }
    
    #[tokio::test]
    async fn test_embeddings_validation() {
        let state = create_test_state();
        
        // Invalid request - empty model
        let invalid_request = EmbeddingRequest {
            model: "".to_string(),
            input: EmbeddingInput::String("Hello".to_string()),
            user: None,
        };
        
        let result = embeddings_handler(
            State(state),
            Json(invalid_request),
        ).await;
        
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(matches!(e, ApiError::InvalidRequest(_)));
        }
    }
    
    #[tokio::test]
    async fn test_embeddings_empty_input_validation() {
        let state = create_test_state();
        
        // Invalid request - empty input
        let invalid_request = EmbeddingRequest {
            model: "text-embedding-ada-002".to_string(),
            input: EmbeddingInput::String("".to_string()),
            user: None,
        };
        
        let result = embeddings_handler(
            State(state),
            Json(invalid_request),
        ).await;
        
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_health_check_uptime() {
        let state = create_test_state();
        
        // Wait a bit to ensure uptime > 0
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        
        let result = health_check_handler(State(state)).await.unwrap();
        let json = result.0;
        
        let uptime = json.get("uptime_seconds").unwrap().as_u64().unwrap();
        // Uptime should be at least 0 (u64 is always >= 0, but we check it exists)
        assert!(json.get("uptime_seconds").is_some());
        assert!(uptime < 1000); // Reasonable upper bound for test
    }
    
    #[tokio::test]
    async fn test_health_check_provider_counts() {
        let state = create_test_state();
        
        let result = health_check_handler(State(state)).await.unwrap();
        let json = result.0;
        
        let providers = json.get("providers").unwrap();
        let total = providers.get("total").unwrap().as_u64().unwrap();
        let healthy = providers.get("healthy").unwrap().as_u64().unwrap();
        
        assert_eq!(total, 1);
        assert!(healthy <= total);
    }
}
