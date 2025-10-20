//! 网络配置
//! 
//! 预定义的区块链网络配置

use serde::{Deserialize, Serialize};

/// 网络配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub name: String,
    pub rpc_url: String,
    pub chain_id: u64,
    pub explorer_url: Option<String>,
    pub is_testnet: bool,
}

impl NetworkConfig {
    /// 获取预定义的网络配置
    pub fn get_predefined_networks() -> Vec<NetworkConfig> {
        vec![
            NetworkConfig {
                name: "Localhost".to_string(),
                rpc_url: "http://localhost:8545".to_string(),
                chain_id: 31337,
                explorer_url: None,
                is_testnet: true,
            },
            NetworkConfig {
                name: "Ethereum Mainnet".to_string(),
                rpc_url: "https://eth.llamarpc.com".to_string(),
                chain_id: 1,
                explorer_url: Some("https://etherscan.io".to_string()),
                is_testnet: false,
            },
            NetworkConfig {
                name: "Sepolia".to_string(),
                rpc_url: "https://rpc.sepolia.org".to_string(),
                chain_id: 11155111,
                explorer_url: Some("https://sepolia.etherscan.io".to_string()),
                is_testnet: true,
            },
            NetworkConfig {
                name: "Arbitrum One".to_string(),
                rpc_url: "https://arb1.arbitrum.io/rpc".to_string(),
                chain_id: 42161,
                explorer_url: Some("https://arbiscan.io".to_string()),
                is_testnet: false,
            },
            NetworkConfig {
                name: "Optimism".to_string(),
                rpc_url: "https://mainnet.optimism.io".to_string(),
                chain_id: 10,
                explorer_url: Some("https://optimistic.etherscan.io".to_string()),
                is_testnet: false,
            },
            NetworkConfig {
                name: "Base".to_string(),
                rpc_url: "https://mainnet.base.org".to_string(),
                chain_id: 8453,
                explorer_url: Some("https://basescan.org".to_string()),
                is_testnet: false,
            },
            NetworkConfig {
                name: "Polygon".to_string(),
                rpc_url: "https://polygon-rpc.com".to_string(),
                chain_id: 137,
                explorer_url: Some("https://polygonscan.com".to_string()),
                is_testnet: false,
            },
        ]
    }
}