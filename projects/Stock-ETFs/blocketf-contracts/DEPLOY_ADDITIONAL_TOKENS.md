# 部署额外代币指南 (ADA & BCH)

## 📋 概述

由于 Binance Oracle 无法访问 XRP、SOL、USDT 的 price feeds，且 Chainlink 也没有这些代币的 feeds，我们添加 **ADA (Cardano)** 和 **BCH (Bitcoin Cash)** 作为替代。

这两个代币在 Chainlink 上有可用的 price feeds。

## 🎯 为什么选择 ADA 和 BCH？

| 代币 | Chainlink Feed | 状态 | 价格 |
|------|---------------|------|------|
| **ADA** | ADA/USD | ✅ 可用 | ~$1.00 |
| **BCH** | BCH/USD | ✅ 可用 | ~$450 |

**替换的代币**：
- ❌ XRP - Chainlink 无 feed
- ❌ SOL - Chainlink 无 feed
- ✅ USDT - 使用 BUSD/USD feed (价格相近)

## 📦 DeployAdditionalTokens 脚本

### **功能特性**

1. ✅ **部署 ADA 和 BCH Mock 代币**
2. ✅ **配置价格到 MockPriceOracle**
3. ✅ **创建 V3 流动性池（ADA/USDT, BCH/USDT）**
4. ✅ **自动从 deployed-contracts.json 读取 USDT 地址**

### **价格配置**

```solidity
uint256 constant PRICE_ADA = 1e18;      // $1.00
uint256 constant PRICE_BCH = 450e18;    // $450
```

### **流动性配置**

每个池：
- **USDT**: 5,000,000 USDT
- **Token**: 根据价格计算
  - ADA: 5,000,000 / 1 = 5,000,000 ADA
  - BCH: 5,000,000 / 450 = 11,111 BCH
- **费率**: 0.25% (2500)

## 🚀 使用方法

### **前置条件**

1. 已部署 Mock 代币（USDT 等）：
```bash
forge script script/DeployMockTokens.s.sol \
  --rpc-url bnb_testnet \
  --broadcast
```

2. 已部署 MockPriceOracle：
```bash
forge script script/DeployMockPriceOracle.s.sol \
  --rpc-url bnb_testnet \
  --broadcast
```

3. 环境变量配置：
```bash
# .env
PRIVATE_KEY=your_private_key
PRICE_ORACLE=0x... # MockPriceOracle 地址
```

### **部署步骤**

```bash
forge script script/DeployAdditionalTokens.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  --verify
```

### **预期输出**

```
========================================
Deploying Additional Tokens (ADA & BCH)
========================================
Deployer: 0x...
Network: BNB Testnet

1. Loading Existing Contracts...
  USDT: 0x...
  MockPriceOracle: 0x...

2. Deploying New Tokens...
  ADA: 0x...
  BCH: 0x...
  Initial supply per token: 1000000

3. Configuring Prices in MockPriceOracle...
  ADA price set to: 1 USD
  BCH price set to: 450 USD

4. Setting up V3 Liquidity Pools...

  Setting up ADA/USDT pool:
    Token amount: 5000000
    USDT amount: 5000000
    Fee tier: 2500
    Pool address: 0x...
    Position ID: 1
    Liquidity: ...

  Setting up BCH/USDT pool:
    Token amount: 11111
    USDT amount: 5000000
    Fee tier: 2500
    Pool address: 0x...
    Position ID: 2
    Liquidity: ...

========================================
Deployment Summary
========================================
New Tokens Deployed:
  ADA: 0x...
  BCH: 0x...

Prices Configured:
  ADA: $1
  BCH: $450

V3 Liquidity Pools Created:
  ADA/USDT: 5M USDT + 5000000 ADA
  BCH/USDT: 5M USDT + 11111 BCH
```

## 📝 部署后操作

### **1. 更新 deployed-contracts.json**

手动添加 ADA 和 BCH 地址：

```json
{
  "contracts": {
    "mockTokens": [
      {"name": "Wrapped BNB", "contractAddress": "0x..."},
      {"name": "Bitcoin BEP20", "contractAddress": "0x..."},
      {"name": "Ethereum BEP20", "contractAddress": "0x..."},
      {"name": "Ripple BEP20", "contractAddress": "0x..."},
      {"name": "Solana BEP20", "contractAddress": "0x..."},
      {"name": "Tether USD", "contractAddress": "0x..."},
      {"name": "Cardano BEP20", "symbol": "ADA", "contractAddress": "0x..."},
      {"name": "Bitcoin Cash BEP20", "symbol": "BCH", "contractAddress": "0x..."}
    ]
  }
}
```

### **2. 验证价格配置**

```bash
# 查询 ADA 价格
cast call $PRICE_ORACLE \
  "getPrice(address)(uint256)" \
  $ADA_ADDRESS \
  --rpc-url bnb_testnet

# 预期输出: 1000000000000000000 (1e18 = $1)

# 查询 BCH 价格
cast call $PRICE_ORACLE \
  "getPrice(address)(uint256)" \
  $BCH_ADDRESS \
  --rpc-url bnb_testnet

# 预期输出: 450000000000000000000 (450e18 = $450)
```

### **3. 验证流动性池**

在 PancakeSwap 测试网查看池子：
- ADA/USDT 池
- BCH/USDT 池

### **4. 测试交换**

```bash
# 通过 Router 测试 ADA 交换
cast send $ROUTER_ADDRESS \
  "mintWithUSDT(uint256,uint256,uint256)" \
  1000000000000000000000 \  # 1000 USDT
  0 \
  $(($(date +%s) + 3600)) \
  --private-key $PRIVATE_KEY \
  --rpc-url bnb_testnet
```

## 🔄 与现有系统集成

### **更新 DeployPriceOracle.s.sol**

添加 ADA 和 BCH 的 Chainlink feeds：

```solidity
// Chainlink Price Feeds (BSC Mainnet)
address constant FEED_ADA_USD = 0xa767f745331D267c7751297D982b050c93985627;
address constant FEED_BCH_USD = 0x43d80f616DAf0b0B42a928EeD32147dC59027D41;
```

### **完整的代币列表（8 个）**

| # | 代币 | Price Feed 来源 | 状态 |
|---|------|----------------|------|
| 1 | WBNB | Chainlink | ✅ |
| 2 | BTCB | Chainlink | ✅ |
| 3 | ETH | Chainlink | ✅ |
| 4 | XRP | - | ❌ 保留但无 feed |
| 5 | SOL | - | ❌ 保留但无 feed |
| 6 | USDT | Chainlink (BUSD/USD) | ✅ |
| 7 | ADA | Chainlink | ✅ 新增 |
| 8 | BCH | Chainlink | ✅ 新增 |

**可用于 ETF 的代币**: WBNB, BTCB, ETH, USDT, ADA, BCH (6 个)

## ⚙️ 脚本特性

### **自动化流程**

1. ✅ 从 JSON 读取 USDT 地址
2. ✅ 从环境变量读取 PriceOracle
3. ✅ 部署 2 个新代币
4. ✅ 批量设置价格
5. ✅ 创建 2 个 V3 池
6. ✅ 完整的验证和日志

### **安全特性**

- ✅ 价格在部署时立即配置
- ✅ 流动性充足（每池 5M USDT）
- ✅ 使用 PancakeSwap V3 标准费率
- ✅ 全范围流动性（简化管理）

## 🛠️ 故障排除

### **问题 1: PRICE_ORACLE 未设置**

```
Error: Environment variable "PRICE_ORACLE" not found
```

**解决**：
```bash
echo "PRICE_ORACLE=0x..." >> .env
source .env
```

### **问题 2: USDT 余额不足**

```
Error: ERC20: transfer amount exceeds balance
```

**解决**：
- 确保部署账户有足够的 USDT
- 或者先从 USDTFaucet 获取 USDT

### **问题 3: 池已存在**

如果池已经存在，脚本会跳过创建，直接添加流动性。

## 📊 Chainlink Feed 地址（BSC 主网）

```solidity
// 可用的 Chainlink Feeds
FEED_BNB_USD  = 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526;
FEED_BTC_USD  = 0x5741306c21795FdCBb9b265Ea0255F499DFe515C;
FEED_ETH_USD  = 0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7;
FEED_ADA_USD  = 0xa767f745331D267c7751297D982b050c93985627; // ✅ 新增
FEED_BCH_USD  = 0x43d80f616DAf0b0B42a928EeD32147dC59027D41; // ✅ 新增
FEED_BUSD_USD = 0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa; // 用于 USDT
```

## 🎉 总结

**DeployAdditionalTokens** 脚本提供了一站式解决方案：

1. ✅ 部署新代币
2. ✅ 配置价格
3. ✅ 设置流动性
4. ✅ 完全自动化

现在我们有 **6 个可用代币** 用于 ETF，都有可靠的 Chainlink price feeds！

---

**最后更新**: 2025-10-08
**版本**: v1.0
