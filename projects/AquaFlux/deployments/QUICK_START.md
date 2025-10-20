# AquaFlux 快速开始指南

> 5分钟完成部署和演示 — 适合黑客松评审和快速体验

---

## 🎯 目标

本指南将帮助你：
1. ✅ 在本地/Sepolia部署完整的AquaFlux协议
2. ✅ 启动前后端服务
3. ✅ 完成一次完整的 Split → Trade → Merge 流程
4. ✅ 体验到期分配与收益领取

**预计时间**: 10-15分钟

---

## 📋 前置要求

### 必需
- Node.js 18+ (推荐 18.17+)
- pnpm 8+ (`npm install -g pnpm`)
- Git

### 可选 (用于Sepolia部署)
- MetaMask 钱包
- Sepolia 测试网 ETH ([水龙头](https://sepoliafaucet.com/))
- Alchemy/Infura API Key

## 📦 手动部署 (完整流程)

### Step 1: 部署智能合约 (5分钟)

#### 1.1 安装依赖
```bash
cd contracts
pnpm install
```

#### 1.2 配置环境变量
```bash
# 创建 .env 文件
cat > .env << EOF
# 使用Sepolia测试网
ALCHEMY_API_KEY=your_alchemy_key
TEST_PRIVATE_KEY=0x...your_private_key

# 或使用本地Hardhat网络 (无需配置)
EOF
```

#### 1.3 编译合约
```bash
pnpm compile
```

#### 1.4 运行测试 (可选)
```bash
pnpm test
# 应该看到所有测试通过 ✓
```

#### 1.5 部署到Sepolia
```bash
pnpm hardhat run scripts/deploy/deploy-all.ts --network sepolia

# 或部署到本地网络 (新终端)
# Terminal 1: npx hardhat node
# Terminal 2: pnpm hardhat run scripts/deploy/deploy-all.ts --network localhost
```

**输出示例**:
```
✅ MockERC20 deployed: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ AqToken deployed: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✅ PToken deployed: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
...
✅ All contracts deployed successfully!
📝 Addresses saved to scripts/deploy/addresses.json
```

### Step 2: 启动后端服务 (3分钟)

#### 2.1 安装依赖
```bash
cd ../backend
pnpm install
```

#### 2.2 配置环境变量
```bash
cp .env.example .env

# 编辑 .env (如果使用Docker默认值可跳过)
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aquaflux_dev"
# REDIS_URL="redis://localhost:6379"
# JWT_SECRET="your-secret-key-at-least-32-chars"
```

#### 2.3 数据库迁移
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

#### 2.4 启动开发服务器
```bash
pnpm dev

# 应该看到:
# 🚀 Server running on http://localhost:3001
```

#### 2.5 测试API (新终端)
```bash
curl http://localhost:3001/api/v1/health
# 响应: {"status":"ok"}
```

---

### Step 3: 启动前端 (2分钟)

#### 3.1 安装依赖
```bash
cd ../frontend
npm install
```

#### 3.2 配置合约地址
```bash
# 复制合约部署地址到前端
cp ../contracts/scripts/deploy/addresses.json src/constants/deployments.json

# 或手动编辑 src/constants/addresses.ts
# export const AQUAFLUX_CORE_ADDRESS = "0x..."
```

#### 3.3 启动开发服务器
```bash
npm run dev

# 应该看到:
# ➜  Local:   http://localhost:5173/
```

#### 3.4 连接钱包
1. 访问 http://localhost:5173
2. 点击右上角 "Connect Wallet"
3. 选择 MetaMask
4. 切换到 Sepolia 测试网 (或 Localhost 8545)

---

## 🎮 完整演示流程
```bash
cd contracts
npx hardhat run scripts/interactions/demo-all.ts --network sepolia
```
---

## 🧪 测试套件

### 合约单元测试
```bash
cd contracts
pnpm test                           # 运行所有测试
pnpm test test/basic.test.js        # 运行单个测试
pnpm coverage                       # 测试覆盖率报告
```

### 集成测试
```bash
pnpm test test/complete-lifecycle.test.js
```

**测试覆盖**:
- ✅ Register → Verify 流程
- ✅ Wrap → Split → Merge → Unwrap 往返
- ✅ 费用计算准确性
- ✅ 到期分配与领取
- ✅ 权限控制
- ✅ 暂停/恢复机制

---

## 📚 下一步

完成快速开始后，你可以:

1. 📖 阅读 [架构文档](../docs/ARCHITECTURE.md) 了解技术细节
2. 🔧 查看 [合约README](../contracts/README.md) 学习合约接口
3. 🎨 探索 [前端代码](../frontend/src) 自定义UI
4. 🚀 部署到主网 (需专业审计)

---

## 🤝 获取帮助

- 📧 Email: hi@aquaflux.pro
- 💬 Discord: [AquaFlux Community](#)
- 📖 文档: [docs/](./README.md)
- 🐛 问题: [GitHub Issues](#)

---

## ✅ 验收清单

完成以下清单即可完整体验AquaFlux:

- [ ] 合约成功部署到Sepolia
- [ ] 后端API可访问 (`curl http://localhost:3001/api/v1/health`)
- [ ] 前端页面加载正常
- [ ] 钱包成功连接
- [ ] 完成一次 Wrap 操作
- [ ] 完成一次 Split 操作
- [ ] P/C/S代币余额正确显示
- [ ] 完成一次 Merge 操作
- [ ] 完成一次 Unwrap 操作
- [ ] (可选) 体验到期领取流程

**恭喜! 🎉 你已经掌握了AquaFlux的核心功能!**

---

**最后更新**: 2025-10-20  
**适用版本**: AquaFlux v1.0  
**预计完成时间**: 10-15分钟

