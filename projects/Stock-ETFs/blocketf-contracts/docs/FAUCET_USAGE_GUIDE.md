# 统一水龙头使用指南

## 概述

我们部署了 `MockTokenFaucet` 统一水龙头合约，提供**一键领取所有测试代币**的便捷体验。

## 🎯 核心优势

### 旧方式：分别领取（❌ 不推荐）
```bash
# 需要 6 个交易，6 次 gas 费
cast send $WBNB "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $BTCB "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $ETH "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $XRP "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $SOL "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $USDT "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```

### 新方式：一键领取（✅ 推荐）
```bash
# 只需 1 个交易，1 次 gas 费，获取所有 6 个代币！
cast send $FAUCET "claimAll()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

## 📦 默认领取数量

每次 `claimAll()` 将获得：

| 代币 | 数量 | 估值（USD） |
|------|------|------------|
| WBNB | 10 | $6,000 |
| BTCB | 0.1 | $9,500 |
| ETH | 1 | $3,400 |
| XRP | 1,000 | $2,500 |
| SOL | 10 | $1,900 |
| USDT | 10,000 | $10,000 |
| **总计** | - | **~$33,300** |

这些数量足够：
- ✅ 提供流动性
- ✅ 测试 ETF 铸造
- ✅ 测试 rebalance 功能
- ✅ 进行压力测试

## 🔧 使用方法

### 1. 基本用法：一键领取所有代币

```bash
# 设置环境变量
export FAUCET=0x... # MockTokenFaucet 合约地址

# 一键领取
cast send $FAUCET "claimAll()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

**返回示例**：
```
✅ Transaction successful
Gas used: ~180,000
You received:
  - 10 WBNB
  - 0.1 BTCB
  - 1 ETH
  - 1,000 XRP
  - 10 SOL
  - 10,000 USDT
```

### 2. 高级用法：领取单个代币

如果只需要特定代币：

```bash
# 只领取 USDT
cast send $FAUCET "claimSingle(string)" "USDT" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY

# 只领取 BTCB
cast send $FAUCET "claimSingle(string)" "BTCB" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

支持的代币符号：`"WBNB"`, `"BTCB"`, `"ETH"`, `"XRP"`, `"SOL"`, `"USDT"`

### 3. 查询功能

#### 检查是否可以领取
```bash
cast call $FAUCET "canClaim(address)(bool)" $YOUR_ADDRESS \
  --rpc-url bnb_testnet

# 输出: true (可以领取) 或 false (冷却中)
```

#### 查询冷却剩余时间
```bash
cast call $FAUCET "getTimeUntilNextClaim(address)(uint256)" $YOUR_ADDRESS \
  --rpc-url bnb_testnet

# 输出: 0 (可以立即领取) 或 剩余秒数
```

#### 查看所有代币地址
```bash
cast call $FAUCET "getTokenAddresses()(address,address,address,address,address,address)" \
  --rpc-url bnb_testnet

# 返回 6 个代币地址: WBNB, BTCB, ETH, XRP, SOL, USDT
```

#### 查看领取数量
```bash
cast call $FAUCET "getFaucetAmounts()(uint256,uint256,uint256,uint256,uint256,uint256)" \
  --rpc-url bnb_testnet

# 返回 6 个数量 (18 decimals)
```

### 4. 验证余额

领取后验证代币余额：

```bash
# 获取所有代币地址
TOKENS=$(cast call $FAUCET "getTokenAddresses()(address,address,address,address,address,address)" --rpc-url bnb_testnet)

# 解析地址
WBNB=$(echo $TOKENS | awk '{print $1}')
BTCB=$(echo $TOKENS | awk '{print $2}')
# ... 其他代币

# 检查余额
cast call $WBNB "balanceOf(address)(uint256)" $YOUR_ADDRESS --rpc-url bnb_testnet
cast call $BTCB "balanceOf(address)(uint256)" $YOUR_ADDRESS --rpc-url bnb_testnet
```

## ⏱️ 冷却机制

### 默认冷却时间
- **24 小时**（1 天）
- 每个地址每天只能领取一次
- 避免滥用和资源浪费

### 冷却时间规则
- 调用 `claimAll()` 或 `claimSingle()` 后开始计时
- 两种方式共享冷却时间（不能分别绕过）
- 可以通过 `getTimeUntilNextClaim()` 查询剩余时间

### 如果需要更多代币

如果冷却期内需要更多代币：
1. 使用另一个钱包地址
2. 联系部署者（可以调整 faucet 数量）
3. 等待冷却期结束

## 👨‍💼 管理员功能

### 调整领取数量

管理员可以调整每个代币的领取数量：

```bash
# 设置 WBNB 领取数量为 20 个
cast send $FAUCET "setWBNBAmount(uint256)" 20000000000000000000 \
  --rpc-url bnb_testnet \
  --private-key $ADMIN_KEY

# 批量设置所有代币数量
cast send $FAUCET "setAllFaucetAmounts(uint256,uint256,uint256,uint256,uint256,uint256)" \
  20000000000000000000 \    # WBNB: 20
  100000000000000000 \       # BTCB: 0.1
  2000000000000000000 \      # ETH: 2
  2000000000000000000000 \   # XRP: 2000
  20000000000000000000 \     # SOL: 20
  20000000000000000000000 \  # USDT: 20,000
  --rpc-url bnb_testnet \
  --private-key $ADMIN_KEY
```

### 调整冷却时间

```bash
# 设置冷却时间为 12 小时
cast send $FAUCET "setFaucetCooldown(uint256)" 43200 \
  --rpc-url bnb_testnet \
  --private-key $ADMIN_KEY

# 设置为 1 小时（测试用）
cast send $FAUCET "setFaucetCooldown(uint256)" 3600 \
  --rpc-url bnb_testnet \
  --private-key $ADMIN_KEY
```

## 🎨 前端集成示例

### Web3.js 示例

```javascript
// 连接到 faucet 合约
const faucet = new web3.eth.Contract(FAUCET_ABI, FAUCET_ADDRESS);

// 一键领取所有代币
async function claimAllTokens(userAddress) {
  try {
    // 检查是否可以领取
    const canClaim = await faucet.methods.canClaim(userAddress).call();

    if (!canClaim) {
      const timeLeft = await faucet.methods.getTimeUntilNextClaim(userAddress).call();
      console.log(`Please wait ${timeLeft} seconds before claiming again`);
      return;
    }

    // 执行领取
    const tx = await faucet.methods.claimAll().send({ from: userAddress });
    console.log('Successfully claimed all tokens!');
    console.log('Transaction:', tx.transactionHash);

    return tx;
  } catch (error) {
    console.error('Failed to claim tokens:', error);
  }
}

// 获取所有代币地址
async function getTokenAddresses() {
  const addresses = await faucet.methods.getTokenAddresses().call();
  return {
    wbnb: addresses[0],
    btcb: addresses[1],
    eth: addresses[2],
    xrp: addresses[3],
    sol: addresses[4],
    usdt: addresses[5]
  };
}
```

### Ethers.js 示例

```javascript
// 连接到 faucet 合约
const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer);

// 一键领取
async function claimTokens() {
  try {
    const tx = await faucet.claimAll();
    console.log('Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tokens claimed successfully!');

    return receipt;
  } catch (error) {
    if (error.message.includes('cooldown')) {
      console.error('Cooldown period not elapsed. Please try again later.');
    } else {
      console.error('Error claiming tokens:', error);
    }
  }
}

// 查询冷却状态
async function getCooldownStatus(address) {
  const canClaim = await faucet.canClaim(address);

  if (canClaim) {
    return { canClaim: true, message: 'Ready to claim!' };
  } else {
    const timeLeft = await faucet.getTimeUntilNextClaim(address);
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);

    return {
      canClaim: false,
      message: `Please wait ${hours}h ${minutes}m`
    };
  }
}
```

## 🔍 合约接口

### 用户函数

```solidity
// 一键领取所有代币
function claimAll() external

// 领取单个代币
function claimSingle(string calldata tokenSymbol) external

// 查询是否可以领取
function canClaim(address user) external view returns (bool)

// 查询冷却剩余时间（秒）
function getTimeUntilNextClaim(address user) external view returns (uint256)

// 获取所有代币地址
function getTokenAddresses() external view returns (
    address wbnb, address btcb, address eth,
    address xrp, address sol, address usdt
)

// 获取所有领取数量
function getFaucetAmounts() external view returns (
    uint256 wbnb, uint256 btcb, uint256 eth,
    uint256 xrp, uint256 sol, uint256 usdt
)
```

### 管理员函数

```solidity
// 设置单个代币数量
function setWBNBAmount(uint256 amount) external onlyOwner
function setBTCBAmount(uint256 amount) external onlyOwner
// ... 其他代币

// 批量设置所有代币数量
function setAllFaucetAmounts(
    uint256 _wbnb, uint256 _btcb, uint256 _eth,
    uint256 _xrp, uint256 _sol, uint256 _usdt
) external onlyOwner

// 设置冷却时间
function setFaucetCooldown(uint256 cooldown) external onlyOwner
```

## 💡 最佳实践

### 1. 部署后立即测试
```bash
# 部署后第一件事：测试水龙头
cast send $FAUCET "claimAll()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```

### 2. 为测试用户预留代币
如果有多个测试账户，让每个账户都领取一次：

```bash
# 账户 1
cast send $FAUCET "claimAll()" --private-key $KEY1 --rpc-url bnb_testnet

# 账户 2
cast send $FAUCET "claimAll()" --private-key $KEY2 --rpc-url bnb_testnet

# 账户 3
cast send $FAUCET "claimAll()" --private-key $KEY3 --rpc-url bnb_testnet
```

### 3. 监控 gas 消耗
```bash
# 估算 gas
cast estimate $FAUCET "claimAll()" \
  --from $YOUR_ADDRESS \
  --rpc-url bnb_testnet

# 通常约 180,000 gas（相比分别领取节省了 ~5x gas）
```

## 🚀 快速开始

完整的测试流程：

```bash
# 1. 设置环境变量
export FAUCET=0x... # 从部署输出获取

# 2. 一键领取所有代币
cast send $FAUCET "claimAll()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY

# 3. 验证余额（使用 cast 或 BscScan）
# 访问 https://testnet.bscscan.com/address/$YOUR_ADDRESS

# 4. 开始测试 BlockETF
# - 批准 USDT 给 ETFRouterV1
# - 铸造 ETF 份额
# - 测试 rebalance
```

## 📊 对比总结

| 特性 | 分别领取 | 统一水龙头 |
|------|---------|-----------|
| 交易次数 | 6 次 | 1 次 |
| Gas 消耗 | ~6x | ~1x |
| 用户体验 | ❌ 繁琐 | ✅ 简单 |
| 错误处理 | 复杂 | 简单 |
| 前端集成 | 困难 | 容易 |
| 管理灵活性 | 分散 | 集中 |

**结论**：统一水龙头提供了更好的用户体验和开发体验！🎉
