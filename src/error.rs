//! 错误处理模块
//! 
//! 定义了 AI 合约生成器中使用的所有错误类型

use thiserror::Error;

/// AI 合约生成器的结果类型
pub type Result<T> = std::result::Result<T, AiContractError>;

/// Agent 错误类型别名
pub type AgentError = AiContractError;

/// 合约生成器错误类型别名
pub type ContractGeneratorError = AiContractError;

/// AI 合约生成器的错误类型
#[derive(Error, Debug)]
pub enum AiContractError {
    #[error("配置错误: {0}")]
    ConfigError(String),

    #[error("LLM 提供商错误: {0}")]
    LlmProviderError(String),

    #[error("Agent 初始化失败: {0}")]
    AgentInitializationFailed(String),

    #[error("需求解析失败: {0}")]
    RequirementsParsingFailed(String),

    #[error("代码生成失败: {0}")]
    CodeGenerationFailed(String),

    #[error("安全审计失败: {0}")]
    SecurityAuditFailed(String),

    #[error("合约编译失败: {0}")]
    CompilationFailed(String),

    #[error("合约部署失败: {0}")]
    DeploymentFailed(String),

    #[error("模板错误: {0}")]
    TemplateError(String),

    #[error("模板未找到: {0}")]
    TemplateNotFound(String),

    #[error("验证错误: {0}")]
    ValidationError(String),

    #[error("Aderyn 分析失败: {0}")]
    AderynAnalysisFailed(String),

    #[error("Slither 分析失败: {0}")]
    SlitherAnalysisFailed(String),

    #[error("Mythril 分析失败: {0}")]
    MythrilAnalysisFailed(String),

    #[error("向量存储错误: {0}")]
    VectorStoreError(String),

    #[error("RAG 系统错误: {0}")]
    RagSystemError(String),

    #[error("数据库错误: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Redis 错误: {0}")]
    RedisError(#[from] redis::RedisError),

    #[error("序列化错误: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("IO 错误: {0}")]
    IoError(#[from] std::io::Error),

    #[error("HTTP 请求错误: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("任务超时")]
    TaskTimeout,

    #[error("任务取消")]
    TaskCancelled,

    #[error("内部错误: {0}")]
    InternalError(String),

    #[error("平台集成错误: {0}")]
    PlatformIntegrationError(String),

    #[error("合约注册表错误: {0}")]
    RegistryError(String),

    #[error("依赖管理错误: {0}")]
    DependencyError(String),

    #[error("兼容性检查错误: {0}")]
    CompatibilityError(String),

    #[error("未授权: {0}")]
    Unauthorized(String),

    #[error("禁止访问: {0}")]
    Forbidden(String),

    #[error("速率限制超出: {0}")]
    RateLimitExceeded(String),
}

impl AiContractError {
    /// 创建配置错误
    pub fn config_error(msg: impl Into<String>) -> Self {
        Self::ConfigError(msg.into())
    }

    /// 创建 LLM 提供商错误
    pub fn llm_provider_error(msg: impl Into<String>) -> Self {
        Self::LlmProviderError(msg.into())
    }

    /// 创建 Agent 初始化错误
    pub fn agent_init_error(msg: impl Into<String>) -> Self {
        Self::AgentInitializationFailed(msg.into())
    }

    /// 创建需求解析错误
    pub fn requirements_parsing_error(msg: impl Into<String>) -> Self {
        Self::RequirementsParsingFailed(msg.into())
    }

    /// 创建代码生成错误
    pub fn code_generation_error(msg: impl Into<String>) -> Self {
        Self::CodeGenerationFailed(msg.into())
    }

    /// 创建安全审计错误
    pub fn security_audit_error(msg: impl Into<String>) -> Self {
        Self::SecurityAuditFailed(msg.into())
    }

    /// 创建编译错误
    pub fn compilation_error(msg: impl Into<String>) -> Self {
        Self::CompilationFailed(msg.into())
    }

    /// 创建部署错误
    pub fn deployment_error(msg: impl Into<String>) -> Self {
        Self::DeploymentFailed(msg.into())
    }

    /// 创建模板错误
    pub fn template_error(msg: impl Into<String>) -> Self {
        Self::TemplateError(msg.into())
    }

    /// 创建 Aderyn 分析错误
    pub fn aderyn_error(msg: impl Into<String>) -> Self {
        Self::AderynAnalysisFailed(msg.into())
    }

    /// 创建向量存储错误
    pub fn vector_store_error(msg: impl Into<String>) -> Self {
        Self::VectorStoreError(msg.into())
    }

    /// 创建 RAG 系统错误
    pub fn rag_system_error(msg: impl Into<String>) -> Self {
        Self::RagSystemError(msg.into())
    }

    /// 创建序列化错误
    pub fn serialization_error(msg: impl Into<String>) -> Self {
        Self::SerializationError(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            msg.into()
        )))
    }

    /// 创建数据库错误
    pub fn database_error(msg: impl Into<String>) -> Self {
        Self::DatabaseError(sqlx::Error::Configuration(msg.into().into()))
    }

    /// 创建存储错误
    pub fn storage_error(msg: impl Into<String>) -> Self {
        Self::IoError(std::io::Error::new(
            std::io::ErrorKind::Other,
            msg.into()
        ))
    }

    /// 创建内部错误
    pub fn internal_error(msg: impl Into<String>) -> Self {
        Self::InternalError(msg.into())
    }

    /// 检查是否为可重试的错误
    pub fn is_retryable(&self) -> bool {
        match self {
            Self::LlmProviderError(_) => true,
            Self::HttpError(_) => true,
            Self::TaskTimeout => true,
            Self::DatabaseError(_) => true,
            Self::RedisError(_) => true,
            _ => false,
        }
    }

    /// 获取错误的严重程度
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            Self::ConfigError(_) => ErrorSeverity::Critical,
            Self::AgentInitializationFailed(_) => ErrorSeverity::Critical,
            Self::SecurityAuditFailed(_) => ErrorSeverity::High,
            Self::CompilationFailed(_) => ErrorSeverity::High,
            Self::DeploymentFailed(_) => ErrorSeverity::High,
            Self::RequirementsParsingFailed(_) => ErrorSeverity::Medium,
            Self::CodeGenerationFailed(_) => ErrorSeverity::Medium,
            Self::TemplateError(_) => ErrorSeverity::Medium,
            Self::TaskTimeout => ErrorSeverity::Medium,
            Self::TaskCancelled => ErrorSeverity::Low,
            _ => ErrorSeverity::Low,
        }
    }
}

/// 错误严重程度
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl ErrorSeverity {
    /// 获取严重程度的数值表示
    pub fn as_u8(&self) -> u8 {
        match self {
            Self::Low => 1,
            Self::Medium => 2,
            Self::High => 3,
            Self::Critical => 4,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let error = AiContractError::config_error("测试配置错误");
        assert!(matches!(error, AiContractError::ConfigError(_)));
    }

    #[test]
    fn test_error_retryable() {
        let retryable_error = AiContractError::llm_provider_error("网络错误");
        assert!(retryable_error.is_retryable());

        let non_retryable_error = AiContractError::config_error("配置错误");
        assert!(!non_retryable_error.is_retryable());
    }

    #[test]
    fn test_error_severity() {
        let critical_error = AiContractError::config_error("配置错误");
        assert_eq!(critical_error.severity(), ErrorSeverity::Critical);

        let medium_error = AiContractError::requirements_parsing_error("解析错误");
        assert_eq!(medium_error.severity(), ErrorSeverity::Medium);
    }
}