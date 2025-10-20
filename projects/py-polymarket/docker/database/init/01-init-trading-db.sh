#!/bin/bash
# PostgreSQL Initialization Script for Polymarket Trading System

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL

    -- Enable necessary extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
    CREATE EXTENSION IF NOT EXISTS "btree_gin";
    CREATE EXTENSION IF NOT EXISTS "btree_gist";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    -- Create trading system users
    CREATE USER trading_engine WITH PASSWORD 'trading_engine_password_change_me';
    CREATE USER risk_manager WITH PASSWORD 'risk_manager_password_change_me';
    CREATE USER data_collector WITH PASSWORD 'data_collector_password_change_me';
    CREATE USER monitoring WITH PASSWORD 'monitoring_password_change_me';

    -- Create schemas
    CREATE SCHEMA IF NOT EXISTS trading;
    CREATE SCHEMA IF NOT EXISTS market_data;
    CREATE SCHEMA IF NOT EXISTS risk_management;
    CREATE SCHEMA IF NOT EXISTS analytics;
    CREATE SCHEMA IF NOT EXISTS audit;

    -- Grant permissions
    GRANT USAGE ON SCHEMA trading TO trading_engine, risk_manager;
    GRANT USAGE ON SCHEMA market_data TO data_collector, trading_engine, risk_manager, monitoring;
    GRANT USAGE ON SCHEMA risk_management TO risk_manager, trading_engine;
    GRANT USAGE ON SCHEMA analytics TO monitoring;
    GRANT USAGE ON SCHEMA audit TO monitoring;

    -- Create core tables
    
    -- Markets table
    CREATE TABLE market_data.markets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        market_id VARCHAR(255) UNIQUE NOT NULL,
        question TEXT NOT NULL,
        description TEXT,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        end_date_iso TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'active',
        volume_24h DECIMAL(20,2) DEFAULT 0,
        liquidity DECIMAL(20,2) DEFAULT 0,
        fee_rate DECIMAL(10,6) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Market outcomes table
    CREATE TABLE market_data.market_outcomes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        market_id UUID REFERENCES market_data.markets(id) ON DELETE CASCADE,
        outcome_name VARCHAR(100) NOT NULL,
        outcome_price DECIMAL(10,6),
        volume_24h DECIMAL(20,2) DEFAULT 0,
        last_price DECIMAL(10,6),
        price_change_24h DECIMAL(10,6),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(market_id, outcome_name)
    );

    -- Price history table (partitioned by date)
    CREATE TABLE market_data.price_history (
        id UUID DEFAULT uuid_generate_v4(),
        market_id UUID NOT NULL,
        outcome_name VARCHAR(100) NOT NULL,
        price DECIMAL(10,6) NOT NULL,
        volume DECIMAL(20,2) DEFAULT 0,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        source VARCHAR(50) DEFAULT 'api',
        PRIMARY KEY (id, timestamp)
    ) PARTITION BY RANGE (timestamp);

    -- Create monthly partitions for price history (example for current year)
    CREATE TABLE market_data.price_history_2025_01 PARTITION OF market_data.price_history
        FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
    CREATE TABLE market_data.price_history_2025_02 PARTITION OF market_data.price_history
        FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
    -- Add more partitions as needed

    -- Orders table
    CREATE TABLE trading.orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id VARCHAR(255) UNIQUE NOT NULL,
        market_id UUID REFERENCES market_data.markets(id),
        outcome_name VARCHAR(100) NOT NULL,
        side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
        size DECIMAL(20,2) NOT NULL,
        price DECIMAL(10,6) NOT NULL,
        filled_size DECIMAL(20,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled', 'partial')),
        order_type VARCHAR(20) DEFAULT 'limit' CHECK (order_type IN ('limit', 'market')),
        strategy_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        filled_at TIMESTAMP WITH TIME ZONE
    );

    -- Positions table
    CREATE TABLE trading.positions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        market_id UUID REFERENCES market_data.markets(id),
        outcome_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(20,2) NOT NULL,
        average_price DECIMAL(10,6) NOT NULL,
        current_price DECIMAL(10,6),
        unrealized_pnl DECIMAL(20,2),
        realized_pnl DECIMAL(20,2) DEFAULT 0,
        strategy_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(market_id, outcome_name)
    );

    -- Trading strategies performance
    CREATE TABLE analytics.strategy_performance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        strategy_name VARCHAR(100) NOT NULL,
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        total_pnl DECIMAL(20,2) DEFAULT 0,
        max_drawdown DECIMAL(20,2) DEFAULT 0,
        sharpe_ratio DECIMAL(10,4),
        win_rate DECIMAL(5,4),
        avg_trade_pnl DECIMAL(20,2),
        period_start TIMESTAMP WITH TIME ZONE NOT NULL,
        period_end TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Risk metrics table
    CREATE TABLE risk_management.risk_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        portfolio_value DECIMAL(20,2) NOT NULL,
        total_exposure DECIMAL(20,2) NOT NULL,
        leverage_ratio DECIMAL(10,4) NOT NULL,
        var_95 DECIMAL(20,2),
        max_position_size DECIMAL(20,2),
        correlation_risk DECIMAL(10,4),
        liquidity_risk DECIMAL(10,4),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Audit log table
    CREATE TABLE audit.audit_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        table_name VARCHAR(100) NOT NULL,
        operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
        old_values JSONB,
        new_values JSONB,
        user_name VARCHAR(100),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for performance
    
    -- Markets indexes
    CREATE INDEX idx_markets_market_id ON market_data.markets(market_id);
    CREATE INDEX idx_markets_category ON market_data.markets(category);
    CREATE INDEX idx_markets_status ON market_data.markets(status);
    CREATE INDEX idx_markets_end_date ON market_data.markets(end_date_iso);
    
    -- Market outcomes indexes
    CREATE INDEX idx_outcomes_market_id ON market_data.market_outcomes(market_id);
    CREATE INDEX idx_outcomes_price ON market_data.market_outcomes(outcome_price);
    
    -- Price history indexes
    CREATE INDEX idx_price_history_market_outcome ON market_data.price_history(market_id, outcome_name);
    CREATE INDEX idx_price_history_timestamp ON market_data.price_history(timestamp);
    
    -- Orders indexes
    CREATE INDEX idx_orders_market_id ON trading.orders(market_id);
    CREATE INDEX idx_orders_status ON trading.orders(status);
    CREATE INDEX idx_orders_strategy ON trading.orders(strategy_name);
    CREATE INDEX idx_orders_created_at ON trading.orders(created_at);
    
    -- Positions indexes
    CREATE INDEX idx_positions_market_id ON trading.positions(market_id);
    CREATE INDEX idx_positions_strategy ON trading.positions(strategy_name);
    
    -- Create functions for automatic timestamp updates
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS \$\$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    \$\$ language 'plpgsql';

    -- Create triggers for automatic timestamp updates
    CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON market_data.markets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_outcomes_updated_at BEFORE UPDATE ON market_data.market_outcomes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON trading.orders
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON trading.positions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Grant table-level permissions
    GRANT SELECT, INSERT, UPDATE ON market_data.markets TO data_collector;
    GRANT SELECT, INSERT, UPDATE ON market_data.market_outcomes TO data_collector;
    GRANT SELECT, INSERT ON market_data.price_history TO data_collector;
    
    GRANT SELECT ON market_data.* TO trading_engine, risk_manager;
    GRANT SELECT, INSERT, UPDATE ON trading.orders TO trading_engine;
    GRANT SELECT, INSERT, UPDATE ON trading.positions TO trading_engine;
    
    GRANT SELECT ON ALL TABLES IN SCHEMA trading TO risk_manager;
    GRANT SELECT, INSERT, UPDATE ON risk_management.risk_metrics TO risk_manager;
    
    GRANT SELECT ON ALL TABLES IN SCHEMA market_data, trading, analytics, risk_management TO monitoring;

    -- Create monitoring views
    CREATE VIEW analytics.trading_summary AS
    SELECT 
        DATE(created_at) as trading_date,
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) as filled_orders,
        AVG(CASE WHEN status = 'filled' THEN size * price ELSE NULL END) as avg_trade_value,
        SUM(CASE WHEN status = 'filled' THEN size * price ELSE 0 END) as total_volume
    FROM trading.orders
    GROUP BY DATE(created_at)
    ORDER BY trading_date DESC;

    CREATE VIEW analytics.market_overview AS
    SELECT 
        m.market_id,
        m.question,
        m.category,
        m.volume_24h,
        m.liquidity,
        COUNT(mo.id) as outcome_count,
        MAX(mo.updated_at) as last_price_update
    FROM market_data.markets m
    LEFT JOIN market_data.market_outcomes mo ON m.id = mo.market_id
    WHERE m.status = 'active'
    GROUP BY m.id, m.market_id, m.question, m.category, m.volume_24h, m.liquidity;

    GRANT SELECT ON analytics.trading_summary TO monitoring;
    GRANT SELECT ON analytics.market_overview TO monitoring;

EOSQL

echo "PostgreSQL database initialized successfully for Polymarket trading system"