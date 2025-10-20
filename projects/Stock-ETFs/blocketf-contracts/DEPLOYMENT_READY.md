# 🚀 BNB 测试网部署就绪报告

## ✅ 准备完成

BlockETF 系统已完全准备好部署到 BNB 测试网！

---

## 📦 已完成的工作

### 1. Mock 基础设施 ✅

#### MockERC20（优化版）
- ✅ 简洁的 ERC20 实现（48 行代码）
- ✅ 支持 mint/burn 功能
- ✅ 移除了冗余的 faucet 功能
- ✅ 符合单一职责原则

#### MockTokenFaucet（统一水龙头）
- ✅ 一键领取所有 6 个代币
- ✅ 统一的冷却机制（24小时）
- ✅ 灵活的数量配置
- ✅ 支持单独领取特定代币

#### MockPriceOracle
- ✅ 手动设置价格
- ✅ 批量更新功能
- ✅ 价格时间戳记录

### 2. 核心合约 ✅

- ✅ BlockETFCore - ETF 核心逻辑
- ✅ ETFRebalancerV1 - Rebalance 执行器
- ✅ ETFRouterV1 - 用户交互路由
- ✅ 所有合约已通过完整测试

### 3. 部署脚本 ✅

#### DeployBlockETFWithMocks.s.sol
自动完成：
1. ✅ 部署 6 个 Mock 代币（WBNB, BTCB, ETH, XRP, SOL, USDT）
2. ✅ 部署 MockPriceOracle 并设置初始价格
3. ✅ 部署 BlockETFCore、ETFRebalancerV1、ETFRouterV1
4. ✅ 初始化 ETF（5 资产配置）
5. ✅ 部署 MockTokenFaucet
6. ✅ 转移代币 ownership 到水龙头
7. ✅ 配置权限和参数

#### SetupLiquidity.s.sol
- ✅ 创建 PancakeSwap V2 池（BNB 配对）
- ✅ 创建 PancakeSwap V3 池（USDT 配对）
- ✅ 提供初始流动性

### 4. 配置文件 ✅

- ✅ `foundry.toml` - Forge 配置（via-ir 已启用）
- ✅ `.env.example` - 环境变量模板
- ✅ `DeployConfig.sol` - 部署参数配置

### 5. 文档完善 ✅

#### 部署文档
- ✅ `TESTNET_DEPLOYMENT_GUIDE.md` - 详细部署指南
- ✅ `DEPLOYMENT_CHECKLIST.md` - 部署清单
- ✅ `DEPLOYMENT_READY.md` - 本文档

#### 水龙头文档
- ✅ `FAUCET_USAGE_GUIDE.md` - 使用指南
- ✅ `FAUCET_ARCHITECTURE.md` - 架构说明
- ✅ `QUICK_START_FAUCET.md` - 快速开始

#### 设计文档
- ✅ `MOCK_TOKEN_DESIGN.md` - Mock 代币设计
- ✅ `MOCK_VS_REAL_WBNB.md` - WBNB 方案对比
- ✅ `OPTIMIZATION_SUMMARY.md` - 优化总结

---

## 🎯 部署配置

### 资产配置（5 个代币）

| 代币 | 权重 | 流动性 | 说明 |
|------|------|--------|------|
| **BNB** | 20% | V2 | 主网 V2 流动性更好 |
| **BTC** | 30% | V3 | 最大权重 |
| **ETH** | 25% | V3 | 第二权重 |
| **XRP** | 10% | V3 | 小权重 |
| **SOL** | 15% | V3 | 中等权重 |

**总计**：100%（10000 bps）

### 初始价格设置

| 代币 | 价格 (USD) |
|------|-----------|
| BNB | $600 |
| BTC | $95,000 |
| ETH | $3,400 |
| XRP | $2.50 |
| SOL | $190 |
| USDT | $1.00 |

### 费用配置

- **铸造费用**：0.3%（30 bps）
- **赎回费用**：0.3%（30 bps）
- **管理费用**：2% 年化（200 bps）
- **Rebalance 阈值**：5%（500 bps）
- **最小冷却时间**：1 小时

### 水龙头配置

每次 `claimAll()` 将获得：

| 代币 | 数量 | 估值 |
|------|------|------|
| WBNB | 10 | $6,000 |
| BTCB | 0.1 | $9,500 |
| ETH | 1 | $3,400 |
| XRP | 1,000 | $2,500 |
| SOL | 10 | $1,900 |
| USDT | 10,000 | $10,000 |
| **总计** | - | **$33,300** |

**冷却时间**：24 小时

---

## 📋 部署前检查清单

### 环境准备
- [x] 安装 Foundry
- [x] 配置 `.env` 文件
  - [x] `PRIVATE_KEY`（需要添加 0x 前缀）
  - [x] `BSCSCAN_API_KEY`
- [ ] 获取测试网 BNB（至少 5 BNB）
  - 访问：https://testnet.bnbchain.org/faucet-smart

### 合约验证
- [x] 所有合约编译通过
- [x] MockERC20 优化完成
- [x] MockTokenFaucet 实现完成
- [x] 部署脚本测试通过

### 网络配置
- [x] BNB Testnet RPC 配置
- [x] PancakeSwap V2/V3 地址配置
- [x] Chain ID 验证（97）

---

## 🚀 部署步骤

### 第一步：修正环境变量

```bash
# 当前 .env 中 PRIVATE_KEY 缺少 0x 前缀
# 修改为：
PRIVATE_KEY=0x471dd378eb6ed01706935c48b2c375bb9c43999766f6e77386ccb161e5f89719
```

### 第二步：验证网络连接

```bash
# 测试 RPC
cast block-number --rpc-url bnb_testnet

# 检查账户余额
cast balance <YOUR_ADDRESS> --rpc-url bnb_testnet
```

### 第三步：执行部署

```bash
# 完整部署（包含验证）
forge script script/DeployBlockETFWithMocks.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  --verify \
  -vvvv
```

**预期输出**：
```
========================================
Deployment Summary
========================================
Network: BNB Testnet (Chain ID 97)

Core Contracts:
  BlockETFCore: 0x...
  ETFRebalancerV1: 0x...
  ETFRouterV1: 0x...
  MockPriceOracle: 0x...
  MockTokenFaucet: 0x...  ⭐ 重要

Mock Tokens:
  WBNB: 0x...
  BTCB: 0x...
  ETH: 0x...
  XRP: 0x...
  SOL: 0x...
  USDT: 0x...
```

### 第四步：记录合约地址

保存所有地址到 `.env`：

```bash
# 复制部署输出的地址
BLOCK_ETF_CORE=0x...
ETF_REBALANCER_V1=0x...
ETF_ROUTER_V1=0x...
MOCK_PRICE_ORACLE=0x...
MOCK_TOKEN_FAUCET=0x...  # ⭐ 最重要

WBNB=0x...
BTCB=0x...
ETH=0x...
XRP=0x...
SOL=0x...
USDT=0x...
```

### 第五步：领取测试代币

```bash
# 🎉 一键领取所有代币！
export FAUCET=$MOCK_TOKEN_FAUCET

cast send $FAUCET "claimAll()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

### 第六步：设置流动性

```bash
# 创建所有流动性池
forge script script/SetupLiquidity.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  -vvvv
```

### 第七步：测试功能

```bash
# 1. 批准 USDT
cast send $USDT "approve(address,uint256)" \
  $ETF_ROUTER_V1 \
  1000000000000000000000 \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY

# 2. 铸造 ETF（1000 USDT）
cast send $ETF_ROUTER_V1 "mintWithUSDT(uint256,uint256,uint256)" \
  1000000000000000000000 \
  0 \
  $(($(date +%s) + 3600)) \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY

# 3. 检查 ETF 余额
cast call $BLOCK_ETF_CORE "balanceOf(address)(uint256)" \
  <YOUR_ADDRESS> \
  --rpc-url bnb_testnet
```

---

## 🔍 验证清单

部署后验证：

### 合约验证
- [ ] 所有合约在 BscScan 上已验证
- [ ] 访问：https://testnet.bscscan.com/

### 功能验证
- [ ] 水龙头可以领取代币
- [ ] ETF 可以铸造
- [ ] ETF 可以赎回
- [ ] Rebalance 可以执行

### 流动性验证
- [ ] V2 池已创建（5 个 WBNB 配对）
- [ ] V3 池已创建（4 个 USDT 配对）
- [ ] 可以在 PancakeSwap 查看

---

## 📊 关键指标

### Gas 估算

| 操作 | 预估 Gas |
|------|---------|
| 部署所有合约 | ~6M gas |
| 设置流动性 | ~2M gas |
| 领取所有代币 | ~180k gas |
| 铸造 ETF | ~300k gas |
| Rebalance | ~500k gas |

### 总成本估算（BNB = 3 Gwei）

- 部署：~0.018 BNB
- 流动性：~0.006 BNB
- 测试交易：~0.003 BNB
- **总计**：~0.03 BNB

---

## 🎯 成功标准

部署成功的标志：

1. ✅ 所有 10 个合约部署成功
2. ✅ 合约在 BscScan 上已验证
3. ✅ 水龙头可以一键领取所有代币
4. ✅ 流动性池创建成功
5. ✅ 可以成功铸造 ETF
6. ✅ ETF 资产权重接近目标
7. ✅ Rebalance 功能正常

---

## 🆘 故障排查

### 常见问题

#### 1. Private key 格式错误
**错误**：`failed parsing $PRIVATE_KEY as type uint256`
**解决**：确保私钥有 `0x` 前缀

#### 2. 余额不足
**错误**：`insufficient funds`
**解决**：从水龙头获取更多测试网 BNB

#### 3. 合约验证失败
**解决**：手动验证
```bash
forge verify-contract \
  --chain-id 97 \
  --compiler-version v0.8.28 \
  <CONTRACT_ADDRESS> \
  src/<CONTRACT>.sol:<CONTRACT_NAME>
```

#### 4. 流动性设置失败
**错误**：`insufficient balance`
**解决**：先调用 `faucet.claimAll()` 获取代币

---

## 📚 相关文档

- 📖 [测试网部署指南](./docs/TESTNET_DEPLOYMENT_GUIDE.md)
- ✅ [部署清单](./docs/DEPLOYMENT_CHECKLIST.md)
- 🚰 [水龙头使用指南](./docs/FAUCET_USAGE_GUIDE.md)
- 🏗️ [水龙头架构](./docs/FAUCET_ARCHITECTURE.md)
- 🎨 [Mock 代币设计](./docs/MOCK_TOKEN_DESIGN.md)

---

## 🎉 准备就绪！

BlockETF 系统已完全准备好部署到 BNB 测试网！

**核心优势**：
- ✅ 统一水龙头，一键领取所有代币
- ✅ 优化的 Mock 代币架构
- ✅ 完整的 V2/V3 流动性支持
- ✅ 5 个主流资产配置
- ✅ 完善的文档和指南

**下一步**：
1. 修正 `.env` 中的 `PRIVATE_KEY`（添加 0x 前缀）
2. 获取测试网 BNB
3. 执行部署命令
4. 开始测试！

🚀 Let's deploy! 🚀
