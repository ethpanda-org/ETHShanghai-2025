use serde::Deserialize;
use std::path::Path;
use config::{Config, ConfigError, File, Environment};
use dirs::config_dir;
use log::info;

#[derive(Debug, Clone, Deserialize)]
pub struct BlockchainConfig {
    pub rpc_url: String,
    pub explorer_url: String,
    pub wallet_private: String,
    pub token_usdt_url: String,
    pub usdt_contract_address: String,
    pub meson_contract_address: String,
    pub erc20_factory_address: String,
    pub erc721_factory_address: String,
    #[serde(default = "default_retry_times")]
    pub retry_times: u32,
    #[serde(default = "default_retry_interval_seconds")]
    pub retry_interval_seconds: i8,
}

fn default_retry_times() -> u32 {
    3
}

fn default_retry_interval_seconds() -> i8 {
    5
}

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub blockchain: BlockchainConfig,
}

impl AppConfig {
    pub fn from_file() -> Result<Self, ConfigError> {
        // Get the config directory
        let config_dir = config_dir()
            .ok_or_else(|| ConfigError::NotFound("Configuration directory not found".to_string()))?
            .join(".picker-desktop");
        
        let config_file = config_dir.join("config.toml");
        
        // Also check for config in the current directory
        let local_config = Path::new("config.toml");

        let mut builder = Config::builder();

        // Check if config file exists in the standard config directory
        if config_file.exists() {
            info!("Loading config from: {:?}", config_file);
            builder = builder.add_source(File::from(config_file));
        } 
        // Check if config file exists in the current directory
        else if local_config.exists() {
            info!("Loading config from: {:?}", local_config);
            builder = builder.add_source(File::from(local_config.to_path_buf()));
        } 
        else {
            info!("Config file not found, will use default values");
            // Set default values for blockchain config
            builder = builder
                .set_default("blockchain.rpc_url", "https://sepolia.infura.io/v3/7cb673f9a1324974899fc4cd4429b450")?
                .set_default("blockchain.explorer_url", "https://sepolia.etherscan.io")?
                .set_default("blockchain.wallet_private", "")?
                .set_default("blockchain.token_usdt_url", "https://www.okx.com/api/v5/market/ticker?instId=ETH-USDT")?
                .set_default("blockchain.usdt_contract_address", "0xd53e9530107a8d8856099d7d80126478d48e06dA")?
                .set_default("blockchain.meson_contract_address", "0x0d12d15b26a32e72A3330B2ac9016A22b1410CB6")?
                .set_default("blockchain.erc20_factory_address", "0x9712C7792fF62373f4ddBeE53DBf9BeCB63D80dB")?
                .set_default("blockchain.erc721_factory_address", "0xDc49Fe683D54Ee2E37459b4615DebA8dbee3cB9A")?
                .set_default("blockchain.retry_times", 3)?
                .set_default("blockchain.retry_interval_seconds", 5)?;
        }

        // 添加环境变量源
        builder = builder.add_source(Environment::with_prefix("PICKER"));

        let config = builder.build()?.try_deserialize();
        config
    }
}