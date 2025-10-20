//! 基础 Agent 抽象和通用功能

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

/// Agent 执行错误
#[derive(Error, Debug)]
pub enum AgentError {
    #[error("模型调用失败: {0}")]
    ModelError(String),
    
    #[error("输入验证失败: {0}")]
    ValidationError(String),
    
    #[error("处理超时")]
    TimeoutError,
    
    #[error("配置错误: {0}")]
    ConfigError(String),
    
    #[error("IO错误: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("序列化错误: {0}")]
    SerializationError(#[from] serde_json::Error),
}

/// Agent 执行结果
pub type AgentResult<T> = Result<T, AgentError>;

/// Agent 执行上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentContext {
    /// 任务ID
    pub task_id: String,
    
    /// 用户输入
    pub user_input: String,
    
    /// 上下文数据
    pub context_data: HashMap<String, serde_json::Value>,
    
    /// 配置参数
    pub config: HashMap<String, String>,
    
    /// 执行历史
    pub execution_history: Vec<ExecutionStep>,
}

/// 执行步骤记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStep {
    pub agent_name: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub input: String,
    pub output: String,
    pub duration_ms: u64,
    pub success: bool,
    pub error_message: Option<String>,
}

/// Agent 输出结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentOutput {
    /// 主要输出内容
    pub content: String,
    
    /// 元数据
    pub metadata: HashMap<String, serde_json::Value>,
    
    /// 置信度 (0.0 - 1.0)
    pub confidence: f64,
    
    /// 建议的下一步操作
    pub next_actions: Vec<String>,
    
    /// 生成的文件路径
    pub generated_files: Vec<String>,
}

/// 基础 Agent 特征
#[async_trait]
pub trait Agent: Send + Sync {
    /// Agent 名称
    fn name(&self) -> &str;
    
    /// Agent 描述
    fn description(&self) -> &str;
    
    /// Agent 专长领域
    fn specialties(&self) -> Vec<String>;
    
    /// 推荐的模型类型
    fn preferred_models(&self) -> Vec<String>;
    
    /// 验证输入
    fn validate_input(&self, input: &str) -> AgentResult<()> {
        if input.trim().is_empty() {
            return Err(AgentError::ValidationError("输入不能为空".to_string()));
        }
        Ok(())
    }
    
    /// 执行主要任务
    async fn execute(&self, context: &AgentContext) -> AgentResult<AgentOutput>;
    
    /// 预处理输入
    async fn preprocess(&self, input: &str) -> AgentResult<String> {
        Ok(input.to_string())
    }
    
    /// 后处理输出
    async fn postprocess(&self, output: &str) -> AgentResult<String> {
        Ok(output.to_string())
    }
}

/// Agent 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// 模型名称
    pub model_name: String,
    
    /// 系统提示词
    pub system_prompt: String,
    
    /// 温度参数
    pub temperature: f64,
    
    /// 最大token数
    pub max_tokens: u32,
    
    /// 超时时间（秒）
    pub timeout_seconds: u64,
    
    /// 重试次数
    pub retry_count: u32,
    
    /// 自定义参数
    pub custom_params: HashMap<String, serde_json::Value>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            model_name: "gpt-4".to_string(),
            system_prompt: "You are a helpful AI assistant.".to_string(),
            temperature: 0.3,
            max_tokens: 2000,
            timeout_seconds: 30,
            retry_count: 3,
            custom_params: HashMap::new(),
        }
    }
}

/// Agent 工厂特征
#[async_trait]
pub trait AgentFactory: Send + Sync {
    /// 创建 Agent 实例
    async fn create_agent(&self, config: AgentConfig) -> AgentResult<Box<dyn Agent>>;
    
    /// 获取支持的 Agent 类型
    fn supported_agent_types(&self) -> Vec<String>;
}

/// Agent 执行器
pub struct AgentExecutor {
    agents: HashMap<String, Box<dyn Agent>>,
}

impl AgentExecutor {
    pub fn new() -> Self {
        Self {
            agents: HashMap::new(),
        }
    }
    
    /// 注册 Agent
    pub fn register_agent(&mut self, agent: Box<dyn Agent>) {
        let name = agent.name().to_string();
        self.agents.insert(name, agent);
    }
    
    /// 执行 Agent 任务
    pub async fn execute_agent(
        &self,
        agent_name: &str,
        context: &mut AgentContext,
    ) -> AgentResult<AgentOutput> {
        let agent = self.agents.get(agent_name)
            .ok_or_else(|| AgentError::ConfigError(format!("Agent {} 未找到", agent_name)))?;
        
        let start_time = std::time::Instant::now();
        let start_timestamp = chrono::Utc::now();
        
        // 验证输入
        agent.validate_input(&context.user_input)?;
        
        // 预处理
        let processed_input = agent.preprocess(&context.user_input).await?;
        context.user_input = processed_input;
        
        // 执行主要任务
        let result = agent.execute(context).await;
        
        let duration = start_time.elapsed();
        let success = result.is_ok();
        let error_message = if let Err(ref e) = result {
            Some(e.to_string())
        } else {
            None
        };
        
        // 记录执行历史
        let step = ExecutionStep {
            agent_name: agent_name.to_string(),
            timestamp: start_timestamp,
            input: context.user_input.clone(),
            output: if let Ok(ref output) = result {
                output.content.clone()
            } else {
                String::new()
            },
            duration_ms: duration.as_millis() as u64,
            success,
            error_message,
        };
        
        context.execution_history.push(step);
        
        result
    }
    
    /// 获取已注册的 Agent 列表
    pub fn list_agents(&self) -> Vec<String> {
        self.agents.keys().cloned().collect()
    }
}

impl Default for AgentExecutor {
    fn default() -> Self {
        Self::new()
    }
}

/// Agent 性能指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMetrics {
    pub agent_name: String,
    pub total_executions: u64,
    pub successful_executions: u64,
    pub failed_executions: u64,
    pub average_duration_ms: f64,
    pub average_confidence: f64,
    pub last_execution: Option<chrono::DateTime<chrono::Utc>>,
}

impl AgentMetrics {
    pub fn new(agent_name: String) -> Self {
        Self {
            agent_name,
            total_executions: 0,
            successful_executions: 0,
            failed_executions: 0,
            average_duration_ms: 0.0,
            average_confidence: 0.0,
            last_execution: None,
        }
    }
    
    pub fn success_rate(&self) -> f64 {
        if self.total_executions == 0 {
            0.0
        } else {
            self.successful_executions as f64 / self.total_executions as f64
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_agent_config_default() {
        let config = AgentConfig::default();
        assert_eq!(config.model_name, "gpt-4");
        assert_eq!(config.temperature, 0.3);
        assert_eq!(config.max_tokens, 2000);
    }
    
    #[test]
    fn test_agent_metrics() {
        let metrics = AgentMetrics::new("test_agent".to_string());
        assert_eq!(metrics.success_rate(), 0.0);
        assert_eq!(metrics.total_executions, 0);
    }
    
    #[tokio::test]
    async fn test_agent_executor() {
        let executor = AgentExecutor::new();
        assert_eq!(executor.list_agents().len(), 0);
    }
}