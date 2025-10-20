use alloy::{
    primitives::{Address, B256, keccak256},
    providers::{Provider, ProviderBuilder},
    signers::local::PrivateKeySigner,
    sol,
};
use anyhow::{Context, Result};
use async_trait::async_trait;
use rust_agent::Tool;
use serde::Deserialize;
use std::str::FromStr;
use tracing::{error, info};

use super::config::BlockchainConfig;

// 定义 ERC721Factory 合约接口
sol!(
    #[sol(rpc)]
    contract ERC721Factory {
        function createCollection(string name, string symbol, string baseURI) external returns (address);
    }
);

// 定义 CustomERC721 合约接口
sol!(
    #[sol(rpc)]
    contract CustomERC721 {
        function mint(address to) external;
    }
);

pub struct CreateERC721NFTTool {
    config: BlockchainConfig,
}

impl CreateERC721NFTTool {
    pub fn new(config: BlockchainConfig) -> Self {
        Self { config }
    }
}

#[async_trait]
impl Tool for CreateERC721NFTTool {
    fn name(&self) -> &str {
        "create_erc721_nft"
    }

    fn description(&self) -> &str {
        "Create a new ERC721 NFT collection. The arguments should be wrapped in a 'parameters' object with the following fields: name (string), symbol (string), baseURI (string). Example: {\"parameters\": {\"name\": \"My NFT Collection\", \"symbol\": \"MNFT\", \"baseURI\": \"https://example.com/nft/\"}}"
    }

    fn invoke(
        &self,
        params: &str,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, anyhow::Error>> + Send>>
    {
        let config = self.config.clone();
        let params = params.to_string();

        Box::pin(async move {
            info!("create_erc721_nft invoked with params: {}", params);

            // 解析参数
            info!("Parsing params: {}", params);

            let args: CreateERC721NFTArgs = serde_json::from_str(&params)
                .context("Failed to parse create_erc721_nft arguments")?;

            // 解析私钥
            let signer: PrivateKeySigner = config.wallet_private.parse().map_err(|e| {
                error!("Invalid private key format: {}", e);
                anyhow::anyhow!("Invalid private key format: {}", e)
            })?;

            // 获取钱包地址
            let wallet_address = signer.address();

            // 创建provider
            let rpc_url = config.rpc_url.parse().map_err(|e| {
                error!("Invalid RPC URL: {}", e);
                anyhow::anyhow!("Invalid RPC URL: {}", e)
            })?;

            let provider = ProviderBuilder::new().wallet(signer).connect_http(rpc_url);

            // 解析ERC721Factory合约地址
            let factory_contract_address = Address::from_str(&config.erc721_factory_address)
                .context("Invalid ERC721Factory contract address format")?;

            info!(
                "Preparing to create ERC721 NFT collection: {} ({})",
                args.name, args.symbol
            );

            // 创建合约实例
            let contract = ERC721Factory::new(factory_contract_address, &provider);

            // 调用createCollection方法
            let pending_tx = contract
                .createCollection(
                    args.name.clone(),
                    args.symbol.clone(),
                    args.base_uri.clone(),
                )
                .send()
                .await
                .map_err(|e| {
                    error!("Failed to send createCollection transaction: {}", e);
                    anyhow::anyhow!("Failed to send createCollection transaction: {}", e)
                })?;

            // 等待交易确认
            let receipt = pending_tx.get_receipt().await.map_err(|e| {
                error!("Failed to get transaction receipt: {}", e);
                anyhow::anyhow!("Failed to get transaction receipt: {}", e)
            })?;

            // 打印完整的receipt信息用于调试
            info!("Transaction receipt: {:?}", receipt);
            info!("Receipt inner: {:?}", receipt.inner);
            info!("Receipt inner logs count: {}", receipt.inner.logs().len());

            // 打印每个日志的详细信息
            for (i, log) in receipt.inner.logs().iter().enumerate() {
                info!("Log {}: {:?}", i, log);
                info!("Log {} topics count: {}", i, log.topics().len());
                for (j, topic) in log.topics().iter().enumerate() {
                    info!("Log {} topic {}: {:?}", i, j, topic);
                }
                info!("Log {} data: {:?}", i, log.data());
            }

            // 检查交易是否成功
            if !receipt.status() {
                error!("Transaction failed");
                return Err(anyhow::anyhow!("Transaction failed"));
            }

            // 从事件日志中提取创建的NFT集合地址
            // CollectionCreated事件签名: CollectionCreated(address indexed creator, address indexed collection, string name, string symbol)
            let collection_address = {
                let collection_created_signature: B256 = alloy::primitives::keccak256(
                    "CollectionCreated(address,address,string,string)",
                )
                .into();
                let factory_contract_address = Address::from_str(&config.erc721_factory_address)
                    .context("Invalid ERC721Factory contract address format")?;

                // 遍历所有日志寻找CollectionCreated事件
                let mut found_collection_address: Option<Address> = None;
                for log in receipt.inner.logs() {
                    info!(
                        "Checking log from contract {:?} with {} topics",
                        log.address(),
                        log.topics().len()
                    );

                    // 检查是否是来自工厂合约的CollectionCreated事件
                    if log.address() == factory_contract_address && log.topics().len() >= 3 {
                        let event_signature = log.topics()[0];
                        info!("Event signature: {:?}", event_signature);

                        if event_signature == collection_created_signature {
                            // 第二个topic是indexed的collection地址参数（32字节）
                            let collection_address_topic = log.topics()[2];
                            info!(
                                "Found CollectionCreated event, collection address topic: {:?}",
                                collection_address_topic
                            );
                            // 使用Address::from_word将32字节topic转换为20字节地址
                            found_collection_address =
                                Some(Address::from_word(collection_address_topic));
                            break;
                        }
                    }
                }
                found_collection_address
            };

            // 如果成功创建了集合，则铸造一个NFT
            if let Some(address) = collection_address {
                info!("Collection created at address: {}", address);

                // 创建CustomERC721合约实例
                let erc721_contract = CustomERC721::new(address, &provider);

                // 调用mint函数，将NFT铸造到默认私钥的钱包地址
                info!("Minting NFT to wallet address: {}", wallet_address);
                let mint_pending_tx =
                    erc721_contract
                        .mint(wallet_address)
                        .send()
                        .await
                        .map_err(|e| {
                            error!("Failed to send mint transaction: {}", e);
                            anyhow::anyhow!("Failed to send mint transaction: {}", e)
                        })?;

                // 等待铸造交易确认
                let mint_receipt = mint_pending_tx.get_receipt().await.map_err(|e| {
                    error!("Failed to get mint transaction receipt: {}", e);
                    anyhow::anyhow!("Failed to get mint transaction receipt: {}", e)
                })?;

                // 检查铸造交易是否成功
                if !mint_receipt.status() {
                    error!("Mint transaction failed");
                    return Err(anyhow::anyhow!("Mint transaction failed"));
                }

                info!(
                    "Successfully minted NFT to wallet address: {}",
                    wallet_address
                );

                let explorer_url = format!("{}/address/{}", config.explorer_url, address);

                Ok(format!(
                    "Successfully created ERC721 NFT collection {} ({}) and minted NFT to wallet address: {}, View on explorer: {}",
                    args.name, args.symbol, wallet_address, explorer_url
                ))
            } else {
                let result = format!(
                    "Successfully created ERC721 NFT collection {} ({}), but failed to extract collection address from logs",
                    args.name, args.symbol
                );
                Ok(result)
            }
        })
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

#[derive(Debug, Deserialize)]
struct CreateERC721NFTArgs {
    name: String,
    symbol: String,
    #[serde(rename = "baseURI")]
    base_uri: String,
}
