//! OpenAI-Compatible API 模块
//! 
//! 提供统一的 OpenAI-compatible HTTP 接口，支持国内外主流大模型供应商无缝切换

pub mod models;
pub mod handlers;
pub mod middleware;
pub mod router;  // Task 10 完成
pub mod providers;  // Task 3 完成
// pub mod rate_limiter;  // TODO: Task 11
pub mod error;

pub use models::*;
pub use handlers::*;
pub use router::*;
pub use error::{ApiError, ApiResult, ErrorResponse, ErrorDetail};
pub use providers::{ProviderType, ProviderConfig, MultiProviderConfig, RoutingStrategy};

use axum::Router;
use std::sync::Arc;

/// API 服务器状态
pub use handlers::ApiState;

/// 创建 API 路由器
/// 
/// # 参数
/// 
/// * `registry` - 供应商注册表
/// 
/// # 返回
/// 
/// 返回配置好的 Axum Router
pub fn create_router(registry: Arc<crate::api::providers::ProviderRegistry>) -> Router {
    router::create_openai_compatible_router(registry)
}