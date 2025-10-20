use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self { code: 0, message: "ok".to_string(), data: Some(data) }
    }

    pub fn success_msg(message: &str) -> ApiResponse<serde_json::Value> {
        ApiResponse { code: 0, message: message.to_string(), data: None }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub role: String,
    pub exp: usize,
    #[serde(default)]
    pub token_type: String, // "access" or "refresh"
}

#[derive(Serialize, Deserialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: String,
    pub expires_in: i64, // 秒数
}

#[derive(Serialize, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Serialize, Deserialize)]
pub struct SendCodeRequest {
    pub contact: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub captcha_token: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct LoginRequest {
    pub contact: String,
    pub code: String,
}

#[derive(Clone, Debug)]
pub struct CodeEntry {
    pub code: String,
    pub expires_at: chrono::DateTime<Utc>,
    pub used: bool,
}
