use crate::exchanges::ExchangeAdapter;
use crate::database::operations::OrderOperations;
use crate::models::OrderStatus;
use anyhow::Result;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::time::{Duration, interval};
use tracing::{info, warn, error, debug};
use uuid::Uuid;

/// 价格监控服务
/// 负责监控市场价格并触发限价单执行
pub struct PriceMonitorService {
    /// 数据库连接池
    db_pool: Arc<PgPool>,
    /// 交易所适配器映射 (strategy_id -> adapter)
    adapters: HashMap<Uuid, Arc<dyn ExchangeAdapter + Send + Sync>>,
    /// 价格检查间隔
    check_interval: Duration,
    /// 当前价格缓存 (pair -> price)
    price_cache: HashMap<String, f64>,
    /// 是否运行中
    is_running: bool,
}

impl PriceMonitorService {
    /// 创建新的价格监控服务
    pub fn new(db_pool: Arc<PgPool>) -> Self {
        Self {
            db_pool,
            adapters: HashMap::new(),
            check_interval: Duration::from_secs(5),
            price_cache: HashMap::new(),
            is_running: false,
        }
    }

    /// 注册策略的交易所适配器
    pub fn register_adapter(&mut self, strategy_id: Uuid, adapter: Arc<dyn ExchangeAdapter + Send + Sync>) {
        let adapter_name = adapter.get_name().to_string();
        self.adapters.insert(strategy_id, adapter);
        info!("已注册策略 {} 的交易所适配器: {}", strategy_id, adapter_name);
    }

    /// 移除策略的交易所适配器
    pub fn unregister_adapter(&mut self, strategy_id: &Uuid) {
        if self.adapters.remove(strategy_id).is_some() {
            info!("已移除策略 {} 的交易所适配器", strategy_id);
        }
    }

    /// 启动价格监控服务
    pub async fn start(&mut self) -> Result<()> {
        if self.is_running {
            warn!("价格监控服务已在运行中");
            return Ok(());
        }

        self.is_running = true;
        info!("🚀 启动价格监控服务，检查间隔: {:?}", self.check_interval);

        let mut interval = interval(self.check_interval);
        
        while self.is_running {
            interval.tick().await;
            
            if let Err(e) = self.monitor_cycle().await {
                error!("价格监控周期执行失败: {}", e);
                // 继续运行，不因单次错误而停止服务
            }
        }

        info!("价格监控服务已停止");
        Ok(())
    }

    /// 停止价格监控服务
    pub fn stop(&mut self) {
        self.is_running = false;
        info!("正在停止价格监控服务...");
    }

    /// 执行一次监控周期
    async fn monitor_cycle(&mut self) -> Result<()> {
        debug!("开始价格监控周期");

        // 1. 获取所有待处理的订单
        let pending_orders = self.get_all_pending_orders().await?;
        
        if pending_orders.is_empty() {
            debug!("没有待处理的订单");
            return Ok(());
        }

        info!("发现 {} 个待处理订单", pending_orders.len());

        // 2. 按交易对分组订单
        let mut orders_by_pair: HashMap<String, Vec<_>> = HashMap::new();
        for order in pending_orders {
            let pair = self.extract_pair_from_order(&order)?;
            orders_by_pair.entry(pair).or_default().push(order);
        }

        // 3. 为每个交易对更新价格并检查订单
        for (pair, orders) in orders_by_pair {
            if let Err(e) = self.process_pair_orders(&pair, orders).await {
                error!("处理交易对 {} 的订单失败: {}", pair, e);
            }
        }

        debug!("价格监控周期完成");
        Ok(())
    }

    /// 获取所有待处理的订单
    async fn get_all_pending_orders(&self) -> Result<Vec<PendingOrder>> {
        let rows = sqlx::query!(
            r#"
            SELECT 
                go.id,
                go.strategy_id,
                go.order_type,
                go.price,
                go.amount,
                s.token_pair
            FROM grid_orders go
            JOIN strategies s ON go.strategy_id = s.id
            WHERE go.status = 'pending'
            ORDER BY go.created_at ASC
            "#
        )
        .fetch_all(&*self.db_pool)
        .await?;

        let orders = rows.into_iter().map(|row| PendingOrder {
            id: row.id,
            strategy_id: row.strategy_id,
            order_type: row.order_type,
            price: row.price,
            amount: row.amount,
            token_pair: row.token_pair,
        }).collect();

        Ok(orders)
    }

    /// 从订单中提取交易对信息
    fn extract_pair_from_order(&self, order: &PendingOrder) -> Result<String> {
        // 简化实现，实际可能需要更复杂的逻辑
        Ok(order.token_pair.clone())
    }

    /// 处理特定交易对的所有订单
    async fn process_pair_orders(&mut self, pair: &str, orders: Vec<PendingOrder>) -> Result<()> {
        // 1. 获取当前价格
        let current_price = self.get_current_price(pair, &orders).await?;
        
        // 2. 更新价格缓存
        self.price_cache.insert(pair.to_string(), current_price);
        
        debug!("交易对 {} 当前价格: {}", pair, current_price);

        // 3. 检查每个订单是否应该执行
        for order in orders {
            if let Err(e) = self.check_and_execute_order(&order, current_price).await {
                error!("检查订单 {} 失败: {}", order.id, e);
            }
        }

        Ok(())
    }

    /// 获取交易对的当前价格
    async fn get_current_price(&self, pair: &str, orders: &[PendingOrder]) -> Result<f64> {
        // 从第一个订单获取策略ID，然后找到对应的适配器
        if let Some(order) = orders.first() {
            if let Some(adapter) = self.adapters.get(&order.strategy_id) {
                return adapter.get_price(pair).await;
            }
        }

        // 如果没有找到适配器，尝试使用缓存的价格
        if let Some(&cached_price) = self.price_cache.get(pair) {
            warn!("未找到适配器，使用缓存价格: {} = {}", pair, cached_price);
            return Ok(cached_price);
        }

        Err(anyhow::anyhow!("无法获取交易对 {} 的价格", pair))
    }

    /// 检查订单是否应该执行，如果是则执行
    async fn check_and_execute_order(&self, order: &PendingOrder, current_price: f64) -> Result<()> {
        let should_execute = match order.order_type.as_str() {
            "buy" => {
                // 买单：当前价格 <= 限价时执行
                let limit_price = order.price.to_string().parse::<f64>()?;
                current_price <= limit_price
            },
            "sell" => {
                // 卖单：当前价格 >= 限价时执行
                let limit_price = order.price.to_string().parse::<f64>()?;
                current_price >= limit_price
            },
            _ => {
                warn!("未知的订单类型: {}", order.order_type);
                false
            }
        };

        if should_execute {
            info!("订单 {} 触发执行条件: {} {} @ {} (当前价格: {})", 
                order.id, order.order_type, order.amount, order.price, current_price);
            
            self.execute_order(order, current_price).await?;
        } else {
            debug!("订单 {} 未达到执行条件: {} @ {} (当前价格: {})", 
                order.id, order.order_type, order.price, current_price);
        }

        Ok(())
    }

    /// 执行订单
    async fn execute_order(&self, order: &PendingOrder, _current_price: f64) -> Result<()> {
        // 获取对应的交易所适配器
        let adapter = self.adapters.get(&order.strategy_id)
            .ok_or_else(|| anyhow::anyhow!("未找到策略 {} 的交易所适配器", order.strategy_id))?;

        // 构造限价单对象
        let limit_order = crate::models::LimitOrder {
            id: order.id.to_string(),
            pair: order.token_pair.clone(),
            order_type: match order.order_type.as_str() {
                "buy" => crate::models::OrderType::Buy,
                "sell" => crate::models::OrderType::Sell,
                _ => return Err(anyhow::anyhow!("无效的订单类型: {}", order.order_type)),
            },
            price: order.price.to_string().parse()?,
            amount: order.amount.to_string().parse()?,
            status: OrderStatus::Pending,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            filled_at: None,
            tx_hash: None,
        };

        // 执行交易
        match adapter.place_limit_order(limit_order, order.strategy_id).await {
            Ok(tx_hash) => {
                info!("订单 {} 执行成功，交易哈希: {}", order.id, tx_hash);
                
                // 更新订单状态为已成交
                if let Err(e) = OrderOperations::update_order_status(&self.db_pool, order.id, "filled").await {
                    error!("更新订单状态失败: {}", e);
                }
            },
            Err(e) => {
                error!("订单 {} 执行失败: {}", order.id, e);
                
                // 更新订单状态为失败
                if let Err(e) = OrderOperations::update_order_status(&self.db_pool, order.id, "failed").await {
                    error!("更新订单状态失败: {}", e);
                }
            }
        }

        Ok(())
    }

    /// 获取价格缓存
    pub fn get_price_cache(&self) -> &HashMap<String, f64> {
        &self.price_cache
    }

    /// 获取监控的策略数量
    pub fn get_strategy_count(&self) -> usize {
        self.adapters.len()
    }
}

/// 待处理订单结构
#[derive(Debug, Clone)]
struct PendingOrder {
    id: Uuid,
    strategy_id: Uuid,
    order_type: String,
    price: rust_decimal::Decimal,
    amount: rust_decimal::Decimal,
    token_pair: String,
}