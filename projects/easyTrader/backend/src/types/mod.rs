use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridConfig {
    pub trading_pair: String,
    pub exchange: String,
    pub upper_price: Decimal,
    pub lower_price: Decimal,
    pub grid_count: u32,
    pub total_amount: Decimal,
    pub private_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartStrategyRequest {
    pub config: GridConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartStrategyResponse {
    pub strategy_id: Uuid,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StrategyStatus {
    Running,
    Paused,
    Stopped,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimitOrder {
    pub id: Uuid,
    pub price: Decimal,
    pub amount: Decimal,
    pub side: OrderSide,
    pub status: OrderStatus,
    pub created_at: DateTime<Utc>,
    pub filled_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderSide {
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
pub struct StrategyState {
    pub id: Uuid,
    pub config: GridConfig,
    pub status: StrategyStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub active_orders: Vec<LimitOrder>,
    pub filled_orders: Vec<LimitOrder>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyStatistics {
    pub total_trades: u64,
    pub total_profit: Decimal,
    pub total_volume: Decimal,
    pub win_rate: f64,
    pub current_price: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyStatusResponse {
    pub strategy: StrategyState,
    pub statistics: StrategyStatistics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub error: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceResponse {
    pub pair: String,
    pub price: f64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetPriceRequest {
    pub pair: String,
    pub private_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub level: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogsResponse {
    pub strategy_id: Uuid,
    pub logs: Vec<LogEntry>,
}