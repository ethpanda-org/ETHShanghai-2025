// 配置管理模块

use serde::Deserialize;
use std::env;
use dirs;
// 使用 config 库相关导入
use config::{Config, Environment, File as ConfigFile};

#[derive(Debug, Deserialize, Default, Clone)]
pub struct AppConfig {
    pub api_base_url: String,
    pub request_timeout_ms: u64,
    pub max_retries: u32,
    pub ai_api_url: String,
    pub ai_api_key: String,
    pub ai_model: String,
}

#[derive(Debug, thiserror::Error)]
pub enum AppConfigError {
    #[error("Configuration error: {0}")]
    ConfigLibError(#[from] config::ConfigError),
    
    #[error("Configuration directory not found")]
    ConfigDirNotFound,
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

impl AppConfig {
    pub fn load() -> Result<Self, AppConfigError> {
        // 检查是否处于测试模式，如果是，直接返回默认配置
        if env::var("TEST_MODE").is_ok() {
            return Ok(Self::default());
        }
        
        let config_dir = dirs::config_dir()
            .ok_or_else(|| AppConfigError::ConfigDirNotFound)?
            .join(".picker-desktop");
        
        // 确保配置目录存在
        std::fs::create_dir_all(&config_dir)?;
        
        let config_file = config_dir.join("config.toml");
        
        // 创建配置构建器
        let builder = Config::builder()
            // 添加默认值
            .set_default("api_base_url", "https://picker-api.openpick.org")?
            .set_default("request_timeout_ms", 30000)?
            .set_default("max_retries", 3)?
            .set_default("ai_api_url", "https://api.openai.com/v1")?
            .set_default("ai_api_key", "sk-00000000000000000000000000000000")?
            .set_default("ai_model", "gpt-3.5-turbo")?
            // 添加配置文件（如果存在）
            .add_source(ConfigFile::from(config_file).required(false))
            // 添加环境变量
            .add_source(Environment::with_prefix("API").separator("_"));
        
        // 构建配置
        let config = builder.build()?;
        
        // 解析配置到结构体
        Ok(AppConfig {
            api_base_url: config.get_string("api_base_url").unwrap_or_else(|_| "https://picker-api.openpick.org".to_string()),
            request_timeout_ms: config.get_int("request_timeout_ms").ok().map(|v| v as u64).unwrap_or(30000),
            max_retries: config.get_int("max_retries").ok().map(|v| v as u32).unwrap_or(3),
            ai_api_url: config.get_string("ai_api_url").unwrap_or_else(|_| "https://api.openai.com/v1".to_string()),
            ai_api_key: config.get_string("ai_api_key").unwrap_or_else(|_| "sk-00000000000000000000000000000000".to_string()),
            ai_model: config.get_string("ai_model").unwrap_or_else(|_| "gpt-3.5-turbo".to_string()),
        })
    }
    
    // 获取默认配置
    pub fn default() -> Self {
        Self {
            api_base_url: "https://picker-api.openpick.org".to_string(),
            request_timeout_ms: 30000,
            max_retries: 3,
            ai_api_url: "https://api.openai.com/v1".to_string(),
            ai_api_key: "sk-00000000000000000000000000000000".to_string(),
            ai_model: "gpt-3.5-turbo".to_string(),
        }
    }

    pub fn save(&self) -> Result<(), AppConfigError> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| AppConfigError::ConfigDirNotFound)?
            .join(".picker-desktop");
        
        // 确保配置目录存在
        std::fs::create_dir_all(&config_dir)?;
        
        let config_file = config_dir.join("config.toml");
        
        // 创建TOML格式的内容
        let content = format!(
            "api_base_url = \"{}\"\nrequest_timeout_ms = {}\nmax_retries = {}\nai_api_url = \"{}\"\nai_api_key = \"{}\"\nai_model = \"{}\"\n",
            self.api_base_url,
            self.request_timeout_ms,
            self.max_retries,
            self.ai_api_url,
            self.ai_api_key,
            self.ai_model
        );
        
        // 写入文件
        std::fs::write(&config_file, content)?;
        
        Ok(())
    }
    
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::fs::File;
    use std::io::Write;
    use tempfile::TempDir;
    
    // 测试从环境变量加载配置
    #[test]
    fn test_load_config_from_env() {
        // 设置环境变量
        env::set_var("API_API_BASE_URL", "http://test-api.example.com");
        env::set_var("API_REQUEST_TIMEOUT_MS", "5000");
        env::set_var("API_MAX_RETRIES", "2");
        
        // 加载配置
        let config = AppConfig::load().unwrap();
        
        // 验证配置
        assert_eq!(config.api_base_url, "http://test-api.example.com");
        assert_eq!(config.request_timeout_ms, 5000);
        assert_eq!(config.max_retries, 2);
        
        // 清理环境变量
        env::remove_var("API_API_BASE_URL");
        env::remove_var("API_REQUEST_TIMEOUT_MS");
        env::remove_var("API_MAX_RETRIES");
    }
    
    // 测试从配置文件加载配置
    #[test]
    fn test_load_config_from_file() {
        // 创建临时目录模拟配置目录
        let temp_dir = TempDir::new().unwrap();
        let config_file = temp_dir.path().join("config.toml");
        
        // 创建测试配置文件
        let mut file = File::create(&config_file).unwrap();
        let config_content = r#"
api_base_url = "http://config-file.example.com"
request_timeout_ms = 10000
max_retries = 4
"#;
        file.write_all(config_content.as_bytes()).unwrap();
        
        // 直接测试配置解析逻辑
        let config = Config::builder()
            .add_source(ConfigFile::from(config_file))
            .build()
            .unwrap();
        
        let app_config = AppConfig {
            api_base_url: config.get_string("api_base_url").unwrap(),
            request_timeout_ms: config.get_int("request_timeout_ms").unwrap() as u64,
            max_retries: config.get_int("max_retries").unwrap() as u32,
            ai_api_url: "https://api.openai.com/v1".to_string(),
            ai_api_key: "sk-00000000000000000000000000000000".to_string(),
            ai_model: "gpt-3.5-turbo".to_string(),
        };
        assert_eq!(app_config.api_base_url, "http://config-file.example.com");
        assert_eq!(app_config.request_timeout_ms, 10000);
        assert_eq!(app_config.max_retries, 4);
    }
    
    // 测试默认配置
    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        
        assert_eq!(config.api_base_url, "https://picker-api.openpick.org");
        assert_eq!(config.request_timeout_ms, 30000);
        assert_eq!(config.max_retries, 3);
    }
    
    // 测试测试模式
    #[test]
    fn test_test_mode() {
        env::set_var("TEST_MODE", "true");
        
        let config = AppConfig::load().unwrap();
        
        // 应该返回默认配置
        assert_eq!(config.api_base_url, "https://picker-api.openpick.org");
        assert_eq!(config.request_timeout_ms, 30000);
        assert_eq!(config.max_retries, 3);
        
        env::remove_var("TEST_MODE");
    }
}