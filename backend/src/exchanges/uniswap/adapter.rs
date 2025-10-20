use crate::exchanges::{ExchangeAdapter, UniswapClient};
use crate::models::{LimitOrder, OrderStatus, OrderType};
use crate::database::operations::{OrderOperations, CreateOrderRequest};
use crate::exchanges::uniswap::contracts::UNISWAP_V3_ROUTER_ADDRESS;
use anyhow::Result;
use async_trait::async_trait;
use ethers::prelude::*;
use sqlx::PgPool;
use std::sync::Arc;
use tracing::{info, error};
use uuid::Uuid;
use rust_decimal::Decimal;
use rust_decimal::prelude::{ToPrimitive, FromPrimitive};

pub struct UniswapAdapter {
    client: UniswapClient,
    // 数据库连接池
    db_pool: Arc<PgPool>,
    // 价格监控间隔
    price_check_interval: tokio::time::Duration,
}

impl UniswapAdapter {
    pub async fn new(rpc_url: &str, private_key: &str, chain_id: u64, db_pool: Arc<PgPool>) -> Result<Self> {
        let client = UniswapClient::new(rpc_url, private_key, chain_id).await?;
        
        Ok(Self {
            client,
            db_pool,
            price_check_interval: tokio::time::Duration::from_secs(5),
        })
    }
    
    /// 使用数据库存储订单
    async fn execute_limit_order(&self, order: LimitOrder, strategy_id: Uuid) -> Result<String> {
        // 将订单存储到数据库
        let create_request = CreateOrderRequest {
            strategy_id,
            order_type: match order.order_type {
                OrderType::Buy => "buy".to_string(),
                OrderType::Sell => "sell".to_string(),
            },
            price: Decimal::from_f64(order.price).unwrap_or_default(),
            amount: Decimal::from_f64(order.amount).unwrap_or_default(),
        };
        
        let db_order = OrderOperations::create_order(&self.db_pool, &create_request).await?;
        let order_id = db_order.id.to_string();
        
        // 启动价格监控任务
        let client = self.client.clone();
        let db_pool = Arc::clone(&self.db_pool);
        let order_id_clone = order_id.clone();
        let _db_order_clone = db_order.clone();
        
        tokio::spawn(async move {
            loop {
                // 从数据库获取订单状态
                if let Ok(orders) = OrderOperations::get_orders_by_strategy(&db_pool, strategy_id).await {
                    if let Some(current_order) = orders.iter().find(|o| o.id.to_string() == order_id_clone) {
                        if current_order.status == "filled" || current_order.status == "cancelled" {
                            break;
                        }
                        
                        // 获取当前价格
                        if let Ok((token_in, token_out)) = client.parse_pair(&format!("{}/{}", "ETH", "USDC")) {
                            let amount_f64 = current_order.amount.to_f64().unwrap_or(0.0);
                            let amount_in = U256::from((amount_f64 * 1e18) as u64);
                            
                            if let Ok(current_price) = client.get_pair_price(&token_in, &token_out, amount_in).await {
                                let target_price = current_order.price.to_f64().unwrap_or(0.0);
                                
                                let should_execute = match current_order.order_type.as_str() {
                                    "buy" => current_price <= target_price,
                                    "sell" => current_price >= target_price,
                                    _ => false,
                                };
                                
                                if should_execute {
                                    info!(
                                        "🎯 限价单触发: 订单 {} @ {} (当前价格: {}) - 类型: {}",
                                        current_order.id, 
                                        target_price, 
                                        current_price,
                                        current_order.order_type
                                    );
                                    
                                    // 检查代币批准
                                    if current_order.order_type == "buy" {
                                        info!("🔍 检查USDC批准额度...");
                                        let allowance = client.check_allowance("USDC", UNISWAP_V3_ROUTER_ADDRESS).await.unwrap_or(U256::zero());
                                        let required_amount = U256::from((amount_f64 * target_price * 1e6) as u64);
                                        
                                        info!("💰 当前批准额度: {} USDC, 需要: {} USDC", 
                                            allowance.as_u128() as f64 / 1e6, 
                                            required_amount.as_u128() as f64 / 1e6
                                        );
                                        
                                        if allowance < required_amount {
                                            info!("📝 需要批准USDC代币...");
                                            if let Err(e) = client.approve_token("USDC", UNISWAP_V3_ROUTER_ADDRESS, required_amount).await {
                                                error!("❌ 代币批准失败: {}", e);
                                                continue;
                                            } else {
                                                info!("✅ USDC代币批准成功");
                                            }
                                        } else {
                                            info!("✅ USDC批准额度充足");
                                        }
                                    }
                                    
                                    // 执行交换
                                    let (token_in_addr, token_out_addr) = if current_order.order_type == "buy" {
                                        ("USDC", "ETH")
                                    } else {
                                        ("ETH", "USDC")
                                    };
                                    
                                    info!(
                                        "🔄 开始执行链上交换: {} {} -> {} {}",
                                        amount_in,
                                        token_in_addr,
                                        "最小输出",
                                        token_out_addr
                                    );
                                    
                                    match client.swap_exact_input_single(
                                        token_in_addr,
                                        token_out_addr,
                                        3000, // 0.3% fee tier
                                        amount_in,
                                        U256::zero(), // 简化，实际需要计算最小输出
                                    ).await {
                                        Ok(tx_hash) => {
                                            info!("🎉 链上交换执行成功! 交易哈希: {}", tx_hash);
                                            
                                            // 更新订单状态为已成交
                                            if let Err(e) = OrderOperations::update_order_status(&db_pool, current_order.id, "filled").await {
                                                error!("❌ 更新订单状态失败: {}", e);
                                            } else {
                                                info!("✅ 限价单执行完成: 订单 {} - 交易哈希: {}", current_order.id, tx_hash);
                                            }
                                            break;
                                        },
                                        Err(e) => {
                                            error!("❌ 链上交换执行失败: {}", e);
                                            
                                            // 分析失败原因
                                            if e.to_string().contains("insufficient funds") {
                                                error!("💸 失败原因: 余额不足");
                                            } else if e.to_string().contains("gas") {
                                                error!("⛽ 失败原因: Gas费不足");
                                            } else if e.to_string().contains("slippage") {
                                                error!("📉 失败原因: 滑点过大");
                                            } else {
                                                error!("❓ 失败原因: {}", e);
                                            }
                                            
                                            if let Err(e) = OrderOperations::update_order_status(&db_pool, current_order.id, "failed").await {
                                                error!("❌ 更新订单状态失败: {}", e);
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            }
        });
        
        Ok(order_id)
    }
}

#[async_trait]
impl ExchangeAdapter for UniswapAdapter {
    async fn get_price(&self, pair: &str) -> Result<f64> {
        let (token_in, token_out) = self.client.parse_pair(pair)?;
        let amount_in = U256::from(1_000_000_000_000_000_000u64); // 1 ETH
        self.client.get_pair_price(&token_in, &token_out, amount_in).await
    }
    
    async fn place_limit_order(&self, order: LimitOrder, strategy_id: Uuid) -> Result<String> {
        self.execute_limit_order(order, strategy_id).await
    }
    
    async fn cancel_order(&self, order_id: &str) -> Result<()> {
        let order_uuid = Uuid::parse_str(order_id)
            .map_err(|e| anyhow::anyhow!("无效的订单ID: {}", e))?;
        
        OrderOperations::update_order_status(&self.db_pool, order_uuid, "cancelled").await
            .map_err(|e| anyhow::anyhow!("取消订单失败: {}", e))?;
        
        info!("订单已取消: {}", order_id);
        Ok(())
    }
    
    async fn get_order_status(&self, order_id: &str, strategy_id: Uuid) -> Result<OrderStatus> {
        let orders = OrderOperations::get_orders_by_strategy(&self.db_pool, strategy_id).await
            .map_err(|e| anyhow::anyhow!("获取订单状态失败: {}", e))?;
        
        if let Some(order) = orders.iter().find(|o| o.id.to_string() == order_id) {
            let status = match order.status.as_str() {
                "pending" => OrderStatus::Pending,
                "filled" => OrderStatus::Filled,
                "cancelled" => OrderStatus::Cancelled,
                "failed" => OrderStatus::Failed,
                _ => OrderStatus::Pending,
            };
            Ok(status)
        } else {
            Err(anyhow::anyhow!("订单未找到: {}", order_id))
        }
    }
    
    async fn get_balance(&self, token: &str) -> Result<f64> {
        match token.to_uppercase().as_str() {
            "ETH" => {
                let balance = self.client.get_eth_balance().await?;
                // 将 U256 转换为 f64
                let balance_f64 = balance.as_u128() as f64 / 1e18;
                Ok(balance_f64)
            },
            _ => {
                let balance = self.client.get_token_balance(token).await?;
                // 将 U256 转换为 f64
                let balance_f64 = balance.as_u128() as f64 / 1e18; // 简化，实际需要根据代币精度调整
                Ok(balance_f64)
            }
        }
    }
    
    fn get_name(&self) -> &str {
        "Uniswap V3"
    }
}