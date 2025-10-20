# 安全配置指南

## 环境变量配置

### 必需的环境变量

在使用本项目前，请确保正确配置以下环境变量：

#### 后端配置 (backend/.env)

```bash
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ethxai

# Qwen AI 配置
QWEN_API_KEY=your_qwen_api_key_here
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus

# 区块链网络配置
WEB3_PROVIDER_URL=https://ethereum-holesky-rpc.publicnode.com
HOLESKY_RPC_URL=https://ethereum-holesky-rpc.publicnode.com
MAINNET_RPC_URL=https://mainnet.infura.io/v3/your_infura_key
ETHEREUM_RPC_URL=https://eth.llamarpc.com
CHAIN_ID=17000
NETWORK_ID=17000

# Etherscan API
ETHERSCAN_API_KEY=your_etherscan_api_key_here
ETHEREUM_API_KEY=your_ethereum_api_key_here

# 服务器配置
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5174

# 私钥 (仅用于部署合约)
PRIVATE_KEY=your_private_key_here
```

#### 前端配置 (frontend-react/.env)

```bash
# API 配置
VITE_API_URL=http://localhost:3001

# WebSocket 配置
VITE_WS_URL=http://localhost:3001

# 环境配置
NODE_ENV=development
```

## 安全注意事项

### 1. 环境变量安全

- **永远不要**将真实的API密钥提交到版本控制系统
- 使用 `.env.example` 文件作为配置模板
- 确保 `.env` 文件已添加到 `.gitignore`

### 2. API密钥管理

- **Qwen API密钥**: 从阿里云控制台获取
- **Etherscan API密钥**: 从 etherscan.io 注册获取
- **Infura密钥**: 从 infura.io 注册获取

### 3. 私钥安全

- 仅在开发环境使用测试私钥
- 生产环境使用硬件钱包或安全的密钥管理服务
- 永远不要在代码中硬编码私钥

### 4. 生产环境配置

- 设置 `NODE_ENV=production`
- 使用强密码和安全的数据库连接
- 启用HTTPS
- 配置防火墙和访问控制

## 快速开始

1. 复制配置模板：
```bash
cp backend/.env.example backend/.env
cp frontend-react/.env.example frontend-react/.env
```

2. 编辑配置文件，填入真实的API密钥

3. 启动项目：
```bash
# 后端
cd backend
npm install
npm start

# 前端
cd frontend-react
npm install
npm run dev
```

## 报告安全问题

如果您发现安全漏洞，请通过以下方式联系我们：
- 发送邮件至：security@example.com
- 创建私有issue报告

请不要在公开渠道披露安全问题。