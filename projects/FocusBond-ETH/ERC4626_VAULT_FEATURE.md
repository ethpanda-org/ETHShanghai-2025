# ERC4626 Vault Feature - 质押ETH获得奖励加成

## 📋 概述

为FocusBond添加ERC4626标准金库功能，用户可以质押ETH到金库获得份额代币(fvETH)，并在完成专注会话时获得奖励加成。

## 🏗️ 架构设计

### 1. 合约架构

```
┌─────────────────┐
│   MockWETH      │  ← Wrapped ETH (用于ERC20兼容)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  FocusVault     │  ← ERC4626金库 (质押管理)
│  (ERC4626)      │  - 质押ETH获得fvETH份额
└────────┬────────┘  - 计算质押加成
         │            - 分配奖励
         ↓
┌─────────────────┐
│   FocusBond     │  ← 主合约
│                 │  - 调用金库获取加成
└─────────────────┘  - 在完成时应用奖励加成
```

### 2. 核心合约

#### FocusVault.sol (ERC4626金库)
- **功能**:
  - 用户质押ETH获得fvETH份额代币
  - 计算质押加成倍数 (1x - 5x)
  - 接收并分配奖励给份额持有者
  - 支持ETH的存取

- **关键函数**:
  - `depositETH()`: 质押ETH获得份额
  - `withdrawETH(shares)`: 赎回份额提取ETH
  - `getStakingBoost(user)`: 获取用户的质押加成倍数
  - `getUserStake(user)`: 获取用户的质押金额
  - `distributeRewards(amount)`: 分配奖励(仅FocusBond可调用)

- **质押加成计算**:
  ```solidity
  // 基础: 1x (10000 basis points)
  // 每0.1 ETH增加0.5x (5000 bps)
  // 最高: 5x (50000 bps)
  
  质押金额 | 加成倍数
  0.1 ETH  | 1.5x
  0.2 ETH  | 2.0x
  0.4 ETH  | 3.0x
  0.6 ETH  | 4.0x
  0.8+ ETH | 5.0x (最高)
  ```

#### MockWETH.sol
- **功能**: 简化的Wrapped ETH实现
- **用途**: 使ETH与ERC20兼容，支持ERC4626标准

#### FocusBond.sol (增强)
- **新增功能**:
  - 集成FocusVault
  - 在完成会话时应用质押加成
  - 提供质押信息查询接口

- **新增函数**:
  - `setFocusVault(address)`: 设置金库地址(仅管理员)
  - `distributeVaultRewards(amount)`: 向金库分配奖励(仅管理员)
  - `getStakingBoost(user)`: 获取用户质押加成
  - `getUserStake(user)`: 获取用户质押金额

- **奖励计算增强**:
  ```solidity
  // 原始奖励
  uint256 creditBonus = (elapsedMinutes * baseFeeFocus) / 100;
  
  // 应用质押加成
  uint256 stakingBoost = getStakingBoost(msg.sender);
  if (stakingBoost > 10000) {
      creditBonus = (creditBonus * stakingBoost) / 10000;
  }
  ```

## 📦 前端集成

### 1. 新增Hook: `useVaultStaking.ts`

```typescript
const {
  depositETH,           // 质押ETH
  withdrawETH,          // 提取ETH
  userStake,            // 用户质押金额
  stakingBoost,         // 质押加成倍数
  vaultShares,          // 用户份额
  loading,              // 交易进行中
  success,              // 交易成功
  error,                // 错误信息
  transactionHash,      // 交易哈希
  refetch,              // 刷新数据
} = useVaultStaking()
```

### 2. UI组件建议

#### 质押面板
```tsx
<div className="vault-staking-panel">
  <h3>💎 质押ETH获得奖励加成</h3>
  
  {/* 当前质押信息 */}
  <div className="current-stake">
    <div>质押金额: {formatEther(userStake || 0n)} ETH</div>
    <div>份额数量: {formatEther(vaultShares || 0n)} fvETH</div>
    <div>奖励加成: {((stakingBoost || 10000n) / 100n)}%</div>
  </div>
  
  {/* 质押操作 */}
  <div className="stake-actions">
    <input 
      type="number" 
      placeholder="ETH数量" 
      step="0.01"
      min="0.0001"
      max="10"
    />
    <button onClick={() => depositETH(amount)}>
      质押ETH
    </button>
  </div>
  
  {/* 提取操作 */}
  <div className="withdraw-actions">
    <button onClick={() => withdrawETH(formatEther(vaultShares))}>
      提取全部
    </button>
  </div>
</div>
```

#### 加成预览
```tsx
<div className="boost-preview">
  <h4>🚀 质押加成预览</h4>
  <div className="boost-table">
    <div>0.1 ETH → 1.5x 奖励</div>
    <div>0.2 ETH → 2.0x 奖励</div>
    <div>0.4 ETH → 3.0x 奖励</div>
    <div>0.6 ETH → 4.0x 奖励</div>
    <div>0.8+ ETH → 5.0x 奖励 (最高)</div>
  </div>
</div>
```

## 🚀 部署步骤

### 1. 部署合约

```bash
# 使用新的部署脚本
cd /Users/mingji/postgraduate/FocusBond-ETH

# 停止Anvil
pkill -f anvil

# 启动Anvil
anvil --host 0.0.0.0 --port 8545 &

# 等待Anvil启动
sleep 3

# 部署合约
forge script script/DeployWithVault.s.sol:DeployWithVaultScript \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 2. 更新合约地址

部署后，更新 `apps/web/lib/chain.ts` 中的合约地址:

```typescript
export const CONTRACTS = {
  [anvil.id]: {
    focusBond: '<FocusBond地址>',
    usdc: '<MockUSDC地址>',
    focus: '<FocusCredit地址>',
    weth: '<MockWETH地址>',        // 新增
    focusVault: '<FocusVault地址>',  // 新增
  },
}
```

### 3. 发放测试代币

```bash
# 发放ETH和FOCUS
TEST_ACCOUNT="0x891402c216Dbda3eD7BEB0f95Dd89b010523642A"
FOCUS_ADDRESS="<FocusCredit地址>"

# 发放1 ETH
cast send $TEST_ACCOUNT \
  --value 1ether \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 发放2000 FOCUS
cast send $FOCUS_ADDRESS \
  "grantCredits(address,uint256,string)" \
  $TEST_ACCOUNT \
  2000000000000000000000 \
  "Test tokens" \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 4. 启动前端

```bash
cd /Users/mingji/postgraduate/FocusBond-ETH
./scripts/start-frontend.sh
```

## 📊 使用流程

### 用户操作流程

1. **质押ETH**
   ```
   用户 → 质押0.2 ETH → 获得fvETH份额 → 获得2x奖励加成
   ```

2. **开始专注会话**
   ```
   用户 → 开始25分钟会话 → 质押0.001 ETH
   ```

3. **完成会话获得加成奖励**
   ```
   完成会话 → 基础奖励: 2.5 FOCUS
              ↓
         应用2x加成
              ↓
         最终奖励: 5.0 FOCUS
   ```

4. **提取质押**
   ```
   用户 → 提取fvETH份额 → 赎回ETH + 累积奖励
   ```

## 💡 核心优势

### 1. 标准化 (ERC4626)
- ✅ 符合ERC4626金库标准
- ✅ 可与其他DeFi协议互操作
- ✅ 份额代币(fvETH)可转让和交易

### 2. 激励机制
- ✅ 质押越多，奖励越高 (最高5x)
- ✅ 鼓励长期持有和参与
- ✅ 创造代币流动性

### 3. 收益累积
- ✅ 质押份额自动获得平台收益
- ✅ 份额价值随奖励分配而增长
- ✅ 可随时存取，灵活度高

### 4. 去中心化
- ✅ 智能合约自动执行
- ✅ 透明的加成计算
- ✅ 不可篡改的份额管理

## 🔧 技术亮点

### 1. ERC4626实现
```solidity
// 标准化的存取接口
function deposit(assets, receiver) returns (shares)
function withdraw(assets, receiver, owner) returns (shares)
function redeem(shares, receiver, owner) returns (assets)

// 份额和资产转换
function convertToShares(assets) view returns (shares)
function convertToAssets(shares) view returns (assets)
```

### 2. 动态加成计算
```solidity
function getStakingBoost(address user) external view returns (uint256) {
    uint256 userShares = balanceOf(user);
    if (userShares == 0) return 10000; // 1x
    
    uint256 userAssets = convertToAssets(userShares);
    uint256 boostBps = 10000 + (userAssets * 5000 / 0.1 ether);
    
    // 最高5x
    return boostBps > 50000 ? 50000 : boostBps;
}
```

### 3. 奖励分配
```solidity
function distributeRewards(uint256 amount) external payable {
    require(msg.sender == focusBond, "Only FocusBond");
    
    // 将ETH包装为WETH
    weth.deposit{value: msg.value}();
    
    // 奖励增加份额价值
    totalRewards += amount;
}
```

## 📝 安全考虑

1. **访问控制**
   - ✅ 只有FocusBond合约可以分配奖励
   - ✅ 只有管理员可以设置配置
   - ✅ 使用OpenZeppelin的AccessControl

2. **重入保护**
   - ✅ 所有状态变更遵循CEI模式
   - ✅ 使用ReentrancyGuard
   - ✅ ETH转账失败会回滚

3. **整数溢出保护**
   - ✅ Solidity 0.8+ 自动检查
   - ✅ 使用SafeMath理念
   - ✅ 最大存款限制(10 ETH)

4. **最小存款要求**
   - ✅ 防止灰尘攻击(0.0001 ETH最低)
   - ✅ 确保有意义的份额数量

## 🎯 下一步

1. ✅ 完成合约开发和测试
2. ✅ 集成到FocusBond主合约
3. ✅ 创建前端Hook
4. ⏳ 更新前端UI以显示质押功能
5. ⏳ 部署和测试
6. ⏳ 添加质押统计和排行榜

## 📚 参考资料

- [ERC4626标准](https://eips.ethereum.org/EIPS/eip-4626)
- [OpenZeppelin ERC4626](https://docs.openzeppelin.com/contracts/4.x/erc4626)
- [WETH规范](https://weth.io/)

