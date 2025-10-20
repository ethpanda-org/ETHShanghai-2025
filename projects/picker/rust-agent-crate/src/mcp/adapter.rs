// 工具适配器定义
use anyhow::Error;
use std::collections::HashMap;
use std::sync::Arc;
use serde_json::Value;
use crate::tools::Tool;
use super::client::{McpClient, McpTool};
use log::info;
// MCP工具适配器
pub struct McpToolAdapter {
    mcp_client: Arc<dyn McpClient>,
    mcp_tool: McpTool,
}

impl McpToolAdapter {
    pub fn new(mcp_client: Arc<dyn McpClient>, mcp_tool: McpTool) -> Self {
        Self {
            mcp_client,
            mcp_tool,
        }
    }
    
    // 从Box转换为Arc的构造方法
    pub fn new_from_box(mcp_client: Box<dyn McpClient>, mcp_tool: McpTool) -> Self {
        Self {
            mcp_client: Arc::from(mcp_client),
            mcp_tool,
        }
    }
    
    // 获取客户端的引用
    pub fn get_client(&self) -> Arc<dyn McpClient> {
        self.mcp_client.clone()
    }
    
    // 获取MCP工具的克隆
    pub fn get_mcp_tool(&self) -> McpTool {
        self.mcp_tool.clone()
    }
}

impl Tool for McpToolAdapter {
    fn name(&self) -> &str {
        &self.mcp_tool.name
    }
    
    fn description(&self) -> &str {
        &self.mcp_tool.description
    }
    
    fn invoke(&self, input: &str) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, Error>> + Send + '_>> {
        let client = self.mcp_client.clone();
        let tool_name = self.mcp_tool.name.clone();
        let input_str = input.to_string();
        info!("Invoking MCP tool {} with input: {}", tool_name, input_str);
        Box::pin(async move {
            // 尝试解析输入为JSON参数，增加容错处理
            let parameters: HashMap<String, Value> = match serde_json::from_str(&input_str) {
                Ok(params) => params,
                Err(_) => {
                    // 简单处理，将输入作为默认参数
                    let mut map = HashMap::new();
                    map.insert("query".to_string(), Value::String(input_str.clone()));
                    map
                },
            };
            
            // 调用MCP服务器上的工具
            let result_future = client.call_tool(&tool_name, parameters);
            let result = result_future.await?;
            
            // 将结果转换为字符串
            Ok(serde_json::to_string_pretty(&result)?)
        })
    }
    
    // 实现 as_any 方法以支持运行时类型检查
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}