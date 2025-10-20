use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use crate::shared::jwt::AppState;
use crate::shared::errors::AppError;
use crate::shared::types::Claims;
use super::types::*;
use super::services::SbtService;
use super::mapper::SbtMapper;

// ========== SBT 发放 ==========

/// 自动发放SBT（基于用户画像）
pub async fn auto_issue_sbts(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<impl IntoResponse, AppError> {
    let service = SbtService::new(state.db.clone());
    let issued_sbts = service.auto_issue_sbts(&claims.sub).await?;
    
    let count = issued_sbts.len();
    let response = IssueSbtResponse {
        success: true,
        issued_sbts,
        message: format!("成功发放 {} 个SBT", count),
    };
    
    Ok((StatusCode::OK, Json(response)))
}

/// 手动发放指定类型的SBT
pub async fn manual_issue_sbt(
    State(state): State<AppState>,
    claims: Claims,
    Path(sbt_type): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = SbtService::new(state.db.clone());
    let issued_sbt = service.manual_issue_sbt(&claims.sub, &sbt_type).await?;
    
    let response = IssueSbtResponse {
        success: true,
        issued_sbts: vec![issued_sbt],
        message: "SBT发放成功".to_string(),
    };
    
    Ok((StatusCode::OK, Json(response)))
}

/// 管理员为指定用户发放SBT
pub async fn admin_issue_sbt(
    State(state): State<AppState>,
    Path((user_id, sbt_type)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let service = SbtService::new(state.db.clone());
    let issued_sbt = service.manual_issue_sbt(&user_id, &sbt_type).await?;
    
    let response = IssueSbtResponse {
        success: true,
        issued_sbts: vec![issued_sbt],
        message: "SBT发放成功".to_string(),
    };
    
    Ok((StatusCode::OK, Json(response)))
}

// ========== SBT 查询 ==========

/// 获取当前用户的所有SBT
pub async fn get_my_sbts(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<impl IntoResponse, AppError> {
    let service = SbtService::new(state.db.clone());
    let sbts = service.get_user_sbts(&claims.sub).await?;
    
    let response = GetUserSbtsResponse {
        user_id: claims.sub,
        count: sbts.len(),
        sbts,
    };
    
    Ok((StatusCode::OK, Json(response)))
}

/// 获取指定用户的所有SBT
pub async fn get_user_sbts(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = SbtService::new(state.db.clone());
    let sbts = service.get_user_sbts(&user_id).await?;
    
    let response = GetUserSbtsResponse {
        user_id,
        count: sbts.len(),
        sbts,
    };
    
    Ok((StatusCode::OK, Json(response)))
}

/// 获取特定SBT的状态
pub async fn get_sbt_status(
    State(state): State<AppState>,
    claims: Claims,
    Path(sbt_type): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = SbtService::new(state.db.clone());
    
    match service.get_sbt_status(&claims.sub, &sbt_type).await? {
        Some(status) => Ok((StatusCode::OK, Json(status))),
        None => Err(AppError::NotFound("SBT发放记录不存在".to_string())),
    }
}

// ========== SBT 管理 ==========

/// 重试失败的SBT发放
pub async fn retry_issuance(
    State(state): State<AppState>,
    claims: Claims,
    Path(sbt_type): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = SbtService::new(state.db.clone());
    let issued_sbt = service.retry_failed_issuance(&claims.sub, &sbt_type).await?;
    
    let response = IssueSbtResponse {
        success: true,
        issued_sbts: vec![issued_sbt],
        message: "SBT重新发放成功".to_string(),
    };
    
    Ok((StatusCode::OK, Json(response)))
}

/// 撤销SBT发放
pub async fn cancel_issuance(
    State(state): State<AppState>,
    claims: Claims,
    Path(sbt_type): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = SbtService::new(state.db.clone());
    service.cancel_issuance(&claims.sub, &sbt_type).await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "message": "SBT发放已撤销"
    }))))
}

/// 同步待确认的交易
pub async fn sync_pending(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = SbtService::new(state.db.clone());
    let count = service.sync_pending_transactions().await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "synced_count": count,
        "message": format!("已同步 {} 个待确认交易", count)
    }))))
}

// ========== SBT 类型查询 ==========

/// 获取所有SBT类型列表
pub async fn get_sbt_types() -> Result<impl IntoResponse, AppError> {
    let types = SbtMapper::get_all_sbt_types();
    
    let response = SbtTypesResponse { types };
    
    Ok((StatusCode::OK, Json(response)))
}

/// 获取当前用户符合条件的SBT
pub async fn get_eligible_sbts(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<impl IntoResponse, AppError> {
    let mapper = SbtMapper::new(state.db.clone());
    let eligible = mapper.determine_eligible_sbts(&claims.sub).await?;
    let unissued = mapper.filter_unissued_sbts(&claims.sub, eligible).await?;
    
    let types: Vec<SbtTypeInfo> = unissued.into_iter()
        .map(|sbt| SbtMapper::get_sbt_type_info(&sbt))
        .collect();
    
    Ok((StatusCode::OK, Json(SbtTypesResponse { types })))
}

/// 获取发放统计
pub async fn get_stats(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<impl IntoResponse, AppError> {
    let service = SbtService::new(state.db.clone());
    let stats = service.get_issuance_stats(&claims.sub).await?;
    
    Ok((StatusCode::OK, Json(stats)))
}

