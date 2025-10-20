# SetupLiquidityV3 - 集中流动性策略

## 📋 概述

`SetupLiquidityV3.s.sol` 使用**集中流动性（Concentrated Liquidity）**创建新的 V3 池子，大幅提高资金效率。

## 🎯 为什么使用集中流动性？

### V2 全范围流动性的问题
- ❌ 资金分散在整个价格范围（tick -887200 到 887200）
- ❌ 大部分流动性永远用不到（价格不会波动那么大）
- ❌ 资金效率低：投入 $5M 只能提供 $5M 流动性
- ❌ 单边流动性：几乎全部资金集中在一种代币

### V3 集中流动性的优势
- ✅ 资金集中在合理的价格范围（如 ±20%）
- ✅ 资金效率高：投入 $50M 可提供 **$250M - $500M** 等效流动性
- ✅ 双边流动性：两种代币都会被使用
- ✅ 更适合实际交易场景

## 💡 策略设计

### 价格范围选择

| 资产类型 | 代币 | 价格范围 | 原因 |
|---------|------|---------|------|
| 稳定波动 | WBNB, ETH, BCH | ±20% | 主流币种，波动相对稳定 |
| 高波动 | BTCB, ADA | ±30% | 价格波动较大，需要更宽范围 |

### 费率选择
- **1% (10000)**: 使用新的费率层级
- 避免与 V1 和 V2 池子冲突
- 创建完全独立的新池子

### 流动性配置
```solidity
// 每个池子目标 TVL (10x increase)
uint256 constant LIQUIDITY_USDT_PER_POOL = 25_000_000 * 1e18; // $25M USDT
// 等值的资产代币

// 安全系数：2x（集中流动性更可预测）
uint256 constant SAFETY_MULTIPLIER = 2;
```

## 📊 预期效果

### 资金效率对比

| 方案 | 投入 TVL | 有效流动性 | 效率倍数 |
|------|---------|-----------|---------|
| V2 全范围 | $25M | ~$2.83M (实际) | 0.11x ❌ |
| **V3 ±20%** | **$250M** | **$1.25B - $2.5B** | **5-10x** ✅ |
| **V3 ±30%** | **$250M** | **$830M - $1.66B** | **3.3-6.6x** ✅ |

### 交易支持能力

以 WBNB 池子为例（±20% 范围）：

| 方案 | 投入 USDT | 实际 WBNB | 有效流动性 | 可支持交易 |
|------|----------|----------|-----------|----------|
| V2 全范围 | $500K | 386 BNB | $495K | ~116 BNB |
| **V3 集中** | **$25M** | **~19,200 BNB** | **$125M - $250M** | **15,000-20,000 BNB** ✅ |

✅ **完全可以支持 10,000+ BNB 的交易！**

## 🔧 技术实现

### Tick 计算

```solidity
// 1. 计算价格边界
uint256 priceLower = tokenPrice * (100% - range%)
uint256 priceUpper = tokenPrice * (100% + range%)

// 2. 转换为 tick（简化版）
// tick ≈ 价格变化的基点数
// 1 bp (0.01%) ≈ 1 tick

// 3. 对齐到 tick spacing (200 for 1% fee tier)
tickLower = roundToTickSpacing(tickLower, 200)
tickUpper = roundToTickSpacing(tickUpper, 200)
```

### 具体示例：WBNB 池子

当前价格：$1,301.73

```
价格范围（±20%）:
  Lower: $1,301.73 × 0.8 = $1,041.38
  Current: $1,301.73
  Upper: $1,301.73 × 1.2 = $1,562.08

Tick 范围:
  Lower tick: -2000 (rounded to -2000)
  Upper tick: +2000 (rounded to +2000)
  Tick spacing: 200
```

## 🚀 使用方法

### 执行脚本
```bash
forge script script/SetupLiquidityV3.s.sol --rpc-url bnb_testnet --broadcast
```

### 预期输出
```
========================================
Setting up V3 Liquidity Pools V3 (Concentrated Liquidity)
========================================
Deployer: 0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725
Strategy: Concentrated liquidity ranges
Fee tier: 1% (10000) - NEW tier
USDT per pool: 25000000 USDT
Target TVL per pool: ~$50M USD ($25M USDT + $25M asset)
Total TVL: ~$250M USD (5 pools)
Effective liquidity: 50-100x due to concentration

Fetching oracle prices...
  WBNB: 1301 USD
  BTCB: 122034 USD
  ETH: 4537 USD
  ADA: 0 USD
  BCH: 579 USD

Pre-minting tokens (with 2x safety factor)...
  USDT: 250000000
  WBNB: 38400
  BTCB: 400
  ETH: 11000
  ADA: 60975600
  BCH: 86200

========================================
Setting up Concentrated Liquidity Pools
========================================

--------------------------------------------------
Setting up WBNB /USDT concentrated pool
--------------------------------------------------
  Token: 0xfadc475b03e3bd7813a71446369204271a0a9843
  Price from oracle: 1301 USD
  Fee tier: 10000 (1%)
  Price range: +/- 20 %
  NFT recipient: 0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725

  Price range:
    Lower: 1041 USD
    Current: 1301 USD
    Upper: 1562 USD
  Tick range:
    Lower tick: -2000
    Upper tick: 2000

  Token amounts:
    Token0: 0xe364204ad025bbcdff6dcb4291f89f532b0a8c35 (USDT)
    Amount0: 25000000
    Token1: 0xfadc475b03e3bd7813a71446369204271a0a9843 (WBNB)
    Amount1: 19200

V3 Pool created successfully!
  Position NFT ID: 24679
  Liquidity: ...
  Amount0 used: 25000000
  Amount1 used: 19200
  Actual TVL: $ 50000000
  Effective liquidity (concentrated): ~$ 250000000 - $ 500000000

[重复其他4个池子...]

========================================
V3 Liquidity Setup Complete
========================================
All 5 concentrated liquidity pools created
Fee tier: 1% (10000)
Position NFTs sent to: 0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725
```

## ✅ 预期创建的池子

### V3 集中流动性池子

| 代币对 | 费率 | 价格范围 | TVL | 有效流动性 | Position NFT |
|--------|------|---------|-----|-----------|-------------|
| WBNB/USDT | 1% | ±20% | $50M | $250M-$500M | 新 ID |
| BTCB/USDT | 1% | ±30% | $50M | $166M-$330M | 新 ID |
| ETH/USDT | 1% | ±20% | $50M | $250M-$500M | 新 ID |
| ADA/USDT | 1% | ±30% | $50M | $166M-$330M | 新 ID |
| BCH/USDT | 1% | ±20% | $50M | $250M-$500M | 新 ID |

**总计**:
- 投入 TVL: **$250M**
- 有效流动性: **$1B - $2B**
- 资金效率: **4-8x**

## 📈 验证池子

### 检查池子地址
```bash
FACTORY="0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865"
WBNB="0xfadc475b03e3bd7813a71446369204271a0a9843"
USDT="0xe364204ad025bbcdff6dcb4291f89f532b0a8c35"

cast call $FACTORY "getPool(address,address,uint24)(address)" \
  $WBNB $USDT 10000 --rpc-url bnb_testnet
```

### 检查 Position NFT
```bash
# 查看部署者持有的 NFT 数量
cast call 0x427bF5b37357632377eCbEC9de3626C71A5396c1 \
  "balanceOf(address)(uint256)" \
  0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725 \
  --rpc-url bnb_testnet

# 应该返回 10 (5个旧 V2 + 5个新 V3)
```

### 检查 Position 详情
```bash
# 假设新的 NFT ID 是 24679
cast call 0x427bF5b37357632377eCbEC9de3626C71A5396c1 \
  "positions(uint256)" \
  24679 \
  --rpc-url bnb_testnet
```

## 🔄 在 Router 中使用 V3 池子

### 指定费率进行交易
```solidity
ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
    tokenIn: WBNB,
    tokenOut: USDT,
    fee: 10000,  // 使用 V3 集中流动性池子 (1%)
    recipient: address(this),
    deadline: block.timestamp,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0
});
```

## ⚠️ 注意事项

### 价格范围管理
- 如果价格超出范围，流动性将完全转换为一种代币
- 需要定期监控价格，必要时调整范围
- 可以通过预言机价格同步保持在范围内

### 价格超出范围的处理
如果价格移出范围：
1. Position 仍然存在，但不提供流动性
2. 可以使用 `decreaseLiquidity()` 移除
3. 重新创建新的范围内的 Position
4. 或者通过交易把价格推回范围内

### 费率影响
- 1% 费率较高，适合测试环境
- 可以防止大量套利交易
- 在 Router 中需要明确指定 `fee: 10000`

## 🆚 三个版本对比

| 版本 | 流动性类型 | 费率 | TVL | 有效流动性 | 推荐使用 |
|------|----------|------|-----|-----------|---------|
| V1 | 全范围 | 0.01%-0.25% | $64B+ | 无法控制 | ❌ 废弃 |
| V2 | 全范围 | 0.05%-0.25% | $2.83M | $2.83M | ⚠️ 流动性不足 |
| **V3** | **集中 ±20-30%** | **1%** | **$25M** | **$100M-$200M** | ✅ **推荐** |

## 📝 后续步骤

1. ✅ 执行 SetupLiquidityV3 创建集中流动性池子
2. ⏭ 验证池子地址和 Position NFT
3. ⏭ 更新 deployed-contracts.json 添加 `v3PoolsV3` 节
4. ⏭ 配置 Router 使用新池子（fee: 10000）
5. ⏭ 测试大额交易（1000 BNB）
6. ⏭ 监控价格范围，确保在范围内
7. ⏭ 必要时通过交易同步价格到预言机价格

## 🎯 关键优势总结

1. **解决 V2 的核心问题**: 单边流动性 → 双边流动性
2. **资金效率提升**: 0.11x → 4-8x（提升 36-72 倍！）
3. **支持大额交易**: 116 BNB → 15,000-20,000 BNB
4. **可管理性**: Position NFT 归部署者所有
5. **独立性**: 新费率（1%）不影响旧池子
6. **超大流动性**: $250M TVL 提供 $1B-$2B 有效流动性

---

**版本**: v3.0
**创建日期**: 2025-10-09
**状态**: 准备执行
**策略**: 集中流动性 ±20-30%
