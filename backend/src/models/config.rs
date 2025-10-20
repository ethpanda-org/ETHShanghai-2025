use serde::{Deserialize, Serialize};
use crate::models::OrderType;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridConfig {
    pub pair: String,           // 交易对 ETH/USDC
    pub upper_price: f64,       // 上限价格
    pub lower_price: f64,       // 下限价格
    pub grid_count: u32,        // 网格数量
    pub total_amount: f64,      // 总投入金额
    pub private_key: String,    // 用户的私钥
    pub exchange: String,       // "uniswap"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridLevel {
    pub price: f64,
    pub amount: f64,
    pub order_type: OrderType,
    pub is_filled: bool,
}

impl GridConfig {
    pub fn validate(&self) -> Result<(), anyhow::Error> {
        if self.upper_price <= self.lower_price {
            return Err(anyhow::anyhow!("上限价格必须大于下限价格"));
        }
        
        if self.grid_count == 0 {
            return Err(anyhow::anyhow!("网格数量必须大于0"));
        }
        
        if self.total_amount <= 0.0 {
            return Err(anyhow::anyhow!("总投入金额必须大于0"));
        }
        
        Ok(())
    }
    
    pub fn calculate_grid_levels(&self) -> Vec<GridLevel> {
        let mut levels = Vec::new();
        let price_step = (self.upper_price - self.lower_price) / (self.grid_count as f64 - 1.0);
        let amount_per_grid = self.total_amount / self.grid_count as f64;
        
        for i in 0..self.grid_count {
            let price = self.lower_price + (i as f64) * price_step;
            let order_type = if i < self.grid_count / 2 {
                OrderType::Buy
            } else {
                OrderType::Sell
            };
            
            levels.push(GridLevel {
                price,
                amount: amount_per_grid,
                order_type,
                is_filled: false,
            });
        }
        
        levels
    }
}