//! API 错误处理
//! 
//! 提供 OpenAI-compatible 的错误格式和处理

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::fmt;

/// API 操作的统一结果类型
pub type ApiResult<T> = Result<T, ApiError>;

/// OpenAI-compatible 错误响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: ErrorDetail,
}

/// 错误详情
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorDetail {
    pub message: String,
    pub r#type: String,
    pub param: Option<String>,
    pub code: Option<String>,
}

/// API 错误类型
#[derive(Debug)]
pub enum ApiError {
    /// 无效请求
    InvalidRequest(String),
    /// 认证失败
    Unauthorized(String),
    /// 权限不足
    Forbidden(String),
    /// 资源未找到
    NotFound(String),
    /// 请求过于频繁
    RateLimitExceeded(String),
    /// 服务器内部错误
    InternalError(String),
    /// 服务不可用
    ServiceUnavailable(String),
    /// 模型不支持
    ModelNotSupported(String),
    /// 配额不足
    QuotaExceeded(String),
    /// 请求超时
    Timeout(String),
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::InvalidRequest(msg) => write!(f, "Invalid request: {}", msg),
            ApiError::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
            ApiError::Forbidden(msg) => write!(f, "Forbidden: {}", msg),
            ApiError::NotFound(msg) => write!(f, "Not found: {}", msg),
            ApiError::RateLimitExceeded(msg) => write!(f, "Rate limit exceeded: {}", msg),
            ApiError::InternalError(msg) => write!(f, "Internal error: {}", msg),
            ApiError::ServiceUnavailable(msg) => write!(f, "Service unavailable: {}", msg),
            ApiError::ModelNotSupported(msg) => write!(f, "Model not supported: {}", msg),
            ApiError::QuotaExceeded(msg) => write!(f, "Quota exceeded: {}", msg),
            ApiError::Timeout(msg) => write!(f, "Timeout: {}", msg),
        }
    }
}

impl std::error::Error for ApiError {}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_type, message) = match &self {
            ApiError::InvalidRequest(msg) => (StatusCode::BAD_REQUEST, "invalid_request_error", msg),
            ApiError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "authentication_error", msg),
            ApiError::Forbidden(msg) => (StatusCode::FORBIDDEN, "permission_error", msg),
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found_error", msg),
            ApiError::RateLimitExceeded(msg) => (StatusCode::TOO_MANY_REQUESTS, "rate_limit_exceeded", msg),
            ApiError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error", msg),
            ApiError::ServiceUnavailable(msg) => (StatusCode::SERVICE_UNAVAILABLE, "service_unavailable", msg),
            ApiError::ModelNotSupported(msg) => (StatusCode::BAD_REQUEST, "model_not_supported", msg),
            ApiError::QuotaExceeded(msg) => (StatusCode::TOO_MANY_REQUESTS, "quota_exceeded", msg),
            ApiError::Timeout(msg) => (StatusCode::REQUEST_TIMEOUT, "timeout", msg),
        };

        let error_response = ErrorResponse {
            error: ErrorDetail {
                message: message.clone(),
                r#type: error_type.to_string(),
                param: None,
                code: None,
            },
        };

        (status, Json(error_response)).into_response()
    }
}

impl From<crate::error::AiContractError> for ApiError {
    fn from(err: crate::error::AiContractError) -> Self {
        match err {
            crate::error::AiContractError::ConfigError(msg) => ApiError::InvalidRequest(msg),
            crate::error::AiContractError::LlmProviderError(msg) => ApiError::ServiceUnavailable(msg),
            crate::error::AiContractError::TaskTimeout => ApiError::Timeout("Request timeout".to_string()),
            _ => ApiError::InternalError(err.to_string()),
        }
    }
}

// 便捷的错误构造函数
impl ApiError {
    /// 创建一个无效请求错误
    pub fn invalid_request(msg: impl Into<String>) -> Self {
        ApiError::InvalidRequest(msg.into())
    }

    /// 创建一个未授权错误
    pub fn unauthorized(msg: impl Into<String>) -> Self {
        ApiError::Unauthorized(msg.into())
    }

    /// 创建一个禁止访问错误
    pub fn forbidden(msg: impl Into<String>) -> Self {
        ApiError::Forbidden(msg.into())
    }

    /// 创建一个未找到错误
    pub fn not_found(msg: impl Into<String>) -> Self {
        ApiError::NotFound(msg.into())
    }

    /// 创建一个速率限制错误
    pub fn rate_limit_exceeded(msg: impl Into<String>) -> Self {
        ApiError::RateLimitExceeded(msg.into())
    }

    /// 创建一个内部错误
    pub fn internal_error(msg: impl Into<String>) -> Self {
        ApiError::InternalError(msg.into())
    }

    /// 创建一个服务不可用错误
    pub fn service_unavailable(msg: impl Into<String>) -> Self {
        ApiError::ServiceUnavailable(msg.into())
    }

    /// 创建一个模型不支持错误
    pub fn model_not_supported(msg: impl Into<String>) -> Self {
        ApiError::ModelNotSupported(msg.into())
    }

    /// 创建一个配额超限错误
    pub fn quota_exceeded(msg: impl Into<String>) -> Self {
        ApiError::QuotaExceeded(msg.into())
    }

    /// 创建一个超时错误
    pub fn timeout(msg: impl Into<String>) -> Self {
        ApiError::Timeout(msg.into())
    }
}

// 从标准错误类型转换
impl From<std::io::Error> for ApiError {
    fn from(err: std::io::Error) -> Self {
        ApiError::InternalError(format!("IO error: {}", err))
    }
}

impl From<serde_json::Error> for ApiError {
    fn from(err: serde_json::Error) -> Self {
        ApiError::InvalidRequest(format!("JSON parsing error: {}", err))
    }
}

impl From<reqwest::Error> for ApiError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            ApiError::Timeout("Request timeout".to_string())
        } else if err.is_connect() {
            ApiError::ServiceUnavailable(format!("Connection error: {}", err))
        } else if err.is_status() {
            let status = err.status().unwrap();
            if status.is_client_error() {
                ApiError::InvalidRequest(format!("Client error: {}", err))
            } else {
                ApiError::ServiceUnavailable(format!("Server error: {}", err))
            }
        } else {
            ApiError::InternalError(format!("HTTP error: {}", err))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_response_serialization() {
        let error = ErrorResponse {
            error: ErrorDetail {
                message: "Invalid model specified".to_string(),
                r#type: "invalid_request_error".to_string(),
                param: Some("model".to_string()),
                code: Some("model_not_found".to_string()),
            },
        };

        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("Invalid model specified"));
        assert!(json.contains("invalid_request_error"));
    }

    #[test]
    fn test_api_error_display() {
        let error = ApiError::InvalidRequest("Test error".to_string());
        assert_eq!(error.to_string(), "Invalid request: Test error");

        let error = ApiError::Unauthorized("Missing API key".to_string());
        assert_eq!(error.to_string(), "Unauthorized: Missing API key");
    }

    #[test]
    fn test_api_error_into_response() {
        let error = ApiError::InvalidRequest("Test error".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        let error = ApiError::RateLimitExceeded("Too many requests".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
    }

    #[test]
    fn test_convenience_constructors() {
        let error = ApiError::invalid_request("test");
        assert!(matches!(error, ApiError::InvalidRequest(_)));

        let error = ApiError::unauthorized("test");
        assert!(matches!(error, ApiError::Unauthorized(_)));

        let error = ApiError::rate_limit_exceeded("test");
        assert!(matches!(error, ApiError::RateLimitExceeded(_)));
    }

    #[test]
    fn test_error_conversions() {
        // Test JSON error conversion
        let json_err = serde_json::from_str::<serde_json::Value>("invalid json").unwrap_err();
        let api_err: ApiError = json_err.into();
        assert!(matches!(api_err, ApiError::InvalidRequest(_)));

        // Test IO error conversion
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let api_err: ApiError = io_err.into();
        assert!(matches!(api_err, ApiError::InternalError(_)));
    }

    #[test]
    fn test_api_result_type() {
        fn returns_result() -> ApiResult<String> {
            Ok("success".to_string())
        }

        fn returns_error() -> ApiResult<String> {
            Err(ApiError::invalid_request("test error"))
        }

        assert!(returns_result().is_ok());
        assert!(returns_error().is_err());
    }
}
