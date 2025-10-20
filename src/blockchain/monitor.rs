//! 部署监控模块
//! 
//! 提供实时部署进度跟踪、Gas 消耗监控和错误诊断

use crate::error::{Result, AgentError};
use crate::types::{DeploymentResult, GasConfig};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, RwLock};
use tokio::sync::broadcast;
use tracing::{debug, info, warn, error};

/// 监控事件类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MonitorEvent {
    /// 部署开始
    DeploymentStarted {
        deployment_id: String,
        network: String,
        timestamp: DateTime<Utc>,
    },
    
    /// 交易已提交
    TransactionSubmitted {
        deployment_id: String,
        tx_hash: String,
        timestamp: DateTime<Utc>,
    },
    
    /// 区块确认
    BlockConfirmation {
        deployment_id: String,
        confirmations: u64,
        required_confirmations: u64,
        timestamp: DateTime<Utc>,
    },
    
    /// Gas 消耗更新
    GasUpdate {
        deployment_id: String,
        gas_used: u64,
        gas_price: u64,
        cost: String,
        timestamp: DateTime<Utc>,
    },
    
    /// 部署成功
    DeploymentSucceeded {
        deployment_id: String,
        contract_address: String,
        timestamp: DateTime<Utc>,
    },
    
    /// 部署失败
    DeploymentFailed {
        deployment_id: String,
        error: String,
        timestamp: DateTime<Utc>,
    },
    
    /// 警告
    Warning {
        deployment_id: String,
        message: String,
        timestamp: DateTime<Utc>,
    },
}

/// Gas 监控数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasMonitorData {
    /// 当前 Gas 价格（gwei）
    pub current_gas_price: u64,
    
    /// 建议的 Gas 价格（gwei）
    pub suggested_gas_price: u64,
    
    /// 快速 Gas 价格（gwei）
    pub fast_gas_price: u64,
    
    /// 预估的部署成本（wei）
    pub estimated_cost: String,
    
    /// 实际 Gas 消耗
    pub actual_gas_used: Option<u64>,
    
    /// Gas 效率评分（0-100）
    pub efficiency_score: u8,
    
    /// 优化建议
    pub optimization_suggestions: Vec<String>,
}

/// 部署监控器
pub struct DeploymentMonitor {
    /// 事件广播器
    event_sender: broadcast::Sender<MonitorEvent>,
    
    /// 活跃的部署
    active_deployments: Arc<RwLock<HashMap<String, DeploymentMonitorState>>>,
    
    /// 事件历史
    event_history: Arc<RwLock<VecDeque<MonitorEvent>>>,
    
    /// 最大历史记录数
    max_history_size: usize,
    
    /// Gas 监控数据
    gas_monitor_data: Arc<RwLock<HashMap<String, GasMonitorData>>>,
}

/// 部署监控状态
#[derive(Debug, Clone)]
struct DeploymentMonitorState {
    /// 部署 ID
    deployment_id: String,
    
    /// 网络名称
    network: String,
    
    /// 开始时间
    start_time: DateTime<Utc>,
    
    /// 交易哈希
    tx_hash: Option<String>,
    
    /// 确认数
    confirmations: u64,
    
    /// 需要的确认数
    required_confirmations: u64,
    
    /// Gas 使用量
    gas_used: Option<u64>,
    
    /// Gas 价格
    gas_price: Option<u64>,
    
    /// 合约地址
    contract_address: Option<String>,
    
    /// 状态
    status: DeploymentMonitorStatus,
    
    /// 错误信息
    error: Option<String>,
}

/// 部署监控状态
#[derive(Debug, Clone, PartialEq, Eq)]
enum DeploymentMonitorStatus {
    Pending,
    Submitted,
    Confirming,
    Succeeded,
    Failed,
}

impl DeploymentMonitor {
    /// 创建新的部署监控器
    pub fn new(max_history_size: usize) -> Self {
        let (event_sender, _) = broadcast::channel(100);
        
        Self {
            event_sender,
            active_deployments: Arc::new(RwLock::new(HashMap::new())),
            event_history: Arc::new(RwLock::new(VecDeque::new())),
            max_history_size,
            gas_monitor_data: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// 使用默认配置创建监控器
    pub fn with_defaults() -> Self {
        Self::new(1000)
    }
    
    /// 订阅监控事件
    pub fn subscribe(&self) -> broadcast::Receiver<MonitorEvent> {
        self.event_sender.subscribe()
    }
    
    /// 开始监控部署
    pub fn start_monitoring(&self, deployment_id: String, network: String, required_confirmations: u64) -> Result<()> {
        info!("开始监控部署: {}", deployment_id);
        
        let state = DeploymentMonitorState {
            deployment_id: deployment_id.clone(),
            network: network.clone(),
            start_time: Utc::now(),
            tx_hash: None,
            confirmations: 0,
            required_confirmations,
            gas_used: None,
            gas_price: None,
            contract_address: None,
            status: DeploymentMonitorStatus::Pending,
            error: None,
        };
        
        self.active_deployments.write().unwrap().insert(deployment_id.clone(), state);
        
        let event = MonitorEvent::DeploymentStarted {
            deployment_id,
            network,
            timestamp: Utc::now(),
        };
        
        self.emit_event(event);
        
        Ok(())
    }
    
    /// 更新交易哈希
    pub fn update_transaction(&self, deployment_id: &str, tx_hash: String) -> Result<()> {
        debug!("更新交易哈希: {} -> {}", deployment_id, tx_hash);
        
        let mut deployments = self.active_deployments.write().unwrap();
        
        if let Some(state) = deployments.get_mut(deployment_id) {
            state.tx_hash = Some(tx_hash.clone());
            state.status = DeploymentMonitorStatus::Submitted;
            
            let event = MonitorEvent::TransactionSubmitted {
                deployment_id: deployment_id.to_string(),
                tx_hash,
                timestamp: Utc::now(),
            };
            
            drop(deployments);
            self.emit_event(event);
            
            Ok(())
        } else {
            Err(AgentError::DeploymentFailed(format!("未找到部署: {}", deployment_id)))
        }
    }
    
    /// 更新确认数
    pub fn update_confirmations(&self, deployment_id: &str, confirmations: u64) -> Result<()> {
        debug!("更新确认数: {} -> {}", deployment_id, confirmations);
        
        let mut deployments = self.active_deployments.write().unwrap();
        
        if let Some(state) = deployments.get_mut(deployment_id) {
            state.confirmations = confirmations;
            state.status = DeploymentMonitorStatus::Confirming;
            
            let event = MonitorEvent::BlockConfirmation {
                deployment_id: deployment_id.to_string(),
                confirmations,
                required_confirmations: state.required_confirmations,
                timestamp: Utc::now(),
            };
            
            drop(deployments);
            self.emit_event(event);
            
            Ok(())
        } else {
            Err(AgentError::DeploymentFailed(format!("未找到部署: {}", deployment_id)))
        }
    }
    
    /// 更新 Gas 信息
    pub fn update_gas(&self, deployment_id: &str, gas_used: u64, gas_price: u64) -> Result<()> {
        debug!("更新 Gas 信息: {} -> {} gas @ {} gwei", deployment_id, gas_used, gas_price);
        
        let mut deployments = self.active_deployments.write().unwrap();
        
        if let Some(state) = deployments.get_mut(deployment_id) {
            state.gas_used = Some(gas_used);
            state.gas_price = Some(gas_price);
            
            let cost = self.calculate_cost(gas_used, gas_price);
            
            let event = MonitorEvent::GasUpdate {
                deployment_id: deployment_id.to_string(),
                gas_used,
                gas_price,
                cost,
                timestamp: Utc::now(),
            };
            
            drop(deployments);
            self.emit_event(event);
            
            // 更新 Gas 监控数据
            self.update_gas_monitor_data(deployment_id, gas_used, gas_price)?;
            
            Ok(())
        } else {
            Err(AgentError::DeploymentFailed(format!("未找到部署: {}", deployment_id)))
        }
    }
    
    /// 标记部署成功
    pub fn mark_succeeded(&self, deployment_id: &str, contract_address: String) -> Result<()> {
        info!("部署成功: {} -> {}", deployment_id, contract_address);
        
        let mut deployments = self.active_deployments.write().unwrap();
        
        if let Some(state) = deployments.get_mut(deployment_id) {
            state.contract_address = Some(contract_address.clone());
            state.status = DeploymentMonitorStatus::Succeeded;
            
            let event = MonitorEvent::DeploymentSucceeded {
                deployment_id: deployment_id.to_string(),
                contract_address,
                timestamp: Utc::now(),
            };
            
            drop(deployments);
            self.emit_event(event);
            
            Ok(())
        } else {
            Err(AgentError::DeploymentFailed(format!("未找到部署: {}", deployment_id)))
        }
    }
    
    /// 标记部署失败
    pub fn mark_failed(&self, deployment_id: &str, error: String) -> Result<()> {
        error!("部署失败: {} -> {}", deployment_id, error);
        
        let mut deployments = self.active_deployments.write().unwrap();
        
        if let Some(state) = deployments.get_mut(deployment_id) {
            state.error = Some(error.clone());
            state.status = DeploymentMonitorStatus::Failed;
            
            let event = MonitorEvent::DeploymentFailed {
                deployment_id: deployment_id.to_string(),
                error,
                timestamp: Utc::now(),
            };
            
            drop(deployments);
            self.emit_event(event);
            
            Ok(())
        } else {
            Err(AgentError::DeploymentFailed(format!("未找到部署: {}", deployment_id)))
        }
    }
    
    /// 发出警告
    pub fn emit_warning(&self, deployment_id: &str, message: String) {
        warn!("部署警告: {} -> {}", deployment_id, message);
        
        let event = MonitorEvent::Warning {
            deployment_id: deployment_id.to_string(),
            message,
            timestamp: Utc::now(),
        };
        
        self.emit_event(event);
    }
    
    /// 发出事件
    fn emit_event(&self, event: MonitorEvent) {
        // 发送到订阅者
        let _ = self.event_sender.send(event.clone());
        
        // 添加到历史记录
        let mut history = self.event_history.write().unwrap();
        history.push_back(event);
        
        // 限制历史记录大小
        while history.len() > self.max_history_size {
            history.pop_front();
        }
    }
    
    /// 获取部署状态
    pub fn get_deployment_status(&self, deployment_id: &str) -> Option<String> {
        let deployments = self.active_deployments.read().unwrap();
        
        deployments.get(deployment_id).map(|state| {
            format!("{:?}", state.status)
        })
    }
    
    /// 获取所有活跃部署
    pub fn get_active_deployments(&self) -> Vec<String> {
        let deployments = self.active_deployments.read().unwrap();
        deployments.keys().cloned().collect()
    }
    
    /// 获取事件历史
    pub fn get_event_history(&self, limit: Option<usize>) -> Vec<MonitorEvent> {
        let history = self.event_history.read().unwrap();
        
        let limit = limit.unwrap_or(history.len());
        history.iter().rev().take(limit).cloned().collect()
    }
    
    /// 计算部署成本
    fn calculate_cost(&self, gas_used: u64, gas_price: u64) -> String {
        let cost_wei = (gas_used as u128) * (gas_price as u128) * 1_000_000_000;
        let cost_eth = cost_wei as f64 / 1_000_000_000_000_000_000.0;
        
        format!("{} wei ({:.6} ETH)", cost_wei, cost_eth)
    }
    
    /// 更新 Gas 监控数据
    fn update_gas_monitor_data(&self, deployment_id: &str, gas_used: u64, gas_price: u64) -> Result<()> {
        let mut gas_data = self.gas_monitor_data.write().unwrap();
        
        // 计算效率评分
        let efficiency_score = self.calculate_gas_efficiency(gas_used);
        
        // 生成优化建议
        let optimization_suggestions = self.generate_gas_optimization_suggestions(gas_used, gas_price);
        
        let data = GasMonitorData {
            current_gas_price: gas_price,
            suggested_gas_price: gas_price,
            fast_gas_price: gas_price + 5,
            estimated_cost: self.calculate_cost(gas_used, gas_price),
            actual_gas_used: Some(gas_used),
            efficiency_score,
            optimization_suggestions,
        };
        
        gas_data.insert(deployment_id.to_string(), data);
        
        Ok(())
    }
    
    /// 计算 Gas 效率评分
    fn calculate_gas_efficiency(&self, gas_used: u64) -> u8 {
        // 简单的评分算法
        // 实际应该基于合约类型和复杂度
        if gas_used < 1_000_000 {
            95
        } else if gas_used < 3_000_000 {
            80
        } else if gas_used < 5_000_000 {
            60
        } else {
            40
        }
    }
    
    /// 生成 Gas 优化建议
    fn generate_gas_optimization_suggestions(&self, gas_used: u64, gas_price: u64) -> Vec<String> {
        let mut suggestions = Vec::new();
        
        if gas_used > 5_000_000 {
            suggestions.push("合约 Gas 消耗较高，建议优化合约大小".to_string());
        }
        
        if gas_price > 50 {
            suggestions.push("当前 Gas 价格较高，建议等待网络拥堵缓解".to_string());
        }
        
        if gas_used > 3_000_000 {
            suggestions.push("考虑使用代理模式减少部署成本".to_string());
        }
        
        suggestions
    }
    
    /// 获取 Gas 监控数据
    pub fn get_gas_monitor_data(&self, deployment_id: &str) -> Option<GasMonitorData> {
        let gas_data = self.gas_monitor_data.read().unwrap();
        gas_data.get(deployment_id).cloned()
    }
    
    /// 清理已完成的部署
    pub fn cleanup_completed(&self) {
        let mut deployments = self.active_deployments.write().unwrap();
        
        deployments.retain(|_, state| {
            state.status != DeploymentMonitorStatus::Succeeded &&
            state.status != DeploymentMonitorStatus::Failed
        });
        
        info!("清理已完成的部署，剩余活跃部署: {}", deployments.len());
    }
    
    /// 生成监控报告
    pub fn generate_monitor_report(&self, deployment_id: &str) -> Result<String> {
        let deployments = self.active_deployments.read().unwrap();
        
        if let Some(state) = deployments.get(deployment_id) {
            let mut report = String::new();
            
            report.push_str("=== 部署监控报告 ===\n\n");
            report.push_str(&format!("部署 ID: {}\n", state.deployment_id));
            report.push_str(&format!("网络: {}\n", state.network));
            report.push_str(&format!("状态: {:?}\n", state.status));
            report.push_str(&format!("开始时间: {}\n", state.start_time));
            
            if let Some(ref tx_hash) = state.tx_hash {
                report.push_str(&format!("交易哈希: {}\n", tx_hash));
            }
            
            report.push_str(&format!("确认数: {}/{}\n", state.confirmations, state.required_confirmations));
            
            if let Some(gas_used) = state.gas_used {
                report.push_str(&format!("Gas 使用: {} gas\n", gas_used));
            }
            
            if let Some(gas_price) = state.gas_price {
                report.push_str(&format!("Gas 价格: {} gwei\n", gas_price));
            }
            
            if let Some(ref address) = state.contract_address {
                report.push_str(&format!("合约地址: {}\n", address));
            }
            
            if let Some(ref error) = state.error {
                report.push_str(&format!("错误: {}\n", error));
            }
            
            // 添加 Gas 监控数据
            if let Some(gas_data) = self.get_gas_monitor_data(deployment_id) {
                report.push_str(&format!("\n=== Gas 分析 ===\n"));
                report.push_str(&format!("效率评分: {}/100\n", gas_data.efficiency_score));
                report.push_str(&format!("预估成本: {}\n", gas_data.estimated_cost));
                
                if !gas_data.optimization_suggestions.is_empty() {
                    report.push_str(&format!("\n优化建议:\n"));
                    for (i, suggestion) in gas_data.optimization_suggestions.iter().enumerate() {
                        report.push_str(&format!("  {}. {}\n", i + 1, suggestion));
                    }
                }
            }
            
            Ok(report)
        } else {
            Err(AgentError::DeploymentFailed(format!("未找到部署: {}", deployment_id)))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_monitor_creation() {
        let monitor = DeploymentMonitor::with_defaults();
        assert_eq!(monitor.get_active_deployments().len(), 0);
    }

    #[test]
    fn test_start_monitoring() {
        let monitor = DeploymentMonitor::with_defaults();
        let result = monitor.start_monitoring("test-1".to_string(), "Localhost".to_string(), 1);
        assert!(result.is_ok());
        assert_eq!(monitor.get_active_deployments().len(), 1);
    }

    #[test]
    fn test_calculate_cost() {
        let monitor = DeploymentMonitor::with_defaults();
        let cost = monitor.calculate_cost(3_000_000, 20);
        assert!(cost.contains("wei"));
        assert!(cost.contains("ETH"));
    }

    #[test]
    fn test_gas_efficiency_score() {
        let monitor = DeploymentMonitor::with_defaults();
        assert_eq!(monitor.calculate_gas_efficiency(500_000), 95);
        assert_eq!(monitor.calculate_gas_efficiency(2_000_000), 80);
        assert_eq!(monitor.calculate_gas_efficiency(6_000_000), 40);
    }
}
