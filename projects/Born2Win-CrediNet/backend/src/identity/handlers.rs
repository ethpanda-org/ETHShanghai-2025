use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use crate::shared::jwt::AppState;
use crate::shared::errors::AppError;
use super::types::*;
use super::services::IdentityService;

// ========== World ID 验证 ==========
pub async fn verify_worldid(
    State(state): State<AppState>,
    Json(payload): Json<WorldIdVerifyRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    let verified = service.verify_worldid(
        &payload.user_id,
        &payload.proof,
        &payload.action,
        &payload.signal,
    ).await?;
    
    let response = WorldIdVerifyResponse {
        success: true,
        verified,
        message: if verified {
            "World ID verification successful".to_string()
        } else {
            "World ID verification failed".to_string()
        },
    };
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn check_worldid_status(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    let verified = service.check_worldid_status(&user_id).await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "user_id": user_id,
        "worldid_verified": verified
    }))))
}

// ========== 可验证凭证验证 ==========
pub async fn verify_credential(
    State(state): State<AppState>,
    Json(payload): Json<VcVerifyRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    let (verified, credential_data) = service.verify_credential(
        &payload.user_id,
        &payload.credential,
    ).await?;
    
    let response = VcVerifyResponse {
        success: true,
        verified,
        credential_data: credential_data.map(|c| serde_json::to_value(c).unwrap()),
        message: if verified {
            "Credential verification successful".to_string()
        } else {
            "Credential verification failed".to_string()
        },
    };
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get_user_credentials(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    let credentials = service.get_user_credentials(&user_id).await?;
    
    Ok((StatusCode::OK, Json(credentials)))
}

// ========== OAuth 绑定 ==========
pub async fn bind_oauth(
    State(state): State<AppState>,
    Json(payload): Json<OAuthBindRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    let user_info = service.bind_oauth(
        &payload.user_id,
        &payload.provider,
        &payload.code,
        &payload.redirect_uri,
    ).await?;
    
    let response = OAuthBindResponse {
        success: true,
        provider: payload.provider,
        external_id: user_info.id,
        message: "OAuth binding successful".to_string(),
    };
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn unbind_oauth(
    State(state): State<AppState>,
    Json(payload): Json<OAuthUnbindRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    service.unbind_oauth(&payload.user_id, &payload.provider).await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "message": "OAuth unbinding successful"
    }))))
}

pub async fn get_oauth_bindings(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    let bindings = service.get_oauth_bindings(&user_id).await?;
    
    Ok((StatusCode::OK, Json(bindings)))
}

// ========== 钱包地址关联 ==========
pub async fn connect_wallet(
    State(state): State<AppState>,
    Json(payload): Json<WalletConnectRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    let verified = service.connect_wallet(
        &payload.user_id,
        &payload.address,
        &payload.chain_type,
        payload.signature.as_deref(),
        payload.message.as_deref(),
    ).await?;
    
    let response = WalletConnectResponse {
        success: true,
        address: payload.address,
        verified,
        message: if verified {
            "Wallet connected and verified".to_string()
        } else {
            "Wallet connected but not verified".to_string()
        },
    };
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn set_primary_wallet(
    State(state): State<AppState>,
    Json(payload): Json<SetPrimaryWalletRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    service.set_primary_wallet(&payload.user_id, &payload.address).await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "message": "Primary wallet set successfully"
    }))))
}

pub async fn get_user_wallets(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    let wallets = service.get_user_wallets(&user_id).await?;
    
    let response = WalletListResponse { wallets };
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get_primary_wallet(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    let primary_wallet = service.get_primary_wallet(&user_id).await?;
    
    Ok((StatusCode::OK, Json(serde_json::json!({
        "user_id": user_id,
        "primary_wallet": primary_wallet
    }))))
}

// ========== 综合查询 ==========
pub async fn get_user_identity_info(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = IdentityService::new(state.db.clone());
    let identity_info = service.get_user_identity_info(&user_id).await?;
    
    Ok((StatusCode::OK, Json(identity_info)))
}

