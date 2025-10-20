use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use crate::shared::types::ApiResponse;

/// 统一错误类型
/// 
/// 错误码分类：
/// - 1xxx: 认证错误
/// - 2xxx: 权限和系统错误
/// - 3xxx: 业务逻辑错误
/// - 4xxx: 外部服务错误
#[derive(Debug)]
#[allow(dead_code)]
pub enum AppError {
    // 1xxx - 认证错误
    Unauthorized(String),       // 1001 - 未授权/令牌无效
    InvalidCredentials(String), // 1002 - 凭证无效
    TokenExpired(String),       // 1003 - 令牌过期
    
    // 2xxx - 权限和系统错误
    DatabaseError(String),      // 2001 - 数据库错误
    Forbidden(String),          // 2003 - 禁止访问
    TooManyRequests(String),    // 2009 - 请求过多
    
    // 3xxx - 业务逻辑错误
    JsonError(String),          // 3001 - JSON解析错误
    ValidationError(String),    // 3002 - 验证错误
    NotFound(String),           // 3004 - 资源不存在
    AlreadyExists(String),      // 3005 - 资源已存在
    SbtIssuanceFailed(String),  // 3010 - SBT发放失败
    InsufficientData(String),   // 3011 - 数据不足
    
    // 4xxx - 外部服务错误
    ExternalApiError(String),   // 4001 - 外部API错误
    BlockchainError(String),    // 4002 - 区块链错误
    ContractError(String),      // 4003 - 智能合约错误
}

impl AppError {
    pub fn code(&self) -> i32 {
        match self {
            // 1xxx - 认证错误
            AppError::Unauthorized(_) => 1001,
            AppError::InvalidCredentials(_) => 1002,
            AppError::TokenExpired(_) => 1003,
            
            // 2xxx - 权限和系统错误
            AppError::DatabaseError(_) => 2001,
            AppError::Forbidden(_) => 2003,
            AppError::TooManyRequests(_) => 2009,
            
            // 3xxx - 业务逻辑错误
            AppError::JsonError(_) => 3001,
            AppError::ValidationError(_) => 3002,
            AppError::NotFound(_) => 3004,
            AppError::AlreadyExists(_) => 3005,
            AppError::SbtIssuanceFailed(_) => 3010,
            AppError::InsufficientData(_) => 3011,
            
            // 4xxx - 外部服务错误
            AppError::ExternalApiError(_) => 4001,
            AppError::BlockchainError(_) => 4002,
            AppError::ContractError(_) => 4003,
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
            AppError::InvalidCredentials(msg) => write!(f, "Invalid credentials: {}", msg),
            AppError::TokenExpired(msg) => write!(f, "Token expired: {}", msg),
            AppError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            AppError::Forbidden(msg) => write!(f, "Forbidden: {}", msg),
            AppError::TooManyRequests(msg) => write!(f, "Too many requests: {}", msg),
            AppError::JsonError(msg) => write!(f, "JSON error: {}", msg),
            AppError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::AlreadyExists(msg) => write!(f, "Already exists: {}", msg),
            AppError::SbtIssuanceFailed(msg) => write!(f, "SBT issuance failed: {}", msg),
            AppError::InsufficientData(msg) => write!(f, "Insufficient data: {}", msg),
            AppError::ExternalApiError(msg) => write!(f, "External API error: {}", msg),
            AppError::BlockchainError(msg) => write!(f, "Blockchain error: {}", msg),
            AppError::ContractError(msg) => write!(f, "Contract error: {}", msg),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let code = self.code();
        let (status, message) = match self {
            // 1xxx - 认证错误
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::InvalidCredentials(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::TokenExpired(msg) => (StatusCode::UNAUTHORIZED, msg),
            
            // 2xxx - 权限和系统错误
            AppError::DatabaseError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
            AppError::TooManyRequests(msg) => (StatusCode::TOO_MANY_REQUESTS, msg),
            
            // 3xxx - 业务逻辑错误
            AppError::JsonError(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::ValidationError(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::AlreadyExists(msg) => (StatusCode::CONFLICT, msg),
            AppError::SbtIssuanceFailed(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::InsufficientData(msg) => (StatusCode::BAD_REQUEST, msg),
            
            // 4xxx - 外部服务错误
            AppError::ExternalApiError(msg) => (StatusCode::BAD_GATEWAY, msg),
            AppError::BlockchainError(msg) => (StatusCode::BAD_GATEWAY, msg),
            AppError::ContractError(msg) => (StatusCode::BAD_GATEWAY, msg),
        };
        let body = ApiResponse::<serde_json::Value> { code, message, data: None };
        (status, Json(body)).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::DatabaseError(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::JsonError(err.to_string())
    }
}
