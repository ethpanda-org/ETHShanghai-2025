use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::Mutex;
use chrono::{Duration, Utc};
use rand::Rng;
use jsonwebtoken::{encode, Header, EncodingKey};
use sqlx::{SqlitePool, Row};
use crate::shared::types::{Claims, CodeEntry};
use crate::shared::errors::AppError;
use crate::shared::database::find_or_create_user;
use crate::shared::notification::create_notification_sender;

pub struct AuthService {
    code_store: Arc<Mutex<HashMap<String, CodeEntry>>>,
    db: SqlitePool,
    jwt_secret: String,
}

impl AuthService {
    pub fn new(db: SqlitePool, jwt_secret: String) -> Self {
        Self {
            code_store: Arc::new(Mutex::new(HashMap::new())),
            db,
            jwt_secret,
        }
    }

    pub async fn send_verification_code(&self, contact: &str) -> Result<(), AppError> {
        let contact = contact.trim().to_lowercase();
        
        // 生成更安全的验证码（可配置长度）
        let code_length = std::env::var("VERIFICATION_CODE_LENGTH")
            .unwrap_or_else(|_| "6".to_string())
            .parse::<usize>()
            .unwrap_or(6);
        
        let code = (0..code_length)
            .map(|_| rand::thread_rng().gen_range(0..10).to_string())
            .collect::<String>();
        
        let expires = Utc::now() + Duration::minutes(5);

        {
            let mut store = self.code_store.lock();
            store.insert(
                contact.clone(),
                CodeEntry {
                    code: code.clone(),
                    expires_at: expires,
                    used: false,
                },
            );
        }

        // 使用通知服务发送验证码
        let sender = create_notification_sender(&contact);
        sender.send_code(&contact, &code).await?;
        
        println!("📨 Send code to {} -> {} (expires {})", contact, code, expires);
        Ok(())
    }

    pub async fn verify_code_and_login(&self, contact: &str, code: &str) -> Result<(String, String, String, i64), AppError> {
        let contact = contact.trim().to_lowercase();
        let mut valid = false;

        {
            let mut store = self.code_store.lock();
            if let Some(entry) = store.get_mut(&contact) {
                if !entry.used && Utc::now() < entry.expires_at && entry.code == code {
                    valid = true;
                    entry.used = true;
                }
            }
        }

        if !valid {
            return Err(AppError::Unauthorized("Invalid or expired code".to_string()));
        }

        let user_id = find_or_create_user(&self.db, &contact).await?;

        // 生成access token (1小时有效期)
        let access_exp = Utc::now() + Duration::hours(1);
        let access_claims = Claims {
            sub: user_id.clone(),
            role: "user".to_string(),
            exp: access_exp.timestamp() as usize,
            token_type: "access".to_string(),
        };

        let access_token = encode(
            &Header::default(),
            &access_claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        ).map_err(|e| AppError::JsonError(e.to_string()))?;

        // 生成refresh token (7天有效期)
        let refresh_exp = Utc::now() + Duration::days(7);
        let refresh_claims = Claims {
            sub: user_id.clone(),
            role: "user".to_string(),
            exp: refresh_exp.timestamp() as usize,
            token_type: "refresh".to_string(),
        };

        let refresh_token = encode(
            &Header::default(),
            &refresh_claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        ).map_err(|e| AppError::JsonError(e.to_string()))?;

        // 将refresh token存储到数据库
        let now = Utc::now().to_rfc3339();
        sqlx::query(
            "INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)"
        )
        .bind(&user_id)
        .bind(&refresh_token)
        .bind(refresh_exp.to_rfc3339())
        .bind(&now)
        .execute(&self.db)
        .await?;

        Ok((access_token, refresh_token, user_id, 3600)) // 3600秒 = 1小时
    }

    pub async fn refresh_access_token(&self, refresh_token: &str) -> Result<(String, i64), AppError> {
        use jsonwebtoken::{decode, DecodingKey, Validation};

        // 验证refresh token
        let token_data = decode::<Claims>(
            refresh_token,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| AppError::Unauthorized("Invalid refresh token".to_string()))?;

        // 检查token类型
        if token_data.claims.token_type != "refresh" {
            return Err(AppError::Unauthorized("Not a refresh token".to_string()));
        }

        // 检查refresh token是否在数据库中且未被撤销
        let row = sqlx::query(
            "SELECT user_id, revoked FROM refresh_tokens WHERE token = ? AND expires_at > datetime('now')"
        )
        .bind(refresh_token)
        .fetch_optional(&self.db)
        .await?;

        let user_row = row.ok_or_else(|| AppError::Unauthorized("Refresh token not found or expired".to_string()))?;
        
        let revoked: i32 = user_row.try_get("revoked").unwrap_or(0);
        if revoked == 1 {
            return Err(AppError::Unauthorized("Refresh token has been revoked".to_string()));
        }

        let user_id: String = user_row.try_get("user_id")?;

        // 生成新的access token
        let access_exp = Utc::now() + Duration::hours(1);
        let access_claims = Claims {
            sub: user_id,
            role: token_data.claims.role,
            exp: access_exp.timestamp() as usize,
            token_type: "access".to_string(),
        };

        let access_token = encode(
            &Header::default(),
            &access_claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        ).map_err(|e| AppError::JsonError(e.to_string()))?;

        Ok((access_token, 3600))
    }

    pub async fn revoke_refresh_token(&self, refresh_token: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE refresh_tokens SET revoked = 1 WHERE token = ?")
            .bind(refresh_token)
            .execute(&self.db)
            .await?;
        Ok(())
    }

    pub fn get_codes(&self) -> Vec<serde_json::Value> {
        let store = self.code_store.lock();
        store.iter()
            .map(|(contact, entry)| {
                serde_json::json!({
                    "contact": contact,
                    "code": entry.code,
                    "expires_at": entry.expires_at,
                    "used": entry.used
                })
            })
            .collect()
    }

    pub fn clear_codes(&self) {
        let mut store = self.code_store.lock();
        store.clear();
    }
}
