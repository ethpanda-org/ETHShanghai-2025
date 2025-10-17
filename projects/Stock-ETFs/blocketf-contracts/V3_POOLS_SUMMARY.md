# V3 流动性池总结

## 📊 已部署的池子

### V2 池子（推荐使用）✅

| 代币对 | 池子地址 | 费率 | TVL | Position NFT ID |
|--------|---------|------|-----|----------------|
| WBNB/USDT | `0x5b57e2f915e4463f732dd787a04e8235dae2e61a` | 0.05% (500) | ~$1M | 24674 |
| BTCB/USDT | `0x8c9004dcaf0ddeac935a173ac1763935c5d2b0fb` | 0.25% (2500) | ~$1M | 24675 |
| ETH/USDT | `0xad7e45981973026ef7d296aa158836b44379192a` | 0.25% (2500) | ~$1M | 24676 |
| ADA/USDT | `0xde40e85e517bb99db0de0d2d17e7a13d63bf0319` | 0.05% (500) | ~$1M | 24677 |
| BCH/USDT | `0xf0e84c2dda797cd9ab7b206a7cdd4acc3cabadcf` | 0.05% (500) | ~$1M | 24678 |

**特点**:
- ✅ 合理的流动性规模（每池 $1M）
- ✅ Position NFT 属于部署者地址 `0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725`
- ✅ 可以管理和调整流动性
- ✅ 易于通过交易调整价格

### V1 池子（已废弃）❌

| 代币对 | 池子地址 | 费率 | 问题 |
|--------|---------|------|------|
| WBNB/USDT | `0x4599e486560EB4F9A6C3E8CC5B9E74a366e4c3D1` | 0.01% (100) | 流动性过大 (~$64B) |
| BTCB/USDT | `0xbc10b1D4Eb10386419BB343A275B58b92223DC00` | 0.05% (500) | 流动性过大 (~$6T) |
| ETH/USDT | `0x704ECfbeB7D4b82E530B497Cca8A5Ab3cF8f9b7F` | 0.05% (500) | 流动性过大 (~$227B) |
| ADA/USDT | `0x47FC7622A672e7BEEDD221bc129cDB25AC88b8AC` | 0.25% (2500) | 流动性过大 |
| BCH/USDT | `0xa309357c519a2BfeF2D25928F2D57aF5B2ACa50a` | 0.25% (2500) | 流动性过大 |

**问题**:
- ❌ 流动性过大，难以调整价格
- ❌ Position NFT 属于 Foundry 临时地址，无法控制
- ❌ 不适合测试和价格管理

## 🔧 Position NFT 管理

### 查看 NFT 所有权
```bash
cast call 0x427bF5b37357632377eCbEC9de3626C71A5396c1 \
  "balanceOf(address)(uint256)" \
  0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725 \
  --rpc-url bnb_testnet
```

应该返回 `5`（5个 Position NFT）

### 查看特定 NFT 信息
```bash
# 以 WBNB Pool 为例 (NFT ID: 24674)
cast call 0x427bF5b37357632377eCbEC9de3626C71A5396c1 \
  "positions(uint256)" \
  24674 \
  --rpc-url bnb_testnet
```

### 减少流动性
```solidity
// 使用 DecreaseLiquidity 合约
positionManager.decreaseLiquidity(DecreaseLiquidityParams({
    tokenId: 24674,
    liquidity: amountToRemove,
    amount0Min: 0,
    amount1Min: 0,
    deadline: block.timestamp + 1 hours
}));

// 收集代币
positionManager.collect(CollectParams({
    tokenId: 24674,
    recipient: yourAddress,
    amount0Max: type(uint128).max,
    amount1Max: type(uint128).max
}));
```

## 📈 检查池子储备

```bash
bash /tmp/check_all_reserves.sh
```

或单独检查 V2 池子：

```bash
# WBNB V2 Pool
POOL="0x5b57e2f915e4463f732dd787a04e8235dae2e61a"
WBNB="0xfadc475b03e3bd7813a71446369204271a0a9843"
USDT="0xe364204ad025bbcdff6dcb4291f89f532b0a8c35"

echo "WBNB/USDT V2 Pool Reserves:"
cast call $WBNB "balanceOf(address)(uint256)" $POOL --rpc-url bnb_testnet
cast call $USDT "balanceOf(address)(uint256)" $POOL --rpc-url bnb_testnet
```

## 🔄 价格同步

使用 `CheckPoolPrices.sh` 检查 V2 池子价格：

```bash
# 需要修改脚本以使用 V2 池子地址和费率
bash script/CheckPoolPrices.sh
```

或手动查询：

```bash
# WBNB V2 Pool (fee: 500)
FACTORY="0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865"
WBNB="0xfadc475b03e3bd7813a71446369204271a0a9843"
USDT="0xe364204ad025bbcdff6dcb4291f89f532b0a8c35"

cast call $FACTORY "getPool(address,address,uint24)(address)" \
  $WBNB $USDT 500 --rpc-url bnb_testnet
```

## 🎯 在 Router 中使用 V2 池子

配置你的 Router/Rebalancer 合约使用 V2 池子：

```solidity
// 例如在交换时指定费率
ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
    tokenIn: WBNB,
    tokenOut: USDT,
    fee: 500,  // 使用 V2 池子的费率 (0.05%)
    recipient: address(this),
    deadline: block.timestamp,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0
});
```

## 📋 合约地址汇总

### 核心合约
- **PancakeSwap V3 Factory**: `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865`
- **Position Manager (NFT)**: `0x427bF5b37357632377eCbEC9de3626C71A5396c1`
- **Swap Router**: `0x1b81D678ffb9C0263b24A97847620C99d213eB14`
- **Price Oracle**: `0x33bfb48f9f7203259247f6a12265fcb8571e1951`

### 代币地址
- **WBNB**: `0xfadc475b03e3bd7813a71446369204271a0a9843`
- **BTCB**: `0x15ab97353bfb6c6f07b3354a2ea1615eb2f45941`
- **ETH**: `0x1cd44ec6cfb99132531793a397220c84216c5eed`
- **ADA**: `0xbe1bf5c613c64b2a5f2ded08b4a26dd2082fa2cb`
- **BCH**: `0x1ab580a59da516f068f43efcac10cc33862a7e88`
- **USDT**: `0xe364204ad025bbcdff6dcb4291f89f532b0a8c35`

### V2 池子地址（推荐）
- **WBNB/USDT (0.05%)**: `0x5b57e2f915e4463f732dd787a04e8235dae2e61a`
- **BTCB/USDT (0.25%)**: `0x8c9004dcaf0ddeac935a173ac1763935c5d2b0fb`
- **ETH/USDT (0.25%)**: `0xad7e45981973026ef7d296aa158836b44379192a`
- **ADA/USDT (0.05%)**: `0xde40e85e517bb99db0de0d2d17e7a13d63bf0319`
- **BCH/USDT (0.05%)**: `0xf0e84c2dda797cd9ab7b206a7cdd4acc3cabadcf`

## ⚡ 快速操作指南

### 1. 验证部署
```bash
# 检查你拥有的 Position NFT 数量（应该是 5）
cast call 0x427bF5b37357632377eCbEC9de3626C71A5396c1 \
  "balanceOf(address)(uint256)" \
  0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725 \
  --rpc-url bnb_testnet
```

### 2. 检查池子状态
```bash
# 检查 WBNB V2 池子的储备
POOL="0x5b57e2f915e4463f732dd787a04e8235dae2e61a"
cast call 0xfadc475b03e3bd7813a71446369204271a0a9843 \
  "balanceOf(address)(uint256)" $POOL --rpc-url bnb_testnet
```

### 3. 执行测试交易
```bash
# 小额测试交易（1 USDT 换 WBNB）
# 使用 V2 池子的费率 (500)
cast send 0x1b81D678ffb9C0263b24A97847620C99d213eB14 \
  "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))" \
  "(0xe364204ad025bbcdff6dcb4291f89f532b0a8c35,0xfadc475b03e3bd7813a71446369204271a0a9843,500,YOUR_ADDRESS,9999999999,1000000000000000000,0,0)" \
  --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```

---

**更新时间**: 2025-10-09
**状态**: ✅ 已部署并验证
**部署者**: `0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725`
