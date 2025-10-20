use alloy::{
    primitives::{Address, FixedBytes},
    providers::{Provider, ProviderBuilder},
    rpc::types::TransactionReceipt,
    signers::local::PrivateKeySigner,
};
use async_trait::async_trait;
use anyhow::{Context, Result};
use rust_agent::Tool;
use serde::Deserialize;
use std::str::FromStr;
use tracing::{info, error};

use super::config::BlockchainConfig;

pub struct CheckBalanceTool {
    config: BlockchainConfig,
}

impl CheckBalanceTool {
    pub fn new(config: BlockchainConfig) -> Self {
        Self { config }
    }
}

#[async_trait]
impl Tool for CheckBalanceTool {
    fn name(&self) -> &str {
        "check_balance"
    }

    fn description(&self) -> &str {
        "Check the balance of a wallet address on the blockchain. The parameter request body you should extract is: '{\"parameters\": {\"wallet_address\": \"<wallet_address>\"}}'"
    }

    fn invoke(&self, params: &str) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, anyhow::Error>> + Send>> {
        let config = self.config.clone();
        let params = params.to_string();
        Box::pin(async move {
            info!("Checking balance for address: {}", params);
            
            // 解析参数
            let args: CheckBalanceArgs = serde_json::from_str(&params)
                .context("Failed to parse check_balance arguments")?;

            // 解析钱包地址
            let wallet_address = Address::from_str(&args.wallet_address)
                .context("Invalid wallet address format")?;

            // 创建provider
            let rpc_url = config.rpc_url.parse()
                .map_err(|e| {
                    error!("Invalid RPC URL: {}", e);
                    anyhow::anyhow!("Invalid RPC URL: {}", e)
                })?;
                
            let provider = ProviderBuilder::new()
                .connect_http(rpc_url);

            // 获取余额
            let balance = provider.get_balance(wallet_address).await
                .map_err(|e| {
                    error!("Failed to get balance: {}", e);
                    anyhow::anyhow!("Failed to get balance: {}", e)
                })?;
            
            // 格式化余额（wei转为ether）
            let balance_eth = alloy::primitives::utils::format_ether(balance);
            
            info!("Wallet {} has balance: {} ETH", args.wallet_address, balance_eth);
            Ok(format!("Wallet {} has balance: {} ETH", args.wallet_address, balance_eth))
        })
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

#[derive(Deserialize)]
struct CheckBalanceArgs {
    wallet_address: String,
}

pub struct TransferCoinTool {
    config: BlockchainConfig,
}

impl TransferCoinTool {
    pub fn new(config: BlockchainConfig) -> Self {
        Self { config }
    }
}

#[async_trait]
impl Tool for TransferCoinTool {
    fn name(&self) -> &str {
        "transfer_coin"
    }

    fn description(&self) -> &str {
        "Transfer coins from the default wallet to another on the blockchain. The parameter request body you should extract is: '{\"parameters\": {\"to_address\": \"<to_address>\", \"amount\": \"<amount>\"}}'"
    }

    fn invoke(&self, params: &str) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, anyhow::Error>> + Send>> {
        let config = self.config.clone();
        let params = params.to_string();
        Box::pin(async move {
            info!("Transferring coins with params: {}", params);
            
            // 解析参数
            let args: TransferCoinArgs = serde_json::from_str(&params)
                .context("Failed to parse transfer_coin arguments")?;

            // 解析私钥
            let signer: PrivateKeySigner = config.wallet_private.parse()
                .map_err(|e| {
                    error!("Invalid private key format: {}", e);
                    anyhow::anyhow!("Invalid private key format: {}", e)
                })?;
            let from_address = signer.address();

            // 解析目标地址
            let to_address = Address::from_str(&args.to_address)
                .context("Invalid destination wallet address format")?;

            // 创建provider
            let rpc_url = config.rpc_url.parse()
                .map_err(|e| {
                    error!("Invalid RPC URL: {}", e);
                    anyhow::anyhow!("Invalid RPC URL: {}", e)
                })?;
                
            let provider = ProviderBuilder::new()
                .wallet(signer)  // 使用wallet方法添加签名者
                .connect_http(rpc_url);

            // 解析转账金额（ether转为wei）
            let amount_wei = alloy::primitives::utils::parse_ether(&args.amount)
                .context("Invalid amount format")?;

            // 构建交易请求
            let tx_request = alloy::rpc::types::TransactionRequest {
                from: Some(from_address),
                to: Some(to_address.into()),
                value: Some(amount_wei),
                gas: Some(21000),
                max_fee_per_gas: Some(20_000_000_000), // 20 Gwei
                max_priority_fee_per_gas: Some(1_000_000_000), // 1 Gwei
                ..Default::default()
            };

            // 发送交易
            info!("Sending transaction from {} to {} with amount {} ETH", from_address, to_address, args.amount);
            let pending_tx = provider.send_transaction(tx_request).await
                .map_err(|e| {
                    error!("Failed to send transaction: {}", e);
                    anyhow::anyhow!("Failed to send transaction: {}", e)
                })?;

            // 获取交易哈希
            let tx_hash = *pending_tx.tx_hash();
            info!("Transaction sent with hash: {:?}", tx_hash);

            // 等待交易确认
            let receipt = pending_tx.watch().await
                .map_err(|e| {
                    error!("Failed to watch transaction: {}", e);
                    anyhow::anyhow!("Failed to watch transaction: {}", e)
                })?;
                
            info!("Transaction confirmed: {:?}", receipt);

            // 生成浏览器链接
            let explorer_url = format!("{}/tx/0x{}", config.explorer_url, hex::encode(tx_hash));

            Ok(format!("Successfully transferred {} ETH from {} to {}. Transaction hash: 0x{}. View on explorer: {}", 
                       args.amount, from_address, args.to_address, hex::encode(tx_hash), explorer_url))
        })
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

#[derive(Deserialize)]
struct TransferCoinArgs {
    to_address: String,
    amount: String,
}
