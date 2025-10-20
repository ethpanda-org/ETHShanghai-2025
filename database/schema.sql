-- EasyTrader 数据库表结构
-- MySQL 8.0 版本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS easytrader DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE easytrader;

-- 用户表
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 交易所配置表
CREATE TABLE exchange_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    exchange_name VARCHAR(50) NOT NULL, -- binance, okx, uniswap, pancakeswap, sushiswap
    api_key VARCHAR(255) NOT NULL, -- 加密存储
    api_secret VARCHAR(255) NOT NULL, -- 加密存储
    rpc_url VARCHAR(500), -- 仅DEX需要
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_exchange (user_id, exchange_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 交易策略表
CREATE TABLE trading_strategies (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    strategy_name VARCHAR(100) NOT NULL,
    exchange_config_id BIGINT NOT NULL,
    trading_pair VARCHAR(20) NOT NULL, -- BTC/USDT, ETH/USDT
    grid_count INT NOT NULL,
    grid_spacing DECIMAL(10,4) NOT NULL, -- 百分比
    order_amount DECIMAL(20,8) NOT NULL,
    status ENUM('idle', 'starting', 'running', 'paused', 'stopped', 'error') DEFAULT 'idle',
    total_profit DECIMAL(20,8) DEFAULT 0.00000000,
    total_trades INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    stopped_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exchange_config_id) REFERENCES exchange_configs(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    INDEX idx_exchange_config (exchange_config_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 交易订单表
CREATE TABLE trading_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    strategy_id BIGINT NOT NULL,
    order_type ENUM('buy', 'sell') NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    status ENUM('pending', 'filled', 'cancelled', 'failed') DEFAULT 'pending',
    exchange_order_id VARCHAR(100), -- 交易所订单ID
    fee DECIMAL(20,8) DEFAULT 0.00000000,
    profit DECIMAL(20,8) DEFAULT 0.00000000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    filled_at TIMESTAMP NULL,
    FOREIGN KEY (strategy_id) REFERENCES trading_strategies(id) ON DELETE CASCADE,
    INDEX idx_strategy_status (strategy_id, status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 价格历史表
CREATE TABLE price_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    trading_pair VARCHAR(20) NOT NULL,
    exchange_name VARCHAR(50) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pair_exchange_time (trading_pair, exchange_name, timestamp),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 交易日志表
CREATE TABLE trading_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    strategy_id BIGINT,
    log_type ENUM('info', 'success', 'error', 'trade', 'warning') NOT NULL,
    message TEXT NOT NULL,
    metadata JSON, -- 存储额外信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (strategy_id) REFERENCES trading_strategies(id) ON DELETE CASCADE,
    INDEX idx_strategy_type_time (strategy_id, log_type, created_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 策略统计表
CREATE TABLE strategy_statistics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    strategy_id BIGINT NOT NULL,
    date DATE NOT NULL,
    total_trades INT DEFAULT 0,
    successful_trades INT DEFAULT 0,
    failed_trades INT DEFAULT 0,
    total_profit DECIMAL(20,8) DEFAULT 0.00000000,
    total_volume DECIMAL(20,8) DEFAULT 0.00000000,
    max_drawdown DECIMAL(20,8) DEFAULT 0.00000000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (strategy_id) REFERENCES trading_strategies(id) ON DELETE CASCADE,
    UNIQUE KEY uk_strategy_date (strategy_id, date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统配置表
CREATE TABLE system_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description VARCHAR(255),
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('api_rate_limit', '100', 'API 请求频率限制（每分钟）'),
('max_concurrent_strategies', '10', '最大并发策略数量'),
('price_update_interval', '5', '价格更新间隔（秒）'),
('log_retention_days', '30', '日志保留天数'),
('encryption_key', 'your-encryption-key-here', '数据加密密钥');

-- 创建视图：策略概览
CREATE VIEW strategy_overview AS
SELECT 
    ts.id,
    ts.strategy_name,
    ts.trading_pair,
    ts.status,
    ts.total_profit,
    ts.total_trades,
    ts.created_at,
    ts.started_at,
    ts.stopped_at,
    ec.exchange_name,
    u.username
FROM trading_strategies ts
JOIN exchange_configs ec ON ts.exchange_config_id = ec.id
JOIN users u ON ts.user_id = u.id;

-- 创建视图：今日交易统计
CREATE VIEW daily_trading_stats AS
SELECT 
    DATE(created_at) as trade_date,
    COUNT(*) as total_orders,
    SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) as filled_orders,
    SUM(CASE WHEN status = 'filled' THEN profit ELSE 0 END) as total_profit,
    AVG(CASE WHEN status = 'filled' THEN profit ELSE NULL END) as avg_profit
FROM trading_orders
WHERE created_at >= CURDATE()
GROUP BY DATE(created_at);
