use axum::{
    routing::{get, post},
    Router,
};
use crate::shared::jwt::AppState;
use super::handlers::*;

pub fn create_credit_routes() -> Router<AppState> {
    Router::new()
        // 评分计算（需要认证）
        .route("/credit/calculate", post(calculate_score))
        .route("/credit/calculate/:user_id", post(calculate_score_by_id))
        
        // 评分查询（需要认证）
        .route("/credit/score", get(get_score))
        .route("/credit/score/:user_id", get(get_score_by_id))
        
        // 信用画像（需要认证）
        .route("/credit/profile", get(get_profile))
        .route("/credit/profile/:user_id", get(get_profile_by_id))
        
        // 评分历史
        .route("/credit/history", get(get_score_history))
        
        // 数据源状态
        .route("/credit/data_sources", get(get_data_sources_status))
        
        // 批量计算（管理员功能）
        .route("/credit/batch_calculate", post(batch_calculate_scores))
}

