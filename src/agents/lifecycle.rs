//! Agent 生命周期管理
//! 
//! 负责管理 Agent 的启动、停止、重启、健康检查和配置更新

use crate::error::{AiContractError, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{RwLock, Mutex};
use tokio::time::interval;
use tracing::{info, warn, error, debug};
use uuid::Uuid;

/// Agent 状态
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentState {
    /// 未初始化
    Uninitialized,
    /// 正在启动
    Starting,
    /// 运行中
    Running,
    /// 暂停中
    Paused,
    /// 正在停止
    Stopping,
    /// 已停止
    Stopped,
    /// 错误状态
    Error(String),
    /// 正在重启
    Restarting,
}

/// Agent 类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AgentType {
    /// 需求解析 Agent
    RequirementsParser,
    /// 合约生成 Agent
    ContractGenerator,
    /// 安全审计 Agent
    SecurityAuditor,
    /// 编译 Agent
    Compiler,
    /// 部署 Agent
    Deployment,
}

impl std::fmt::Display for AgentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentType::RequirementsParser => write!(f, "RequirementsParser"),
            AgentType::ContractGenerator => write!(f, "ContractGenerator"),
            AgentType::SecurityAuditor => write!(f, "SecurityAuditor"),
            AgentType::Compiler => write!(f, "Compiler"),
            AgentType::Deployment => write!(f, "Deployment"),
        }
    }
}

/// Agent 健康状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentHealth {
    /// Agent ID
    pub agent_id: Uuid,
    /// Agent 类型
    pub agent_type: AgentType,
    /// 当前状态
    pub state: AgentState,
    /// 是否健康
    pub is_healthy: bool,
    /// 最后健康检查时间
    pub last_health_check: chrono::DateTime<chrono::Utc>,
    /// 启动时间
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    /// 运行时长（秒）
    pub uptime_seconds: Option<f64>,
    /// 处理的任务数
    pub tasks_processed: u64,
    /// 失败的任务数
    pub tasks_failed: u64,
    /// 平均响应时间（毫秒）
    pub avg_response_time_ms: Option<f64>,
    /// 错误信息
    pub error_message: Option<String>,
    /// 资源使用情况
    pub resource_usage: ResourceUsage,
}

/// 资源使用情况
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUsage {
    /// CPU 使用率（百分比）
    pub cpu_percent: Option<f64>,
    /// 内存使用（字节）
    pub memory_bytes: Option<u64>,
    /// 活跃连接数
    pub active_connections: u32,
}

/// Agent 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// Agent 类型
    pub agent_type: AgentType,
    /// 是否启用
    pub enabled: bool,
    /// 健康检查间隔（秒）
    pub health_check_interval_secs: u64,
    /// 最大重试次数
    pub max_retries: u32,
    /// 重启延迟（秒）
    pub restart_delay_secs: u64,
    /// 超时时间（秒）
    pub timeout_secs: u64,
    /// 自定义配置
    pub custom_config: HashMap<String, String>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            agent_type: AgentType::RequirementsParser,
            enabled: true,
            health_check_interval_secs: 30,
            max_retries: 3,
            restart_delay_secs: 5,
            timeout_secs: 300,
            custom_config: HashMap::new(),
        }
    }
}

/// Agent 实例
pub struct AgentInstance {
    /// Agent ID
    pub id: Uuid,
    /// Agent 类型
    pub agent_type: AgentType,
    /// 当前状态
    state: Arc<RwLock<AgentState>>,
    /// 配置
    config: Arc<RwLock<AgentConfig>>,
    /// 启动时间
    started_at: Arc<RwLock<Option<Instant>>>,
    /// 统计信息
    stats: Arc<RwLock<AgentStats>>,
    /// 健康检查任务句柄
    health_check_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
}

/// Agent 统计信息
#[derive(Debug, Clone, Default)]
struct AgentStats {
    /// 处理的任务数
    tasks_processed: u64,
    /// 失败的任务数
    tasks_failed: u64,
    /// 响应时间列表（用于计算平均值）
    response_times: Vec<Duration>,
    /// 最大响应时间列表大小
    max_response_times: usize,
}

impl AgentStats {
    fn new() -> Self {
        Self {
            tasks_processed: 0,
            tasks_failed: 0,
            response_times: Vec::new(),
            max_response_times: 100, // 保留最近 100 次响应时间
        }
    }
    
    fn record_task_success(&mut self, response_time: Duration) {
        self.tasks_processed += 1;
        self.response_times.push(response_time);
        
        // 保持响应时间列表大小
        if self.response_times.len() > self.max_response_times {
            self.response_times.remove(0);
        }
    }
    
    fn record_task_failure(&mut self) {
        self.tasks_failed += 1;
    }
    
    fn avg_response_time(&self) -> Option<Duration> {
        if self.response_times.is_empty() {
            None
        } else {
            let total: Duration = self.response_times.iter().sum();
            Some(total / self.response_times.len() as u32)
        }
    }
}

impl AgentInstance {
    /// 创建新的 Agent 实例
    pub fn new(agent_type: AgentType, config: AgentConfig) -> Self {
        let id = Uuid::new_v4();
        info!("创建 Agent 实例: {} ({})", agent_type, id);
        
        Self {
            id,
            agent_type,
            state: Arc::new(RwLock::new(AgentState::Uninitialized)),
            config: Arc::new(RwLock::new(config)),
            started_at: Arc::new(RwLock::new(None)),
            stats: Arc::new(RwLock::new(AgentStats::new())),
            health_check_handle: Arc::new(Mutex::new(None)),
        }
    }
    
    /// 启动 Agent
    pub async fn start(&self) -> Result<()> {
        let mut state = self.state.write().await;
        
        match *state {
            AgentState::Running => {
                warn!("Agent {} 已经在运行中", self.id);
                return Ok(());
            }
            AgentState::Starting => {
                warn!("Agent {} 正在启动中", self.id);
                return Ok(());
            }
            _ => {}
        }
        
        info!("启动 Agent: {} ({})", self.agent_type, self.id);
        *state = AgentState::Starting;
        drop(state);
        
        // 执行启动逻辑
        match self.do_start().await {
            Ok(()) => {
                let mut state = self.state.write().await;
                *state = AgentState::Running;
                
                let mut started_at = self.started_at.write().await;
                *started_at = Some(Instant::now());
                
                info!("Agent {} 启动成功", self.id);
                
                // 启动健康检查
                self.start_health_check().await;
                
                Ok(())
            }
            Err(e) => {
                let mut state = self.state.write().await;
                *state = AgentState::Error(e.to_string());
                error!("Agent {} 启动失败: {}", self.id, e);
                Err(e)
            }
        }
    }
    
    /// 执行启动逻辑
    async fn do_start(&self) -> Result<()> {
        // 这里可以添加具体的启动逻辑
        // 例如：初始化连接、加载资源等
        
        debug!("执行 Agent {} 启动逻辑", self.id);
        
        // 模拟启动延迟
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        Ok(())
    }
    
    /// 停止 Agent
    pub async fn stop(&self) -> Result<()> {
        let mut state = self.state.write().await;
        
        match *state {
            AgentState::Stopped => {
                warn!("Agent {} 已经停止", self.id);
                return Ok(());
            }
            AgentState::Stopping => {
                warn!("Agent {} 正在停止中", self.id);
                return Ok(());
            }
            _ => {}
        }
        
        info!("停止 Agent: {} ({})", self.agent_type, self.id);
        *state = AgentState::Stopping;
        drop(state);
        
        // 停止健康检查
        self.stop_health_check().await;
        
        // 执行停止逻辑
        match self.do_stop().await {
            Ok(()) => {
                let mut state = self.state.write().await;
                *state = AgentState::Stopped;
                
                let mut started_at = self.started_at.write().await;
                *started_at = None;
                
                info!("Agent {} 停止成功", self.id);
                Ok(())
            }
            Err(e) => {
                let mut state = self.state.write().await;
                *state = AgentState::Error(e.to_string());
                error!("Agent {} 停止失败: {}", self.id, e);
                Err(e)
            }
        }
    }
    
    /// 执行停止逻辑
    async fn do_stop(&self) -> Result<()> {
        debug!("执行 Agent {} 停止逻辑", self.id);
        
        // 这里可以添加具体的停止逻辑
        // 例如：关闭连接、释放资源等
        
        // 模拟停止延迟
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        Ok(())
    }
    
    /// 重启 Agent
    pub async fn restart(&self) -> Result<()> {
        info!("重启 Agent: {} ({})", self.agent_type, self.id);
        
        let mut state = self.state.write().await;
        *state = AgentState::Restarting;
        drop(state);
        
        // 停止 Agent
        self.stop().await?;
        
        // 等待重启延迟
        let config = self.config.read().await;
        let restart_delay = Duration::from_secs(config.restart_delay_secs);
        drop(config);
        
        tokio::time::sleep(restart_delay).await;
        
        // 启动 Agent
        self.start().await?;
        
        info!("Agent {} 重启成功", self.id);
        Ok(())
    }
    
    /// 暂停 Agent
    pub async fn pause(&self) -> Result<()> {
        let mut state = self.state.write().await;
        
        if *state != AgentState::Running {
            return Err(AiContractError::internal_error(
                format!("Agent {} 不在运行状态，无法暂停", self.id)
            ));
        }
        
        info!("暂停 Agent: {} ({})", self.agent_type, self.id);
        *state = AgentState::Paused;
        
        Ok(())
    }
    
    /// 恢复 Agent
    pub async fn resume(&self) -> Result<()> {
        let mut state = self.state.write().await;
        
        if *state != AgentState::Paused {
            return Err(AiContractError::internal_error(
                format!("Agent {} 不在暂停状态，无法恢复", self.id)
            ));
        }
        
        info!("恢复 Agent: {} ({})", self.agent_type, self.id);
        *state = AgentState::Running;
        
        Ok(())
    }
    
    /// 获取当前状态
    pub async fn get_state(&self) -> AgentState {
        let state = self.state.read().await;
        state.clone()
    }
    
    /// 更新配置
    pub async fn update_config(&self, new_config: AgentConfig) -> Result<()> {
        info!("更新 Agent {} 配置", self.id);
        
        let mut config = self.config.write().await;
        *config = new_config;
        
        debug!("Agent {} 配置已更新", self.id);
        Ok(())
    }
    
    /// 获取配置
    pub async fn get_config(&self) -> AgentConfig {
        let config = self.config.read().await;
        config.clone()
    }
    
    /// 执行健康检查
    pub async fn health_check(&self) -> AgentHealth {
        let state = self.state.read().await;
        let stats = self.stats.read().await;
        let started_at_instant = self.started_at.read().await;
        
        let is_healthy = matches!(*state, AgentState::Running | AgentState::Paused);
        
        let (started_at, uptime_seconds) = if let Some(instant) = *started_at_instant {
            let started = chrono::Utc::now() - chrono::Duration::from_std(instant.elapsed()).unwrap();
            let uptime = instant.elapsed().as_secs_f64();
            (Some(started), Some(uptime))
        } else {
            (None, None)
        };
        
        let avg_response_time_ms = stats.avg_response_time()
            .map(|d| d.as_secs_f64() * 1000.0);
        
        let error_message = if let AgentState::Error(ref msg) = *state {
            Some(msg.clone())
        } else {
            None
        };
        
        AgentHealth {
            agent_id: self.id,
            agent_type: self.agent_type,
            state: state.clone(),
            is_healthy,
            last_health_check: chrono::Utc::now(),
            started_at,
            uptime_seconds,
            tasks_processed: stats.tasks_processed,
            tasks_failed: stats.tasks_failed,
            avg_response_time_ms,
            error_message,
            resource_usage: ResourceUsage {
                cpu_percent: None, // 可以集成系统监控工具获取
                memory_bytes: None,
                active_connections: 0,
            },
        }
    }
    
    /// 启动健康检查任务
    async fn start_health_check(&self) {
        let config = self.config.read().await;
        let interval_secs = config.health_check_interval_secs;
        drop(config);
        
        let agent_id = self.id;
        let agent_type = self.agent_type;
        let state = Arc::clone(&self.state);
        
        let handle = tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(interval_secs));
            
            loop {
                interval.tick().await;
                
                let current_state = state.read().await;
                if !matches!(*current_state, AgentState::Running | AgentState::Paused) {
                    debug!("Agent {} 健康检查任务退出", agent_id);
                    break;
                }
                drop(current_state);
                
                debug!("执行 Agent {} ({}) 健康检查", agent_type, agent_id);
                
                // 这里可以添加具体的健康检查逻辑
                // 例如：检查连接状态、资源使用等
            }
        });
        
        let mut health_check_handle = self.health_check_handle.lock().await;
        *health_check_handle = Some(handle);
    }
    
    /// 停止健康检查任务
    async fn stop_health_check(&self) {
        let mut health_check_handle = self.health_check_handle.lock().await;
        
        if let Some(handle) = health_check_handle.take() {
            handle.abort();
            debug!("Agent {} 健康检查任务已停止", self.id);
        }
    }
    
    /// 记录任务成功
    pub async fn record_task_success(&self, response_time: Duration) {
        let mut stats = self.stats.write().await;
        stats.record_task_success(response_time);
    }
    
    /// 记录任务失败
    pub async fn record_task_failure(&self) {
        let mut stats = self.stats.write().await;
        stats.record_task_failure();
    }
}

/// Agent 生命周期管理器
pub struct AgentLifecycleManager {
    /// Agent 实例映射
    agents: Arc<RwLock<HashMap<Uuid, Arc<AgentInstance>>>>,
    /// Agent 类型到实例的映射
    agents_by_type: Arc<RwLock<HashMap<AgentType, Vec<Uuid>>>>,
}

impl AgentLifecycleManager {
    /// 创建新的生命周期管理器
    pub fn new() -> Self {
        info!("创建 Agent 生命周期管理器");
        
        Self {
            agents: Arc::new(RwLock::new(HashMap::new())),
            agents_by_type: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// 注册 Agent
    pub async fn register_agent(&self, agent_type: AgentType, config: AgentConfig) -> Result<Uuid> {
        let agent = Arc::new(AgentInstance::new(agent_type, config));
        let agent_id = agent.id;
        
        // 添加到映射
        {
            let mut agents = self.agents.write().await;
            agents.insert(agent_id, Arc::clone(&agent));
        }
        
        // 添加到类型映射
        {
            let mut agents_by_type = self.agents_by_type.write().await;
            agents_by_type
                .entry(agent_type)
                .or_insert_with(Vec::new)
                .push(agent_id);
        }
        
        info!("注册 Agent: {} ({})", agent_type, agent_id);
        Ok(agent_id)
    }
    
    /// 注销 Agent
    pub async fn unregister_agent(&self, agent_id: Uuid) -> Result<()> {
        // 先停止 Agent
        if let Some(agent) = self.get_agent(agent_id).await {
            agent.stop().await?;
        }
        
        // 从映射中移除
        let agent_type = {
            let mut agents = self.agents.write().await;
            let agent = agents.remove(&agent_id)
                .ok_or_else(|| AiContractError::internal_error("Agent 不存在"))?;
            agent.agent_type
        };
        
        // 从类型映射中移除
        {
            let mut agents_by_type = self.agents_by_type.write().await;
            if let Some(ids) = agents_by_type.get_mut(&agent_type) {
                ids.retain(|id| *id != agent_id);
            }
        }
        
        info!("注销 Agent: {}", agent_id);
        Ok(())
    }
    
    /// 获取 Agent
    pub async fn get_agent(&self, agent_id: Uuid) -> Option<Arc<AgentInstance>> {
        let agents = self.agents.read().await;
        agents.get(&agent_id).cloned()
    }
    
    /// 获取指定类型的所有 Agent
    pub async fn get_agents_by_type(&self, agent_type: AgentType) -> Vec<Arc<AgentInstance>> {
        let agents_by_type = self.agents_by_type.read().await;
        let agent_ids = agents_by_type.get(&agent_type).cloned().unwrap_or_default();
        drop(agents_by_type);
        
        let agents = self.agents.read().await;
        agent_ids.iter()
            .filter_map(|id| agents.get(id).cloned())
            .collect()
    }
    
    /// 启动 Agent
    pub async fn start_agent(&self, agent_id: Uuid) -> Result<()> {
        let agent = self.get_agent(agent_id).await
            .ok_or_else(|| AiContractError::internal_error("Agent 不存在"))?;
        
        agent.start().await
    }
    
    /// 停止 Agent
    pub async fn stop_agent(&self, agent_id: Uuid) -> Result<()> {
        let agent = self.get_agent(agent_id).await
            .ok_or_else(|| AiContractError::internal_error("Agent 不存在"))?;
        
        agent.stop().await
    }
    
    /// 重启 Agent
    pub async fn restart_agent(&self, agent_id: Uuid) -> Result<()> {
        let agent = self.get_agent(agent_id).await
            .ok_or_else(|| AiContractError::internal_error("Agent 不存在"))?;
        
        agent.restart().await
    }
    
    /// 启动所有 Agent
    pub async fn start_all(&self) -> Result<()> {
        info!("启动所有 Agent");
        
        let agents = self.agents.read().await;
        let agent_list: Vec<_> = agents.values().cloned().collect();
        drop(agents);
        
        for agent in agent_list {
            if let Err(e) = agent.start().await {
                error!("启动 Agent {} 失败: {}", agent.id, e);
            }
        }
        
        Ok(())
    }
    
    /// 停止所有 Agent
    pub async fn stop_all(&self) -> Result<()> {
        info!("停止所有 Agent");
        
        let agents = self.agents.read().await;
        let agent_list: Vec<_> = agents.values().cloned().collect();
        drop(agents);
        
        for agent in agent_list {
            if let Err(e) = agent.stop().await {
                error!("停止 Agent {} 失败: {}", agent.id, e);
            }
        }
        
        Ok(())
    }
    
    /// 获取所有 Agent 的健康状态
    pub async fn get_all_health(&self) -> Vec<AgentHealth> {
        let agents = self.agents.read().await;
        let agent_list: Vec<_> = agents.values().cloned().collect();
        drop(agents);
        
        let mut health_list = Vec::new();
        for agent in agent_list {
            health_list.push(agent.health_check().await);
        }
        
        health_list
    }
    
    /// 获取指定类型 Agent 的健康状态
    pub async fn get_health_by_type(&self, agent_type: AgentType) -> Vec<AgentHealth> {
        let agents = self.get_agents_by_type(agent_type).await;
        
        let mut health_list = Vec::new();
        for agent in agents {
            health_list.push(agent.health_check().await);
        }
        
        health_list
    }
    
    /// 更新 Agent 配置
    pub async fn update_agent_config(&self, agent_id: Uuid, config: AgentConfig) -> Result<()> {
        let agent = self.get_agent(agent_id).await
            .ok_or_else(|| AiContractError::internal_error("Agent 不存在"))?;
        
        agent.update_config(config).await
    }
    
    /// 获取 Agent 数量
    pub async fn agent_count(&self) -> usize {
        let agents = self.agents.read().await;
        agents.len()
    }
    
    /// 获取指定类型的 Agent 数量
    pub async fn agent_count_by_type(&self, agent_type: AgentType) -> usize {
        let agents_by_type = self.agents_by_type.read().await;
        agents_by_type.get(&agent_type).map(|v| v.len()).unwrap_or(0)
    }
}

impl Default for AgentLifecycleManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_agent_lifecycle() {
        let config = AgentConfig::default();
        let agent = AgentInstance::new(AgentType::RequirementsParser, config);
        
        // 测试启动
        assert!(agent.start().await.is_ok());
        assert_eq!(agent.get_state().await, AgentState::Running);
        
        // 测试暂停
        assert!(agent.pause().await.is_ok());
        assert_eq!(agent.get_state().await, AgentState::Paused);
        
        // 测试恢复
        assert!(agent.resume().await.is_ok());
        assert_eq!(agent.get_state().await, AgentState::Running);
        
        // 测试停止
        assert!(agent.stop().await.is_ok());
        assert_eq!(agent.get_state().await, AgentState::Stopped);
    }

    #[tokio::test]
    async fn test_lifecycle_manager() {
        let manager = AgentLifecycleManager::new();
        
        // 注册 Agent
        let config = AgentConfig::default();
        let agent_id = manager.register_agent(AgentType::RequirementsParser, config).await.unwrap();
        
        // 启动 Agent
        assert!(manager.start_agent(agent_id).await.is_ok());
        
        // 检查健康状态
        let health = manager.get_all_health().await;
        assert_eq!(health.len(), 1);
        assert!(health[0].is_healthy);
        
        // 停止 Agent
        assert!(manager.stop_agent(agent_id).await.is_ok());
        
        // 注销 Agent
        assert!(manager.unregister_agent(agent_id).await.is_ok());
        assert_eq!(manager.agent_count().await, 0);
    }
}
