use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use rand::RngCore;
use serde_json::json;
use sha2::{Digest, Sha256};
use uuid::Uuid;
use bcrypt::{hash, verify, DEFAULT_COST};
use alloy::signers::local::PrivateKeySigner;
use base64::{Engine as _, engine::general_purpose};
use aes_gcm::{Aes256Gcm, KeyInit, aead::{Aead, Nonce}};

// 自定义错误类型
#[derive(Debug)]
pub enum AppError {
    BadRequest(String),
    Unauthorized(String),
    NotFound(String),
    UnprocessableEntity(String),
    InternalServerError(String),
    DatabaseError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::UnprocessableEntity(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg),
            AppError::InternalServerError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::DatabaseError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(json!({
            "error": error_message
        }));

        (status, body).into_response()
    }
}

// 生成EVM钱包地址
pub fn generate_wallet(private_key: Option<&str>, master_key: &str, nonce: &str) -> Result<(String, String), AppError> {
    if let Some(pk) = private_key {
        // 1.使用提供的私钥创建签名器
        let signer: PrivateKeySigner = pk.parse().map_err(|e| AppError::BadRequest(format!("Invalid private key format: {:?}", e)))?;

        // 2.获取钱包地址
        let address = signer.address();

        // 3.获取私钥
        let private_key_bytes = signer.to_bytes();
        let private_key_hex = hex::encode(private_key_bytes);

        // 4.加密私钥
        let encrypted_pk = encrypt_private_key(&private_key_hex, master_key, nonce)?;

        // let encrypted_pk = match encrypt_private_key(&private_key_hex, master_key, nonce) {
        //     Ok(encrypted) => encrypted,
        //     Err(e) => {
        //         tracing::error!("Failed to encrypt private key: {:?}", e);
        //         private_key_hex.clone() // 在加密失败时返回原始私钥（仅用于测试环境）
        //     }
        // };
        
        return Ok((encrypted_pk, address.to_string()));        

    } else {
        // 1.创建一个随机的私钥签名器
        let signer = PrivateKeySigner::random();

        // 2.获取钱包地址
        let address = signer.address();

        // 3.获取私钥
        let private_key_bytes = signer.to_bytes();
        let private_key_hex = hex::encode(private_key_bytes);

        // 4.加密私钥
        let encrypted_pk = encrypt_private_key(&private_key_hex, master_key, nonce)?;

        // let encrypted_pk = match encrypt_private_key(&private_key_hex, master_key, nonce) {
        //     Ok(encrypted) => encrypted,
        //     Err(e) => {
        //         tracing::error!("Failed to encrypt private key: {:?}", e);
        //         private_key_hex.clone() // 在加密失败时返回原始私钥（仅用于测试环境）
        //     }
        // };
        
        return Ok((encrypted_pk, address.to_string()));
    }
}

// 生成随机token
pub fn generate_token() -> String {
    let mut rng = rand::rng();
    let mut token: [u8; 20] = [0; 20];
    rng.fill_bytes(&mut token);
    hex::encode(token)
}

// 验证邮箱格式
pub fn is_valid_email(email: &str) -> bool {
    let email_regex = regex::Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    email_regex.is_match(email) && !email.contains("..")
}

// 使用AES-256-GCM加密密码（可恢复）
// 修改encrypt_private_key和decrypt_private_key函数，移除不必要的base64编码

// 修改后的encrypt_private_key函数
pub fn encrypt_private_key(password: &str, master_key: &str, nonce: &str) -> Result<String, AppError> {
    // 直接使用master_key的字节，不再进行base64编码
    let master_key_bytes = master_key.as_bytes();
    
    // 确保master_key有32字节（AES-256需要）
    let mut key_array = [0u8; 32];
    let copy_len = std::cmp::min(master_key_bytes.len(), 32);
    key_array[..copy_len].copy_from_slice(&master_key_bytes[..copy_len]);
    
    // 直接使用nonce的字节，不再进行base64编码
    let nonce_bytes = nonce.as_bytes();
    
    // 确保nonce有12字节（GCM模式推荐）
    let mut nonce_array = [0u8; 12];
    let copy_len = std::cmp::min(nonce_bytes.len(), 12);
    nonce_array[..copy_len].copy_from_slice(&nonce_bytes[..copy_len]);
    
    // 创建nonce对象
    let nonce_obj = Nonce::<Aes256Gcm>::from_slice(&nonce_array);
    
    // 创建加密器并加密密码
    let cipher = Aes256Gcm::new_from_slice(&key_array).map_err(|e| {
        tracing::error!("AES-256-GCM key init failed: {:?}", e);
        AppError::InternalServerError(format!("AES-256-GCM key init failed: {:?}", e))
    })?;
    let ciphertext = cipher.encrypt(nonce_obj, password.as_bytes())
        .map_err(|e| {
            tracing::error!("AES-256-GCM encrypt failed: {:?}", e);
            AppError::InternalServerError(format!("AES-256-GCM encrypt failed: {:?}", e))
        })?;
    
    // 将密文编码为Base64并返回
    Ok(general_purpose::STANDARD
        .encode(ciphertext))
}

// 解密恢复原始密码
pub fn decrypt_private_key(encrypted: &str, master_key: &str, nonce: &str) -> Result<String, AppError> {
    // 直接使用master_key的字节，不再进行base64编码
    let master_key_bytes = master_key.as_bytes();
    
    // 确保master_key有32字节（AES-256需要）
    let mut key_array = [0u8; 32];
    let copy_len = std::cmp::min(master_key_bytes.len(), 32);
    key_array[..copy_len].copy_from_slice(&master_key_bytes[..copy_len]);
    
    // 直接使用nonce的字节，不再进行base64编码
    let nonce_bytes = nonce.as_bytes();
    
    // 确保nonce有12字节（GCM模式推荐）
    let mut nonce_array = [0u8; 12];
    let copy_len = std::cmp::min(nonce_bytes.len(), 12);
    nonce_array[..copy_len].copy_from_slice(&nonce_bytes[..copy_len]);
    
    // 创建nonce对象
    let nonce_obj = Nonce::<Aes256Gcm>::from_slice(&nonce_array);
    
    // Base64解码密文
    let ciphertext = general_purpose::STANDARD
        .decode(encrypted)
        .map_err(|e| {
            tracing::error!("Base64 decode failed: {:?}", e);
            AppError::InternalServerError(format!("Base64 decode failed: {:?}", e))
        })?;
    
    // 创建解密器并解密
    let cipher = Aes256Gcm::new_from_slice(&key_array).map_err(|e| {
        tracing::error!("AES-256-GCM key init failed: {:?}", e);
        AppError::InternalServerError(format!("AES-256-GCM key init failed: {:?}", e))
    })?;
    let plaintext = cipher.decrypt(nonce_obj, ciphertext.as_ref())
        .map_err(|e| {
            tracing::error!("AES-256-GCM decrypt failed: {:?}", e);
            AppError::InternalServerError(format!("AES-256-GCM decrypt failed: {:?}", e))
        })?;
    
    // 转换为字符串
    String::from_utf8(plaintext).map_err(|e| {
        tracing::error!("Decrypted plaintext is not valid UTF-8: {:?}", e);
        AppError::InternalServerError(format!("Decrypted plaintext is not valid UTF-8: {:?}", e))
    })
}

// 使用自定义 salt 哈希密码
// salt = user_id<UUID>字符串 + AppState中的配置salt
pub fn hash_password_with_user_id(password: &str, user_id: Uuid, salt: &str) -> String {
    let full_salt = format!("{}{}", user_id, salt);
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hasher.update(full_salt.as_bytes());
    hex::encode(hasher.finalize())
}

// 验证密码
pub fn verify_password_with_user_id(password: &str, user_id: Uuid, hash: &str, salt: &str) -> bool {
    let computed_hash = hash_password_with_user_id(password, user_id, salt);
    computed_hash == hash
}

// 哈希密码
pub fn hash_password(password: &str) -> Result<String, AppError> {
    hash(password, DEFAULT_COST).map_err(|e| AppError::InternalServerError(format!("Password hash failed: {:?}", e)))
}

// 验证密码
pub fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    verify(password, hash).map_err(|e| AppError::InternalServerError(format!("Password verify failed: {:?}", e)))
}

#[cfg(test)]
pub mod test_utils {
    use crate::config::AppState;
    use crate::database::create_pool;
    use axum::http::{Request, StatusCode};
    use axum::body::Body;
    use tower::ServiceExt;
    use serde_json::Value;

    pub async fn create_test_app_state() -> AppState {
        let pool = create_pool().await.expect("Failed to create test database pool");
        crate::database::init_database(&pool).await.expect("Failed to initialize test database");
        AppState::new(pool)
    }

    pub async fn send_request(
        app: axum::Router,
        request: Request<Body>,
    ) -> (StatusCode, Value) {
        let response = app.oneshot(request).await.unwrap();
        let status = response.status();
        let (_parts, body) = response.into_parts();
        let body_bytes = axum::body::to_bytes(body, usize::MAX).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        let body_json: Value = serde_json::from_str(&body_str).unwrap_or(serde_json::json!({}));
        (status, body_json)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_wallet() {
        let master_key = "openpickopenpickopenpickopenpick";
        let nonce = "openpickopen";

        let (private_key, wallet_address) = generate_wallet(None, master_key, nonce).expect("Failed to generate wallet");
        
        // 私钥应该是64个字符的十六进制字符串
        assert_eq!(private_key.len(), 64);
        assert!(private_key.chars().all(|c| c.is_ascii_hexdigit()));
        
        // 钱包地址应该以0x开头，后跟40个十六进制字符
        assert!(wallet_address.starts_with("0x"));
        assert_eq!(wallet_address.len(), 42);
        assert!(wallet_address[2..].chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_generate_wallet_uniqueness() {
        let master_key = "openpickopenpickopenpickopenpick";
        let nonce = "openpickopen";

        let (private_key1, wallet_address1) = generate_wallet(None, master_key, nonce).expect("Failed to generate wallet");
        let (private_key2, wallet_address2) = generate_wallet(None, master_key, nonce).expect("Failed to generate wallet");
        
        // 每次生成的钱包应该不同
        assert_ne!(private_key1, private_key2);
        assert_ne!(wallet_address1, wallet_address2);
    }

    #[test]
    fn test_generate_token() {
        let token = generate_token();
        
        // Token应该是40个字符的十六进制字符串
        assert_eq!(token.len(), 40);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_generate_token_uniqueness() {
        let token1 = generate_token();
        let token2 = generate_token();
        
        // 每次生成的token应该不同
        assert_ne!(token1, token2);
    }

    #[test]
    fn test_is_valid_email() {
        // 有效邮箱
        assert!(is_valid_email("test@example.com"));
        assert!(is_valid_email("user.name@domain.co.uk"));
        assert!(is_valid_email("test123@test-domain.org"));
        
        // 无效邮箱
        assert!(!is_valid_email("invalid-email"));
        assert!(!is_valid_email("@example.com"));
        assert!(!is_valid_email("test@"));
        assert!(!is_valid_email("test@.com"));
        assert!(!is_valid_email("test..test@example.com"));
    }

    #[tokio::test]
    async fn test_create_test_app_state() {
        let state = test_utils::create_test_app_state().await;
        // 验证状态创建成功
        assert!(!state.db.is_closed());
    }

    #[tokio::test]
    async fn test_send_request() {
        use axum::{routing::get, Router};
        use axum::http::Request;
        
        let app = Router::new().route("/test", get(|| async { "Hello, World!" }));
        
        let request = Request::builder()
            .uri("/test")
            .body(axum::body::Body::empty())
            .unwrap();
            
        let (status, _body) = test_utils::send_request(app, request).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[test]
    fn test_hash_password_with_user_id() {
        let user_id = Uuid::new_v4();
        let password = "test_password";
        let salt = "openpick";
        
        let hash1 = hash_password_with_user_id(password, user_id, salt);
        let hash2 = hash_password_with_user_id(password, user_id, salt);
        
        // 相同的密码和用户ID应该产生相同的哈希
        assert_eq!(hash1, hash2);
        
        // 哈希应该是64个字符的十六进制字符串
        assert_eq!(hash1.len(), 64);
        assert!(hash1.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_hash_password_with_different_user_ids() {
        let user_id1 = Uuid::new_v4();
        let user_id2 = Uuid::new_v4();
        let password = "test_password";
        let salt = "openpick";
        
        let hash1 = hash_password_with_user_id(password, user_id1, salt);
        let hash2 = hash_password_with_user_id(password, user_id2, salt);
        
        // 不同的用户ID应该产生不同的哈希
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_verify_password_with_user_id() {
        let user_id = Uuid::new_v4();
        let password = "test_password";
        let wrong_password = "wrong_password";
        let salt = "openpick";
        
        let hash = hash_password_with_user_id(password, user_id, salt);
        
        // 正确的密码应该验证成功
        assert!(verify_password_with_user_id(password, user_id, &hash, salt));
        
        // 错误的密码应该验证失败
        assert!(!verify_password_with_user_id(wrong_password, user_id, &hash, salt));
        
        // 不同的用户ID应该验证失败
        let different_user_id = Uuid::new_v4();
        assert!(!verify_password_with_user_id(password, different_user_id, &hash, salt));
    }

    #[test]
    fn test_hash_password() {
        let password = "test_password";
        
        let result = hash_password(password);
        assert!(result.is_ok());
        
        let hash = result.unwrap();
        assert!(!hash.is_empty());
        
        // bcrypt哈希应该以$2b$开头
        assert!(hash.starts_with("$2b$"));
    }

    #[test]
    fn test_verify_password() {
        let password = "test_password";
        let wrong_password = "wrong_password";
        
        let hash = hash_password(password).unwrap();
        
        // 正确的密码应该验证成功
        let result = verify_password(password, &hash);
        assert!(result.is_ok());
        assert!(result.unwrap());
        
        // 错误的密码应该验证失败
        let result = verify_password(wrong_password, &hash);
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_verify_password_with_invalid_hash() {
        let password = "test_password";
        let invalid_hash = "invalid_hash";
        
        let result = verify_password(password, invalid_hash);
        assert!(result.is_err());
        
        match result.unwrap_err() {
            AppError::InternalServerError(_) => {},
            _ => panic!("Expected InternalServerError"),
        }
    }

    #[test]
    fn test_app_error_into_response() {
        // 测试BadRequest错误
        let error = AppError::BadRequest("Bad request message".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        // 测试Unauthorized错误
        let error = AppError::Unauthorized("Unauthorized message".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        // 测试NotFound错误
        let error = AppError::NotFound("Not found message".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        // 测试UnprocessableEntity错误
        let error = AppError::UnprocessableEntity("Unprocessable entity message".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);

        // 测试InternalServerError错误
        let error = AppError::InternalServerError("Internal server error message".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        // 测试DatabaseError错误
        let error = AppError::DatabaseError("Database error message".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn test_app_error_debug() {
        let error = AppError::BadRequest("Test message".to_string());
        let debug_str = format!("{:?}", error);
        assert!(debug_str.contains("BadRequest"));
        assert!(debug_str.contains("Test message"));
    }

    #[test]
    fn test_is_valid_email_edge_cases() {
        // 测试边界情况
        assert!(!is_valid_email(""));
        assert!(!is_valid_email("a"));
        assert!(!is_valid_email("@"));
        assert!(!is_valid_email("a@"));
        assert!(!is_valid_email("@a"));
        assert!(!is_valid_email("a@b"));
        assert!(!is_valid_email("a@b."));
        assert!(!is_valid_email("a@.b"));
        assert!(!is_valid_email("a@b..com"));
        assert!(!is_valid_email("a@b.c"));
        
        // 测试有效的边界情况
        assert!(is_valid_email("a@b.co"));
        assert!(is_valid_email("test@example.museum"));
        assert!(is_valid_email("user+tag@example.com"));
        assert!(is_valid_email("user_name@example-domain.com"));
        
        // 注意：根据当前的正则表达式实现，以下情况被认为是有效的
        // 如果需要更严格的验证，需要修改正则表达式
        assert!(is_valid_email(".a@b.com")); // 当前实现认为这是有效的
        assert!(is_valid_email("a.@b.com")); // 当前实现认为这是有效的
    }

    #[tokio::test]
    async fn test_send_request_with_json_response() {
        use axum::{routing::get, Router, Json};
        use axum::http::Request;
        use serde_json::json;
        
        let app = Router::new().route("/json", get(|| async { 
            Json(json!({"message": "Hello, JSON!"}))
        }));
        
        let request = Request::builder()
            .uri("/json")
            .body(axum::body::Body::empty())
            .unwrap();
            
        let (status, body) = test_utils::send_request(app, request).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["message"], "Hello, JSON!");
    }

    #[tokio::test]
    async fn test_send_request_with_error_response() {
        use axum::{routing::get, Router};
        use axum::http::Request;
        
        let app = Router::new().route("/error", get(|| async { 
            (StatusCode::BAD_REQUEST, "Bad Request")
        }));
        
        let request = Request::builder()
            .uri("/error")
            .body(axum::body::Body::empty())
            .unwrap();
            
        let (status, _body) = test_utils::send_request(app, request).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_send_request_with_invalid_json() {
        use axum::{routing::get, Router};
        use axum::http::Request;
        
        let app = Router::new().route("/invalid", get(|| async { 
            "invalid json response"
        }));
        
        let request = Request::builder()
            .uri("/invalid")
            .body(axum::body::Body::empty())
            .unwrap();
            
        let (status, body) = test_utils::send_request(app, request).await;
        assert_eq!(status, StatusCode::OK);
        // 当JSON解析失败时，应该返回空对象
        assert_eq!(body, serde_json::json!({}));
    }
}