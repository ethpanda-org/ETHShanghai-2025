//! 合约部署器
//! 
//! 提供智能合约部署功能，支持多网络部署

use crate::blockchain::networks::NetworkConfig;
use crate::error::{Result, AgentError};
use crate::types::{CompilationResult, DeploymentResult, DeploymentTaskConfig, VerificationStatus, GasConfig};
use alloy::primitives::{Address, U256, Bytes};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::rpc::types::TransactionReceipt;
use alloy::signers::local::PrivateKeySigner;
use alloy::network::EthereumWallet;
use alloy::hex;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use std::time::Duration;
use tracing::{debug, info, warn, error};

/// 部署器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeployerConfig {
    /// 私钥（用于签名交易）
    pub private_key: Option<String>,
    
    /// 默认 Gas 配置
    pub default_gas_config: GasConfig,
    
    /// 交易确认等待时间（秒）
    pub confirmation_timeout: u64,
    
    /// 需要的确认数
    pub required_confirmations: u64,
    
    /// 是否自动验证合约
    pub auto_verify: bool,
    
    /// 最大重试次数
    pub max_retries: u32,
}

impl Default for DeployerConfig {
    fn default() -> Self {
        Self {
            private_key: None,
            default_gas_config: GasConfig {
                gas_limit: Some(5_000_000),
                gas_price: None,
                max_fee_per_gas: None,
                max_priority_fee_per_gas: None,
            },
            confirmation_timeout: 300, // 5 分钟
            required_confirmations: 1,
            auto_verify: false,
            max_retries: 3,
        }
    }
}

/// 合约部署器
pub struct ContractDeployer {
    /// 配置
    config: DeployerConfig,
    
    /// 网络配置
    networks: Vec<NetworkConfig>,
    
    /// 部署统计
    stats: DeploymentStats,
}

/// 部署统计
#[derive(Debug, Clone, Default)]
pub struct DeploymentStats {
    /// 总部署次数
    total_deployments: u64,
    
    /// 成功次数
    successful_deployments: u64,
    
    /// 失败次数
    failed_deployments: u64,
    
    /// 总 Gas 消耗
    total_gas_used: u64,
    
    /// 总部署费用（wei）
    total_deployment_cost: u128,
}

impl DeploymentStats {
    pub fn get_total_deployments(&self) -> u64 {
        self.total_deployments
    }
    
    pub fn get_successful_deployments(&self) -> u64 {
        self.successful_deployments
    }
    
    pub fn get_failed_deployments(&self) -> u64 {
        self.failed_deployments
    }
    
    pub fn get_total_gas_used(&self) -> u64 {
        self.total_gas_used
    }
    
    pub fn get_total_deployment_cost(&self) -> u128 {
        self.total_deployment_cost
    }
}

impl ContractDeployer {
    /// 创建新的部署器
    pub fn new(config: DeployerConfig) -> Self {
        let networks = NetworkConfig::get_predefined_networks();
        
        Self {
            config,
            networks,
            stats: DeploymentStats::default(),
        }
    }
    
    /// 使用默认配置创建部署器
    pub fn with_defaults() -> Self {
        Self::new(DeployerConfig::default())
    }
    
    /// 部署合约
    /// 
    /// # 参数
    /// * `compilation_result` - 编译结果
    /// * `deployment_config` - 部署配置
    /// 
    /// # 返回
    /// 部署结果，包含合约地址和交易信息
    pub async fn deploy(
        &mut self,
        compilation_result: &CompilationResult,
        deployment_config: &DeploymentTaskConfig,
    ) -> Result<DeploymentResult> {
        info!("开始部署合约到网络: {}", deployment_config.network);
        let start_time = std::time::Instant::now();
        
        // 验证编译结果
        if !compilation_result.success {
            return Err(AgentError::DeploymentFailed("编译未成功，无法部署".to_string()));
        }
        
        let bytecode = compilation_result.bytecode.as_ref()
            .ok_or_else(|| AgentError::DeploymentFailed("缺少字节码".to_string()))?;
        
        // 获取网络配置
        let network = self.get_network_config(&deployment_config.network)?;
        
        // 执行部署
        let mut result = self.deploy_to_network(
            bytecode,
            &deployment_config.constructor_args,
            &network,
            deployment_config.gas_config.as_ref(),
        ).await;
        
        // 如果部署失败，尝试重试
        if result.is_err() && self.config.max_retries > 0 {
            for attempt in 1..=self.config.max_retries {
                warn!("部署失败，尝试重试 {}/{}", attempt, self.config.max_retries);
                
                tokio::time::sleep(Duration::from_secs(2 * attempt as u64)).await;
                
                result = self.deploy_to_network(
                    bytecode,
                    &deployment_config.constructor_args,
                    &network,
                    deployment_config.gas_config.as_ref(),
                ).await;
                
                if result.is_ok() {
                    info!("重试成功");
                    break;
                }
            }
        }
        
        let mut deployment_result = result?;
        
        // 验证合约（如果配置了）
        if deployment_config.verify_contract && self.config.auto_verify {
            info!("开始验证合约");
            deployment_result.verification_status = self.verify_contract(
                &deployment_result.contract_address.as_ref().unwrap(),
                &network,
                compilation_result,
            ).await?;
        }
        
        // 更新统计
        self.update_stats(&deployment_result);
        
        let elapsed = start_time.elapsed();
        info!("部署完成，耗时: {:?}", elapsed);
        
        Ok(deployment_result)
    }
    
    /// 部署到指定网络
    async fn deploy_to_network(
        &self,
        bytecode: &str,
        constructor_args: &[String],
        network: &NetworkConfig,
        gas_config: Option<&GasConfig>,
    ) -> Result<DeploymentResult> {
        debug!("部署到网络: {} (Chain ID: {})", network.name, network.chain_id);
        
        // 解析字节码
        let bytecode_bytes = self.parse_bytecode(bytecode)?;
        
        // 编码构造函数参数
        let encoded_args = self.encode_constructor_args(constructor_args)?;
        
        // 组合字节码和构造函数参数
        let deployment_data = [bytecode_bytes.as_slice(), encoded_args.as_slice()].concat();
        
        // 获取 Gas 配置
        let gas_config = gas_config.unwrap_or(&self.config.default_gas_config);
        
        // 模拟部署（实际实现需要真实的私钥和网络连接）
        // 这里返回模拟的部署结果
        let deployment_result = self.simulate_deployment(
            &deployment_data,
            network,
            gas_config,
        ).await?;
        
        Ok(deployment_result)
    }
    
    /// 解析字节码
    fn parse_bytecode(&self, bytecode: &str) -> Result<Vec<u8>> {
        let bytecode = bytecode.trim_start_matches("0x");
        
        hex::decode(bytecode)
            .map_err(|e| AgentError::DeploymentFailed(format!("解析字节码失败: {}", e)))
    }
    
    /// 编码构造函数参数
    fn encode_constructor_args(&self, args: &[String]) -> Result<Vec<u8>> {
        // 简化实现：实际应该使用 ABI 编码
        // 这里假设参数已经是编码后的十六进制字符串
        if args.is_empty() {
            return Ok(Vec::new());
        }
        
        let mut encoded = Vec::new();
        for arg in args {
            let arg_bytes = hex::decode(arg.trim_start_matches("0x"))
                .map_err(|e| AgentError::DeploymentFailed(format!("编码参数失败: {}", e)))?;
            encoded.extend_from_slice(&arg_bytes);
        }
        
        Ok(encoded)
    }
    
    /// 模拟部署（用于测试和演示）
    async fn simulate_deployment(
        &self,
        _deployment_data: &[u8],
        network: &NetworkConfig,
        gas_config: &GasConfig,
    ) -> Result<DeploymentResult> {
        debug!("模拟部署合约");
        
        // 模拟交易哈希和合约地址
        let tx_hash = format!("0x{}", hex::encode(&[0u8; 32]));
        let contract_address = format!("0x{}", hex::encode(&[1u8; 20]));
        
        // 模拟 Gas 消耗
        let gas_used = gas_config.gas_limit.unwrap_or(3_000_000);
        let gas_price = gas_config.gas_price.unwrap_or(20); // 20 gwei
        let deployment_cost = (gas_used as u128) * (gas_price as u128) * 1_000_000_000; // 转换为 wei
        
        Ok(DeploymentResult {
            success: true,
            deploy_time: Utc::now(),
            contract_address: Some(contract_address),
            transaction_hash: tx_hash,
            network: network.name.clone(),
            block_number: 12345678, // 模拟区块号
            gas_used,
            gas_price,
            deployment_cost: deployment_cost.to_string(),
            verification_status: VerificationStatus::NotVerified,
            error: None,
        })
    }
    
    /// 验证合约
    async fn verify_contract(
        &self,
        _contract_address: &str,
        network: &NetworkConfig,
        _compilation_result: &CompilationResult,
    ) -> Result<VerificationStatus> {
        debug!("验证合约: {}", _contract_address);
        
        // 检查是否有区块浏览器
        if network.explorer_url.is_none() {
            return Ok(VerificationStatus::Failed("网络没有配置区块浏览器".to_string()));
        }
        
        // 实际实现应该调用区块浏览器的 API 进行验证
        // 这里返回模拟结果
        Ok(VerificationStatus::Pending)
    }
    
    /// 获取网络配置
    fn get_network_config(&self, network_name: &str) -> Result<NetworkConfig> {
        self.networks
            .iter()
            .find(|n| n.name.eq_ignore_ascii_case(network_name))
            .cloned()
            .ok_or_else(|| AgentError::DeploymentFailed(format!("未找到网络配置: {}", network_name)))
    }
    
    /// 更新统计信息
    fn update_stats(&mut self, result: &DeploymentResult) {
        self.stats.total_deployments += 1;
        
        if result.success {
            self.stats.successful_deployments += 1;
            self.stats.total_gas_used += result.gas_used;
            
            if let Ok(cost) = result.deployment_cost.parse::<u128>() {
                self.stats.total_deployment_cost += cost;
            }
        } else {
            self.stats.failed_deployments += 1;
        }
    }
    
    /// 获取部署统计
    pub fn get_stats(&self) -> &DeploymentStats {
        &self.stats
    }
    
    /// 获取支持的网络列表
    pub fn get_supported_networks(&self) -> Vec<String> {
        self.networks.iter().map(|n| n.name.clone()).collect()
    }
    
    /// 估算部署成本
    pub fn estimate_deployment_cost(
        &self,
        gas_used: u64,
        gas_price_gwei: u64,
    ) -> String {
        let cost_wei = (gas_used as u128) * (gas_price_gwei as u128) * 1_000_000_000;
        let cost_eth = cost_wei as f64 / 1_000_000_000_000_000_000.0;
        
        format!("{} wei ({:.6} ETH)", cost_wei, cost_eth)
    }
    
    /// 生成部署报告
    pub fn generate_deployment_report(&self, result: &DeploymentResult) -> String {
        let mut report = String::new();
        
        report.push_str("=== 部署报告 ===\n\n");
        report.push_str(&format!("部署状态: {}\n", if result.success { "成功" } else { "失败" }));
        report.push_str(&format!("网络: {}\n", result.network));
        report.push_str(&format!("部署时间: {}\n", result.deploy_time));
        
        if let Some(ref address) = result.contract_address {
            report.push_str(&format!("合约地址: {}\n", address));
        }
        
        report.push_str(&format!("交易哈希: {}\n", result.transaction_hash));
        report.push_str(&format!("区块号: {}\n", result.block_number));
        report.push_str(&format!("Gas 使用: {} gas\n", result.gas_used));
        report.push_str(&format!("Gas 价格: {} gwei\n", result.gas_price));
        report.push_str(&format!("部署费用: {}\n", result.deployment_cost));
        
        match &result.verification_status {
            VerificationStatus::NotVerified => report.push_str("验证状态: 未验证\n"),
            VerificationStatus::Pending => report.push_str("验证状态: 验证中\n"),
            VerificationStatus::Verified => report.push_str("验证状态: 已验证\n"),
            VerificationStatus::Failed(msg) => report.push_str(&format!("验证状态: 失败 ({})\n", msg)),
        }
        
        if let Some(ref error) = result.error {
            report.push_str(&format!("\n错误信息: {}\n", error));
        }
        
        report.push_str(&format!("\n=== 统计信息 ===\n"));
        report.push_str(&format!("总部署次数: {}\n", self.stats.total_deployments));
        report.push_str(&format!("成功次数: {}\n", self.stats.successful_deployments));
        report.push_str(&format!("失败次数: {}\n", self.stats.failed_deployments));
        report.push_str(&format!("总 Gas 消耗: {} gas\n", self.stats.total_gas_used));
        report.push_str(&format!("总部署费用: {} wei\n", self.stats.total_deployment_cost));
        
        report
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deployer_creation() {
        let deployer = ContractDeployer::with_defaults();
        assert_eq!(deployer.stats.total_deployments, 0);
    }

    #[test]
    fn test_get_supported_networks() {
        let deployer = ContractDeployer::with_defaults();
        let networks = deployer.get_supported_networks();
        assert!(!networks.is_empty());
        assert!(networks.contains(&"Ethereum Mainnet".to_string()));
    }

    #[test]
    fn test_estimate_deployment_cost() {
        let deployer = ContractDeployer::with_defaults();
        let cost = deployer.estimate_deployment_cost(3_000_000, 20);
        assert!(cost.contains("wei"));
        assert!(cost.contains("ETH"));
    }

    #[test]
    fn test_parse_bytecode() {
        let deployer = ContractDeployer::with_defaults();
        let result = deployer.parse_bytecode("0x6080604052");
        assert!(result.is_ok());
    }
}