//! 部署 Agent
//! 
//! 负责生成部署脚本和配置，准备智能合约部署

use super::base::{Agent, AgentContext, AgentOutput, AgentResult, AgentError};
use super::contract_generator::GeneratedContract;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 部署 Agent
pub struct DeploymentAgent {
    config: DeploymentConfig,
}

/// 部署配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentConfig {
    /// 模型名称
    pub model_name: String,
    
    /// 目标网络
    pub target_networks: Vec<NetworkConfig>,
    
    /// 部署工具
    pub deployment_tool: DeploymentTool,
    
    /// 是否生成验证脚本
    pub generate_verification: bool,
    
    /// 是否生成监控配置
    pub generate_monitoring: bool,
}

/// 网络配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub name: String,
    pub chain_id: u64,
    pub rpc_url: String,
    pub explorer_url: String,
    pub gas_price_gwei: Option<u64>,
    pub is_testnet: bool,
}

/// 部署工具
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DeploymentTool {
    Foundry,
    Hardhat,
    Truffle,
    Remix,
}

/// 部署计划
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentPlan {
    pub contract_name: String,
    pub networks: Vec<NetworkDeployment>,
    pub deployment_scripts: HashMap<String, String>,
    pub verification_scripts: HashMap<String, String>,
    pub monitoring_config: Option<MonitoringConfig>,
    pub estimated_costs: HashMap<String, DeploymentCost>,
    pub deployment_checklist: Vec<ChecklistItem>,
}

/// 网络部署信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkDeployment {
    pub network_name: String,
    pub deployment_order: u32,
    pub constructor_args: Vec<ConstructorArg>,
    pub gas_settings: GasSettings,
    pub verification_required: bool,
}

/// 构造函数参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstructorArg {
    pub name: String,
    pub arg_type: String,
    pub value: String,
    pub description: String,
}

/// Gas设置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasSettings {
    pub gas_limit: Option<u64>,
    pub gas_price: Option<u64>,
    pub max_fee_per_gas: Option<u64>,
    pub max_priority_fee_per_gas: Option<u64>,
}

/// 监控配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    pub events_to_monitor: Vec<String>,
    pub alert_conditions: Vec<AlertCondition>,
    pub dashboard_config: DashboardConfig,
}

/// 告警条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertCondition {
    pub name: String,
    pub condition: String,
    pub severity: AlertSeverity,
    pub notification_channels: Vec<String>,
}

/// 告警严重程度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// 仪表板配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardConfig {
    pub metrics: Vec<String>,
    pub charts: Vec<ChartConfig>,
}

/// 图表配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartConfig {
    pub title: String,
    pub chart_type: String,
    pub data_source: String,
}

/// 部署成本
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentCost {
    pub estimated_gas: u64,
    pub gas_price_gwei: u64,
    pub cost_eth: f64,
    pub cost_usd: Option<f64>,
}

/// 检查清单项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecklistItem {
    pub task: String,
    pub description: String,
    pub priority: Priority,
    pub completed: bool,
}

/// 优先级
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

impl DeploymentAgent {
    pub fn new(config: DeploymentConfig) -> Self {
        Self { config }
    }
    
    /// 生成部署计划
    async fn generate_deployment_plan(
        &self,
        contract: &GeneratedContract,
    ) -> AgentResult<DeploymentPlan> {
        let contract_name = contract.name.clone();
        
        // 1. 生成网络部署配置
        let networks = self.generate_network_deployments(contract)?;
        
        // 2. 生成部署脚本
        let deployment_scripts = self.generate_deployment_scripts(contract, &networks)?;
        
        // 3. 生成验证脚本
        let verification_scripts = if self.config.generate_verification {
            self.generate_verification_scripts(contract, &networks)?
        } else {
            HashMap::new()
        };
        
        // 4. 生成监控配置
        let monitoring_config = if self.config.generate_monitoring {
            Some(self.generate_monitoring_config(contract)?)
        } else {
            None
        };
        
        // 5. 估算部署成本
        let estimated_costs = self.estimate_deployment_costs(contract, &networks)?;
        
        // 6. 生成检查清单
        let deployment_checklist = self.generate_deployment_checklist(contract)?;
        
        Ok(DeploymentPlan {
            contract_name,
            networks,
            deployment_scripts,
            verification_scripts,
            monitoring_config,
            estimated_costs,
            deployment_checklist,
        })
    }
    
    fn generate_network_deployments(
        &self,
        contract: &GeneratedContract,
    ) -> AgentResult<Vec<NetworkDeployment>> {
        let mut deployments = Vec::new();
        
        for (i, network) in self.config.target_networks.iter().enumerate() {
            let constructor_args = self.generate_constructor_args(contract, network)?;
            let gas_settings = self.generate_gas_settings(network);
            
            deployments.push(NetworkDeployment {
                network_name: network.name.clone(),
                deployment_order: i as u32 + 1,
                constructor_args,
                gas_settings,
                verification_required: !network.is_testnet,
            });
        }
        
        Ok(deployments)
    }
    
    fn generate_constructor_args(
        &self,
        contract: &GeneratedContract,
        _network: &NetworkConfig,
    ) -> AgentResult<Vec<ConstructorArg>> {
        let mut args = Vec::new();
        
        // 根据合约类型生成构造函数参数
        if contract.name.contains("Token") {
            args.push(ConstructorArg {
                name: "name".to_string(),
                arg_type: "string".to_string(),
                value: "\"EchokitBot Token\"".to_string(),
                description: "Token name".to_string(),
            });
            
            args.push(ConstructorArg {
                name: "symbol".to_string(),
                arg_type: "string".to_string(),
                value: "\"EKB\"".to_string(),
                description: "Token symbol".to_string(),
            });
            
            args.push(ConstructorArg {
                name: "initialSupply".to_string(),
                arg_type: "uint256".to_string(),
                value: "1000000000000000000000000".to_string(), // 1M tokens
                description: "Initial token supply".to_string(),
            });
        } else if contract.name.contains("NFT") {
            args.push(ConstructorArg {
                name: "name".to_string(),
                arg_type: "string".to_string(),
                value: "\"EchokitBot NFT\"".to_string(),
                description: "NFT collection name".to_string(),
            });
            
            args.push(ConstructorArg {
                name: "symbol".to_string(),
                arg_type: "string".to_string(),
                value: "\"EKNFT\"".to_string(),
                description: "NFT collection symbol".to_string(),
            });
        }
        
        Ok(args)
    }
    
    fn generate_gas_settings(&self, network: &NetworkConfig) -> GasSettings {
        GasSettings {
            gas_limit: Some(3000000), // 3M gas limit
            gas_price: network.gas_price_gwei.map(|price| price * 1_000_000_000), // Convert to wei
            max_fee_per_gas: network.gas_price_gwei.map(|price| price * 1_200_000_000), // 20% buffer
            max_priority_fee_per_gas: Some(2_000_000_000), // 2 gwei
        }
    }
    
    fn generate_deployment_scripts(
        &self,
        contract: &GeneratedContract,
        networks: &[NetworkDeployment],
    ) -> AgentResult<HashMap<String, String>> {
        let mut scripts = HashMap::new();
        
        match self.config.deployment_tool {
            DeploymentTool::Foundry => {
                scripts.extend(self.generate_foundry_scripts(contract, networks)?);
            }
            DeploymentTool::Hardhat => {
                scripts.extend(self.generate_hardhat_scripts(contract, networks)?);
            }
            _ => {
                return Err(AgentError::ConfigError("Unsupported deployment tool".to_string()));
            }
        }
        
        Ok(scripts)
    }
    
    fn generate_foundry_scripts(
        &self,
        contract: &GeneratedContract,
        networks: &[NetworkDeployment],
    ) -> AgentResult<HashMap<String, String>> {
        let mut scripts = HashMap::new();
        
        // 主部署脚本
        let deploy_script = format!(
            r#"// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {{Script}} from "forge-std/Script.sol";
import {{console}} from "forge-std/console.sol";
import "../src/{}.sol";

contract Deploy{} is Script {{
    function run() external {{
        vm.startBroadcast();
        
        {} deployed = new {}({});
        
        console.log("{} deployed to:", address(deployed));
        
        vm.stopBroadcast();
    }}
}}
"#,
            contract.name,
            contract.name,
            contract.name,
            contract.name,
            self.format_constructor_args(networks.get(0)),
            contract.name
        );
        
        scripts.insert("Deploy.s.sol".to_string(), deploy_script);
        
        // 网络特定脚本
        for network in networks {
            let network_script = format!(
                r#"#!/bin/bash
# Deploy to {} network

echo "Deploying {} to {}..."

forge script script/Deploy.s.sol \\
    --rpc-url ${}_RPC_URL \\
    --private-key $PRIVATE_KEY \\
    --broadcast \\
    --verify \\
    --etherscan-api-key $ETHERSCAN_API_KEY

echo "Deployment completed!"
"#,
                network.network_name,
                contract.name,
                network.network_name,
                network.network_name.to_uppercase()
            );
            
            scripts.insert(
                format!("deploy_{}.sh", network.network_name.to_lowercase()),
                network_script,
            );
        }
        
        Ok(scripts)
    }
    
    fn generate_hardhat_scripts(
        &self,
        contract: &GeneratedContract,
        networks: &[NetworkDeployment],
    ) -> AgentResult<HashMap<String, String>> {
        let mut scripts = HashMap::new();
        
        // 主部署脚本
        let deploy_script = format!(
            r#"const {{ ethers }} = require("hardhat");

async function main() {{
    console.log("Deploying {}...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance));
    
    const {} = await ethers.getContractFactory("{}");
    const contract = await {}.deploy({});
    
    await contract.deployed();
    
    console.log("{} deployed to:", contract.address);
    
    // Verify contract
    if (network.name !== "hardhat" && network.name !== "localhost") {{
        console.log("Waiting for block confirmations...");
        await contract.deployTransaction.wait(6);
        
        console.log("Verifying contract...");
        try {{
            await hre.run("verify:verify", {{
                address: contract.address,
                constructorArguments: [{}],
            }});
        }} catch (error) {{
            console.log("Verification failed:", error.message);
        }}
    }}
}}

main()
    .then(() => process.exit(0))
    .catch((error) => {{
        console.error(error);
        process.exit(1);
    }});
"#,
            contract.name,
            contract.name,
            contract.name,
            contract.name,
            self.format_constructor_args(networks.get(0)),
            contract.name,
            self.format_constructor_args(networks.get(0))
        );
        
        scripts.insert("deploy.js".to_string(), deploy_script);
        
        // Hardhat配置
        let hardhat_config = self.generate_hardhat_config(networks)?;
        scripts.insert("hardhat.config.js".to_string(), hardhat_config);
        
        Ok(scripts)
    }
    
    fn generate_hardhat_config(&self, networks: &[NetworkDeployment]) -> AgentResult<String> {
        let mut network_configs = Vec::new();
        
        for network_deployment in networks {
            if let Some(network) = self.config.target_networks.iter()
                .find(|n| n.name == network_deployment.network_name) {
                
                let config = format!(
                    r#"    {}: {{
      url: process.env.{}_RPC_URL || "{}",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: {},
      gasPrice: {},
    }}"#,
                    network.name.to_lowercase(),
                    network.name.to_uppercase(),
                    network.rpc_url,
                    network.chain_id,
                    network.gas_price_gwei.unwrap_or(20) * 1_000_000_000
                );
                
                network_configs.push(config);
            }
        }
        
        let config = format!(
            r#"require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

module.exports = {{
  solidity: {{
    version: "0.8.19",
    settings: {{
      optimizer: {{
        enabled: true,
        runs: 200,
      }},
    }},
  }},
  networks: {{
{}
  }},
  etherscan: {{
    apiKey: process.env.ETHERSCAN_API_KEY,
  }},
}};
"#,
            network_configs.join(",\n")
        );
        
        Ok(config)
    }
    
    fn generate_verification_scripts(
        &self,
        contract: &GeneratedContract,
        networks: &[NetworkDeployment],
    ) -> AgentResult<HashMap<String, String>> {
        let mut scripts = HashMap::new();
        
        for network in networks {
            if network.verification_required {
                let verify_script = format!(
                    r#"#!/bin/bash
# Verify {} on {}

echo "Verifying {} on {}..."

CONTRACT_ADDRESS=$1
if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "Usage: $0 <contract_address>"
    exit 1
fi

forge verify-contract \\
    --chain-id {} \\
    --num-of-optimizations 200 \\
    --watch \\
    --constructor-args $(cast abi-encode "constructor({})" {}) \\
    --etherscan-api-key $ETHERSCAN_API_KEY \\
    $CONTRACT_ADDRESS \\
    src/{}.sol:{}

echo "Verification completed!"
"#,
                    contract.name,
                    network.network_name,
                    contract.name,
                    network.network_name,
                    self.get_chain_id(&network.network_name),
                    self.format_constructor_types(&network.constructor_args),
                    self.format_constructor_values(&network.constructor_args),
                    contract.name,
                    contract.name
                );
                
                scripts.insert(
                    format!("verify_{}.sh", network.network_name.to_lowercase()),
                    verify_script,
                );
            }
        }
        
        Ok(scripts)
    }
    
    fn generate_monitoring_config(
        &self,
        contract: &GeneratedContract,
    ) -> AgentResult<MonitoringConfig> {
        let events_to_monitor = contract.events.iter()
            .map(|e| e.name.clone())
            .collect();
        
        let alert_conditions = vec![
            AlertCondition {
                name: "High Gas Usage".to_string(),
                condition: "gas_used > 1000000".to_string(),
                severity: AlertSeverity::Medium,
                notification_channels: vec!["email".to_string(), "slack".to_string()],
            },
            AlertCondition {
                name: "Failed Transaction".to_string(),
                condition: "transaction_status == 'failed'".to_string(),
                severity: AlertSeverity::High,
                notification_channels: vec!["email".to_string(), "slack".to_string(), "pagerduty".to_string()],
            },
        ];
        
        let dashboard_config = DashboardConfig {
            metrics: vec![
                "transaction_count".to_string(),
                "gas_usage".to_string(),
                "success_rate".to_string(),
                "active_users".to_string(),
            ],
            charts: vec![
                ChartConfig {
                    title: "Transaction Volume".to_string(),
                    chart_type: "line".to_string(),
                    data_source: "transaction_count".to_string(),
                },
                ChartConfig {
                    title: "Gas Usage".to_string(),
                    chart_type: "bar".to_string(),
                    data_source: "gas_usage".to_string(),
                },
            ],
        };
        
        Ok(MonitoringConfig {
            events_to_monitor,
            alert_conditions,
            dashboard_config,
        })
    }
    
    fn estimate_deployment_costs(
        &self,
        contract: &GeneratedContract,
        networks: &[NetworkDeployment],
    ) -> AgentResult<HashMap<String, DeploymentCost>> {
        let mut costs = HashMap::new();
        
        // 估算合约部署的Gas消耗
        let estimated_gas = self.estimate_deployment_gas(contract);
        
        for network_deployment in networks {
            if let Some(network) = self.config.target_networks.iter()
                .find(|n| n.name == network_deployment.network_name) {
                
                let gas_price_gwei = network.gas_price_gwei.unwrap_or(20);
                let cost_eth = (estimated_gas as f64 * gas_price_gwei as f64) / 1_000_000_000.0;
                
                costs.insert(network.name.clone(), DeploymentCost {
                    estimated_gas,
                    gas_price_gwei,
                    cost_eth,
                    cost_usd: None, // 需要实时价格API
                });
            }
        }
        
        Ok(costs)
    }
    
    fn estimate_deployment_gas(&self, contract: &GeneratedContract) -> u64 {
        // 基于代码复杂度估算Gas消耗
        let base_gas = 200_000u64;
        let per_function_gas = 50_000u64;
        let per_line_gas = 1_000u64;
        
        base_gas + 
        (contract.stats.function_count as u64 * per_function_gas) +
        (contract.stats.code_lines as u64 * per_line_gas)
    }
    
    fn generate_deployment_checklist(
        &self,
        _contract: &GeneratedContract,
    ) -> AgentResult<Vec<ChecklistItem>> {
        Ok(vec![
            ChecklistItem {
                task: "Code Review".to_string(),
                description: "Complete thorough code review".to_string(),
                priority: Priority::Critical,
                completed: false,
            },
            ChecklistItem {
                task: "Security Audit".to_string(),
                description: "Professional security audit completed".to_string(),
                priority: Priority::Critical,
                completed: false,
            },
            ChecklistItem {
                task: "Unit Tests".to_string(),
                description: "Comprehensive unit tests written and passing".to_string(),
                priority: Priority::High,
                completed: false,
            },
            ChecklistItem {
                task: "Integration Tests".to_string(),
                description: "Integration tests on testnet completed".to_string(),
                priority: Priority::High,
                completed: false,
            },
            ChecklistItem {
                task: "Gas Optimization".to_string(),
                description: "Gas usage optimized and verified".to_string(),
                priority: Priority::Medium,
                completed: false,
            },
            ChecklistItem {
                task: "Documentation".to_string(),
                description: "Complete documentation prepared".to_string(),
                priority: Priority::Medium,
                completed: false,
            },
            ChecklistItem {
                task: "Monitoring Setup".to_string(),
                description: "Monitoring and alerting configured".to_string(),
                priority: Priority::Medium,
                completed: false,
            },
        ])
    }
    
    // 辅助方法
    fn format_constructor_args(&self, network: Option<&NetworkDeployment>) -> String {
        if let Some(network) = network {
            network.constructor_args.iter()
                .map(|arg| arg.value.clone())
                .collect::<Vec<_>>()
                .join(", ")
        } else {
            String::new()
        }
    }
    
    fn format_constructor_types(&self, args: &[ConstructorArg]) -> String {
        args.iter()
            .map(|arg| arg.arg_type.clone())
            .collect::<Vec<_>>()
            .join(",")
    }
    
    fn format_constructor_values(&self, args: &[ConstructorArg]) -> String {
        args.iter()
            .map(|arg| arg.value.clone())
            .collect::<Vec<_>>()
            .join(" ")
    }
    
    fn get_chain_id(&self, network_name: &str) -> u64 {
        self.config.target_networks.iter()
            .find(|n| n.name == network_name)
            .map(|n| n.chain_id)
            .unwrap_or(1) // Default to mainnet
    }
    
    fn format_deployment_plan(&self, plan: &DeploymentPlan) -> AgentResult<String> {
        let mut output = String::new();
        
        output.push_str("# 🚀 Smart Contract Deployment Plan\n\n");
        
        // 基本信息
        output.push_str(&format!("**Contract**: {}\n", plan.contract_name));
        output.push_str(&format!("**Networks**: {}\n", plan.networks.len()));
        output.push_str(&format!("**Deployment Tool**: {:?}\n\n", self.config.deployment_tool));
        
        // 网络部署信息
        output.push_str("## 🌐 Network Deployments\n\n");
        for network in &plan.networks {
            output.push_str(&format!("### {} (Order: {})\n", network.network_name, network.deployment_order));
            output.push_str(&format!("- **Verification Required**: {}\n", network.verification_required));
            output.push_str(&format!("- **Gas Limit**: {:?}\n", network.gas_settings.gas_limit));
            
            if !network.constructor_args.is_empty() {
                output.push_str("- **Constructor Args**:\n");
                for arg in &network.constructor_args {
                    output.push_str(&format!("  - `{}` ({}): {} - {}\n", 
                        arg.name, arg.arg_type, arg.value, arg.description));
                }
            }
            output.push_str("\n");
        }
        
        // 估算成本
        output.push_str("## 💰 Estimated Deployment Costs\n\n");
        for (network, cost) in &plan.estimated_costs {
            output.push_str(&format!("### {}\n", network));
            output.push_str(&format!("- **Estimated Gas**: {:,}\n", cost.estimated_gas));
            output.push_str(&format!("- **Gas Price**: {} gwei\n", cost.gas_price_gwei));
            output.push_str(&format!("- **Cost**: {:.6} ETH\n", cost.cost_eth));
            if let Some(usd) = cost.cost_usd {
                output.push_str(&format!("- **Cost USD**: ${:.2}\n", usd));
            }
            output.push_str("\n");
        }
        
        // 检查清单
        output.push_str("## ✅ Deployment Checklist\n\n");
        for (i, item) in plan.deployment_checklist.iter().enumerate() {
            let status = if item.completed { "✅" } else { "⬜" };
            let priority = match item.priority {
                Priority::Critical => "🔴",
                Priority::High => "🟠",
                Priority::Medium => "🟡",
                Priority::Low => "🟢",
            };
            
            output.push_str(&format!("{}. {} {} {} **{}**\n", 
                i + 1, status, priority, item.task, item.description));
        }
        output.push_str("\n");
        
        // 生成的文件
        output.push_str("## 📁 Generated Files\n\n");
        output.push_str("### Deployment Scripts\n");
        for script_name in plan.deployment_scripts.keys() {
            output.push_str(&format!("- `{}`\n", script_name));
        }
        
        if !plan.verification_scripts.is_empty() {
            output.push_str("\n### Verification Scripts\n");
            for script_name in plan.verification_scripts.keys() {
                output.push_str(&format!("- `{}`\n", script_name));
            }
        }
        
        if plan.monitoring_config.is_some() {
            output.push_str("\n### Monitoring Configuration\n");
            output.push_str("- `monitoring_config.json`\n");
        }
        
        output.push_str("\n---\n");
        output.push_str("*Deployment plan generated by EchokitBot Deployment Agent*\n");
        
        Ok(output)
    }
}

#[async_trait]
impl Agent for DeploymentAgent {
    fn name(&self) -> &str {
        "Deployment"
    }
    
    fn description(&self) -> &str {
        "生成智能合约部署脚本、配置和监控设置"
    }
    
    fn specialties(&self) -> Vec<String> {
        vec![
            "部署脚本生成".to_string(),
            "网络配置".to_string(),
            "成本估算".to_string(),
            "监控配置".to_string(),
        ]
    }
    
    fn preferred_models(&self) -> Vec<String> {
        vec![
            "gpt-4".to_string(),
            "qwen".to_string(),
            "claude-3".to_string(),
        ]
    }
    
    async fn execute(&self, context: &AgentContext) -> AgentResult<AgentOutput> {
        // 从上下文中提取合约信息
        let contract = if let Some(contract_data) = context.context_data.get("contract") {
            serde_json::from_value::<GeneratedContract>(contract_data.clone())
                .map_err(|e| AgentError::ValidationError(format!("Invalid contract data: {}", e)))?
        } else {
            return Err(AgentError::ValidationError("Contract data not found".to_string()));
        };
        
        // 生成部署计划
        let plan = self.generate_deployment_plan(&contract).await?;
        
        // 格式化输出
        let content = self.format_deployment_plan(&plan)?;
        
        // 计算置信度
        let confidence = self.calculate_confidence(&plan);
        
        // 生成元数据
        let mut metadata = HashMap::new();
        metadata.insert("deployment_plan".to_string(), serde_json::to_value(&plan)?);
        
        // 建议下一步操作
        let next_actions = vec![
            "执行部署前检查".to_string(),
            "在测试网部署".to_string(),
            "验证合约".to_string(),
            "配置监控".to_string(),
        ];
        
        // 生成的文件列表
        let mut generated_files = vec!["deployment_plan.md".to_string()];
        generated_files.extend(plan.deployment_scripts.keys().cloned());
        generated_files.extend(plan.verification_scripts.keys().cloned());
        
        Ok(AgentOutput {
            content,
            metadata,
            confidence,
            next_actions,
            generated_files,
        })
    }
}

impl DeploymentAgent {
    fn calculate_confidence(&self, plan: &DeploymentPlan) -> f64 {
        let mut confidence = 0.85; // 基础置信度
        
        // 根据网络数量调整
        if plan.networks.len() > 1 {
            confidence += 0.05;
        }
        
        // 根据检查清单完成度调整
        let completed_items = plan.deployment_checklist.iter()
            .filter(|item| item.completed)
            .count();
        let completion_rate = completed_items as f64 / plan.deployment_checklist.len() as f64;
        confidence += completion_rate * 0.1;
        
        confidence.min(1.0).max(0.0)
    }
}

impl Default for DeploymentConfig {
    fn default() -> Self {
        Self {
            model_name: "gpt-4".to_string(),
            target_networks: vec![
                NetworkConfig {
                    name: "localhost".to_string(),
                    chain_id: 31337,
                    rpc_url: "http://localhost:8545".to_string(),
                    explorer_url: "".to_string(),
                    gas_price_gwei: Some(20),
                    is_testnet: true,
                },
            ],
            deployment_tool: DeploymentTool::Foundry,
            generate_verification: true,
            generate_monitoring: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agents::contract_generator::*;
    
    #[tokio::test]
    async fn test_generate_deployment_plan() {
        let config = DeploymentConfig::default();
        let agent = DeploymentAgent::new(config);
        
        let contract = GeneratedContract {
            code: "contract Test {}".to_string(),
            name: "TestContract".to_string(),
            constructor_params: Vec::new(),
            functions: Vec::new(),
            events: Vec::new(),
            imports: Vec::new(),
            stats: CodeStats {
                total_lines: 10,
                code_lines: 8,
                comment_lines: 2,
                function_count: 2,
                event_count: 1,
            },
        };
        
        let plan = agent.generate_deployment_plan(&contract).await.unwrap();
        
        assert_eq!(plan.contract_name, "TestContract");
        assert!(!plan.networks.is_empty());
        assert!(!plan.deployment_scripts.is_empty());
    }
}