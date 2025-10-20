# 🚀 EasyTrader 快速启动指南

## 📋 一键部署清单

### ✅ 已完成的工作

1. **数据库设计** ✅
   - PostgreSQL 表结构设计完成
   - 数据库迁移文件已创建 (`backend/migrations/`)
   - 自动建表功能

2. **后端 API** ✅
   - Rust + Tokio 异步框架
   - 网格交易策略引擎
   - Uniswap V3 集成
   - 实时价格监控

3. **前端界面** ✅
   - Next.js 15 + TypeScript
   - 响应式 UI 设计
   - 实时价格显示
   - 策略控制面板

## 🚀 快速启动步骤

### 1. 数据库设置 (5分钟)

```bash
# 1. 启动 PostgreSQL 服务
# Windows: 启动 PostgreSQL 服务
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql

# 2. 创建数据库
sudo -u postgres psql
```

在 PostgreSQL 中执行：
```sql
CREATE DATABASE grid_trading;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE grid_trading TO postgres;
\q
```

### 2. 后端启动 (3分钟)

```bash
# 1. 进入后端目录
cd backend

# 2. 配置环境变量 (已有 .env 文件，可直接修改)
# 编辑 .env 文件，确保以下配置正确：
# DATABASE_URL=postgresql://postgres:password@localhost/grid_trading
# SERVER_HOST=0.0.0.0
# SERVER_PORT=8080
# ETH_RPC_URL=https://ethereum-rpc.publicnode.com
# CHAIN_ID=1
# RUST_LOG=info

# 3. 启动后端服务
# 使用网格交易机器人
cd EthShanghai2025EasyTrader/backend
cargo run --bin grid-trading-bot

# 前端启动

```bash
# 1. 进入前端目录
cd my-next-app

# 2. 安装依赖
npm install

# 3. 启动前端服务
cd EthShanghai2025EasyTrader/my-next-app
npm run dev
```

### 4. 访问应用

- **前端界面**: http://localhost:3000
- **后端 API**: http://localhost:8080
- **价格查询**: http://localhost:8080/price

## 🔧 API 测试

### 测试后端 API

```bash
# 1. 获取 ETH/USDC 价格
curl http://localhost:8080/price

# 2. 获取指定交易对价格
curl -X POST http://localhost:8080/price \
  -H "Content-Type: application/json" \
  -d '{
    "token_in": "WETH",
    "token_out": "USDC"
  }'

# 3. 启动网格交易策略
curl -X POST http://localhost:8080/start \
  -H "Content-Type: application/json" \
  -d '{
    "token_pair": "WETH/USDC",
    "grid_count": 10,
    "price_range": {
      "min": 3500.0,
      "max": 4500.0
    },
    "total_amount": 1000.0
  }'

# 4. 查看策略状态
curl http://localhost:8080/status

# 5. 停止策略
curl -X POST http://localhost:8080/stop
```

## 📊 功能验证

### 前端功能测试

1. **价格显示**
   - ✅ 实时 ETH/USDC 价格显示
   - ✅ 价格自动刷新
   - ✅ 错误处理和重试

2. **策略控制**
   - ✅ 启动网格交易策略
   - ✅ 暂停策略
   - ✅ 停止策略
   - ✅ 策略状态监控

3. **参数配置**
   - ✅ 网格数量设置
   - ✅ 价格区间配置
   - ✅ 投资金额设置

### 后端功能测试

1. **数据库连接**
   - ✅ PostgreSQL 连接池
   - ✅ 自动建表
   - ✅ 数据持久化

2. **Uniswap 集成**
   - ✅ V3 池价格查询
   - ✅ 多费率池支持 (0.05%, 0.3%, 1%)
   - ✅ 实时价格监控

3. **网格交易引擎**
   - ✅ 策略创建和管理
   - ✅ 价格监控和触发
   - ✅ 订单执行逻辑

## 🎯 下一步

### 生产环境部署

1. **安全配置**
   - 配置私钥管理
   - 设置 HTTPS
   - 配置防火墙

2. **性能优化**
   - 数据库索引优化
   - 连接池配置
   - 价格缓存策略

3. **监控告警**
   - 策略执行日志
   - 价格异常监控
   - 系统性能监控

### 功能扩展

1. **更多 DEX 支持**
   - Uniswap V2 集成
   - SushiSwap 支持
   - 1inch 聚合器

2. **策略优化**
   - 动态网格调整
   - 止损止盈机制
   - 收益分析报告

3. **用户体验**
   - 移动端适配
   - 实时通知
   - 图表可视化

## 🆘 常见问题

### Q: 数据库连接失败
```bash
# 检查 PostgreSQL 服务
sudo systemctl status postgresql

# 检查端口
netstat -tlnp | grep 5432

# 测试连接
psql -h localhost -U postgres -d grid_trading
```

### Q: 后端启动失败
```bash
# 检查端口占用
netstat -tlnp | grep 8080

# 查看错误日志
cargo run --bin grid-trading-bot 2>&1 | tee error.log

# 检查环境变量
cat backend/.env
```

### Q: 前端构建失败
```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install

# 检查 Node.js 版本
node --version  # 需要 18+
npm --version
```

### Q: Uniswap 价格获取失败
```bash
# 检查网络连接
curl -s https://ethereum-rpc.publicnode.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 检查环境变量
grep ETH_RPC_URL backend/.env
grep CHAIN_ID backend/.env
```

## 📞 技术支持

- **GitHub**: https://github.com/Liuzhichao99/EthShanghai2025EasyTrader
- **团队**: EasyTrader
- **文档**: 查看 `DEPLOYMENT_GUIDE.md` 获取详细部署说明

---

## 🎉 项目总结

**EasyTrader** 是一个基于 Uniswap V3 的智能网格交易系统，具有以下特点：

### 🔧 技术架构
- **后端**: Rust + Tokio 异步框架，高性能并发处理
- **前端**: Next.js 15 + TypeScript，现代化响应式界面
- **数据库**: PostgreSQL，可靠的数据持久化
- **区块链**: 以太坊主网 + Uniswap V3 协议

### 🚀 核心功能
- **实时价格监控**: 从多个费率池获取最优价格
- **智能网格交易**: 自动化买低卖高策略
- **风险控制**: 价格区间限制和止损机制
- **用户友好**: 简洁直观的操作界面

### 📊 快速开始
1. **数据库**: PostgreSQL (端口 5432)
2. **后端**: `cargo run --bin grid-trading-bot` (端口 8080)
3. **前端**: `npm run dev` (端口 3000)

### ⚠️ 重要提醒
- **测试环境**: 当前配置为以太坊主网，请谨慎操作
- **私钥安全**: 确保私钥安全存储，不要泄露
- **资金风险**: 网格交易存在市场风险，请合理配置参数
- **Gas 费用**: 以太坊主网交易需要支付 Gas 费用

🎯 **现在您可以开始使用 EasyTrader 进行智能网格交易了！**

**注意**: 请确保在真实交易前充分测试，交易有风险，请谨慎操作！
