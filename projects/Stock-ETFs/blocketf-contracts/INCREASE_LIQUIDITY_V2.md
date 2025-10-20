# IncreaseLiquidityV2 使用指南

## 📋 概述

`IncreaseLiquidityV2.s.sol` 用于增加现有 V2 池子的流动性，以支持更大规模的交易。

## 🎯 目标

### 当前问题
- V2 池子 TVL 太低（总计 ~$2.83M）
- WBNB 池子只有 386 BNB，无法支持 1000 BNB 的交易
- V3 全范围流动性导致单边集中（几乎全部是资产代币，USDT 可忽略）

### 解决方案
- **增加每个池子的 TVL 到 $5M**（$2.5M USDT + $2.5M 资产）
- **总 TVL**: $25M（5个池子）
- 这样可以支持：
  - WBNB 池子: ~1950 BNB → 可支持 500-600 BNB 交易
  - BTCB 池子: ~20 BTCB → 可支持 5-6 BTCB 交易
  - ETH 池子: ~550 ETH → 可支持 150-165 ETH 交易

## 💡 为什么使用 increaseLiquidity？

### 优势
✅ **保留现有池子**: 不需要创建新池子
✅ **使用已有 Position NFT**: 24674-24678 已经属于部署者
✅ **直接增加流动性**: 一次操作完成
✅ **不影响费率**: 保持现有的费率配置

### 与重新部署对比
- ❌ 重新部署：需要新建池子，NFT ID 增加，管理复杂
- ✅ 增加流动性：使用现有基础设施，更简单高效

## 🔧 脚本配置

### 目标流动性
```solidity
// 每个池子目标 TVL: $5M USD
uint256 constant TARGET_USDT_PER_POOL = 2_500_000 * 1e18; // $2.5M USDT
uint256 constant TARGET_ASSET_USD_VALUE = 2_500_000 * 1e18; // $2.5M 资产

// 安全系数: 3x（因为 V3 全范围流动性不确定性）
uint256 constant SAFETY_MULTIPLIER = 3;
```

### Position NFT IDs
```solidity
uint256 constant WBNB_POSITION = 24674;
uint256 constant BTCB_POSITION = 24675;
uint256 constant ETH_POSITION = 24676;
uint256 constant ADA_POSITION = 24677;
uint256 constant BCH_POSITION = 24678;
```

## 📊 预期增加量

基于当前价格（从 PriceOracle 获取）：

| 池子 | 当前 TVL | 目标增加 | 最终目标 TVL |
|------|---------|---------|-------------|
| WBNB | $495K | +$4.5M | $5M |
| BTCB | $500K | +$4.5M | $5M |
| ETH | $500K | +$4.5M | $5M |
| ADA | $837K | +$4.2M | $5M |
| BCH | $502K | +$4.5M | $5M |
| **总计** | **$2.83M** | **+$22.2M** | **$25M** |

### 每个池子增加的代币数量（近似）

基于预言机价格：
- **WBNB**: +1950 WBNB ($2.5M ÷ $1283)
- **BTCB**: +20 BTCB ($2.5M ÷ $125,000)
- **ETH**: +550 ETH ($2.5M ÷ $4,545)
- **ADA**: +3,048,780 ADA ($2.5M ÷ $0.82)
- **BCH**: +4,295 BCH ($2.5M ÷ $582)
- **USDT**: +$2.5M 每个池子

## 🚀 使用方法

### 1. 执行脚本
```bash
forge script script/IncreaseLiquidityV2.s.sol --rpc-url bnb_testnet --broadcast
```

### 2. 预期输出
```
========================================
Increasing V2 Pool Liquidity
========================================
Deployer: 0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725
Target TVL per pool: $5M USD
  $2.5M USDT + $2.5M asset
Total target TVL: $25M USD (5 pools)

Fetching oracle prices...
  WBNB: 1283 USD
  BTCB: 125000 USD
  ETH: 4545 USD
  ADA: 0 USD
  BCH: 582 USD

Pre-minting tokens (with 3x safety factor)...
  USDT: 37500000 tokens
  WBNB: 5850 tokens
  BTCB: 60 tokens
  ETH: 1650 tokens
  ADA: 9146340 tokens
  BCH: 12885 tokens

Tokens minted successfully

Approving Position Manager...
Approvals complete

========================================
Increasing Liquidity for Each Position
========================================

--------------------------------------------------
Position 24674 - WBNB
--------------------------------------------------
  Token0: 0xfadc...
  Token1: 0xe364...
  Current liquidity: ...
  Increasing with:
    Amount0 desired: 5850
    Amount1 desired: 2500000
  Success!
    Liquidity added: ...
    Amount0 used: ...
    Amount1 used: ...
    New total liquidity: ...

[重复其他4个池子...]

========================================
Liquidity Increase Complete
========================================
All 5 positions have been increased
Target TVL per pool: $5M USD
Total target TVL: $25M USD
```

## ✅ 验证增加后的流动性

### 检查池子储备
```bash
# WBNB 池子
POOL="0x5b57e2f915e4463f732dd787a04e8235dae2e61a"
WBNB="0xfadc475b03e3bd7813a71446369204271a0a9843"
USDT="0xe364204ad025bbcdff6dcb4291f89f532b0a8c35"

echo "WBNB Pool Reserves:"
cast call $WBNB "balanceOf(address)(uint256)" $POOL --rpc-url bnb_testnet
cast call $USDT "balanceOf(address)(uint256)" $POOL --rpc-url bnb_testnet
```

预期结果：
- WBNB: ~2336 BNB (386 + 1950)
- USDT: ~$2.5M (0.3 + 2.5M)

### 检查 Position NFT 流动性
```bash
# 查看 Position 24674 的流动性
cast call 0x427bF5b37357632377eCbEC9de3626C71A5396c1 \
  "positions(uint256)" \
  24674 \
  --rpc-url bnb_testnet
```

## 📈 增加后的交易能力

### WBNB 池子（最重要的例子）
- **当前**: 386 BNB → 最大安全交易 ~116 BNB
- **增加后**: ~2336 BNB → 最大安全交易 ~700 BNB
- ✅ **可以支持 500-600 BNB 的交易**

### 其他池子
- **BTCB**: ~24 BTCB → 可支持 7 BTCB 交易
- **ETH**: ~660 ETH → 可支持 200 ETH 交易
- **ADA**: ~3.5M ADA → 可支持 1M ADA 交易
- **BCH**: ~5157 BCH → 可支持 1500 BCH 交易

## ⚠️ V3 全范围流动性注意事项

### 为什么不是精确 50/50 分配？
V3 全范围流动性会根据当前价格 tick 分配：
- 当前价格偏向哪边，流动性就更多集中在那边
- **不是** 50% USDT + 50% 资产
- 可能是 95% 资产 + 5% USDT（或反之）

### 为什么使用 3x 安全系数？
```solidity
uint256 constant SAFETY_MULTIPLIER = 3;
```

因为 V3 在添加全范围流动性时：
1. 无法预测准确需要多少代币
2. 可能只使用提供的一部分
3. 多余的代币会退还给调用者
4. 3x 确保有足够的代币完成操作

## 🔄 如果还需要更多流动性？

如果 $5M TVL 仍然不够，可以：

### 选项 1: 再次运行脚本
修改目标值并重新执行：
```solidity
// 改为 $10M per pool
uint256 constant TARGET_USDT_PER_POOL = 5_000_000 * 1e18;
uint256 constant TARGET_ASSET_USD_VALUE = 5_000_000 * 1e18;
```

### 选项 2: 使用更高的倍数
如果需要支持 2000 BNB 交易：
```solidity
// 改为 $10M per pool
uint256 constant TARGET_USDT_PER_POOL = 5_000_000 * 1e18;
uint256 constant TARGET_ASSET_USD_VALUE = 5_000_000 * 1e18;
```

## 📝 与现有文档的关系

- **V3_POOLS_SUMMARY.md**: 已更新 V2 池子信息，增加流动性后需要更新 TVL
- **SETUP_LIQUIDITY_V2.md**: SetupLiquidityV2 创建的基础，这个脚本在此基础上增加
- **deployed-contracts.json**: 增加流动性后需要更新 `tvl` 字段

## 🎯 后续步骤

1. ✅ 执行 IncreaseLiquidityV2 脚本
2. ⏭ 验证池子储备（使用上面的 cast call 命令）
3. ⏭ 测试大额交易（500 BNB）
4. ⏭ 更新 deployed-contracts.json 中的 TVL 信息
5. ⏭ 如果需要，再次运行脚本增加更多流动性

---

**创建日期**: 2025-10-09
**状态**: 准备执行
**目标**: 增加 V2 池子流动性以支持 1000 BNB 规模的交易
