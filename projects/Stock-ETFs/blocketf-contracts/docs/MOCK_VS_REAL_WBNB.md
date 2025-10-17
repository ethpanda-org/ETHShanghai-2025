# Mock WBNB vs Real WBNB - 决策说明

## 最终决定：使用 Mock WBNB ✅

在 BlockETF 测试网部署中，我们决定对所有 6 个代币都使用 Mock 版本，包括 WBNB。

## 决策理由

### 1. **我们的使用场景**

在 BlockETF 系统中，WBNB 被当作：
- ✅ 一个普通的 ERC20 代币
- ✅ ETF 的组成资产之一
- ✅ PancakeSwap 交易对的一部分

我们**不需要** WBNB 的特殊功能：
- ❌ 不需要 `deposit()` / `withdraw()` (wrap/unwrap)
- ❌ 不需要接收原生 BNB
- ❌ 不需要 `receive()` / `fallback()` 函数

### 2. **测试便利性**

#### Mock WBNB 的优势
```bash
# 获取 Mock WBNB - 简单快速
cast send $WBNB "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```

#### 真实 WBNB 需要额外步骤
```bash
# 1. 先从水龙头获取 BNB
# 2. 然后手动 wrap
cast send 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd "deposit()" \
  --value 1ether \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

### 3. **流动性提供**

#### Mock WBNB
- ✅ 可以 mint 任意数量用于流动性池
- ✅ 不受钱包 BNB 余额限制
- ✅ 所有代币获取方式统一

#### 真实 WBNB
- ❌ 需要先有大量 BNB
- ❌ wrap 需要额外 gas
- ❌ 测试网 BNB 水龙头有限制

### 4. **一致性**

所有 6 个 Mock 代币：
```
✅ WBNB  (Mock) - 与其他代币一致
✅ BTCB  (Mock)
✅ ETH   (Mock)
✅ XRP   (Mock)
✅ SOL   (Mock)
✅ USDT  (Mock)
```

统一的接口：
- 所有代币都有 `faucet()` 函数
- 所有代币都有 `mint()` / `burn()` (owner only)
- 统一的测试流程

## 与主网的对应关系

### 测试网配置
```solidity
// 测试网使用 Mock 代币
MockERC20 wbnbToken;  // Mock WBNB
MockERC20 btcToken;   // Mock BTCB
MockERC20 ethToken;   // Mock ETH
MockERC20 xrpToken;   // Mock XRP
MockERC20 solToken;   // Mock SOL
MockERC20 usdtToken;  // Mock USDT
```

### 主网配置（未来）
```solidity
// 主网使用真实代币地址
address constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
address constant BTCB = 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c;
address constant ETH  = 0x2170Ed0880ac9A755fd29B2688956BD959F933F8;
address constant XRP  = 0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE;
address constant SOL  = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
address constant USDT = 0x55d398326f99059fF775485246999027B3197955;
```

## MockERC20 vs 真实 WBNB 接口对比

### MockERC20 提供的功能
```solidity
// 标准 ERC20
transfer(address to, uint256 amount)
approve(address spender, uint256 amount)
transferFrom(address from, address to, uint256 amount)

// Mock 特有功能
faucet()  // 任何人都可以获取测试代币
mint(address to, uint256 amount)  // owner only
burn(uint256 amount)
setFaucetAmount(uint256 amount)  // owner only
setFaucetCooldown(uint256 cooldown)  // owner only
```

### 真实 WBNB 的功能
```solidity
// 标准 ERC20
transfer(address to, uint256 amount)
approve(address spender, uint256 amount)
transferFrom(address from, address to, uint256 amount)

// WBNB 特有功能（我们不需要）
deposit() payable  // wrap BNB
withdraw(uint256 amount)  // unwrap to BNB
receive() external payable
fallback() external payable
```

## 部署流程对比

### 使用 Mock WBNB（当前方案）

```bash
# 1. 部署系统（包含部署 Mock WBNB）
forge script script/DeployBlockETFWithMocks.s.sol \
  --rpc-url bnb_testnet --broadcast --verify

# 2. 获取所有测试代币（统一流程）
cast send $WBNB "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $BTCB "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
cast send $ETH "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
# ... 其他代币

# 3. 设置流动性
forge script script/SetupLiquidity.s.sol \
  --rpc-url bnb_testnet --broadcast
```

### 使用真实 WBNB（备选方案）

```bash
# 1. 部署系统（不部署 WBNB）
forge script script/DeployBlockETFWithMocks.s.sol \
  --rpc-url bnb_testnet --broadcast --verify

# 2. 获取 BNB 并 wrap（WBNB 获取方式不同）
cast send 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd "deposit()" \
  --value 100ether --rpc-url bnb_testnet --private-key $PRIVATE_KEY

# 3. 获取其他测试代币
cast send $BTCB "faucet()" --rpc-url bnb_testnet --private-key $PRIVATE_KEY
# ... 其他代币

# 4. 设置流动性
forge script script/SetupLiquidity.s.sol \
  --rpc-url bnb_testnet --broadcast
```

## 潜在问题及解决方案

### Q: Mock WBNB 能否与 PancakeSwap 正常交互？

**A: 可以。** PancakeSwap 只需要：
- ERC20 标准接口 ✅
- 足够的流动性 ✅
- 正确的 approve/transfer 实现 ✅

Mock WBNB 完全满足这些要求。

### Q: 测试结果能否反映主网真实情况？

**A: 可以。** 因为：
- 我们只使用 ERC20 标准功能
- 不依赖 WBNB 的 wrap/unwrap 特性
- 合约逻辑完全一致

唯一区别是代币地址，这在主网部署时会替换。

### Q: 如果确实需要测试 WBNB 特性怎么办？

**A: 特殊场景可以额外测试。** 例如：
- 测试用户用原生 BNB 铸造 ETF（需要 Router 支持 `mintWithBNB`）
- 这是未来的功能增强，当前不影响核心功能

## 结论

**使用 Mock WBNB 是更优的选择**，因为：

1. ✅ 符合我们的使用场景（纯 ERC20）
2. ✅ 简化测试流程
3. ✅ 统一所有代币的获取方式
4. ✅ 便于流动性提供
5. ✅ 不影响主网部署的准备工作

测试网部署的目标是验证 **BlockETF 系统的业务逻辑**，而非测试 WBNB 的 wrap/unwrap 功能。使用 Mock WBNB 完全满足这个目标。
