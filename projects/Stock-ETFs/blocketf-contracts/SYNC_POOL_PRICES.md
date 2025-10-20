# 同步池子价格与预言机价格

## 📋 概述

V3 流动性池的价格由市场交易驱动，不会自动与 Chainlink 预言机价格同步。在测试环境中，由于交易量很少，池子价格可能会长时间保持不变，与预言机价格产生偏差。

本文档提供了手动同步价格的方法。

## 🔍 检查价格偏差

运行价格检查脚本：

```bash
bash script/CheckPoolPrices.sh
```

**输出示例**：
```
============================================================
Pool Prices vs Oracle Prices
============================================================

WBNB/USDT (0.01% fee):
--------------------------
  Pool address: 0x4599e486560EB4F9A6C3E8CC5B9E74a366e4c3D1
  Oracle price: $1283.26

BTCB/USDT (0.05% fee):
--------------------------
  Pool address: 0xbc10b1D4Eb10386419BB343A275B58b92223DC00
  Oracle price: $122034.15
```

## 🔧 手动同步价格

### 方法 1: 使用 cast 命令

#### 准备工作

1. 确保有足够的代币余额
2. 批准 Swap Router 使用你的代币

```bash
# 批准 USDT (如果要买入资产)
cast send <USDT_ADDRESS> "approve(address,uint256)" \
  0x1b81D678ffb9C0263b24A97847620C99d213eB14 \
  100000000000000000000000000 \
  --rpc-url bnb_testnet --private-key $PRIVATE_KEY

# 批准资产代币 (如果要卖出资产)
cast send <ASSET_ADDRESS> "approve(address,uint256)" \
  0x1b81D678ffb9C0263b24A97847620C99d213eB14 \
  100000000000000000000000000 \
  --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```

#### 情况 A: 池子价格 > 预言机价格 (卖出资产降低价格)

**示例**: WBNB 池子价格 $1325，预言机价格 $1283

```bash
# 卖出 10 WBNB 换 USDT
cast send 0x1b81D678ffb9C0263b24A97847620C99d213eB14 \
  "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))" \
  "(0xfadc475b03e3bd7813a71446369204271a0a9843,0xe364204ad025bbcdff6dcb4291f89f532b0a8c35,100,0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725,9999999999,10000000000000000000,0,0)" \
  --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```

**参数说明**：
- `tokenIn`: WBNB 地址
- `tokenOut`: USDT 地址
- `fee`: 100 (0.01%)
- `recipient`: 你的地址
- `deadline`: 9999999999 (很远的未来)
- `amountIn`: 10000000000000000000 (10 WBNB)
- `amountOutMinimum`: 0 (接受任何输出)
- `sqrtPriceLimitX96`: 0 (无价格限制)

#### 情况 B: 池子价格 < 预言机价格 (买入资产提高价格)

**示例**: ADA 池子价格 $0.82，预言机价格 $0.85

```bash
# 用 1000 USDT 买入 ADA
cast send 0x1b81D678ffb9C0263b24A97847620C99d213eB14 \
  "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))" \
  "(0xe364204ad025bbcdff6dcb4291f89f532b0a8c35,0xbe1bf5c613c64b2a5f2ded08b4a26dd2082fa2cb,2500,0xB73Ebe02d3A29d61cb3Ee87A3EEdE73cb1A3c725,9999999999,1000000000000000000000,0,0)" \
  --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```

**参数说明**：
- `tokenIn`: USDT 地址
- `tokenOut`: ADA 地址
- `fee`: 2500 (0.25%)
- `recipient`: 你的地址
- `deadline`: 9999999999
- `amountIn`: 1000000000000000000000 (1000 USDT)
- `amountOutMinimum`: 0
- `sqrtPriceLimitX96`: 0

### 方法 2: 使用 Foundry 脚本 (待实现)

由于 Solidity 脚本的复杂性，我们暂时使用 cast 命令手动同步。

## 📊 代币地址和费率参考

| 代币 | 地址 | 费率 |
|------|------|------|
| WBNB | `0xfadc475b03e3bd7813a71446369204271a0a9843` | 100 (0.01%) |
| BTCB | `0x15ab97353bfb6c6f07b3354a2ea1615eb2f45941` | 500 (0.05%) |
| ETH | `0x1cd44ec6cfb99132531793a397220c84216c5eed` | 500 (0.05%) |
| ADA | `0xbe1bf5c613c64b2a5f2ded08b4a26dd2082fa2cb` | 2500 (0.25%) |
| BCH | `0x1ab580a59da516f068f43efcac10cc33862a7e88` | 2500 (0.25%) |
| USDT | `0xe364204ad025bbcdff6dcb4291f89f532b0a8c35` | - |

**Swap Router**: `0x1b81D678ffb9C0263b24A97847620C99d213eB14`

## 💡 最佳实践

1. **小额开始**: 先用小额交易测试 (如 100 USDT 或 1 WBNB)
2. **检查结果**: 每次交易后重新运行 `CheckPoolPrices.sh` 检查价格
3. **渐进调整**: 如果偏差仍大于 1%，重复交易
4. **注意方向**:
   - 池子价格太高 → 卖出资产
   - 池子价格太低 → 买入资产

## 📈 推荐同步频率

- **测试网**: 预言机价格可能 24 小时更新一次
- **建议**: 每天检查一次价格偏差
- **触发阈值**: 当偏差 > 1% 时执行同步

## ⚠️ 注意事项

1. 确保钱包有足够的代币余额
2. 确保钱包有足够的 BNB 支付 gas
3. 每次同步前都要先批准 Swap Router
4. 在测试网上操作，注意保护私钥安全

## 🔄 自动化 (可选)

如果需要自动化价格同步，可以：

1. 创建一个定时任务 (cron job)
2. 运行 `CheckPoolPrices.sh`
3. 解析输出并自动执行同步交易

**cron 示例** (每天 UTC 时间 0:00 执行):
```cron
0 0 * * * cd /path/to/project && bash script/CheckPoolPrices.sh && bash script/SyncIfNeeded.sh
```

## 🆘 故障排除

### 问题 1: "Insufficient balance"
**解决**: 先 mint 更多代币或减小交易金额

### 问题 2: "Allowance too low"
**解决**: 重新批准 Swap Router

### 问题 3: "Price impact too high"
**解决**: 减小交易金额，分多次同步

### 问题 4: 交易失败但 gas 已扣除
**解决**: 检查代币余额和批准额度是否足够

---

**最后更新**: 2025-10-08
**版本**: v1.0
