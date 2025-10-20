use anyhow::Result;
use sqlx::PgPool;
use tracing::debug;

pub struct SystemOperations;

impl SystemOperations {
    pub async fn create_tables(pool: &PgPool) -> Result<()> {
        debug!("Creating database tables...");
        
        // Create strategies table
        sqlx::query!(
            r#"
            CREATE TABLE IF NOT EXISTS strategies (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(42) NOT NULL,
                token_pair VARCHAR(50) NOT NULL,
                base_token VARCHAR(42) NOT NULL,
                quote_token VARCHAR(42) NOT NULL,
                base_token_symbol VARCHAR(20),
                quote_token_symbol VARCHAR(20),
                grid_count INTEGER NOT NULL,
                price_range_min DECIMAL(78, 18) NOT NULL,
                price_range_max DECIMAL(78, 18) NOT NULL,
                total_investment DECIMAL(78, 18) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                paused_at TIMESTAMP WITH TIME ZONE,
                stopped_at TIMESTAMP WITH TIME ZONE
            )
            "#
        )
        .execute(pool)
        .await?;

        // Create grid_orders table
        sqlx::query!(
            r#"
            CREATE TABLE IF NOT EXISTS grid_orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
                order_type VARCHAR(10) NOT NULL,
                price DECIMAL(78, 18) NOT NULL,
                amount DECIMAL(78, 18) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                exchange_order_id VARCHAR(100),
                filled_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#
        )
        .execute(pool)
        .await?;

        // Create strategy_statistics table
        sqlx::query!(
            r#"
            CREATE TABLE IF NOT EXISTS strategy_statistics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
                total_profit DECIMAL(78, 18) DEFAULT 0,
                total_trades INTEGER DEFAULT 0,
                successful_trades INTEGER DEFAULT 0,
                current_price DECIMAL(78, 18),
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(strategy_id)
            )
            "#
        )
        .execute(pool)
        .await?;

        // Create trade_history table
        sqlx::query!(
            r#"
            CREATE TABLE IF NOT EXISTS trade_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
                order_id UUID NOT NULL REFERENCES grid_orders(id) ON DELETE CASCADE,
                trade_type VARCHAR(10) NOT NULL,
                price DECIMAL(78, 18) NOT NULL,
                amount DECIMAL(78, 18) NOT NULL,
                profit DECIMAL(78, 18) DEFAULT 0,
                transaction_hash VARCHAR(66),
                block_number BIGINT,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#
        )
        .execute(pool)
        .await?;

        debug!("Database tables created successfully");
        Ok(())
    }

    pub async fn create_indexes(pool: &PgPool) -> Result<()> {
        debug!("Creating database indexes...");

        // Strategies indexes
        sqlx::query!("CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id)")
            .execute(pool)
            .await?;
        
        sqlx::query!("CREATE INDEX IF NOT EXISTS idx_strategies_status ON strategies(status)")
            .execute(pool)
            .await?;
        
        sqlx::query!("CREATE INDEX IF NOT EXISTS idx_strategies_created_at ON strategies(created_at)")
            .execute(pool)
            .await?;

        // Grid orders indexes
        sqlx::query!("CREATE INDEX IF NOT EXISTS idx_grid_orders_strategy_id ON grid_orders(strategy_id)")
            .execute(pool)
            .await?;
        
        sqlx::query!("CREATE INDEX IF NOT EXISTS idx_grid_orders_status ON grid_orders(status)")
            .execute(pool)
            .await?;
        
        sqlx::query!("CREATE INDEX IF NOT EXISTS idx_grid_orders_price ON grid_orders(price)")
            .execute(pool)
            .await?;

        // Strategy statistics indexes
        sqlx::query!("CREATE INDEX IF NOT EXISTS idx_strategy_statistics_strategy_id ON strategy_statistics(strategy_id)")
            .execute(pool)
            .await?;

        // Trade history indexes
        sqlx::query!("CREATE INDEX IF NOT EXISTS idx_trade_history_strategy_id ON trade_history(strategy_id)")
            .execute(pool)
            .await?;
        
        sqlx::query!("CREATE INDEX IF NOT EXISTS idx_trade_history_executed_at ON trade_history(executed_at)")
            .execute(pool)
            .await?;

        debug!("Database indexes created successfully");
        Ok(())
    }

    pub async fn health_check(pool: &PgPool) -> Result<bool> {
        let result = sqlx::query!("SELECT 1 as health")
            .fetch_one(pool)
            .await?;
        
        Ok(result.health.unwrap_or(0) == 1)
    }
}