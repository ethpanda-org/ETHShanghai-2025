use axum::{
    extract::State,
    http::{StatusCode, HeaderMap},
    response::{IntoResponse, Response},
    Json,
};
use crate::shared::types::{SendCodeRequest, LoginRequest, LoginResponse, RefreshTokenRequest};
use crate::shared::errors::AppError;
use crate::shared::jwt::AppState;
use crate::shared::permission::{RequirePermission, AdminOnly};
use crate::shared::captcha::verify_captcha;
use crate::auth::services::AuthService;

pub async fn send_code(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<SendCodeRequest>,
) -> Result<impl IntoResponse, AppError> {
    // CAPTCHA验证（可选，根据环境变量启用）
    let require_captcha = std::env::var("REQUIRE_CAPTCHA_FOR_SEND_CODE")
        .unwrap_or_else(|_| "false".to_string())
        .parse::<bool>()
        .unwrap_or(false);

    if require_captcha {
        if let Some(captcha_token) = &payload.captcha_token {
            let client_ip = headers
                .get("x-forwarded-for")
                .and_then(|v| v.to_str().ok());
            
            verify_captcha(captcha_token, client_ip).await?;
        } else {
            return Err(AppError::ValidationError("CAPTCHA token required".to_string()));
        }
    }

    let auth_service = AuthService::new(state.db.clone(), state.jwt_secret.clone());
    auth_service.send_verification_code(&payload.contact).await?;
    Ok((StatusCode::OK, "Verification code sent"))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Response, AppError> {
    let auth_service = AuthService::new(state.db.clone(), state.jwt_secret.clone());
    let (access_token, refresh_token, user_id, expires_in) = 
        auth_service.verify_code_and_login(&payload.contact, &payload.code).await?;
    
    let resp = LoginResponse { 
        access_token, 
        refresh_token, 
        user_id,
        expires_in,
    };
    Ok((StatusCode::OK, Json(resp)).into_response())
}

pub async fn refresh_token(
    State(state): State<AppState>,
    Json(payload): Json<RefreshTokenRequest>,
) -> Result<Response, AppError> {
    let auth_service = AuthService::new(state.db.clone(), state.jwt_secret.clone());
    let (access_token, expires_in) = auth_service.refresh_access_token(&payload.refresh_token).await?;
    
    let resp = serde_json::json!({
        "access_token": access_token,
        "expires_in": expires_in,
    });
    Ok((StatusCode::OK, Json(resp)).into_response())
}

pub async fn logout(
    State(state): State<AppState>,
    Json(payload): Json<RefreshTokenRequest>,
) -> Result<impl IntoResponse, AppError> {
    let auth_service = AuthService::new(state.db.clone(), state.jwt_secret.clone());
    auth_service.revoke_refresh_token(&payload.refresh_token).await?;
    Ok((StatusCode::OK, "Logged out successfully"))
}

pub async fn protected_route(perm: RequirePermission) -> impl IntoResponse {
    (StatusCode::OK, format!("Hello user {} with role {} (permission: {:?})", 
        perm.claims.sub, perm.claims.role, perm.permission))
}

pub async fn admin_route(admin: AdminOnly) -> impl IntoResponse {
    (StatusCode::OK, format!("Welcome, admin {}!", admin.claims.sub))
}

// 演示资源权限检查
pub async fn user_resource(
    perm: RequirePermission,
    axum::extract::Path(user_id): axum::extract::Path<String>,
) -> Result<impl IntoResponse, AppError> {
    // 检查是否是本人或管理员
    perm.is_self_or_admin(&user_id)?;
    
    Ok((StatusCode::OK, format!("Access granted to user {} resource", user_id)))
}

// CAPTCHA生成接口（用于简单验证码）
pub async fn generate_captcha() -> impl IntoResponse {
    use crate::shared::captcha::SimpleCaptchaVerifier;
    use uuid::Uuid;

    let verifier = SimpleCaptchaVerifier::new();
    let session_id = Uuid::new_v4().to_string();
    let code = verifier.generate(&session_id);

    let response = serde_json::json!({
        "session_id": session_id,
        "code": code, // 在生产环境中不应该返回，这里仅用于测试
        "hint": "Use session_id:code as captcha_token",
    });

    (StatusCode::OK, Json(response))
}

// 测试辅助接口
pub async fn test_health() -> impl IntoResponse {
    (StatusCode::OK, "Service is healthy")
}

pub async fn test_get_codes(State(state): State<AppState>) -> impl IntoResponse {
    let auth_service = AuthService::new(state.db.clone(), state.jwt_secret.clone());
    let codes = auth_service.get_codes();
    (StatusCode::OK, Json(codes))
}

pub async fn test_clear_codes(State(state): State<AppState>) -> impl IntoResponse {
    let auth_service = AuthService::new(state.db.clone(), state.jwt_secret.clone());
    auth_service.clear_codes();
    (StatusCode::OK, "All verification codes cleared")
}

pub async fn test_create_admin_user(State(state): State<AppState>) -> impl IntoResponse {
    let admin_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    match sqlx::query("INSERT OR REPLACE INTO users (id, contact, role, created_at) VALUES (?, ?, ?, ?)")
        .bind(&admin_id)
        .bind("admin@example.com")
        .bind("admin")
        .bind(now)
        .execute(&state.db)
        .await 
    {
        Ok(_) => (StatusCode::OK, format!("Admin user created with ID: {}", admin_id)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create admin user: {}", e)).into_response(),
    }
}
