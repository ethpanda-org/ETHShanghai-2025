use crate::models::{LimitOrder, OrderStatus};
use anyhow::Result;
use async_trait::async_trait;
use uuid::Uuid;

/// 统一的交易所接口
#[async_trait]
pub trait ExchangeAdapter {
    /// 获取交易对当前价格
    async fn get_price(&self, pair: &str) -> Result<f64>;
    
    /// 下限价单
    async fn place_limit_order(&self, order: LimitOrder, strategy_id: Uuid) -> Result<String>;
    
    /// 取消订单
    async fn cancel_order(&self, order_id: &str) -> Result<()>;
    
    /// 获取订单状态
    async fn get_order_status(&self, order_id: &str, strategy_id: Uuid) -> Result<OrderStatus>;
    
    /// 获取账户余额
    async fn get_balance(&self, token: &str) -> Result<f64>;
    
    /// 获取交易所名称
    fn get_name(&self) -> &str;
}