# Complete Rebalance System Test Plan (100% Coverage)

## 目标
对整个Rebalance系统进行全面测试，包括**Core的flashRebalance**和**Rebalancer的callback**，实现端到端100%覆盖率。

---

## 系统架构回顾

### Rebalance流程
```
┌─────────────────────────────────────────────────────────────┐
│                    Flash Rebalance Flow                      │
└─────────────────────────────────────────────────────────────┘

Core.executeRebalance() 或 Core.flashRebalance()
    │
    ├──> Phase 1: _prepareRebalance()
    │    ├─ 计算rebalanceAmounts (权重缺口)
    │    ├─ 记录balancesBefore
    │    ├─ 获取totalValueBefore
    │    └─ 转移资产给Rebalancer (卖单)
    │
    ├──> Phase 2: Rebalancer.rebalanceCallback()
    │    ├─ Phase 2.1: 卖出over-weighted资产 → 收集USDT
    │    ├─ Phase 2.2: 计算under-weighted资产买入价值
    │    ├─ Phase 2.3: 按权重缺口比例分配USDT并买入
    │    └─ Phase 2.4: 归还所有资产给Core
    │
    └──> Phase 3: _verifyAndFinalizeRebalance()
         ├─ 记录balancesAfter和totalValueAfter
         ├─ _verifyRebalanceOperations() (分类验证)
         │  ├─ 卖单验证: actualSold ≤ 101%
         │  ├─ 买单验证: 95% ≤ actualBought ≤ 110%
         │  └─ 零单验证: 余额保持稳定(±0.1%)
         ├─ 全局验证:
         │  ├─ 总价值损失 ≤ 5%
         │  └─ 权重偏差改善（tolerance 2%）
         ├─ 安全检查: _verifyNoOrphanedTokens()
         └─ 状态更新: reserve, lastRebalanceTime
```

### 核心重构点

#### Core合约重构
1. **Category-based Verification** (分类验证)
   - 卖单验证: `actualSold ≤ 101%` (允许1%滑点)
   - 买单验证: `95% ≤ actualBought ≤ 110%` (允许5%不足，10%超额)
   - 零单验证: 余额稳定 `±0.1%`

2. **可配置阈值**
   ```solidity
   maxSlippageBps = 100;                      // 1% 卖出滑点
   maxBuyExcessBps = 1000;                    // 10% 买入超额
   maxTotalValueLossBps = 500;                // 5% 总价值损失
   weightImprovementToleranceBps = 200;       // 2% 权重改善容忍
   unchangedAssetToleranceBps = 10;           // 0.1% 零单容忍
   ```

3. **权重偏差改善验证**
   - `deviationAfter ≤ deviationBefore * 1.02`
   - 防止rebalance后权重反而恶化

4. **孤立Token检查**
   - `_verifyNoOrphanedTokens()`: Rebalancer必须归还所有资产

#### Rebalancer合约重构
1. **权重缺口比例分配算法**
   - Phase 1: 卖出 → 收集USDT
   - Phase 2: 计算buyValue (权重缺口 * 价格)
   - Phase 3: 按比例分配USDT，maxDeficit吸收dust
   - Phase 4: 归还所有资产

2. **滑点保护**
   - V3: Oracle价格 + 3%滑点保护
   - V2: DEX quote + 3%滑点保护

3. **ExactInput模式**
   - 确定性输入，不确定性输出
   - 避免估算误差

---

## Part A: Core合约测试 (flashRebalance + Verification)

### A-I. flashRebalance 入口测试

#### A-I-1. 前置条件检查
```solidity
// TC-CORE-001: 正常调用
- Caller: owner 或 rebalancer
- 前置: initialized, needsRebalance, cooldown满足
- 验证: 成功执行

// TC-CORE-002: 未初始化
- initialized = false
- 验证: revert

// TC-CORE-003: Oracle未设置
- priceOracle = address(0)
- 验证: revert OracleNotSet

// TC-CORE-004: Rebalancer未设置
- rebalancer = address(0)
- 验证: revert RebalanceNotImplemented

// TC-CORE-005: Cooldown未满
- lastRebalanceTime + minRebalanceCooldown > block.timestamp
- 验证: revert CooldownNotMet

// TC-CORE-006: 不需要rebalance
- needsRebalance = false (权重偏差 < threshold)
- 验证: revert RebalanceNotNeeded

// TC-CORE-007: Reentrancy攻击
- 在callback中再次调用flashRebalance
- 验证: ReentrancyGuard阻止

// TC-CORE-008: 暂停状态
- 前置: pause()
- 验证: executeRebalance revert，但flashRebalance可调用（仅内部）
```

#### A-I-2. 访问控制
```solidity
// TC-CORE-009: onlyRebalancer修饰符
- flashRebalance: 仅rebalancer可调用
- executeRebalance: 仅owner/rebalancer可调用
- 验证: 非授权地址revert

// TC-CORE-010: executeRebalance触发flashRebalance
- 调用executeRebalance
- 验证:
  ✓ 内部调用flashRebalance(rebalancer, data)
  ✓ data包含msg.sender和totalValue
```

---

### A-II. _prepareRebalance 测试

#### A-II-1. rebalanceAmounts计算
```solidity
// TC-CORE-011: 单个over-weighted资产（卖单）
- BTC: currentWeight=40%, targetWeight=30%
- totalValue = 100000
- 验证:
  ✓ excess = 10% (1000 bps)
  ✓ sellAmount = (100000 * 1000 / 10000) * 10^decimals / price
  ✓ rebalanceAmounts[BTC] = +sellAmount (正数)
  ✓ BTC转给receiver

// TC-CORE-012: 单个under-weighted资产（买单）
- ETH: currentWeight=10%, targetWeight=20%
- 验证:
  ✓ deficit = 10%
  ✓ buyAmount计算正确
  ✓ rebalanceAmounts[ETH] = -buyAmount (负数)
  ✓ 无转账（买单Core不转出）

// TC-CORE-013: 混合场景（2卖2买）
- BTC: 卖, ETH: 卖, WBNB: 买, USDT: 买
- 验证:
  ✓ 所有rebalanceAmounts正确
  ✓ 卖单资产已转出
  ✓ 买单资产未转出

// TC-CORE-014: 权重相等（零单）
- BTC: currentWeight = targetWeight
- 验证:
  ✓ rebalanceAmounts[BTC] = 0
  ✓ 无转账
```

#### A-II-2. maxSell限制
```solidity
// TC-CORE-015: sellAmount超过maxSell (50%余额)
- BTC: 计算sellAmount = 100, 但balance = 150
- maxSell = 150/2 = 75
- 验证:
  ✓ 实际sellAmount = 75 (被限制)
  ✓ rebalanceAmounts[BTC] = 75

// TC-CORE-016: sellAmount小于maxSell
- 计算sellAmount = 50, balance = 150
- 验证: sellAmount = 50 (不受限制)

// TC-CORE-017: 极端情况：sellAmount = maxSell
- 精确等于50%余额
- 验证: 使用maxSell
```

#### A-II-3. balancesBefore记录
```solidity
// TC-CORE-018: 记录所有资产余额
- 4个资产: BTC, ETH, WBNB, USDT
- 验证:
  ✓ balancesBefore数组长度 = 4
  ✓ 每个余额 = IERC20.balanceOf(Core)

// TC-CORE-019: 某些资产余额为0
- BTC余额 = 0
- 验证: balancesBefore[BTC] = 0
```

#### A-II-4. totalValueBefore计算
```solidity
// TC-CORE-020: getTotalValue正确调用
- 验证:
  ✓ totalValueBefore = sum(balance * price / decimals)
  ✓ 所有资产都计入

// TC-CORE-021: 价格为0错误
- Mock: priceOracle.getPrice(BTC) = 0
- 验证: revert InvalidPrice
```

---

### A-III. Callback调用测试

```solidity
// TC-CORE-022: 正常callback调用
- receiver = rebalancer合约
- 验证:
  ✓ IRebalanceCallback(receiver).rebalanceCallback被调用
  ✓ 参数: (assets, rebalanceAmounts, data)

// TC-CORE-023: Callback返回成功
- Mock: callback正常执行
- 验证: flashRebalance继续Phase 3

// TC-CORE-024: Callback revert
- Mock: callback内部revert
- 验证:
  ✓ flashRebalance整体revert
  ✓ 状态回滚

// TC-CORE-025: Callback消耗大量gas
- Mock: callback near gas limit
- 验证: 评估gas buffer是否足够

// TC-CORE-026: Callback尝试reentrancy
- Mock: callback内调用flashRebalance
- 验证: ReentrancyGuard阻止

// TC-CORE-027: 恶意receiver不归还资产
- Mock: callback不transferBack
- 验证: Phase 3检测并revert
```

---

### A-IV. _verifyAndFinalizeRebalance 测试

#### A-IV-1. balancesAfter和totalValueAfter计算
```solidity
// TC-CORE-028: 记录rebalance后余额
- 验证:
  ✓ balancesAfter数组正确
  ✓ totalValueAfter = sum(balancesAfter * price / decimals)

// TC-CORE-029: 价格变化影响totalValue
- Mock: price在Phase 1和Phase 3之间变化
- 验证:
  ✓ totalValueAfter使用最新价格
  ✓ 可能触发ExcessiveLoss（如果价格暴跌）
```

#### A-IV-2. _verifyRebalanceOperations (分类验证)

##### 卖单验证
```solidity
// TC-CORE-030: 卖单正常（无滑点）
- rebalanceAmounts[BTC] = +100
- balancesBefore = 1000, balancesAfter = 900
- actualSold = 100
- 验证: 通过（100 ≤ 101）

// TC-CORE-031: 卖单有1%滑点
- rebalanceAmounts = +100
- actualSold = 101
- 验证: 通过（101 ≤ 101）

// TC-CORE-032: 卖单滑点超过1%
- actualSold = 102
- 验证: revert ExcessiveSlippage

// TC-CORE-033: 卖单余额增加（异常）
- balancesAfter > balancesBefore (应该减少)
- 验证: revert UnexpectedBalanceChange

// TC-CORE-034: 卖单数量为0
- rebalanceAmounts = +100, actualSold = 0
- 验证: revert ExcessiveSlippage（验证actualSold范围）
```

##### 买单验证
```solidity
// TC-CORE-035: 买单正常（100%目标）
- rebalanceAmounts[ETH] = -100
- balancesBefore = 500, balancesAfter = 600
- actualBought = 100
- 验证: 通过（95 ≤ 100 ≤ 110）

// TC-CORE-036: 买单不足5%
- targetAmount = 100, actualBought = 94
- 验证: revert InsufficientBuyAmount

// TC-CORE-037: 买单刚好95%边界
- actualBought = 95
- 验证: 通过

// TC-CORE-038: 买单超额10%
- actualBought = 110
- 验证: 通过（边界）

// TC-CORE-039: 买单超额11%
- actualBought = 111
- 验证: revert ExcessiveBuyAmount

// TC-CORE-040: 买单余额减少（异常）
- balancesAfter < balancesBefore (应该增加)
- 验证: revert UnexpectedBalanceChange

// TC-CORE-041: 买单数量为0
- targetAmount = 100, actualBought = 0
- 验证: revert InsufficientBuyAmount
```

##### 零单验证
```solidity
// TC-CORE-042: 零单余额不变
- rebalanceAmounts[WBNB] = 0
- balancesBefore = 1000, balancesAfter = 1000
- 验证: 通过

// TC-CORE-043: 零单余额微小变化（0.1%内）
- balancesBefore = 1000, balancesAfter = 1001
- 变化 = 0.1%
- 验证: 通过（在tolerance内）

// TC-CORE-044: 零单余额变化超过0.1%
- balancesAfter = 1002 (变化0.2%)
- 验证: revert UnexpectedBalanceChange

// TC-CORE-045: 零单余额减少0.1%
- balancesAfter = 999 (减少0.1%)
- 验证: 通过（在tolerance内）

// TC-CORE-046: 零单余额大幅变化
- balancesAfter = 1100 (增加10%)
- 验证: revert UnexpectedBalanceChange
```

##### 混合验证
```solidity
// TC-CORE-047: 2卖2买1零
- BTC: 卖（正常）
- ETH: 卖（滑点0.5%）
- WBNB: 买（98%）
- USDT: 买（105%）
- CustomToken: 零（不变）
- 验证: 所有检查通过

// TC-CORE-048: 部分资产验证失败
- BTC: 卖（正常）
- ETH: 卖（滑点2%） ❌
- 验证: 整体revert
```

#### A-IV-3. 全局检查

##### 总价值损失验证
```solidity
// TC-CORE-049: 无价值损失
- totalValueBefore = 100000
- totalValueAfter = 100000
- 验证: 通过

// TC-CORE-050: 价值增加
- totalValueAfter = 101000 (+1%)
- 验证: 通过（增加总是好）

// TC-CORE-051: 价值损失5%（边界）
- totalValueAfter = 95000 (-5%)
- 验证: 通过

// TC-CORE-052: 价值损失5.1%
- totalValueAfter = 94900 (-5.1%)
- 验证: revert ExcessiveLoss

// TC-CORE-053: 价值损失10%
- totalValueAfter = 90000 (-10%)
- 验证: revert ExcessiveLoss

// TC-CORE-054: 价格暴跌导致价值损失
- Mock: BTC价格从50000跌到45000 (-10%)
- 验证:
  ✓ totalValueAfter下降
  ✓ 可能触发ExcessiveLoss
```

##### 权重改善验证
```solidity
// TC-CORE-055: 权重偏差显著改善
- deviationBefore = 1000 (10%)
- deviationAfter = 200 (2%)
- 验证: 通过（改善80%）

// TC-CORE-056: 权重偏差微小改善
- deviationBefore = 1000
- deviationAfter = 980 (改善2%)
- 验证: 通过（在tolerance内）

// TC-CORE-057: 权重偏差不变
- deviationAfter = deviationBefore
- 验证: 通过（在2% tolerance内）

// TC-CORE-058: 权重偏差轻微恶化（2%内）
- deviationBefore = 1000
- deviationAfter = 1020 (恶化2%)
- 验证: 通过（刚好在tolerance边界）

// TC-CORE-059: 权重偏差恶化超过2%
- deviationAfter = 1021 (恶化2.1%)
- 验证: revert InvalidRebalance

// TC-CORE-060: 权重偏差大幅恶化
- deviationBefore = 1000
- deviationAfter = 1500 (恶化50%)
- 验证: revert InvalidRebalance

// TC-CORE-061: 单次rebalance未完全收敛
- deviationBefore = 1000
- deviationAfter = 500 (改善50%但未达标)
- 验证: 通过（单次rebalance可能不够，需多轮）
```

#### A-IV-4. 安全检查

##### 孤立Token检查
```solidity
// TC-CORE-062: Rebalancer归还所有资产
- Callback后Rebalancer余额 = 0
- 验证: 通过

// TC-CORE-063: Rebalancer保留USDT
- Rebalancer.balance(USDT) = 100
- 验证: revert OrphanedTokens

// TC-CORE-064: Rebalancer保留其他资产
- Rebalancer.balance(BTC) = 1
- 验证: revert OrphanedTokens

// TC-CORE-065: Rebalancer保留多种资产
- USDT: 50, BTC: 0.1, ETH: 1
- 验证: revert OrphanedTokens

// TC-CORE-066: 允许的dust余额
- Mock: 如果有tolerance，测试边界
- 验证: 极小余额(如1 wei)可能被容忍
```

#### A-IV-5. 状态更新
```solidity
// TC-CORE-067: reserve更新
- balancesAfter = [1000, 2000, 3000, 4000]
- 验证:
  ✓ assetInfo[assets[i]].reserve = balancesAfter[i]
  ✓ 所有4个资产更新

// TC-CORE-068: lastRebalanceTime更新
- 验证:
  ✓ lastRebalanceTime = block.timestamp
  ✓ 下次rebalance需等待cooldown

// TC-CORE-069: Rebalanced事件
- 验证:
  ✓ emit Rebalanced(currentWeights, newWeights)
  ✓ 权重参数正确
```

---

### A-V. 可配置阈值测试

#### A-V-1. setRebalanceVerificationThresholds
```solidity
// TC-CORE-070: 正常设置所有阈值
- 参数: (100, 1000, 500, 200, 10)
- 验证:
  ✓ maxSlippageBps = 100
  ✓ maxBuyExcessBps = 1000
  ✓ maxTotalValueLossBps = 500
  ✓ weightImprovementToleranceBps = 200
  ✓ unchangedAssetToleranceBps = 10
  ✓ 事件触发

// TC-CORE-071: maxSlippageBps超过上限（10%）
- maxSlippageBps = 1001
- 验证: revert ThresholdTooLarge

// TC-CORE-072: maxBuyExcessBps超过上限（10%）
- maxBuyExcessBps = 1001
- 验证: revert ThresholdTooLarge

// TC-CORE-073: maxTotalValueLossBps超过上限（10%）
- maxTotalValueLossBps = 1001
- 验证: revert ThresholdTooLarge

// TC-CORE-074: weightImprovementToleranceBps超过上限（5%）
- weightImprovementToleranceBps = 501
- 验证: revert ThresholdTooLarge

// TC-CORE-075: unchangedAssetToleranceBps超过上限（1%）
- unchangedAssetToleranceBps = 101
- 验证: revert ThresholdTooLarge

// TC-CORE-076: 所有阈值设为0（极严格）
- 所有参数 = 0
- 验证:
  ✓ 设置成功
  ✓ rebalance几乎不可能通过

// TC-CORE-077: 所有阈值设为最大值（极宽松）
- maxSlippageBps = 1000 (10%)
- maxBuyExcessBps = 1000
- maxTotalValueLossBps = 1000
- weightImprovementToleranceBps = 500
- unchangedAssetToleranceBps = 100
- 验证:
  ✓ 设置成功
  ✓ rebalance几乎都能通过

// TC-CORE-078: 非owner调用
- Caller: alice (非owner)
- 验证: revert OwnableUnauthorizedAccount
```

#### A-V-2. 阈值对验证的影响
```solidity
// TC-CORE-079: 修改maxSlippageBps后立即rebalance
- 默认: 1%
- 修改为: 5%
- 执行rebalance，滑点3%
- 验证: 通过（之前1%会失败）

// TC-CORE-080: 修改maxBuyExcessBps影响
- 修改为: 5%
- actualBought = 106% (之前10%上限，现在5%上限)
- 验证: revert ExcessiveBuyAmount

// TC-CORE-081: 修改weightImprovementToleranceBps
- 修改为: 0% (不容忍恶化)
- deviationAfter = deviationBefore + 1
- 验证: revert InvalidRebalance

// TC-CORE-082: 修改unchangedAssetToleranceBps
- 修改为: 0% (不容忍变化)
- 零单资产余额变化1 wei
- 验证: revert UnexpectedBalanceChange
```

---

### A-VI. 其他Core函数测试

#### A-VI-1. getRebalanceInfo
```solidity
// TC-CORE-083: 需要rebalance
- 权重偏差 > threshold
- 验证:
  ✓ currentWeights数组正确
  ✓ targetWeights数组正确
  ✓ needsRebalance = true

// TC-CORE-084: 不需要rebalance
- 权重偏差 < threshold
- 验证: needsRebalance = false

// TC-CORE-085: 单个资产严重偏离
- BTC: currentWeight=50%, target=20% (偏离30%)
- 验证:
  ✓ needsRebalance = true
  ✓ currentWeights[BTC] = 5000 bps

// TC-CORE-086: 多个资产微小偏离
- 每个资产偏离1% (累计偏离4%)
- threshold = 5%
- 验证: needsRebalance = false
```

#### A-VI-2. _calculateWeightDeviation
```solidity
// TC-CORE-087: 计算权重偏差
- currentWeights = [4000, 3000, 2000, 1000]
- targetWeights =  [3000, 3000, 2000, 2000]
- 验证: deviation = sum(abs(diff)) = 2000 (20%)

// TC-CORE-088: 零偏差
- currentWeights = targetWeights
- 验证: deviation = 0

// TC-CORE-089: 单向偏差
- 所有资产都over-weighted或under-weighted
- 验证: deviation计算正确
```

#### A-VI-3. 其他配置setter
```solidity
// TC-CORE-090: setRebalanceThreshold
- 正常: 500 (5%)
- 超限: 2001 (>20%)
- 验证: 超限revert ThresholdTooHigh

// TC-CORE-091: setMinRebalanceCooldown
- 正常: 1 hours
- 超限: 8 days (>7 days)
- 验证: 超限revert CooldownTooLong

// TC-CORE-092: setRebalancer
- 设置新rebalancer地址
- 验证:
  ✓ rebalancer更新
  ✓ 事件触发
  ✓ 旧rebalancer无法调用
```

---

## Part B: Rebalancer合约测试

### B-I 到 B-XIII
**参考**: `REBALANCER_COMPREHENSIVE_TEST_PLAN.md`

包含150个测试用例:
- B-I: 核心算法测试 (60个)
- B-II: 访问控制测试 (13个)
- B-III: 参数配置测试 (14个)
- B-IV: 状态管理测试 (7个)
- B-V: 事件测试 (7个)
- B-VI: Error处理测试 (6个)
- B-VII: 滑点保护测试 (10个)
- B-VIII: Gas优化测试 (5个)
- B-IX: 边界条件和Fuzz测试 (12个)
- B-X: 集成和Invariant测试 (7个)
- B-XI: 安全性测试 (8个)
- B-XII: Token恢复测试 (3个)
- B-XIII: Upgrade测试 (2个)

---

## Part C: Core-Rebalancer集成测试

### C-I. 端到端Happy Path

```solidity
// TC-INTEG-001: 标准rebalance完整流程
- 初始: BTC 40%, ETH 30%, WBNB 20%, USDT 10%
- 目标: BTC 30%, ETH 30%, WBNB 20%, USDT 20%
- 执行:
  1. executeRebalance()
  2. Core._prepareRebalance() → 卖出10% BTC
  3. Core转BTC给Rebalancer
  4. Rebalancer.callback():
     - 卖出BTC → 收集USDT
     - 计算USDT buyValue
     - 分配USDT给USDT（实际跳过swap）
     - 归还BTC和USDT给Core
  5. Core._verifyAndFinalizeRebalance():
     - 验证BTC卖出正常
     - 验证USDT买入（余额增加）
     - 验证总价值损失 < 5%
     - 验证权重偏差改善
     - 验证无孤立Token
     - 更新reserve和timestamp
- 验证:
  ✓ BTC reserve减少
  ✓ USDT reserve增加
  ✓ 权重更接近目标
  ✓ 事件序列: Rebalanced + AssetSwapped
  ✓ lastRebalanceTime更新

// TC-INTEG-002: 复杂rebalance（2卖2买）
- 卖出: BTC, ETH
- 买入: WBNB, CustomToken
- 流程:
  1. Core准备: 转出BTC和ETH
  2. Rebalancer:
     - 卖BTC → USDT
     - 卖ETH → USDT
     - 计算WBNB和CustomToken buyValue
     - 分配USDT (假设比例50:50)
     - 买WBNB (V2)
     - 买CustomToken (V3)
     - 归还4个资产
  3. Core验证:
     - BTC: 卖单验证
     - ETH: 卖单验证
     - WBNB: 买单验证
     - CustomToken: 买单验证
- 验证:
  ✓ 所有分类验证通过
  ✓ 权重偏差改善
  ✓ 4个AssetSwapped事件
  ✓ 1个Rebalanced事件

// TC-INTEG-003: 包含零单的rebalance
- BTC: 卖
- ETH: 买
- WBNB: 零 (权重已平衡)
- USDT: 买
- 流程:
  1. Core转出BTC
  2. Rebalancer卖BTC，买ETH和USDT
  3. WBNB不参与swap
  4. 归还BTC, ETH, WBNB, USDT
  5. Core验证WBNB余额不变（零单验证）
- 验证:
  ✓ WBNB余额在±0.1%内
  ✓ 其他资产正常验证
```

### C-II. 边界和失败场景集成

#### C-II-1. 滑点场景
```solidity
// TC-INTEG-004: Rebalancer滑点保护触发
- BTC卖出，Rebalancer滑点保护3%
- Mock: DEX滑点4%
- 验证:
  ✓ Rebalancer内部revert InsufficientOutput
  ✓ 整个flashRebalance revert
  ✓ Core状态回滚

// TC-INTEG-005: Core滑点验证触发
- Rebalancer滑点保护通过（2%）
- 但Core验证检测到actualSold = 102%
- 验证: revert ExcessiveSlippage

// TC-INTEG-006: 双重滑点保护都通过
- Rebalancer: 1%滑点 (< 3%保护)
- Core: actualSold = 101% (≤ 101%上限)
- 验证: 成功
```

#### C-II-2. 买入不足场景
```solidity
// TC-INTEG-007: 买入严重不足
- targetAmount = 100
- actualBought = 90 (< 95%下限)
- 验证:
  ✓ Core验证阶段revert InsufficientBuyAmount
  ✓ 状态回滚

// TC-INTEG-008: 买入刚好95%边界
- actualBought = 95
- 验证: Core验证通过

// TC-INTEG-009: USDT不足导致买入减少
- Rebalancer收集USDT = 500
- 总需求 = 1000
- actualBought = 50% target
- 验证:
  ✓ actualBought < 95%
  ✓ Core revert InsufficientBuyAmount
```

#### C-II-3. 价值损失场景
```solidity
// TC-INTEG-010: 总价值损失5.1%
- totalValueBefore = 100000
- totalValueAfter = 94900 (swap损失 + 价格变化)
- 验证: revert ExcessiveLoss

// TC-INTEG-011: 价格暴跌导致价值损失
- Phase 1: BTC价格 = 50000
- Phase 3: BTC价格 = 45000 (-10%)
- 验证:
  ✓ totalValueAfter大幅下降
  ✓ 可能触发ExcessiveLoss

// TC-INTEG-012: 多次小滑点累积
- 每个swap滑点0.5%
- 4个swap → 累计2%损失
- 验证: 通过（< 5%）
```

#### C-II-4. 权重恶化场景
```solidity
// TC-INTEG-013: Rebalancer算法错误导致权重恶化
- Mock: 错误的USDT分配导致买入错误资产
- deviationAfter > deviationBefore * 1.02
- 验证: revert InvalidRebalance

// TC-INTEG-014: 市场价格变化导致权重偏移
- Swap后价格变化，权重重新计算后偏离更大
- 验证:
  ✓ 如果在tolerance内（2%）则通过
  ✓ 否则revert
```

#### C-II-5. 孤立Token场景
```solidity
// TC-INTEG-015: Rebalancer未归还USDT
- Callback结束，Rebalancer保留100 USDT
- 验证: revert OrphanedTokens

// TC-INTEG-016: Rebalancer未归还卖出资产
- Core转出100 BTC，Rebalancer只归还50 BTC
- 验证: revert OrphanedTokens

// TC-INTEG-017: Rebalancer归还错误资产
- 应该归还BTC，但归还ETH
- 验证:
  ✓ Core检测BTC余额异常
  ✓ revert UnexpectedBalanceChange或OrphanedTokens
```

### C-III. 多轮Rebalance集成

```solidity
// TC-INTEG-018: 两次连续rebalance
- 第一次: 改善权重偏差50%
- 第二次: 继续改善，达到threshold内
- 验证:
  ✓ 每次lastRebalanceTime更新
  ✓ cooldown重新计算
  ✓ 权重逐步收敛

// TC-INTEG-019: 10次迭代直到完全平衡
- 初始: 严重失衡 (deviation = 3000 bps)
- 每次改善约30%
- 验证:
  ✓ 最终deviation < threshold
  ✓ needsRebalance = false

// TC-INTEG-020: 权重调整后rebalance
- 执行adjustWeights()
- 立即executeRebalance()
- 验证:
  ✓ 使用新的targetWeights
  ✓ rebalance朝新目标执行
```

### C-IV. 极端市场条件集成

```solidity
// TC-INTEG-021: 闪电崩盘
- Phase 1执行时市场正常
- Phase 2 Rebalancer执行时价格暴跌20%
- Phase 3验证时检测到
- 验证:
  ✓ 可能触发ExcessiveLoss
  ✓ 或者滑点保护阻止swap

// TC-INTEG-022: 流动性枯竭
- DEX流动性不足，swap失败
- 验证:
  ✓ Rebalancer swap revert
  ✓ flashRebalance整体revert
  ✓ 状态回滚

// TC-INTEG-023: Oracle延迟
- Oracle价格1小时前更新
- DEX价格已变化10%
- 验证:
  ✓ Rebalancer基于Oracle计算minOutput
  ✓ DEX实际价格偏差可能导致swap失败
  ✓ 或Core验证检测到异常

// TC-INTEG-024: Gas price飙升
- 高gas环境下执行rebalance
- 验证:
  ✓ 功能正常
  ✓ Gas消耗记录

// TC-INTEG-025: MEV攻击模拟
- 三明治攻击: front-run + rebalance + back-run
- 验证:
  ✓ Rebalancer滑点保护阻止（如果攻击力度>3%）
  ✓ Core验证最终防线
```

### C-V. 配置变更场景

```solidity
// TC-INTEG-026: 修改Core阈值后rebalance
- 修改maxSlippageBps从1%到5%
- 执行有3%滑点的rebalance
- 验证: 之前失败，现在成功

// TC-INTEG-027: 修改Rebalancer maxSlippage
- 从3%改为1%
- 执行有2%滑点的rebalance
- 验证: Rebalancer阶段失败

// TC-INTEG-028: 修改weightImprovementTolerance
- 从2%改为0%
- 执行权重微小恶化的rebalance
- 验证: Core验证失败

// TC-INTEG-029: 更换Rebalancer合约
- 部署新Rebalancer
- setRebalancer(newAddress)
- 执行rebalance
- 验证:
  ✓ 使用新Rebalancer
  ✓ 旧Rebalancer无法调用callback

// TC-INTEG-030: 更换Oracle
- 部署新Oracle
- setPriceOracle(newOracle)
- 执行rebalance
- 验证: 使用新Oracle价格
```

---

## Part D: Invariant和Property测试

### D-I. 系统不变量

```solidity
// TC-INVAR-001: 资产总量守恒
- Invariant: sum(Core余额) + sum(Rebalancer余额) = 初始总量
- 验证: rebalance前后总量不变（忽略swap fee）

// TC-INVAR-002: 权重总和恒为100%
- Invariant: sum(weights) = 10000 bps
- 验证: 任何时刻都成立

// TC-INVAR-003: Reserve与实际余额一致
- Invariant: assetInfo[asset].reserve = IERC20(asset).balanceOf(Core)
- 验证: rebalance后更新正确

// TC-INVAR-004: Rebalancer无遗留资产
- Invariant: 所有rebalance结束后，Rebalancer各资产余额 = 0
- 验证: _verifyNoOrphanedTokens检查

// TC-INVAR-005: 权重偏差单调递减（多轮）
- Invariant: deviation[n+1] ≤ deviation[n] * 1.02
- 验证: 连续rebalance使权重收敛

// TC-INVAR-006: lastRebalanceTime单调递增
- Invariant: 每次rebalance后，lastRebalanceTime ≥ 之前值
- 验证: 时间戳正确更新

// TC-INVAR-007: Cooldown约束
- Invariant: 两次rebalance间隔 ≥ minRebalanceCooldown
- 验证: executeRebalance检查通过

// TC-INVAR-008: 总价值不会大幅下降
- Invariant: totalValue[n+1] ≥ totalValue[n] * 0.95
- 验证: maxTotalValueLossBps保护
```

### D-II. 属性测试 (Property-Based Testing)

```solidity
// TC-PROP-001: 任意权重偏离都能改善
- Property: ∀ valid weights, executeRebalance() → deviation减少
- Fuzz: 随机生成currentWeights和targetWeights
- 验证: rebalance后deviation改善或保持

// TC-PROP-002: 任意卖出数量都有滑点保护
- Property: ∀ sellAmount, actualSold ≤ sellAmount * 1.01
- Fuzz: 随机sellAmount [0, maxSell]
- 验证: Core验证捕获超额卖出

// TC-PROP-003: 任意买入数量都在范围内
- Property: ∀ buyAmount, 0.95*buyAmount ≤ actualBought ≤ 1.10*buyAmount
- Fuzz: 随机buyAmount
- 验证: Core验证捕获异常买入

// TC-PROP-004: 总价值损失有界
- Property: ∀ rebalance, valueLoss ≤ maxTotalValueLossBps
- Fuzz: 随机价格波动和滑点
- 验证: Core验证阻止过度损失

// TC-PROP-005: 权重改善有界
- Property: ∀ rebalance, deviationAfter ≤ deviationBefore * 1.02
- Fuzz: 随机rebalance场景
- 验证: Core验证阻止权重恶化

// TC-PROP-006: Rebalancer分配总和等于收集量
- Property: sum(allocatedUSDT) = totalUSDTCollected
- Fuzz: 随机buyValues比例
- 验证: maxDeficit吸收dust，无USDT遗失
```

---

## Part E: 安全性和攻击测试

### E-I. Reentrancy攻击

```solidity
// TC-SECUR-001: Core flashRebalance reentrancy
- 攻击: callback中再次调用flashRebalance
- 验证: ReentrancyGuard阻止

// TC-SECUR-002: Rebalancer executeRebalance reentrancy
- 攻击: 在swap callback中调用executeRebalance
- 验证: ReentrancyGuard阻止

// TC-SECUR-003: 跨合约reentrancy
- 攻击: Core → Rebalancer → Core
- 验证: 两层ReentrancyGuard都生效

// TC-SECUR-004: 只读reentrancy
- 攻击: callback中调用view函数获取状态
- 验证: 允许（view函数无状态变更）
```

### E-II. Price Oracle操纵

```solidity
// TC-SECUR-005: 闪电贷价格操纵
- 攻击: 同一block内操纵Oracle价格
- 验证:
  ✓ minOutput基于操纵价格
  ✓ DEX实际价格偏差触发滑点保护
  ✓ Core验证最终检测

// TC-SECUR-006: 延迟Oracle攻击
- 攻击: Oracle长时间未更新，攻击者套利
- 验证:
  ✓ 建议: Oracle新鲜度检查
  ✓ 滑点保护部分缓解

// TC-SECUR-007: 双Oracle套利
- 攻击: Core和DEX使用不同Oracle
- 验证: 价格差异被滑点保护限制
```

### E-III. 授权和权限攻击

```solidity
// TC-SECUR-008: 未授权调用flashRebalance
- 攻击: 非rebalancer调用
- 验证: revert onlyRebalancer

// TC-SECUR-009: 恶意Rebalancer
- 攻击: Rebalancer不归还资产
- 验证: _verifyNoOrphanedTokens检测

// TC-SECUR-010: 前端运行攻击
- 攻击: 抢先调用executeRebalance
- 验证: cooldown限制频率

// TC-SECUR-011: 权限提升攻击
- 攻击: 非owner修改阈值
- 验证: onlyOwner修饰符阻止
```

### E-IV. 经济攻击

```solidity
// TC-SECUR-012: MEV三明治攻击
- 攻击: front-run + victim tx + back-run
- 验证:
  ✓ Rebalancer滑点保护（3%）
  ✓ 攻击收益 < 3%时可能成功
  ✓ 建议: 使用私有mempool

// TC-SECUR-013: Just-in-time liquidity攻击
- 攻击: 在rebalance时移除流动性
- 验证: swap失败，rebalance revert

// TC-SECUR-014: Dust攻击
- 攻击: 大量小额转账，干扰余额检查
- 验证: unchangedAssetToleranceBps容忍微小变化

// TC-SECUR-015: Gas griefing
- 攻击: callback消耗大量gas
- 验证: 评估gas limit设置
```

---

## Part F: Gas优化和性能测试

### F-I. Gas基准测试

```solidity
// TC-GAS-001: 标准rebalance gas消耗
- 2卖2买场景
- 验证: total gas < 500k

// TC-GAS-002: 复杂rebalance gas消耗
- 5卖5买场景
- 验证: gas线性增长

// TC-GAS-003: 单资产rebalance
- 1卖1买
- 验证: baseline gas

// TC-GAS-004: 只卖不买
- 3卖0买
- 验证: 比标准场景省gas

// TC-GAS-005: 只买不卖
- 0卖3买
- 验证: gas消耗

// TC-GAS-006: Phase 1 gas
- _prepareRebalance单独测试
- 验证: gas < 100k

// TC-GAS-007: Phase 2 gas
- rebalanceCallback单独测试
- 验证: 主要gas消耗部分

// TC-GAS-008: Phase 3 gas
- _verifyAndFinalizeRebalance
- 验证: gas < 150k

// TC-GAS-009: V2 vs V3 gas对比
- WBNB (V2) vs BTC (V3) swap
- 验证: 记录差异

// TC-GAS-010: Approve/清理 gas
- forceApprove(amount) + forceApprove(0)
- 验证: overhead < 10k per asset
```

### F-II. 优化验证

```solidity
// TC-GAS-011: 批量vs单独配置pools
- configureAssetPools([10个]) vs 10次configureAssetPool
- 验证: 批量省gas

// TC-GAS-012: 状态变量读取优化
- 使用memory缓存vs多次sload
- 验证: 优化效果

// TC-GAS-013: Loop优化
- for loop在不同数组长度下的gas
- 验证: 线性增长

// TC-GAS-014: 冷启动vs热启动
- 首次rebalance vs 第二次（SSTORE warm）
- 验证: gas差异
```

---

## Part G: 升级和迁移测试

### G-I. 合约升级

```solidity
// TC-UPGRADE-001: 部署新Rebalancer
- 部署RebalancerV2
- setRebalancer(v2Address)
- 验证:
  ✓ 新合约被Core调用
  ✓ 旧合约无法调用

// TC-UPGRADE-002: 状态迁移
- 从旧Rebalancer迁移配置
- 验证:
  ✓ pools配置保留
  ✓ maxSlippage保留
  ✓ cooldownPeriod保留

// TC-UPGRADE-003: Core配置迁移
- 升级Core合约（如果可升级）
- 验证:
  ✓ 验证阈值保留
  ✓ rebalancer地址保留
  ✓ assets和weights保留
```

### G-II. 向后兼容性

```solidity
// TC-COMPAT-001: 旧接口兼容
- 如果有接口变更，测试向后兼容
- 验证: 旧调用方式仍可用

// TC-COMPAT-002: 事件兼容
- 新合约emit相同事件
- 验证: 监听器正常工作

// TC-COMPAT-003: 数据格式兼容
- rebalanceAmounts, balancesBefore等格式
- 验证: 无breaking change
```

---

## 测试执行计划

### 优先级分级

#### P0 - 关键路径 (必须100%通过)
- Core: TC-CORE-001至TC-069 (flashRebalance完整流程)
- Rebalancer: TC-REBAL-NEW-001至TC-060 (算法核心)
- Integration: TC-INTEG-001至TC-003 (happy path)

#### P1 - 核心功能 (必须95%+通过)
- Core: TC-CORE-070至TC-092 (配置和验证)
- Rebalancer: TC-REBAL-NEW-061至TC-099 (访问控制和配置)
- Integration: TC-INTEG-004至TC-030 (边界和失败)

#### P2 - 边界和安全 (必须90%+通过)
- Invariant: TC-INVAR-001至TC-008
- Security: TC-SECUR-001至TC-015
- Property: TC-PROP-001至TC-006

#### P3 - 优化和扩展 (尽力而为)
- Gas: TC-GAS-001至TC-014
- Upgrade: TC-UPGRADE-001至TC-003

### 覆盖率目标

| 合约 | Line | Branch | Function | Statement |
|------|------|--------|----------|-----------|
| BlockETFCore.sol | 100% | 100% | 100% | 100% |
| ETFRebalancerV1.sol | 100% | 100% | 100% | 100% |
| 整体系统 | 100% | 100% | 100% | 100% |

### 测试套件组织

```
test/
├── BlockETFCore/
│   ├── BlockETFCore.FlashRebalance.t.sol      [TC-CORE-001至TC-029]
│   ├── BlockETFCore.PrepareRebalance.t.sol    [TC-CORE-011至TC-021]
│   ├── BlockETFCore.Verification.t.sol        [TC-CORE-030至TC-069]
│   ├── BlockETFCore.Configuration.t.sol       [TC-CORE-070至TC-092]
│   └── BlockETFCore.Integration.t.sol         [TC-CORE相关集成]
│
├── ETFRebalancerV1/
│   ├── ETFRebalancerV1.Algorithm.t.sol        [TC-REBAL-NEW-001至TC-060]
│   ├── ETFRebalancerV1.AccessControl.t.sol    [TC-REBAL-NEW-061至TC-073]
│   ├── ETFRebalancerV1.Configuration.t.sol    [TC-REBAL-NEW-075至TC-085]
│   ├── ETFRebalancerV1.Slippage.t.sol         [已有21个测试]
│   └── ...（其他已有测试文件）
│
├── Integration/
│   ├── CoreRebalancerIntegration.t.sol        [TC-INTEG-001至TC-030]
│   ├── Invariant.t.sol                        [TC-INVAR-001至TC-008]
│   ├── PropertyBased.t.sol                    [TC-PROP-001至TC-006]
│   └── Security.t.sol                         [TC-SECUR-001至TC-015]
│
└── Performance/
    ├── Gas.t.sol                              [TC-GAS-001至TC-014]
    └── Upgrade.t.sol                          [TC-UPGRADE-001至TC-003]
```

### 执行命令

```bash
# 运行所有测试
forge test

# 按优先级运行
forge test --match-path "test/BlockETFCore/*"
forge test --match-path "test/ETFRebalancerV1/*"
forge test --match-path "test/Integration/*"

# 覆盖率报告
forge coverage

# 详细覆盖率（LCOV）
forge coverage --report lcov

# Gas报告
forge test --gas-report

# Fuzz测试（增加runs）
forge test --fuzz-runs 10000

# Invariant测试
forge test --match-contract Invariant

# 并行执行
forge test --jobs 8
```

---

## 总结

### 测试统计
- **Core测试**: 92个用例
- **Rebalancer测试**: 150个用例
- **集成测试**: 30个用例
- **Invariant测试**: 8个用例
- **Property测试**: 6个用例
- **安全测试**: 15个用例
- **性能测试**: 14个用例
- **升级测试**: 3个用例

**总计**: **318个测试用例**

### 关键测试维度
1. ✅ **Core flashRebalance三阶段**
   - _prepareRebalance (计算和转账)
   - rebalanceCallback (Rebalancer执行)
   - _verifyAndFinalizeRebalance (验证和更新)

2. ✅ **Category-based Verification**
   - 卖单: actualSold ≤ 101%
   - 买单: 95% ≤ actualBought ≤ 110%
   - 零单: balance保持±0.1%

3. ✅ **可配置阈值**
   - 5个独立阈值，各自测试
   - 修改后立即生效验证

4. ✅ **Rebalancer算法**
   - 权重缺口比例分配
   - maxDeficit吸收dust
   - ExactInput模式

5. ✅ **双重滑点保护**
   - Rebalancer: 3% (minOutput)
   - Core: 1%卖出/10%买入范围

6. ✅ **端到端集成**
   - Happy path
   - 失败场景
   - 多轮rebalance
   - 极端市场条件

7. ✅ **Invariant和Security**
   - 资产守恒
   - 权重收敛
   - Reentrancy防护
   - Oracle操纵防御

### 文档位置
- 本计划: `/docs/test-reports/COMPLETE_REBALANCE_TEST_PLAN.md`
- Rebalancer详细: `/docs/test-reports/REBALANCER_COMPREHENSIVE_TEST_PLAN.md`

**目标**: 通过318个测试用例，实现Core + Rebalancer整体系统100%覆盖率。
