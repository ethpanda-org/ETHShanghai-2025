// WebSocket 服务器 - 实时通信
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State, Query,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{sink::SinkExt, stream::StreamExt};
use std::{
    collections::HashMap,
    sync::Arc,
};
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

use crate::{
    api::models::WebSocketMessage,
    error::Result,
};

/// WebSocket 连接查询参数
#[derive(Debug, Deserialize)]
pub struct WsQuery {
    pub api_key: String,
    pub task_id: Option<Uuid>,
}

/// WebSocket 服务器
pub struct WebSocketServer {
    connections: Arc<RwLock<HashMap<Uuid, broadcast::Sender<WebSocketMessage>>>>,
    global_broadcast: broadcast::Sender<WebSocketMessage>,
}

impl WebSocketServer {
    /// 创建新的 WebSocket 服务器
    pub fn new() -> Self {
        let (global_broadcast, _) = broadcast::channel(1000);
        
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            global_broadcast,
        }
    }

    /// 创建路由器
    pub fn router(self: Arc<Self>) -> Router {
        Router::new()
            .route("/ws", get(ws_handler))
            .with_state(self)
    }

    /// 广播消息到所有连接
    pub async fn broadcast(&self, message: WebSocketMessage) -> Result<()> {
        let _ = self.global_broadcast.send(message);
        Ok(())
    }

    /// 发送消息到特定任务的订阅者
    pub async fn send_to_task(&self, task_id: Uuid, message: WebSocketMessage) -> Result<()> {
        let connections = self.connections.read().await;
        if let Some(sender) = connections.get(&task_id) {
            let _ = sender.send(message);
        }
        Ok(())
    }

    /// 注册任务订阅
    async fn register_task_subscription(&self, task_id: Uuid) -> broadcast::Receiver<WebSocketMessage> {
        let mut connections = self.connections.write().await;
        
        let sender = connections.entry(task_id).or_insert_with(|| {
            let (tx, _) = broadcast::channel(100);
            tx
        });
        
        sender.subscribe()
    }

    /// 取消任务订阅
    async fn unregister_task_subscription(&self, task_id: Uuid) {
        let mut connections = self.connections.write().await;
        connections.remove(&task_id);
    }
}

/// WebSocket 处理器
async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    State(server): State<Arc<WebSocketServer>>,
) -> impl IntoResponse {
    // TODO: 验证 API key
    // let auth_service = ...; 
    // auth_service.validate_api_key(&query.api_key).await?;

    ws.on_upgrade(move |socket| handle_socket(socket, query, server))
}

/// 处理 WebSocket 连接
async fn handle_socket(
    socket: WebSocket,
    query: WsQuery,
    server: Arc<WebSocketServer>,
) {
    let (mut sender, mut receiver) = socket.split();
    
    // 订阅全局广播
    let mut global_rx = server.global_broadcast.subscribe();
    
    // 如果指定了 task_id，订阅特定任务
    let mut task_rx = if let Some(task_id) = query.task_id {
        Some(server.register_task_subscription(task_id).await)
    } else {
        None
    };

    // 发送欢迎消息
    let welcome = WebSocketMessage::TaskUpdate {
        task_id: query.task_id.unwrap_or_else(Uuid::nil),
        status: crate::api::models::TaskStatus::Pending,
        progress: 0.0,
        message: "Connected to AI Contract Generator WebSocket".to_string(),
    };
    
    if let Ok(msg) = serde_json::to_string(&welcome) {
        let _ = sender.send(Message::Text(msg)).await;
    }

    // 处理消息的任务
    let mut send_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                // 接收全局广播
                Ok(msg) = global_rx.recv() => {
                    if let Ok(json) = serde_json::to_string(&msg) {
                        if sender.send(Message::Text(json)).await.is_err() {
                            break;
                        }
                    }
                }
                // 接收任务特定消息
                Some(Ok(msg)) = async {
                    if let Some(ref mut rx) = task_rx {
                        Some(rx.recv().await)
                    } else {
                        None
                    }
                } => {
                    if let Ok(json) = serde_json::to_string(&msg) {
                        if sender.send(Message::Text(json)).await.is_err() {
                            break;
                        }
                    }
                }
                else => break,
            }
        }
    });

    // 接收客户端消息
    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(text) => {
                // 处理客户端发送的文本消息
                tracing::debug!("Received WebSocket message: {}", text);
                
                // 可以实现客户端命令，如订阅/取消订阅特定任务
                if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                    match client_msg {
                        ClientMessage::Subscribe { task_id } => {
                            // 订阅新任务
                            task_rx = Some(server.register_task_subscription(task_id).await);
                        }
                        ClientMessage::Unsubscribe { task_id } => {
                            // 取消订阅
                            server.unregister_task_subscription(task_id).await;
                            task_rx = None;
                        }
                        ClientMessage::Ping => {
                            // 响应 ping
                            // sender 已经被移动，需要重新设计
                        }
                    }
                }
            }
            Message::Close(_) => {
                tracing::info!("WebSocket connection closed");
                break;
            }
            _ => {}
        }
    }

    // 清理
    send_task.abort();
    if let Some(task_id) = query.task_id {
        server.unregister_task_subscription(task_id).await;
    }
}

/// 客户端消息
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ClientMessage {
    Subscribe { task_id: Uuid },
    Unsubscribe { task_id: Uuid },
    Ping,
}

/// WebSocket 事件发射器
pub struct WebSocketEmitter {
    server: Arc<WebSocketServer>,
}

impl WebSocketEmitter {
    pub fn new(server: Arc<WebSocketServer>) -> Self {
        Self { server }
    }

    /// 发送任务更新
    pub async fn emit_task_update(
        &self,
        task_id: Uuid,
        status: crate::api::models::TaskStatus,
        progress: f32,
        message: String,
    ) -> Result<()> {
        let msg = WebSocketMessage::TaskUpdate {
            task_id,
            status,
            progress,
            message,
        };
        
        self.server.send_to_task(task_id, msg.clone()).await?;
        self.server.broadcast(msg).await?;
        
        Ok(())
    }

    /// 发送任务完成
    pub async fn emit_task_completed(
        &self,
        task_id: Uuid,
        result: crate::api::models::ContractGenerationResult,
    ) -> Result<()> {
        let msg = WebSocketMessage::TaskCompleted { task_id, result };
        
        self.server.send_to_task(task_id, msg.clone()).await?;
        self.server.broadcast(msg).await?;
        
        Ok(())
    }

    /// 发送任务失败
    pub async fn emit_task_failed(
        &self,
        task_id: Uuid,
        error: String,
    ) -> Result<()> {
        let msg = WebSocketMessage::TaskFailed { task_id, error };
        
        self.server.send_to_task(task_id, msg.clone()).await?;
        self.server.broadcast(msg).await?;
        
        Ok(())
    }

    /// 发送 Agent 进度
    pub async fn emit_agent_progress(
        &self,
        task_id: Uuid,
        agent: String,
        step: String,
        progress: f32,
    ) -> Result<()> {
        let msg = WebSocketMessage::AgentProgress {
            task_id,
            agent,
            step,
            progress,
        };
        
        self.server.send_to_task(task_id, msg.clone()).await?;
        self.server.broadcast(msg).await?;
        
        Ok(())
    }

    /// 发送安全警报
    pub async fn emit_security_alert(
        &self,
        task_id: Uuid,
        severity: String,
        message: String,
    ) -> Result<()> {
        let msg = WebSocketMessage::SecurityAlert {
            task_id,
            severity,
            message,
        };
        
        self.server.send_to_task(task_id, msg.clone()).await?;
        self.server.broadcast(msg).await?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_websocket_server_creation() {
        let server = WebSocketServer::new();
        assert!(server.connections.read().await.is_empty());
    }

    #[tokio::test]
    async fn test_task_subscription() {
        let server = Arc::new(WebSocketServer::new());
        let task_id = Uuid::new_v4();
        
        let _rx = server.register_task_subscription(task_id).await;
        assert!(server.connections.read().await.contains_key(&task_id));
        
        server.unregister_task_subscription(task_id).await;
        assert!(!server.connections.read().await.contains_key(&task_id));
    }

    #[tokio::test]
    async fn test_websocket_emitter() {
        let server = Arc::new(WebSocketServer::new());
        let emitter = WebSocketEmitter::new(server.clone());
        let task_id = Uuid::new_v4();
        
        // 测试发送任务更新
        let result = emitter.emit_task_update(
            task_id,
            crate::api::models::TaskStatus::ParsingRequirements,
            0.1,
            "Parsing requirements".to_string(),
        ).await;
        
        assert!(result.is_ok());
    }
}
