use axum::{
    routing::{get, post},
    Router,
};
use crate::shared::jwt::AppState;
use super::handlers::*;

pub fn create_sbt_routes() -> Router<AppState> {
    Router::new()
        // SBT 发放
        .route("/sbt/auto_issue", post(auto_issue_sbts))
        .route("/sbt/issue/:sbt_type", post(manual_issue_sbt))
        .route("/sbt/admin/issue/:user_id/:sbt_type", post(admin_issue_sbt))
        
        // SBT 查询
        .route("/sbt/my", get(get_my_sbts))
        .route("/sbt/user/:user_id", get(get_user_sbts))
        .route("/sbt/status/:sbt_type", get(get_sbt_status))
        
        // SBT 管理
        .route("/sbt/retry/:sbt_type", post(retry_issuance))
        .route("/sbt/cancel/:sbt_type", post(cancel_issuance))
        .route("/sbt/sync_pending", post(sync_pending))
        
        // SBT 类型和信息
        .route("/sbt/types", get(get_sbt_types))
        .route("/sbt/eligible", get(get_eligible_sbts))
        .route("/sbt/stats", get(get_stats))
}

