# PriceOracle 部署指南

## 📋 概述

本项目提供两个 PriceOracle 部署脚本：

1. **DeployPriceOracle.s.sol** - 主网/正式环境，使用 Chainlink 价格预言机
2. **DeployMockPriceOracle.s.sol** - 测试网环境，使用 Mock 价格预言机

## 🎯 选择哪个脚本？

| 环境 | 推荐脚本 | 原因 |
|------|---------|------|
| **测试网** | `DeployMockPriceOracle` ✅ | Chainlink 喂价可能不可用或数据陈旧 |
| **主网** | `DeployPriceOracle` ✅ | 使用真实 Chainlink 数据，更可靠 |
| **本地开发** | `DeployMockPriceOracle` ✅ | 完全可控的价格数据 |

## 📦 方案 1: MockPriceOracle (推荐测试网)

### **特点**

- ✅ 完全可控的价格设置
- ✅ 不依赖外部服务
- ✅ 价格可随时更新
- ✅ 支持所有代币（包括 SOL）
- ⚠️ 仅用于测试，不应在生产环境使用

### **部署步骤**

#### 1. 准备环境变量

确保 `.env` 文件中有以下配置：

```bash
PRIVATE_KEY=your_private_key
BNB_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545

# 代币地址（从 DeployMockTokens 获取）
WBNB=0x...
BTCB=0x...
ETH=0x...
XRP=0x...
SOL=0x...
USDT=0x...
```

#### 2. 运行部署脚本

```bash
forge script script/DeployMockPriceOracle.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  --verify
```

#### 3. 保存预言机地址

脚本执行后，将输出的地址添加到 `.env`：

```bash
PRICE_ORACLE=0x... # MockPriceOracle 地址
```

### **预期输出**

```
========================================
Deploying MockPriceOracle
========================================
Deployer: 0x...
Network: BNB Testnet

1. Deploying MockPriceOracle...
  MockPriceOracle deployed at: 0x...
  Owner: 0x...

2. Setting Initial Prices...
  Set prices for 6 tokens:
    WBNB: $600
    BTCB: $95000
    ETH:  $3400
    XRP:  $2
    SOL:  $190
    USDT: $1

3. Verifying Prices...
  All prices verified successfully!

========================================
Deployment Summary
========================================
Deployed Contracts:
  MockPriceOracle: 0x...

Token Prices:
  WBNB: 600 USD
  BTCB: 95000 USD
  ETH: 3400 USD
  XRP: 2 USD
  SOL: 190 USD
  USDT: 1 USD
```

### **价格管理**

#### 查询价格

```bash
cast call $PRICE_ORACLE \
  "getPrice(address)(uint256)" \
  $WBNB \
  --rpc-url bnb_testnet
```

#### 更新单个价格

```bash
cast send $PRICE_ORACLE \
  "setPrice(address,uint256)" \
  $WBNB \
  650000000000000000000 \  # 650e18 = $650
  --private-key $PRIVATE_KEY \
  --rpc-url bnb_testnet
```

#### 批量更新价格

```bash
cast send $PRICE_ORACLE \
  "setPrices(address[],uint256[])" \
  "[$WBNB,$BTCB]" \
  "[650000000000000000000,96000000000000000000000]" \
  --private-key $PRIVATE_KEY \
  --rpc-url bnb_testnet
```

### **默认价格配置**

脚本中配置的初始价格：

```solidity
uint256 constant PRICE_WBNB = 600e18;   // $600
uint256 constant PRICE_BTC = 95000e18;  // $95,000
uint256 constant PRICE_ETH = 3400e18;   // $3,400
uint256 constant PRICE_XRP = 2.5e18;    // $2.50
uint256 constant PRICE_SOL = 190e18;    // $190
uint256 constant PRICE_USDT = 1e18;     // $1
```

**如何修改默认价格？**

编辑 `script/DeployMockPriceOracle.s.sol`，修改常量值后重新部署。

---

## 📦 方案 2: PriceOracle (主网推荐)

### **特点**

- ✅ 使用真实 Chainlink 价格数据
- ✅ 去中心化且可靠
- ✅ 自动更新价格
- ⚠️ 需要 Chainlink 支持的代币
- ⚠️ SOL 在 BSC 上没有直接 Chainlink feed

### **部署步骤**

#### 1. 准备环境变量

```bash
PRIVATE_KEY=your_private_key
BNB_MAINNET_RPC=https://bsc-dataseed.binance.org/

# 代币地址（真实主网地址）
WBNB=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
BTCB=0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c
ETH=0x2170Ed0880ac9A755fd29B2688956BD959F933F8
XRP=0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE
SOL=0x... # 需要找到或使用替代方案
```

#### 2. 运行部署脚本

```bash
forge script script/DeployPriceOracle.s.sol \
  --rpc-url bnb_mainnet \
  --broadcast \
  --verify
```

### **Chainlink Price Feeds**

脚本已配置以下 BSC 主网 Chainlink feeds：

| 代币 | Chainlink Feed | 地址 |
|------|---------------|------|
| BNB/USD | BNB/USD | `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` |
| BTC/USD | BTC/USD | `0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf` |
| ETH/USD | ETH/USD | `0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e` |
| XRP/USD | XRP/USD | `0x93A67D414896A280bF8FFB3b389fE3686E014fda` |
| SOL/USD | ❌ 不可用 | - |

### **SOL 价格问题**

由于 BSC 上没有 SOL/USD 的直接 Chainlink feed，你有以下选项：

#### 选项 1：使用其他预言机

```solidity
// 例如使用 Pyth Network
// 需要集成额外的预言机
```

#### 选项 2：手动设置价格

部署后手动为 SOL 设置价格：

```bash
cast send $PRICE_ORACLE \
  "setPriceFeed(address,address)" \
  $SOL \
  $CUSTOM_SOL_FEED \
  --private-key $PRIVATE_KEY
```

#### 选项 3：移除 SOL（推荐主网）

如果在主网上没有可靠的 SOL 价格源，建议从 ETF 中移除 SOL。

---

## 🔄 部署流程整合

### **完整部署顺序（测试网）**

```bash
# 1. 部署 Mock 代币
forge script script/DeployMockTokens.s.sol \
  --rpc-url bnb_testnet \
  --broadcast

# 2. 部署 MockPriceOracle
forge script script/DeployMockPriceOracle.s.sol \
  --rpc-url bnb_testnet \
  --broadcast

# 3. 添加 PRICE_ORACLE 到 .env
echo "PRICE_ORACLE=0x..." >> .env

# 4. 设置流动性池
forge script script/SetupLiquidity.s.sol \
  --rpc-url bnb_testnet \
  --broadcast

# 5. 部署 BlockETF 系统
forge script script/DeployBlockETFWithMocks.s.sol \
  --rpc-url bnb_testnet \
  --broadcast
```

### **完整部署顺序（主网）**

```bash
# 1. 部署 PriceOracle (Chainlink)
forge script script/DeployPriceOracle.s.sol \
  --rpc-url bnb_mainnet \
  --broadcast \
  --verify

# 2. 添加 PRICE_ORACLE 到 .env
echo "PRICE_ORACLE=0x..." >> .env

# 3. 设置流动性池
forge script script/SetupLiquidity.s.sol \
  --rpc-url bnb_mainnet \
  --broadcast

# 4. 部署 BlockETF 系统
forge script script/DeployBlockETF.s.sol \
  --rpc-url bnb_mainnet \
  --broadcast \
  --verify
```

---

## 🔍 价格验证

### **测试 MockPriceOracle**

```bash
# 获取 WBNB 价格
cast call $PRICE_ORACLE \
  "getPrice(address)(uint256)" \
  $WBNB \
  --rpc-url bnb_testnet

# 预期输出: 600000000000000000000 (600e18)
```

### **测试 PriceOracle (Chainlink)**

```bash
# 获取 BTC 价格
cast call $PRICE_ORACLE \
  "getPrice(address)(uint256)" \
  $BTCB \
  --rpc-url bnb_mainnet

# 预期输出: 实时 BTC 价格（18 位小数）
```

### **批量查询价格**

```bash
cast call $PRICE_ORACLE \
  "getPrices(address[])(uint256[])" \
  "[$WBNB,$BTCB,$ETH]" \
  --rpc-url bnb_testnet
```

---

## ⚙️ 配置管理

### **更新 Staleness Threshold**

PriceOracle 有陈旧保护机制，默认 1 小时：

```bash
# 设置为 30 分钟
cast send $PRICE_ORACLE \
  "setStalenessThreshold(uint256)" \
  1800 \
  --private-key $PRIVATE_KEY
```

### **更新 Chainlink Feed**

```bash
cast send $PRICE_ORACLE \
  "setPriceFeed(address,address)" \
  $TOKEN_ADDRESS \
  $NEW_CHAINLINK_FEED \
  --private-key $PRIVATE_KEY
```

---

## 🛠️ 故障排除

### **问题 1：价格为 0**

```
Error: Invalid price
```

**解决方案：**
- 检查价格是否已设置（MockPriceOracle）
- 检查 Chainlink feed 是否配置（PriceOracle）
- 验证代币地址正确

### **问题 2：Stale price**

```
Error: Stale price
```

**解决方案：**
- Chainlink feed 数据过旧
- 增加 `stalenessThreshold`
- 或切换到更活跃的 feed

### **问题 3：环境变量未找到**

```
Error: Environment variable "PRICE_ORACLE" not found
```

**解决方案：**
```bash
# 添加到 .env
echo "PRICE_ORACLE=0x..." >> .env

# 重新加载环境
source .env
```

---

## 📚 相关文档

- [PriceOracle 合约](../src/PriceOracle.sol)
- [MockPriceOracle 合约](../src/mock/MockPriceOracle.sol)
- [SetupLiquidity 使用指南](./SETUP_LIQUIDITY_V3.md)
- [Chainlink Price Feeds (BSC)](https://docs.chain.link/data-feeds/price-feeds/addresses?network=bnb-chain)

---

## 🎉 总结

**测试网部署**：
- 使用 `DeployMockPriceOracle.s.sol` ✅
- 完全可控的价格
- 支持所有代币
- 快速迭代测试

**主网部署**：
- 使用 `DeployPriceOracle.s.sol` ✅
- 真实 Chainlink 数据
- 去中心化可靠
- 注意 SOL 价格源问题

---

**最后更新**: 2025-10-08
**版本**: v1.0
