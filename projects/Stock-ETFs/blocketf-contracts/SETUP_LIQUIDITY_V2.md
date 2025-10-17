# SetupLiquidityV2 配置说明

## 📋 概述

`SetupLiquidityV2.s.sol` 是改进版的流动性设置脚本，创建合理规模的 V3 流动性池，便于价格管理和测试。

## 🎯 目标配置

### 流动性规模
- **每个池子 TVL**: ~$1M USD
  - 500,000 USDT
  - 价值 $500,000 的资产代币（基于预言机价格计算）
- **总 TVL**: ~$5M USD (5 个池子)

### 为什么选择这个规模？
1. ✅ 足够大以提供流动性
2. ✅ 足够小以便于价格调整（相比旧池子的 $64B）
3. ✅ 更接近实际测试场景
4. ✅ 易于管理和控制

## 🔧 费率配置

**关键点**: 使用**不同的费率**创建新池子，避免与旧池子冲突

| 代币 | 旧池子费率 | **新池子费率** | 状态 |
|------|-----------|--------------|------|
| WBNB | 0.01% (100) | **0.05% (500)** | ✓ 新池子 |
| BTCB | 0.05% (500) | **0.25% (2500)** | ✓ 新池子 |
| ETH  | 0.05% (500) | **0.25% (2500)** | ✓ 新池子 |
| ADA  | 0.25% (2500) | **0.05% (500)** | ✓ 新池子 |
| BCH  | 0.25% (2500) | **0.05% (500)** | ✓ 新池子 |

### 为什么改变费率？
- PancakeSwap V3 中，同一对代币可以有多个不同费率的池子
- 通过改变费率，我们创建**全新的独立池子**
- 不会影响或干扰旧的过大流动性池子
- 可以并存使用，router 可以选择使用哪个池子

## 💰 代币预铸造

为确保有足够代币创建流动性（V3 全范围流动性需求不确定），脚本会预铸造：

```solidity
// USDT: 500K × 5 pools × 2.5x safety = 6.25M
uint256 USDT_AMOUNT = 6_250_000 * 1e18;

// 其他代币: 每个铸造价值 $1.25M (2.5x 安全系数)
uint256 TARGET_USD_VALUE = 1_250_000 * 1e18;

// 例如 WBNB (假设价格 $1,283):
// wbnbAmount = $1,250,000 / $1,283 ≈ 974 WBNB
```

## 🔑 关键改进

### 1. Position NFT 归属
```solidity
recipient: recipient,  // 发送给部署地址，而不是 msg.sender
```

✅ **旧脚本问题**: Position NFT 发给了 Foundry 临时地址 `0x1804c8AB1F12...`，无法控制

✅ **新脚本改进**: Position NFT 直接发给部署者地址，可以完全控制

### 2. 动态计算代币数量
```solidity
// 基于预言机价格计算需要的代币数量
uint256 tokenAmount = (usdtAmount * 1e18) / tokenPrice;
```

确保每个池子的两种代币价值相等（各占 $500K）

### 3. 池子检查
```solidity
address existingPool = factory.getPool(token0, token1, fee);
if (existingPool != address(0)) {
    console2.log("Pool already exists, skipping...");
    return;
}
```

避免重复创建同一个池子

## 📊 新旧池子对比

### 旧池子（SetupLiquidity）
❌ 流动性过大
- WBNB 池: 50M WBNB (≈ $64B) + 37M USDT
- BTCB 池: 50M BTCB (≈ $6T) + 407K USDT

❌ 价格调整困难
- 需要巨额交易才能移动价格 1%

❌ NFT 无法控制
- 属于 Foundry 临时地址 `0x1804c8AB1F12...`

### 新池子（SetupLiquidityV2）
✅ 合理流动性
- 每池: $500K 资产 + $500K USDT = $1M TVL

✅ 价格调整容易
- 小额交易（几万 USDT）即可调整价格

✅ NFT 完全控制
- 属于部署者地址，可随时管理流动性

✅ 独立池子
- 不同费率，不影响旧池子

## 🚀 使用方法

### 执行脚本
```bash
forge script script/SetupLiquidityV2.s.sol --rpc-url bnb_testnet --broadcast
```

### 预期输出
```
Setting up V3 Liquidity Pools V2 (New Fee Tiers)
========================================
Deployer: 0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725
USDT per pool: 500000 USDT
Target TVL per pool: ~$1M USD ($500K USDT + $500K asset)
Total TVL across 5 pools: ~$5M USD

Pre-minting tokens...
  Minted 6250000 USDT
  Minted 974 WBNB
  Minted 10 BTCB
  Minted 110 ETH
  Minted 1523809 ADA
  Minted 2145 BCH

Setting up V3 Pools with oracle prices...
  Setting up WBNB /USDT pool
    Token: 0xfadc...
    Price from oracle: 1283 USD
    Fee tier: 500 (0.05%)
    NFT recipient: 0xB73Ebe02...
  V3 Pool created:
    Pool address: 0x...
    Position NFT ID: 24612
    Liquidity: ...
```

### 验证创建的池子
```bash
# 检查部署者持有的 Position NFT
cast call 0x427bF5b37357632377eCbEC9de3626C71A5396c1 \
  "balanceOf(address)(uint256)" \
  0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725 \
  --rpc-url bnb_testnet

# 应该返回 5 (五个池子的 Position NFT)
```

## 📝 后续步骤

1. ✅ 执行 SetupLiquidityV2 创建新池子
2. ✅ 验证 Position NFT 归属
3. ✅ 检查池子流动性和价格
4. ⏭ 测试价格同步（使用 CheckPoolPrices.sh）
5. ⏭ 配置 Router 使用新池子
6. ⏭ 测试 rebalancing 功能

## ⚠️ 注意事项

1. **费率必须不同**: 确保与旧池子费率不同，创建独立的新池子
2. **Position NFT 管理**: 新池子的 NFT 属于部署者，可以用来管理流动性
3. **并存使用**: 新旧池子可以同时存在，router 需要指定使用哪个费率的池子
4. **价格同步**: 新池子创建后，价格应该与预言机一致（基于 oracle 初始化）

## 🔄 如何减少/增加流动性

### 减少流动性
```bash
# 使用 DecreaseLiquidity 脚本（需要更新 token IDs）
forge script script/DecreaseLiquidity.s.sol --rpc-url bnb_testnet --broadcast
```

### 增加流动性
```solidity
// 调用 Position Manager 的 increaseLiquidity
positionManager.increaseLiquidity(IncreaseLiquidityParams({
    tokenId: YOUR_NFT_ID,
    amount0Desired: additionalAmount0,
    amount1Desired: additionalAmount1,
    amount0Min: 0,
    amount1Min: 0,
    deadline: block.timestamp + 1 hours
}));
```

---

**版本**: v2.0
**创建日期**: 2025-10-09
**状态**: 准备执行
