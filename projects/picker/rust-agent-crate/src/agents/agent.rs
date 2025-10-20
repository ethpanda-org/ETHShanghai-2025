// Agent接口和相关结构体定义
use anyhow::Error;
use std::collections::HashMap;
use crate::tools::{ExampleTool, Tool};
use crate::core::Runnable;

// Agent执行的动作（简化）
#[derive(Clone, Debug)]
pub struct AgentAction {
    pub tool: String,
    pub tool_input: String,
    pub log: String,
    pub thought: Option<String>,
}

// Agent完成执行的结果（简化）
#[derive(Clone, Debug)]
pub struct AgentFinish {
    pub return_values: HashMap<String, String>,
}

// 统一的Agent输出类型
#[derive(Clone, Debug)]
pub enum AgentOutput {
    Action(AgentAction),
    Finish(AgentFinish),
}

// 最小化Agent接口（分离Runnable功能）
pub trait Agent: Send + Sync {
    // 获取可用工具列表
    fn tools(&self) -> Vec<Box<dyn Tool + Send + Sync>>;
    
    // 执行Agent动作（与README保持一致）
    fn execute(&self, action: &AgentAction) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, Error>> + Send + '_>> {
        let tools = self.tools();
        let tool_name = action.tool.clone();
        let tool_input = action.tool_input.clone();
        
        Box::pin(async move {
            // 查找对应的工具
            for tool in tools {
                if tool.name() == tool_name {
                    return tool.invoke(&tool_input).await;
                }
            }
            Err(Error::msg(format!("The tool {} not found", tool_name)))
        })
    }
    
    // 克隆代理实例
    fn clone_agent(&self) -> Box<dyn Agent>;
}

// Agent运行器 - 专门处理执行逻辑
pub trait AgentRunner: Runnable<HashMap<String, String>, AgentOutput> {
    // 注意：由于已经继承自Runnable，这里实际上不需要重复定义invoke方法
    // 实现Runnable trait时会自动提供该方法
}

// 简单的Agent实现
pub struct SimpleAgent {
    tools: Vec<Box<dyn Tool + Send + Sync>>,
}

impl SimpleAgent {
    pub fn new() -> Self {
        Self {
            tools: Vec::new(),
        }
    }
    
    pub fn add_tool(&mut self, tool: Box<dyn Tool + Send + Sync>) {
        self.tools.push(tool);
    }
}

impl Agent for SimpleAgent {
    fn tools(&self) -> Vec<Box<dyn Tool + Send + Sync>> {
        // 由于Box<dyn Tool>无法直接克隆，返回空向量作为最小化实现
        Vec::new()
    }
    
    fn clone_agent(&self) -> Box<dyn Agent> {
        let mut cloned = SimpleAgent::new();
        // 克隆所有工具
        for tool in &self.tools {
            let name = tool.name();
            let description = tool.description();
            let new_tool = Box::new(ExampleTool::new(name.to_string(), description.to_string()));
            cloned.add_tool(new_tool);
        }
        Box::new(cloned)
    }
}

// 简单的AgentRunner实现
pub struct SimpleAgentRunner {
    agent: Box<dyn Agent>,
}

impl SimpleAgentRunner {
    pub fn new(agent: impl Agent + 'static) -> Self {
        Self {
            agent: Box::new(agent),
        }
    }
}

impl Runnable<HashMap<String, String>, AgentOutput> for SimpleAgentRunner {
    fn invoke(&self, inputs: HashMap<String, String>) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<AgentOutput, Error>> + Send>> {
        let inputs_clone = inputs.clone();
        
        Box::pin(async move {
            // 这里只是一个简单的实现，实际应该使用LLM来决定是调用工具还是直接返回结果
            // 为了演示，我们假设如果输入中有"tool"字段，就调用对应的工具
            if let Some(tool_name) = inputs_clone.get("tool") {
                let tool_input = inputs_clone.get("input").unwrap_or(&"input empty".to_string()).clone();
                
                Ok(AgentOutput::Action(AgentAction {
                    tool: tool_name.to_string(),
                    tool_input,
                    log: format!("Invoking tool: {}", tool_name),
                    thought: Some("Invoking tool".to_string()),
                }))
            } else {
                // 否则返回一个简单的完成结果
                let output_text = inputs_clone.get("input").unwrap_or(&"".to_string()).clone();
                let mut return_values = HashMap::new();
                return_values.insert("output".to_string(), format!("Finish processing input: {}", output_text));
                
                Ok(AgentOutput::Finish(AgentFinish {
                    return_values,
                }))
            }
        })
    }
    
    fn clone_to_owned(&self) -> Box<dyn Runnable<HashMap<String, String>, AgentOutput> + Send + Sync> {
        // 使用新添加的clone_agent方法
        Box::new(SimpleAgentRunner { agent: self.agent.clone_agent() })
    }
}

// 为SimpleAgent实现Clone trait
impl Clone for SimpleAgent {
    fn clone(&self) -> Self {
        let mut agent = SimpleAgent::new();
        // 由于Tool trait没有要求Clone，我们需要创建新的工具实例
        // 对于ExampleTool，我们可以直接创建新实例
        // 这是一个最小化实现
        for tool in &self.tools {
            // 尝试获取工具名称以创建新实例
            let name = tool.name();
            let description = tool.description();
            // 创建一个新的ExampleTool作为克隆
            let new_tool = Box::new(ExampleTool::new(name.to_string(), description.to_string()));
            agent.add_tool(new_tool);
        }
        agent
    }
}