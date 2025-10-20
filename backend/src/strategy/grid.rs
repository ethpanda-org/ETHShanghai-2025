use crate::models::{GridConfig, GridLevel, LimitOrder, OrderType, StrategyStatus, StrategyState};
use anyhow::Result;
use std::collections::HashMap;
use tracing::info;

#[derive(Clone)]
pub struct GridStrategy {
    pub config: GridConfig,
    pub levels: Vec<GridLevel>,
    pub status: StrategyStatus,
}

impl GridStrategy {
    pub fn new(config: GridConfig) -> Result<Self> {
        config.validate()?;
        
        let levels = config.calculate_grid_levels();
        let status = StrategyStatus::new(config.clone());
        
        Ok(Self {
            config,
            levels,
            status,
        })
    }
    
    /// 根据当前价格检查需要执行的订单
    pub fn check_orders_to_execute(&mut self, current_price: f64) -> Vec<LimitOrder> {
        let mut orders_to_execute = Vec::new();
        
        info!("🔍 检查网格层级，当前价格: {}", current_price);
        info!("📋 总网格数量: {}, 已填充: {}", 
            self.levels.len(), 
            self.levels.iter().filter(|l| l.is_filled).count()
        );
        
        // 显示前几个和后几个网格的价格
        info!("📊 网格价格分布:");
        for (i, level) in self.levels.iter().enumerate() {
            if i < 5 || i >= self.levels.len() - 5 {
                info!("  网格 #{}: {} @ {} (已填充: {})", 
                    i,
                    match level.order_type {
                        OrderType::Buy => "买入",
                        OrderType::Sell => "卖出",
                    },
                    level.price,
                    level.is_filled
                );
            } else if i == 5 {
                info!("  ... (省略中间网格) ...");
            }
        }
        
        for (index, level) in &mut self.levels.iter_mut().enumerate() {
            if level.is_filled {
                continue;
            }
            
            let should_execute = match level.order_type {
                OrderType::Buy => current_price <= level.price,
                OrderType::Sell => current_price >= level.price,
            };
            
            if should_execute {
                let order = LimitOrder::new(
                    self.config.pair.clone(),
                    level.order_type.clone(),
                    level.price,
                    level.amount,
                );
                
                orders_to_execute.push(order);
                level.is_filled = true;
                
                info!(
                    "🎯 触发网格订单 #{}: {} {} @ {} (当前价格: {})",
                    index,
                    match level.order_type {
                        OrderType::Buy => "买入",
                        OrderType::Sell => "卖出",
                    },
                    level.amount,
                    level.price,
                    current_price
                );
            } else {
                // 显示未触发的网格信息（仅显示前几个）
                if index < 5 {
                    info!(
                        "⏳ 网格 #{}: {} {} @ {} (未触发)",
                        index,
                        match level.order_type {
                            OrderType::Buy => "买入",
                            OrderType::Sell => "卖出",
                        },
                        level.amount,
                        level.price
                    );
                }
            }
        }
        
        info!("📊 本次检查结果: 触发 {} 个订单", orders_to_execute.len());
        orders_to_execute
    }
    
    /// 当订单成交后，重新设置对应的网格
    pub fn on_order_filled(&mut self, order: &LimitOrder) -> Result<()> {
        // 找到对应的网格层级并重置
        for level in &mut self.levels {
            if (level.price - order.price).abs() < 0.001 {
                level.is_filled = false;
                
                // 如果是买单成交，设置对应的卖单
                // 如果是卖单成交，设置对应的买单
                level.order_type = match order.order_type {
                    OrderType::Buy => OrderType::Sell,
                    OrderType::Sell => OrderType::Buy,
                };
                
                info!(
                    "Order filled, reset grid: {} @ {}",
                    match level.order_type {
                        OrderType::Buy => "Buy",
                        OrderType::Sell => "Sell",
                    },
                    level.price
                );
                
                break;
            }
        }
        
        // 更新策略状态
        self.status.filled_orders.push(order.clone());
        self.status.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
            
        Ok(())
    }
    
    /// 计算当前策略的盈利
    pub fn calculate_profit(&self) -> f64 {
        let mut total_profit = 0.0;
        let mut buy_orders: HashMap<String, Vec<&LimitOrder>> = HashMap::new();
        let mut sell_orders: HashMap<String, Vec<&LimitOrder>> = HashMap::new();
        
        // 分类买单和卖单
        for order in &self.status.filled_orders {
            match order.order_type {
                OrderType::Buy => {
                    buy_orders.entry(order.pair.clone())
                        .or_insert_with(Vec::new)
                        .push(order);
                },
                OrderType::Sell => {
                    sell_orders.entry(order.pair.clone())
                        .or_insert_with(Vec::new)
                        .push(order);
                },
            }
        }
        
        // 计算每个交易对的盈利
        for (pair, sells) in sell_orders {
            if let Some(buys) = buy_orders.get(&pair) {
                for sell_order in sells {
                    // 找到对应的买单计算盈利
                    for buy_order in buys {
                        if sell_order.amount == buy_order.amount {
                            let profit = (sell_order.price - buy_order.price) * sell_order.amount;
                            total_profit += profit;
                            break;
                        }
                    }
                }
            }
        }
        
        total_profit
    }
    
    /// 暂停策略
    pub fn pause(&mut self) {
        self.status.status = StrategyState::Paused;
        self.status.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        info!("Strategy paused");
    }
    
    /// 恢复策略
    pub fn resume(&mut self) {
        self.status.status = StrategyState::Running;
        self.status.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        info!("Strategy resumed");
    }
    
    /// 停止策略
    pub fn stop(&mut self) {
        self.status.status = StrategyState::Stopped;
        self.status.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        info!("Strategy stopped");
    }
    
    /// 获取策略统计信息
    pub fn get_statistics(&self) -> StrategyStatistics {
        let total_orders = self.status.filled_orders.len();
        let buy_orders = self.status.filled_orders.iter()
            .filter(|o| matches!(o.order_type, OrderType::Buy))
            .count();
        let sell_orders = total_orders - buy_orders;
        
        StrategyStatistics {
            total_orders,
            buy_orders,
            sell_orders,
            total_profit: self.calculate_profit(),
            active_grids: self.levels.iter().filter(|l| !l.is_filled).count(),
            filled_grids: self.levels.iter().filter(|l| l.is_filled).count(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct StrategyStatistics {
    pub total_orders: usize,
    pub buy_orders: usize,
    pub sell_orders: usize,
    pub total_profit: f64,
    pub active_grids: usize,
    pub filled_grids: usize,
}