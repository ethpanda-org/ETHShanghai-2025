use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use crate::shared::jwt::AppState;
use crate::shared::errors::AppError;
use super::types::*;
use super::services::DidService;

pub async fn create_did(
    State(state): State<AppState>,
    Json(payload): Json<CreateDidRequest>,
) -> Result<impl IntoResponse, AppError> {
    let did_service = DidService::new(state.db.clone());
    let did = did_service.create_did_for_user(&payload.user_id, &payload.public_key, payload.services).await?;
    
    let document = did_service.get_did_document(&did).await?.unwrap();
    let response = DidResponse { did, document };
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn get_did(
    State(state): State<AppState>,
    Path(did): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let did_service = DidService::new(state.db.clone());
    match did_service.get_did_document(&did).await? {
        Some(document) => {
            let response = DidResponse { did, document };
            Ok((StatusCode::OK, Json(response)))
        }
        None => Err(AppError::NotFound("DID not found".to_string()))
    }
}

pub async fn get_did_version(
    State(state): State<AppState>,
    Path((did, version)): Path<(String, i32)>,
) -> Result<impl IntoResponse, AppError> {
    let did_service = DidService::new(state.db.clone());
    match did_service.get_did_document_version(&did, version).await? {
        Some(document) => {
            let response = DidResponse { did, document };
            Ok((StatusCode::OK, Json(response)))
        }
        None => Err(AppError::NotFound("DID version not found".to_string()))
    }
}

pub async fn update_did(
    State(state): State<AppState>,
    Path(did): Path<String>,
    Json(payload): Json<UpdateDidRequest>,
) -> Result<impl IntoResponse, AppError> {
    let did_service = DidService::new(state.db.clone());
    did_service.update_did_document(&did, payload.public_key, payload.services).await?;
    
    let document = did_service.get_did_document(&did).await?.unwrap();
    let response = DidResponse { did, document };
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get_did_versions(
    State(state): State<AppState>,
    Path(did): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let did_service = DidService::new(state.db.clone());
    let versions = did_service.get_did_versions(&did).await?;
    Ok((StatusCode::OK, Json(versions)))
}

pub async fn get_user_dids(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let did_service = DidService::new(state.db.clone());
    let dids = did_service.get_user_dids(&user_id).await?;
    Ok((StatusCode::OK, Json(dids)))
}

pub async fn register_did_blockchain(
    State(state): State<AppState>,
    Path(did): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let did_service = DidService::new(state.db.clone());
    let tx_hash = did_service.register_did_on_chain(&did).await?;
    
    let response = serde_json::json!({
        "did": did,
        "tx_hash": tx_hash,
        "status": "registered"
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get_blockchain_status(
    State(state): State<AppState>,
    Path(did): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let did_service = DidService::new(state.db.clone());
    match did_service.get_blockchain_status(&did).await? {
        Some(status) => Ok((StatusCode::OK, Json(status))),
        None => Err(AppError::NotFound("DID not registered on blockchain".to_string()))
    }
}
