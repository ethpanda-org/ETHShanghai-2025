use crate::models::{LimitOrder, OrderStatus, StrategyState};
use crate::strategy::GridStrategy;
use crate::exchanges::ExchangeAdapter;
use anyhow::Result;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing::{info, warn, error};
use uuid::Uuid;

#[derive(Clone)]
pub struct StrategyExecutor {
    strategy: GridStrategy,
    exchange: Arc<dyn ExchangeAdapter + Send + Sync>,
    price_check_interval: Duration,
    strategy_id: Uuid,
}

impl StrategyExecutor {
    pub fn new(
        strategy: GridStrategy,
        exchange: Arc<dyn ExchangeAdapter + Send + Sync>,
        strategy_id: Uuid,
    ) -> Self {
        Self {
            strategy,
            exchange,
            price_check_interval: Duration::from_secs(5), // 每5秒检查一次价格
            strategy_id,
        }
    }
    
    /// 启动策略执行循环
    pub async fn run(&mut self) -> Result<()> {
        info!("🚀 启动网格策略执行器 (策略ID: {})", self.strategy_id);
        info!("📊 策略配置: 交易对={}, 价格区间={}-{}, 网格数量={}, 总投资额={}", 
            self.strategy.config.pair,
            self.strategy.config.lower_price,
            self.strategy.config.upper_price,
            self.strategy.config.grid_count,
            self.strategy.config.total_amount
        );
        
        loop {
            match self.strategy.status.status {
                StrategyState::Running => {
                    info!("🔄 策略状态: 运行中");
                    if let Err(e) = self.execute_cycle().await {
                        error!("❌ 策略执行周期错误: {}", e);
                        self.strategy.status.status = StrategyState::Error(e.to_string());
                    }
                },
                StrategyState::Paused => {
                    info!("⏸️ 策略状态: 已暂停，等待恢复...");
                },
                StrategyState::Stopped => {
                    info!("⏹️ 策略状态: 已停止，退出执行循环");
                    break;
                },
                StrategyState::Error(ref err) => {
                    error!("❌ 策略状态: 错误 - {}", err);
                    break;
                },
            }
            
            info!("⏰ 等待 {} 秒后进行下一轮检查...", self.price_check_interval.as_secs());
            sleep(self.price_check_interval).await;
        }
        
        info!("🏁 策略执行器已退出");
        Ok(())
    }
    
    /// 执行一个策略周期
    async fn execute_cycle(&mut self) -> Result<()> {
        info!("🔄 开始执行策略周期 (策略ID: {})", self.strategy_id);
        
        // 1. 获取当前价格
        let current_price = match self.exchange.get_price(&self.strategy.config.pair).await {
            Ok(price) => {
                info!("📊 当前价格: {} = {}", self.strategy.config.pair, price);
                info!("📊 价格区间: {} - {} (网格数量: {})", 
                    self.strategy.config.lower_price, 
                    self.strategy.config.upper_price,
                    self.strategy.config.grid_count
                );
                
                // 检查当前价格是否在区间内
                if price < self.strategy.config.lower_price {
                    info!("⚠️ 当前价格 {} 低于下限价格 {}，等待价格回升", price, self.strategy.config.lower_price);
                } else if price > self.strategy.config.upper_price {
                    info!("⚠️ 当前价格 {} 高于上限价格 {}，等待价格回落", price, self.strategy.config.upper_price);
                } else {
                    info!("✅ 当前价格 {} 在区间内，可以执行网格交易", price);
                }
                
                price
            },
            Err(e) => {
                error!("❌ 获取价格失败: {}", e);
                return Err(e);
            }
        };
        
        // 2. 检查需要执行的订单
        let orders_to_execute = self.strategy.check_orders_to_execute(current_price);
        
        if orders_to_execute.is_empty() {
            info!("ℹ️ 当前价格 {} 下没有需要执行的订单", current_price);
        } else {
            info!("📋 发现 {} 个订单需要执行", orders_to_execute.len());
        }
        
        // 3. 执行订单
        let mut successful_orders = 0;
        let mut failed_orders = 0;
        
        for (index, order) in orders_to_execute.iter().enumerate() {
            let order_id = order.id.clone();
            let order_type = match order.order_type {
                crate::models::OrderType::Buy => "买入",
                crate::models::OrderType::Sell => "卖出",
            };
            
            info!(
                "📤 执行订单 {}/{}: {} {} @ {}",
                index + 1,
                orders_to_execute.len(),
                order_type,
                order.amount,
                order.price
            );
            
            match self.execute_order(order.clone()).await {
                Ok(filled_order) => {
                    if let Err(e) = self.strategy.on_order_filled(&filled_order) {
                        error!("❌ 处理已成交订单失败: {}", e);
                    } else {
                        info!("✅ 订单 {} 执行成功并已处理", filled_order.id);
                        successful_orders += 1;
                    }
                },
                Err(e) => {
                    error!("❌ 订单 {} 执行失败: {}", order_id, e);
                    failed_orders += 1;
                }   
            }
        }
        
        // 4. 检查已有订单状态
        info!("🔍 检查待处理订单状态...");
        if let Err(e) = self.check_pending_orders().await {
            error!("❌ 检查待处理订单失败: {}", e);
        }
        
        // 5. 输出周期执行摘要
        info!(
            "📈 策略周期执行完成 - 成功: {}, 失败: {}, 当前价格: {}",
            successful_orders,
            failed_orders,
            current_price
        );
        
        Ok(())
    }
    
    /// 执行单个订单
    async fn execute_order(&self, order: LimitOrder) -> Result<LimitOrder> {
        let order_type_str = match order.order_type {
            crate::models::OrderType::Buy => "买入",
            crate::models::OrderType::Sell => "卖出",
        };
        
        info!(
            "📋 策略执行器: 开始执行{}订单 - 数量: {} @ 价格: {} (策略ID: {})",
            order_type_str,
            order.amount, 
            order.price,
            self.strategy_id
        );
        
        // 检查交易所余额
        let token_to_check = match order.order_type {
            crate::models::OrderType::Buy => "USDC", // 买单需要USDC
            crate::models::OrderType::Sell => "ETH",  // 卖单需要ETH
        };
        
        match self.exchange.get_balance(token_to_check).await {
            Ok(balance) => {
                info!("💰 当前 {} 余额: {}", token_to_check, balance);
                let required_amount = if order.order_type == crate::models::OrderType::Buy {
                    order.amount * order.price // 买单需要USDC
                } else {
                    order.amount // 卖单需要ETH
                };
                
                if balance < required_amount {
                    let error_msg = format!(
                        "❌ 余额不足: 需要 {} {}，但只有 {} {}",
                        required_amount, token_to_check, balance, token_to_check
                    );
                    error!("{}", error_msg);
                    return Err(anyhow::anyhow!(error_msg));
                }
            },
            Err(e) => {
                warn!("⚠️ 无法检查 {} 余额: {}，继续执行订单", token_to_check, e);
            }
        }
        
        info!("📤 提交订单到交易所...");
        
        // 调用交易所适配器执行订单
        let order_id = match self.exchange.place_limit_order(order.clone(), self.strategy_id).await {
            Ok(id) => {
                info!("✅ 订单已提交到交易所，订单ID: {}", id);
                id
            },
            Err(e) => {
                let error_msg = format!("❌ 订单提交失败: {}", e);
                error!("{}", error_msg);
                return Err(anyhow::anyhow!(error_msg));
            }
        };
        
        let mut updated_order = order.clone();
        updated_order.id = order_id;
        
        info!("⏳ 等待订单成交...");
        
        // 等待订单成交（简化版本，实际应该异步监控）
        let mut retry_count = 0;
        let max_retries = 10;
        
        while retry_count < max_retries {
            let status = match self.exchange.get_order_status(&updated_order.id, self.strategy_id).await {
                Ok(status) => status,
                Err(e) => {
                    error!("❌ 获取订单状态失败: {}", e);
                    return Err(anyhow::anyhow!("获取订单状态失败: {}", e));
                }
            };
            
            match status {
                OrderStatus::Filled => {
                    updated_order.mark_filled(format!("tx_{}", updated_order.id));
                    info!(
                        "🎉 订单执行成功! 订单ID: {}, 交易哈希: tx_{}",
                        updated_order.id,
                        updated_order.id
                    );
                    return Ok(updated_order);
                },
                OrderStatus::Failed => {
                    let error_msg = format!("❌ 订单执行失败: {}", updated_order.id);
                    error!("{}", error_msg);
                    return Err(anyhow::anyhow!(error_msg));
                },
                OrderStatus::Cancelled => {
                    let error_msg = format!("❌ 订单已取消: {}", updated_order.id);
                    error!("{}", error_msg);
                    return Err(anyhow::anyhow!(error_msg));
                },
                OrderStatus::Pending => {
                    info!("⏳ 订单仍在等待中... (重试 {}/{})", retry_count + 1, max_retries);
                    sleep(Duration::from_secs(2)).await;
                    retry_count += 1;
                }
            }
        }
        
        let timeout_msg = format!("⏰ 订单执行超时: {}", updated_order.id);
        error!("{}", timeout_msg);
        Err(anyhow::anyhow!(timeout_msg))
    }
    
    /// 检查待处理订单状态
    async fn check_pending_orders(&mut self) -> Result<()> {
        let mut orders_to_remove = Vec::new();
        let mut filled_orders = Vec::new();
        
        for (index, order) in self.strategy.status.active_orders.iter().enumerate() {
            let status = self.exchange.get_order_status(&order.id, self.strategy_id).await?;
            
            match status {
                OrderStatus::Filled => {
                    let mut filled_order = order.clone();
                    filled_order.mark_filled(format!("tx_{}", order.id));
                    filled_orders.push(filled_order);
                    orders_to_remove.push(index);
                },
                OrderStatus::Failed | OrderStatus::Cancelled => {
                    warn!("Grid strategy executor: order {} failed or cancelled", order.id);
                    orders_to_remove.push(index);
                },
                OrderStatus::Pending => {
                    // 订单仍在等待中
                }
            }
        }
        
        // 处理已成交的订单
        for filled_order in filled_orders {
            self.strategy.on_order_filled(&filled_order)?;
        }
        
        // 移除已处理的订单
        for &index in orders_to_remove.iter().rev() {
            self.strategy.status.active_orders.remove(index);
        }
        
        Ok(())
    }
    
    /// 暂停策略
    pub fn pause(&mut self) {
        self.strategy.pause();
    }
    
    /// 恢复策略
    pub fn resume(&mut self) {
        self.strategy.resume();
    }
    
    /// 停止策略
    pub fn stop(&mut self) {
        self.strategy.stop();
    }
    
    /// 获取策略状态
    pub fn get_status(&self) -> &crate::models::StrategyStatus {
        &self.strategy.status
    }
    
    /// 获取策略统计
    pub fn get_statistics(&self) -> crate::strategy::StrategyStatistics {
        self.strategy.get_statistics()
    }
}