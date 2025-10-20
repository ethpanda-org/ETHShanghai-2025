use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimitOrder {
    pub id: String,
    pub pair: String,
    pub order_type: OrderType,
    pub price: f64,
    pub amount: f64,
    pub status: OrderStatus,
    pub created_at: u64,
    pub filled_at: Option<u64>,
    pub tx_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OrderType {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderStatus {
    Pending,
    Filled,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyStatus {
    pub id: String,
    pub config: crate::models::GridConfig,
    pub status: StrategyState,
    pub active_orders: Vec<LimitOrder>,
    pub filled_orders: Vec<LimitOrder>,
    pub total_profit: f64,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StrategyState {
    Running,
    Paused,
    Stopped,
    Error(String),
}

impl LimitOrder {
    pub fn new(pair: String, order_type: OrderType, price: f64, amount: f64) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            pair,
            order_type,
            price,
            amount,
            status: OrderStatus::Pending,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            filled_at: None,
            tx_hash: None,
        }
    }
    
    pub fn mark_filled(&mut self, tx_hash: String) {
        self.status = OrderStatus::Filled;
        self.tx_hash = Some(tx_hash);
        self.filled_at = Some(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()
        );
    }
}

impl StrategyStatus {
    pub fn new(config: crate::models::GridConfig) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
            
        Self {
            id: Uuid::new_v4().to_string(),
            config,
            status: StrategyState::Running,
            active_orders: Vec::new(),
            filled_orders: Vec::new(),
            total_profit: 0.0,
            created_at: now,
            updated_at: now,
        }
    }
}