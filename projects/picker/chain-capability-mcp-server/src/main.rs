use anyhow::Result;
use rust_agent::{SimpleMcpServer, McpServer};


mod config;
mod basic_blockchain_tools;
mod cross_chain_pay_tool;
mod create_erc20_token;
mod create_erc721_nft;

use config::{AppConfig, BlockchainConfig};
use basic_blockchain_tools::{CheckBalanceTool, TransferCoinTool};
use cross_chain_pay_tool::CrossChainPayTool;
use create_erc20_token::CreateERC20TokenTool;
use create_erc721_nft::CreateERC721NFTTool;

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();
    
    println!("Starting Chain Capability MCP Server...");
    
    // 读取配置
    let config = AppConfig::from_file().unwrap_or_else(|e| {
        eprintln!("Warning: Failed to load config file: {}, using default values", e);
        
        // 创建默认配置
        AppConfig {
            blockchain: config::BlockchainConfig {
                rpc_url: "https://sepolia.infura.io/v3/7cb673f9a1324974899fc4cd4429b450".to_string(),
                explorer_url: "https://sepolia.etherscan.io".to_string(),
                wallet_private: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80".to_string(), // 测试私钥
                token_usdt_url: "https://www.okx.com/api/v5/market/ticker?instId=ETH-USDT".to_string(),
                // cross chain pay
                usdt_contract_address: "0xd53e9530107a8d8856099d7d80126478d48e06dA".to_string(),
                meson_contract_address: "0x0d12d15b26a32e72A3330B2ac9016A22b1410CB6".to_string(),
                // call contract deploy erc20 and erc721
                erc20_factory_address: "0x9712C7792fF62373f4ddBeE53DBf9BeCB63D80dB".to_string(),
                erc721_factory_address: "0xDc49Fe683D54Ee2E37459b4615DebA8dbee3cB9A".to_string(),
                retry_times: 3,
                retry_interval_seconds: 5,
            }
        }
    });
    
    // 创建区块链配置
    let blockchain_config = BlockchainConfig {
        rpc_url: config.blockchain.rpc_url,
        explorer_url: config.blockchain.explorer_url,
        wallet_private: config.blockchain.wallet_private,
        token_usdt_url: config.blockchain.token_usdt_url,
        usdt_contract_address: config.blockchain.usdt_contract_address,
        meson_contract_address: config.blockchain.meson_contract_address,
        erc20_factory_address: config.blockchain.erc20_factory_address,
        erc721_factory_address: config.blockchain.erc721_factory_address,
        retry_times: config.blockchain.retry_times,
        retry_interval_seconds: config.blockchain.retry_interval_seconds,
    };
    
    // 创建MCP服务器
    let server = SimpleMcpServer::new();
    
    // 创建工具实例
    let check_balance_tool = CheckBalanceTool::new(blockchain_config.clone());
    let transfer_coin_tool = TransferCoinTool::new(blockchain_config.clone());
    let cross_chain_pay_tool = CrossChainPayTool::new(blockchain_config.clone());
    let create_erc20_token_tool = CreateERC20TokenTool::new(blockchain_config.clone());
    let create_erc721_nft_tool = CreateERC721NFTTool::new(blockchain_config);
    
    // 注册工具
    let _ = server.register_tool(std::sync::Arc::new(check_balance_tool));
    let _ = server.register_tool(std::sync::Arc::new(transfer_coin_tool));
    let _ = server.register_tool(std::sync::Arc::new(cross_chain_pay_tool));
    let _ = server.register_tool(std::sync::Arc::new(create_erc20_token_tool));
    let _ = server.register_tool(std::sync::Arc::new(create_erc721_nft_tool));
    
    // 启动服务器
    println!("Starting MCP server on http://127.0.0.1:6000");
    server.start("127.0.0.1:6000").await?;
    
    println!("MCP服务器已启动，地址: 127.0.0.1:6000");
    println!("已注册工具:");
    println!("  1. check_balance: 查询指定地址的ETH和USDT余额");
    println!("  2. transfer_coin: 转账ETH或USDT到指定地址");
    println!("  3. cross_chain_pay: 跨链支付USDT");
    println!("  4. create_erc20_token: 创建新的ERC20代币");
    println!("  5. create_erc721_nft: 创建新的ERC721 NFT集合");
    println!("服务器正在运行中，按 Ctrl+C 停止服务器");
    
    // 保持服务器持续运行
    // 这里我们使用 tokio::signal 来等待 Ctrl+C 信号
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .unwrap()
            .recv()
            .await;
    };
    
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            println!("收到 Ctrl+C 信号，正在停止服务器...");
        },
        _ = terminate => {
            println!("收到终止信号，正在停止服务器...");
        },
    }
    
    println!("MCP服务器已停止");
    
    Ok(())
}
