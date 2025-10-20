use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use crate::shared::jwt::AppState;
use crate::shared::errors::AppError;
use super::types::*;
use super::services::AuthorizationService;

#[derive(Deserialize)]
pub struct LogsQuery {
    limit: Option<i64>,
}

// ========== 授权管理 ==========
pub async fn set_authorization(
    State(state): State<AppState>,
    Json(payload): Json<SetAuthorizationRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthorizationService::new(state.db.clone());
    service.set_authorization(
        &payload.user_id,
        &payload.data_source,
        payload.authorized,
        payload.purpose.as_deref(),
        None, // IP地址可从请求头获取
    ).await?;
    
    let response = SetAuthorizationResponse {
        success: true,
        data_source: payload.data_source,
        status: if payload.authorized { "authorized".to_string() } else { "revoked".to_string() },
        message: if payload.authorized {
            "数据源授权成功".to_string()
        } else {
            "数据源授权已撤销".to_string()
        },
    };
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn batch_set_authorizations(
    State(state): State<AppState>,
    Json(payload): Json<BatchAuthorizationRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthorizationService::new(state.db.clone());
    let count = service.batch_set_authorizations(
        &payload.user_id,
        payload.authorizations,
        None,
    ).await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "updated_count": count,
        "message": format!("成功更新{}个数据源授权", count)
    }))))
}

pub async fn get_user_authorizations(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthorizationService::new(state.db.clone());
    let authorizations = service.get_user_authorizations(&user_id).await?;
    
    let response = UserAuthorizationsResponse {
        user_id,
        authorizations,
    };
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn check_authorization(
    State(state): State<AppState>,
    Path((user_id, data_source)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthorizationService::new(state.db.clone());
    let authorized = service.check_authorization(&user_id, &data_source).await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "user_id": user_id,
        "data_source": data_source,
        "authorized": authorized
    }))))
}

pub async fn get_authorized_data_sources(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthorizationService::new(state.db.clone());
    let data_sources = service.get_authorized_data_sources(&user_id).await?;
    
    let response = AuthorizedDataSourcesResponse {
        user_id,
        count: data_sources.len(),
        data_sources,
    };
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn revoke_and_cleanup(
    State(state): State<AppState>,
    Path((user_id, data_source)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthorizationService::new(state.db.clone());
    service.revoke_and_cleanup_data(&user_id, &data_source, None).await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "message": "授权已撤销并清理相关数据"
    }))))
}

// ========== 授权日志 ==========
pub async fn get_authorization_logs(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Query(query): Query<LogsQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthorizationService::new(state.db.clone());
    let logs = service.get_authorization_logs(&user_id, query.limit).await?;
    
    let response = AuthorizationLogsResponse {
        user_id,
        logs,
    };
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get_data_source_logs(
    State(state): State<AppState>,
    Path((user_id, data_source)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthorizationService::new(state.db.clone());
    let logs = service.get_data_source_logs(&user_id, &data_source).await?;
    
    let response = AuthorizationLogsResponse {
        user_id,
        logs,
    };
    
    Ok((StatusCode::OK, Json(response)))
}

// ========== 权限范围 ==========
pub async fn get_data_source_scopes() -> Result<impl IntoResponse, AppError> {
    let scopes = AuthorizationService::get_data_source_scopes();
    
    let response = DataSourceScopesResponse { scopes };
    
    Ok((StatusCode::OK, Json(response)))
}

// ========== 统计 ==========
pub async fn get_authorization_stats(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthorizationService::new(state.db.clone());
    let stats = service.get_authorization_stats(&user_id).await?;
    
    Ok((StatusCode::OK, Json(stats)))
}
