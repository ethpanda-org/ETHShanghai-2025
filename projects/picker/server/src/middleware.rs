use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::Response,
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde_json::json;
use uuid::Uuid;

use crate::config::{AppState, Claims};

pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    // 从 Authorization 头中提取 token
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
        .and_then(|header| {
            if header.starts_with("Bearer ") {
                Some(&header[7..])
            } else {
                None
            }
        });

    let token = auth_header.ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "Unauthorized",
                "message": "Missing or invalid authorization header. Please provide a Bearer token."
            }))
        )
    })?;

    // 验证 JWT token
    let claims = decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.jwt_secret.as_ref()),
        &Validation::default(),
    )
    .map_err(|err| {
        let error_message = match err.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => "Token has expired",
            jsonwebtoken::errors::ErrorKind::InvalidToken => "Invalid token format",
            jsonwebtoken::errors::ErrorKind::InvalidSignature => "Invalid token signature",
            _ => "Token validation failed",
        };
        
        (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "Unauthorized",
                "message": error_message
            }))
        )
    })?
    .claims;

    // 解析用户ID
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "Unauthorized",
                "message": "Invalid user ID in token"
            }))
        )
    })?;

    // 验证用户是否存在
    let user_exists = sqlx::query("SELECT 1 FROM users WHERE user_id = ? LIMIT 1")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Internal Server Error",
                    "message": "Database error during authentication"
                }))
            )
        })?;

    if user_exists.is_none() {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "Unauthorized",
                "message": "User not found"
            }))
        ));
    }

    // 将用户ID添加到请求扩展中
    request.extensions_mut().insert(user_id);

    Ok(next.run(request).await)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        middleware,
        routing::get,
        Router,
    };
    use jsonwebtoken::{encode, EncodingKey, Header};
    use tower::ServiceExt;
    use uuid::Uuid;

    async fn test_handler() -> &'static str {
        "success"
    }

    async fn create_test_app_state() -> AppState {
        let pool = crate::database::create_pool().await.unwrap();
        crate::database::init_database(&pool).await.unwrap();
        AppState::new(pool)
    }

    fn create_test_token(user_id: &str, secret: &str) -> String {
        let now = chrono::Utc::now();
        let claims = Claims {
            sub: user_id.to_string(),
            exp: (now + chrono::Duration::hours(24)).timestamp() as usize,
            iat: now.timestamp() as usize,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_ref()),
        )
        .unwrap()
    }

    #[tokio::test]
    async fn test_auth_middleware_with_valid_token() {
        let state = create_test_app_state().await;
        
        // 初始化数据库
        crate::database::init_database(&state.db).await.unwrap();
        
        let user_id = Uuid::new_v4();
        let user_id_str = user_id.to_string();
        
        // 在数据库中插入测试用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(user_id)
        .bind("test@example.com")
        .bind("Test User")
        .bind("hashed_password")
        .bind("gen")
        .bind("test_private_key")
        .bind("test_wallet_address")
        .bind(0)
        .bind(chrono::Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();
        
        let token = create_test_token(&user_id_str, &state.jwt_secret);

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_auth_middleware_without_token() {
        let state = create_test_app_state().await;

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_with_invalid_token() {
        let state = create_test_app_state().await;

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, "Bearer invalid_token")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_with_malformed_header() {
        let state = create_test_app_state().await;

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, "InvalidFormat token")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_with_expired_token() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4().to_string();
        
        // 创建过期的token
        let now = chrono::Utc::now();
        let expired_claims = Claims {
            sub: user_id,
            exp: (now - chrono::Duration::hours(1)).timestamp() as usize,
            iat: (now - chrono::Duration::hours(2)).timestamp() as usize,
        };

        let expired_token = encode(
            &Header::default(),
            &expired_claims,
            &EncodingKey::from_secret(state.jwt_secret.as_ref()),
        )
        .unwrap();

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, format!("Bearer {}", expired_token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_with_wrong_secret() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4().to_string();
        let wrong_token = create_test_token(&user_id, "wrong_secret");

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, format!("Bearer {}", wrong_token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_with_invalid_user_id_in_token() {
        let state = create_test_app_state().await;
        
        // 创建包含无效用户ID的token
        let now = chrono::Utc::now();
        let claims = Claims {
            sub: "invalid-uuid".to_string(), // 无效的UUID格式
            exp: (now + chrono::Duration::hours(24)).timestamp() as usize,
            iat: now.timestamp() as usize,
        };

        let invalid_token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(state.jwt_secret.as_ref()),
        )
        .unwrap();

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, format!("Bearer {}", invalid_token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_with_nonexistent_user() {
        let state = create_test_app_state().await;
        
        // 初始化数据库
        crate::database::init_database(&state.db).await.unwrap();
        
        // 创建一个不存在于数据库中的用户ID
        let nonexistent_user_id = Uuid::new_v4();
        let token = create_test_token(&nonexistent_user_id.to_string(), &state.jwt_secret);

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_with_empty_bearer_token() {
        let state = create_test_app_state().await;

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, "Bearer ")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_with_only_bearer() {
        let state = create_test_app_state().await;

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, "Bearer")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_with_case_sensitive_bearer() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4().to_string();
        let token = create_test_token(&user_id, &state.jwt_secret);

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        // 测试小写的bearer
        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, format!("bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_with_malformed_jwt() {
        let state = create_test_app_state().await;

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        // 测试格式错误的JWT（缺少部分）
        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_database_error_simulation() {
        let state = create_test_app_state().await;
        
        // 关闭数据库连接池来模拟数据库错误
        state.db.close().await;
        
        let user_id = Uuid::new_v4();
        let token = create_test_token(&user_id.to_string(), &state.jwt_secret);

        let app = Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[tokio::test]
    async fn test_auth_middleware_user_id_extraction() {
        let state = create_test_app_state().await;
        
        // 初始化数据库
        crate::database::init_database(&state.db).await.unwrap();
        
        let user_id = Uuid::new_v4();
        let user_id_str = user_id.to_string();
        
        // 在数据库中插入测试用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(user_id)
        .bind("test@example.com")
        .bind("Test User")
        .bind("hashed_password")
        .bind("gen")
        .bind("test_private_key")
        .bind("test_wallet_address")
        .bind(0)
        .bind(chrono::Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();
        
        let token = create_test_token(&user_id_str, &state.jwt_secret);

        // 创建一个测试处理器来验证用户ID是否正确提取
        async fn test_handler_with_user_id(
            axum::extract::Extension(extracted_user_id): axum::extract::Extension<Uuid>,
        ) -> String {
            extracted_user_id.to_string()
        }

        let app = Router::new()
            .route("/test", get(test_handler_with_user_id))
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .with_state(state);

        let request = Request::builder()
            .uri("/test")
            .header(AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        
        // 验证响应体包含正确的用户ID
        let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        assert_eq!(body_str, user_id_str);
    }

    #[test]
    fn test_create_test_token_function() {
        let user_id = "test-user-id";
        let secret = "test-secret";
        
        let token = create_test_token(user_id, secret);
        
        // 验证token不为空
        assert!(!token.is_empty());
        
        // 验证token可以被解码
        let decoded = decode::<Claims>(
            &token,
            &DecodingKey::from_secret(secret.as_ref()),
            &Validation::default(),
        );
        
        assert!(decoded.is_ok());
        let claims = decoded.unwrap().claims;
        assert_eq!(claims.sub, user_id);
        assert!(claims.exp > claims.iat);
    }
}
