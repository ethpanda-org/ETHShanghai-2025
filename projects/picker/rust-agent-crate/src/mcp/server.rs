// MCP服务器抽象定义
use anyhow::Error;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use crate::tools::Tool;
use serde::{Deserialize, Serialize};
use axum::{
    extract::State,
    response::Json,
    routing::{get, post},
    Router,
};
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use serde_json::Value;
use log::{info, error};

use crate::mcp::JSONRPCRequest;
use crate::mcp::JSONRPCResponse;
use crate::mcp::JSONRPCError;

#[derive(Debug, Deserialize, Serialize)]
struct CallToolParams {
    name: String,
    arguments: Option<std::collections::HashMap<String, serde_json::Value>>,
}

// MCP服务器实现
pub struct SimpleMcpServer {
    address: String,
    tools: Arc<Mutex<HashMap<String, Arc<dyn Tool>>>>,
    is_running: Arc<Mutex<bool>>,
    server_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
}

impl SimpleMcpServer {
    pub fn new() -> Self {
        Self {
            address: "127.0.0.1:3000".to_string(),
            tools: Arc::new(Mutex::new(HashMap::new())),
            is_running: Arc::new(Mutex::new(false)),
            server_handle: Arc::new(Mutex::new(None)),
        }
    }
    
    pub fn with_address(mut self, address: String) -> Self {
        self.address = address;
        self
    }
}

// 简单的测试handler
#[axum::debug_handler]
async fn test_handler() -> &'static str {
    "Hello, World!"
}

// 处理JSON-RPC请求
#[axum::debug_handler]
async fn handle_jsonrpc_request(
    State(state): State<Arc<SimpleMcpServerState>>,
    Json(payload): Json<JSONRPCRequest>,
) -> Json<JSONRPCResponse> {
    let response = match payload.method.as_str() {
        "tools/call" => {
            // 处理工具调用请求
            match handle_tool_call(state, payload.params).await {
                Ok(result) => {
                    JSONRPCResponse {
                        jsonrpc: "2.0".to_string(),
                        id: Some(payload.id.unwrap_or(Value::Null)),
                        result: Some(result),
                        error: None,
                    }
                }
                Err(e) => {
                    JSONRPCResponse {
                        jsonrpc: "2.0".to_string(),
                        id: Some(payload.id.unwrap_or(Value::Null)),
                        result: None,
                        error: Some(JSONRPCError {
                            code: -32603,
                            message: e.to_string(),
                        }),
                    }
                }
            }
        }
        "tools/list" => {
            // 处理工具列表请求
            match handle_list_tools(state).await {
                Ok(result) => {
                    JSONRPCResponse {
                        jsonrpc: "2.0".to_string(),
                        id: Some(payload.id.unwrap_or(Value::Null)),
                        result: Some(result),
                        error: None,
                    }
                }
                Err(e) => {
                    JSONRPCResponse {
                        jsonrpc: "2.0".to_string(),
                        id: Some(payload.id.unwrap_or(Value::Null)),
                        result: None,
                        error: Some(JSONRPCError {
                            code: -32603,
                            message: e.to_string(),
                        }),
                    }
                }
            }
        }
        _ => {
            // 不支持的方法
            JSONRPCResponse {
                jsonrpc: "2.0".to_string(),
                id: Some(payload.id.unwrap_or(Value::Null)),
                result: None,
                error: Some(JSONRPCError {
                    code: -32601,
                    message: "Method not found".to_string(),
                }),
            }
        }
    };
    
    Json(response)
}

async fn handle_list_tools(
    state: Arc<SimpleMcpServerState>,
) -> Result<serde_json::Value, Error> {
    // 获取所有已注册的工具
    let tools_map = state.tools.lock().map_err(|e| Error::msg(format!("Failed to acquire lock: {}", e)))?;
    
    // 转换为MCP协议要求的工具格式
    let mut tools_list = Vec::new();
    for (_, tool) in tools_map.iter() {
        let mcp_tool = serde_json::json!({
            "name": tool.name(),
            "description": tool.description(),
            "inputSchema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        });
        tools_list.push(mcp_tool);
    }
    
    // 构造响应
    let result = serde_json::json!({
        "tools": tools_list
    });
    
    Ok(result)
}

async fn handle_tool_call(
    state: Arc<SimpleMcpServerState>,
    params: Option<serde_json::Value>,
) -> Result<serde_json::Value, Error> {
    // 解析参数
    let call_params: CallToolParams = serde_json::from_value(params.unwrap_or(serde_json::Value::Null))
        .map_err(|e| Error::msg(format!("Invalid parameters: {}", e)))?;
    
    // 查找工具并获取其Arc引用
    let tool = {
        let tools = state.tools.lock().map_err(|e| Error::msg(format!("Failed to acquire lock: {}", e)))?;
        tools.get(&call_params.name)
            .ok_or_else(|| Error::msg(format!("Tool '{}' not found", call_params.name)))?
            .clone()
    };
    
    // 准备工具输入参数
    let input_str = if let Some(args) = call_params.arguments {
        serde_json::to_string(&args)?
    } else {
        "{}".to_string()
    };
    
    // 调用工具（现在可以在不持有锁的情况下调用）
    let result = tool.invoke(&input_str).await?;
    Ok(serde_json::Value::String(result))
}

// 服务器状态结构体
#[derive(Clone)]
struct SimpleMcpServerState {
    tools: Arc<Mutex<HashMap<String, Arc<dyn Tool>>>>,
}

// MCP服务器抽象
#[async_trait::async_trait]
pub trait McpServer: Send + Sync {
    // 启动MCP服务器
    async fn start(&self, address: &str) -> Result<(), Error>;
    
    // 注册工具到MCP服务器
    fn register_tool(&self, tool: Arc<dyn Tool>) -> Result<(), Error>;
    
    // 停止MCP服务器
    async fn stop(&self) -> Result<(), Error>;
}

#[async_trait::async_trait]
impl McpServer for SimpleMcpServer {
    // 启动MCP服务器
    async fn start(&self, address: &str) -> Result<(), Error> {
        info!("Starting MCP server on {}", address);
        
        // 创建服务器状态
        let state = Arc::new(SimpleMcpServerState {
            tools: self.tools.clone(),
        });
        
        // 创建路由
        let app = Router::new()
            .route("/rpc", post(handle_jsonrpc_request))
            .route("/test", get(test_handler))
            .with_state(state)
            .layer(CorsLayer::permissive()); // 允许所有CORS请求
        
        // 启动服务器
        let listener = TcpListener::bind(address).await
            .map_err(|e| Error::msg(format!("Failed to bind to address {}: {}", address, e)))?;
        
        info!("MCP server listening on http://{}", address);
        
        // 在后台任务中运行服务器
        let handle = tokio::spawn(async move {
            if let Err(e) = axum::serve(listener, app.into_make_service()).await {
                error!("Server error: {}", e);
            }
        });
        
        // 更新服务器状态
    {
        let mut is_running = self.is_running.lock().map_err(|e| Error::msg(format!("Failed to acquire lock: {}", e)))?;
        *is_running = true;
    }
    
    // 保存服务器句柄
    {
        let mut server_handle = self.server_handle.lock().map_err(|e| Error::msg(format!("Failed to acquire lock: {}", e)))?;
        *server_handle = Some(handle);
    }
        
        Ok(())
    }
    
    // 注册工具到MCP服务器
    fn register_tool(&self, tool: Arc<dyn Tool>) -> Result<(), Error> {
        let name = tool.name().to_string();
        let mut tools = self.tools.lock().map_err(|e| Error::msg(format!("Failed to acquire lock: {}", e)))?;
        tools.insert(name, tool);
        Ok(())
    }
    
    // 停止MCP服务器
    async fn stop(&self) -> Result<(), Error> {
        info!("Stopping MCP server");
        
        // 更新服务器状态
        {
            let mut is_running = self.is_running.lock().map_err(|e| Error::msg(format!("Failed to acquire lock: {}", e)))?;
            *is_running = false;
        }
        
        // 取消服务器任务
        {
            let mut server_handle = self.server_handle.lock().map_err(|e| Error::msg(format!("Failed to acquire lock: {}", e)))?;
            if let Some(handle) = server_handle.take() {
                handle.abort();
            }
        }
        
        Ok(())
    }
}