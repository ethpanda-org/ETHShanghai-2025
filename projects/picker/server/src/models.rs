use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use utoipa::ToSchema;

// 用户类型枚举
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type, ToSchema)]
#[sqlx(type_name = "TEXT", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum UserType {
    Gen,
    Dev,
}

// 支付类型枚举
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type, ToSchema)]
#[sqlx(type_name = "TEXT", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum PayType {
    Wallet,
    Premium,
}

// 订单状态枚举
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type, ToSchema)]
#[sqlx(type_name = "TEXT", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum OrderStatus {
    Pending,
    Success,
    Expired,
}

// 用户模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub user_id: Uuid,
    pub email: String,
    pub user_name: String,
    pub user_password: String,
    pub user_type: UserType,
    pub wallet_address: String,
    pub private_key: String,
    pub premium_balance: i64,
    pub created_at: DateTime<Utc>,
}

// Picker模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Picker {
    pub picker_id: Uuid,
    pub dev_user_id: Uuid,
    pub alias: String,
    pub description: String,
    pub price: i64,
    pub file_path: String,
    pub download_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub image_path: String,
    pub version: String,
    pub status: String,
}

// 订单模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub order_id: Uuid,
    pub user_id: Uuid,
    pub picker_id: Uuid,
    pub amount: i64,
    pub pay_type: PayType,
    pub status: OrderStatus,
    pub tx_hash: Option<String>,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
}

// JWT Claims
#[derive(Debug, Clone)]
pub struct Claims {
    pub sub: Uuid,
    pub exp: usize,
}

impl Claims {
    pub fn new(user_id: Uuid) -> Self {
        let exp = (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize;
        Self {
            sub: user_id,
            exp,
        }
    }
}

// 验证码结构
#[derive(Debug, Clone)]
pub struct VerificationCode {
    pub code: String,
    pub expires_at: DateTime<Utc>,
    pub email: String,
}

// 下载Token
#[derive(Debug, Clone)]
pub struct DownloadToken {
    pub token: String,
    pub order_id: Uuid,
    pub expires_at: DateTime<Utc>,
}

impl DownloadToken {
    pub fn new(order_id: Uuid) -> Self {
        let token = crate::utils::generate_token();
        let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);
        Self {
            token,
            order_id,
            expires_at,
        }
    }
    
    pub fn is_expired(&self) -> bool {
        chrono::Utc::now() > self.expires_at
    }
}