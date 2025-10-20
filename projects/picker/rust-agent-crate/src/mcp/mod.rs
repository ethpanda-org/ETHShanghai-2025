// MCP适配器实现模块定义
mod client;
mod adapter;
mod server;

// 重新导出模块内容
pub use client::{McpClient, SimpleMcpClient, McpTool};
pub use adapter::McpToolAdapter;
pub use server::{McpServer, SimpleMcpServer};

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize, Serialize)]
pub struct JSONRPCRequest {
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    params: Option<Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct JSONRPCResponse {
    jsonrpc: String,
    id: Option<Value>,
    result: Option<Value>,
    error: Option<JSONRPCError>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct JSONRPCError {
    code: i32,
    message: String,
}
