use axum::{
    routing::{get, post},
    Router,
};
use crate::shared::jwt::AppState;
use super::handlers::*;

pub fn create_auth_routes() -> Router<AppState> {
    Router::new()
        .route("/auth/send_code", post(send_code))
        .route("/auth/login", post(login))
        .route("/auth/refresh", post(refresh_token))
        .route("/auth/logout", post(logout))
        .route("/auth/captcha", get(generate_captcha))
        .route("/protected", get(protected_route))
        .route("/admin", get(admin_route))
        .route("/user/:user_id/resource", get(user_resource))
        // 测试辅助路由
        .route("/test/health", get(test_health))
        .route("/test/codes", get(test_get_codes))
        .route("/test/clear_codes", post(test_clear_codes))
        .route("/test/create_admin", post(test_create_admin_user))
}
