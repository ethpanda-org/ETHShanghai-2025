#![allow(unused_variables)]
#![allow(warnings)]

use anyhow::Result;
use tracing::{info, Level};
use tracing_subscriber;
use dotenv::dotenv;
use std::env;

mod api;
mod config;
mod services;
mod types;
mod trading;
mod database;
mod models;
mod exchanges;
mod strategy;

use services::GridTradingService;
use database::Database;

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv().ok();
    
    // Initialize tracing
    tracing_subscriber::fmt().with_max_level(Level::INFO).init();

    info!("🚀 启动网格交易机器人服务...");

    // Initialize database
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://localhost/grid_trading".to_string());
    
    info!("📊 连接数据库: {}", database_url);
    let database = Database::new(&database_url).await?;
    
    // Create tables if they don't exist
    database.create_tables().await?;
    info!("✅ 数据库初始化完成");

    // Create and start the grid trading service
    let service = GridTradingService::new_with_database(database).await?;
    
    info!("✅ 网格交易机器人服务已启动");
    info!("🌐 API服务运行在: http://localhost:8080");
    
    service.start().await?;

    Ok(())
}
