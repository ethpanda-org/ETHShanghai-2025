use crate::config::AppState;
use crate::database::{create_pool, init_database};

/// 创建测试用的应用状态
pub async fn create_test_app_state() -> AppState {
    let pool = create_pool().await.expect("Failed to create test database pool");
    init_database(&pool).await.expect("Failed to initialize test database");

    AppState::new(pool)
}

/// 测试用的JWT密钥
pub const TEST_JWT_SECRET: &str = "test_secret_key_for_testing_purposes_only_do_not_use_in_production";

/// 创建测试用的JWT Token
pub fn create_test_jwt_token(user_id: &str) -> String {
    use jsonwebtoken::{encode, EncodingKey, Header};
    use crate::config::Claims;
    
    let now = chrono::Utc::now();
    let claims = Claims {
        sub: user_id.to_string(),
        exp: (now + chrono::Duration::hours(24)).timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(TEST_JWT_SECRET.as_ref()),
    )
    .expect("Failed to create test JWT token")
}

/// 测试用的邮箱验证
pub fn is_valid_test_email(email: &str) -> bool {
    if email.is_empty() {
        return false;
    }
    
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return false;
    }
    
    let local = parts[0];
    let domain = parts[1];
    
    // 本地部分不能为空
    if local.is_empty() {
        return false;
    }
    
    // 域名部分必须包含点且不能为空
    if domain.is_empty() || !domain.contains('.') {
        return false;
    }
    
    // 域名不能以点开头或结尾
    if domain.starts_with('.') || domain.ends_with('.') {
        return false;
    }
    
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_test_app_state() {
        let state = create_test_app_state().await;
        assert!(!state.jwt_secret.is_empty());
        assert!(state.verification_codes.lock().unwrap().is_empty());
        assert!(state.download_tokens.lock().unwrap().is_empty());
    }

    #[test]
    fn test_create_test_jwt_token() {
        let user_id = "test-user-id";
        let token = create_test_jwt_token(user_id);
        assert!(!token.is_empty());
        
        // 验证token可以被解码
        use jsonwebtoken::{decode, DecodingKey, Validation};
        use crate::config::Claims;
        
        let result = decode::<Claims>(
            &token,
            &DecodingKey::from_secret(TEST_JWT_SECRET.as_ref()),
            &Validation::default(),
        );
        
        assert!(result.is_ok());
        let claims = result.unwrap().claims;
        assert_eq!(claims.sub, user_id);
    }

    #[test]
    fn test_is_valid_test_email() {
        assert!(is_valid_test_email("test@example.com"));
        assert!(is_valid_test_email("user.name@domain.co.uk"));
        assert!(!is_valid_test_email("invalid-email"));
        assert!(!is_valid_test_email("@domain.com"));
        assert!(!is_valid_test_email("user@"));
    }
}