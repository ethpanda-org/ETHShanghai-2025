# ETFRebalancerV1 完整测试计划 (100%覆盖率)

## 📋 文档版本
- **版本**: v2.0 (Complete)
- **日期**: 2025-09-30
- **状态**: 完整版 - 真正100%覆盖率
- **预计测试用例数**: ~120个

---

## 🎯 合约功能完整分析

### 核心功能模块
1. **executeRebalance()** - 主入口函数
2. **rebalanceCallback()** - 回调处理
3. **_sellAssetsForUSDT()** - Phase 1: 卖出资产
4. **_buyAssetsWithUSDT()** - Phase 2: 买入资产
5. **_returnAllAssets()** - Phase 3: 返还资产
6. **_swapAssetToUSDT()** - V3/V2 swap路由
7. **_swapUSDTToAsset()** - V3/V2 swap路由
8. **_validateSlippage()** - 滑点验证
9. **配置管理** - 池配置、参数设置
10. **紧急控制** - pause/unpause、代币恢复

### 代码路径分析
```
executeRebalance (Line 140-167)
  ├─ whenNotPaused modifier
  ├─ nonReentrant modifier
  ├─ cooldown check (142-144)
  ├─ needsRebalance check (147-150)
  ├─ getTotalValue (153)
  ├─ encode data (156)
  ├─ flashRebalance (157)
  │   └─> rebalanceCallback (175-197)
  │       ├─ msg.sender check (180-182)
  │       ├─ decode data (185)
  │       ├─ _sellAssetsForUSDT (190)
  │       │   └─> for each asset with positive amount
  │       │       ├─ if USDT: add to total
  │       │       ├─ if WBNB: _swapWBNBToUSDTV2
  │       │       └─ else: _swapAssetToUSDT (V3)
  │       ├─ _buyAssetsWithUSDT (193)
  │       │   ├─ calculate totalUSDTNeeded
  │       │   ├─ calculate scaleFactor
  │       │   └─> for each asset with negative amount
  │       │       ├─ if USDT: skip
  │       │       ├─ scale buyAmount if needed
  │       │       ├─ if WBNB: _swapUSDTToWBNBV2
  │       │       └─ else: _swapUSDTToAsset (V3)
  │       └─ _returnAllAssets (196)
  │           ├─ return each asset balance
  │           └─ return USDT balance
  ├─ update lastRebalanceTime (160)
  ├─ getTotalValue (163)
  ├─ _validateSlippage (164)
  └─ emit event (166)
```

---

## 📊 完整测试用例清单

### 1️⃣ Constructor Tests (构造函数测试)
**文件**: `ETFRebalancerV1.Constructor.t.sol`
**状态**: ✅ 已实现 (10/10通过)

| 测试用例ID | 测试名称 | 测试目标 | 状态 |
|-----------|---------|---------|------|
| TC-RB-001 | test_TC001_ValidConstructorParameters | 验证所有immutable参数 | ✅ |
| TC-RB-002 | test_TC002_ZeroAddressETFCore | 零地址ETFCore | ✅ |
| TC-RB-003 | test_TC003_ZeroAddressV3Router | 零地址V3Router | ✅ |
| TC-RB-004 | test_TC004_ZeroAddressV2Router | 零地址V2Router | ✅ |
| TC-RB-005 | test_TC005_ZeroAddressUSDT | 零地址USDT | ✅ |
| TC-RB-006 | test_TC006_ZeroAddressWBNB | 零地址WBNB | ✅ |
| TC-RB-007 | test_TC007_DefaultParameters | 默认参数值 | ✅ |
| TC-RB-008 | test_TC008_OwnerSetCorrectly | Owner设置 | ✅ |
| TC-RB-009 | test_TC009_NotPausedInitially | 初始未暂停 | ✅ |
| TC-RB-010 | test_TC010_MultipleIndependentDeployments | 多次独立部署 | ✅ |

**覆盖率**: 100%

---

### 2️⃣ CanRebalance Tests (Rebalance检查测试)
**文件**: `ETFRebalancerV1.CanRebalance.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-011 | test_CanRebalance_WhenReady | 满足所有条件 | (true, "Ready to rebalance") |
| TC-RB-012 | test_CanRebalance_CooldownNotMet | 冷却期未满 | (false, "Cooldown period not met") |
| TC-RB-013 | test_CanRebalance_NotNeeded | ETF不需要rebalance | (false, "Rebalance not needed") |
| TC-RB-014 | test_CanRebalance_JustAfterCooldown | 刚过冷却期 | (true, "Ready to rebalance") |
| TC-RB-015 | test_CanRebalance_BeforeCooldownBy1Second | 差1秒到冷却期 | (false, "Cooldown period not met") |
| TC-RB-016 | test_CanRebalance_FirstTime | 首次检查 | 根据needsRebalance决定 |
| TC-RB-017 | test_CanRebalance_BothConditionsFalse | 冷却未满且不需要 | (false, "Cooldown period not met") |

**覆盖率目标**: 100%

---

### 3️⃣ ExecuteRebalance Basic Tests (基础执行测试)
**文件**: `ETFRebalancerV1.ExecuteRebalance.t.sol`
**状态**: ✅ 已实现 (16/16通过)

| 测试用例ID | 测试名称 | 测试目标 | 状态 |
|-----------|---------|---------|------|
| TC-RB-020 | test_TC020_ExecuteRebalance_Success | 成功执行 | ✅ |
| TC-RB-021 | test_TC021_ExecuteRebalance_UpdatesTimestamp | 时间戳更新 | ✅ |
| TC-RB-022 | test_TC022_ExecuteRebalance_EmitsEvent | 事件发射 | ✅ |
| TC-RB-023 | test_TC023_ExecuteRebalance_RecordsExecutor | 记录executor | ✅ |
| TC-RB-024 | test_TC024_ExecuteRebalance_AnyoneCanCall | 任何人可调用 | ✅ |
| TC-RB-025 | test_TC025_ExecuteRebalance_MultipleExecutors | 多个executor | ✅ |
| TC-RB-026 | test_TC026_ExecuteRebalance_RevertWhenPaused | 暂停时revert | ✅ |
| TC-RB-027 | test_TC027_ExecuteRebalance_NonReentrant | 重入保护 | ✅ |
| TC-RB-028 | test_TC028_ExecuteRebalance_RevertCooldownNotMet | 冷却期未满 | ✅ |
| TC-RB-029 | test_TC029_ExecuteRebalance_CooldownExactBoundary | 冷却期边界 | ✅ |
| TC-RB-030 | test_TC030_ExecuteRebalance_CooldownMinus1Second | 差1秒 | ✅ |
| TC-RB-031 | test_TC031_ExecuteRebalance_FirstExecution | 首次执行 | ✅ |
| TC-RB-032 | test_TC032_ExecuteRebalance_AfterCooldownChange | 冷却期变更后 | ✅ |
| TC-RB-033 | test_TC033_ExecuteRebalance_RevertNotNeeded | 不需要rebalance | ✅ |
| TC-RB-034 | test_TC034_ExecuteRebalance_NeedsRebalanceTrue | needsRebalance=true | ✅ |
| TC-RB-035 | test_TC035_ExecuteRebalance_NeedsRebalanceChanges | 需求状态变化 | ✅ |

**覆盖率**: 80% (缺失滑点和回调验证)

---

### 4️⃣ ExecuteRebalance Slippage Tests (滑点保护测试)
**文件**: `ETFRebalancerV1.ExecuteRebalance.Slippage.t.sol`
**状态**: ⏳ 待实现 - **关键模块**

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-040 | test_Slippage_ValueNoChange | 价值不变 | 成功 |
| TC-RB-041 | test_Slippage_ValueIncrease | 价值增加10% | 成功 |
| TC-RB-042 | test_Slippage_ValueDecrease1Percent | 价值下降1% | 成功 |
| TC-RB-043 | test_Slippage_ValueDecrease3Percent | 价值下降3% (边界) | 成功 |
| TC-RB-044 | test_Slippage_ValueDecreaseExactly3Percent | 价值下降正好3% | 成功 |
| TC-RB-045 | test_Slippage_ValueDecrease3Point1Percent | 价值下降3.1% | revert SlippageExceeded |
| TC-RB-046 | test_Slippage_ValueDecrease5Percent | 价值下降5% | revert SlippageExceeded |
| TC-RB-047 | test_Slippage_WithMaxSlippage0 | maxSlippage=0 | 任何下降都revert |
| TC-RB-048 | test_Slippage_WithMaxSlippage500 | maxSlippage=500(5%) | 5%内通过 |
| TC-RB-049 | test_Slippage_WithMaxSlippage100 | maxSlippage=100(1%) | 1%内通过 |
| TC-RB-050 | test_Slippage_TotalValueBeforeZero | valueBefore=0 | 特殊处理 |
| TC-RB-051 | test_Slippage_TotalValueAfterZero | valueAfter=0 | revert |
| TC-RB-052 | test_Slippage_BothZero | 前后都为0 | 成功或特殊处理 |
| TC-RB-053 | test_Slippage_VeryLargeValues | 极大数值 | 不溢出 |
| TC-RB-054 | test_Slippage_VerySmallValues | 极小数值(灰尘) | 正确处理 |
| TC-RB-055 | test_Slippage_CalculationPrecision | 精度测试 | 准确计算 |

**覆盖目标**: _validateSlippage() 100%

---

### 5️⃣ RebalanceCallback Tests (回调函数测试)
**文件**: `ETFRebalancerV1.RebalanceCallback.t.sol`
**状态**: ⏳ 待实现 - **核心模块**

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-060 | test_Callback_OnlyETFCore | 非ETFCore调用 | revert NotETFCore |
| TC-RB-061 | test_Callback_ETFCoreCanCall | ETFCore调用 | 成功 |
| TC-RB-062 | test_Callback_DataDecode | 数据解码 | 正确解码executor和valueBefore |
| TC-RB-063 | test_Callback_EmptyArrays | 空资产数组 | 正常完成 |
| TC-RB-064 | test_Callback_SingleAsset | 单个资产 | 正确处理 |
| TC-RB-065 | test_Callback_MultipleAssets | 多个资产 | 正确处理 |
| TC-RB-066 | test_Callback_AllZeroAmounts | 所有amount=0 | 跳过swap |
| TC-RB-067 | test_Callback_OnlyPositiveAmounts | 只有正数(全卖) | 执行卖出 |
| TC-RB-068 | test_Callback_OnlyNegativeAmounts | 只有负数(全买) | 执行买入 |
| TC-RB-069 | test_Callback_MixedAmounts | 混合正负 | 先卖后买 |
| TC-RB-070 | test_Callback_AssetsArrayPassedCorrectly | assets数组传递 | 正确传递 |
| TC-RB-071 | test_Callback_AmountsArrayPassedCorrectly | amounts数组传递 | 正确传递 |
| TC-RB-072 | test_Callback_TriggersAllThreePhases | 触发三阶段 | 依次执行 |
| TC-RB-073 | test_Callback_ReturnsAllAssets | 返还所有资产 | 余额归零 |
| TC-RB-074 | test_Callback_NoOrphanedTokens | 无遗留代币 | rebalancer余额为0 |

**覆盖目标**: rebalanceCallback() 100%

---

### 6️⃣ SellAssets Tests (卖出资产测试)
**文件**: `ETFRebalancerV1.SellAssets.t.sol`
**状态**: ⏳ 待实现 - **核心逻辑**

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-080 | test_Sell_SingleAsset | 卖出单个资产 | 转为USDT |
| TC-RB-081 | test_Sell_MultipleAssets | 卖出多个资产 | 累计USDT |
| TC-RB-082 | test_Sell_USDT | 卖出USDT | 跳过swap，直接计数 |
| TC-RB-083 | test_Sell_WBNB | 卖出WBNB | 使用V2 Router |
| TC-RB-084 | test_Sell_BTC | 卖出BTC | 使用V3 Router |
| TC-RB-085 | test_Sell_ETH | 卖出ETH | 使用V3 Router |
| TC-RB-086 | test_Sell_WithConfiguredPool | 使用配置的池 | 使用正确fee |
| TC-RB-087 | test_Sell_WithoutConfiguredPool | 未配置池 | 使用默认fee(2500) |
| TC-RB-088 | test_Sell_ZeroAmount | amount=0 | 跳过 |
| TC-RB-089 | test_Sell_VerySmallAmount | 极小金额 | 正确处理 |
| TC-RB-090 | test_Sell_VeryLargeAmount | 极大金额 | 不溢出 |
| TC-RB-091 | test_Sell_UpdatesLastAssetRebalance | 更新时间戳 | lastAssetRebalance更新 |
| TC-RB-092 | test_Sell_EmitsAssetSwapped | 发射事件 | AssetSwapped事件 |
| TC-RB-093 | test_Sell_MultipleEmitMultipleEvents | 多次卖出 | 多个事件 |
| TC-RB-094 | test_Sell_ReturnsTotalUSDT | 返回总USDT | 正确累计 |
| TC-RB-095 | test_Sell_ApprovalSet | 设置approve | forceApprove正确调用 |
| TC-RB-096 | test_Sell_MixedWithNegativeAmounts | 混合正负amount | 只处理正数 |
| TC-RB-097 | test_Sell_SkipsZeroAndNegative | 跳过0和负数 | 不处理 |

**覆盖目标**: _sellAssetsForUSDT() + _swapAssetToUSDT() + _swapWBNBToUSDTV2() 100%

---

### 7️⃣ BuyAssets Tests (买入资产测试)
**文件**: `ETFRebalancerV1.BuyAssets.t.sol`
**状态**: ⏳ 待实现 - **核心逻辑**

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-100 | test_Buy_SingleAsset | 买入单个资产 | USDT转为资产 |
| TC-RB-101 | test_Buy_MultipleAssets | 买入多个资产 | 分配USDT |
| TC-RB-102 | test_Buy_USDT | 买入USDT | 跳过swap |
| TC-RB-103 | test_Buy_WBNB | 买入WBNB | 使用V2 Router |
| TC-RB-104 | test_Buy_BTC | 买入BTC | 使用V3 Router |
| TC-RB-105 | test_Buy_ETH | 买入ETH | 使用V3 Router |
| TC-RB-106 | test_Buy_WithSufficientUSDT | USDT充足 | scaleFactor=1e18 |
| TC-RB-107 | test_Buy_WithInsufficientUSDT | USDT不足 | scaleFactor<1e18 |
| TC-RB-108 | test_Buy_ScalingApplied | 应用缩放 | buyAmount按比例缩小 |
| TC-RB-109 | test_Buy_ScalingNotApplied | 不应用缩放 | buyAmount不变 |
| TC-RB-110 | test_Buy_EstimateUSDTNeeded | 估算USDT需求 | 总需求正确计算 |
| TC-RB-111 | test_Buy_SkipUSDTInCalculation | 计算时跳过USDT | 不计入totalUSDTNeeded |
| TC-RB-112 | test_Buy_SkipUSDTInExecution | 执行时跳过USDT | continue跳过 |
| TC-RB-113 | test_Buy_WithConfiguredPool | 使用配置的池 | 正确fee |
| TC-RB-114 | test_Buy_WithoutConfiguredPool | 未配置池 | 默认fee |
| TC-RB-115 | test_Buy_UpdatesLastAssetRebalance | 更新时间戳 | 正确更新 |
| TC-RB-116 | test_Buy_EmitsAssetSwapped | 发射事件 | 每次swap发射 |
| TC-RB-117 | test_Buy_ApprovalSet | 设置approve | forceApprove USDT |
| TC-RB-118 | test_Buy_MinimumOutputSlippage | 5%滑点保护 | amountOutMinimum正确 |
| TC-RB-119 | test_Buy_EstimationWith5PercentBuffer | 估算含5%缓冲 | amount*105/100 |
| TC-RB-120 | test_Buy_MixedWithPositiveAmounts | 混合正负amount | 只处理负数 |
| TC-RB-121 | test_Buy_SkipsZeroAndPositive | 跳过0和正数 | 不处理 |
| TC-RB-122 | test_Buy_ExactlyAvailableUSDT | USDT刚好足够 | scaleFactor=1e18 |
| TC-RB-123 | test_Buy_HalfAvailableUSDT | USDT只有一半 | scaleFactor=0.5e18 |

**覆盖目标**: _buyAssetsWithUSDT() + _swapUSDTToAsset() + _swapUSDTToWBNBV2() + _estimateUSDTForAsset() 100%

---

### 8️⃣ ReturnAssets Tests (返还资产测试)
**文件**: `ETFRebalancerV1.ReturnAssets.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-130 | test_Return_AllAssetsNonZero | 所有资产有余额 | 全部返还 |
| TC-RB-131 | test_Return_SomeAssetsZero | 部分余额为0 | 只返还非零 |
| TC-RB-132 | test_Return_AllAssetsZero | 全部余额为0 | 无转账 |
| TC-RB-133 | test_Return_IncludesUSDT | USDT余额存在 | USDT也返还 |
| TC-RB-134 | test_Return_OnlyUSDT | 只有USDT余额 | 只返USDT |
| TC-RB-135 | test_Return_NoUSDT | 无USDT余额 | 只返其他资产 |
| TC-RB-136 | test_Return_RebalancerBalanceZero | 返还后余额 | rebalancer余额全为0 |
| TC-RB-137 | test_Return_ETFCoreReceivesAll | ETFCore接收 | ETFCore余额增加 |
| TC-RB-138 | test_Return_UseSafeTransfer | 使用safeTransfer | 安全转账 |
| TC-RB-139 | test_Return_LoopThroughAllAssets | 遍历所有资产 | 每个都检查 |

**覆盖目标**: _returnAllAssets() 100%

---

### 9️⃣ SwapRouting Tests (Swap路由测试)
**文件**: `ETFRebalancerV1.SwapRouting.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-150 | test_Swap_V3_ExactInputSingle | V3 exactInputSingle | 正确参数 |
| TC-RB-151 | test_Swap_V3_WithFeeLow | V3 fee=500 | 正确使用 |
| TC-RB-152 | test_Swap_V3_WithFeeMedium | V3 fee=2500 | 正确使用 |
| TC-RB-153 | test_Swap_V3_WithFeeHigh | V3 fee=10000 | 正确使用 |
| TC-RB-154 | test_Swap_V3_DefaultFee | 未配置时 | 使用2500 |
| TC-RB-155 | test_Swap_V2_ExactTokensForTokens | V2 swap exact in | 正确路径 |
| TC-RB-156 | test_Swap_V2_TokensForExactTokens | V2 swap exact out | 正确路径 |
| TC-RB-157 | test_Swap_V2_GetAmountsIn | V2 quote | 正确调用 |
| TC-RB-158 | test_Swap_WBNB_AlwaysUsesV2 | WBNB路由 | 始终V2 |
| TC-RB-159 | test_Swap_NonWBNB_UsesV3 | 非WBNB路由 | 始终V3 |
| TC-RB-160 | test_Swap_DeadlineBlockTimestamp | deadline参数 | block.timestamp |
| TC-RB-161 | test_Swap_RecipientIsThis | recipient参数 | address(this) |
| TC-RB-162 | test_Swap_AmountOutMinimum_Sell | 卖出时最小输出 | 0 (聚合检查) |
| TC-RB-163 | test_Swap_AmountOutMinimum_Buy | 买入时最小输出 | 95% slippage |
| TC-RB-164 | test_Swap_ApproveBeforeSwap | swap前approve | forceApprove调用 |

**覆盖目标**: Swap路由逻辑 100%

---

### 🔟 PoolConfiguration Tests (池配置测试)
**文件**: `ETFRebalancerV1.PoolConfiguration.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-170 | test_Config_SinglePool | 配置单个池 | 正确设置 |
| TC-RB-171 | test_Config_OnlyOwner | 非owner调用 | revert |
| TC-RB-172 | test_Config_EmitsEvent | 发射事件 | PoolConfigured |
| TC-RB-173 | test_Config_UpdateExisting | 更新已配置 | 覆盖旧值 |
| TC-RB-174 | test_Config_ZeroAddresses | 零地址配置 | 接受(重置) |
| TC-RB-175 | test_Config_DifferentFees | 不同fee tier | 都可配置 |
| TC-RB-176 | test_Config_BatchSuccess | 批量配置 | 全部成功 |
| TC-RB-177 | test_Config_BatchOnlyOwner | 批量非owner | revert |
| TC-RB-178 | test_Config_BatchLengthMismatch_AssetsVsPools | 长度不匹配1 | revert InvalidConfiguration |
| TC-RB-179 | test_Config_BatchLengthMismatch_PoolsVsFees | 长度不匹配2 | revert InvalidConfiguration |
| TC-RB-180 | test_Config_BatchEmptyArrays | 空数组 | 成功(无操作) |
| TC-RB-181 | test_Config_BatchEmitsMultiple | 批量事件 | 每个都发射 |
| TC-RB-182 | test_Config_AssetPoolsMapping | assetPools映射 | 正确存储 |
| TC-RB-183 | test_Config_PoolFeesMapping | poolFees映射 | 正确存储 |

**覆盖目标**: configureAssetPool() + configureAssetPools() 100%

---

### 1️⃣1️⃣ ParameterSettings Tests (参数设置测试)
**文件**: `ETFRebalancerV1.ParameterSettings.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-190 | test_Param_SetMaxSlippage_Success | 设置有效滑点 | 成功 |
| TC-RB-191 | test_Param_SetMaxSlippage_OnlyOwner | 非owner | revert |
| TC-RB-192 | test_Param_SetMaxSlippage_ExceedsMax | 超过500 | revert SlippageExceeded |
| TC-RB-193 | test_Param_SetMaxSlippage_AtBoundary | 设为500 | 成功 |
| TC-RB-194 | test_Param_SetMaxSlippage_Zero | 设为0 | 成功 |
| TC-RB-195 | test_Param_SetCooldownPeriod_Success | 设置冷却期 | 成功 |
| TC-RB-196 | test_Param_SetCooldownPeriod_OnlyOwner | 非owner | revert |
| TC-RB-197 | test_Param_SetCooldownPeriod_Zero | 设为0 | 成功(无冷却) |
| TC-RB-198 | test_Param_SetCooldownPeriod_Large | 设为7天 | 成功 |
| TC-RB-199 | test_Param_SetMinRebalanceAmount_Success | 设置最小金额 | 成功 |
| TC-RB-200 | test_Param_SetMinRebalanceAmount_OnlyOwner | 非owner | revert |
| TC-RB-201 | test_Param_SetMinRebalanceAmount_Zero | 设为0 | 成功 |
| TC-RB-202 | test_Param_SetMinRebalanceAmount_Large | 设大值 | 成功 |

**覆盖目标**: setMaxSlippage() + setCooldownPeriod() + setMinRebalanceAmount() 100%

---

### 1️⃣2️⃣ PauseUnpause Tests (暂停功能测试)
**文件**: `ETFRebalancerV1.PauseUnpause.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-210 | test_Pause_Success | owner暂停 | paused=true |
| TC-RB-211 | test_Pause_OnlyOwner | 非owner暂停 | revert |
| TC-RB-212 | test_Pause_EmitsEvent | 事件 | Paused |
| TC-RB-213 | test_Pause_BlocksExecuteRebalance | 阻止rebalance | revert |
| TC-RB-214 | test_Pause_AlreadyPaused | 重复暂停 | revert |
| TC-RB-215 | test_Unpause_Success | owner恢复 | paused=false |
| TC-RB-216 | test_Unpause_OnlyOwner | 非owner恢复 | revert |
| TC-RB-217 | test_Unpause_EmitsEvent | 事件 | Unpaused |
| TC-RB-218 | test_Unpause_AllowsExecuteRebalance | 允许rebalance | 成功 |
| TC-RB-219 | test_Unpause_AlreadyUnpaused | 重复恢复 | revert |

**覆盖目标**: pause() + unpause() 100%

---

### 1️⃣3️⃣ TokenRecovery Tests (代币恢复测试)
**文件**: `ETFRebalancerV1.TokenRecovery.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-230 | test_Recover_Success | owner恢复 | 代币转移到owner |
| TC-RB-231 | test_Recover_OnlyOwner | 非owner | revert |
| TC-RB-232 | test_Recover_MultipleTokens | 多种代币 | 都转移 |
| TC-RB-233 | test_Recover_PartialAmount | 部分余额 | 转指定数量 |
| TC-RB-234 | test_Recover_FullBalance | 全部余额 | 转所有 |
| TC-RB-235 | test_Recover_ZeroAmount | 0数量 | 成功(无操作) |
| TC-RB-236 | test_Recover_USDT | 恢复USDT | 成功 |
| TC-RB-237 | test_Recover_WBNB | 恢复WBNB | 成功 |
| TC-RB-238 | test_Recover_AfterRebalance | rebalance后 | 成功 |

**覆盖目标**: recoverToken() 100%

---

### 1️⃣4️⃣ Integration Tests (集成测试)
**文件**: `ETFRebalancerV1.Integration.t.sol`
**状态**: ⏳ 待实现 - **重要**

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-250 | test_Integration_CompleteRebalanceFlow | 完整端到端 | 从开始到结束 |
| TC-RB-251 | test_Integration_SellOneAssetBuyAnother | 卖出买入流程 | 资产重新分配 |
| TC-RB-252 | test_Integration_MultipleAssetRebalance | 多资产调整 | 所有资产正确 |
| TC-RB-253 | test_Integration_WithRealPriceChanges | 价格变化影响 | 正确应对 |
| TC-RB-254 | test_Integration_LargeScaleRebalance | 大规模调整 | 正确处理 |
| TC-RB-255 | test_Integration_SmallScaleRebalance | 小规模调整 | 正确处理 |
| TC-RB-256 | test_Integration_MultipleRounds | 多轮rebalance | 连续成功 |
| TC-RB-257 | test_Integration_AfterWeightAdjustment | 权重调整后 | 正确rebalance |
| TC-RB-258 | test_Integration_WithSlippageLimit | 接近滑点限制 | 边界测试 |
| TC-RB-259 | test_Integration_TokenBalanceVerification | 余额验证 | 无遗留代币 |
| TC-RB-260 | test_Integration_EventSequenceVerification | 事件序列 | 正确顺序 |
| TC-RB-261 | test_Integration_StateConsistency | 状态一致性 | 所有状态正确 |

**覆盖目标**: 完整流程验证

---

### 1️⃣5️⃣ EdgeCases Tests (边界情况测试)
**文件**: `ETFRebalancerV1.EdgeCases.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-280 | test_Edge_SingleAssetETF | 单资产ETF | 正确处理 |
| TC-RB-281 | test_Edge_TwoAssetETF | 双资产ETF | 正确处理 |
| TC-RB-282 | test_Edge_TenAssetETF | 10资产ETF | 正确处理 |
| TC-RB-283 | test_Edge_MaxInt256Amount | 最大int256 | 不溢出 |
| TC-RB-284 | test_Edge_MinInt256Amount | 最小int256 | 正确处理负数 |
| TC-RB-285 | test_Edge_NegativeToPositiveConversion | 负转正 | 正确abs |
| TC-RB-286 | test_Edge_VerySmallDustAmounts | 灰尘金额 | 正确处理 |
| TC-RB-287 | test_Edge_MaxUint256Value | 最大uint256 | 不溢出 |
| TC-RB-288 | test_Edge_ScaleFactorNearZero | scaleFactor接近0 | 正确缩放 |
| TC-RB-289 | test_Edge_ScaleFactorExactly1e18 | scaleFactor=1e18 | 不缩放 |
| TC-RB-290 | test_Edge_AllUSDTETF | 全USDT的ETF | 跳过所有swap |
| TC-RB-291 | test_Edge_NoUSDTInETF | 无USDT的ETF | 正常swap |

**覆盖目标**: 极端情况和边界值

---

### 1️⃣6️⃣ Security Tests (安全测试)
**文件**: `ETFRebalancerV1.Security.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-300 | test_Security_ReentrancyProtection | 重入攻击 | 阻止 |
| TC-RB-301 | test_Security_OnlyETFCoreCallback | 回调访问控制 | 只ETFCore可调 |
| TC-RB-302 | test_Security_OwnershipFunctions | owner权限 | 只owner可调 |
| TC-RB-303 | test_Security_PauseProtection | 暂停保护 | 暂停时阻止 |
| TC-RB-304 | test_Security_ApprovalManagement | approve管理 | forceApprove安全 |
| TC-RB-305 | test_Security_NoFrontrunning | 防抢跑 | deadline+slippage |
| TC-RB-306 | test_Security_IntegerOverflow | 整数溢出 | Solidity 0.8+保护 |
| TC-RB-307 | test_Security_UnauthorizedRecovery | 未授权恢复 | revert |
| TC-RB-308 | test_Security_SlippageManipulation | 滑点操纵 | 检测并revert |

**覆盖目标**: 安全机制验证

---

### 1️⃣7️⃣ Events Tests (事件测试)
**文件**: `ETFRebalancerV1.Events.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-320 | test_Event_RebalanceExecuted_Parameters | RebalanceExecuted参数 | 所有参数正确 |
| TC-RB-321 | test_Event_RebalanceExecuted_Indexed | indexed字段 | executor indexed |
| TC-RB-322 | test_Event_AssetSwapped_OnSell | 卖出时AssetSwapped | 正确参数 |
| TC-RB-323 | test_Event_AssetSwapped_OnBuy | 买入时AssetSwapped | 正确参数 |
| TC-RB-324 | test_Event_AssetSwapped_Multiple | 多次swap | 多个事件 |
| TC-RB-325 | test_Event_AssetSwapped_Sequence | 事件顺序 | 按swap顺序 |
| TC-RB-326 | test_Event_PoolConfigured | PoolConfigured | 正确参数 |
| TC-RB-327 | test_Event_Paused | Paused | 正确触发 |
| TC-RB-328 | test_Event_Unpaused | Unpaused | 正确触发 |

**覆盖目标**: 所有事件正确发射

---

### 1️⃣8️⃣ Gas Optimization Tests (Gas测试)
**文件**: `ETFRebalancerV1.Gas.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-340 | test_Gas_ExecuteRebalance | rebalance gas | 记录baseline |
| TC-RB-341 | test_Gas_ConfigurePool | 配置池gas | 记录baseline |
| TC-RB-342 | test_Gas_BatchConfigure | 批量配置gas | 记录优化效果 |
| TC-RB-343 | test_Gas_SmallRebalance | 小额rebalance | 记录gas |
| TC-RB-344 | test_Gas_LargeRebalance | 大额rebalance | 记录gas |

**覆盖目标**: Gas benchmarking

---

### 1️⃣9️⃣ Fuzz Tests (模糊测试)
**文件**: `ETFRebalancerV1.Fuzz.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-360 | testFuzz_SetMaxSlippage | 随机滑点值 | ≤500成功 |
| TC-RB-361 | testFuzz_SetCooldownPeriod | 随机冷却期 | 都成功 |
| TC-RB-362 | testFuzz_RebalanceAmounts | 随机金额 | 正确处理 |
| TC-RB-363 | testFuzz_AssetCount | 随机资产数 | 1-20正确 |
| TC-RB-364 | testFuzz_MixedAmounts | 随机正负组合 | 正确买卖 |
| TC-RB-365 | testFuzz_SlippageValidation | 随机价值变化 | 正确验证 |

**覆盖目标**: 参数随机性

---

### 2️⃣0️⃣ Invariant Tests (不变量测试)
**文件**: `ETFRebalancerV1.Invariant.t.sol`
**状态**: ⏳ 待实现

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-380 | invariant_NoOrphanedTokens | rebalancer无余额 | 始终为0 |
| TC-RB-381 | invariant_CooldownRespected | 冷却期遵守 | 始终遵守 |
| TC-RB-382 | invariant_SlippageProtection | 滑点保护 | 始终有效 |
| TC-RB-383 | invariant_OnlyETFCoreCallback | 回调限制 | 始终验证 |
| TC-RB-384 | invariant_OwnershipIntact | owner权限 | 始终有效 |
| TC-RB-385 | invariant_PauseBlocks | 暂停阻止 | 始终阻止 |

**覆盖目标**: 系统不变量

---

## 📈 完整覆盖率统计

| 模块 | 测试文件数 | 测试用例数 | 当前状态 | 覆盖率目标 |
|------|----------|-----------|---------|-----------|
| Constructor | 1 | 10 | ✅ 完成 | 100% |
| CanRebalance | 1 | 7 | ⏳ 待实现 | 100% |
| ExecuteRebalance Basic | 1 | 16 | ✅ 完成 | 80% |
| ExecuteRebalance Slippage | 1 | 16 | ⏳ 待实现 | 100% |
| RebalanceCallback | 1 | 15 | ⏳ 待实现 | 100% |
| SellAssets | 1 | 18 | ⏳ 待实现 | 100% |
| BuyAssets | 1 | 24 | ⏳ 待实现 | 100% |
| ReturnAssets | 1 | 10 | ⏳ 待实现 | 100% |
| SwapRouting | 1 | 15 | ⏳ 待实现 | 100% |
| PoolConfiguration | 1 | 14 | ⏳ 待实现 | 100% |
| ParameterSettings | 1 | 13 | ⏳ 待实现 | 100% |
| PauseUnpause | 1 | 10 | ⏳ 待实现 | 100% |
| TokenRecovery | 1 | 9 | ⏳ 待实现 | 100% |
| Integration | 1 | 12 | ⏳ 待实现 | 100% |
| EdgeCases | 1 | 12 | ⏳ 待实现 | 100% |
| Security | 1 | 9 | ⏳ 待实现 | 100% |
| Events | 1 | 9 | ⏳ 待实现 | 100% |
| Gas | 1 | 5 | ⏳ 待实现 | N/A |
| Fuzz | 1 | 6 | ⏳ 待实现 | N/A |
| Invariant | 1 | 6 | ⏳ 待实现 | N/A |
| **总计** | **20** | **~216** | **26完成** | **100%** |

---

## 🎯 优先级排序

### P0 - 最高优先级（核心功能）
1. ✅ Constructor Tests - 已完成
2. ✅ ExecuteRebalance Basic - 已完成
3. ⏳ ExecuteRebalance Slippage - **关键**
4. ⏳ RebalanceCallback - **核心**
5. ⏳ SellAssets - **核心逻辑**
6. ⏳ BuyAssets - **核心逻辑**
7. ⏳ ReturnAssets - **核心逻辑**

### P1 - 高优先级（重要功能）
8. ⏳ SwapRouting
9. ⏳ Integration
10. ⏳ Security
11. ⏳ CanRebalance

### P2 - 中优先级（管理功能）
12. ⏳ PoolConfiguration
13. ⏳ ParameterSettings
14. ⏳ PauseUnpause
15. ⏳ TokenRecovery

### P3 - 低优先级（辅助功能）
16. ⏳ Events
17. ⏳ EdgeCases
18. ⏳ Gas
19. ⏳ Fuzz
20. ⏳ Invariant

---

## 🔍 函数覆盖清单

### External/Public Functions
- [x] constructor() - 100%
- [ ] canRebalance() - 0%
- [x] executeRebalance() - 80% (缺滑点验证)
- [ ] rebalanceCallback() - 0%
- [ ] configureAssetPool() - 0%
- [ ] configureAssetPools() - 0%
- [ ] setMaxSlippage() - 0%
- [ ] setCooldownPeriod() - 0%
- [ ] setMinRebalanceAmount() - 0%
- [ ] pause() - 0%
- [ ] unpause() - 0%
- [ ] recoverToken() - 0%

### Private Functions
- [ ] _sellAssetsForUSDT() - 0%
- [ ] _buyAssetsWithUSDT() - 0%
- [ ] _swapAssetToUSDT() - 0%
- [ ] _swapUSDTToAsset() - 0%
- [ ] _swapWBNBToUSDTV2() - 0%
- [ ] _swapUSDTToWBNBV2() - 0%
- [ ] _estimateUSDTForAsset() - 0%
- [ ] _returnAllAssets() - 0%
- [ ] _validateSlippage() - 0%

### Modifiers
- [x] onlyOwner - 部分
- [x] whenNotPaused - 部分
- [x] nonReentrant - 部分

### Errors
- [x] NotETFCore - 0%
- [x] RebalanceNotNeeded - 100%
- [x] CooldownNotMet - 100%
- [ ] SlippageExceeded - 0% **重要**
- [ ] InsufficientOutput - 0%
- [ ] InvalidConfiguration - 0%

### Events
- [x] RebalanceExecuted - 100%
- [ ] AssetSwapped - 0% **重要**
- [ ] PoolConfigured - 0%

---

## 📝 实现进度

### 已完成 (2/20)
- ✅ Constructor Tests (10/10)
- ✅ ExecuteRebalance Basic (16/16)

### 进行中 (0/20)
- 无

### 待实现 (18/20)
- ⏳ 其余18个测试模块

---

## ✅ 验收标准

1. ✅ **代码覆盖率**: 100%行覆盖和分支覆盖
2. ✅ **所有测试通过**: 无失败用例
3. ✅ **边界测试**: 所有边界条件覆盖
4. ✅ **安全测试**: 通过所有安全检查
5. ✅ **集成测试**: 端到端流程验证
6. ✅ **Gas优化**: 识别优化机会
7. ✅ **模糊测试**: 随机输入通过
8. ✅ **不变量测试**: 系统不变量保持

---

**文档状态**: Complete - 真正100%覆盖率计划
**下一步**: 按优先级实现剩余测试模块