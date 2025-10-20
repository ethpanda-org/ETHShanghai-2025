use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub trading: TradingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingConfig {
    pub default_exchange: String,
    pub max_concurrent_strategies: u32,
    pub order_timeout_seconds: u64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 8080,
            },
            trading: TradingConfig {
                default_exchange: "uniswap".to_string(),
                max_concurrent_strategies: 10,
                order_timeout_seconds: 300,
            },
        }
    }
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let mut config = Self::default();
        
        // 从环境变量读取服务器配置
        if let Ok(host) = std::env::var("SERVER_HOST") {
            config.server.host = host;
        }
        
        if let Ok(port_str) = std::env::var("SERVER_PORT") {
            config.server.port = port_str.parse().unwrap_or(8080);
        }
        
        Ok(config)
    }
}