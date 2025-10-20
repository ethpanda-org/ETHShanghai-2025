//! 任务队列和调度系统
//! 
//! 实现基于优先级的任务队列、依赖关系管理和任务调度

use crate::error::{AiContractError, Result};
use crate::types::*;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet, VecDeque};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{RwLock, Semaphore, Notify};
use tokio::time::timeout;
use tracing::{info, warn, error, debug};
use uuid::Uuid;

/// 任务优先级
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum TaskPriority {
    /// 低优先级
    Low = 0,
    /// 正常优先级
    Normal = 1,
    /// 高优先级
    High = 2,
    /// 紧急优先级
    Urgent = 3,
}

impl Default for TaskPriority {
    fn default() -> Self {
        TaskPriority::Normal
    }
}

/// 任务依赖关系
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDependency {
    /// 依赖的任务 ID
    pub task_id: Uuid,
    /// 依赖类型
    pub dependency_type: DependencyType,
}

/// 依赖类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DependencyType {
    /// 必须等待依赖任务完成
    MustComplete,
    /// 可选依赖，如果依赖任务失败也可以继续
    Optional,
}

/// 任务重试配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    /// 最大重试次数
    pub max_retries: u32,
    /// 当前重试次数
    pub current_retry: u32,
    /// 重试延迟（秒）
    pub retry_delay_secs: u64,
    /// 指数退避因子
    pub backoff_multiplier: f64,
    /// 最大重试延迟（秒）
    pub max_retry_delay_secs: u64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            current_retry: 0,
            retry_delay_secs: 5,
            backoff_multiplier: 2.0,
            max_retry_delay_secs: 300,
        }
    }
}

impl RetryConfig {
    /// 计算下次重试延迟
    pub fn next_retry_delay(&self) -> Duration {
        let delay_secs = (self.retry_delay_secs as f64 
            * self.backoff_multiplier.powi(self.current_retry as i32))
            .min(self.max_retry_delay_secs as f64) as u64;
        
        Duration::from_secs(delay_secs)
    }
    
    /// 是否可以重试
    pub fn can_retry(&self) -> bool {
        self.current_retry < self.max_retries
    }
    
    /// 增加重试计数
    pub fn increment_retry(&mut self) {
        self.current_retry += 1;
    }
}

/// 队列中的任务
#[derive(Debug, Clone)]
pub struct QueuedTask {
    /// 任务
    pub task: ContractGenerationTask,
    /// 优先级
    pub priority: TaskPriority,
    /// 依赖关系
    pub dependencies: Vec<TaskDependency>,
    /// 重试配置
    pub retry_config: RetryConfig,
    /// 超时时间（秒）
    pub timeout_secs: u64,
    /// 入队时间
    pub enqueued_at: Instant,
    /// 开始执行时间
    pub started_at: Option<Instant>,
}

impl QueuedTask {
    /// 创建新的队列任务
    pub fn new(task: ContractGenerationTask) -> Self {
        Self {
            task,
            priority: TaskPriority::Normal,
            dependencies: Vec::new(),
            retry_config: RetryConfig::default(),
            timeout_secs: 300,
            enqueued_at: Instant::now(),
            started_at: None,
        }
    }
    
    /// 设置优先级
    pub fn with_priority(mut self, priority: TaskPriority) -> Self {
        self.priority = priority;
        self
    }
    
    /// 添加依赖
    pub fn with_dependency(mut self, dependency: TaskDependency) -> Self {
        self.dependencies.push(dependency);
        self
    }
    
    /// 设置重试配置
    pub fn with_retry_config(mut self, retry_config: RetryConfig) -> Self {
        self.retry_config = retry_config;
        self
    }
    
    /// 设置超时时间
    pub fn with_timeout(mut self, timeout_secs: u64) -> Self {
        self.timeout_secs = timeout_secs;
        self
    }
    
    /// 获取等待时间
    pub fn wait_time(&self) -> Duration {
        self.enqueued_at.elapsed()
    }
    
    /// 获取执行时间
    pub fn execution_time(&self) -> Option<Duration> {
        self.started_at.map(|t| t.elapsed())
    }
}

/// 用于优先级队列的包装器
struct PriorityQueueItem {
    task: QueuedTask,
    sequence: u64, // 用于相同优先级时的 FIFO 排序
}

impl PartialEq for PriorityQueueItem {
    fn eq(&self, other: &Self) -> bool {
        self.task.priority == other.task.priority && self.sequence == other.sequence
    }
}

impl Eq for PriorityQueueItem {}

impl PartialOrd for PriorityQueueItem {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for PriorityQueueItem {
    fn cmp(&self, other: &Self) -> Ordering {
        // 首先按优先级排序（高优先级在前）
        match self.task.priority.cmp(&other.task.priority) {
            Ordering::Equal => {
                // 相同优先级时，按序列号排序（FIFO）
                other.sequence.cmp(&self.sequence)
            }
            other => other,
        }
    }
}

/// 任务队列
pub struct TaskQueue {
    /// 优先级队列
    queue: BinaryHeap<PriorityQueueItem>,
    /// 序列号计数器
    sequence_counter: u64,
    /// 任务映射（用于快速查找）
    task_map: HashMap<Uuid, QueuedTask>,
    /// 依赖关系图
    dependency_graph: HashMap<Uuid, Vec<Uuid>>, // task_id -> dependent_task_ids
    /// 已完成的任务
    completed_tasks: HashSet<Uuid>,
    /// 失败的任务
    failed_tasks: HashSet<Uuid>,
}

impl TaskQueue {
    /// 创建新的任务队列
    pub fn new() -> Self {
        Self {
            queue: BinaryHeap::new(),
            sequence_counter: 0,
            task_map: HashMap::new(),
            dependency_graph: HashMap::new(),
            completed_tasks: HashSet::new(),
            failed_tasks: HashSet::new(),
        }
    }
    
    /// 入队任务
    pub fn enqueue(&mut self, task: QueuedTask) -> Result<()> {
        let task_id = task.task.id;
        
        // 检查任务是否已存在
        if self.task_map.contains_key(&task_id) {
            return Err(AiContractError::internal_error("任务已存在于队列中"));
        }
        
        // 验证依赖关系
        for dep in &task.dependencies {
            if !self.task_map.contains_key(&dep.task_id) 
                && !self.completed_tasks.contains(&dep.task_id) {
                if dep.dependency_type == DependencyType::MustComplete {
                    return Err(AiContractError::internal_error(
                        format!("依赖的任务 {} 不存在", dep.task_id)
                    ));
                }
            }
        }
        
        // 构建依赖关系图
        for dep in &task.dependencies {
            self.dependency_graph
                .entry(dep.task_id)
                .or_insert_with(Vec::new)
                .push(task_id);
        }
        
        // 添加到队列
        let sequence = self.sequence_counter;
        self.sequence_counter += 1;
        
        self.queue.push(PriorityQueueItem {
            task: task.clone(),
            sequence,
        });
        
        self.task_map.insert(task_id, task);
        
        debug!("任务 {} 已入队，优先级: {:?}", task_id, self.task_map[&task_id].priority);
        Ok(())
    }
    
    /// 出队任务（获取下一个可执行的任务）
    pub fn dequeue(&mut self) -> Option<QueuedTask> {
        while let Some(item) = self.queue.pop() {
            let task_id = item.task.task.id;
            
            // 检查任务是否仍在映射中（可能已被取消）
            if !self.task_map.contains_key(&task_id) {
                continue;
            }
            
            // 检查依赖是否满足
            if self.check_dependencies(&item.task) {
                let mut task = self.task_map.remove(&task_id).unwrap();
                task.started_at = Some(Instant::now());
                
                debug!("任务 {} 出队，等待时间: {:?}", task_id, task.wait_time());
                return Some(task);
            } else {
                // 依赖未满足，重新入队
                self.queue.push(item);
                // 避免无限循环
                break;
            }
        }
        
        None
    }
    
    /// 检查任务依赖是否满足
    fn check_dependencies(&self, task: &QueuedTask) -> bool {
        for dep in &task.dependencies {
            match dep.dependency_type {
                DependencyType::MustComplete => {
                    if !self.completed_tasks.contains(&dep.task_id) {
                        return false;
                    }
                }
                DependencyType::Optional => {
                    // 可选依赖，不影响执行
                }
            }
        }
        true
    }
    
    /// 标记任务完成
    pub fn mark_completed(&mut self, task_id: Uuid) {
        self.completed_tasks.insert(task_id);
        self.task_map.remove(&task_id);
        
        debug!("任务 {} 标记为完成", task_id);
    }
    
    /// 标记任务失败
    pub fn mark_failed(&mut self, task_id: Uuid) {
        self.failed_tasks.insert(task_id);
        self.task_map.remove(&task_id);
        
        debug!("任务 {} 标记为失败", task_id);
    }
    
    /// 取消任务
    pub fn cancel(&mut self, task_id: Uuid) -> Result<()> {
        if let Some(task) = self.task_map.remove(&task_id) {
            // 取消依赖此任务的所有任务
            if let Some(dependent_ids) = self.dependency_graph.get(&task_id) {
                for dep_id in dependent_ids.clone() {
                    self.cancel(dep_id)?;
                }
            }
            
            debug!("任务 {} 已取消", task_id);
            Ok(())
        } else {
            Err(AiContractError::internal_error("任务不存在"))
        }
    }
    
    /// 获取队列大小
    pub fn size(&self) -> usize {
        self.task_map.len()
    }
    
    /// 是否为空
    pub fn is_empty(&self) -> bool {
        self.task_map.is_empty()
    }
    
    /// 获取任务
    pub fn get_task(&self, task_id: &Uuid) -> Option<&QueuedTask> {
        self.task_map.get(task_id)
    }
    
    /// 获取所有待处理任务
    pub fn pending_tasks(&self) -> Vec<&QueuedTask> {
        self.task_map.values().collect()
    }
    
    /// 清理已完成和失败的任务记录
    pub fn cleanup(&mut self, retention_count: usize) {
        if self.completed_tasks.len() > retention_count {
            let to_remove = self.completed_tasks.len() - retention_count;
            let ids_to_remove: Vec<_> = self.completed_tasks.iter()
                .take(to_remove)
                .cloned()
                .collect();
            
            for id in ids_to_remove {
                self.completed_tasks.remove(&id);
                self.dependency_graph.remove(&id);
            }
        }
        
        if self.failed_tasks.len() > retention_count {
            let to_remove = self.failed_tasks.len() - retention_count;
            let ids_to_remove: Vec<_> = self.failed_tasks.iter()
                .take(to_remove)
                .cloned()
                .collect();
            
            for id in ids_to_remove {
                self.failed_tasks.remove(&id);
                self.dependency_graph.remove(&id);
            }
        }
    }
}

impl Default for TaskQueue {
    fn default() -> Self {
        Self::new()
    }
}

/// 任务调度器
pub struct TaskScheduler {
    /// 任务队列
    queue: Arc<RwLock<TaskQueue>>,
    /// 并发控制信号量
    semaphore: Arc<Semaphore>,
    /// 通知机制
    notify: Arc<Notify>,
    /// 调度器配置
    config: SchedulerConfig,
    /// 正在执行的任务
    running_tasks: Arc<RwLock<HashMap<Uuid, RunningTaskInfo>>>,
}

/// 调度器配置
#[derive(Debug, Clone)]
pub struct SchedulerConfig {
    /// 最大并发任务数
    pub max_concurrent_tasks: usize,
    /// 任务超时时间（秒）
    pub default_timeout_secs: u64,
    /// 队列清理间隔（秒）
    pub cleanup_interval_secs: u64,
    /// 保留的已完成任务数量
    pub retention_count: usize,
}

impl Default for SchedulerConfig {
    fn default() -> Self {
        Self {
            max_concurrent_tasks: 10,
            default_timeout_secs: 300,
            cleanup_interval_secs: 3600,
            retention_count: 1000,
        }
    }
}

/// 正在执行的任务信息
#[derive(Debug, Clone)]
pub struct RunningTaskInfo {
    /// 任务 ID
    pub task_id: Uuid,
    /// 开始时间
    pub started_at: Instant,
    /// 超时时间
    pub timeout: Duration,
}

impl TaskScheduler {
    /// 创建新的任务调度器
    pub fn new(config: SchedulerConfig) -> Self {
        info!("创建任务调度器，最大并发数: {}", config.max_concurrent_tasks);
        
        Self {
            queue: Arc::new(RwLock::new(TaskQueue::new())),
            semaphore: Arc::new(Semaphore::new(config.max_concurrent_tasks)),
            notify: Arc::new(Notify::new()),
            config,
            running_tasks: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// 提交任务
    pub async fn submit(&self, task: QueuedTask) -> Result<()> {
        let task_id = task.task.id;
        
        {
            let mut queue = self.queue.write().await;
            queue.enqueue(task)?;
        }
        
        info!("任务 {} 已提交到调度器", task_id);
        
        // 通知调度器有新任务
        self.notify.notify_one();
        
        Ok(())
    }
    
    /// 获取下一个任务
    pub async fn next_task(&self) -> Option<QueuedTask> {
        let mut queue = self.queue.write().await;
        queue.dequeue()
    }
    
    /// 等待任务可用
    pub async fn wait_for_task(&self) {
        self.notify.notified().await;
    }
    
    /// 获取执行许可
    pub async fn acquire_permit(&self) -> Result<tokio::sync::SemaphorePermit<'_>> {
        self.semaphore.acquire().await
            .map_err(|_| AiContractError::internal_error("获取执行许可失败"))
    }
    
    /// 标记任务开始执行
    pub async fn mark_running(&self, task: &QueuedTask) {
        let info = RunningTaskInfo {
            task_id: task.task.id,
            started_at: Instant::now(),
            timeout: Duration::from_secs(task.timeout_secs),
        };
        
        let mut running = self.running_tasks.write().await;
        running.insert(task.task.id, info);
    }
    
    /// 标记任务完成
    pub async fn mark_completed(&self, task_id: Uuid) {
        {
            let mut queue = self.queue.write().await;
            queue.mark_completed(task_id);
        }
        
        {
            let mut running = self.running_tasks.write().await;
            running.remove(&task_id);
        }
        
        info!("任务 {} 完成", task_id);
    }
    
    /// 标记任务失败
    pub async fn mark_failed(&self, task_id: Uuid) {
        {
            let mut queue = self.queue.write().await;
            queue.mark_failed(task_id);
        }
        
        {
            let mut running = self.running_tasks.write().await;
            running.remove(&task_id);
        }
        
        warn!("任务 {} 失败", task_id);
    }
    
    /// 重新提交任务（用于重试）
    pub async fn resubmit(&self, mut task: QueuedTask) -> Result<()> {
        if !task.retry_config.can_retry() {
            return Err(AiContractError::internal_error("任务已达到最大重试次数"));
        }
        
        task.retry_config.increment_retry();
        let delay = task.retry_config.next_retry_delay();
        
        info!("任务 {} 将在 {:?} 后重试（第 {} 次）", 
            task.task.id, delay, task.retry_config.current_retry);
        
        // 等待重试延迟
        tokio::time::sleep(delay).await;
        
        // 重新入队
        self.submit(task).await
    }
    
    /// 取消任务
    pub async fn cancel(&self, task_id: Uuid) -> Result<()> {
        let mut queue = self.queue.write().await;
        queue.cancel(task_id)
    }
    
    /// 获取队列大小
    pub async fn queue_size(&self) -> usize {
        let queue = self.queue.read().await;
        queue.size()
    }
    
    /// 获取正在执行的任务数
    pub async fn running_count(&self) -> usize {
        let running = self.running_tasks.read().await;
        running.len()
    }
    
    /// 获取可用许可数
    pub fn available_permits(&self) -> usize {
        self.semaphore.available_permits()
    }
    
    /// 检查超时任务
    pub async fn check_timeouts(&self) -> Vec<Uuid> {
        let running = self.running_tasks.read().await;
        let now = Instant::now();
        
        running.values()
            .filter(|info| now.duration_since(info.started_at) > info.timeout)
            .map(|info| info.task_id)
            .collect()
    }
    
    /// 启动定期清理任务
    pub fn start_cleanup_task(&self) -> tokio::task::JoinHandle<()> {
        let queue = Arc::clone(&self.queue);
        let interval_secs = self.config.cleanup_interval_secs;
        let retention_count = self.config.retention_count;
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(interval_secs));
            
            loop {
                interval.tick().await;
                
                let mut queue = queue.write().await;
                queue.cleanup(retention_count);
                
                debug!("任务队列清理完成");
            }
        })
    }
    
    /// 获取调度器统计信息
    pub async fn get_stats(&self) -> SchedulerStats {
        let queue = self.queue.read().await;
        let running = self.running_tasks.read().await;
        
        SchedulerStats {
            queued_tasks: queue.size(),
            running_tasks: running.len(),
            available_permits: self.available_permits(),
            completed_tasks: queue.completed_tasks.len(),
            failed_tasks: queue.failed_tasks.len(),
        }
    }
}

/// 调度器统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchedulerStats {
    /// 队列中的任务数
    pub queued_tasks: usize,
    /// 正在执行的任务数
    pub running_tasks: usize,
    /// 可用的执行许可数
    pub available_permits: usize,
    /// 已完成的任务数
    pub completed_tasks: usize,
    /// 失败的任务数
    pub failed_tasks: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_priority() {
        assert!(TaskPriority::Urgent > TaskPriority::High);
        assert!(TaskPriority::High > TaskPriority::Normal);
        assert!(TaskPriority::Normal > TaskPriority::Low);
    }

    #[test]
    fn test_retry_config() {
        let mut config = RetryConfig::default();
        
        assert!(config.can_retry());
        assert_eq!(config.next_retry_delay(), Duration::from_secs(5));
        
        config.increment_retry();
        assert_eq!(config.next_retry_delay(), Duration::from_secs(10));
        
        config.increment_retry();
        assert_eq!(config.next_retry_delay(), Duration::from_secs(20));
        
        config.increment_retry();
        assert!(!config.can_retry());
    }

    #[tokio::test]
    async fn test_task_queue() {
        let mut queue = TaskQueue::new();
        
        let task1 = QueuedTask::new(ContractGenerationTask::new(
            "test1".to_string(),
            TaskConfig::default(),
        )).with_priority(TaskPriority::Normal);
        
        let task2 = QueuedTask::new(ContractGenerationTask::new(
            "test2".to_string(),
            TaskConfig::default(),
        )).with_priority(TaskPriority::High);
        
        queue.enqueue(task1).unwrap();
        queue.enqueue(task2).unwrap();
        
        assert_eq!(queue.size(), 2);
        
        // 高优先级任务应该先出队
        let next = queue.dequeue().unwrap();
        assert_eq!(next.priority, TaskPriority::High);
        
        let next = queue.dequeue().unwrap();
        assert_eq!(next.priority, TaskPriority::Normal);
        
        assert!(queue.is_empty());
    }

    #[tokio::test]
    async fn test_task_scheduler() {
        let config = SchedulerConfig {
            max_concurrent_tasks: 2,
            ..Default::default()
        };
        
        let scheduler = TaskScheduler::new(config);
        
        let task = QueuedTask::new(ContractGenerationTask::new(
            "test".to_string(),
            TaskConfig::default(),
        ));
        
        scheduler.submit(task).await.unwrap();
        
        assert_eq!(scheduler.queue_size().await, 1);
        assert_eq!(scheduler.available_permits(), 2);
        
        let next = scheduler.next_task().await.unwrap();
        assert_eq!(scheduler.queue_size().await, 0);
        
        scheduler.mark_completed(next.task.id).await;
        
        let stats = scheduler.get_stats().await;
        assert_eq!(stats.completed_tasks, 1);
    }
}
