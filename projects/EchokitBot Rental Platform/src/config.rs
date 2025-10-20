//! 配置管理模块
//! 
//! 管理 AI 合约生成器的所有配置选项

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::error::{AiContractError, Result};

/// AI 合约生成器的主配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiContractGeneratorConfig {
    /// LLM 提供商配置
    pub llm_providers: LlmProvidersConfig,
    
    /// Agent 配置
    pub agents: AgentsConfig,
    
    /// 安全审计配置
    pub security: SecurityConfig,
    
    /// 模板配置
    pub templates: TemplateConfig,
    
    /// 编译器配置
    pub compiler: CompilerConfig,
    
    /// 部署配置
    pub deployment: DeploymentConfig,
    
    /// 数据库配置
    pub database: DatabaseConfig,
    
    /// 缓存配置
    pub cache: CacheConfig,
    
    /// 日志配置
    pub logging: LoggingConfig,
}

/// LLM 提供商配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmProvidersConfig {
    /// 主要提供商
    pub primary_provider: LlmProvider,
    
    /// 备用提供商列表
    pub fallback_providers: Vec<LlmProvider>,
    
    /// 故障转移配置
    pub failover: FailoverConfig,
}

/// LLM 提供商
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmProvider {
    /// 提供商名称
    pub name: String,
    
    /// 提供商类型
    pub provider_type: LlmProviderType,
    
    /// API 密钥
    pub api_key: Option<String>,
    
    /// API 基础 URL
    pub base_url: Option<String>,
    
    /// 模型配置
    pub models: HashMap<String, ModelConfig>,
    
    /// 是否启用
    pub enabled: bool,
    
    /// 请求限制配置
    pub rate_limits: RateLimitConfig,
}

/// LLM 提供商类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LlmProviderType {
    OpenAI,
    Anthropic,
    Cohere,
    Ollama,
    Custom(String),
}

/// 模型配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    /// 模型名称
    pub name: String,
    
    /// 温度参数
    pub temperature: f32,
    
    /// 最大 token 数
    pub max_tokens: u32,
    
    /// top_p 参数
    pub top_p: Option<f32>,
    
    /// 频率惩罚
    pub frequency_penalty: Option<f32>,
    
    /// 存在惩罚
    pub presence_penalty: Option<f32>,
}

/// 故障转移配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailoverConfig {
    /// 重试次数
    pub max_retries: u32,
    
    /// 重试间隔（秒）
    pub retry_interval: u64,
    
    /// 超时时间（秒）
    pub timeout: u64,
    
    /// 是否启用自动故障转移
    pub auto_failover: bool,
}

/// 请求限制配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    /// 每分钟请求数限制
    pub requests_per_minute: u32,
    
    /// 每小时请求数限制
    pub requests_per_hour: u32,
    
    /// 每天请求数限制
    pub requests_per_day: u32,
    
    /// 并发请求数限制
    pub concurrent_requests: u32,
}

/// Agent 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentsConfig {
    /// 需求解析 Agent 配置
    pub requirements_parser: AgentConfig,
    
    /// 合约生成 Agent 配置
    pub contract_generator: AgentConfig,
    
    /// 安全审计 Agent 配置
    pub security_auditor: AgentConfig,
    
    /// 编译 Agent 配置
    pub compiler: AgentConfig,
    
    /// 部署 Agent 配置
    pub deployment: AgentConfig,
}

/// 单个 Agent 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// 是否启用
    pub enabled: bool,
    
    /// 使用的 LLM 模型
    pub model: String,
    
    /// 系统提示
    pub system_prompt: Option<String>,
    
    /// 温度参数
    pub temperature: f32,
    
    /// 最大重试次数
    pub max_retries: u32,
    
    /// 超时时间（秒）
    pub timeout: u64,
    
    /// 并发限制
    pub concurrency_limit: u32,
}

/// 安全审计配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    /// Aderyn 配置
    pub aderyn: AderynConfig,
    
    /// Slither 配置
    pub slither: SlitherConfig,
    
    /// Mythril 配置
    pub mythril: MythrilConfig,
    
    /// 自定义规则配置
    pub custom_rules: CustomRulesConfig,
    
    /// 安全等级要求
    pub security_level: SecurityLevel,
}

/// Aderyn 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AderynConfig {
    /// 是否启用
    pub enabled: bool,
    
    /// 配置文件路径
    pub config_path: Option<String>,
    
    /// 排除的检测器
    pub exclude_detectors: Vec<String>,
    
    /// 包含的检测器
    pub include_detectors: Vec<String>,
    
    /// 严重程度过滤
    pub severity_filter: Vec<String>,
}
// Slither 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlitherConfig {
    /// 是否启用
    pub enabled: bool,
    
    /// Slither 可执行文件路径
    pub executable_path: String,
    
    /// 排除的检测器
    pub exclude_detectors: Vec<String>,
    
    /// 包含的检测器
    pub include_detectors: Vec<String>,
}

/// Mythril 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MythrilConfig {
    /// 是否启用
    pub enabled: bool,
    
    /// Mythril 可执行文件路径
    pub executable_path: String,
    
    /// 分析超时时间（秒）
    pub timeout: u64,
    
    /// 最大分析深度
    pub max_depth: u32,
}

/// 自定义规则配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomRulesConfig {
    /// 是否启用
    pub enabled: bool,
    
    /// 规则文件路径
    pub rules_path: String,
    
    /// 自定义检测器
    pub custom_detectors: Vec<String>,
}

/// 安全等级
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityLevel {
    Low,
    Medium,
    High,
    Critical,
}

/// 模板配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateConfig {
    /// 模板目录路径
    pub templates_dir: String,
    
    /// 是否启用缓存
    pub enable_cache: bool,
    
    /// 缓存过期时间（秒）
    pub cache_ttl: u64,
    
    /// 预加载的模板
    pub preload_templates: Vec<String>,
}

/// 编译器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilerConfig {
    /// Solidity 版本
    pub solidity_version: String,
    
    /// 优化设置
    pub optimizer: OptimizerConfig,
    
    /// 输出目录
    pub output_dir: String,
    
    /// 是否生成 ABI
    pub generate_abi: bool,
    
    /// 是否生成字节码
    pub generate_bytecode: bool,
}

/// 优化器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizerConfig {
    /// 是否启用优化
    pub enabled: bool,
    
    /// 优化运行次数
    pub runs: u32,
    
    /// 详细优化设置
    pub details: Option<HashMap<String, bool>>,
}

/// 部署配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentConfig {
    /// 默认网络
    pub default_network: String,
    
    /// 网络配置
    pub networks: HashMap<String, NetworkConfig>,
    
    /// Gas 配置
    pub gas: GasConfig,
    
    /// 是否自动验证合约
    pub auto_verify: bool,
}

/// 网络配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// 网络名称
    pub name: String,
    
    /// RPC URL
    pub rpc_url: String,
    
    /// 链 ID
    pub chain_id: u64,
    
    /// 区块浏览器 URL
    pub explorer_url: Option<String>,
    
    /// 是否为测试网
    pub is_testnet: bool,
}

/// Gas 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasConfig {
    /// Gas 限制
    pub gas_limit: u64,
    
    /// Gas 价格（gwei）
    pub gas_price: Option<u64>,
    
    /// 最大费用每 Gas（gwei）
    pub max_fee_per_gas: Option<u64>,
    
    /// 最大优先费用每 Gas（gwei）
    pub max_priority_fee_per_gas: Option<u64>,
}

/// 数据库配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    /// 数据库 URL
    pub url: String,
    
    /// 最大连接数
    pub max_connections: u32,
    
    /// 连接超时时间（秒）
    pub connect_timeout: u64,
    
    /// 空闲超时时间（秒）
    pub idle_timeout: u64,
}

/// 缓存配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    /// Redis URL
    pub redis_url: String,
    
    /// 连接池大小
    pub pool_size: u32,
    
    /// 默认过期时间（秒）
    pub default_ttl: u64,
    
    /// 最大内存使用（MB）
    pub max_memory: u64,
}

/// 日志配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    /// 日志级别
    pub level: String,
    
    /// 日志格式
    pub format: LogFormat,
    
    /// 输出目标
    pub targets: Vec<LogTarget>,
}

/// 日志格式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogFormat {
    Json,
    Pretty,
    Compact,
}

/// 日志输出目标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogTarget {
    Stdout,
    File(String),
    Syslog,
}

impl Default for AiContractGeneratorConfig {
    fn default() -> Self {
        Self {
            llm_providers: LlmProvidersConfig::default(),
            agents: AgentsConfig::default(),
            security: SecurityConfig::default(),
            templates: TemplateConfig::default(),
            compiler: CompilerConfig::default(),
            deployment: DeploymentConfig::default(),
            database: DatabaseConfig::default(),
            cache: CacheConfig::default(),
            logging: LoggingConfig::default(),
        }
    }
}

impl Default for LlmProvidersConfig {
    fn default() -> Self {
        Self {
            primary_provider: LlmProvider::default_openai(),
            fallback_providers: vec![
                LlmProvider::default_anthropic(),
                LlmProvider::default_cohere(),
            ],
            failover: FailoverConfig::default(),
        }
    }
}

impl LlmProvider {
    pub fn default_openai() -> Self {
        let mut models = HashMap::new();
        models.insert(
            "gpt-4o".to_string(),
            ModelConfig {
                name: "gpt-4o".to_string(),
                temperature: 0.3,
                max_tokens: 4096,
                top_p: Some(1.0),
                frequency_penalty: Some(0.0),
                presence_penalty: Some(0.0),
            },
        );
        
        Self {
            name: "OpenAI".to_string(),
            provider_type: LlmProviderType::OpenAI,
            api_key: std::env::var("OPENAI_API_KEY").ok(),
            base_url: Some("https://api.openai.com/v1".to_string()),
            models,
            enabled: true,
            rate_limits: RateLimitConfig::default(),
        }
    }
    
    pub fn default_anthropic() -> Self {
        let mut models = HashMap::new();
        models.insert(
            "claude-3-sonnet-20240229".to_string(),
            ModelConfig {
                name: "claude-3-sonnet-20240229".to_string(),
                temperature: 0.3,
                max_tokens: 4096,
                top_p: Some(1.0),
                frequency_penalty: None,
                presence_penalty: None,
            },
        );
        
        Self {
            name: "Anthropic".to_string(),
            provider_type: LlmProviderType::Anthropic,
            api_key: std::env::var("ANTHROPIC_API_KEY").ok(),
            base_url: Some("https://api.anthropic.com".to_string()),
            models,
            enabled: false, // 默认禁用，需要配置 API 密钥后启用
            rate_limits: RateLimitConfig::default(),
        }
    }
    
    pub fn default_cohere() -> Self {
        let mut models = HashMap::new();
        models.insert(
            "command-r-plus".to_string(),
            ModelConfig {
                name: "command-r-plus".to_string(),
                temperature: 0.3,
                max_tokens: 4096,
                top_p: Some(0.9),
                frequency_penalty: None,
                presence_penalty: None,
            },
        );
        
        Self {
            name: "Cohere".to_string(),
            provider_type: LlmProviderType::Cohere,
            api_key: std::env::var("COHERE_API_KEY").ok(),
            base_url: Some("https://api.cohere.ai".to_string()),
            models,
            enabled: false, // 默认禁用，需要配置 API 密钥后启用
            rate_limits: RateLimitConfig::default(),
        }
    }
}

impl Default for FailoverConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            retry_interval: 5,
            timeout: 30,
            auto_failover: true,
        }
    }
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_minute: 60,
            requests_per_hour: 1000,
            requests_per_day: 10000,
            concurrent_requests: 10,
        }
    }
}

impl Default for AgentsConfig {
    fn default() -> Self {
        Self {
            requirements_parser: AgentConfig {
                enabled: true,
                model: "gpt-4o".to_string(),
                system_prompt: None,
                temperature: 0.3,
                max_retries: 3,
                timeout: 60,
                concurrency_limit: 5,
            },
            contract_generator: AgentConfig {
                enabled: true,
                model: "gpt-4o".to_string(),
                system_prompt: None,
                temperature: 0.2,
                max_retries: 3,
                timeout: 120,
                concurrency_limit: 3,
            },
            security_auditor: AgentConfig {
                enabled: true,
                model: "gpt-4o".to_string(),
                system_prompt: None,
                temperature: 0.1,
                max_retries: 2,
                timeout: 180,
                concurrency_limit: 2,
            },
            compiler: AgentConfig {
                enabled: true,
                model: "gpt-4o".to_string(),
                system_prompt: None,
                temperature: 0.0,
                max_retries: 2,
                timeout: 60,
                concurrency_limit: 5,
            },
            deployment: AgentConfig {
                enabled: true,
                model: "gpt-4o".to_string(),
                system_prompt: None,
                temperature: 0.0,
                max_retries: 2,
                timeout: 300,
                concurrency_limit: 2,
            },
        }
    }
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            aderyn: AderynConfig {
                enabled: true,
                config_path: None,
                exclude_detectors: vec![],
                include_detectors: vec![],
                severity_filter: vec!["high".to_string(), "medium".to_string()],
            },
            slither: SlitherConfig {
                enabled: false, // 默认禁用，需要安装 Slither 后启用
                executable_path: "slither".to_string(),
                exclude_detectors: vec![],
                include_detectors: vec![],
            },
            mythril: MythrilConfig {
                enabled: false, // 默认禁用，需要安装 Mythril 后启用
                executable_path: "myth".to_string(),
                timeout: 300,
                max_depth: 22,
            },
            custom_rules: CustomRulesConfig {
                enabled: true,
                rules_path: "security_rules".to_string(),
                custom_detectors: vec![],
            },
            security_level: SecurityLevel::High,
        }
    }
}

impl Default for TemplateConfig {
    fn default() -> Self {
        Self {
            templates_dir: "templates".to_string(),
            enable_cache: true,
            cache_ttl: 3600, // 1 hour
            preload_templates: vec![
                "erc20_basic".to_string(),
                "erc721_basic".to_string(),
                "multisig_wallet".to_string(),
            ],
        }
    }
}

impl Default for CompilerConfig {
    fn default() -> Self {
        Self {
            solidity_version: "0.8.21".to_string(),
            optimizer: OptimizerConfig {
                enabled: true,
                runs: 200,
                details: None,
            },
            output_dir: "artifacts".to_string(),
            generate_abi: true,
            generate_bytecode: true,
        }
    }
}

impl Default for DeploymentConfig {
    fn default() -> Self {
        let mut networks = HashMap::new();
        
        // 添加默认网络配置
        networks.insert(
            "localhost".to_string(),
            NetworkConfig {
                name: "Localhost".to_string(),
                rpc_url: "http://localhost:8545".to_string(),
                chain_id: 31337,
                explorer_url: None,
                is_testnet: true,
            },
        );
        
        networks.insert(
            "sepolia".to_string(),
            NetworkConfig {
                name: "Sepolia".to_string(),
                rpc_url: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID".to_string(),
                chain_id: 11155111,
                explorer_url: Some("https://sepolia.etherscan.io".to_string()),
                is_testnet: true,
            },
        );
        
        Self {
            default_network: "localhost".to_string(),
            networks,
            gas: GasConfig {
                gas_limit: 8000000,
                gas_price: None,
                max_fee_per_gas: Some(20),
                max_priority_fee_per_gas: Some(2),
            },
            auto_verify: false,
        }
    }
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://localhost/ai_contract_generator".to_string()),
            max_connections: 10,
            connect_timeout: 30,
            idle_timeout: 600,
        }
    }
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            redis_url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            pool_size: 10,
            default_ttl: 3600, // 1 hour
            max_memory: 256, // 256 MB
        }
    }
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            level: "info".to_string(),
            format: LogFormat::Pretty,
            targets: vec![LogTarget::Stdout],
        }
    }
}

impl AiContractGeneratorConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Result<Self> {
        let mut config = Self::default();
        
        // 从环境变量更新 API 密钥
        if let Ok(openai_key) = std::env::var("OPENAI_API_KEY") {
            config.llm_providers.primary_provider.api_key = Some(openai_key);
        }
        
        if let Ok(anthropic_key) = std::env::var("ANTHROPIC_API_KEY") {
            if let Some(anthropic_provider) = config.llm_providers.fallback_providers
                .iter_mut()
                .find(|p| matches!(p.provider_type, LlmProviderType::Anthropic)) {
                anthropic_provider.api_key = Some(anthropic_key);
                anthropic_provider.enabled = true;
            }
        }
        
        if let Ok(cohere_key) = std::env::var("COHERE_API_KEY") {
            if let Some(cohere_provider) = config.llm_providers.fallback_providers
                .iter_mut()
                .find(|p| matches!(p.provider_type, LlmProviderType::Cohere)) {
                cohere_provider.api_key = Some(cohere_key);
                cohere_provider.enabled = true;
            }
        }
        
        Ok(config)
    }
    
    /// 从配置文件加载配置
    pub fn from_file(path: &str) -> Result<Self> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| AiContractError::config_error(format!("无法读取配置文件 {}: {}", path, e)))?;
            
        let config: Self = toml::from_str(&content)
            .map_err(|e| AiContractError::config_error(format!("配置文件格式错误: {}", e)))?;
            
        Ok(config)
    }
    
    /// 验证配置
    pub fn validate(&self) -> Result<()> {
        // 验证至少有一个启用的 LLM 提供商
        if !self.llm_providers.primary_provider.enabled 
            && !self.llm_providers.fallback_providers.iter().any(|p| p.enabled) {
            return Err(AiContractError::config_error("至少需要启用一个 LLM 提供商"));
        }
        
        // 验证启用的提供商都有 API 密钥
        if self.llm_providers.primary_provider.enabled 
            && self.llm_providers.primary_provider.api_key.is_none() {
            return Err(AiContractError::config_error("主要 LLM 提供商缺少 API 密钥"));
        }
        
        for provider in &self.llm_providers.fallback_providers {
            if provider.enabled && provider.api_key.is_none() {
                return Err(AiContractError::config_error(
                    format!("LLM 提供商 {} 缺少 API 密钥", provider.name)
                ));
            }
        }
        
        Ok(())
    }

    /// 从 TOML 文件加载 OpenAI-Compatible API 的多供应商配置
    /// 
    /// 支持环境变量替换，如 "${OPENAI_API_KEY}"
    /// 
    /// # 参数
    /// 
    /// * `path` - 配置文件路径（如 "providers.toml"）
    /// 
    /// # 返回
    /// 
    /// 返回解析后的 `MultiProviderConfig`
    /// 
    /// # 示例
    /// 
    /// ```no_run
    /// use ai_contract_generator::config::AiContractGeneratorConfig;
    /// 
    /// let config = AiContractGeneratorConfig::load_multi_provider_config("providers.toml").unwrap();
    /// ```
    pub fn load_multi_provider_config(path: &str) -> Result<crate::api::providers::config::MultiProviderConfig> {
        use crate::api::providers::config::MultiProviderConfig;
        
        // 读取配置文件内容
        let content = std::fs::read_to_string(path)
            .map_err(|e| AiContractError::config_error(format!("无法读取配置文件 {}: {}", path, e)))?;
        
        // 解析 TOML 配置
        let mut config: MultiProviderConfig = toml::from_str(&content)
            .map_err(|e| AiContractError::config_error(format!("配置文件格式错误: {}", e)))?;
        
        // 解析所有供应商配置中的环境变量
        for provider in &mut config.providers {
            provider.api_key = resolve_env_variables(&provider.api_key);
            
            // 如果 base_url 包含环境变量，也进行替换
            if let Some(ref base_url) = provider.base_url {
                provider.base_url = Some(resolve_env_variables(base_url));
            }
        }
        
        // 验证配置
        config.validate()
            .map_err(|e| AiContractError::config_error(format!("配置验证失败: {}", e)))?;
        
        Ok(config)
    }

    /// 从默认位置加载多供应商配置
    /// 
    /// 按以下顺序查找配置文件：
    /// 1. 当前目录的 providers.toml
    /// 2. crates/ai-contract-generator/providers.toml
    /// 3. 使用默认配置
    pub fn load_multi_provider_config_default() -> Result<crate::api::providers::config::MultiProviderConfig> {
        use crate::api::providers::config::MultiProviderConfig;
        
        // 尝试从多个位置加载配置文件
        let possible_paths = vec![
            "providers.toml",
            "crates/ai-contract-generator/providers.toml",
        ];
        
        for path in possible_paths {
            if std::path::Path::new(path).exists() {
                return Self::load_multi_provider_config(path);
            }
        }
        
        // 如果没有找到配置文件，返回错误
        Err(AiContractError::config_error(
            "未找到 providers.toml 配置文件。请从 providers.toml.example 复制并配置。"
        ))
    }
}

/// 解析字符串中的环境变量
/// 
/// 支持 ${VAR_NAME} 格式的环境变量替换
/// 
/// # 参数
/// 
/// * `value` - 包含环境变量的字符串
/// 
/// # 返回
/// 
/// 替换后的字符串
/// 
/// # 示例
/// 
/// ```
/// use ai_contract_generator::config::resolve_env_variables;
/// 
/// std::env::set_var("MY_KEY", "secret");
/// assert_eq!(resolve_env_variables("${MY_KEY}"), "secret");
/// assert_eq!(resolve_env_variables("prefix-${MY_KEY}-suffix"), "prefix-secret-suffix");
/// ```
pub fn resolve_env_variables(value: &str) -> String {
    let mut result = value.to_string();
    let mut current_pos = 0;
    
    // 查找所有 ${VAR_NAME} 模式
    while current_pos < result.len() {
        if let Some(start) = result[current_pos..].find("${") {
            let abs_start = current_pos + start;
            if let Some(end) = result[abs_start..].find('}') {
                let abs_end = abs_start + end;
                let var_name = &result[abs_start + 2..abs_end];
                
                match std::env::var(var_name) {
                    Ok(replacement) => {
                        // 替换环境变量
                        result.replace_range(abs_start..abs_end + 1, &replacement);
                        // 继续从替换后的位置开始查找
                        current_pos = abs_start + replacement.len();
                    }
                    Err(_) => {
                        // 环境变量不存在，保持原样并跳过这个变量
                        #[cfg(not(test))]
                        eprintln!("警告: 环境变量 {} 未设置，保持原样", var_name);
                        // 跳过这个 ${...} 模式，继续查找下一个
                        current_pos = abs_end + 1;
                    }
                }
            } else {
                // 没有找到闭合的 }，退出循环
                break;
            }
        } else {
            // 没有找到更多的 ${，退出循环
            break;
        }
    }
    
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AiContractGeneratorConfig::default();
        assert_eq!(config.llm_providers.primary_provider.name, "OpenAI");
        assert_eq!(config.llm_providers.fallback_providers.len(), 2);
    }

    #[test]
    fn test_config_validation() {
        let mut config = AiContractGeneratorConfig::default();
        
        // 禁用所有提供商应该失败
        config.llm_providers.primary_provider.enabled = false;
        config.llm_providers.fallback_providers.iter_mut().for_each(|p| p.enabled = false);
        
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_resolve_env_variables() {
        // 测试普通字符串
        assert_eq!(resolve_env_variables("plain-text"), "plain-text");
        
        // 测试单个环境变量
        std::env::set_var("TEST_VAR_1", "value1");
        assert_eq!(resolve_env_variables("${TEST_VAR_1}"), "value1");
        
        // 测试带前缀和后缀的环境变量
        std::env::set_var("TEST_VAR_2", "value2");
        assert_eq!(
            resolve_env_variables("prefix-${TEST_VAR_2}-suffix"),
            "prefix-value2-suffix"
        );
        
        // 测试多个环境变量
        std::env::set_var("TEST_VAR_3", "value3");
        std::env::set_var("TEST_VAR_4", "value4");
        assert_eq!(
            resolve_env_variables("${TEST_VAR_3}-${TEST_VAR_4}"),
            "value3-value4"
        );
        
        // 测试未设置的环境变量（应保持原样）
        let result = resolve_env_variables("${NONEXISTENT_VAR}");
        assert_eq!(result, "${NONEXISTENT_VAR}");
        
        // 清理环境变量
        std::env::remove_var("TEST_VAR_1");
        std::env::remove_var("TEST_VAR_2");
        std::env::remove_var("TEST_VAR_3");
        std::env::remove_var("TEST_VAR_4");
    }

    #[test]
    fn test_load_multi_provider_config_from_string() {
        use crate::api::providers::config::{MultiProviderConfig, ProviderType, RoutingStrategy};
        
        // 创建测试配置内容
        let toml_content = r#"
[global]
routing_strategy = "priority"

[[providers]]
type = "open_a_i"
enabled = true
api_key = "test-key-1"
timeout = 30
priority = 1
weight = 1

[[providers]]
type = "zhipu_g_l_m"
enabled = true
api_key = "test-key-2"
timeout = 30
priority = 2
weight = 1

[providers.model_mapping]
"gpt-4" = "glm-4"
"#;
        
        // 解析配置
        let config: MultiProviderConfig = toml::from_str(toml_content).unwrap();
        
        // 验证配置
        assert_eq!(config.routing_strategy, RoutingStrategy::Priority);
        assert_eq!(config.providers.len(), 2);
        assert_eq!(config.providers[0].provider_type, ProviderType::OpenAI);
        assert_eq!(config.providers[1].provider_type, ProviderType::ZhipuGLM);
        assert_eq!(config.providers[1].model_mapping.get("gpt-4").unwrap(), "glm-4");
    }

    #[test]
    fn test_load_multi_provider_config_with_env_vars() {
        use std::io::Write;
        use tempfile::NamedTempFile;
        
        // 设置测试环境变量
        std::env::set_var("TEST_OPENAI_KEY", "sk-test-openai");
        std::env::set_var("TEST_ZHIPU_KEY", "test-zhipu");
        
        // 创建临时配置文件
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(
            temp_file,
            r#"
[global]
routing_strategy = "priority"

[[providers]]
type = "open_a_i"
enabled = true
api_key = "${{TEST_OPENAI_KEY}}"
timeout = 30
priority = 1
weight = 1

[[providers]]
type = "zhipu_g_l_m"
enabled = true
api_key = "${{TEST_ZHIPU_KEY}}"
timeout = 30
priority = 2
weight = 1
"#
        )
        .unwrap();
        
        // 加载配置
        let config = AiContractGeneratorConfig::load_multi_provider_config(
            temp_file.path().to_str().unwrap()
        )
        .unwrap();
        
        // 验证环境变量已被替换
        assert_eq!(config.providers[0].api_key, "sk-test-openai");
        assert_eq!(config.providers[1].api_key, "test-zhipu");
        
        // 清理环境变量
        std::env::remove_var("TEST_OPENAI_KEY");
        std::env::remove_var("TEST_ZHIPU_KEY");
    }

    #[test]
    fn test_load_multi_provider_config_validation() {
        use std::io::Write;
        use tempfile::NamedTempFile;
        
        // 创建无效配置（空 API 密钥）
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(
            temp_file,
            r#"
[global]
routing_strategy = "priority"

[[providers]]
type = "open_a_i"
enabled = true
api_key = ""
timeout = 30
priority = 1
weight = 1
"#
        )
        .unwrap();
        
        // 加载配置应该失败
        let result = AiContractGeneratorConfig::load_multi_provider_config(
            temp_file.path().to_str().unwrap()
        );
        
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("API 密钥不能为空"));
    }
}