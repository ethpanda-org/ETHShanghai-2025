use crate::strategy::{GridStrategy, StrategyExecutor};
use crate::exchanges::ExchangeAdapter;
use crate::services::PriceMonitorService;
use crate::database::operations::{StrategyOperations, CreateStrategyRequest};
use crate::models::{GridConfig, StrategyStatus};
use anyhow::Result;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn, error};
use uuid::Uuid;

/// 策略管理服务
/// 负责管理所有运行中的策略和价格监控
pub struct StrategyManager {
    /// 数据库连接池
    db_pool: Arc<PgPool>,
    /// 运行中的策略执行器 (strategy_id -> executor)
    executors: Arc<RwLock<HashMap<Uuid, StrategyExecutor>>>,
    /// 价格监控服务
    price_monitor: Arc<RwLock<PriceMonitorService>>,
    /// 是否运行中
    is_running: bool,
}

impl StrategyManager {
    /// 创建新的策略管理服务
    pub fn new(db_pool: Arc<PgPool>) -> Self {
        let price_monitor = Arc::new(RwLock::new(PriceMonitorService::new(db_pool.clone())));
        
        Self {
            db_pool,
            executors: Arc::new(RwLock::new(HashMap::new())),
            price_monitor,
            is_running: false,
        }
    }

    /// 启动策略管理服务
    pub async fn start(&mut self) -> Result<()> {
        if self.is_running {
            warn!("策略管理服务已在运行中");
            return Ok(());
        }

        self.is_running = true;
        info!("🚀 启动策略管理服务");

        // 启动价格监控服务
        let price_monitor = self.price_monitor.clone();
        tokio::spawn(async move {
            let mut monitor = price_monitor.write().await;
            if let Err(e) = monitor.start().await {
                error!("价格监控服务启动失败: {}", e);
            }
        });

        // 恢复之前运行的策略
        self.recover_running_strategies().await?;

        info!("策略管理服务启动完成");
        Ok(())
    }

    /// 停止策略管理服务
    pub async fn stop(&mut self) -> Result<()> {
        if !self.is_running {
            return Ok(());
        }

        info!("正在停止策略管理服务...");
        self.is_running = false;

        // 停止所有策略执行器
        let mut executors = self.executors.write().await;
        for (strategy_id, mut executor) in executors.drain() {
            info!("停止策略: {}", strategy_id);
            executor.stop();
        }

        // 停止价格监控服务
        let mut price_monitor = self.price_monitor.write().await;
        price_monitor.stop();

        info!("策略管理服务已停止");
        Ok(())
    }

    /// 启动新策略
    pub async fn start_strategy(
        &self,
        config: GridConfig,
        exchange_adapter: Arc<dyn ExchangeAdapter + Send + Sync>,
    ) -> Result<Uuid> {
        // 解析交易对
        let pair_parts: Vec<&str> = config.pair.split('/').collect();
        if pair_parts.len() != 2 {
            return Err(anyhow::anyhow!("无效的交易对格式，应为 BASE/QUOTE"));
        }
        let base_token = pair_parts[0].to_string();
        let quote_token = pair_parts[1].to_string();
        
        // 1. 在数据库中创建策略记录
        let strategy_request = CreateStrategyRequest {
            user_id: config.private_key.clone(), // 简化，使用私钥作为用户ID
            token_pair: config.pair.clone(),
            base_token: base_token.clone(),
            quote_token: quote_token.clone(),
            base_token_symbol: Some(base_token.clone()),
            quote_token_symbol: Some(quote_token.clone()),
            grid_count: config.grid_count as i32,
            price_range_min: rust_decimal::Decimal::from_f64_retain(config.lower_price)
                .ok_or_else(|| anyhow::anyhow!("无效的下限价格"))?,
            price_range_max: rust_decimal::Decimal::from_f64_retain(config.upper_price)
                .ok_or_else(|| anyhow::anyhow!("无效的上限价格"))?,
            total_investment: rust_decimal::Decimal::from_f64_retain(config.total_amount)
                .ok_or_else(|| anyhow::anyhow!("无效的投资金额"))?,
        };

        let strategy_record = StrategyOperations::create_strategy(&self.db_pool, strategy_request).await?;
        let strategy_id = strategy_record.id;

        // 2. 创建网格策略
        let grid_strategy = GridStrategy::new(config)?;

        // 3. 创建策略执行器
        let executor = StrategyExecutor::new(
            grid_strategy,
            exchange_adapter.clone(),
            strategy_id,
        );

        // 4. 注册到价格监控服务
        {
            let mut price_monitor = self.price_monitor.write().await;
            price_monitor.register_adapter(strategy_id, exchange_adapter);
        }

        // 5. 启动策略执行器
        let executor_clone = executor.clone();
        let executors = self.executors.clone();
        tokio::spawn(async move {
            let mut exec = executor_clone;
            if let Err(e) = exec.run().await {
                error!("策略 {} 执行失败: {}", strategy_id, e);
            }
            
            // 策略结束后从执行器列表中移除
            let mut executors = executors.write().await;
            executors.remove(&strategy_id);
        });

        // 6. 添加到执行器列表
        {
            let mut executors = self.executors.write().await;
            executors.insert(strategy_id, executor);
        }

        info!("策略 {} 启动成功", strategy_id);
        Ok(strategy_id)
    }

    /// 停止策略
    pub async fn stop_strategy(&self, strategy_id: Uuid) -> Result<()> {
        // 1. 从执行器列表中移除并停止
        let executor = {
            let mut executors = self.executors.write().await;
            executors.remove(&strategy_id)
        };

        if let Some(mut executor) = executor {
            executor.stop();
            info!("策略 {} 已停止", strategy_id);
        } else {
            warn!("策略 {} 未找到或已停止", strategy_id);
        }

        // 2. 从价格监控服务中移除
        {
            let mut price_monitor = self.price_monitor.write().await;
            price_monitor.unregister_adapter(&strategy_id);
        }

        // 3. 更新数据库中的策略状态
        if let Err(e) = StrategyOperations::update_strategy_status(&self.db_pool, strategy_id, "stopped").await {
            error!("更新策略状态失败: {}", e);
        }

        Ok(())
    }

    /// 暂停策略
    pub async fn pause_strategy(&self, strategy_id: Uuid) -> Result<()> {
        let executors = self.executors.read().await;
        if let Some(executor) = executors.get(&strategy_id) {
            let mut exec = executor.clone();
            exec.pause();
            info!("策略 {} 已暂停", strategy_id);
        } else {
            return Err(anyhow::anyhow!("策略 {} 未找到", strategy_id));
        }

        // 更新数据库中的策略状态
        if let Err(e) = StrategyOperations::update_strategy_status(&self.db_pool, strategy_id, "paused").await {
            error!("更新策略状态失败: {}", e);
        }

        Ok(())
    }

    /// 恢复策略
    pub async fn resume_strategy(&self, strategy_id: Uuid) -> Result<()> {
        let executors = self.executors.read().await;
        if let Some(executor) = executors.get(&strategy_id) {
            let mut exec = executor.clone();
            exec.resume();
            info!("策略 {} 已恢复", strategy_id);
        } else {
            return Err(anyhow::anyhow!("策略 {} 未找到", strategy_id));
        }

        // 更新数据库中的策略状态
        if let Err(e) = StrategyOperations::update_strategy_status(&self.db_pool, strategy_id, "active").await {
            error!("更新策略状态失败: {}", e);
        }

        Ok(())
    }

    /// 获取策略状态
    pub async fn get_strategy_status(&self, strategy_id: Uuid) -> Result<Option<StrategyStatus>> {
        let executors = self.executors.read().await;
        if let Some(executor) = executors.get(&strategy_id) {
            Ok(Some(executor.get_status().clone()))
        } else {
            Ok(None)
        }
    }

    /// 获取所有运行中的策略
    pub async fn get_running_strategies(&self) -> Vec<Uuid> {
        let executors = self.executors.read().await;
        executors.keys().cloned().collect()
    }

    /// 获取价格监控服务统计信息
    pub async fn get_monitor_stats(&self) -> (usize, usize) {
        let price_monitor = self.price_monitor.read().await;
        let strategy_count = price_monitor.get_strategy_count();
        let price_cache_size = price_monitor.get_price_cache().len();
        (strategy_count, price_cache_size)
    }

    /// 恢复之前运行的策略
    async fn recover_running_strategies(&self) -> Result<()> {
        // 查询数据库中状态为 'active' 的策略
        let active_strategies = sqlx::query!(
            "SELECT id FROM strategies WHERE status = 'active'"
        )
        .fetch_all(&*self.db_pool)
        .await?;

        if active_strategies.is_empty() {
            info!("没有需要恢复的策略");
            return Ok(());
        }

        info!("发现 {} 个需要恢复的策略", active_strategies.len());

        for strategy in active_strategies {
            // 这里需要根据策略配置重新创建执行器
            // 简化实现，实际需要从数据库加载完整配置
            warn!("策略 {} 需要手动重启", strategy.id);
        }

        Ok(())
    }
}