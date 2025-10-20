# EasyTrader - 智能交易策略控制台

## 🚀 项目概述

这是一个基于 Next.js 15 + TypeScript + TailwindCSS 的智能交易策略控制台，用于配置和管理自动化交易策略。

## ✨ 主要功能

### 1. 交易参数配置
- **交易所选择**: 
  - 中心化交易所：Binance、OKX
  - 去中心化交易所：Uniswap V3、PancakeSwap、SushiSwap
- **认证方式**: 
  - 中心化交易所：API Key 和 Secret
  - 去中心化交易所：钱包私钥和 RPC 节点
- **交易对设置**: 支持 BTC/USDT、ETH/USDT、ETH/WETH 等
- **网格策略参数**: 网格数量、间距、单笔交易额配置

### 2. 参数校验与安全
- ✅ 必填项检查
- ✅ 参数范围验证
- ✅ 实时错误提示
- ✅ 本地存储安全警告

### 3. 策略控制
- 🟢 **启动策略**: 一键启动交易策略
- 🟡 **暂停策略**: 临时暂停策略运行
- 🔴 **停止策略**: 完全停止策略
- 📊 **状态监控**: 实时显示策略运行状态

### 4. 实时监控
- 💰 **价格显示**: 实时获取交易对价格
- 📝 **交易日志**: 详细的交易执行记录
- 🔄 **自动刷新**: 每5秒更新价格和状态

## 🛠️ 技术栈

- **前端框架**: Next.js 15.5.6
- **开发语言**: TypeScript
- **样式框架**: TailwindCSS 4
- **构建工具**: Turbopack
- **状态管理**: React Hooks
- **HTTP 客户端**: Fetch API

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问应用
打开浏览器访问: `http://localhost:3000`

## 🔧 后端集成

### API 端点配置
- **后端地址**: `http://127.0.0.1:8081/backend`
- **启动策略**: `POST /start`
- **停止策略**: `POST /stop`
- **暂停策略**: `POST /pause`
- **获取状态**: `GET /status`
- **获取价格**: `GET /price/{exchange}/{symbol}`
- **获取日志**: `GET /logs`

### 启动策略参数

#### 中心化交易所参数
```json
{
  "exchange": "binance",
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "tradingPair": "BTC/USDT",
  "gridCount": 10,
  "gridSpacing": 0.5,
  "orderAmount": 100
}
```

#### 去中心化交易所参数
```json
{
  "exchange": "uniswap",
  "apiKey": "your_wallet_private_key",
  "apiSecret": "https://eth-mainnet.alchemyapi.io/v2/your-api-key",
  "tradingPair": "ETH/WETH",
  "gridCount": 10,
  "gridSpacing": 0.5,
  "orderAmount": 1.0
}
```

## 📱 界面功能

### 左侧面板 - 参数配置
- 交易所选择下拉框
- API Key/Secret 密码输入框
- 交易对文本输入框
- 网格参数数字输入框
- 启动按钮（带加载状态）

### 右侧面板 - 监控区域
- **价格显示卡片**: 实时价格更新
- **状态控制面板**: 启动/暂停/停止按钮
- **交易日志**: 滚动显示交易记录

## 🔒 安全特性

- ⚠️ **本地存储警告**: 不保存敏感信息到浏览器
- 🔐 **密码输入**: API Key/Secret 使用密码类型输入
- 🛡️ **HTTPS 支持**: 生产环境建议使用 HTTPS
- 📝 **隐私提示**: 明确说明 API Key 使用范围

## 🎨 UI/UX 特性

- 🌙 **暗色模式**: 自动检测系统主题偏好
- 📱 **响应式设计**: 支持移动端和桌面端
- ⚡ **快速加载**: 使用 Turbopack 优化构建速度
- 🎯 **直观操作**: 简洁明了的用户界面

## 📊 状态指示

- 🔴 **红色**: 停止/错误状态
- 🟡 **黄色**: 暂停状态
- 🟢 **绿色**: 运行中状态
- 🔵 **蓝色**: 启动中状态

## 🚀 部署说明

### 开发环境
```bash
npm run dev
```

### 生产构建
```bash
npm run build
npm start
```

## 📝 注意事项

1. **后端服务**: 确保 Rust 后端服务运行在 `127.0.0.1:8081`
2. **API 密钥**: 请使用您自己的交易所 API 密钥
3. **网络连接**: 确保能够访问交易所 API
4. **风险提示**: 交易有风险，请谨慎操作

## 🤝 贡献

- **团队**: EasyTrader
- **GitHub**: https://github.com/Liuzhichao99/EthShanghai2025EasyTrader

## 🔗 去中心化交易所支持

### 支持的 DEX
- **Uniswap V3**: 以太坊主网上的主要 DEX
- **PancakeSwap**: BSC 链上的主要 DEX  
- **SushiSwap**: 多链 DEX 协议

### DEX 配置要求
1. **钱包私钥**: 用于签名交易
2. **RPC 节点**: 连接区块链网络
3. **Gas 费用**: 确保钱包有足够的 ETH/BNB 支付 Gas

### 推荐 RPC 服务商
- **Alchemy**: `https://eth-mainnet.alchemyapi.io/v2/your-api-key`
- **Infura**: `https://mainnet.infura.io/v3/your-project-id`
- **QuickNode**: `https://your-endpoint.quiknode.pro/your-api-key/`

### 安全注意事项
- ⚠️ **私钥安全**: 建议使用专用交易钱包
- 🔐 **环境隔离**: 在测试网环境先测试
- 💰 **资金管理**: 不要投入超过承受能力的资金
- 🛡️ **智能合约**: 确保了解 DEX 的智能合约风险

## 📄 许可证

本项目仅供学习和演示使用。
