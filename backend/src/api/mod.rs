pub mod handlers;
pub mod routes;

use crate::services::GridTradingService;
use std::sync::Arc;

#[derive(Clone)]
pub struct ApiState {
    pub trading_service: Arc<GridTradingService>,
}

impl ApiState {
    pub fn new(trading_service: Arc<GridTradingService>) -> Self {
        Self { trading_service }
    }
}