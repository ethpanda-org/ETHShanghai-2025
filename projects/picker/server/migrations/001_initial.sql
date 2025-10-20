-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    user_id BLOB PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    user_name TEXT NOT NULL,
    user_password TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('gen', 'dev')),
    private_key TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    premium_balance INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- 创建Picker表
CREATE TABLE IF NOT EXISTS pickers (
    picker_id BLOB PRIMARY KEY,
    dev_user_id BLOB NOT NULL,
    alias TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    file_path TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    download_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (dev_user_id) REFERENCES users (user_id)
);

-- 创建订单表
CREATE TABLE IF NOT EXISTS orders (
    order_id BLOB PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'expired')),
    user_id BLOB NOT NULL,
    picker_id BLOB NOT NULL,
    pay_type TEXT NOT NULL CHECK (pay_type IN ('wallet', 'premium')),
    amount INTEGER NOT NULL,
    tx_hash TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (picker_id) REFERENCES pickers (picker_id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_pickers_status ON pickers (status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_picker_id ON orders (picker_id)
CREATE INDEX IF NOT EXISTS idx_orders_pay_type ON orders (pay_type)
