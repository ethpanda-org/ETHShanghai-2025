use async_trait::async_trait;
use crate::shared::errors::AppError;
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::Mutex;
use chrono::{Duration, Utc};

/// CAPTCHA验证trait
#[async_trait]
pub trait CaptchaVerifier: Send + Sync {
    async fn verify(&self, token: &str, client_ip: Option<&str>) -> Result<bool, AppError>;
}

/// Google reCAPTCHA v2/v3 验证器
pub struct RecaptchaVerifier {
    secret_key: String,
    version: RecaptchaVersion,
    min_score: f64, // v3使用
}

#[derive(Clone, Debug)]
pub enum RecaptchaVersion {
    V2,
    V3,
}

impl RecaptchaVerifier {
    pub fn new(secret_key: String, version: RecaptchaVersion, min_score: f64) -> Self {
        Self {
            secret_key,
            version,
            min_score,
        }
    }

    pub fn from_env() -> Result<Self, AppError> {
        let secret_key = std::env::var("RECAPTCHA_SECRET_KEY")
            .map_err(|_| AppError::ValidationError("RECAPTCHA_SECRET_KEY not set".to_string()))?;
        
        let version_str = std::env::var("RECAPTCHA_VERSION").unwrap_or_else(|_| "v2".to_string());
        let version = match version_str.to_lowercase().as_str() {
            "v3" => RecaptchaVersion::V3,
            _ => RecaptchaVersion::V2,
        };

        let min_score = std::env::var("RECAPTCHA_MIN_SCORE")
            .unwrap_or_else(|_| "0.5".to_string())
            .parse()
            .unwrap_or(0.5);

        Ok(Self::new(secret_key, version, min_score))
    }
}

#[async_trait]
impl CaptchaVerifier for RecaptchaVerifier {
    async fn verify(&self, token: &str, client_ip: Option<&str>) -> Result<bool, AppError> {
        let client = reqwest::Client::new();
        
        let mut params = vec![
            ("secret", self.secret_key.as_str()),
            ("response", token),
        ];

        if let Some(ip) = client_ip {
            params.push(("remoteip", ip));
        }

        let response = client
            .post("https://www.google.com/recaptcha/api/siteverify")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::ValidationError(format!("reCAPTCHA request failed: {}", e)))?;

        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AppError::JsonError(format!("Failed to parse reCAPTCHA response: {}", e)))?;

        let success = result["success"].as_bool().unwrap_or(false);

        if !success {
            let error_codes = result["error-codes"].as_array();
            println!("⚠️ reCAPTCHA verification failed: {:?}", error_codes);
            return Ok(false);
        }

        // v3需要检查分数
        if matches!(self.version, RecaptchaVersion::V3) {
            let score = result["score"].as_f64().unwrap_or(0.0);
            if score < self.min_score {
                println!("⚠️ reCAPTCHA score too low: {} < {}", score, self.min_score);
                return Ok(false);
            }
        }

        Ok(true)
    }
}

/// 简单的本地图形验证码（用于开发测试）
pub struct SimpleCaptchaVerifier {
    store: Arc<Mutex<HashMap<String, CaptchaEntry>>>,
}

#[derive(Clone, Debug)]
struct CaptchaEntry {
    code: String,
    expires_at: chrono::DateTime<Utc>,
    used: bool,
}

impl SimpleCaptchaVerifier {
    pub fn new() -> Self {
        Self {
            store: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 生成验证码
    pub fn generate(&self, session_id: &str) -> String {
        use rand::Rng;
        
        // 生成4位随机字符（数字+字母）
        let code: String = (0..4)
            .map(|_| {
                let chars = b"23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 去除易混淆字符
                let idx = rand::thread_rng().gen_range(0..chars.len());
                chars[idx] as char
            })
            .collect();

        let expires = Utc::now() + Duration::minutes(5);

        let mut store = self.store.lock();
        store.insert(
            session_id.to_string(),
            CaptchaEntry {
                code: code.clone(),
                expires_at: expires,
                used: false,
            },
        );

        println!("🔐 Generated CAPTCHA for {}: {}", session_id, code);
        code
    }

    /// 清理过期验证码
    #[allow(dead_code)]
    pub fn cleanup_expired(&self) {
        let mut store = self.store.lock();
        let now = Utc::now();
        store.retain(|_, entry| entry.expires_at > now);
    }
}

impl Default for SimpleCaptchaVerifier {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl CaptchaVerifier for SimpleCaptchaVerifier {
    async fn verify(&self, token: &str, _client_ip: Option<&str>) -> Result<bool, AppError> {
        // token格式: "session_id:code"
        let parts: Vec<&str> = token.split(':').collect();
        if parts.len() != 2 {
            return Ok(false);
        }

        let session_id = parts[0];
        let user_code = parts[1].to_uppercase();

        let mut store = self.store.lock();
        
        if let Some(entry) = store.get_mut(session_id) {
            let now = Utc::now();
            
            if entry.used {
                return Ok(false);
            }

            if now > entry.expires_at {
                return Ok(false);
            }

            if entry.code.to_uppercase() == user_code {
                entry.used = true;
                return Ok(true);
            }
        }

        Ok(false)
    }
}

/// CAPTCHA验证器工厂
pub fn create_captcha_verifier() -> Box<dyn CaptchaVerifier> {
    // 检查环境变量决定使用哪种验证器
    let captcha_type = std::env::var("CAPTCHA_TYPE").unwrap_or_else(|_| "simple".to_string());

    match captcha_type.to_lowercase().as_str() {
        "recaptcha" | "google" => {
            if let Ok(verifier) = RecaptchaVerifier::from_env() {
                Box::new(verifier)
            } else {
                println!("⚠️ Failed to initialize reCAPTCHA, falling back to simple CAPTCHA");
                Box::new(SimpleCaptchaVerifier::new())
            }
        }
        _ => Box::new(SimpleCaptchaVerifier::new()),
    }
}

/// CAPTCHA验证辅助函数
pub async fn verify_captcha(token: &str, client_ip: Option<&str>) -> Result<(), AppError> {
    let verifier = create_captcha_verifier();
    let valid = verifier.verify(token, client_ip).await?;
    
    if !valid {
        return Err(AppError::ValidationError("Invalid CAPTCHA".to_string()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_simple_captcha() {
        let verifier = SimpleCaptchaVerifier::new();
        let session_id = "test_session";
        let code = verifier.generate(session_id);
        
        let token = format!("{}:{}", session_id, code);
        let result = verifier.verify(&token, None).await;
        assert!(result.is_ok());
        assert!(result.unwrap());

        // 验证码应该只能使用一次
        let result2 = verifier.verify(&token, None).await;
        assert!(result2.is_ok());
        assert!(!result2.unwrap());
    }

    #[tokio::test]
    async fn test_simple_captcha_invalid() {
        let verifier = SimpleCaptchaVerifier::new();
        let session_id = "test_session";
        verifier.generate(session_id);
        
        let token = format!("{}:WRONG", session_id);
        let result = verifier.verify(&token, None).await;
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }
}

