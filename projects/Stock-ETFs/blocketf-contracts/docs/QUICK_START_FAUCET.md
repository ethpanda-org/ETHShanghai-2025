# 🚀 统一水龙头快速开始

## 一行命令获取所有测试代币

```bash
cast send <FAUCET_ADDRESS> "claimAll()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

**就这么简单！** 一次交易获得：
- 10 WBNB
- 0.1 BTCB
- 1 ETH
- 1000 XRP
- 10 SOL
- 10,000 USDT

---

## 常用命令速查

### 查询

```bash
# 检查是否可以领取
cast call $FAUCET "canClaim(address)(bool)" $YOUR_ADDRESS --rpc-url bnb_testnet

# 查询冷却剩余时间（秒）
cast call $FAUCET "getTimeUntilNextClaim(address)(uint256)" $YOUR_ADDRESS --rpc-url bnb_testnet

# 获取所有代币地址
cast call $FAUCET "getTokenAddresses()(address,address,address,address,address,address)" --rpc-url bnb_testnet

# 查看领取数量
cast call $FAUCET "getFaucetAmounts()(uint256,uint256,uint256,uint256,uint256,uint256)" --rpc-url bnb_testnet
```

### 领取

```bash
# 领取所有代币（推荐）
cast send $FAUCET "claimAll()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY

# 只领取 USDT
cast send $FAUCET "claimSingle(string)" "USDT" --rpc-url bnb_testnet --private-key $PRIVATE_KEY

# 只领取 BTCB
cast send $FAUCET "claimSingle(string)" "BTCB" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```

---

## 与旧方式对比

### ❌ 旧方式（不要这样做）
```bash
cast send $WBNB "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $BTCB "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $ETH "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $XRP "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $SOL "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $USDT "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```
❌ 6 个交易，6x gas，繁琐

### ✅ 新方式（推荐）
```bash
cast send $FAUCET "claimAll()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```
✅ 1 个交易，简单快速

---

## 限制

- **冷却时间**：24 小时（1 天）
- 每个地址每天只能领取一次
- `claimAll()` 和 `claimSingle()` 共享冷却时间

---

## 故障排查

### "Cooldown not elapsed"
**原因**：24小时内已经领取过
**解决**：等待冷却结束，或使用另一个地址

### 查看剩余冷却时间
```bash
cast call $FAUCET "getTimeUntilNextClaim(address)(uint256)" $YOUR_ADDRESS --rpc-url bnb_testnet

# 输出 0 = 可以立即领取
# 输出 3600 = 还需等待 1 小时
```

---

## 更多信息

- 📖 完整指南：[FAUCET_USAGE_GUIDE.md](./FAUCET_USAGE_GUIDE.md)
- 🏗️ 架构说明：[FAUCET_ARCHITECTURE.md](./FAUCET_ARCHITECTURE.md)
- ✅ 部署清单：[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
