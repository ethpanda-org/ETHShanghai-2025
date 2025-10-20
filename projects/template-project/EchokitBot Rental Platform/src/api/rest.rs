// REST API 服务器
use axum::{
    routing::{get, post, delete, put},
    Router,
    middleware,
};
use std::sync::Arc;
use tower_http::cors::{CorsLayer, Any};
use std::net::SocketAddr;

use crate::{
    api::{
        handlers::*,
        auth::AuthService,
        middleware::{AuthMiddleware, cors_middleware, logging_middleware},
    },
    orchestrator::AgentOrchestrator,
    error::Result,
};

/// REST API 服务器
pub struct RestApiServer {
    app: Router,
    addr: SocketAddr,
}

impl RestApiServer {
    /// 创建新的 REST API 服务器
    pub fn new(
        orchestrator: Arc<AgentOrchestrator>,
        auth_service: Arc<AuthService>,
        addr: SocketAddr,
    ) -> Self {
        let app_state = AppState {
            orchestrator,
            start_time: std::time::Instant::now(),
        };

        // 构建路由
        let app = Router::new()
            // 健康检查（无需认证）
            .route("/health", get(health_check))
            .route("/api/v1/health", get(health_check))
            
            // 合约生成 API
            .route("/api/v1/contracts", post(create_contract_generation))
            .route("/api/v1/contracts", get(list_contracts))
            .route("/api/v1/contracts/:task_id", get(get_task_details))
            .route("/api/v1/contracts/:task_id", delete(delete_task))
            .route("/api/v1/contracts/:task_id/cancel", post(cancel_task))
            
            // 合约代码和报告
            .route("/api/v1/contracts/:task_id/code", get(get_contract_code))
            .route("/api/v1/contracts/:task_id/audit", get(get_audit_report))
            .route("/api/v1/contracts/:task_id/audit/rerun", post(rerun_audit))
            
            // 部署
            .route("/api/v1/contracts/:task_id/deploy", post(deploy_contract))
            
            // 添加状态
            .with_state(app_state)
            
            // 添加中间件
            .layer(middleware::from_fn(logging_middleware))
            .layer(middleware::from_fn(cors_middleware))
            .layer(middleware::from_fn_with_state(
                auth_service.clone(),
                AuthMiddleware::authenticate,
            ))
            
            // CORS 配置
            .layer(
                CorsLayer::new()
                    .allow_origin(Any)
                    .allow_methods(Any)
                    .allow_headers(Any)
            );

        Self { app, addr }
    }

    /// 启动服务器
    pub async fn serve(self) -> Result<()> {
        tracing::info!("Starting REST API server on {}", self.addr);
        
        let listener = tokio::net::TcpListener::bind(self.addr)
            .await
            .map_err(|e| crate::error::AgentError::ConfigError(format!("Failed to bind to {}: {}", self.addr, e)))?;

        axum::serve(listener, self.app)
            .await
            .map_err(|e| crate::error::AgentError::ConfigError(format!("Server error: {}", e)))?;

        Ok(())
    }

    /// 获取路由器（用于测试）
    pub fn router(self) -> Router {
        self.app
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;
    use crate::config::Config;

    #[tokio::test]
    async fn test_health_check() {
        let config = Config::default();
        let orchestrator = Arc::new(AgentOrchestrator::new(config.orchestrator).await.unwrap());
        let auth_service = Arc::new(AuthService::new());
        
        let server = RestApiServer::new(
            orchestrator,
            auth_service,
            "127.0.0.1:8080".parse().unwrap(),
        );

        let app = server.router();

        let response = app
            .oneshot(Request::builder().uri("/health").body(axum::body::Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}
