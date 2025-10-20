pub mod users;
pub mod pickers;
pub mod orders;
pub mod picker_payment_contract;

pub use users::*;
pub use pickers::*;
pub use orders::*;
pub use picker_payment_contract::*;

use axum::{
    middleware,
    routing::{get, post, delete},
    Router,
};
use tower_http::{cors::CorsLayer, services::ServeDir};

use crate::config::AppState;
use crate::download::download;
use crate::openapi::create_swagger_routes;
use crate::middleware::auth_middleware;


/// 健康检查处理函数
#[utoipa::path(
    get,
    path = "/",
    tag = "health",
    summary = "Health Check",
    description = "Check if the server is running",
    responses(
        (status = 200, description = "Server is running", body = String, example = "Pickers Server is running!")
    )
)]
pub async fn health_check() -> &'static str {
    "Pickers Server is running!"
}

/// 创建公开路由
pub fn create_routes() -> Router<AppState> {
    Router::new()
        // 健康检查
        .route("/", get(health_check))
        // 用户相关路由（公开）
        .route("/api/users/system_info", get(get_system_info))
        .route("/api/users/register", post(register))
        .route("/api/users/verify", post(verify))
        .route("/api/users/login", post(login))
        // Picker相关路由（公开）
        .route("/api/pickers", get(get_market))
        .route("/api/pickers/{picker_id}", get(get_picker_detail))
        .route("/api/pickers/is-operator", get(is_picker_operator))
        .route("/api/pickers/query-picker-by-wallet", get(query_picker_by_wallet))
        // 下载路由
        .route("/download", get(download))
        // 添加静态文件服务
        .nest_service("/uploads/images", ServeDir::new("./uploads/images"))
        // Swagger UI 路由
        .merge(create_swagger_routes())
        // 添加CORS支持
        .layer(CorsLayer::permissive())
}

/// 创建需要认证的路由
pub fn create_protected_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/users/profile", get(get_profile))
        .route("/api/users/transfer-to", post(transfer_to))
        .route("/api/users/replace-private-key", post(replace_private_key))
        .route("/api/pickers", post(upload_picker))
        .route("/api/pickers/{picker_id}", delete(delete_picker))
        .route("/api/pickers/register-picker", post(register_picker))
        .route("/api/pickers/remove-picker", post(remove_picker))
        .route("/api/pickers/get-all-pickers", get(get_all_pickers))
        .route("/api/pickers/get-all-operators", get(get_all_operators))
        .route("/api/pickers/grant-operator-role", post(grant_operator_role))
        .route("/api/pickers/revoke-operator-role", post(revoke_operator_role))
        .route("/api/pickers/withdraw-funds", post(withdraw_funds))
        .route("/api/orders", post(create_order))
        .route("/api/orders/{order_id}", get(get_order_detail))
        .route("/api/orders", get(get_user_orders))
        // 添加文件大小限制 (20MB)
        .layer(axum::extract::DefaultBodyLimit::max(100 * 1024 * 1024))
        // 应用认证中间件到所有受保护的路由
        .layer(middleware::from_fn_with_state(state, auth_middleware))
}
