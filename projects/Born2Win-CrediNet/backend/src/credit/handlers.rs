use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use crate::shared::jwt::AppState;
use crate::shared::errors::AppError;
use crate::shared::types::Claims;
use super::types::*;
use super::services::CreditService;

#[derive(Deserialize)]
pub struct ScoreQuery {
    force_refresh: Option<bool>,
}

#[derive(Deserialize)]
pub struct HistoryQuery {
    limit: Option<i64>,
}

// ========== 评分计算 ==========

pub async fn calculate_score(
    State(state): State<AppState>,
    claims: Claims,
    Query(query): Query<ScoreQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = CreditService::new(state.db.clone());
    let force_refresh = query.force_refresh.unwrap_or(false);
    
    let score = service.calculate_credit_score(&claims.sub, force_refresh).await?;
    
    let response = CalculateScoreResponse {
        success: true,
        score,
        message: "信用评分计算成功".to_string(),
    };
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn calculate_score_by_id(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Query(query): Query<ScoreQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = CreditService::new(state.db.clone());
    let force_refresh = query.force_refresh.unwrap_or(false);
    
    let score = service.calculate_credit_score(&user_id, force_refresh).await?;
    
    let response = CalculateScoreResponse {
        success: true,
        score,
        message: "信用评分计算成功".to_string(),
    };
    
    Ok((StatusCode::OK, Json(response)))
}

// ========== 评分查询 ==========

pub async fn get_score(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<impl IntoResponse, AppError> {
    let service = CreditService::new(state.db.clone());
    let score = service.get_user_score(&claims.sub).await?;
    
    let response = GetScoreResponse {
        user_id: claims.sub,
        score,
    };
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get_score_by_id(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = CreditService::new(state.db.clone());
    let score = service.get_user_score(&user_id).await?;
    
    let response = GetScoreResponse {
        user_id,
        score,
    };
    
    Ok((StatusCode::OK, Json(response)))
}

// ========== 信用画像 ==========

pub async fn get_profile(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<impl IntoResponse, AppError> {
    let service = CreditService::new(state.db.clone());
    
    match service.get_user_profile(&claims.sub).await? {
        Some(profile) => Ok((StatusCode::OK, Json(profile))),
        None => Err(AppError::NotFound("信用画像不存在".to_string())),
    }
}

pub async fn get_profile_by_id(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = CreditService::new(state.db.clone());
    
    match service.get_user_profile(&user_id).await? {
        Some(profile) => Ok((StatusCode::OK, Json(profile))),
        None => Err(AppError::NotFound("信用画像不存在".to_string())),
    }
}

// ========== 评分历史 ==========

pub async fn get_score_history(
    State(state): State<AppState>,
    claims: Claims,
    Query(query): Query<HistoryQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = CreditService::new(state.db.clone());
    let history = service.get_score_history(&claims.sub, query.limit).await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "user_id": claims.sub,
        "history": history,
        "count": history.len(),
    }))))
}

// ========== 数据源状态 ==========

pub async fn get_data_sources_status(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<impl IntoResponse, AppError> {
    let service = CreditService::new(state.db.clone());
    let sources = service.get_data_sources_status(&claims.sub).await?;
    
    let response = DataSourcesStatusResponse {
        user_id: claims.sub,
        sources,
    };
    
    Ok((StatusCode::OK, Json(response)))
}

// ========== 批量计算 ==========

#[derive(Deserialize)]
pub struct BatchCalculateRequest {
    pub user_ids: Vec<String>,
}

pub async fn batch_calculate_scores(
    State(state): State<AppState>,
    Json(payload): Json<BatchCalculateRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = CreditService::new(state.db.clone());
    let scores = service.batch_calculate_scores(payload.user_ids).await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "count": scores.len(),
        "scores": scores,
    }))))
}

