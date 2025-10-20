//! 消息传递和事件系统
//! 
//! 实现 Agent 间的异步消息传递、事件驱动的工作流编排和消息持久化

use crate::error::{AiContractError, Result};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{RwLock, mpsc, broadcast, Mutex};
use tracing::{info, warn, error, debug};
use uuid::Uuid;

/// 消息类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MessageType {
    /// 任务请求
    TaskRequest,
    /// 任务响应
    TaskResponse,
    /// 状态更新
    StatusUpdate,
    /// 错误通知
    ErrorNotification,
    /// 数据传输
    DataTransfer,
    /// 控制命令
    ControlCommand,
    /// 心跳
    Heartbeat,
}

/// 消息优先级
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum MessagePriority {
    /// 低优先级
    Low = 0,
    /// 正常优先级
    Normal = 1,
    /// 高优先级
    High = 2,
    /// 紧急优先级
    Urgent = 3,
}

impl Default for MessagePriority {
    fn default() -> Self {
        MessagePriority::Normal
    }
}

/// 消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    /// 消息 ID
    pub id: Uuid,
    /// 消息类型
    pub message_type: MessageType,
    /// 发送者 ID
    pub sender_id: String,
    /// 接收者 ID（None 表示广播）
    pub receiver_id: Option<String>,
    /// 优先级
    pub priority: MessagePriority,
    /// 消息内容
    pub payload: serde_json::Value,
    /// 创建时间
    pub created_at: chrono::DateTime<chrono::Utc>,
    /// 过期时间
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    /// 重试次数
    pub retry_count: u32,
    /// 最大重试次数
    pub max_retries: u32,
    /// 是否需要确认
    pub requires_ack: bool,
    /// 关联的消息 ID（用于请求-响应模式）
    pub correlation_id: Option<Uuid>,
    /// 元数据
    pub metadata: HashMap<String, String>,
}

impl Message {
    /// 创建新消息
    pub fn new(
        message_type: MessageType,
        sender_id: String,
        receiver_id: Option<String>,
        payload: serde_json::Value,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            message_type,
            sender_id,
            receiver_id,
            priority: MessagePriority::Normal,
            payload,
            created_at: chrono::Utc::now(),
            expires_at: None,
            retry_count: 0,
            max_retries: 3,
            requires_ack: false,
            correlation_id: None,
            metadata: HashMap::new(),
        }
    }
    
    /// 设置优先级
    pub fn with_priority(mut self, priority: MessagePriority) -> Self {
        self.priority = priority;
        self
    }
    
    /// 设置过期时间
    pub fn with_expiration(mut self, duration: Duration) -> Self {
        self.expires_at = Some(chrono::Utc::now() + chrono::Duration::from_std(duration).unwrap());
        self
    }
    
    /// 设置需要确认
    pub fn with_ack(mut self) -> Self {
        self.requires_ack = true;
        self
    }
    
    /// 设置关联 ID
    pub fn with_correlation_id(mut self, correlation_id: Uuid) -> Self {
        self.correlation_id = Some(correlation_id);
        self
    }
    
    /// 添加元数据
    pub fn with_metadata(mut self, key: String, value: String) -> Self {
        self.metadata.insert(key, value);
        self
    }
    
    /// 检查是否过期
    pub fn is_expired(&self) -> bool {
        if let Some(expires_at) = self.expires_at {
            chrono::Utc::now() > expires_at
        } else {
            false
        }
    }
    
    /// 是否可以重试
    pub fn can_retry(&self) -> bool {
        self.retry_count < self.max_retries
    }
    
    /// 增加重试计数
    pub fn increment_retry(&mut self) {
        self.retry_count += 1;
    }
}

/// 消息确认
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageAck {
    /// 消息 ID
    pub message_id: Uuid,
    /// 确认者 ID
    pub acknowledger_id: String,
    /// 确认时间
    pub acknowledged_at: chrono::DateTime<chrono::Utc>,
    /// 是否成功
    pub success: bool,
    /// 错误信息
    pub error: Option<String>,
}

/// 消息总线
pub struct MessageBus {
    /// 消息队列（按接收者分组）
    queues: Arc<RwLock<HashMap<String, VecDeque<Message>>>>,
    /// 广播通道
    broadcast_tx: broadcast::Sender<Message>,
    /// 消息确认映射
    acks: Arc<RwLock<HashMap<Uuid, MessageAck>>>,
    /// 待确认的消息
    pending_acks: Arc<RwLock<HashMap<Uuid, Message>>>,
    /// 消息历史（用于持久化）
    message_history: Arc<RwLock<VecDeque<Message>>>,
    /// 配置
    config: MessageBusConfig,
}

/// 消息总线配置
#[derive(Debug, Clone)]
pub struct MessageBusConfig {
    /// 广播通道容量
    pub broadcast_capacity: usize,
    /// 消息历史最大长度
    pub max_history_size: usize,
    /// 消息过期检查间隔（秒）
    pub expiration_check_interval_secs: u64,
    /// 确认超时时间（秒）
    pub ack_timeout_secs: u64,
}

impl Default for MessageBusConfig {
    fn default() -> Self {
        Self {
            broadcast_capacity: 1000,
            max_history_size: 10000,
            expiration_check_interval_secs: 60,
            ack_timeout_secs: 30,
        }
    }
}

impl MessageBus {
    /// 创建新的消息总线
    pub fn new() -> Self {
        Self::with_config(MessageBusConfig::default())
    }
    
    /// 使用配置创建消息总线
    pub fn with_config(config: MessageBusConfig) -> Self {
        let (broadcast_tx, _) = broadcast::channel(config.broadcast_capacity);
        
        info!("创建消息总线");
        
        Self {
            queues: Arc::new(RwLock::new(HashMap::new())),
            broadcast_tx,
            acks: Arc::new(RwLock::new(HashMap::new())),
            pending_acks: Arc::new(RwLock::new(HashMap::new())),
            message_history: Arc::new(RwLock::new(VecDeque::new())),
            config,
        }
    }
    
    /// 发送消息
    pub async fn send(&self, message: Message) -> Result<()> {
        debug!("发送消息: {} -> {:?}", message.sender_id, message.receiver_id);
        
        // 检查消息是否过期
        if message.is_expired() {
            return Err(AiContractError::internal_error("消息已过期"));
        }
        
        // 添加到历史记录
        self.add_to_history(message.clone()).await;
        
        // 如果需要确认，添加到待确认列表
        if message.requires_ack {
            let mut pending = self.pending_acks.write().await;
            pending.insert(message.id, message.clone());
        }
        
        // 根据接收者发送消息
        if let Some(receiver_id) = &message.receiver_id {
            // 点对点消息
            let mut queues = self.queues.write().await;
            queues
                .entry(receiver_id.clone())
                .or_insert_with(VecDeque::new)
                .push_back(message);
        } else {
            // 广播消息
            if let Err(e) = self.broadcast_tx.send(message) {
                warn!("广播消息失败: {}", e);
            }
        }
        
        Ok(())
    }
    
    /// 接收消息
    pub async fn receive(&self, receiver_id: &str) -> Option<Message> {
        let mut queues = self.queues.write().await;
        
        if let Some(queue) = queues.get_mut(receiver_id) {
            queue.pop_front()
        } else {
            None
        }
    }
    
    /// 订阅广播消息
    pub fn subscribe(&self) -> broadcast::Receiver<Message> {
        self.broadcast_tx.subscribe()
    }
    
    /// 确认消息
    pub async fn acknowledge(&self, message_id: Uuid, acknowledger_id: String, success: bool, error: Option<String>) -> Result<()> {
        debug!("确认消息: {} by {}", message_id, acknowledger_id);
        
        // 创建确认记录
        let ack = MessageAck {
            message_id,
            acknowledger_id,
            acknowledged_at: chrono::Utc::now(),
            success,
            error,
        };
        
        // 保存确认记录
        {
            let mut acks = self.acks.write().await;
            acks.insert(message_id, ack);
        }
        
        // 从待确认列表中移除
        {
            let mut pending = self.pending_acks.write().await;
            pending.remove(&message_id);
        }
        
        Ok(())
    }
    
    /// 获取消息确认状态
    pub async fn get_ack(&self, message_id: Uuid) -> Option<MessageAck> {
        let acks = self.acks.read().await;
        acks.get(&message_id).cloned()
    }
    
    /// 等待消息确认
    pub async fn wait_for_ack(&self, message_id: Uuid, timeout: Duration) -> Result<MessageAck> {
        let start = Instant::now();
        
        loop {
            if let Some(ack) = self.get_ack(message_id).await {
                return Ok(ack);
            }
            
            if start.elapsed() > timeout {
                return Err(AiContractError::internal_error("等待确认超时"));
            }
            
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    }
    
    /// 添加到历史记录
    async fn add_to_history(&self, message: Message) {
        let mut history = self.message_history.write().await;
        
        history.push_back(message);
        
        // 限制历史记录大小
        while history.len() > self.config.max_history_size {
            history.pop_front();
        }
    }
    
    /// 获取消息历史
    pub async fn get_history(&self, limit: usize) -> Vec<Message> {
        let history = self.message_history.read().await;
        history.iter().rev().take(limit).cloned().collect()
    }
    
    /// 清理过期消息
    pub async fn cleanup_expired(&self) {
        let mut queues = self.queues.write().await;
        
        for queue in queues.values_mut() {
            queue.retain(|msg| !msg.is_expired());
        }
        
        debug!("清理过期消息完成");
    }
    
    /// 清理超时的待确认消息
    pub async fn cleanup_pending_acks(&self) {
        let timeout = Duration::from_secs(self.config.ack_timeout_secs);
        let now = chrono::Utc::now();
        
        let mut pending = self.pending_acks.write().await;
        pending.retain(|_, msg| {
            let age = now.signed_duration_since(msg.created_at);
            age.to_std().unwrap_or(Duration::ZERO) < timeout
        });
        
        debug!("清理超时待确认消息完成");
    }
    
    /// 启动清理任务
    pub fn start_cleanup_task(&self) -> tokio::task::JoinHandle<()> {
        let queues = Arc::clone(&self.queues);
        let pending_acks = Arc::clone(&self.pending_acks);
        let interval_secs = self.config.expiration_check_interval_secs;
        let ack_timeout_secs = self.config.ack_timeout_secs;
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(interval_secs));
            
            loop {
                interval.tick().await;
                
                // 清理过期消息
                {
                    let mut queues = queues.write().await;
                    for queue in queues.values_mut() {
                        queue.retain(|msg| !msg.is_expired());
                    }
                }
                
                // 清理超时的待确认消息
                {
                    let timeout = Duration::from_secs(ack_timeout_secs);
                    let now = chrono::Utc::now();
                    
                    let mut pending = pending_acks.write().await;
                    pending.retain(|_, msg| {
                        let age = now.signed_duration_since(msg.created_at);
                        age.to_std().unwrap_or(Duration::ZERO) < timeout
                    });
                }
                
                debug!("消息总线清理完成");
            }
        })
    }
    
    /// 获取统计信息
    pub async fn get_stats(&self) -> MessageBusStats {
        let queues = self.queues.read().await;
        let pending_acks = self.pending_acks.read().await;
        let history = self.message_history.read().await;
        
        let total_queued: usize = queues.values().map(|q| q.len()).sum();
        
        MessageBusStats {
            total_queued_messages: total_queued,
            pending_acks: pending_acks.len(),
            history_size: history.len(),
            active_queues: queues.len(),
        }
    }
}

impl Default for MessageBus {
    fn default() -> Self {
        Self::new()
    }
}

/// 消息总线统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageBusStats {
    /// 队列中的消息总数
    pub total_queued_messages: usize,
    /// 待确认的消息数
    pub pending_acks: usize,
    /// 历史记录大小
    pub history_size: usize,
    /// 活跃队列数
    pub active_queues: usize,
}

/// 事件类型
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EventType {
    /// 任务提交
    TaskSubmitted,
    /// 任务开始
    TaskStarted,
    /// 任务完成
    TaskCompleted,
    /// 任务失败
    TaskFailed,
    /// 任务取消
    TaskCancelled,
    /// Agent 启动
    AgentStarted,
    /// Agent 停止
    AgentStopped,
    /// Agent 错误
    AgentError,
    /// 系统启动
    SystemStarted,
    /// 系统停止
    SystemStopped,
    /// 自定义事件
    Custom(String),
}

/// 事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    /// 事件 ID
    pub id: Uuid,
    /// 事件类型
    pub event_type: EventType,
    /// 事件源 ID
    pub source_id: Uuid,
    /// 事件数据
    pub data: serde_json::Value,
    /// 时间戳
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// 元数据
    pub metadata: HashMap<String, String>,
}

impl Event {
    /// 创建新事件
    pub fn new(event_type: EventType, source_id: Uuid, data: serde_json::Value) -> Self {
        Self {
            id: Uuid::new_v4(),
            event_type,
            source_id,
            data,
            timestamp: chrono::Utc::now(),
            metadata: HashMap::new(),
        }
    }
    
    /// 添加元数据
    pub fn with_metadata(mut self, key: String, value: String) -> Self {
        self.metadata.insert(key, value);
        self
    }
}

/// 事件处理器
#[async_trait::async_trait]
pub trait EventHandler: Send + Sync {
    /// 处理事件
    async fn handle(&self, event: &Event) -> Result<()>;
    
    /// 获取处理器 ID
    fn id(&self) -> String;
    
    /// 获取感兴趣的事件类型
    fn interested_events(&self) -> Vec<EventType>;
}

/// 事件总线
pub struct EventBus {
    /// 事件处理器
    handlers: Arc<RwLock<HashMap<EventType, Vec<Arc<dyn EventHandler>>>>>,
    /// 事件历史
    event_history: Arc<RwLock<VecDeque<Event>>>,
    /// 广播通道
    broadcast_tx: broadcast::Sender<Event>,
    /// 配置
    config: EventBusConfig,
}

/// 事件总线配置
#[derive(Debug, Clone)]
pub struct EventBusConfig {
    /// 广播通道容量
    pub broadcast_capacity: usize,
    /// 事件历史最大长度
    pub max_history_size: usize,
}

impl Default for EventBusConfig {
    fn default() -> Self {
        Self {
            broadcast_capacity: 1000,
            max_history_size: 10000,
        }
    }
}

impl EventBus {
    /// 创建新的事件总线
    pub fn new() -> Self {
        Self::with_config(EventBusConfig::default())
    }
    
    /// 使用配置创建事件总线
    pub fn with_config(config: EventBusConfig) -> Self {
        let (broadcast_tx, _) = broadcast::channel(config.broadcast_capacity);
        
        info!("创建事件总线");
        
        Self {
            handlers: Arc::new(RwLock::new(HashMap::new())),
            event_history: Arc::new(RwLock::new(VecDeque::new())),
            broadcast_tx,
            config,
        }
    }
    
    /// 注册事件处理器
    pub async fn register_handler(&self, handler: Arc<dyn EventHandler>) {
        let mut handlers = self.handlers.write().await;
        
        for event_type in handler.interested_events() {
            handlers
                .entry(event_type)
                .or_insert_with(Vec::new)
                .push(Arc::clone(&handler));
        }
        
        info!("注册事件处理器: {}", handler.id());
    }
    
    /// 发布事件
    pub async fn publish(&self, event: Event) {
        debug!("发布事件: {:?}", event.event_type);
        
        // 添加到历史记录
        self.add_to_history(event.clone()).await;
        
        // 广播事件
        if let Err(e) = self.broadcast_tx.send(event.clone()) {
            warn!("广播事件失败: {}", e);
        }
        
        // 调用注册的处理器
        let handlers = self.handlers.read().await;
        if let Some(event_handlers) = handlers.get(&event.event_type) {
            for handler in event_handlers {
                let handler = Arc::clone(handler);
                let event = event.clone();
                
                tokio::spawn(async move {
                    if let Err(e) = handler.handle(&event).await {
                        error!("事件处理器 {} 处理事件失败: {}", handler.id(), e);
                    }
                });
            }
        }
    }
    
    /// 订阅事件
    pub fn subscribe(&self) -> broadcast::Receiver<Event> {
        self.broadcast_tx.subscribe()
    }
    
    /// 添加到历史记录
    async fn add_to_history(&self, event: Event) {
        let mut history = self.event_history.write().await;
        
        history.push_back(event);
        
        // 限制历史记录大小
        while history.len() > self.config.max_history_size {
            history.pop_front();
        }
    }
    
    /// 获取事件历史
    pub async fn get_history(&self, limit: usize) -> Vec<Event> {
        let history = self.event_history.read().await;
        history.iter().rev().take(limit).cloned().collect()
    }
    
    /// 获取统计信息
    pub async fn get_stats(&self) -> EventBusStats {
        let handlers = self.handlers.read().await;
        let history = self.event_history.read().await;
        
        let total_handlers: usize = handlers.values().map(|v| v.len()).sum();
        
        EventBusStats {
            total_handlers,
            history_size: history.len(),
            event_types: handlers.len(),
        }
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new()
    }
}

/// 事件总线统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventBusStats {
    /// 处理器总数
    pub total_handlers: usize,
    /// 历史记录大小
    pub history_size: usize,
    /// 事件类型数
    pub event_types: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_message_bus() {
        let bus = MessageBus::new();
        
        let message = Message::new(
            MessageType::TaskRequest,
            "sender".to_string(),
            Some("receiver".to_string()),
            serde_json::json!({"test": "data"}),
        );
        
        bus.send(message.clone()).await.unwrap();
        
        let received = bus.receive("receiver").await;
        assert!(received.is_some());
        assert_eq!(received.unwrap().id, message.id);
    }

    #[tokio::test]
    async fn test_message_ack() {
        let bus = MessageBus::new();
        
        let message = Message::new(
            MessageType::TaskRequest,
            "sender".to_string(),
            Some("receiver".to_string()),
            serde_json::json!({"test": "data"}),
        ).with_ack();
        
        let message_id = message.id;
        bus.send(message).await.unwrap();
        
        bus.acknowledge(message_id, "receiver".to_string(), true, None).await.unwrap();
        
        let ack = bus.get_ack(message_id).await;
        assert!(ack.is_some());
        assert!(ack.unwrap().success);
    }

    #[tokio::test]
    async fn test_event_bus() {
        let bus = EventBus::new();
        
        let event = Event::new(
            EventType::TaskSubmitted,
            Uuid::new_v4(),
            serde_json::json!({"task_id": "test"}),
        );
        
        bus.publish(event.clone()).await;
        
        let history = bus.get_history(10).await;
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].id, event.id);
    }
}
