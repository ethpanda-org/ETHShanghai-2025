//! 供应商配置模块
//! 
//! 定义供应商类型、配置结构和路由策略

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 供应商类型枚举
/// 
/// 只包含 4 个核心供应商，符合 MVP 范围
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderType {
    /// OpenAI (GPT-4, GPT-3.5-turbo)
    OpenAI,
    /// 智谱 GLM (GLM-4)
    ZhipuGLM,
    /// 阿里百炼 (Qwen)
    AlibabaBailian,
    /// Anthropic Claude (Claude-3)
    AnthropicClaude,
}

impl ProviderType {
    /// 获取供应商的默认 base_url
    pub fn default_base_url(&self) -> &'static str {
        match self {
            ProviderType::OpenAI => "https://api.openai.com/v1",
            ProviderType::ZhipuGLM => "https://open.bigmodel.cn/api/paas/v4",
            ProviderType::AlibabaBailian => "https://dashscope.aliyuncs.com/compatible-mode/v1",
            ProviderType::AnthropicClaude => "https://api.anthropic.com/v1",
        }
    }

    /// 获取供应商名称
    pub fn name(&self) -> &'static str {
        match self {
            ProviderType::OpenAI => "openai",
            ProviderType::ZhipuGLM => "zhipu_glm",
            ProviderType::AlibabaBailian => "alibaba_bailian",
            ProviderType::AnthropicClaude => "anthropic_claude",
        }
    }
}

/// 供应商配置
/// 
/// 包含单个供应商的所有配置信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    /// 供应商类型
    #[serde(rename = "type")]
    pub provider_type: ProviderType,

    /// 是否启用该供应商
    #[serde(default = "default_enabled")]
    pub enabled: bool,

    /// API 基础 URL
    /// 
    /// 如果未指定，使用 ProviderType 的默认值
    #[serde(default)]
    pub base_url: Option<String>,

    /// API 密钥
    /// 
    /// 支持环境变量替换，如 "${OPENAI_API_KEY}"
    pub api_key: String,

    /// 模型名称映射
    /// 
    /// 将 OpenAI 模型名称映射到供应商的实际模型名称
    /// 例如: "gpt-4" -> "glm-4"
    #[serde(default)]
    pub model_mapping: HashMap<String, String>,

    /// 请求超时时间（秒）
    #[serde(default = "default_timeout")]
    pub timeout: u64,

    /// 优先级（数字越小优先级越高）
    /// 
    /// 用于 Priority 路由策略
    #[serde(default = "default_priority")]
    pub priority: u32,

    /// 权重
    /// 
    /// 用于 WeightedRoundRobin 路由策略（预留）
    #[serde(default = "default_weight")]
    pub weight: u32,
}

impl ProviderConfig {
    /// 获取实际的 base_url
    pub fn get_base_url(&self) -> &str {
        self.base_url
            .as_deref()
            .unwrap_or_else(|| self.provider_type.default_base_url())
    }

    /// 解析 API 密钥中的环境变量
    /// 
    /// 支持 ${VAR_NAME} 格式的环境变量替换
    pub fn resolve_api_key(&self) -> String {
        resolve_env_var(&self.api_key)
    }

    /// 映射模型名称
    /// 
    /// 如果配置中有映射规则，使用映射后的名称；否则返回原始名称
    pub fn map_model_name(&self, openai_model: &str) -> String {
        self.model_mapping
            .get(openai_model)
            .cloned()
            .unwrap_or_else(|| openai_model.to_string())
    }
}

/// 路由策略枚举
/// 
/// 定义如何在多个供应商之间选择
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RoutingStrategy {
    /// 优先级路由：按 priority 字段选择优先级最高的供应商
    Priority,
    
    /// 轮询路由：依次轮流选择供应商
    RoundRobin,
}

impl Default for RoutingStrategy {
    fn default() -> Self {
        RoutingStrategy::Priority
    }
}

/// 多供应商配置
/// 
/// 管理所有供应商的配置和全局路由策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiProviderConfig {
    /// 供应商列表
    pub providers: Vec<ProviderConfig>,

    /// 路由策略
    #[serde(default)]
    pub routing_strategy: RoutingStrategy,
}

impl MultiProviderConfig {
    /// 创建新的多供应商配置
    pub fn new(providers: Vec<ProviderConfig>, routing_strategy: RoutingStrategy) -> Self {
        Self {
            providers,
            routing_strategy,
        }
    }

    /// 获取所有启用的供应商
    pub fn enabled_providers(&self) -> Vec<&ProviderConfig> {
        self.providers
            .iter()
            .filter(|p| p.enabled)
            .collect()
    }

    /// 根据供应商类型查找配置
    pub fn find_provider(&self, provider_type: ProviderType) -> Option<&ProviderConfig> {
        self.providers
            .iter()
            .find(|p| p.provider_type == provider_type && p.enabled)
    }

    /// 验证配置的有效性
    pub fn validate(&self) -> Result<(), String> {
        if self.providers.is_empty() {
            return Err("至少需要配置一个供应商".to_string());
        }

        let enabled_count = self.enabled_providers().len();
        if enabled_count == 0 {
            return Err("至少需要启用一个供应商".to_string());
        }

        // 验证每个供应商的配置
        for provider in &self.providers {
            if provider.api_key.is_empty() {
                return Err(format!(
                    "供应商 {} 的 API 密钥不能为空",
                    provider.provider_type.name()
                ));
            }

            if provider.timeout == 0 {
                return Err(format!(
                    "供应商 {} 的超时时间必须大于 0",
                    provider.provider_type.name()
                ));
            }
        }

        Ok(())
    }
}

// 默认值函数

fn default_enabled() -> bool {
    true
}

fn default_timeout() -> u64 {
    30 // 30 秒
}

fn default_priority() -> u32 {
    100
}

fn default_weight() -> u32 {
    1
}

/// 解析环境变量
/// 
/// 支持 ${VAR_NAME} 格式的环境变量替换
/// 同时处理可能包含引号的环境变量值
fn resolve_env_var(value: &str) -> String {
    if value.starts_with("${") && value.ends_with('}') {
        let var_name = &value[2..value.len() - 1];
        let env_value = std::env::var(var_name).unwrap_or_else(|_| {
            // 只在非测试环境下输出警告
            #[cfg(not(test))]
            eprintln!("警告: 环境变量 {} 未设置", var_name);
            value.to_string()
        });
        
        // 移除可能存在的引号
        trim_quotes(&env_value)
    } else {
        value.to_string()
    }
}

/// 移除字符串两端的引号
/// 
/// 处理双引号和单引号的情况
fn trim_quotes(value: &str) -> String {
    let trimmed = value.trim();
    
    // 移除双引号
    if trimmed.len() >= 2 && trimmed.starts_with('"') && trimmed.ends_with('"') {
        return trimmed[1..trimmed.len()-1].to_string();
    }
    
    // 移除单引号
    if trimmed.len() >= 2 && trimmed.starts_with('\'') && trimmed.ends_with('\'') {
        return trimmed[1..trimmed.len()-1].to_string();
    }
    
    trimmed.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_type_default_urls() {
        assert_eq!(
            ProviderType::OpenAI.default_base_url(),
            "https://api.openai.com/v1"
        );
        assert_eq!(
            ProviderType::ZhipuGLM.default_base_url(),
            "https://open.bigmodel.cn/api/paas/v4"
        );
        assert_eq!(
            ProviderType::AlibabaBailian.default_base_url(),
            "https://dashscope.aliyuncs.com/compatible-mode/v1"
        );
        assert_eq!(
            ProviderType::AnthropicClaude.default_base_url(),
            "https://api.anthropic.com/v1"
        );
    }

    #[test]
    fn test_provider_type_names() {
        assert_eq!(ProviderType::OpenAI.name(), "openai");
        assert_eq!(ProviderType::ZhipuGLM.name(), "zhipu_glm");
        assert_eq!(ProviderType::AlibabaBailian.name(), "alibaba_bailian");
        assert_eq!(ProviderType::AnthropicClaude.name(), "anthropic_claude");
    }

    #[test]
    fn test_provider_config_get_base_url() {
        let config = ProviderConfig {
            provider_type: ProviderType::OpenAI,
            enabled: true,
            base_url: None,
            api_key: "test-key".to_string(),
            model_mapping: HashMap::new(),
            timeout: 30,
            priority: 1,
            weight: 1,
        };

        assert_eq!(config.get_base_url(), "https://api.openai.com/v1");

        let config_with_custom_url = ProviderConfig {
            base_url: Some("https://custom.api.com".to_string()),
            ..config
        };

        assert_eq!(config_with_custom_url.get_base_url(), "https://custom.api.com");
    }

    #[test]
    fn test_provider_config_map_model_name() {
        let mut model_mapping = HashMap::new();
        model_mapping.insert("gpt-4".to_string(), "glm-4".to_string());

        let config = ProviderConfig {
            provider_type: ProviderType::ZhipuGLM,
            enabled: true,
            base_url: None,
            api_key: "test-key".to_string(),
            model_mapping,
            timeout: 30,
            priority: 1,
            weight: 1,
        };

        assert_eq!(config.map_model_name("gpt-4"), "glm-4");
        assert_eq!(config.map_model_name("gpt-3.5-turbo"), "gpt-3.5-turbo");
    }

    #[test]
    fn test_resolve_env_var() {
        // 测试普通字符串
        assert_eq!(resolve_env_var("plain-text"), "plain-text");

        // 测试环境变量格式（实际值取决于环境）
        std::env::set_var("TEST_VAR", "test-value");
        assert_eq!(resolve_env_var("${TEST_VAR}"), "test-value");
        std::env::remove_var("TEST_VAR");
        
        // 测试带双引号的环境变量
        std::env::set_var("TEST_VAR_QUOTED", "\"test-value\"");
        assert_eq!(resolve_env_var("${TEST_VAR_QUOTED}"), "test-value");
        std::env::remove_var("TEST_VAR_QUOTED");
        
        // 测试带单引号的环境变量
        std::env::set_var("TEST_VAR_SINGLE", "'test-value'");
        assert_eq!(resolve_env_var("${TEST_VAR_SINGLE}"), "test-value");
        std::env::remove_var("TEST_VAR_SINGLE");
    }
    
    #[test]
    fn test_trim_quotes() {
        // 测试双引号
        assert_eq!(trim_quotes("\"hello\""), "hello");
        assert_eq!(trim_quotes("\"sk-123-456\""), "sk-123-456");
        
        // 测试单引号
        assert_eq!(trim_quotes("'hello'"), "hello");
        assert_eq!(trim_quotes("'sk-123-456'"), "sk-123-456");
        
        // 测试无引号
        assert_eq!(trim_quotes("hello"), "hello");
        assert_eq!(trim_quotes("sk-123-456"), "sk-123-456");
        
        // 测试不匹配的引号
        assert_eq!(trim_quotes("\"hello'"), "\"hello'");
        assert_eq!(trim_quotes("'hello\""), "'hello\"");
        
        // 测试空字符串
        assert_eq!(trim_quotes(""), "");
        assert_eq!(trim_quotes("\"\""), "");
        assert_eq!(trim_quotes("''"), "");
        
        // 测试只有一个引号
        assert_eq!(trim_quotes("\""), "\"");
        assert_eq!(trim_quotes("'"), "'");
    }

    #[test]
    fn test_routing_strategy_default() {
        assert_eq!(RoutingStrategy::default(), RoutingStrategy::Priority);
    }

    #[test]
    fn test_multi_provider_config_enabled_providers() {
        let config = MultiProviderConfig {
            providers: vec![
                ProviderConfig {
                    provider_type: ProviderType::OpenAI,
                    enabled: true,
                    base_url: None,
                    api_key: "key1".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 30,
                    priority: 1,
                    weight: 1,
                },
                ProviderConfig {
                    provider_type: ProviderType::ZhipuGLM,
                    enabled: false,
                    base_url: None,
                    api_key: "key2".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 30,
                    priority: 2,
                    weight: 1,
                },
            ],
            routing_strategy: RoutingStrategy::Priority,
        };

        let enabled = config.enabled_providers();
        assert_eq!(enabled.len(), 1);
        assert_eq!(enabled[0].provider_type, ProviderType::OpenAI);
    }

    #[test]
    fn test_multi_provider_config_find_provider() {
        let config = MultiProviderConfig {
            providers: vec![
                ProviderConfig {
                    provider_type: ProviderType::OpenAI,
                    enabled: true,
                    base_url: None,
                    api_key: "key1".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 30,
                    priority: 1,
                    weight: 1,
                },
            ],
            routing_strategy: RoutingStrategy::Priority,
        };

        assert!(config.find_provider(ProviderType::OpenAI).is_some());
        assert!(config.find_provider(ProviderType::ZhipuGLM).is_none());
    }

    #[test]
    fn test_multi_provider_config_validate() {
        // 空配置应该失败
        let empty_config = MultiProviderConfig {
            providers: vec![],
            routing_strategy: RoutingStrategy::Priority,
        };
        assert!(empty_config.validate().is_err());

        // 所有供应商都禁用应该失败
        let all_disabled_config = MultiProviderConfig {
            providers: vec![
                ProviderConfig {
                    provider_type: ProviderType::OpenAI,
                    enabled: false,
                    base_url: None,
                    api_key: "key1".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 30,
                    priority: 1,
                    weight: 1,
                },
            ],
            routing_strategy: RoutingStrategy::Priority,
        };
        assert!(all_disabled_config.validate().is_err());

        // API 密钥为空应该失败
        let empty_key_config = MultiProviderConfig {
            providers: vec![
                ProviderConfig {
                    provider_type: ProviderType::OpenAI,
                    enabled: true,
                    base_url: None,
                    api_key: "".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 30,
                    priority: 1,
                    weight: 1,
                },
            ],
            routing_strategy: RoutingStrategy::Priority,
        };
        assert!(empty_key_config.validate().is_err());

        // 超时为 0 应该失败
        let zero_timeout_config = MultiProviderConfig {
            providers: vec![
                ProviderConfig {
                    provider_type: ProviderType::OpenAI,
                    enabled: true,
                    base_url: None,
                    api_key: "key1".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 0,
                    priority: 1,
                    weight: 1,
                },
            ],
            routing_strategy: RoutingStrategy::Priority,
        };
        assert!(zero_timeout_config.validate().is_err());

        // 有效配置应该成功
        let valid_config = MultiProviderConfig {
            providers: vec![
                ProviderConfig {
                    provider_type: ProviderType::OpenAI,
                    enabled: true,
                    base_url: None,
                    api_key: "key1".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 30,
                    priority: 1,
                    weight: 1,
                },
            ],
            routing_strategy: RoutingStrategy::Priority,
        };
        assert!(valid_config.validate().is_ok());
    }

    #[test]
    fn test_serde_provider_type() {
        let json = r#""open_a_i""#;
        let provider_type: ProviderType = serde_json::from_str(json).unwrap();
        assert_eq!(provider_type, ProviderType::OpenAI);

        let serialized = serde_json::to_string(&provider_type).unwrap();
        assert_eq!(serialized, r#""open_a_i""#);
        
        // Test all provider types
        let json = r#""zhipu_g_l_m""#;
        let provider_type: ProviderType = serde_json::from_str(json).unwrap();
        assert_eq!(provider_type, ProviderType::ZhipuGLM);
        
        let json = r#""alibaba_bailian""#;
        let provider_type: ProviderType = serde_json::from_str(json).unwrap();
        assert_eq!(provider_type, ProviderType::AlibabaBailian);
        
        let json = r#""anthropic_claude""#;
        let provider_type: ProviderType = serde_json::from_str(json).unwrap();
        assert_eq!(provider_type, ProviderType::AnthropicClaude);
    }

    #[test]
    fn test_serde_routing_strategy() {
        let json = r#""priority""#;
        let strategy: RoutingStrategy = serde_json::from_str(json).unwrap();
        assert_eq!(strategy, RoutingStrategy::Priority);

        let json = r#""round_robin""#;
        let strategy: RoutingStrategy = serde_json::from_str(json).unwrap();
        assert_eq!(strategy, RoutingStrategy::RoundRobin);
    }
}
