// API 数据模型

use serde::{Deserialize, Serialize};
use thiserror::Error;

// 错误类型定义
#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),
    
    #[error("Server error: {0}")]
    ServerError(String),
    
    #[error("Auth error: {0}")]
    AuthError(String),
    
    #[error("Validation error: {0}")]
    ValidationError(String),
    
    #[error("Not found")]
    NotFound,
    
    #[error("Unknown error")]
    Unknown,
}

// 实现 serde::Serialize 以便能够传递给前端
impl Serialize for ApiError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeMap;
        
        let mut map = serializer.serialize_map(Some(2))?;
        map.serialize_entry("type", &format!("{:?}", self))?;
        map.serialize_entry("message", &self.to_string())?;
        map.end()
    }
}

// 连接检查响应结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionStatus {
    pub is_connected: bool,
    pub response_time_ms: u64,
    pub server_status: String,
    pub auth_valid: bool,
    pub error_message: Option<String>,
}

// 系统信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub chain_name: String,
    pub chain_url: String,
    pub explorer_url: String,
    pub premium_payment_rate: i64,
    pub premium_to_usd: i64,
    pub premium_free: i64,
    pub premium_period: i64,
    pub premium_start: bool,
}

// 登录请求
#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub user_password: String,
}

// 登录响应
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
}

// 用户信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserInfo {
    pub user_id: String,
    pub email: String,
    pub user_name: String,
    pub user_type: UserType,
    pub wallet_address: String,
    pub premium_balance: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSystemInfoResponse {
    pub wallet_balance: i64,
    pub user_info: UserInfo,
    pub system_info: SystemInfo,
}

// 用户类型
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum UserType {
    Gen,
    Dev,
}

// 注册请求
#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub user_password: String,
    pub user_name: String,
    pub user_type: UserType,
}

// 注册响应
#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterResponse {
    pub user_id: String,
    pub message: String,
}

// Picker 信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PickerInfo {
    pub picker_id: String,
    pub dev_user_id: String,
    pub alias: String,
    pub description: String,
    pub price: i64,
    pub image_path: String,
    pub version: String,
    pub download_count: i64,
    pub created_at: String,
    pub updated_at: String,
    pub status: String,
}

// Picker 列表响应
#[derive(Debug, Serialize, Deserialize)]
pub struct PickerListResponse {
    pub pickers: Vec<PickerInfo>,
    pub total: u32,
}

// 上传 Picker 请求
#[derive(Debug, Serialize)]
pub struct UploadPickerRequest {
    pub alias: String,
    pub description: String,
    pub price: i64,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadPickerResponse {
    pub picker_id: String,
    pub message: String,
}

// 支付类型
#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "snake_case")]
pub enum PayType {
    Wallet,
    Premium,
}

// 订单状态
#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    Pending,
    Success,
    Expired,
}

// 订单信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrderInfo {
    pub order_id: String,
    pub user_id: String,
    pub picker_id: String,
    pub picker_alias: String,
    pub amount: i64,
    pub pay_type: PayType,
    pub status: OrderStatus,
    pub created_at: String,
}

// 订单列表响应
#[derive(Debug, Serialize, Deserialize)]
pub struct OrderListResponse {
    pub orders: Vec<OrderInfo>,
    pub total: u32,
    pub page: u32,
    pub size: u32,
    pub has_next: bool,
}

// 创建订单请求
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateOrderRequest {
    pub picker_id: String,
    pub pay_type: PayType,
}

// 创建订单响应
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateOrderResponse {
    pub token: String,
    pub message: String,
}

// 邮箱验证请求
#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyRequest {
    pub email: String,
    pub code: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyResponse {
    pub token: String,
    pub user: UserInfo,
}