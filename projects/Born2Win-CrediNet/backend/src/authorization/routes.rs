use axum::{
    routing::{get, post},
    Router,
};
use crate::shared::jwt::AppState;
use super::handlers::*;

pub fn create_authorization_routes() -> Router<AppState> {
    Router::new()
        // 授权管理
        .route("/authorization/set", post(set_authorization))
        .route("/authorization/batch", post(batch_set_authorizations))
        .route("/authorization/:user_id", get(get_user_authorizations))
        .route("/authorization/:user_id/:data_source", get(check_authorization))
        .route("/authorization/:user_id/authorized", get(get_authorized_data_sources))
        .route("/authorization/:user_id/:data_source/revoke", post(revoke_and_cleanup))
        
        // 授权日志
        .route("/authorization/:user_id/logs", get(get_authorization_logs))
        .route("/authorization/:user_id/:data_source/logs", get(get_data_source_logs))
        
        // 权限范围
        .route("/authorization/scopes", get(get_data_source_scopes))
        
        // 统计
        .route("/authorization/:user_id/stats", get(get_authorization_stats))
}
