# USDT 水龙头使用指南

## 💡 设计理念

### 为什么只需要 USDT 水龙头？

用户测试 BlockETF 系统的完整流程：

```
1. 从水龙头获取 USDT ✅
   ↓
2. 调用 ETFRouterV1.mintWithUSDT() ✅
   ↓
3. Router 自动将 USDT swap 为其他资产 ✅
   (WBNB, BTCB, ETH, XRP, SOL)
   ↓
4. 获得 ETF 份额 ✅
```

**用户不需要**：
- ❌ 手动获取每个资产
- ❌ 手动计算资产比例
- ❌ 手动组装资产

**ETFRouterV1 会自动处理一切**！

---

## 🚀 快速开始

### 一键获取 USDT

```bash
# 设置水龙头地址（从部署输出获取）
export USDT_FAUCET=0x...

# 领取 USDT（默认 10,000 USDT）
cast send $USDT_FAUCET "claim()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

### 使用 USDT 铸造 ETF

```bash
# 1. 批准 USDT 给 Router
cast send $USDT "approve(address,uint256)" \
  $ETF_ROUTER_V1 \
  10000000000000000000000 \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY

# 2. 用 10,000 USDT 铸造 ETF
cast send $ETF_ROUTER_V1 "mintWithUSDT(uint256,uint256,uint256)" \
  10000000000000000000000 \
  0 \
  $(($(date +%s) + 3600)) \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

**就这么简单！** Router 会自动：
- 将 USDT swap 为 WBNB、BTCB、ETH、XRP、SOL
- 按照目标权重（20%/30%/25%/10%/15%）
- 组装成 ETF 份额

---

## 📊 配置参数

### 默认配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| **分发数量** | 10,000 USDT | 每次领取的数量 |
| **冷却时间** | 24 小时 | 两次领取之间的间隔 |

### 为什么是 10,000 USDT？

以当前价格计算，10,000 USDT 可以铸造的 ETF 资产：
- 20% = 2,000 USDT → ~3.33 WBNB
- 30% = 3,000 USDT → ~0.032 BTCB
- 25% = 2,500 USDT → ~0.735 ETH
- 10% = 1,000 USDT → ~400 XRP
- 15% = 1,500 USDT → ~7.89 SOL

**足够进行完整测试**！

---

## 🔧 使用方法

### 1. 查询功能

#### 检查是否可以领取

```bash
cast call $USDT_FAUCET "canClaim(address)(bool)" \
  $YOUR_ADDRESS \
  --rpc-url bnb_testnet

# 返回: true (可以领取) 或 false (冷却中)
```

#### 查询冷却剩余时间

```bash
cast call $USDT_FAUCET "getTimeUntilNextClaim(address)(uint256)" \
  $YOUR_ADDRESS \
  --rpc-url bnb_testnet

# 返回: 0 (可以立即领取) 或 剩余秒数
```

#### 查看上次领取时间

```bash
cast call $USDT_FAUCET "getLastClaimTime(address)(uint256)" \
  $YOUR_ADDRESS \
  --rpc-url bnb_testnet

# 返回: Unix 时间戳 (0 表示从未领取)
```

#### 查看当前配置

```bash
# 查看分发数量
cast call $USDT_FAUCET "faucetAmount()(uint256)" --rpc-url bnb_testnet

# 查看冷却时间
cast call $USDT_FAUCET "faucetCooldown()(uint256)" --rpc-url bnb_testnet

# 查看 USDT 地址
cast call $USDT_FAUCET "usdtToken()(address)" --rpc-url bnb_testnet
```

### 2. 领取 USDT

```bash
# 基本用法
cast send $USDT_FAUCET "claim()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY

# 带 gas 估算
cast send $USDT_FAUCET "claim()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY \
  --gas-limit 100000
```

### 3. 验证余额

```bash
# 检查 USDT 余额
cast call $USDT "balanceOf(address)(uint256)" \
  $YOUR_ADDRESS \
  --rpc-url bnb_testnet

# 转换为可读格式（除以 10^18）
cast call $USDT "balanceOf(address)(uint256)" $YOUR_ADDRESS --rpc-url bnb_testnet | \
  awk '{printf "%.2f USDT\n", $1/10^18}'
```

---

## 👨‍💼 管理员功能

### 调整分发数量

```bash
# 设置为 5,000 USDT
cast send $USDT_FAUCET "setFaucetAmount(uint256)" \
  5000000000000000000000 \
  --rpc-url bnb_testnet \
  --private-key $ADMIN_KEY

# 设置为 20,000 USDT
cast send $USDT_FAUCET "setFaucetAmount(uint256)" \
  20000000000000000000000 \
  --rpc-url bnb_testnet \
  --private-key $ADMIN_KEY
```

### 调整冷却时间

```bash
# 设置为 12 小时
cast send $USDT_FAUCET "setFaucetCooldown(uint256)" \
  43200 \
  --rpc-url bnb_testnet \
  --private-key $ADMIN_KEY

# 设置为 1 小时（快速测试）
cast send $USDT_FAUCET "setFaucetCooldown(uint256)" \
  3600 \
  --rpc-url bnb_testnet \
  --private-key $ADMIN_KEY

# 设置为 0（无冷却，仅测试用）
cast send $USDT_FAUCET "setFaucetCooldown(uint256)" \
  0 \
  --rpc-url bnb_testnet \
  --private-key $ADMIN_KEY
```

### 批量更新配置

```bash
# 同时更新数量和冷却时间
cast send $USDT_FAUCET "updateFaucetConfig(uint256,uint256)" \
  15000000000000000000000 \  # 15,000 USDT
  21600 \                    # 6 小时
  --rpc-url bnb_testnet \
  --private-key $ADMIN_KEY
```

---

## 📝 完整测试流程

### 场景 1：首次测试

```bash
# 1. 领取 USDT
cast send $USDT_FAUCET "claim()" --rpc-url bnb_testnet --private-key $KEY

# 2. 检查余额
cast call $USDT "balanceOf(address)(uint256)" $YOUR_ADDRESS --rpc-url bnb_testnet
# 应该看到 10,000 USDT (10000000000000000000000)

# 3. 批准 Router
cast send $USDT "approve(address,uint256)" \
  $ETF_ROUTER_V1 10000000000000000000000 \
  --rpc-url bnb_testnet --private-key $KEY

# 4. 铸造 ETF
cast send $ETF_ROUTER_V1 "mintWithUSDT(uint256,uint256,uint256)" \
  10000000000000000000000 0 $(($(date +%s) + 3600)) \
  --rpc-url bnb_testnet --private-key $KEY

# 5. 检查 ETF 余额
cast call $BLOCK_ETF_CORE "balanceOf(address)(uint256)" \
  $YOUR_ADDRESS --rpc-url bnb_testnet
```

### 场景 2：持续测试

```bash
# 第二天再次领取
cast send $USDT_FAUCET "claim()" --rpc-url bnb_testnet --private-key $KEY

# 测试赎回功能
cast send $ETF_ROUTER_V1 "burnToUSDT(uint256,uint256,uint256)" \
  1000000000000000000 \      # 赎回 1 个 ETF
  0 \                        # minUSDT
  $(($(date +%s) + 3600)) \  # deadline
  --rpc-url bnb_testnet --private-key $KEY
```

---

## ⚠️ 限制与注意事项

### 冷却机制

- **默认冷却**：24 小时
- **共享冷却**：每个地址独立计算
- **无法绕过**：必须等待冷却时间结束

### 查看剩余冷却时间

```bash
# 获取剩余秒数
REMAINING=$(cast call $USDT_FAUCET "getTimeUntilNextClaim(address)(uint256)" $YOUR_ADDRESS --rpc-url bnb_testnet)

# 转换为小时
echo "Remaining: $(($REMAINING / 3600)) hours"
```

### 如果需要更多 USDT

1. **等待冷却结束**
2. **使用另一个钱包地址**
3. **联系管理员调整配置**

---

## 🔍 故障排查

### "Cannot claim yet"

**原因**：冷却时间未结束

**解决**：
```bash
# 查看剩余时间
cast call $USDT_FAUCET "getTimeUntilNextClaim(address)(uint256)" \
  $YOUR_ADDRESS --rpc-url bnb_testnet
```

### 余额未增加

**检查交易状态**：
```bash
# 查看交易收据
cast receipt <TX_HASH> --rpc-url bnb_testnet
```

### Gas 估算失败

**可能原因**：
- 冷却时间未结束
- 网络拥堵

**解决**：先用 `canClaim()` 检查

---

## 💡 最佳实践

### 1. 测试前检查

```bash
# 检查是否可以领取
if cast call $USDT_FAUCET "canClaim(address)(bool)" $YOUR_ADDRESS --rpc-url bnb_testnet | grep -q "true"; then
  echo "✅ Can claim now"
  cast send $USDT_FAUCET "claim()" --rpc-url bnb_testnet --private-key $KEY
else
  echo "❌ Still in cooldown"
  cast call $USDT_FAUCET "getTimeUntilNextClaim(address)(uint256)" $YOUR_ADDRESS --rpc-url bnb_testnet
fi
```

### 2. 自动化脚本

```bash
#!/bin/bash
# claim-usdt.sh

FAUCET=$USDT_FAUCET
USER=$YOUR_ADDRESS

# 检查冷却
CAN_CLAIM=$(cast call $FAUCET "canClaim(address)(bool)" $USER --rpc-url bnb_testnet)

if [[ $CAN_CLAIM == *"true"* ]]; then
  echo "Claiming USDT..."
  cast send $FAUCET "claim()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
  echo "✅ Claimed successfully!"
else
  REMAINING=$(cast call $FAUCET "getTimeUntilNextClaim(address)(uint256)" $USER --rpc-url bnb_testnet)
  HOURS=$((REMAINING / 3600))
  echo "⏳ Please wait $HOURS hours"
fi
```

### 3. 批量测试账户

```bash
# 为多个测试账户分发 USDT
for key in "${TEST_KEYS[@]}"; do
  addr=$(cast wallet address --private-key $key)

  if cast call $USDT_FAUCET "canClaim(address)(bool)" $addr --rpc-url bnb_testnet | grep -q "true"; then
    cast send $USDT_FAUCET "claim()" --rpc-url bnb_testnet --private-key $key
    echo "✅ Claimed for $addr"
  else
    echo "⏭️  Skipped $addr (cooldown)"
  fi
done
```

---

## 📊 与旧方案对比

### ❌ 旧方案：多代币水龙头

```bash
# 需要领取 6 个代币
cast send $WBNB_FAUCET "claim()" ...   # 10 WBNB
cast send $BTCB_FAUCET "claim()" ...   # 0.1 BTCB
cast send $ETH_FAUCET "claim()" ...    # 1 ETH
cast send $XRP_FAUCET "claim()" ...    # 1000 XRP
cast send $SOL_FAUCET "claim()" ...    # 10 SOL
cast send $USDT_FAUCET "claim()" ...   # 10,000 USDT

# 然后手动组装资产
# 复杂、容易出错
```

### ✅ 新方案：USDT 水龙头 + Router

```bash
# 只需领取 USDT
cast send $USDT_FAUCET "claim()" ...

# Router 自动处理一切
cast send $ETF_ROUTER_V1 "mintWithUSDT(...)" ...

# 简单、高效、符合真实场景
```

---

## 🎯 设计优势

1. **符合实际使用场景**
   - 真实用户只会用稳定币铸造 ETF
   - 不会手动获取每个资产

2. **简化测试流程**
   - 只需一个水龙头
   - 减少交易次数

3. **突出核心功能**
   - 测试重点是 ETFRouterV1 的 swap 逻辑
   - 验证自动组装资产的能力

4. **灵活配置**
   - 管理员可调整分发数量
   - 管理员可调整冷却时间
   - 适应不同测试需求

---

## 🔗 相关合约

- **USDTFaucet**: USDT 分发
- **ETFRouterV1**: 接收 USDT，自动 swap 并铸造 ETF
- **BlockETFCore**: ETF 核心合约
- **MockERC20 (USDT)**: 测试网 USDT

---

## 📚 相关文档

- [BlockETF 部署指南](./TESTNET_DEPLOYMENT_GUIDE.md)
- [ETFRouterV1 使用说明](./ROUTER_USAGE_GUIDE.md)
- [Mock 代币设计](./MOCK_TOKEN_DESIGN.md)

---

**总结**：USDT 水龙头 + ETFRouterV1 = 最简洁高效的测试方案！✨
