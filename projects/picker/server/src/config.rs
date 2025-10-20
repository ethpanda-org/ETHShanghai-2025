use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use chrono::{DateTime, Utc};
use crate::database::DbPool;
use crate::models::{VerificationCode, DownloadToken, UserType};
use log::{info, error};

// 配置文件结构
#[derive(Debug, Clone, serde::Deserialize)]
pub struct Config {
    pub jwt: JwtConfig,
    pub password: PasswordConfig,
    pub pending_registration: PendingRegistrationConfig,
    pub blockchain: BlockchainConfig,
    pub premium: PremiumConfig,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct JwtConfig {
    pub secret: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct PasswordConfig {
    pub salt: String,
    pub master_key: String,
    pub nonce: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct PendingRegistrationConfig {
    pub cleanup_minutes: i64,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct BlockchainConfig {
    pub name: String,
    pub rpc_url: String,
    pub explorer_url: String,
    pub token_usdt_url: String,
    pub authorized_contract_address: String,
    pub retry_times: i8,
    pub retry_interval_seconds : i8,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct PremiumConfig {
    pub payment_rate: i64,
    pub to_usd: i64,
    pub free: i64,
    pub period: i64,
    pub start: bool,
}

impl Config {
    pub fn from_file() -> Result<Self, config::ConfigError> {
        let mut builder = config::Config::builder();

        // 检查配置文件是否存在
        let config_path = "config.toml";

        if std::path::Path::new(config_path).exists() {
            builder = builder.add_source(config::File::with_name(config_path));
        } else {
            error!("Warning: config.toml file not found at {}", config_path);
        }

        // 添加环境变量源
        builder = builder
            .add_source(config::Environment::with_prefix("PICKER"));

        let config = builder.build()?.try_deserialize();
        match &config {
            Ok(cfg) => {
                info!("Successfully loaded config: {:?}", cfg);
            }
            Err(e) => {
                error!("Failed to load config: {}", e);
            }
        }
        config
    }
}

// 临时注册信息（等待邮箱验证）
#[derive(Debug, Clone)]
pub struct PendingRegistration {
    pub email: String,
    pub user_name: String,
    pub user_password: String,
    pub user_type: UserType,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub jwt_secret: String,
    pub password_salt: String,
    pub password_master_key: String,
    pub password_nonce: String,

    pub premium_payment_rate: i64,
    pub premium_free: i64,
    pub premium_to_usd: i64,
    pub premium_period: i64,
    pub premium_start: bool,

    pub pending_registration_cleanup_minutes: i64,
    pub blockchain_name: String,
    pub blockchain_rpc_url: String,
    pub blockchain_explorer_url: String,
    pub blockchain_token_usdt_url: String,
    pub blockchain_authorized_contract_address: String,
    pub blockchain_retry_times: i8,
    pub blockchain_retry_interval_seconds: i8,
    pub verification_codes: Arc<Mutex<HashMap<String, VerificationCode>>>,
    pub download_tokens: Arc<Mutex<HashMap<String, DownloadToken>>>,
    pub pending_registrations: Arc<Mutex<HashMap<String, PendingRegistration>>>,
}

impl AppState {
    pub fn new(db: DbPool) -> Self {
        // 尝试从配置文件读取配置，如果失败则使用默认值
        let config = Config::from_file().unwrap_or_else(|_| {
            info!("Warning: Failed to load config file, using default values");
            
            Config {
                jwt: JwtConfig {
                    secret: "your-secret-key".to_string(),
                },
                password: PasswordConfig {
                    salt: "openpick".to_string(),
                    master_key: "openpickopenpickopenpickopenpick".to_string(),
                    nonce: "openpickopen".to_string(),
                },
                pending_registration: PendingRegistrationConfig {
                    cleanup_minutes: 10,
                },
                blockchain: BlockchainConfig {
                    name: "eth".to_string(),
                    rpc_url: "https://sepolia.infura.io/v3/7cb673f9a1324974899fc4cd4429b450".to_string(),
                    explorer_url: "https://sepolia.etherscan.io".to_string(),
                    token_usdt_url: "https://www.okx.com/api/v5/market/ticker?instId=USDC-USDT".to_string(),
                    authorized_contract_address: "0x2ed3dddae5b2f321af0806181fbfa6d049be47d8".to_string(),
                    retry_times: 5,
                    retry_interval_seconds: 10,
                },
                premium: PremiumConfig {
                    payment_rate: 5,
                    to_usd: 1,
                    free: 30,
                    period: 30,
                    start: true,
                },
            }
        });

        Self {
            db,
            jwt_secret: config.jwt.secret,
            password_salt: config.password.salt,
            password_master_key: config.password.master_key,
            password_nonce: config.password.nonce,
            pending_registration_cleanup_minutes: config.pending_registration.cleanup_minutes,
            blockchain_name: config.blockchain.name,
            blockchain_rpc_url: config.blockchain.rpc_url,
            blockchain_explorer_url: config.blockchain.explorer_url,
            blockchain_token_usdt_url: config.blockchain.token_usdt_url,
            blockchain_authorized_contract_address: config.blockchain.authorized_contract_address,
            blockchain_retry_times: config.blockchain.retry_times,
            blockchain_retry_interval_seconds: config.blockchain.retry_interval_seconds,
            premium_payment_rate: config.premium.payment_rate,
            premium_to_usd: config.premium.to_usd,
            premium_free: config.premium.free,
            premium_period: config.premium.period,
            premium_start: config.premium.start,
            verification_codes: Arc::new(Mutex::new(HashMap::new())),
            download_tokens: Arc::new(Mutex::new(HashMap::new())),
            pending_registrations: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    // 清理过期的验证码
    pub fn cleanup_expired_codes(&self) {
        let mut codes = self.verification_codes.lock().unwrap();
        let now = Utc::now();
        codes.retain(|_, code| code.expires_at > now);
    }

    // 清理过期的下载token
    pub fn cleanup_expired_tokens(&self) {
        let mut tokens = self.download_tokens.lock().unwrap();
        let now = Utc::now();
        tokens.retain(|_, token| token.expires_at > now);
    }

    // 清理过期的待注册信息
    pub fn cleanup_expired_pending_registrations(&self) {
        let mut pending = self.pending_registrations.lock().unwrap();
        let now = Utc::now();
        // 使用配置文件中的清理时间
        pending.retain(|_, registration| {
            now.signed_duration_since(registration.created_at).num_minutes() < self.pending_registration_cleanup_minutes
        });
    }
}

// JWT Claims
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user_id
    pub exp: usize,  // expiration time
    pub iat: usize,  // issued at
}

impl Claims {
    pub fn new(user_id: Uuid) -> Self {
        let now = chrono::Utc::now();
        let exp = now + chrono::Duration::hours(24); // 24小时过期
        
        Self {
            sub: user_id.to_string(),
            exp: exp.timestamp() as usize,
            iat: now.timestamp() as usize,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils_tests::create_test_app_state;
    use crate::models::{VerificationCode, DownloadToken};
    use chrono::{Duration, Utc};
    use serial_test::serial;
    use uuid::Uuid;

    #[tokio::test]
    #[serial]
    async fn test_app_state_new() {
        let state = create_test_app_state().await;
        
        assert_eq!(state.jwt_secret, "your-secret-key");
        assert_eq!(state.verification_codes.lock().unwrap().len(), 0);
        assert_eq!(state.download_tokens.lock().unwrap().len(), 0);
    }

    #[tokio::test]
    #[serial]
    async fn test_app_state_clone() {
        let state = create_test_app_state().await;
        let cloned_state = state.clone();
        
        assert_eq!(state.jwt_secret, cloned_state.jwt_secret);
        
        // 验证共享状态
        state.verification_codes.lock().unwrap().insert(
            "test_code".to_string(),
            VerificationCode {
                code: "123456".to_string(),
                expires_at: Utc::now() + Duration::minutes(10),
                email: "test@example.com".to_string(),
            }
        );
        
        assert_eq!(cloned_state.verification_codes.lock().unwrap().len(), 1);
    }

    #[tokio::test]
    #[serial]
    async fn test_cleanup_expired_codes() {
        let state = create_test_app_state().await;
        let now = Utc::now();
        
        // 添加有效验证码
        let valid_code = VerificationCode {
            code: "123456".to_string(),
            expires_at: now + Duration::minutes(10),
            email: "valid@example.com".to_string(),
        };
        
        // 添加过期验证码
        let expired_code = VerificationCode {
            code: "654321".to_string(),
            expires_at: now - Duration::minutes(10),
            email: "expired@example.com".to_string(),
        };
        
        state.verification_codes.lock().unwrap().insert("valid".to_string(), valid_code);
        state.verification_codes.lock().unwrap().insert("expired".to_string(), expired_code);
        
        assert_eq!(state.verification_codes.lock().unwrap().len(), 2);
        
        // 清理过期验证码
        state.cleanup_expired_codes();
        
        assert_eq!(state.verification_codes.lock().unwrap().len(), 1);
        assert!(state.verification_codes.lock().unwrap().contains_key("valid"));
        assert!(!state.verification_codes.lock().unwrap().contains_key("expired"));
    }

    #[tokio::test]
    #[serial]
    async fn test_cleanup_expired_tokens() {
        let state = create_test_app_state().await;
        let now = Utc::now();
        let order_id1 = Uuid::new_v4();
        let order_id2 = Uuid::new_v4();
        
        // 添加有效下载token
        let valid_token = DownloadToken {
            token: "valid_token".to_string(),
            order_id: order_id1,
            expires_at: now + Duration::minutes(10),
        };
        
        // 添加过期下载token
        let expired_token = DownloadToken {
            token: "expired_token".to_string(),
            order_id: order_id2,
            expires_at: now - Duration::minutes(10),
        };
        
        state.download_tokens.lock().unwrap().insert("valid_token".to_string(), valid_token);
        state.download_tokens.lock().unwrap().insert("expired_token".to_string(), expired_token);
        
        assert_eq!(state.download_tokens.lock().unwrap().len(), 2);
        
        // 清理过期token
        state.cleanup_expired_tokens();
        
        assert_eq!(state.download_tokens.lock().unwrap().len(), 1);
        assert!(state.download_tokens.lock().unwrap().contains_key("valid_token"));
        assert!(!state.download_tokens.lock().unwrap().contains_key("expired_token"));
    }

    #[tokio::test]
    #[serial]
    async fn test_cleanup_expired_codes_empty() {
        let state = create_test_app_state().await;
        
        // 测试空的验证码集合
        state.cleanup_expired_codes();
        assert_eq!(state.verification_codes.lock().unwrap().len(), 0);
    }

    #[tokio::test]
    #[serial]
    async fn test_cleanup_expired_tokens_empty() {
        let state = create_test_app_state().await;
        
        // 测试空的token集合
        state.cleanup_expired_tokens();
        assert_eq!(state.download_tokens.lock().unwrap().len(), 0);
    }

    #[tokio::test]
    #[serial]
    async fn test_cleanup_expired_codes_all_valid() {
        let state = create_test_app_state().await;
        let now = Utc::now();
        
        // 添加多个有效验证码
        for i in 1..=3 {
            let code = VerificationCode {
                code: format!("12345{}", i),
                expires_at: now + Duration::minutes(10),
                email: format!("user{}@example.com", i),
            };
            state.verification_codes.lock().unwrap().insert(format!("code{}", i), code);
        }
        
        assert_eq!(state.verification_codes.lock().unwrap().len(), 3);
        
        // 清理过期验证码（应该没有过期的）
        state.cleanup_expired_codes();
        
        assert_eq!(state.verification_codes.lock().unwrap().len(), 3);
    }

    #[tokio::test]
    #[serial]
    async fn test_cleanup_expired_tokens_all_valid() {
        let state = create_test_app_state().await;
        let now = Utc::now();
        
        // 添加多个有效token
        for i in 1..=3 {
            let token = DownloadToken {
                token: format!("token{}", i),
                order_id: Uuid::new_v4(),
                expires_at: now + Duration::minutes(10),
            };
            state.download_tokens.lock().unwrap().insert(format!("token{}", i), token);
        }
        
        assert_eq!(state.download_tokens.lock().unwrap().len(), 3);
        
        // 清理过期token（应该没有过期的）
        state.cleanup_expired_tokens();
        
        assert_eq!(state.download_tokens.lock().unwrap().len(), 3);
    }

    #[test]
    fn test_claims_new() {
        let user_id = Uuid::new_v4();
        let claims = Claims::new(user_id);
        
        assert_eq!(claims.sub, user_id.to_string());
        assert!(claims.exp > claims.iat);
        
        // 验证过期时间大约是24小时后
        let expected_exp = chrono::Utc::now().timestamp() as usize + 24 * 3600;
        assert!((claims.exp as i64 - expected_exp as i64).abs() < 60); // 允许1分钟误差
    }

    #[test]
    fn test_claims_serialization() {
        let user_id = Uuid::new_v4();
        let claims = Claims::new(user_id);
        
        let json = serde_json::to_string(&claims).unwrap();
        assert!(json.contains("sub"));
        assert!(json.contains("exp"));
        assert!(json.contains("iat"));
        assert!(json.contains(&user_id.to_string()));
    }

    #[test]
    fn test_claims_deserialization() {
        let user_id = Uuid::new_v4();
        let original_claims = Claims::new(user_id);
        
        let json = serde_json::to_string(&original_claims).unwrap();
        let deserialized_claims: Claims = serde_json::from_str(&json).unwrap();
        
        assert_eq!(original_claims.sub, deserialized_claims.sub);
        assert_eq!(original_claims.exp, deserialized_claims.exp);
        assert_eq!(original_claims.iat, deserialized_claims.iat);
    }

    #[test]
    fn test_claims_debug() {
        let user_id = Uuid::new_v4();
        let claims = Claims::new(user_id);
        
        let debug_str = format!("{:?}", claims);
        assert!(debug_str.contains("Claims"));
        assert!(debug_str.contains("sub"));
        assert!(debug_str.contains("exp"));
        assert!(debug_str.contains("iat"));
    }

    #[tokio::test]
    #[serial]
    async fn test_concurrent_access_verification_codes() {
        let state = create_test_app_state().await;
        let state_clone1 = state.clone();
        let state_clone2 = state.clone();
        
        // 模拟并发访问
        let handle1 = tokio::spawn(async move {
            for i in 0..10 {
                let code = VerificationCode {
                    code: format!("code{}", i),
                    expires_at: Utc::now() + Duration::minutes(10),
                    email: format!("user{}@example.com", i),
                };
                state_clone1.verification_codes.lock().unwrap().insert(format!("key{}", i), code);
            }
        });
        
        let handle2 = tokio::spawn(async move {
            for i in 10..20 {
                let code = VerificationCode {
                    email: format!("user{}@example.com", i),
                    code: format!("code{}", i),
                    expires_at: Utc::now() + Duration::minutes(10),
                };
                state_clone2.verification_codes.lock().unwrap().insert(format!("key{}", i), code);
            }
        });
        
        handle1.await.unwrap();
        handle2.await.unwrap();
        
        assert_eq!(state.verification_codes.lock().unwrap().len(), 20);
    }

    #[tokio::test]
    #[serial]
    async fn test_concurrent_access_download_tokens() {
        let state = create_test_app_state().await;
        let state_clone1 = state.clone();
        let state_clone2 = state.clone();
        
        // 模拟并发访问
        let handle1 = tokio::spawn(async move {
            for i in 0..10 {
                let token = DownloadToken {
                    token: format!("token{}", i),
                    order_id: Uuid::new_v4(),
                    expires_at: Utc::now() + Duration::minutes(10),
                };
                state_clone1.download_tokens.lock().unwrap().insert(format!("token{}", i), token);
            }
        });
        
        let handle2 = tokio::spawn(async move {
            for i in 10..20 {
                let token = DownloadToken {
                    token: format!("token{}", i),
                    order_id: Uuid::new_v4(),
                    expires_at: Utc::now() + Duration::minutes(10),
                };
                state_clone2.download_tokens.lock().unwrap().insert(format!("token{}", i), token);
            }
        });
        
        handle1.await.unwrap();
        handle2.await.unwrap();
        
        assert_eq!(state.download_tokens.lock().unwrap().len(), 20);
    }

    #[tokio::test]
    #[serial]
    async fn test_cleanup_expired_pending_registrations() {
        let state = create_test_app_state().await;
        let now = Utc::now();
        
        // 添加有效的待注册信息
        let valid_registration = PendingRegistration {
            email: "valid@example.com".to_string(),
            user_name: "Valid User".to_string(),
            user_password: "password123".to_string(),
            user_type: crate::models::UserType::Gen,
            created_at: now - Duration::minutes(5), // 5分钟前创建
        };
        
        // 添加过期的待注册信息
        let expired_registration = PendingRegistration {
            email: "expired@example.com".to_string(),
            user_name: "Expired User".to_string(),
            user_password: "password456".to_string(),
            user_type: crate::models::UserType::Dev,
            created_at: now - Duration::minutes(35), // 35分钟前创建（超过30分钟）
        };
        
        state.pending_registrations.lock().unwrap().insert("valid".to_string(), valid_registration);
        state.pending_registrations.lock().unwrap().insert("expired".to_string(), expired_registration);
        
        assert_eq!(state.pending_registrations.lock().unwrap().len(), 2);
        
        // 清理过期的待注册信息
        state.cleanup_expired_pending_registrations();
        
        assert_eq!(state.pending_registrations.lock().unwrap().len(), 1);
        assert!(state.pending_registrations.lock().unwrap().contains_key("valid"));
        assert!(!state.pending_registrations.lock().unwrap().contains_key("expired"));
    }

    #[tokio::test]
    #[serial]
    async fn test_cleanup_expired_pending_registrations_empty() {
        let state = create_test_app_state().await;
        
        // 测试空的待注册信息集合
        state.cleanup_expired_pending_registrations();
        assert_eq!(state.pending_registrations.lock().unwrap().len(), 0);
    }

    #[tokio::test]
    #[serial]
    async fn test_cleanup_expired_pending_registrations_all_valid() {
        let state = create_test_app_state().await;
        let now = Utc::now();
        
        // 添加多个有效的待注册信息
        for i in 1..=3 {
            let registration = PendingRegistration {
                email: format!("user{}@example.com", i),
                user_name: format!("User {}", i),
                user_password: format!("password{}", i),
                user_type: crate::models::UserType::Gen,
                created_at: now - Duration::minutes(9), // 9分钟前创建
            };
            state.pending_registrations.lock().unwrap().insert(format!("reg{}", i), registration);
        }
        
        assert_eq!(state.pending_registrations.lock().unwrap().len(), 3);
        
        // 清理过期的待注册信息（应该没有过期的）
        state.cleanup_expired_pending_registrations();
        
        assert_eq!(state.pending_registrations.lock().unwrap().len(), 3);
    }

    #[tokio::test]
    #[serial]
    async fn test_cleanup_expired_pending_registrations_all_expired() {
        let state = create_test_app_state().await;
        let now = Utc::now();
        
        // 添加多个过期的待注册信息
        for i in 1..=3 {
            let registration = PendingRegistration {
                email: format!("user{}@example.com", i),
                user_name: format!("User {}", i),
                user_password: format!("password{}", i),
                user_type: crate::models::UserType::Dev,
                created_at: now - Duration::minutes(40), // 40分钟前创建（超过30分钟）
            };
            state.pending_registrations.lock().unwrap().insert(format!("reg{}", i), registration);
        }
        
        assert_eq!(state.pending_registrations.lock().unwrap().len(), 3);
        
        // 清理过期的待注册信息（应该全部被清理）
        state.cleanup_expired_pending_registrations();
        
        assert_eq!(state.pending_registrations.lock().unwrap().len(), 0);
    }

    #[test]
    fn test_pending_registration_debug() {
        let registration = PendingRegistration {
            email: "test@example.com".to_string(),
            user_name: "Test User".to_string(),
            user_password: "password123".to_string(),
            user_type: crate::models::UserType::Gen,
            created_at: Utc::now(),
        };
        
        let debug_str = format!("{:?}", registration);
        assert!(debug_str.contains("PendingRegistration"));
        assert!(debug_str.contains("email"));
        assert!(debug_str.contains("user_name"));
    }

    #[test]
    fn test_pending_registration_clone() {
        let registration = PendingRegistration {
            email: "test@example.com".to_string(),
            user_name: "Test User".to_string(),
            user_password: "password123".to_string(),
            user_type: crate::models::UserType::Gen,
            created_at: Utc::now(),
        };
        
        let cloned = registration.clone();
        assert_eq!(registration.email, cloned.email);
        assert_eq!(registration.user_name, cloned.user_name);
        assert_eq!(registration.user_password, cloned.user_password);
        assert_eq!(registration.created_at, cloned.created_at);
    }
}