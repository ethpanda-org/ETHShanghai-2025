# ETFRebalancerV1 Comprehensive Test Plan (100% Coverage)

## 测试目标
重构后的Rebalancer采用**权重缺口比例分配算法**，本测试计划旨在实现100%代码覆盖率和完整功能验证。

## 重构核心逻辑回顾

### 新算法 (Weight Deficit Proportional Allocation)
```
Phase 1: 卖出over-weighted资产，收集USDT
Phase 2: 计算每个under-weighted资产的买入价值（权重缺口）
Phase 3: 按权重缺口比例分配USDT预算，最大缺口获得剩余dust
Phase 4: 归还所有资产给Core
```

### 关键特性
- ✅ 零估算（不需要预估swap输出）
- ✅ ExactInput模式（确定性输入）
- ✅ 权重导向分配（优先弥补大缺口）
- ✅ Oracle滑点保护（3%默认）
- ✅ V2/V3混合路由（WBNB用V2，其他用V3）

---

## 测试维度矩阵

### 覆盖率目标
| 维度 | 目标 | 当前状态 |
|------|------|----------|
| Line Coverage | 100% | 需验证 |
| Branch Coverage | 100% | 需验证 |
| Function Coverage | 100% | 需验证 |
| Statement Coverage | 100% | 需验证 |

---

## I. 核心算法测试 (rebalanceCallback)

### A. Phase 1: 卖出阶段测试

#### A1. 基础卖出场景
```solidity
// TC-REBAL-NEW-001: 单个资产卖出
- 输入: [BTC: +10]
- 验证:
  ✓ _sellAssetForUSDT被调用1次
  ✓ totalUSDTCollected正确累加
  ✓ AssetSwapped事件正确触发
  ✓ approve/清理逻辑执行

// TC-REBAL-NEW-002: 多个资产卖出
- 输入: [BTC: +10, ETH: +5, WBNB: +2]
- 验证:
  ✓ 所有卖单顺序执行
  ✓ USDT总量 = sum(所有卖出收益)
  ✓ 每个资产触发独立事件

// TC-REBAL-NEW-003: USDT卖出（跳过swap）
- 输入: [USDT: +100]
- 验证:
  ✓ 直接返回amount，不调用swap
  ✓ totalUSDTCollected += 100
```

#### A2. 边界条件
```solidity
// TC-REBAL-NEW-004: 零数量卖出
- 输入: [BTC: 0]
- 验证: 跳过处理

// TC-REBAL-NEW-005: 极小数量卖出（dust）
- 输入: [BTC: 1 wei]
- 验证:
  ✓ 能正确处理
  ✓ 不触发slippage revert

// TC-REBAL-NEW-006: 极大数量卖出
- 输入: [BTC: type(uint128).max / 10**18]
- 验证:
  ✓ 不溢出
  ✓ totalUSDTCollected计算正确
```

#### A3. 路由选择测试
```solidity
// TC-REBAL-NEW-007: V3路由（BTC/ETH）
- 输入: [BTC: +10]
- 验证:
  ✓ 调用v3Router.exactInputSingle
  ✓ 使用配置的pool和fee
  ✓ 滑点保护生效（minOutput设置）

// TC-REBAL-NEW-008: V2路由（WBNB）
- 输入: [WBNB: +100]
- 验证:
  ✓ 调用v2Router.swapExactTokensForTokens
  ✓ 路径正确: WBNB → USDT
  ✓ V2滑点保护生效

// TC-REBAL-NEW-009: 混合路由
- 输入: [BTC: +5, WBNB: +10, ETH: +3]
- 验证:
  ✓ BTC/ETH走V3
  ✓ WBNB走V2
  ✓ 各自滑点保护独立生效
```

#### A4. 滑点保护测试
```solidity
// TC-REBAL-NEW-010: Oracle价格正常，swap正常
- Mock: oraclePrice = 50000, swapOutput = 49500 (1%滑点)
- 验证: 通过（1% < 3%）

// TC-REBAL-NEW-011: 超过滑点保护阈值
- Mock: oraclePrice = 50000, swapOutput = 48000 (4%滑点)
- 验证: revert InsufficientOutput

// TC-REBAL-NEW-012: 恰好在滑点边界
- Mock: oraclePrice = 50000, swapOutput = 48500 (3%滑点)
- 验证: 通过

// TC-REBAL-NEW-013: Oracle价格与DEX价格不同步
- Mock: oraclePrice = 50000, dexPrice = 49000
- 验证:
  ✓ 使用Oracle价格计算minOutput
  ✓ 如果DEX价格差异>3%，revert

// TC-REBAL-NEW-014: V2 getAmountsOut quote
- Mock: V2 quote = 100, 实际输出 = 97
- 验证: 通过（99.7%费用后在保护范围内）
```

#### A5. 失败场景
```solidity
// TC-REBAL-NEW-015: Swap失败（流动性不足）
- Mock: v3Router.exactInputSingle() revert
- 验证: rebalanceCallback整体revert

// TC-REBAL-NEW-016: Token transfer失败
- Mock: asset.transfer() return false
- 验证: SafeERC20检测并revert

// TC-REBAL-NEW-017: Oracle价格获取失败
- Mock: priceOracle.getPrice() revert
- 验证: _getAssetPrice revert → callback revert
```

---

### B. Phase 2: 计算买入价值测试

#### B1. 单个资产买入价值计算
```solidity
// TC-REBAL-NEW-018: 标准买入价值计算
- 输入: [BTC: -10] (买入10 BTC)
- Oracle价格: 50000e18
- Decimals: 18
- 验证:
  ✓ buyValues[BTC] = (10 * 50000e18) / 1e18 = 500000e18
  ✓ totalBuyValue = 500000e18

// TC-REBAL-NEW-019: 多个资产买入价值
- 输入: [BTC: -1, ETH: -10, WBNB: -100]
- 价格: BTC=50000, ETH=3000, WBNB=300
- 验证:
  ✓ buyValues[BTC] = 50000
  ✓ buyValues[ETH] = 30000
  ✓ buyValues[WBNB] = 30000
  ✓ totalBuyValue = 110000
```

#### B2. USDT买入（跳过）
```solidity
// TC-REBAL-NEW-020: USDT在买单中
- 输入: [BTC: -1, USDT: -100]
- 验证:
  ✓ USDT的buyValue = 0（跳过）
  ✓ totalBuyValue只计算BTC
  ✓ USDT不会被swap
```

#### B3. 不同Decimals测试
```solidity
// TC-REBAL-NEW-021: 6 decimals (USDC风格)
- Asset: 6 decimals
- Amount: -1000000 (1个token)
- Price: 50000e18
- 验证: buyValue = (1000000 * 50000e18) / 1e6 = 50000e18

// TC-REBAL-NEW-022: 8 decimals (BTC风格)
- Asset: 8 decimals
- Amount: -100000000 (1 BTC)
- Price: 50000e18
- 验证: buyValue = (100000000 * 50000e18) / 1e8 = 50000e18

// TC-REBAL-NEW-023: 混合decimals
- BTC(18): -1, ETH(18): -10, CustomToken(6): -1000000
- 验证: 价值计算都正确，不受decimals影响
```

#### B4. 极端价格测试
```solidity
// TC-REBAL-NEW-024: 极高价格
- Price: 1e30 (天价token)
- Amount: -1e18
- 验证:
  ✓ buyValue = 1e30（不溢出）
  ✓ 后续分配计算正确

// TC-REBAL-NEW-025: 极低价格
- Price: 1 (1 wei等于1 USD)
- Amount: -1e18
- 验证: buyValue = 1（dust处理）

// TC-REBAL-NEW-026: 零价格（异常）
- Price: 0
- 验证: 可能导致除零错误或oracle错误
```

#### B5. 边界条件
```solidity
// TC-REBAL-NEW-027: 所有资产都是卖单（无买单）
- 输入: [BTC: +10, ETH: +5]
- 验证:
  ✓ totalBuyValue = 0
  ✓ Phase 3跳过（if totalBuyValue > 0不成立）
  ✓ 所有USDT留在Rebalancer

// TC-REBAL-NEW-028: 只有一个买单
- 输入: [BTC: +10, ETH: -5]
- 验证:
  ✓ buyValues中只有ETH非零
  ✓ ETH是maxDeficit
  ✓ Phase 3直接给ETH所有USDT
```

---

### C. Phase 3: USDT分配和买入测试

#### C1. 比例分配逻辑
```solidity
// TC-REBAL-NEW-029: 两个买单，相等权重缺口
- 输入: [USDT: +1000, BTC: -1, ETH: -10]
- 价格: BTC=500, ETH=50 → buyValue相等
- totalUSDTCollected = 1000
- 验证:
  ✓ 一个分配 (1000*500)/1000 = 500
  ✓ maxDeficit获得剩余 500
  ✓ usdtSpent + remainingUSDT = 1000（无dust损失）

// TC-REBAL-NEW-030: 两个买单，不同权重缺口
- buyValues: [BTC: 700, ETH: 300]
- totalUSDT = 1000
- 验证:
  ✓ ETH分配: (1000*300)/1000 = 300
  ✓ BTC(maxDeficit)获得: 1000-300 = 700
  ✓ 比例精确符合权重缺口

// TC-REBAL-NEW-031: 三个买单
- buyValues: [BTC: 500, ETH: 300, WBNB: 200]
- totalUSDT = 1000
- 验证:
  ✓ ETH分配: 300, WBNB分配: 200
  ✓ BTC(maxDeficit)获得: 500
  ✓ sum = 1000
```

#### C2. 最大缺口识别
```solidity
// TC-REBAL-NEW-032: 明确的最大缺口
- buyValues: [100, 500, 200, 300]
- 验证:
  ✓ maxDeficitIndex = 1
  ✓ maxDeficit = 500
  ✓ index=1获得剩余USDT

// TC-REBAL-NEW-033: 多个相同最大值
- buyValues: [500, 500, 200]
- 验证:
  ✓ maxDeficitIndex = 0 (第一个)
  ✓ 逻辑仍然正确执行

// TC-REBAL-NEW-034: 所有buyValue相等
- buyValues: [333, 333, 333]
- totalUSDT = 1000
- 验证:
  ✓ 前两个各得 333
  ✓ 第一个(maxDeficit)额外得 1000-666 = 334
  ✓ dust被消化
```

#### C3. Dust处理测试
```solidity
// TC-REBAL-NEW-035: 舍入产生dust
- buyValues: [333, 333, 334]
- totalUSDT = 1000
- 计算:
  ✓ 第二个分配: (1000*333)/1000 = 333 (舍入)
  ✓ 第三个分配: (1000*334)/1000 = 334 (舍入)
  ✓ usdtSpent = 667
  ✓ 第一个(maxDeficit)获得: 1000-667 = 333 ✅

// TC-REBAL-NEW-036: 极端舍入dust
- buyValues: [1, 1, 1]
- totalUSDT = 10
- 验证:
  ✓ 两个非maxDeficit各得 (10*1)/3 = 3
  ✓ maxDeficit得 10-6 = 4
  ✓ 无USDT遗失

// TC-REBAL-NEW-037: 大额舍入dust
- buyValues: [1e18, 1e18, 1e18]
- totalUSDT = 1e18 - 1
- 验证: maxDeficit吸收所有舍入误差
```

#### C4. ExactInput买入测试
```solidity
// TC-REBAL-NEW-038: V3 exactInput买入
- allocatedUSDT = 500
- Asset = BTC
- 验证:
  ✓ _swapUSDTToAssetExactInput被调用
  ✓ 输入USDT = 500（精确）
  ✓ 输出BTC = 取决于DEX（不确定）
  ✓ minOutput保护生效

// TC-REBAL-NEW-039: V2 exactInput买入（WBNB）
- allocatedUSDT = 300
- Asset = WBNB
- 验证:
  ✓ _swapUSDTToWBNBV2ExactInput被调用
  ✓ 路径: USDT → WBNB
  ✓ V2 quote保护生效

// TC-REBAL-NEW-040: 混合买入
- 分配: [BTC(V3): 500, WBNB(V2): 300, ETH(V3): 200]
- 验证:
  ✓ 每个asset调用正确的router
  ✓ 各自的滑点保护独立生效
```

#### C5. 买入失败场景
```solidity
// TC-REBAL-NEW-041: 买入时滑点超限
- allocatedUSDT = 500
- Mock: swap输出低于minOutput
- 验证: revert（整个rebalance失败）

// TC-REBAL-NEW-042: 买入流动性不足
- Mock: DEX流动性耗尽
- 验证: revert InsufficientLiquidity

// TC-REBAL-NEW-043: 部分买入成功，部分失败
- 第一个买入成功，第二个失败
- 验证: 整个callback revert（原子性）
```

#### C6. 分配边界测试
```solidity
// TC-REBAL-NEW-044: USDT不足（收集的少于需求）
- totalBuyValue = 1000
- totalUSDTCollected = 500
- 验证:
  ✓ 按比例分配500
  ✓ 每个asset得到 (需求/总需求) * 500
  ✓ 权重缺口仍未完全弥补（预期行为）

// TC-REBAL-NEW-045: USDT充足（收集的等于需求）
- totalBuyValue = 1000
- totalUSDTCollected = 1000
- 验证:
  ✓ 每个asset得到精确的需求量
  ✓ dust最小化

// TC-REBAL-NEW-046: USDT过量（理论上不应该）
- totalBuyValue = 1000
- totalUSDTCollected = 1500
- 验证:
  ✓ 按比例分配1500（超额购买）
  ✓ 剩余USDT留在Rebalancer
```

#### C7. 零分配测试
```solidity
// TC-REBAL-NEW-047: allocatedUSDT = 0
- 某个asset计算出的分配 = 0
- 验证:
  ✓ _buyAssetWithExactUSDT内部if (usdtAmount == 0) return
  ✓ 不触发swap
  ✓ 不触发事件

// TC-REBAL-NEW-048: totalUSDTCollected = 0
- 输入: 只有买单，无卖单
- 验证:
  ✓ Phase 3所有分配都是0
  ✓ 无swap执行
  ✓ 买入失败（预期行为，Core应检测）
```

---

### D. Phase 4: 资产归还测试

#### D1. 正常归还
```solidity
// TC-REBAL-NEW-049: 归还所有资产
- assets: [USDT, BTC, ETH, WBNB]
- 验证:
  ✓ 每个asset的余额全部transfer给Core
  ✓ Rebalancer余额 = 0

// TC-REBAL-NEW-050: 归还包含零余额
- BTC余额 = 0（未参与rebalance）
- 验证:
  ✓ transferAll仍执行（transfer 0）
  ✓ 不revert
```

#### D2. 归还失败场景
```solidity
// TC-REBAL-NEW-051: Transfer失败
- Mock: token.transfer() return false
- 验证: SafeERC20检测并revert

// TC-REBAL-NEW-052: Core拒绝接收
- Mock: Core余额已满
- 验证: revert（根据ERC20实现）
```

---

### E. 端到端集成测试

#### E1. 完整Rebalance流程
```solidity
// TC-REBAL-NEW-053: 标准rebalance（卖1买1）
- 输入: [BTC: +10, ETH: -5]
- 流程:
  1. 卖出10 BTC → 收集500k USDT
  2. 计算ETH buyValue = 15k
  3. 分配500k USDT给ETH
  4. 买入ETH
  5. 归还BTC和ETH给Core
- 验证:
  ✓ ETH余额增加
  ✓ BTC余额减少
  ✓ USDT归还给Core
  ✓ 事件序列正确

// TC-REBAL-NEW-054: 复杂rebalance（卖多买多）
- 输入: [BTC: +5, ETH: +10, WBNB: -50, CustomToken: -100]
- 验证:
  ✓ Phase 1: 卖出BTC+ETH
  ✓ Phase 2: 计算WBNB和CustomToken价值
  ✓ Phase 3: 按比例分配USDT
  ✓ Phase 4: 归还所有4个asset

// TC-REBAL-NEW-055: 单边rebalance（只卖）
- 输入: [BTC: +10, ETH: +5]
- 验证:
  ✓ Phase 1执行
  ✓ Phase 2: totalBuyValue = 0
  ✓ Phase 3跳过
  ✓ Phase 4归还所有USDT

// TC-REBAL-NEW-056: 单边rebalance（只买）
- 输入: [BTC: -10, ETH: -5]
- Rebalancer预先有USDT余额
- 验证:
  ✓ Phase 1跳过
  ✓ Phase 2-3正常执行
  ✓ 使用现有USDT余额
```

#### E2. 多轮Rebalance
```solidity
// TC-REBAL-NEW-057: 连续两次rebalance
- 第一次: [BTC: +10, ETH: -5]
- 第二次: [BTC: -5, ETH: +10]
- 验证:
  ✓ 权重逐渐收敛
  ✓ 每次分配算法独立正确

// TC-REBAL-NEW-058: 多次迭代直到平衡
- 初始严重失衡
- 执行10次rebalance
- 验证:
  ✓ 权重偏差逐次减小
  ✓ 最终达到threshold内
```

#### E3. 极端市场条件
```solidity
// TC-REBAL-NEW-059: 极端价格波动
- Phase 1卖出时: BTC价格 = 50000
- Phase 2买入时: BTC价格变为 45000 (模拟暴跌)
- 验证:
  ✓ Oracle价格用于计算
  ✓ 滑点保护可能触发
  ✓ Core最终验证总价值

// TC-REBAL-NEW-060: 流动性枯竭
- DEX流动性严重不足
- 验证:
  ✓ 部分swap失败
  ✓ 整个rebalance revert
  ✓ 状态回滚
```

---

## II. 访问控制测试

### A. executeRebalance访问控制
```solidity
// TC-REBAL-NEW-061: 任何人都可调用
- Caller: EOA, 其他合约, bot
- 验证: 都可以成功调用（无access control）

// TC-REBAL-NEW-062: 暂停时调用
- 前置: pause()
- 验证: revert Paused

// TC-REBAL-NEW-063: Reentrancy攻击
- Mock: 在callback中再次调用executeRebalance
- 验证: ReentrancyGuard阻止
```

### B. rebalanceCallback访问控制
```solidity
// TC-REBAL-NEW-064: 只有Core可调用
- Caller: address(etfCore)
- 验证: 通过

// TC-REBAL-NEW-065: Owner调用
- Caller: owner()
- 验证: revert NotETFCore

// TC-REBAL-NEW-066: 随机地址调用
- Caller: alice (随机EOA)
- 验证: revert NotETFCore
```

### C. Admin函数访问控制
```solidity
// TC-REBAL-NEW-067: configureAssetPool - owner
- 验证: 通过

// TC-REBAL-NEW-068: configureAssetPool - 非owner
- 验证: revert OwnableUnauthorizedAccount

// TC-REBAL-NEW-069: setMaxSlippage - owner
- 验证: 通过

// TC-REBAL-NEW-070: setMaxSlippage - 非owner
- 验证: revert OwnableUnauthorizedAccount

// TC-REBAL-NEW-071: pause/unpause - owner
- 验证: 通过

// TC-REBAL-NEW-072: pause/unpause - 非owner
- 验证: revert OwnableUnauthorizedAccount

// TC-REBAL-NEW-073: recoverToken - owner
- 验证: 通过

// TC-REBAL-NEW-074: recoverToken - 非owner
- 验证: revert OwnableUnauthorizedAccount
```

---

## III. 参数配置测试

### A. Pool配置
```solidity
// TC-REBAL-NEW-075: 配置单个pool
- configureAssetPool(BTC, pool, 2500)
- 验证:
  ✓ assetPools[BTC] = pool
  ✓ poolFees[pool] = 2500
  ✓ 事件触发

// TC-REBAL-NEW-076: 批量配置pools
- configureAssetPools([BTC,ETH], [pool1,pool2], [500,2500])
- 验证:
  ✓ 所有映射正确设置
  ✓ 每个asset触发事件

// TC-REBAL-NEW-077: 数组长度不匹配
- assets.length != pools.length
- 验证: revert InvalidConfiguration

// TC-REBAL-NEW-078: 覆盖已有配置
- 先配置BTC -> pool1
- 再配置BTC -> pool2
- 验证: 使用pool2
```

### B. Slippage配置
```solidity
// TC-REBAL-NEW-079: 设置正常滑点（3%）
- setMaxSlippage(300)
- 验证: maxSlippage = 300

// TC-REBAL-NEW-080: 设置最大滑点（5%）
- setMaxSlippage(500)
- 验证: 通过

// TC-REBAL-NEW-081: 超过最大滑点
- setMaxSlippage(501)
- 验证: revert SlippageExceeded

// TC-REBAL-NEW-082: 设置零滑点
- setMaxSlippage(0)
- 验证: 通过（极严格保护）
```

### C. Cooldown配置
```solidity
// TC-REBAL-NEW-083: 设置1小时
- setCooldownPeriod(1 hours)
- 验证: cooldownPeriod = 3600

// TC-REBAL-NEW-084: 设置零cooldown
- setCooldownPeriod(0)
- 验证: 通过（可立即rebalance）

// TC-REBAL-NEW-085: 设置极长cooldown
- setCooldownPeriod(365 days)
- 验证: 通过
```

---

## IV. 状态管理测试

### A. Cooldown时间戳
```solidity
// TC-REBAL-NEW-086: lastRebalanceTime更新
- 执行executeRebalance
- 验证:
  ✓ lastRebalanceTime = block.timestamp
  ✓ 下次rebalance需等待cooldown

// TC-REBAL-NEW-087: cooldown未满时调用
- lastRebalanceTime = now - 30分钟
- cooldownPeriod = 1小时
- 验证: revert CooldownNotMet

// TC-REBAL-NEW-088: cooldown刚好满足
- lastRebalanceTime = now - 1小时
- cooldownPeriod = 1小时
- 验证: 通过
```

### B. Pause状态
```solidity
// TC-REBAL-NEW-089: 正常 → 暂停
- pause()
- 验证:
  ✓ paused() = true
  ✓ executeRebalance revert

// TC-REBAL-NEW-090: 暂停 → 恢复
- pause() → unpause()
- 验证:
  ✓ paused() = false
  ✓ executeRebalance可调用

// TC-REBAL-NEW-091: 重复pause
- pause() → pause()
- 验证: 第二次revert (Pausable行为)

// TC-REBAL-NEW-092: 重复unpause
- unpause() → unpause()
- 验证: 第二次revert
```

---

## V. 事件测试

### A. RebalanceExecuted事件
```solidity
// TC-REBAL-NEW-093: 事件参数正确
- 执行rebalance
- 验证:
  ✓ executor = msg.sender
  ✓ totalValueBefore = Core返回值
  ✓ totalValueAfter = Core返回值
  ✓ timestamp = block.timestamp

// TC-REBAL-NEW-094: 事件触发时机
- 验证: 在_validateSlippage之后，rebalance成功完成时
```

### B. AssetSwapped事件
```solidity
// TC-REBAL-NEW-095: 卖出事件
- 卖出10 BTC
- 验证:
  ✓ fromAsset = BTC
  ✓ toAsset = USDT
  ✓ fromAmount = 10 BTC
  ✓ toAmount = 实际收到的USDT

// TC-REBAL-NEW-096: 买入事件
- 买入ETH (exactInput 500 USDT)
- 验证:
  ✓ fromAsset = USDT
  ✓ toAsset = ETH
  ✓ fromAmount = 500 USDT
  ✓ toAmount = 实际收到的ETH

// TC-REBAL-NEW-097: 多个swap事件序列
- 卖出BTC, 买入ETH, 买入WBNB
- 验证: 3个独立事件，顺序正确
```

### C. PoolConfigured事件
```solidity
// TC-REBAL-NEW-098: 单个配置事件
- configureAssetPool(BTC, pool, 2500)
- 验证:
  ✓ asset = BTC
  ✓ pool = pool地址
  ✓ fee = 2500

// TC-REBAL-NEW-099: 批量配置事件
- configureAssetPools([BTC, ETH], ...)
- 验证: 2个独立事件触发
```

---

## VI. Error处理测试

### A. Revert场景
```solidity
// TC-REBAL-NEW-100: NotETFCore
- rebalanceCallback由非Core调用
- 验证: revert NotETFCore()

// TC-REBAL-NEW-101: RebalanceNotNeeded
- Core.needsRebalance = false
- 验证: revert RebalanceNotNeeded()

// TC-REBAL-NEW-102: CooldownNotMet
- lastRebalanceTime + cooldown > now
- 验证: revert CooldownNotMet()

// TC-REBAL-NEW-103: SlippageExceeded
- 设置maxSlippage > 500
- 验证: revert SlippageExceeded()

// TC-REBAL-NEW-104: InsufficientOutput
- swap输出 < minOutput
- 验证: revert InsufficientOutput()

// TC-REBAL-NEW-105: InvalidConfiguration
- configureAssetPools数组长度不匹配
- 验证: revert InvalidConfiguration()
```

---

## VII. 滑点保护深度测试

### A. Oracle vs DEX价格差异
```solidity
// TC-REBAL-NEW-106: Oracle高于DEX 1%
- Oracle: 50000, DEX: 49500
- 验证: minOutput基于Oracle，实际output满足

// TC-REBAL-NEW-107: Oracle高于DEX 5%
- Oracle: 50000, DEX: 47500
- 验证: minOutput过高，swap revert

// TC-REBAL-NEW-108: Oracle低于DEX
- Oracle: 50000, DEX: 51000
- 验证: minOutput保守，swap成功，多得代币

// TC-REBAL-NEW-109: Oracle严重滞后
- Oracle: 50000 (1小时前), DEX: 45000 (当前)
- 验证: minOutput基于旧价格，可能revert
```

### B. V2 vs V3滑点差异
```solidity
// TC-REBAL-NEW-110: V3滑点保护（Oracle）
- Asset: BTC (V3)
- 验证:
  ✓ minOutput = (oracle * amount * 0.97) / decimals
  ✓ exactInputSingle检查

// TC-REBAL-NEW-111: V2滑点保护（Quote）
- Asset: WBNB (V2)
- 验证:
  ✓ minOutput = getAmountsOut * 0.97
  ✓ swapExactTokensForTokens检查

// TC-REBAL-NEW-112: 混合场景保护
- 同时swap BTC(V3) + WBNB(V2)
- 验证: 各自保护机制独立生效
```

### C. 动态maxSlippage测试
```solidity
// TC-REBAL-NEW-113: 修改maxSlippage后立即rebalance
- 设置maxSlippage = 100 (1%)
- 立即执行rebalance
- Mock: 1.5%滑点
- 验证: revert

// TC-REBAL-NEW-114: 宽松滑点（5%）
- maxSlippage = 500
- Mock: 4.5%滑点
- 验证: 通过

// TC-REBAL-NEW-115: 严格滑点（0.5%）
- maxSlippage = 50
- Mock: 0.6%滑点
- 验证: revert
```

---

## VIII. Gas优化验证

### A. 单次操作Gas
```solidity
// TC-REBAL-NEW-116: executeRebalance gas消耗
- 标准rebalance（2卖2买）
- 验证: gas < 500k

// TC-REBAL-NEW-117: rebalanceCallback gas消耗
- Phase 1-4完整流程
- 验证: 分阶段记录gas

// TC-REBAL-NEW-118: Approve/清理gas
- 验证:
  ✓ forceApprove(amount) gas
  ✓ forceApprove(0) gas
  ✓ 总overhead < 100k
```

### B. 批量操作Gas
```solidity
// TC-REBAL-NEW-119: 多资产rebalance
- 5个卖单 + 5个买单
- 验证: gas线性增长

// TC-REBAL-NEW-120: configureAssetPools批量
- 配置10个pools
- 验证: 比10次单独调用省gas
```

---

## IX. 边界条件和Fuzz测试

### A. 数值边界
```solidity
// TC-REBAL-NEW-121: Fuzz - 随机amounts
- amounts: [-type(int256).max/2 to type(int256).max/2]
- 验证: 不溢出，计算正确

// TC-REBAL-NEW-122: Fuzz - 随机价格
- prices: [1 to 1e30]
- 验证: buyValue计算不溢出

// TC-REBAL-NEW-123: Fuzz - 随机USDT收集量
- totalUSDTCollected: [0 to 1e30]
- 验证: 分配逻辑正确

// TC-REBAL-NEW-124: Fuzz - 随机资产数量
- assets.length: [1 to 20]
- 验证: loop正确处理
```

### B. 时间边界
```solidity
// TC-REBAL-NEW-125: Fuzz - cooldown边界
- lastRebalanceTime: [now - 2*cooldown to now]
- 验证: cooldown检查正确

// TC-REBAL-NEW-126: block.timestamp = 0
- 极端情况
- 验证: 逻辑仍正常

// TC-REBAL-NEW-127: block.timestamp = type(uint256).max
- 极端情况
- 验证: 不溢出
```

### C. 数组边界
```solidity
// TC-REBAL-NEW-128: 空数组
- assets = []
- amounts = []
- 验证: callback正常返回（无操作）

// TC-REBAL-NEW-129: 单元素数组
- assets = [BTC]
- amounts = [+10]
- 验证: 正常处理

// TC-REBAL-NEW-130: 大数组（20个资产）
- 验证: 不hit gas limit
```

---

## X. 集成和Invariant测试

### A. Invariants
```solidity
// TC-REBAL-NEW-131: 资产守恒
- Invariant: sum(Rebalancer余额) + sum(Core余额) = 初始总量
- 验证: rebalance前后总量不变

// TC-REBAL-NEW-132: USDT不遗失
- Invariant: 所有USDT最终归还Core或留在Rebalancer
- 验证: 无USDT消失

// TC-REBAL-NEW-133: 权重缺口减少
- Invariant: rebalance后权重偏差 < rebalance前
- 验证: 算法有效性

// TC-REBAL-NEW-134: Slippage始终被检查
- Invariant: 所有swap都经过minOutput检查
- 验证: 无绕过情况
```

### B. 与Core合约集成
```solidity
// TC-REBAL-NEW-135: Core flashRebalance调用
- 完整流程: Core.flashRebalance → Rebalancer.callback
- 验证:
  ✓ assets借出
  ✓ callback执行
  ✓ assets归还
  ✓ Core验证总价值

// TC-REBAL-NEW-136: Core价值验证失败
- Mock: rebalance后总价值损失 > 5%
- 验证: Core revert ExcessiveLoss

// TC-REBAL-NEW-137: Core与Rebalancer双重滑点保护
- Rebalancer: 3%保护
- Core: 5%保护
- 验证: 双重防护有效
```

---

## XI. 安全性测试

### A. Reentrancy
```solidity
// TC-REBAL-NEW-138: executeRebalance reentrancy
- 在executeRebalance中尝试再次调用
- 验证: ReentrancyGuard阻止

// TC-REBAL-NEW-139: rebalanceCallback reentrancy
- 在callback中尝试再次调用
- 验证: 阻止

// TC-REBAL-NEW-140: 跨函数reentrancy
- executeRebalance → callback → executeRebalance
- 验证: 阻止
```

### B. 授权攻击
```solidity
// TC-REBAL-NEW-141: Approve清理有效性
- 执行swap后检查router的授权
- 验证: approve = 0

// TC-REBAL-NEW-142: 累积授权攻击
- 多次rebalance后检查授权
- 验证: 无累积授权

// TC-REBAL-NEW-143: 恶意router攻击
- Mock: router尝试transferFrom超额
- 验证: SafeERC20保护
```

### C. Oracle操纵
```solidity
// TC-REBAL-NEW-144: 闪电贷价格操纵
- Mock: Oracle价格在同一block内被操纵
- 验证:
  ✓ minOutput基于操纵价格
  ✓ 实际swap仍需满足DEX价格
  ✓ Core最终验证捕获异常

// TC-REBAL-NEW-145: 延迟Oracle攻击
- Mock: Oracle价格严重滞后
- 验证:
  ✓ minOutput过时
  ✓ Swap可能失败或被攻击
  ✓ 建议: Oracle更新频率监控
```

---

## XII. Token恢复测试

```solidity
// TC-REBAL-NEW-146: 正常恢复
- 向Rebalancer误转代币
- owner调用recoverToken
- 验证:
  ✓ 代币转给owner
  ✓ Rebalancer余额清零

// TC-REBAL-NEW-147: 恢复ETF资产
- 恢复USDT（应该归还Core）
- 验证: owner有权恢复（emergency）

// TC-REBAL-NEW-148: 恢复native token（如果有）
- 验证: recoverToken不支持ETH（仅ERC20）
```

---

## XIII. Upgrade和Migration测试

```solidity
// TC-REBAL-NEW-149: 新旧算法对比
- 相同输入执行旧算法vs新算法
- 验证:
  ✓ 新算法权重收敛更快
  ✓ 新算法无估算误差

// TC-REBAL-NEW-150: 数据迁移
- 从旧Rebalancer迁移状态
- 验证:
  ✓ pool配置保留
  ✓ cooldown配置保留
  ✓ maxSlippage配置保留
```

---

## 测试执行策略

### 优先级分级
- **P0 (关键路径)**: TC-001至TC-060, TC-100至TC-105
- **P1 (核心功能)**: TC-061至TC-099
- **P2 (边界和安全)**: TC-106至TC-145
- **P3 (优化和集成)**: TC-146至TC-150

### Coverage目标
1. **Line Coverage**: 100%
   - 每一行代码至少被执行1次

2. **Branch Coverage**: 100%
   - 每个if/else分支都测试

3. **Function Coverage**: 100%
   - 所有public/external/internal函数都测试

4. **Path Coverage**: 尽可能高
   - 主要执行路径全覆盖

### 测试工具
- Forge test: 单元测试
- Forge coverage: 覆盖率报告
- Forge fuzz: 模糊测试
- Forge invariant: 不变量测试

### 执行命令
```bash
# 运行所有测试
forge test --match-contract ETFRebalancerV1

# 覆盖率报告
forge coverage --match-contract ETFRebalancerV1

# 详细覆盖率（LCOV格式）
forge coverage --report lcov --match-contract ETFRebalancerV1

# Gas报告
forge test --match-contract ETFRebalancerV1 --gas-report
```

---

## 已知Gap和待补充测试

### 当前失败测试（需修复）
1. ✅ TC-107, TC-108: 算法重构导致（需更新断言）
2. ✅ TC-325: 事件参数改变（需更新期望值）
3. ⚠️ CanRebalance cooldown边界测试（需修复逻辑）

### 新增测试需求
1. **权重比例分配验证** (TC-029至TC-037)
2. **最大缺口识别逻辑** (TC-032至TC-034)
3. **Dust处理机制** (TC-035至TC-037)
4. **ExactInput模式** (TC-038至TC-040)
5. **V2/V3混合路由** (TC-007至TC-009, TC-110至TC-112)
6. **Oracle vs DEX价格差异** (TC-106至TC-109)

### 覆盖率提升措施
- 补充Phase 2/3的边界测试
- 增加混合场景集成测试
- 添加极端市场条件模拟
- 增强安全性测试（Oracle操纵、Reentrancy）

---

## 总结

本测试计划覆盖150+测试用例，涵盖:
- ✅ 核心算法4个Phase的完整流程
- ✅ 所有public/external函数
- ✅ 所有error和event
- ✅ 边界条件和异常场景
- ✅ 安全性和Invariant验证
- ✅ Gas优化和性能基准

**目标**: 达到100% line/branch/function coverage，确保重构后的Rebalancer经过充分测试验证。
