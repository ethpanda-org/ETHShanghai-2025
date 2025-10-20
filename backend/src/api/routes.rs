use super::{handlers, ApiState};
use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::CorsLayer;

pub fn create_router(state: ApiState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(handlers::health_check))
        
        // Strategy routes
        .route("/api/strategy/start", post(handlers::start_strategy))
        .route("/api/strategy/:id/status", get(handlers::get_strategy_status))
        .route("/api/strategy/:id/pause", post(handlers::pause_strategy))
        .route("/api/strategy/:id/resume", post(handlers::resume_strategy))
        .route("/api/strategy/:id/stop", post(handlers::stop_strategy))
        .route("/api/strategy/:id/logs", get(handlers::get_strategy_logs))
        
        // Price routes
        .route("/api/price/:pair", get(handlers::get_price))
        .route("/api/price", post(handlers::post_price))
        
        .with_state(state)
        .layer(CorsLayer::permissive())
}