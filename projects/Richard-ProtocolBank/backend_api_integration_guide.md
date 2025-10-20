# Protocol Bank 后端 API 集成指南

本指南提供了将 Protocol Bank 前端与后端 Flask API 连接的完整说明，包括数据库配置、缓存设置和区块链集成。

## 1. 后端 API 服务器设置

### 1.1 Flask API 基础配置

后端 API 已在 `/home/ubuntu/protocol-bank-api/` 目录中准备就绪。该 API 提供以下核心功能：

*   **用户认证和账户管理**：处理用户注册、登录、KYC 验证。
*   **交易管理**：支持法币和加密货币交易。
*   **DeFi 服务**：借贷、流支付、自动支付拆分。
*   **区块链集成**：与 Solana 和以太坊网络交互。

### 1.2 环境配置

在部署后端 API 之前，需要配置以下环境变量。创建 `.env` 文件在 `/home/ubuntu/protocol-bank-api/` 目录中：

```
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/protocol_bank
REDIS_URL=redis://localhost:6379/0

# JWT 配置
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=EdDSA

# Solana 配置
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
SOLANA_PROGRAM_ID=your-program-id-here

# 以太坊配置
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-infura-key
ETHEREUM_NETWORK=mainnet
ETHEREUM_CONTRACT_ADDRESS=your-contract-address-here

# KYC/AML 提供商
KYC_PROVIDER=onfido  # 或 jumio, sumsub
KYC_API_KEY=your-kyc-api-key

# 支付网关
PAYMENT_GATEWAY=stripe  # 或 adyen, worldpay
PAYMENT_API_KEY=your-payment-api-key

# 汇率服务
EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key

# 应用配置
FLASK_ENV=production
DEBUG=False
```

## 2. 数据库设置

### 2.1 PostgreSQL 数据库

Protocol Bank 使用 PostgreSQL 作为主要数据存储。以下是数据库初始化步骤：

**在您的 PostgreSQL 服务器上执行：**

```sql
-- 创建数据库
CREATE DATABASE protocol_bank;

-- 连接到数据库
\c protocol_bank

-- 创建用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    kyc_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建账户表
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    account_type VARCHAR(50),
    currency VARCHAR(10),
    balance DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建交易表
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    from_account_id INTEGER REFERENCES accounts(id),
    to_account_id INTEGER REFERENCES accounts(id),
    amount DECIMAL(20, 8),
    transaction_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    blockchain_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建 DeFi 借贷表
CREATE TABLE defi_loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(20, 8),
    collateral_amount DECIMAL(20, 8),
    interest_rate DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建 KYC 信息表
CREATE TABLE kyc_info (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    date_of_birth DATE,
    country VARCHAR(100),
    verification_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_transactions_from_account ON transactions(from_account_id);
CREATE INDEX idx_transactions_to_account ON transactions(to_account_id);
CREATE INDEX idx_defi_loans_user_id ON defi_loans(user_id);
CREATE INDEX idx_kyc_info_user_id ON kyc_info(user_id);
```

### 2.2 数据库连接

在 Flask 应用中，使用 SQLAlchemy ORM 连接数据库。后端代码已包含相应的模型定义（位于 `/home/ubuntu/protocol-bank-api/src/models/`）。

## 3. Redis 缓存设置

### 3.1 Redis 配置

Redis 用于缓存会话数据、API 响应和速率限制。以下是基本配置：

**在您的 Redis 服务器上执行：**

```bash
# 启动 Redis 服务器（如果使用本地 Redis）
redis-server

# 或使用 Docker
docker run -d -p 6379:6379 redis:latest
```

### 3.2 Flask 中的 Redis 集成

后端 API 已配置为使用 Flask-Caching 和 Redis。在 Flask 应用中：

```python
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'redis', 'CACHE_REDIS_URL': os.getenv('REDIS_URL')})
```

## 4. 区块链集成

### 4.1 Solana RPC 节点连接

后端 API 需要连接到 Solana RPC 节点以进行交易和数据查询。配置方式：

```python
from solders.rpc.responses import GetAccountInfoResp
from solana.rpc.api import Client

solana_client = Client(os.getenv('SOLANA_RPC_URL'))

# 查询账户信息示例
account_info = solana_client.get_account_info(public_key)
```

### 4.2 以太坊 RPC 节点连接

类似地，后端 API 连接到以太坊 RPC 节点：

```python
from web3 import Web3

web3 = Web3(Web3.HTTPProvider(os.getenv('ETHEREUM_RPC_URL')))

# 查询账户余额示例
balance = web3.eth.get_balance(account_address)
```

## 5. 前端与后端 API 连接

### 5.1 API 端点配置

在前端项目中，配置 API 基础 URL。编辑 `/home/ubuntu/protocol-bank/src/api/config.js`（如果不存在则创建）：

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default API_BASE_URL;
```

### 5.2 前端 API 调用示例

在前端组件中调用后端 API：

```javascript
import API_BASE_URL from './api/config.js';

// 用户登录
async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
}

// 获取账户信息
async function getAccountInfo(accountId) {
  const response = await fetch(`${API_BASE_URL}/accounts/${accountId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// 发起交易
async function sendTransaction(fromAccountId, toAccountId, amount) {
  const response = await fetch(`${API_BASE_URL}/transactions/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ from_account_id: fromAccountId, to_account_id: toAccountId, amount: amount })
  });
  return response.json();
}
```

### 5.3 CORS 配置

确保后端 API 配置了正确的 CORS 设置，以允许前端跨域请求。在 Flask 应用中：

```python
from flask_cors import CORS

CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "https://yourdomain.com"]}})
```

## 6. 部署步骤

### 6.1 启动后端 API 服务器

```bash
cd /home/ubuntu/protocol-bank-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/main.py
```

### 6.2 启动前端开发服务器

```bash
cd /home/ubuntu/protocol-bank
npm install
npm run dev
```

### 6.3 生产部署

对于生产环境，建议使用 Gunicorn 和 Nginx：

```bash
# 使用 Gunicorn 启动 Flask 应用
gunicorn -w 4 -b 0.0.0.0:5000 src.main:app

# 或使用 Docker 容器化部署
docker build -t protocol-bank-api .
docker run -p 5000:5000 --env-file .env protocol-bank-api
```

## 7. 测试 API 连接

使用 curl 或 Postman 测试 API 端点：

```bash
# 健康检查
curl http://localhost:5000/api/health

# 用户登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# 获取账户列表
curl http://localhost:5000/api/accounts \
  -H "Authorization: Bearer your-jwt-token"
```

## 8. 监控和日志

配置日志记录以监控 API 性能和错误：

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('protocol_bank_api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
```

## 总结

通过遵循本指南，您可以成功配置和部署 Protocol Bank 的后端 API，并将其与前端应用连接。确保所有环境变量都正确设置，数据库和缓存服务器正常运行，以及区块链 RPC 节点可访问。

