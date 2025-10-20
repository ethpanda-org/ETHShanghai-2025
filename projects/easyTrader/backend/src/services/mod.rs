use anyhow::Result;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use chrono::Utc;
use rust_decimal::Decimal;

use crate::config::Config;
use crate::types::*;
use crate::api::{routes, ApiState};
use crate::database::Database;

pub mod price_monitor;
pub mod strategy_manager;
pub use price_monitor::PriceMonitorService;
pub use strategy_manager::StrategyManager;

pub struct GridTradingService {
    config: Config,
    strategies: Arc<Mutex<HashMap<Uuid, StrategyState>>>,
    database: Arc<Database>,
}

impl GridTradingService {
    pub async fn new() -> Result<Arc<Self>> {
        let config = Config::from_env()?;
        let strategies = Arc::new(Mutex::new(HashMap::new()));
        
        // For backward compatibility, create a dummy database
        let database_url = "postgresql://localhost/grid_trading";
        let database = Arc::new(Database::new(database_url).await?);

        Ok(Arc::new(Self {
            config,
            strategies,
            database,
        }))
    }

    pub async fn new_with_database(database: Database) -> Result<Arc<Self>> {
        let config = Config::from_env()?;
        let strategies = Arc::new(Mutex::new(HashMap::new()));

        Ok(Arc::new(Self {
            config,
            strategies,
            database: Arc::new(database),
        }))
    }

    pub async fn start(self: Arc<Self>) -> Result<()> {
        let api_state = ApiState::new(self.clone());
        let app = routes::create_router(api_state);

        let addr = format!("{}:{}", self.config.server.host, self.config.server.port);
        let listener = tokio::net::TcpListener::bind(&addr).await?;
        
        tracing::info!("🌐 API服务器启动在: http://{}", addr);
        
        axum::serve(listener, app).await?;
        
        Ok(())
    }

    pub async fn start_strategy(&self, config: GridConfig) -> Result<Uuid> {
        let strategy_id = Uuid::new_v4();
        let now = Utc::now();

        let strategy = StrategyState {
            id: strategy_id,
            config,
            status: StrategyStatus::Running,
            created_at: now,
            updated_at: now,
            active_orders: vec![],
            filled_orders: vec![],
        };

        let mut strategies = self.strategies.lock().unwrap();
        strategies.insert(strategy_id, strategy);

        tracing::info!("✅ 策略 {} 已启动", strategy_id);
        
        Ok(strategy_id)
    }

    pub async fn get_strategy_status(&self, id: Uuid) -> Result<Option<StrategyStatusResponse>> {
        let strategies = self.strategies.lock().unwrap();
        
        if let Some(strategy) = strategies.get(&id) {
            let statistics = StrategyStatistics {
                total_trades: 0,
                total_profit: Decimal::ZERO,
                total_volume: Decimal::ZERO,
                win_rate: 0.0,
                current_price: Decimal::ZERO,
            };

            Ok(Some(StrategyStatusResponse {
                strategy: strategy.clone(),
                statistics,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn pause_strategy(&self, id: Uuid) -> Result<()> {
        let mut strategies = self.strategies.lock().unwrap();
        
        if let Some(strategy) = strategies.get_mut(&id) {
            strategy.status = StrategyStatus::Paused;
            strategy.updated_at = Utc::now();
            tracing::info!("⏸️ 策略 {} 已暂停", id);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Strategy not found"))
        }
    }

    pub async fn resume_strategy(&self, id: Uuid) -> Result<()> {
        let mut strategies = self.strategies.lock().unwrap();
        
        if let Some(strategy) = strategies.get_mut(&id) {
            strategy.status = StrategyStatus::Running;
            strategy.updated_at = Utc::now();
            tracing::info!("▶️ 策略 {} 已恢复", id);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Strategy not found"))
        }
    }

    pub async fn stop_strategy(&self, id: Uuid) -> Result<()> {
        let mut strategies = self.strategies.lock().unwrap();
        
        if let Some(strategy) = strategies.get_mut(&id) {
            strategy.status = StrategyStatus::Stopped;
            strategy.updated_at = Utc::now();
            tracing::info!("⏹️ 策略 {} 已停止", id);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Strategy not found"))
        }
    }

    pub async fn get_price(&self, pair: &str) -> Result<f64> {
        // 尝试从 Uniswap 获取真实价格
        match self.get_real_price_from_uniswap(pair).await {
            Ok(price) => {
                tracing::info!("从 Uniswap 获取到 {} 的真实价格: {}", pair, price);
                Ok(price)
            }
            Err(e) => {
                tracing::warn!("从 Uniswap 获取价格失败: {}, 使用模拟价格", e);
                // 回退到模拟价格
                match pair {
                    "ETH/USDC" | "ETH-USDC" | "WETH/USDC" | "WETH-USDC" => Ok(2500.0),
                    "BTC/USDT" | "BTC-USDT" => Ok(45000.0),
                    "USDC/ETH" | "USDC-ETH" | "USDC/WETH" | "USDC-WETH" => Ok(0.0004),
                    _ => Ok(1.0),
                }
            }
        }
    }

    async fn get_real_price_from_uniswap(&self, pair: &str) -> Result<f64> {
        use crate::exchanges::uniswap::client::UniswapClient;
        use ethers::types::U256;
        
        // 从环境变量获取配置
        let rpc_url = std::env::var("ETH_RPC_URL")
            .unwrap_or_else(|_| "https://ethereum-rpc.publicnode.com".to_string());
        let private_key = std::env::var("PRIVATE_KEY")
            .map_err(|_| anyhow::anyhow!("PRIVATE_KEY not set"))?;
        let chain_id = std::env::var("CHAIN_ID")
            .unwrap_or_else(|_| "1".to_string())
            .parse::<u64>()
            .unwrap_or(1);
        
        // 创建 Uniswap 客户端
        let client = UniswapClient::new(&rpc_url, &private_key, chain_id).await?;
        
        // 解析交易对
        let (token_in, token_out) = match pair {
            "ETH/USDC" | "ETH-USDC" => ("WETH", "USDC"),
            "WETH/USDC" | "WETH-USDC" => ("WETH", "USDC"),
            "USDC/ETH" | "USDC-ETH" => ("USDC", "WETH"),
            "USDC/WETH" | "USDC-WETH" => ("USDC", "WETH"),
            _ => return Err(anyhow::anyhow!("不支持的交易对: {}", pair)),
        };
        
        // 使用 1 个单位的输入代币来获取价格
        let amount_in = if token_in == "WETH" {
            U256::from(10u64.pow(18)) // 1 WETH = 10^18 wei
        } else {
            U256::from(10u64.pow(6))  // 1 USDC = 10^6 units
        };
        
        // 获取价格
        let price = client.get_pair_price(token_in, token_out, amount_in).await?;
        
        // 如果是 USDC/WETH，需要调整价格格式
        if token_in == "USDC" {
            Ok(price * 1e12) // 调整 USDC (6 decimals) 到 WETH (18 decimals) 的比率
        } else {
            // 对于 WETH/USDC，直接返回从 Uniswap 获取的真实价格
            Ok(price)
        }
    }

    pub async fn get_price_with_key(&self, pair: &str, private_key: &str) -> Result<f64> {
        use crate::exchanges::uniswap::client::UniswapClient;
        use ethers::types::U256;
    
        let rpc_url = std::env::var("ETH_RPC_URL")
            .unwrap_or_else(|_| "https://ethereum-rpc.publicnode.com".to_string());
        let chain_id = std::env::var("CHAIN_ID")
            .unwrap_or_else(|_| "1".to_string())
            .parse::<u64>()
            .unwrap_or(1);
    
        let client = UniswapClient::new(&rpc_url, private_key, chain_id).await?;
    
        let (token_in, token_out) = match pair {
            "ETH/USDC" | "ETH-USDC" => ("WETH", "USDC"),
            "WETH/USDC" | "WETH-USDC" => ("WETH", "USDC"),
            "USDC/ETH" | "USDC-ETH" => ("USDC", "WETH"),
            "USDC/WETH" | "USDC-WETH" => ("USDC", "WETH"),
            _ => return Err(anyhow::anyhow!("不支持的交易对: {}", pair)),
        };
    
        // 使用小额输入以减少滑点影响：0.001 WETH 或 1 USDC
        let amount_in = if token_in == "WETH" {
            U256::from(10u64.pow(15)) // 0.001 WETH
        } else {
            U256::from(1u64 * 10u64.pow(6)) // 1 USDC
        };
    
        let price = client.get_pair_price(token_in, token_out, amount_in).await?;
    
        // 根据交易对返回正确的价格
        match pair {
            "ETH/USDC" | "ETH-USDC" | "WETH/USDC" | "WETH-USDC" => {
                // 1 ETH = price USDC，直接返回
                Ok(price)
            }
            "USDC/ETH" | "USDC-ETH" | "USDC/WETH" | "USDC-WETH" => {
                // 1000 USDC = price WETH，需要计算 1 USDC = ? ETH
                // 然后转换为 1 ETH = ? USDC
                if price > 0.0 {
                    Ok(1000.0 / price) // 1 ETH = 1000/price USDC
                } else {
                    Err(anyhow::anyhow!("价格计算错误: price = {}", price))
                }
            }
            _ => Ok(price),
        }
    }

    pub async fn get_strategy_logs(&self, id: Uuid) -> Result<Vec<LogEntry>> {
        // 模拟日志获取，实际应该从数据库或日志系统获取
        let strategies = self.strategies.lock().unwrap();
        
        if strategies.contains_key(&id) {
            let logs = vec![
                LogEntry {
                    timestamp: Utc::now(),
                    level: "INFO".to_string(),
                    message: format!("策略 {} 正在运行", id),
                },
                LogEntry {
                    timestamp: Utc::now(),
                    level: "INFO".to_string(),
                    message: "网格订单已创建".to_string(),
                },
                LogEntry {
                    timestamp: Utc::now(),
                    level: "DEBUG".to_string(),
                    message: "价格监控中...".to_string(),
                },
            ];
            Ok(logs)
        } else {
            Err(anyhow::anyhow!("Strategy not found"))
        }
    }
}