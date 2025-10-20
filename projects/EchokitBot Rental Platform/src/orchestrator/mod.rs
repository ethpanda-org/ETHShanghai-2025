//! Agent 协调器模块
//! 
//! 负责管理多个 AI Agent 的协作流程、任务调度和消息传递

pub mod task_queue;
pub mod messaging;

use crate::agents::{AgentLifecycleManager, AgentType, AgentConfig, AgentState};
use crate::config::AiContractGeneratorConfig;
use crate::error::{AiContractError, Result};
use crate::llm::LlmManager;
use crate::types::*;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn, error};
use uuid::Uuid;

pub use task_queue::{
    TaskQueue, TaskScheduler, QueuedTask, TaskPriority, 
    TaskDependency, DependencyType, RetryConfig, SchedulerConfig, SchedulerStats
};
pub use messaging::{
    MessageBus, Message, MessageType, MessagePriority, 
    EventBus, Event, EventType, EventHandler
};

/// Agent 协调器
pub struct AgentOrchestrator {
    /// 配置
    config: AiContractGeneratorConfig,
    
    /// LLM 管理器
    llm_manager: Arc<LlmManager>,
    
    /// Agent 生命周期管理器
    lifecycle_manager: Arc<AgentLifecycleManager>,
    
    /// 任务调度器
    task_scheduler: Arc<TaskScheduler>,
    
    /// 消息总线
    message_bus: Arc<MessageBus>,
    
    /// 事件总线
    event_bus: Arc<EventBus>,
    
    /// 活跃任务
    active_tasks: Arc<RwLock<std::collections::HashMap<Uuid, TaskStatus>>>,
}

impl AgentOrchestrator {
    /// 创建新的 Agent 协调器
    pub async fn new(config: AiContractGeneratorConfig) -> Result<Self> {
        info!("初始化 Agent 协调器");
        
        // 验证配置
        config.validate()?;
        
        // 初始化 LLM 管理器
        let llm_manager = Arc::new(LlmManager::new(config.llm_providers.clone()).await?);
        
        // 初始化 Agent 生命周期管理器
        let lifecycle_manager = Arc::new(AgentLifecycleManager::new());
        
        // 初始化任务调度器
        let scheduler_config = SchedulerConfig {
            max_concurrent_tasks: config.agents.requirements_parser.concurrency_limit.max(
                config.agents.contract_generator.concurrency_limit.max(
                    config.agents.security_auditor.concurrency_limit
                )
            ) as usize,
            default_timeout_secs: 300,
            cleanup_interval_secs: 3600,
            retention_count: 1000,
        };
        let task_scheduler = Arc::new(TaskScheduler::new(scheduler_config));
        
        // 初始化消息总线
        let message_bus = Arc::new(MessageBus::new());
        
        // 初始化事件总线
        let event_bus = Arc::new(EventBus::new());
        
        // 注册 Agents
        Self::register_agents(&lifecycle_manager, &config).await?;
        
        info!("Agent 协调器初始化完成");
        
        Ok(Self {
            config,
            llm_manager,
            lifecycle_manager,
            task_scheduler,
            message_bus,
            event_bus,
            active_tasks: Arc::new(RwLock::new(std::collections::HashMap::new())),
        })
    }
    
    /// 注册所有 Agents
    async fn register_agents(
        lifecycle_manager: &AgentLifecycleManager,
        config: &AiContractGeneratorConfig,
    ) -> Result<()> {
        info!("注册 Agents");
        
        // 注册需求解析 Agent
        let parser_config = AgentConfig {
            agent_type: AgentType::RequirementsParser,
            enabled: true,
            health_check_interval_secs: 30,
            max_retries: config.agents.requirements_parser.max_retries,
            restart_delay_secs: 5,
            timeout_secs: config.agents.requirements_parser.timeout,
            custom_config: std::collections::HashMap::new(),
        };
        lifecycle_manager.register_agent(AgentType::RequirementsParser, parser_config).await?;
        
        // 注册合约生成 Agent
        let generator_config = AgentConfig {
            agent_type: AgentType::ContractGenerator,
            enabled: true,
            health_check_interval_secs: 30,
            max_retries: config.agents.contract_generator.max_retries,
            restart_delay_secs: 5,
            timeout_secs: config.agents.contract_generator.timeout,
            custom_config: std::collections::HashMap::new(),
        };
        lifecycle_manager.register_agent(AgentType::ContractGenerator, generator_config).await?;
        
        // 注册安全审计 Agent
        let auditor_config = AgentConfig {
            agent_type: AgentType::SecurityAuditor,
            enabled: true,
            health_check_interval_secs: 30,
            max_retries: config.agents.security_auditor.max_retries,
            restart_delay_secs: 5,
            timeout_secs: config.agents.security_auditor.timeout,
            custom_config: std::collections::HashMap::new(),
        };
        lifecycle_manager.register_agent(AgentType::SecurityAuditor, auditor_config).await?;
        
        // 注册编译 Agent
        let compiler_config = AgentConfig {
            agent_type: AgentType::Compiler,
            enabled: true,
            health_check_interval_secs: 30,
            max_retries: 3,
            restart_delay_secs: 5,
            timeout_secs: 180,
            custom_config: std::collections::HashMap::new(),
        };
        lifecycle_manager.register_agent(AgentType::Compiler, compiler_config).await?;
        
        // 注册部署 Agent
        let deployment_config = AgentConfig {
            agent_type: AgentType::Deployment,
            enabled: true,
            health_check_interval_secs: 30,
            max_retries: 3,
            restart_delay_secs: 5,
            timeout_secs: 300,
            custom_config: std::collections::HashMap::new(),
        };
        lifecycle_manager.register_agent(AgentType::Deployment, deployment_config).await?;
        
        info!("所有 Agents 注册完成");
        Ok(())
    }
    
    /// 启动协调器
    pub async fn start(&self) -> Result<()> {
        info!("启动 Agent 协调器");
        
        // 启动所有 Agents
        self.lifecycle_manager.start_all().await?;
        
        // 启动任务调度器清理任务
        self.task_scheduler.start_cleanup_task();
        
        info!("Agent 协调器启动完成");
        Ok(())
    }
    
    /// 停止协调器
    pub async fn stop(&self) -> Result<()> {
        info!("停止 Agent 协调器");
        
        // 停止所有 Agents
        self.lifecycle_manager.stop_all().await?;
        
        info!("Agent 协调器停止完成");
        Ok(())
    }
    
    /// 提交合约生成任务
    pub async fn submit_task(&self, task: ContractGenerationTask) -> Result<Uuid> {
        let task_id = task.id;
        info!("提交合约生成任务: {}", task_id);
        
        // 创建队列任务
        let queued_task = QueuedTask::new(task)
            .with_priority(TaskPriority::Normal)
            .with_timeout(300);
        
        // 提交到调度器
        self.task_scheduler.submit(queued_task).await?;
        
        // 记录活跃任务
        {
            let mut active = self.active_tasks.write().await;
            active.insert(task_id, TaskStatus::Pending);
        }
        
        // 发布任务提交事件
        self.event_bus.publish(Event::new(
            EventType::TaskSubmitted,
            task_id,
            serde_json::json!({ "task_id": task_id }),
        )).await;
        
        info!("任务 {} 已提交", task_id);
        Ok(task_id)
    }
    
    /// 处理合约生成任务
    pub async fn process_task(&self, task_id: Uuid) -> Result<ContractGenerationResult> {
        info!("开始处理任务: {}", task_id);
        
        // 获取执行许可
        let _permit = self.task_scheduler.acquire_permit().await?;
        
        // 获取任务
        let task = self.task_scheduler.next_task().await
            .ok_or_else(|| AiContractError::internal_error("任务不存在"))?;
        
        // 标记任务开始执行
        self.task_scheduler.mark_running(&task).await;
        
        // 执行任务处理流程
        let task_type = task.task.clone();
        match self.execute_task_pipeline(task_type).await {
            Ok(result) => {
                self.task_scheduler.mark_completed(task_id).await;
                
                // 更新活跃任务状态
                {
                    let mut active = self.active_tasks.write().await;
                    active.insert(task_id, TaskStatus::Completed);
                }
                
                // 发布任务完成事件
                self.event_bus.publish(Event::new(
                    EventType::TaskCompleted,
                    task_id,
                    serde_json::json!({ "task_id": task_id }),
                )).await;
                
                info!("任务 {} 处理完成", task_id);
                Ok(result)
            }
            Err(e) => {
                error!("任务 {} 处理失败: {}", task_id, e);
                
                // 检查是否可以重试
                if task.retry_config.can_retry() {
                    warn!("任务 {} 将重试", task_id);
                    self.task_scheduler.resubmit(task).await?;
                } else {
                    self.task_scheduler.mark_failed(task_id).await;
                    
                    // 更新活跃任务状态
                    {
                        let mut active = self.active_tasks.write().await;
                        active.insert(task_id, TaskStatus::Failed);
                    }
                    
                    // 发布任务失败事件
                    self.event_bus.publish(Event::new(
                        EventType::TaskFailed,
                        task_id,
                        serde_json::json!({ 
                            "task_id": task_id,
                            "error": e.to_string()
                        }),
                    )).await;
                }
                
                Err(e)
            }
        }
    }
    
    /// 执行任务处理管道
    async fn execute_task_pipeline(&self, mut task: ContractGenerationTask) -> Result<ContractGenerationResult> {
        let start_time = std::time::Instant::now();
        let mut timing = ProcessingTiming {
            requirements_parsing: 0.0,
            code_generation: 0.0,
            security_audit: 0.0,
            compilation: 0.0,
            deployment: None,
            total: 0.0,
        };
        
        // 1. 解析需求
        info!("步骤 1: 解析需求");
        task.update_status(TaskStatus::ParsingRequirements);
        self.update_active_task_status(task.id, TaskStatus::ParsingRequirements).await;
        
        let requirements_start = std::time::Instant::now();
        let blueprint = self.parse_requirements(&task.requirements).await?;
        timing.requirements_parsing = requirements_start.elapsed().as_secs_f64();
        
        // 2. 生成合约代码
        info!("步骤 2: 生成合约代码");
        task.update_status(TaskStatus::GeneratingCode);
        self.update_active_task_status(task.id, TaskStatus::GeneratingCode).await;
        
        let generation_start = std::time::Instant::now();
        let contract_code = self.generate_contract(&blueprint).await?;
        timing.code_generation = generation_start.elapsed().as_secs_f64();
        
        // 3. 安全审计
        info!("步骤 3: 安全审计");
        task.update_status(TaskStatus::SecurityAudit);
        self.update_active_task_status(task.id, TaskStatus::SecurityAudit).await;
        
        let audit_start = std::time::Instant::now();
        let audit_result = self.audit_contract(&contract_code).await?;
        timing.security_audit = audit_start.elapsed().as_secs_f64();
        
        // 4. 处理安全问题（如果有）
        let final_code = if audit_result.has_critical_issues() {
            warn!("发现关键安全问题，尝试自动修复");
            self.fix_security_issues(&contract_code, &audit_result).await?
        } else {
            contract_code
        };
        
        // 5. 编译合约
        info!("步骤 4: 编译合约");
        task.update_status(TaskStatus::Compiling);
        self.update_active_task_status(task.id, TaskStatus::Compiling).await;
        
        let compilation_start = std::time::Instant::now();
        let compilation_result = self.compile_contract(&final_code).await?;
        timing.compilation = compilation_start.elapsed().as_secs_f64();
        
        // 6. 部署合约（如果配置了自动部署）
        let deployment_result = if task.auto_deploy {
            info!("步骤 5: 部署合约");
            task.update_status(TaskStatus::Deploying);
            self.update_active_task_status(task.id, TaskStatus::Deploying).await;
            
            let deployment_start = std::time::Instant::now();
            let result = self.deploy_contract(&compilation_result, &task.deployment_config).await?;
            timing.deployment = Some(deployment_start.elapsed().as_secs_f64());
            Some(result)
        } else {
            None
        };
        
        // 7. 生成报告
        timing.total = start_time.elapsed().as_secs_f64();
        let report = self.generate_report(&blueprint, &audit_result, &timing).await?;
        
        // 8. 完成任务
        task.update_status(TaskStatus::Completed);
        self.update_active_task_status(task.id, TaskStatus::Completed).await;
        
        Ok(ContractGenerationResult {
            task_id: task.id,
            blueprint,
            contract_code: final_code,
            audit_result,
            compilation_result,
            deployment_result,
            report,
            completed_at: chrono::Utc::now(),
        })
    }
    
    /// 更新活跃任务状态
    async fn update_active_task_status(&self, task_id: Uuid, status: TaskStatus) {
        let mut active = self.active_tasks.write().await;
        active.insert(task_id, status);
    }
    
    /// 解析需求（占位符实现）
    async fn parse_requirements(&self, _requirements: &str) -> Result<ContractBlueprint> {
        // TODO: 实现需求解析 Agent
        Ok(ContractBlueprint {
            contract_type: ContractType::ERC20Token,
            name: "MyToken".to_string(),
            description: "A simple ERC-20 token".to_string(),
            symbol: Some("MTK".to_string()),
            functions: Vec::new(),
            state_variables: Vec::new(),
            events: Vec::new(),
            modifiers: Vec::new(),
            inheritance: vec!["ERC20".to_string()],
            security_requirements: SecurityRequirements::default(),
            deployment_config: BlueprintDeploymentConfig {
                target_networks: vec!["localhost".to_string()],
                constructor_parameters: Vec::new(),
                initialization_parameters: std::collections::HashMap::new(),
                dependencies: Vec::new(),
            },
            gas_optimization: Vec::new(),
            upgrade_strategy: None,
            platform_integration: None,
        })
    }
    
    /// 生成合约代码（占位符实现）
    async fn generate_contract(&self, _blueprint: &ContractBlueprint) -> Result<String> {
        // TODO: 实现合约生成 Agent
        Ok(r#"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
        "#.to_string())
    }
    
    /// 审计合约（占位符实现）
    async fn audit_contract(&self, _contract_code: &str) -> Result<SecurityAuditResult> {
        // TODO: 实现安全审计 Agent
        Ok(SecurityAuditResult {
            audit_id: Uuid::new_v4(),
            audit_time: chrono::Utc::now(),
            security_score: 85,
            issues: Vec::new(),
            tools_used: vec!["Aderyn".to_string()],
            summary: "合约通过基本安全检查".to_string(),
            recommendations: vec!["建议添加更多的输入验证".to_string()],
        })
    }
    
    /// 修复安全问题（占位符实现）
    async fn fix_security_issues(&self, contract_code: &str, _audit_result: &SecurityAuditResult) -> Result<String> {
        // TODO: 实现安全问题自动修复
        Ok(contract_code.to_string())
    }
    
    /// 编译合约（占位符实现）
    async fn compile_contract(&self, _contract_code: &str) -> Result<CompilationResult> {
        // TODO: 实现编译 Agent
        Ok(CompilationResult {
            success: true,
            compile_time: chrono::Utc::now(),
            compiler_version: "0.8.21".to_string(),
            abi: Some("[]".to_string()),
            bytecode: Some("0x608060405234801561001057600080fd5b50".to_string()),
            deployed_bytecode: Some("0x608060405234801561001057600080fd5b50".to_string()),
            source_map: None,
            warnings: Vec::new(),
            errors: Vec::new(),
            gas_estimates: Some(GasEstimates {
                deployment: 500000,
                functions: std::collections::HashMap::new(),
                gas_limit: 8000000,
            }),
        })
    }
    
    /// 部署合约（占位符实现）
    async fn deploy_contract(
        &self, 
        _compilation_result: &CompilationResult,
        _deployment_config: &Option<DeploymentTaskConfig>
    ) -> Result<DeploymentResult> {
        // TODO: 实现部署 Agent
        Ok(DeploymentResult {
            success: true,
            deploy_time: chrono::Utc::now(),
            contract_address: Some("0x1234567890123456789012345678901234567890".to_string()),
            transaction_hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890".to_string(),
            network: "localhost".to_string(),
            block_number: 12345,
            gas_used: 450000,
            gas_price: 20000000000,
            deployment_cost: "9000000000000000".to_string(),
            verification_status: VerificationStatus::NotVerified,
            error: None,
        })
    }
    
    /// 生成报告
    async fn generate_report(
        &self,
        blueprint: &ContractBlueprint,
        audit_result: &SecurityAuditResult,
        timing: &ProcessingTiming,
    ) -> Result<GenerationReport> {
        let quality_metrics = QualityMetrics {
            code_quality_score: 85,
            security_score: audit_result.security_score,
            gas_efficiency_score: 80,
            readability_score: 90,
            test_coverage: None,
            documentation_completeness: 75,
        };
        
        Ok(GenerationReport {
            id: Uuid::new_v4(),
            generated_at: chrono::Utc::now(),
            summary: format!("成功生成 {} 类型的智能合约", 
                match blueprint.contract_type {
                    ContractType::ERC20Token => "ERC-20 代币",
                    ContractType::ERC721NFT => "ERC-721 NFT",
                    ContractType::ERC1155MultiToken => "ERC-1155 多代币",
                    ContractType::Governance => "治理",
                    ContractType::MultiSig => "多签钱包",
                    ContractType::Vault => "金库",
                    ContractType::DeFi => "DeFi",
                    ContractType::Custom => "自定义",
                }
            ),
            models_used: vec!["gpt-4o".to_string()],
            timing: timing.clone(),
            quality_metrics,
            recommendations: vec![
                "建议在主网部署前进行更全面的测试".to_string(),
                "考虑添加更多的事件记录以提高透明度".to_string(),
            ],
            metadata: std::collections::HashMap::new(),
        })
    }
    
    /// 获取任务状态
    pub async fn get_task_status(&self, task_id: Uuid) -> Option<TaskStatus> {
        let active = self.active_tasks.read().await;
        active.get(&task_id).cloned()
    }
    
    /// 获取所有活跃任务
    pub async fn get_active_tasks(&self) -> std::collections::HashMap<Uuid, TaskStatus> {
        let active = self.active_tasks.read().await;
        active.clone()
    }
    
    /// 取消任务
    pub async fn cancel_task(&self, task_id: Uuid) -> Result<()> {
        info!("取消任务: {}", task_id);
        
        self.task_scheduler.cancel(task_id).await?;
        
        // 更新活跃任务状态
        {
            let mut active = self.active_tasks.write().await;
            active.insert(task_id, TaskStatus::Cancelled);
        }
        
        // 发布任务取消事件
        self.event_bus.publish(Event::new(
            EventType::TaskCancelled,
            task_id,
            serde_json::json!({ "task_id": task_id }),
        )).await;
        
        info!("任务 {} 已取消", task_id);
        Ok(())
    }
    
    /// 获取队列中的任务数量
    pub async fn queue_size(&self) -> usize {
        self.task_scheduler.queue_size().await
    }
    
    /// 获取系统健康状态
    pub async fn health_check(&self) -> SystemHealth {
        let llm_health = self.llm_manager.health_check().await;
        let agent_health = self.lifecycle_manager.get_all_health().await;
        let scheduler_stats = self.task_scheduler.get_stats().await;
        
        SystemHealth {
            llm_providers: llm_health,
            agents: agent_health,
            scheduler: scheduler_stats,
        }
    }
    
    /// 清理已完成的任务
    pub async fn cleanup_completed_tasks(&self) {
        let mut active = self.active_tasks.write().await;
        active.retain(|_, status| {
            !matches!(status, TaskStatus::Completed | TaskStatus::Failed | TaskStatus::Cancelled)
        });
    }
    
    /// 获取 Agent 生命周期管理器
    pub fn lifecycle_manager(&self) -> &AgentLifecycleManager {
        &self.lifecycle_manager
    }
    
    /// 获取任务调度器
    pub fn task_scheduler(&self) -> &TaskScheduler {
        &self.task_scheduler
    }
    
    /// 获取消息总线
    pub fn message_bus(&self) -> &MessageBus {
        &self.message_bus
    }
    
    /// 获取事件总线
    pub fn event_bus(&self) -> &EventBus {
        &self.event_bus
    }
}

/// 系统健康状态
#[derive(Debug, Clone)]
pub struct SystemHealth {
    /// LLM 提供商健康状态
    pub llm_providers: Vec<crate::llm::ClientHealth>,
    
    /// Agent 健康状态
    pub agents: Vec<crate::agents::AgentHealth>,
    
    /// 调度器统计信息
    pub scheduler: SchedulerStats,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::AiContractGeneratorConfig;

    #[tokio::test]
    async fn test_orchestrator_creation() {
        let config = AiContractGeneratorConfig::default();
        
        if std::env::var("OPENAI_API_KEY").is_ok() {
            let orchestrator = AgentOrchestrator::new(config).await;
            assert!(orchestrator.is_ok());
        }
    }

    #[tokio::test]
    async fn test_task_submission() {
        let config = AiContractGeneratorConfig::default();
        
        if std::env::var("OPENAI_API_KEY").is_ok() {
            let orchestrator = AgentOrchestrator::new(config).await.unwrap();
            
            let task = ContractGenerationTask::new(
                "创建一个简单的 ERC-20 代币".to_string(),
                TaskConfig::default(),
            );
            
            let task_id = orchestrator.submit_task(task).await.unwrap();
            
            let status = orchestrator.get_task_status(task_id).await;
            assert_eq!(status, Some(TaskStatus::Pending));
            
            assert_eq!(orchestrator.queue_size().await, 1);
        }
    }
}
