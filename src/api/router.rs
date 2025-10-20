//! HTTP API 路由
//! 
//! 实现 OpenAI-compatible API 的路由层
//! 支持 chat/completions、embeddings 和健康检查端点

use axum::{
    Router,
    routing::{get, post},
};
use tower_http::cors::{CorsLayer, Any};
use std::sync::Arc;

use super::{
    handlers::{
        chat_completions_handler,
        embeddings_handler,
        health_check_handler,
        models_handler,
    },
    ApiState,
};
use crate::api::providers::ProviderRegistry;

/// 创建 OpenAI-compatible API 路由器
/// 
/// # 参数
/// 
/// * `registry` - 供应商注册表
/// 
/// # 返回
/// 
/// 返回配置好的 Axum Router
pub fn create_openai_compatible_router(registry: Arc<ProviderRegistry>) -> Router {
    // 创建 API 状态
    let state = ApiState {
        registry,
        start_time: std::time::Instant::now(),
    };
    
    // 配置 CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    
    // 构建路由
    Router::new()
        // OpenAI-compatible endpoints
        .route("/v1/chat/completions", post(chat_completions_handler))
        .route("/v1/embeddings", post(embeddings_handler))
        .route("/v1/models", get(models_handler))
        // Health check endpoint
        .route("/health", get(health_check_handler))
        // Apply state and middleware
        .with_state(state)
        .layer(cors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::providers::{MultiProviderConfig, ProviderConfig, ProviderType, RoutingStrategy};
    use std::collections::HashMap;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;
    use axum::body::Body;
    
    fn create_test_registry() -> Arc<ProviderRegistry> {
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
        
        Arc::new(ProviderRegistry::new(config).unwrap())
    }
    
    #[tokio::test]
    async fn test_router_creation() {
        let registry = create_test_registry();
        let router = create_openai_compatible_router(registry);
        
        // Router should be created successfully
        assert!(true);
    }
    
    #[tokio::test]
    async fn test_health_endpoint() {
        let registry = create_test_registry();
        let app = create_openai_compatible_router(registry);
        
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap();
        
        assert_eq!(response.status(), StatusCode::OK);
    }
    
    #[tokio::test]
    async fn test_chat_completions_endpoint_exists() {
        let registry = create_test_registry();
        let app = create_openai_compatible_router(registry);
        
        // Test that the endpoint exists (will return error without proper request body)
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/chat/completions")
                    .header("content-type", "application/json")
                    .body(Body::from("{}"))
                    .unwrap()
            )
            .await
            .unwrap();
        
        // Should not be 404 (endpoint exists)
        assert_ne!(response.status(), StatusCode::NOT_FOUND);
    }
    
    #[tokio::test]
    async fn test_embeddings_endpoint_exists() {
        let registry = create_test_registry();
        let app = create_openai_compatible_router(registry);
        
        // Test that the endpoint exists
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/embeddings")
                    .header("content-type", "application/json")
                    .body(Body::from("{}"))
                    .unwrap()
            )
            .await
            .unwrap();
        
        // Should not be 404 (endpoint exists)
        assert_ne!(response.status(), StatusCode::NOT_FOUND);
    }
}
