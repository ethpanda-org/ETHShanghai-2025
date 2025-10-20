use alloy::{
    primitives::{Address, U256, keccak256, B256},
    providers::{Provider, ProviderBuilder},
    signers::local::PrivateKeySigner,
    sol,
};
use async_trait::async_trait;
use anyhow::{Context, Result};
use rust_agent::Tool;
use serde::Deserialize;
use std::str::FromStr;
use tracing::{info, error};

use super::config::BlockchainConfig;

// 定义 ERC20Factory 合约接口
sol!(
    #[sol(rpc)]
    contract ERC20Factory {
        function createERC20(string name, string symbol, uint8 decimals, uint256 initialSupply, address initialHolder) external returns (address);
    }
);

pub struct CreateERC20TokenTool {
    config: BlockchainConfig,
}

impl CreateERC20TokenTool {
    pub fn new(config: BlockchainConfig) -> Self {
        Self { config }
    }
}

#[async_trait]
impl Tool for CreateERC20TokenTool {
    fn name(&self) -> &str {
        "create_erc20_token"
    }

    fn description(&self) -> &str {
        "Create a new ERC20 token using the ERC20Factory contract. The parameter key values you should extract should strictly follow the request body: '{\"parameters\": {\"name\": \"<token_name>\", \"symbol\": \"<token_symbol>\", \"decimals\": <decimals>, \"initial_supply\": \"<initial_supply>\", \"initial_holder\": \"<holder_address>\"}}'. The strict key value of the parameter is 'name, symbol, decimals, initial_supply, initial_holder'."
    }

    fn invoke(&self, params: &str) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, anyhow::Error>> + Send>> {
        let config = self.config.clone();
        let params = params.to_string();
        
        Box::pin(async move {
            info!("Creating ERC20 token with params: {}", params);
            
            // 解析参数
            let args: CreateERC20TokenArgs = serde_json::from_str(&params)
                .context("Failed to parse create_erc20_token arguments")?;

            // 解析地址
            let initial_holder = Address::from_str(&args.initial_holder)
                .context("Invalid initial holder address format")?;

            // 解析私钥
            let signer: PrivateKeySigner = config.wallet_private.parse()
                .map_err(|e| {
                    error!("Invalid private key format: {}", e);
                    anyhow::anyhow!("Invalid private key format: {}", e)
                })?;
            
            // 创建provider
            let rpc_url = config.rpc_url.parse()
                .map_err(|e| {
                    error!("Invalid RPC URL: {}", e);
                    anyhow::anyhow!("Invalid RPC URL: {}", e)
                })?;
                
            let provider = ProviderBuilder::new()
                .wallet(signer)
                .connect_http(rpc_url);

            // 解析ERC20Factory合约地址
            let factory_contract_address = Address::from_str(&config.erc20_factory_address)
                .context("Invalid ERC20Factory contract address format")?;

            // 解析初始供应量
            let initial_supply = U256::from_str(&args.initial_supply)
                .context("Invalid initial supply format")? * U256::from(10).pow(U256::from(args.decimals));

            info!("Preparing to create ERC20 token: {} ({}) with initial supply: {}", args.name, args.symbol, args.initial_supply);
            
            // 创建合约实例
            let contract = ERC20Factory::new(factory_contract_address, provider);

            // 调用createERC20方法
            let pending_tx = contract
                .createERC20(
                    args.name.clone(),
                    args.symbol.clone(),
                    args.decimals,
                    initial_supply,
                    initial_holder,
                )
                .send()
                .await
                .map_err(|e| {
                    error!("Failed to send createERC20 transaction: {}", e);
                    anyhow::anyhow!("Failed to send createERC20 transaction: {}", e)
                })?;

            // 等待交易确认
            let receipt = pending_tx.get_receipt().await
                .map_err(|e| {
                    error!("Failed to get transaction receipt: {}", e);
                    anyhow::anyhow!("Failed to get transaction receipt: {}", e)
                })?;

            // 打印完整的receipt信息用于调试
            info!("Transaction receipt: {:?}", receipt);
            info!("Receipt inner: {:?}", receipt.inner);
            info!("Receipt inner logs count: {}", receipt.inner.logs().len());
            
            // // 打印每个日志的详细信息
            // for (i, log) in receipt.inner.logs().iter().enumerate() {
            //     info!("Log {}: {:?}", i, log);
            //     info!("Log {} topics count: {}", i, log.topics().len());
            //     for (j, topic) in log.topics().iter().enumerate() {
            //         info!("Log {} topic {}: {:?}", i, j, topic);
            //     }
            //     info!("Log {} data: {:?}", i, log.data());
            // }

            // 检查交易是否成功
            if !receipt.status() {
                error!("Transaction failed");
                return Err(anyhow::anyhow!("Transaction failed"));
            }

            // 从事件日志中提取创建的代币地址
            // TokenCreated事件签名: TokenCreated(address indexed tokenAddress, string name, string symbol)
            let token_address = {
                let token_created_signature: B256 = alloy::primitives::keccak256("TokenCreated(address,string,string)").into();
                let factory_contract_address = Address::from_str(&config.erc20_factory_address)
                    .context("Invalid ERC20Factory contract address format")?;
                
                // 遍历所有日志寻找TokenCreated事件
                let mut found_token_address: Option<Address> = None;
                for log in receipt.inner.logs() {
                    info!("Checking log from contract {:?} with {} topics", log.address(), log.topics().len());
                    
                    // 检查是否是来自工厂合约的TokenCreated事件
                    if log.address() == factory_contract_address && log.topics().len() >= 2 {
                        let event_signature = log.topics()[0];
                        info!("Event signature: {:?}", event_signature);
                        
                        if event_signature == token_created_signature {
                            // 第二个topic是indexed的tokenAddress参数（32字节）
                            let token_address_topic = log.topics()[1];
                            info!("Found TokenCreated event, token address topic: {:?}", token_address_topic);
                            // 使用Address::from_word将32字节topic转换为20字节地址
                            found_token_address = Some(Address::from_word(token_address_topic));
                            break;
                        }
                    }
                }
                found_token_address
            };

            // 构建响应
            let result = if let Some(address) = token_address {
                let explorer_url = format!("{}/address/{}", config.explorer_url, address);
                format!("Successfully created ERC20 token {} ({}) and View on explorer:: {}", args.name, args.symbol, explorer_url)
            } else {
                format!("Successfully created ERC20 token {} ({}), but failed to extract token address from logs", args.name, args.symbol)
            };

            // info!("{}", result);
            // // 构建响应
            // let result = if let Some(address) = token_address {
            //     format!("Successfully created ERC20 token {} ({}) with address: {}", args.name, args.symbol, address)
            // } else {
            //     format!("Successfully created ERC20 token {} ({}), but failed to extract token address from logs", args.name, args.symbol)
            // };

            // info!("{}", result);
            
            // // 返回包含receipt详细信息的JSON响应
            // let response = serde_json::json!({
            //     "message": result,
            //     "receipt": {
            //         "transaction_hash": format!("{:?}", receipt.transaction_hash),
            //         "transaction_index": receipt.transaction_index,
            //         "block_hash": format!("{:?}", receipt.block_hash),
            //         "block_number": receipt.block_number,
            //         "gas_used": format!("{:?}", receipt.gas_used),
            //         "effective_gas_price": format!("{:?}", receipt.effective_gas_price),
            //         "status": receipt.status(),
            //         "logs": receipt.inner.logs().iter().map(|log| {
            //             serde_json::json!({
            //                 "address": format!("{:?}", log.address()),
            //                 "topics": log.topics().iter().map(|topic| format!("{:?}", topic)).collect::<Vec<_>>(),
            //                 "data": format!("{:?}", log.data())
            //             })
            //         }).collect::<Vec<_>>()
            //     },
            //     "token_address": token_address.map(|addr| format!("{:?}", addr))
            // });
            
            // Ok(serde_json::to_string(&result)?)
            Ok(result)
        })
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

#[derive(Deserialize)]
struct CreateERC20TokenArgs {
    name: String,
    symbol: String,
    decimals: u8,
    initial_supply: String, // 使用字符串以支持大数值
    initial_holder: String,
}