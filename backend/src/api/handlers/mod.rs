use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use uuid::Uuid;
use chrono::Utc;

use crate::api::ApiState;
use crate::types::*;

pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        timestamp: Utc::now(),
        version: "0.1.0".to_string(),
    })
}

pub async fn start_strategy(
    State(state): State<ApiState>,
    Json(request): Json<StartStrategyRequest>,
) -> Result<Json<StartStrategyResponse>, (StatusCode, Json<ApiError>)> {
    match state.trading_service.start_strategy(request.config).await {
        Ok(strategy_id) => Ok(Json(StartStrategyResponse {
            strategy_id,
            message: "Strategy started successfully".to_string(),
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                error: "strategy_start_failed".to_string(),
                message: e.to_string(),
            }),
        )),
    }
}

pub async fn get_price(
    State(state): State<ApiState>,
    Path(pair): Path<String>,
) -> Result<Json<PriceResponse>, (StatusCode, Json<ApiError>)> {
    match state.trading_service.get_price(&pair).await {
        Ok(price) => Ok(Json(PriceResponse {
            pair,
            price,
            timestamp: Utc::now(),
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                error: "price_fetch_failed".to_string(),
                message: e.to_string(),
            }),
        )),
    }
}

// 新增：POST /api/price，接受前端传入的私钥与交易对
pub async fn post_price(
    State(state): State<ApiState>,
    Json(req): Json<GetPriceRequest>,
) -> Result<Json<PriceResponse>, (StatusCode, Json<ApiError>)> {
    match state.trading_service.get_price_with_key(&req.pair, &req.private_key).await {
        Ok(price) => Ok(Json(PriceResponse {
            pair: req.pair,
            price,
            timestamp: Utc::now(),
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                error: "price_fetch_failed".to_string(),
                message: e.to_string(),
            }),
        )),
    }
}

pub async fn get_strategy_logs(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Result<Json<LogsResponse>, (StatusCode, Json<ApiError>)> {
    match state.trading_service.get_strategy_logs(id).await {
        Ok(logs) => Ok(Json(LogsResponse {
            strategy_id: id,
            logs,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                error: "logs_fetch_failed".to_string(),
                message: e.to_string(),
            }),
        )),
    }
}

pub async fn get_strategy_status(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Result<Json<StrategyStatusResponse>, (StatusCode, Json<ApiError>)> {
    match state.trading_service.get_strategy_status(id).await {
        Ok(Some(response)) => Ok(Json(response)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                error: "strategy_not_found".to_string(),
                message: "Strategy not found".to_string(),
            }),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                error: "strategy_status_failed".to_string(),
                message: e.to_string(),
            }),
        )),
    }
}

pub async fn pause_strategy(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    match state.trading_service.pause_strategy(id).await {
        Ok(()) => Ok(Json(serde_json::json!({
            "message": "Strategy paused successfully"
        }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                error: "strategy_pause_failed".to_string(),
                message: e.to_string(),
            }),
        )),
    }
}

pub async fn resume_strategy(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    match state.trading_service.resume_strategy(id).await {
        Ok(()) => Ok(Json(serde_json::json!({
            "message": "Strategy resumed successfully"
        }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                error: "strategy_resume_failed".to_string(),
                message: e.to_string(),
            }),
        )),
    }
}

pub async fn stop_strategy(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    match state.trading_service.stop_strategy(id).await {
        Ok(()) => Ok(Json(serde_json::json!({
            "message": "Strategy stopped successfully"
        }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                error: "strategy_stop_failed".to_string(),
                message: e.to_string(),
            }),
        )),
    }
}