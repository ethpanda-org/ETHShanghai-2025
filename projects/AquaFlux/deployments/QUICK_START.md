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

---

## 🚀 30秒快速部署 (本地模式)

```bash
# 1. 克隆项目并进入目录
cd projects/AquaFlux

# 2. 一键启动脚本 (合约 + 后端 + 前端)
./scripts/quick-start.sh

# 3. 访问 http://localhost:5173
```

> 脚本会自动完成所有安装、部署和启动步骤

---

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

#### 1.6 验证部署 (仅Sepolia)
```bash
# 自动从 addresses.json 读取地址
pnpm hardhat run scripts/verify-all.ts --network sepolia
```

---

### Step 2: 启动后端服务 (3分钟)

#### 2.1 安装依赖
```bash
cd ../backend
pnpm install
```

#### 2.2 启动数据库 (Docker)
```bash
# 启动 PostgreSQL + Redis
docker-compose up -d

# 检查服务状态
docker-compose ps
```

#### 2.3 配置环境变量
```bash
cp .env.example .env

# 编辑 .env (如果使用Docker默认值可跳过)
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aquaflux_dev"
# REDIS_URL="redis://localhost:6379"
# JWT_SECRET="your-secret-key-at-least-32-chars"
```

#### 2.4 数据库迁移
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

#### 2.5 启动开发服务器
```bash
pnpm dev

# 应该看到:
# 🚀 Server running on http://localhost:3001
```

#### 2.6 测试API (新终端)
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

### 场景: 用户将100 USDC的RWA债券拆分成P/C/S代币

#### 准备: 获取测试代币

```bash
# 在合约目录运行脚本
cd contracts
npx hardhat run scripts/demo/mint-test-tokens.ts --network sepolia

# 会给你的地址铸造:
# - 1000 Mock USDC
# - 1000 Mock RWA Token
```

#### Step 1: 注册资产 (Admin操作)

**通过前端**:
1. 导航到 "Admin" 页面
2. 填写资产信息:
   - Underlying Token: `0x...` (Mock USDC地址)
   - Maturity: `2026-12-31`
   - Operation Deadline: `2026-12-01`
   - Coupon Rate: `5%` (500 bps)
   - C Allocation: `60%`
   - S Allocation: `40%`
3. 点击 "Register Asset"
4. 确认交易

**通过命令行**:
```bash
npx hardhat run scripts/demo/register-asset.ts --network sepolia
```

#### Step 2: 验证资产 (Verifier操作)

```bash
# 需要先授予 VERIFIER_ROLE
npx hardhat run scripts/demo/verify-asset.ts --network sepolia
```

前端会显示资产状态变为 "✅ Verified"

#### Step 3: Wrap (包裹底层资产)

1. 导航到 "Structure" 页面
2. 选择 "Wrap" 标签
3. 选择资产: "US-BOND-2026"
4. 输入数量: `100`
5. 点击 "Approve USDC" (首次需要)
6. 点击 "Wrap" 并确认交易
7. 成功后会收到 `99.9 AqToken` (扣除0.1%手续费)

**查看余额**:
```
Your Wallet:
- USDC: 900 → (转入协议)
- Aq-US-BOND-2026: 99.9 ✅
```

#### Step 4: Split (拆分为P/C/S)

1. 在 "Structure" 页面选择 "Split" 标签
2. 选择资产: "US-BOND-2026"
3. 输入数量: `99.9` (全部拆分)
4. 点击 "Split" 并确认交易
5. 等待交易确认

**查看余额**:
```
Your Wallet:
- Aq-US-BOND-2026: 0
- P-US-BOND-2026: 99.7 ✅
- C-US-BOND-2026: 99.7 ✅
- S-US-BOND-2026: 99.7 ✅
(扣除0.2%拆分费)
```

#### Step 5: 交易代币 (Swap)

1. 导航到 "Swap" 页面
2. 出售 `50 C-US-BOND-2026`
3. 买入 `USDC`
4. 查看报价并确认交易

**模拟场景**:
- Alice: 持有 P-Token (偏好保本)
- Bob: 买入 C-Token (看好票息)
- Charlie: 买入 S-Token (风险偏好)

#### Step 6: Merge (合并回AqToken)

1. 返回 "Structure" 页面
2. 选择 "Merge" 标签
3. 输入数量: `40` (确保 P/C/S 都有40+)
4. 点击 "Merge" 并确认交易
5. 会收到 `~39.9 AqToken`

**查看余额**:
```
Your Wallet:
- P-US-BOND-2026: 59.7
- C-US-BOND-2026: 59.7
- S-US-BOND-2026: 59.7
- Aq-US-BOND-2026: 39.9 ✅
```

#### Step 7: Unwrap (解包为底层资产)

1. 选择 "Unwrap" 标签
2. 输入数量: `39.9`
3. 点击 "Unwrap" 并确认交易
4. 会收到 `~39.8 USDC` 返回钱包

---

### 到期流程演示 (Advanced)

#### 模拟时间推进 (本地网络)

```bash
# 在本地Hardhat网络可模拟时间推进
npx hardhat run scripts/demo/fast-forward-time.ts --network localhost
```

#### Step 1: 提取底层资产
```bash
# 管理员操作
npx hardhat run scripts/demo/withdraw-for-redemption.ts --network localhost
```

#### Step 2: 设置分配配置
```bash
# 假设线下兑付获得 110 USDC (100本金 + 10收益)
npx hardhat run scripts/demo/set-distribution.ts --network localhost
# 参数: 80% → P, 15% → C, 5%+2% → S
```

#### Step 3: 用户领取收益

**通过前端**:
1. 导航到 "Portfolio" 页面
2. 看到 "Claimable Rewards" 卡片
3. 点击 "Claim All"
4. 确认交易

**通过命令行**:
```bash
npx hardhat run scripts/demo/claim-rewards.ts --network localhost
```

**计算示例**:
```
用户持有:
- 59.7 P-Token
- 59.7 C-Token  
- 59.7 S-Token
总供应量: 100 P, 100 C, 100 S

领取金额:
- P: 59.7 * (88/100) = 52.54 USDC
- C: 59.7 * (16.5/100) = 9.85 USDC
- S: 59.7 * (7.5/100) = 4.48 USDC (包含2%费用奖励)
- 总计: 66.87 USDC ✅
```

---

## 🔍 故障排查

### 问题1: 合约部署失败

**症状**: `Error: insufficient funds`

**解决**:
```bash
# 检查钱包余额
npx hardhat run scripts/check-balance.ts --network sepolia

# 获取测试ETH
# Sepolia水龙头: https://sepoliafaucet.com/
```

### 问题2: 后端无法连接数据库

**症状**: `Error: Can't reach database server`

**解决**:
```bash
# 检查Docker服务
docker-compose ps

# 重启服务
docker-compose down
docker-compose up -d

# 查看日志
docker-compose logs postgres
```

### 问题3: 前端连接钱包失败

**症状**: MetaMask弹窗未出现

**解决**:
1. 刷新页面
2. 检查MetaMask是否解锁
3. 检查网络是否正确 (Sepolia/Localhost)
4. 清除浏览器缓存

### 问题4: 交易Revert

**症状**: `Transaction reverted without a reason`

**可能原因**:
- 资产未 `verify()` → 调用 `verify(assetId)`
- 底层代币未授权 → 调用 `approve(core, amount)`
- 余额不足 → 检查代币余额
- 已过 `operationDeadline` → 检查时间戳

**调试命令**:
```bash
# 查看资产状态
npx hardhat run scripts/debug/check-asset-status.ts --network sepolia

# 查看用户余额
npx hardhat run scripts/debug/check-balances.ts --network sepolia
```

---

## 📊 监控与日志

### 查看合约事件

```bash
# 监听所有事件
npx hardhat run scripts/monitor/watch-events.ts --network sepolia
```

**输出示例**:
```
[2025-10-20 10:30:15] AssetRegistered
  assetId: 0x1234...
  underlyingToken: 0xabcd...
  
[2025-10-20 10:31:22] AssetVerified
  assetId: 0x1234...
  
[2025-10-20 10:32:45] AssetSplit
  user: 0x5678...
  aqAmount: 100000000000000000000
  netPCS: 99800000000000000000
  fee: 200000000000000000
```

### 查看后端日志

```bash
# 开发模式下日志自动输出
cd backend
pnpm dev

# 生产模式查看PM2日志
pm2 logs backend
```

### 查看前端日志

浏览器控制台 (F12) → Console 标签

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

1. 📖 阅读 [架构文档](./ARCHITECTURE.md) 了解技术细节
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

