// 工具接口和实现
use anyhow::Error;
use std::pin::Pin;

// 最小化工具接口（与langchain-core对齐）
pub trait Tool: Send + Sync {
    // 工具基本信息
    fn name(&self) -> &str;
    
    fn description(&self) -> &str;
    
    // 核心执行方法
    fn invoke(&self, input: &str) -> Pin<Box<dyn std::future::Future<Output = Result<String, Error>> + Send + '_>>;
    
    // 添加 as_any 方法以支持运行时类型检查
    fn as_any(&self) -> &dyn std::any::Any;
}

// 工具包接口
pub trait Toolkit {
    // 获取所有工具
    fn tools(&self) -> Vec<Box<dyn Tool>>;
}

// 示例工具实现 - 用于演示目的
pub struct ExampleTool {
    name: String,
    description: String,
}

impl ExampleTool {
    pub fn new(name: String, description: String) -> Self {
        Self {
            name,
            description,
        }
    }
}

impl Tool for ExampleTool {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn description(&self) -> &str {
        &self.description
    }
    
    fn invoke(&self, input: &str) -> Pin<Box<dyn std::future::Future<Output = Result<String, Error>> + Send + '_>> {
        let input_str = input.to_string();
        let name = self.name.clone();
        
        Box::pin(async move {
            Ok(format!("工具 {} 收到输入: {}", name, input_str))
        })
    }
    
    // 实现 as_any 方法以支持运行时类型检查
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

// 示例工具包实现
pub struct ExampleToolkit {
    tools: Vec<Box<dyn Tool>>,
}

impl ExampleToolkit {
    pub fn new() -> Self {
        let tools: Vec<Box<dyn Tool>> = Vec::new();
        Self {
            tools,
        }
    }
    
    pub fn add_tool(&mut self, tool: Box<dyn Tool>) {
        self.tools.push(tool);
    }
}

impl Toolkit for ExampleToolkit {
    fn tools(&self) -> Vec<Box<dyn Tool>> {
        // 由于Box<dyn Tool>无法直接克隆，返回空向量作为最小化实现
        Vec::new()
    }
}

// 为ExampleToolkit实现Clone trait
impl Clone for ExampleToolkit {
    fn clone(&self) -> Self {
        let mut toolkit = ExampleToolkit::new();
        // 由于Tool trait没有要求Clone，我们通过创建新实例来实现克隆
        for tool in &self.tools {
            let name = tool.name();
            let description = tool.description();
            // 创建一个新的ExampleTool作为克隆
            let new_tool = Box::new(ExampleTool::new(name.to_string(), description.to_string()));
            toolkit.add_tool(new_tool);
        }
        toolkit
    }
}