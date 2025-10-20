//! OpenAI-Compatible API Gateway
//! 
//! 独立的 API 服务器入口，提供统一的 OpenAI-compatible HTTP 接口

use ai_contract_generator::api::{
    create_router,
    providers::{MultiProviderConfig, ProviderRegistry},
};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::signal;
use tracing::{info, error};

/// 服务器配置
#[derive(Debug, Clone)]
struct ServerConfig {
    /// 监听地址
    host: String,
    /// 监听端口
    port: u16,
    /// 供应商配置文件路径
    config_path: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: std::env::var("API_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: std::env::var("API_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8080),
            config_path: std::env::var("PROVIDERS_CONFIG")
                .unwrap_or_else(|_| "providers.toml".to_string()),
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化日志
    init_logging();
    
    info!("Starting OpenAI-Compatible API Gateway");
    
    // 加载配置
    let server_config = ServerConfig::default();
    info!("Loading provider configuration from: {}", server_config.config_path);
    
    let provider_config = load_provider_config(&server_config.config_path)?;
    info!("Loaded {} provider(s)", provider_config.providers.len());
    
    // 创建供应商注册表
    let registry = Arc::new(ProviderRegistry::new(provider_config)?);
    info!(
        "Initialized provider registry with {} enabled provider(s)",
        registry.provider_count().await
    );
    
    // 创建路由器
    let app = create_router(registry.clone());
    
    // 绑定地址
    let addr = SocketAddr::from((
        server_config.host.parse::<std::net::IpAddr>()?,
        server_config.port,
    ));
    
    info!("API Gateway listening on {}", addr);
    info!("Health check endpoint: http://{}/health", addr);
    info!("OpenAI-compatible endpoints:");
    info!("  - POST http://{}/v1/chat/completions", addr);
    info!("  - POST http://{}/v1/embeddings", addr);
    info!("  - GET  http://{}/v1/models", addr);
    
    // 创建服务器
    let listener = tokio::net::TcpListener::bind(addr).await?;
    
    // 启动服务器，支持优雅关闭
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    
    info!("API Gateway shutdown complete");
    Ok(())
}

/// 初始化日志系统
fn init_logging() {
    use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
    
    let log_level = std::env::var("LOG_LEVEL")
        .unwrap_or_else(|_| "info".to_string());
    
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| {
            tracing_subscriber::EnvFilter::new(format!(
                "ai_contract_generator={},tower_http=debug",
                log_level
            ))
        });
    
    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer())
        .init();
}

/// 加载供应商配置
/// 
/// 从 TOML 文件加载配置，支持环境变量替换
fn load_provider_config(path: &str) -> Result<MultiProviderConfig, Box<dyn std::error::Error>> {
    use std::fs;
    
    // 读取配置文件
    let config_content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read config file '{}': {}", path, e))?;
    
    // 解析 TOML
    let config: MultiProviderConfig = toml::from_str(&config_content)
        .map_err(|e| format!("Failed to parse config file '{}': {}", path, e))?;
    
    // 验证配置
    config.validate()
        .map_err(|e| format!("Invalid configuration: {}", e))?;
    
    Ok(config)
}

/// 优雅关闭信号处理
/// 
/// 监听 SIGTERM 和 SIGINT 信号，触发优雅关闭
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            info!("Received Ctrl+C signal, initiating graceful shutdown");
        },
        _ = terminate => {
            info!("Received SIGTERM signal, initiating graceful shutdown");
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_server_config_default() {
        let config = ServerConfig::default();
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 8080);
    }

    #[test]
    fn test_server_config_from_env() {
        std::env::set_var("API_HOST", "127.0.0.1");
        std::env::set_var("API_PORT", "9000");
        
        let config = ServerConfig::default();
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 9000);
        
        std::env::remove_var("API_HOST");
        std::env::remove_var("API_PORT");
    }

    #[test]
    fn test_load_provider_config_valid() {
        let config_content = r#"
routing_strategy = "priority"

[[providers]]
type = "open_a_i"
enabled = true
api_key = "test-key"
priority = 1
"#;
        
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(config_content.as_bytes()).unwrap();
        temp_file.flush().unwrap();
        
        let result = load_provider_config(temp_file.path().to_str().unwrap());
        assert!(result.is_ok());
        
        let config = result.unwrap();
        assert_eq!(config.providers.len(), 1);
    }

    #[test]
    fn test_load_provider_config_invalid_toml() {
        let config_content = "invalid toml content {{{";
        
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(config_content.as_bytes()).unwrap();
        temp_file.flush().unwrap();
        
        let result = load_provider_config(temp_file.path().to_str().unwrap());
        assert!(result.is_err());
    }

    #[test]
    fn test_load_provider_config_invalid_config() {
        let config_content = r#"
routing_strategy = "priority"

[[providers]]
type = "open_a_i"
enabled = true
api_key = ""
priority = 1
"#;
        
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(config_content.as_bytes()).unwrap();
        temp_file.flush().unwrap();
        
        let result = load_provider_config(temp_file.path().to_str().unwrap());
        assert!(result.is_err());
    }

    #[test]
    fn test_load_provider_config_file_not_found() {
        let result = load_provider_config("/nonexistent/path/config.toml");
        assert!(result.is_err());
    }
}
