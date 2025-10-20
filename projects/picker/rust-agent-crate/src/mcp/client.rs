// MCP客户端接口定义
use anyhow::Error;
use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use uuid::Uuid;

use crate::mcp::JSONRPCRequest;
use crate::mcp::JSONRPCResponse;

// MCP工具结构体
#[derive(Debug,Clone)]
pub struct McpTool {
    pub name: String,
    pub description: String,
    // 其他工具相关字段
}

// 简单的MCP客户端实现，修改 SimpleMcpClient 结构体，添加工具处理器字段
#[derive(Clone)]
pub struct SimpleMcpClient {
    pub url: String,
    pub available_tools: Vec<McpTool>,
    // 使用Arc包装工具处理器，使其支持克隆
    pub tool_handlers: HashMap<String, Arc<dyn Fn(HashMap<String, Value>) -> Pin<Box<dyn Future<Output = Result<Value, Error>> + Send>> + Send + Sync>>,
}

// 实现 SimpleMcpClient 结构体的方法
impl SimpleMcpClient {
    pub fn new(url: String) -> Self {
        Self {
            url,
            available_tools: Vec::new(),
            tool_handlers: HashMap::new(),
        }
    }
    
    // 添加自定义工具方法
    pub fn add_tool(&mut self, tool: McpTool) {
        self.available_tools.push(tool);
    }
    
    // 注册工具处理器方法
    pub fn register_tool_handler<F, Fut>(&mut self, tool_name: String, handler: F)
    where
        F: Fn(HashMap<String, Value>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<Value, Error>> + Send + 'static,
    {
        self.tool_handlers.insert(tool_name, Arc::new(move |params| {
            let params_clone = params.clone();
            Box::pin(handler(params_clone))
        }));
    }
    
    // 批量添加工具方法
    pub fn add_tools(&mut self, tools: Vec<McpTool>) {
        self.available_tools.extend(tools);
    }
    
    // 清空工具列表方法
    pub fn clear_tools(&mut self) {
        self.available_tools.clear();
    }
}

// 为 SimpleMcpClient 实现 McpClient trait
impl McpClient for SimpleMcpClient {
    // 连接到MCP服务器
    fn connect(&mut self, url: &str) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), Error>> + Send + '_>> {
        let url = url.to_string();
        Box::pin(async move {
            self.url = url;
            Ok(())
        })
    }
    
    // 获取可用工具列表
    fn get_tools(&self) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Vec<McpTool>, Error>> + Send + '_>> {
        let url = self.url.clone();
        let local_tools = self.available_tools.clone();
        Box::pin(async move {
            if !url.is_empty() {
                // 构造JSON-RPC请求
                let request = JSONRPCRequest {
                    jsonrpc: "2.0".to_string(),
                    id: Some(Value::String(Uuid::new_v4().to_string())),
                    method: "tools/list".to_string(),
                    params: None,
                };

                // 发送HTTP POST请求
                let client = reqwest::Client::new();
                let response = client
                    .post(&format!("{}/rpc", url))
                    .json(&request)
                    .send()
                    .await;

                // 检查请求是否成功发送
                match response {
                    Ok(response) => {
                        // 检查HTTP状态码
                        if !response.status().is_success() {
                            let status = response.status();
                            let body = response.text().await.unwrap_or_else(|_| "Unable to read response body".to_string());
                            warn!("MCP server returned HTTP error {}: {}. Response body: {}", status.as_u16(), status.canonical_reason().unwrap_or("Unknown error"), body);
                            // 当服务器返回错误时，返回本地工具列表
                            return Ok(local_tools);
                        }

                        // 获取响应文本用于调试
                        let response_text = response.text().await
                            .map_err(|e| Error::msg(format!("Failed to read response body: {}", e)))?;
                        
                        // 检查响应是否为空
                        if response_text.trim().is_empty() {
                            warn!("MCP server returned empty response");
                            // 当服务器返回空响应时，返回本地工具列表
                            return Ok(local_tools);
                        }

                        // 尝试解析JSON
                        let rpc_response: JSONRPCResponse = serde_json::from_str(&response_text)
                            .map_err(|e| {
                                warn!("Failed to parse response as JSON: {}. Response content: {}", e, response_text);
                                // 当解析JSON失败时，返回本地工具列表
                                Error::msg(format!("Failed to parse response as JSON: {}. Response content: {}", e, response_text))
                            })?;
                        
                        // 检查是否有错误
                        if let Some(error) = rpc_response.error {
                            warn!("JSON-RPC error: {} (code: {})", error.message, error.code);
                            // 当JSON-RPC返回错误时，返回本地工具列表
                            return Ok(local_tools);
                        }
                        
                        // 解析工具列表
                        if let Some(result) = rpc_response.result {
                            debug!("Server response result: {:?}", result);
                            if let Some(tools_value) = result.get("tools") {
                                debug!("Tools value: {:?}", tools_value);
                                if let Ok(tools_array) = serde_json::from_value::<Vec<serde_json::Value>>(tools_value.clone()) {
                                    let mut tools = Vec::new();
                                    // 首先把本地工具加入到tools中
                                    tools.extend(local_tools);
                                    for tool_value in tools_array {
                                        debug!("Processing tool value: {:?}", tool_value);
                                        if let (Ok(name), Ok(description)) = (
                                            serde_json::from_value::<String>(tool_value["name"].clone()),
                                            serde_json::from_value::<String>(tool_value["description"].clone())
                                        ) {
                                            tools.push(McpTool {
                                                name,
                                                description,
                                            });
                                        } else {
                                            warn!("Failed to parse tool from server response: {:?}", tool_value);
                                        }
                                    }
                                    return Ok(tools);
                                } else {
                                    warn!("Failed to parse tools array from server response: {:?}", tools_value);
                                }
                            } else {
                                warn!("No 'tools' field in server response result: {:?}", result);
                            }
                        } else {
                            warn!("No result in JSON-RPC response");
                        }
                        
                        // 如果解析失败，返回本地工具列表
                        warn!("Failed to parse tools from server response");
                        Ok(local_tools)
                    }
                    Err(e) => {
                        // 当无法连接到服务器时，返回本地工具列表
                        warn!("Failed to send request to MCP server: {}", e);
                        Ok(local_tools)
                    }
                }
            } else {
                // 如果没有设置URL，返回本地工具列表
                Ok(local_tools)
            }
        })
    }
    
    // 调用指定工具
    fn call_tool(&self, tool_name: &str, params: HashMap<String, Value>) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Value, Error>> + Send + '_>> {
        let url = self.url.clone();
        let tool_name = tool_name.to_string();
        let params = params.clone();
        let handler_opt = self.tool_handlers.get(&tool_name).cloned();
        Box::pin(async move {
            // 检查是否有自定义的工具处理器
            if let Some(handler) = handler_opt {
                // 如果有自定义处理器，调用它
                info!("Calling tool {} with params {:?}", tool_name, params);
                handler(params.clone()).await
            } else {
                // 否则通过HTTP发送JSON-RPC请求
                if !url.is_empty() {
                    // 构造JSON-RPC请求
                    let request = JSONRPCRequest {
                        jsonrpc: "2.0".to_string(),
                        id: Some(Value::String(Uuid::new_v4().to_string())),
                        method: "tools/call".to_string(),
                        params: Some(json!({
                            "name": tool_name,
                            "arguments": params
                        })),
                    };

                    // 发送HTTP POST请求
                    let client = reqwest::Client::new();
                    let response = client
                        .post(&format!("{}/rpc", url))
                        .json(&request)
                        .send()
                        .await?;

                    // 解析响应
                    let rpc_response: JSONRPCResponse = response.json().await?;
                    
                    // 检查是否有错误
                    if let Some(error) = rpc_response.error {
                        return Err(Error::msg(format!("JSON-RPC error: {} (code: {})", error.message, error.code)));
                    }
                    
                    // 返回结果
                    Ok(rpc_response.result.unwrap_or(Value::Null))
                } else {
                    // 如果没有设置URL且没有自定义处理器，使用默认的处理逻辑
                    match tool_name.as_str() {
                        "get_weather" => {
                            // 绑定默认值到变量以延长生命周期
                            let default_city = Value::String("Beijing".to_string());
                            let city_value = params.get("city").unwrap_or(&default_city);
                            let city = city_value.as_str().unwrap_or("Beijing");
                            Ok(json!({
                                "city": city,
                                "temperature": "25°C",
                                "weather": "cloudy",
                                "humidity": "60%"
                            }))
                        },
                        _ => Err(Error::msg(format!("Unknown tool: {}", tool_name)))
                    }
                }
            }
        })
    }
    
    // 断开连接
    fn disconnect(&self) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), Error>> + Send + '_>> {
        Box::pin(async move {
            // 简单实现：模拟断开连接成功
            Ok(())
        })
    }
    
    // 获取工具响应
    fn get_response(&self, tool_call_id: &str) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Value, Error>> + Send + '_>> {
        let tool_call_id = tool_call_id.to_string();
        Box::pin(async move {
            // 简单实现：返回模拟的工具响应
            Ok(serde_json::json!({
                "tool_call_id": tool_call_id,
                "status": "completed",
                "response": {
                    "data": "Sample tool response data"
                }
            }))
        })
    }
    
    // 克隆方法
    fn clone(&self) -> Box<dyn McpClient> {
        // 手动创建 available_tools 的深拷贝
        let tools = self.available_tools.iter().map(|t| McpTool {
            name: t.name.clone(),
            description: t.description.clone()
        }).collect();
        
        // 复制工具处理器
        let tool_handlers = self.tool_handlers.clone();
        
        Box::new(SimpleMcpClient {
            url: self.url.clone(),
            available_tools: tools,
            tool_handlers,
        })
    }
}

// MCP客户端接口
pub trait McpClient: Send + Sync {
    // 连接到MCP服务器
    fn connect(&mut self, _url: &str) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), Error>> + Send + '_>> {
        Box::pin(async move {
            // 简单实现：模拟连接成功
            Ok(())
        })
    }
    
    // 获取可用工具列表
    fn get_tools(&self) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Vec<McpTool>, Error>> + Send + '_>> {
        Box::pin(async move {
            // 简单实现：返回模拟的工具列表
            Ok(vec![McpTool {
                name: "example_tool".to_string(),
                description: "Example tool description".to_string()
            }])
        })
    }
    
    // 调用指定工具
    fn call_tool(&self, tool_name: &str, params: HashMap<String, Value>) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Value, Error>> + Send + '_>> {
        let _tool_name = tool_name.to_string();
        let _params = params.clone();
        Box::pin(async move {
            // 默认实现返回错误，因为trait不知道如何发送HTTP请求
            Err(Error::msg("HTTP client not implemented in trait"))
        })
    }
    
    // 断开连接
    fn disconnect(&self) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), Error>> + Send + '_>> {
        Box::pin(async move {
            // 简单实现：模拟断开连接成功
            Ok(())
        })
    }
    
    // 获取工具响应
    fn get_response(&self, tool_call_id: &str) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Value, Error>> + Send + '_>> {
        let tool_call_id = tool_call_id.to_string();
        Box::pin(async move {
            // 简单实现：返回模拟的工具响应
            Ok(serde_json::json!({
                "tool_call_id": tool_call_id,
                "status": "completed",
                "response": {
                    "data": "Sample tool response data"
                }
            }))
        })
    }
    
    // 克隆方法
    fn clone(&self) -> Box<dyn McpClient>;
}
