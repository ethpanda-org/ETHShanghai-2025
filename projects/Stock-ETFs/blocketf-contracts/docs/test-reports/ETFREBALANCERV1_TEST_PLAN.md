# ETFRebalancerV1 测试计划文档

## 📋 概述

本文档包含ETFRebalancerV1合约的完整测试计划，旨在实现100%代码覆盖率。测试用例涵盖所有功能、边界条件、安全检查和异常路径。

---

## 🎯 合约功能分析

### 核心功能
1. **Rebalance执行** - executeRebalance()
2. **Rebalance回调** - rebalanceCallback()
3. **配置管理** - 池配置、参数设置
4. **管理功能** - pause/unpause、代币恢复

### 关键特性
- Flash rebalance机制
- USDT作为中间代币的双阶段swap
- V3和V2 Router支持
- 滑点保护
- 冷却期机制
- 可暂停功能
- 重入保护

---

## 📊 测试用例清单

### 1️⃣ Constructor Tests (构造函数测试)
**文件**: `ETFRebalancerV1.Constructor.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-001 | test_ValidConstructorParameters | 验证构造函数正确初始化所有参数 | 所有immutable变量正确设置 |
| TC-RB-002 | test_ZeroAddressETFCore | 测试零地址ETFCore | 构造函数应revert |
| TC-RB-003 | test_ZeroAddressV3Router | 测试零地址V3Router | 构造函数应revert |
| TC-RB-004 | test_ZeroAddressV2Router | 测试零地址V2Router | 构造函数应revert |
| TC-RB-005 | test_ZeroAddressUSDT | 测试零地址USDT | 构造函数应revert |
| TC-RB-006 | test_ZeroAddressWBNB | 测试零地址WBNB | 构造函数应revert |
| TC-RB-007 | test_DefaultParameters | 验证默认参数值 | maxSlippage=300, cooldownPeriod=1 hours, minRebalanceAmount=100e18 |
| TC-RB-008 | test_OwnerSetCorrectly | 验证owner正确设置 | owner() == msg.sender |

**覆盖目标**: 构造函数 + 初始化状态

---

### 2️⃣ CanRebalance Tests (Rebalance检查测试)
**文件**: `ETFRebalancerV1.CanRebalance.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-010 | test_CanRebalance_WhenReady | 当满足所有条件时检查 | 返回(true, "Ready to rebalance") |
| TC-RB-011 | test_CanRebalance_CooldownNotMet | 冷却期未满时检查 | 返回(false, "Cooldown period not met") |
| TC-RB-012 | test_CanRebalance_NotNeeded | ETF不需要rebalance时 | 返回(false, "Rebalance not needed") |
| TC-RB-013 | test_CanRebalance_JustAfterCooldown | 刚过冷却期时检查 | 返回(true, "Ready to rebalance") |
| TC-RB-014 | test_CanRebalance_BeforeCooldownBy1Second | 冷却期差1秒时检查 | 返回(false, "Cooldown period not met") |
| TC-RB-015 | test_CanRebalance_AfterPreviousRebalance | 在上次rebalance后检查 | 根据时间和需求返回正确结果 |

**覆盖目标**: canRebalance() 函数及其所有分支

---

### 3️⃣ ExecuteRebalance Tests (执行Rebalance测试)
**文件**: `ETFRebalancerV1.ExecuteRebalance.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-020 | test_ExecuteRebalance_Success | 成功执行rebalance | 触发RebalanceExecuted事件 |
| TC-RB-021 | test_ExecuteRebalance_UpdatesTimestamp | 验证时间戳更新 | lastRebalanceTime更新为block.timestamp |
| TC-RB-022 | test_ExecuteRebalance_RevertCooldownNotMet | 冷却期未满时执行 | revert CooldownNotMet |
| TC-RB-023 | test_ExecuteRebalance_RevertNotNeeded | 不需要rebalance时执行 | revert RebalanceNotNeeded |
| TC-RB-024 | test_ExecuteRebalance_RevertWhenPaused | 合约暂停时执行 | revert (Pausable) |
| TC-RB-025 | test_ExecuteRebalance_SlippageProtection | 验证滑点保护 | 超过maxSlippage时revert |
| TC-RB-026 | test_ExecuteRebalance_EmitsEvent | 验证事件发射 | 包含正确参数的事件 |
| TC-RB-027 | test_ExecuteRebalance_NonReentrant | 测试重入保护 | 不能重入执行 |
| TC-RB-028 | test_ExecuteRebalance_MultipleSequential | 连续多次执行 | 每次都遵守冷却期 |
| TC-RB-029 | test_ExecuteRebalance_ValuePreservation | 验证价值保留 | 前后总价值在滑点范围内 |

**覆盖目标**: executeRebalance() 函数及其所有保护机制

---

### 4️⃣ RebalanceCallback Tests (回调函数测试)
**文件**: `ETFRebalancerV1.RebalanceCallback.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-040 | test_RebalanceCallback_OnlyETFCore | 非ETFCore调用 | revert NotETFCore |
| TC-RB-041 | test_RebalanceCallback_SellAssets | 卖出资产（正值） | 资产转换为USDT |
| TC-RB-042 | test_RebalanceCallback_BuyAssets | 买入资产（负值） | USDT转换为资产 |
| TC-RB-043 | test_RebalanceCallback_MixedOperations | 同时买卖多种资产 | 正确执行所有操作 |
| TC-RB-044 | test_RebalanceCallback_USDTHandling | USDT在资产列表中 | 跳过swap，直接计数 |
| TC-RB-045 | test_RebalanceCallback_ZeroAmounts | 某些资产amount为0 | 跳过这些资产 |
| TC-RB-046 | test_RebalanceCallback_AllZero | 所有amount为0 | 正常完成，无swap |
| TC-RB-047 | test_RebalanceCallback_ReturnAssets | 验证资产返还 | 所有余额返还给ETFCore |
| TC-RB-048 | test_RebalanceCallback_ReturnRemainingUSDT | 验证剩余USDT返还 | 余额USDT返还给ETFCore |
| TC-RB-049 | test_RebalanceCallback_UpdateAssetTimestamps | 验证lastAssetRebalance更新 | 操作的资产时间戳更新 |
| TC-RB-050 | test_RebalanceCallback_DecodeData | 验证数据解码 | 正确解码executor和valueBefore |

**覆盖目标**: rebalanceCallback() 函数及其三阶段逻辑

---

### 5️⃣ SwapAssetToUSDT Tests (资产->USDT Swap测试)
**文件**: `ETFRebalancerV1.SwapAssetToUSDT.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-060 | test_SwapAssetToUSDT_V3WithConfiguredPool | 使用配置的V3池 | 使用正确fee和池地址 |
| TC-RB-061 | test_SwapAssetToUSDT_V3DefaultFee | 未配置池时使用默认fee | 使用2500 (0.25%) fee |
| TC-RB-062 | test_SwapAssetToUSDT_WBNB_UseV2 | WBNB使用V2 | 调用V2Router |
| TC-RB-063 | test_SwapAssetToUSDT_ApprovalSet | 验证approve调用 | forceApprove到v3Router |
| TC-RB-064 | test_SwapAssetToUSDT_EmitsEvent | 验证AssetSwapped事件 | 正确参数的事件 |
| TC-RB-065 | test_SwapAssetToUSDT_MultipleAssets | 多个资产顺序swap | 累计totalUSDT正确 |
| TC-RB-066 | test_SwapAssetToUSDT_USDTSkipped | USDT资产跳过swap | 直接加到totalUSDT |

**覆盖目标**: _swapAssetToUSDT() + _swapWBNBToUSDTV2()

---

### 6️⃣ SwapUSDTToAsset Tests (USDT->资产 Swap测试)
**文件**: `ETFRebalancerV1.SwapUSDTToAsset.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-070 | test_SwapUSDTToAsset_V3WithConfiguredPool | 使用配置的V3池 | 使用正确fee |
| TC-RB-071 | test_SwapUSDTToAsset_V3DefaultFee | 未配置池时 | 使用2500默认fee |
| TC-RB-072 | test_SwapUSDTToAsset_WBNB_UseV2 | WBNB使用V2 | 调用V2Router |
| TC-RB-073 | test_SwapUSDTToAsset_ApprovalSet | 验证USDT approve | forceApprove到router |
| TC-RB-074 | test_SwapUSDTToAsset_ScalingWhenInsufficient | USDT不足时缩放 | 按比例购买所有资产 |
| TC-RB-075 | test_SwapUSDTToAsset_NoScalingWhenSufficient | USDT充足时 | 不缩放，全额购买 |
| TC-RB-076 | test_SwapUSDTToAsset_MinimumOutput | 验证5%滑点保护 | amountOutMinimum正确设置 |
| TC-RB-077 | test_SwapUSDTToAsset_USDTSkipped | USDT资产跳过 | continue跳过 |
| TC-RB-078 | test_SwapUSDTToAsset_EmitsEvent | 验证事件发射 | 每次swap发射事件 |
| TC-RB-079 | test_SwapUSDTToAsset_Estimation | 验证估算逻辑 | _estimateUSDTForAsset正确 |

**覆盖目标**: _buyAssetsWithUSDT() + _swapUSDTToAsset() + _swapUSDTToWBNBV2()

---

### 7️⃣ Pool Configuration Tests (池配置测试)
**文件**: `ETFRebalancerV1.PoolConfiguration.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-090 | test_ConfigureAssetPool_Success | 配置单个资产池 | assetPools和poolFees正确设置 |
| TC-RB-091 | test_ConfigureAssetPool_OnlyOwner | 非owner调用 | revert OwnableUnauthorizedAccount |
| TC-RB-092 | test_ConfigureAssetPool_EmitsEvent | 验证事件发射 | PoolConfigured事件 |
| TC-RB-093 | test_ConfigureAssetPool_UpdateExisting | 更新已存在配置 | 覆盖旧配置 |
| TC-RB-094 | test_ConfigureAssetPool_ZeroAddresses | 配置零地址 | 接受（可能用于重置） |
| TC-RB-095 | test_ConfigureAssetPool_DifferentFees | 测试不同fee tier | 500/2500/10000都可配置 |
| TC-RB-096 | test_ConfigureAssetPools_BatchSuccess | 批量配置成功 | 所有资产正确配置 |
| TC-RB-097 | test_ConfigureAssetPools_BatchOnlyOwner | 非owner批量调用 | revert |
| TC-RB-098 | test_ConfigureAssetPools_LengthMismatch_Assets | assets和pools长度不匹配 | revert InvalidConfiguration |
| TC-RB-099 | test_ConfigureAssetPools_LengthMismatch_Fees | pools和fees长度不匹配 | revert InvalidConfiguration |
| TC-RB-100 | test_ConfigureAssetPools_EmptyArrays | 空数组 | 成功，无操作 |
| TC-RB-101 | test_ConfigureAssetPools_EmitsMultipleEvents | 批量配置事件 | 每个资产都发射事件 |

**覆盖目标**: configureAssetPool() + configureAssetPools()

---

### 8️⃣ Parameter Settings Tests (参数设置测试)
**文件**: `ETFRebalancerV1.ParameterSettings.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-110 | test_SetMaxSlippage_Success | 设置有效滑点 | maxSlippage更新 |
| TC-RB-111 | test_SetMaxSlippage_OnlyOwner | 非owner调用 | revert |
| TC-RB-112 | test_SetMaxSlippage_ExceedsMax | 超过MAX_SLIPPAGE(500) | revert SlippageExceeded |
| TC-RB-113 | test_SetMaxSlippage_AtBoundary | 设置为500 | 成功 |
| TC-RB-114 | test_SetMaxSlippage_Zero | 设置为0 | 成功（极严格） |
| TC-RB-115 | test_SetCooldownPeriod_Success | 设置冷却期 | cooldownPeriod更新 |
| TC-RB-116 | test_SetCooldownPeriod_OnlyOwner | 非owner调用 | revert |
| TC-RB-117 | test_SetCooldownPeriod_Zero | 设置为0 | 成功（无冷却） |
| TC-RB-118 | test_SetCooldownPeriod_Large | 设置大值(7 days) | 成功 |
| TC-RB-119 | test_SetMinRebalanceAmount_Success | 设置最小金额 | minRebalanceAmount更新 |
| TC-RB-120 | test_SetMinRebalanceAmount_OnlyOwner | 非owner调用 | revert |
| TC-RB-121 | test_SetMinRebalanceAmount_Zero | 设置为0 | 成功 |
| TC-RB-122 | test_SetMinRebalanceAmount_Large | 设置大值 | 成功 |

**覆盖目标**: setMaxSlippage() + setCooldownPeriod() + setMinRebalanceAmount()

---

### 9️⃣ Pause/Unpause Tests (暂停功能测试)
**文件**: `ETFRebalancerV1.PauseUnpause.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-130 | test_Pause_Success | owner暂停合约 | paused() == true |
| TC-RB-131 | test_Pause_OnlyOwner | 非owner暂停 | revert |
| TC-RB-132 | test_Pause_EmitsEvent | 验证事件 | Paused事件 |
| TC-RB-133 | test_Pause_BlocksExecuteRebalance | 暂停时阻止rebalance | revert |
| TC-RB-134 | test_Pause_AlreadyPaused | 重复暂停 | revert EnforcedPause |
| TC-RB-135 | test_Unpause_Success | owner恢复合约 | paused() == false |
| TC-RB-136 | test_Unpause_OnlyOwner | 非owner恢复 | revert |
| TC-RB-137 | test_Unpause_EmitsEvent | 验证事件 | Unpaused事件 |
| TC-RB-138 | test_Unpause_AllowsExecuteRebalance | 恢复后允许rebalance | 成功执行 |
| TC-RB-139 | test_Unpause_AlreadyUnpaused | 重复恢复 | revert ExpectedPause |

**覆盖目标**: pause() + unpause() + whenNotPaused modifier

---

### 🔟 Token Recovery Tests (代币恢复测试)
**文件**: `ETFRebalancerV1.TokenRecovery.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-150 | test_RecoverToken_Success | owner恢复代币 | 代币转移到owner |
| TC-RB-151 | test_RecoverToken_OnlyOwner | 非owner调用 | revert |
| TC-RB-152 | test_RecoverToken_MultipleTokens | 恢复多种代币 | 所有代币都转移 |
| TC-RB-153 | test_RecoverToken_PartialAmount | 恢复部分余额 | 转移指定数量 |
| TC-RB-154 | test_RecoverToken_FullBalance | 恢复全部余额 | 转移所有余额 |
| TC-RB-155 | test_RecoverToken_ZeroAmount | 恢复0数量 | 成功（无操作） |
| TC-RB-156 | test_RecoverToken_USDT | 恢复USDT | 成功 |
| TC-RB-157 | test_RecoverToken_WBNB | 恢复WBNB | 成功 |

**覆盖目标**: recoverToken()

---

### 1️⃣1️⃣ Slippage Validation Tests (滑点验证测试)
**文件**: `ETFRebalancerV1.SlippageValidation.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-170 | test_ValidateSlippage_WithinRange | 价值在范围内 | 不revert |
| TC-RB-171 | test_ValidateSlippage_ExactlyAtMinimum | 刚好在最小值 | 不revert |
| TC-RB-172 | test_ValidateSlippage_BelowMinimum | 低于最小值 | revert SlippageExceeded |
| TC-RB-173 | test_ValidateSlippage_NoChange | 价值无变化 | 不revert |
| TC-RB-174 | test_ValidateSlippage_ValueIncrease | 价值增加 | 不revert |
| TC-RB-175 | test_ValidateSlippage_MaxSlippage300 | 使用3%滑点 | 正确计算 |
| TC-RB-176 | test_ValidateSlippage_MaxSlippage500 | 使用5%滑点 | 正确计算 |
| TC-RB-177 | test_ValidateSlippage_EdgeCase | 边界值测试 | 正确处理 |

**覆盖目标**: _validateSlippage()

---

### 1️⃣2️⃣ ReturnAssets Tests (资产返还测试)
**文件**: `ETFRebalancerV1.ReturnAssets.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-190 | test_ReturnAllAssets_AllNonZero | 所有资产都有余额 | 全部返还给ETFCore |
| TC-RB-191 | test_ReturnAllAssets_SomeZero | 部分资产余额为0 | 只返还非零余额 |
| TC-RB-192 | test_ReturnAllAssets_AllZero | 所有余额为0 | 无转移，正常完成 |
| TC-RB-193 | test_ReturnAllAssets_IncludesUSDT | 包含USDT余额 | USDT也返还 |
| TC-RB-194 | test_ReturnAllAssets_OnlyUSDT | 只有USDT余额 | 只返还USDT |
| TC-RB-195 | test_ReturnAllAssets_BalanceCheck | 验证返还后余额 | rebalancer余额为0 |

**覆盖目标**: _returnAllAssets()

---

### 1️⃣3️⃣ EstimateUSDT Tests (USDT估算测试)
**文件**: `ETFRebalancerV1.EstimateUSDT.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-200 | test_EstimateUSDTForAsset_StandardAmount | 标准数量估算 | 返回amount * 105% |
| TC-RB-201 | test_EstimateUSDTForAsset_SmallAmount | 小数量估算 | 正确计算 |
| TC-RB-202 | test_EstimateUSDTForAsset_LargeAmount | 大数量估算 | 正确计算 |
| TC-RB-203 | test_EstimateUSDTForAsset_ZeroAmount | 零数量估算 | 返回0 |
| TC-RB-204 | test_EstimateUSDTForAsset_5PercentBuffer | 验证5%缓冲 | 精确105/100比例 |

**覆盖目标**: _estimateUSDTForAsset()

---

### 1️⃣4️⃣ Integration Tests (集成测试)
**文件**: `ETFRebalancerV1.Integration.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-220 | test_Integration_CompleteRebalanceFlow | 完整rebalance流程 | 从检查到执行到返还 |
| TC-RB-221 | test_Integration_MultipleRebalanceCycles | 多轮rebalance | 遵守冷却期和条件 |
| TC-RB-222 | test_Integration_WeightAdjustmentRebalance | 权重调整后rebalance | 正确调整资产 |
| TC-RB-223 | test_Integration_WithV3Pools | 使用V3池 | 正确路由 |
| TC-RB-224 | test_Integration_WithV2WBNB | WBNB使用V2 | 正确路由 |
| TC-RB-225 | test_Integration_MixedV2V3 | 混合使用V2和V3 | 正确路由所有swap |
| TC-RB-226 | test_Integration_LargeRebalance | 大规模rebalance | 正确处理大额 |
| TC-RB-227 | test_Integration_SmallRebalance | 小规模rebalance | 正确处理小额 |
| TC-RB-228 | test_Integration_AfterPauseUnpause | 暂停后恢复再rebalance | 正常工作 |
| TC-RB-229 | test_Integration_ConfigurationChange | 配置变更后rebalance | 使用新配置 |

**覆盖目标**: 完整流程和各组件交互

---

### 1️⃣5️⃣ Edge Cases Tests (边界情况测试)
**文件**: `ETFRebalancerV1.EdgeCases.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-250 | test_EdgeCase_ExactCooldownBoundary | 精确的冷却期边界 | 正确判断 |
| TC-RB-251 | test_EdgeCase_MaxSlippageBoundary | 最大滑点边界 | 正确处理 |
| TC-RB-252 | test_EdgeCase_DustAmounts | 极小额资产 | 正确处理 |
| TC-RB-253 | test_EdgeCase_MaxUintAmounts | 最大uint值 | 不溢出 |
| TC-RB-254 | test_EdgeCase_NegativeToPositiveOverflow | 负数转正数边界 | 正确处理int256 |
| TC-RB-255 | test_EdgeCase_EmptyAssetArray | 空资产数组 | 正常完成 |
| TC-RB-256 | test_EdgeCase_SingleAsset | 单个资产 | 正确处理 |
| TC-RB-257 | test_EdgeCase_AllPositiveAmounts | 全部卖出 | 正确执行 |
| TC-RB-258 | test_EdgeCase_AllNegativeAmounts | 全部买入 | 正确执行 |
| TC-RB-259 | test_EdgeCase_ScalingFactorEdge | 缩放因子边界值 | 正确缩放 |

**覆盖目标**: 边界值和极端情况

---

### 1️⃣6️⃣ Security Tests (安全测试)
**文件**: `ETFRebalancerV1.Security.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-270 | test_Security_ReentrancyProtection | 重入攻击保护 | 阻止重入 |
| TC-RB-271 | test_Security_OnlyETFCoreCallback | 回调函数访问控制 | 只有ETFCore可调用 |
| TC-RB-272 | test_Security_OwnershipFunctions | 所有owner函数 | 只有owner可调用 |
| TC-RB-273 | test_Security_PauseProtection | 暂停状态保护 | 暂停时阻止操作 |
| TC-RB-274 | test_Security_ApprovalManagement | approve管理 | forceApprove安全使用 |
| TC-RB-275 | test_Security_NoFrontrunning | 防止抢跑 | deadline和slippage保护 |
| TC-RB-276 | test_Security_IntegerOverflow | 整数溢出保护 | 使用SafeMath (0.8+) |
| TC-RB-277 | test_Security_UnauthorizedRecovery | 未授权代币恢复 | revert |

**覆盖目标**: 安全机制和访问控制

---

### 1️⃣7️⃣ Events Tests (事件测试)
**文件**: `ETFRebalancerV1.Events.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-290 | test_Event_RebalanceExecuted | RebalanceExecuted事件 | 正确参数 |
| TC-RB-291 | test_Event_AssetSwapped | AssetSwapped事件 | 每次swap都触发 |
| TC-RB-292 | test_Event_PoolConfigured | PoolConfigured事件 | 配置时触发 |
| TC-RB-293 | test_Event_MultipleAssetSwapped | 多次AssetSwapped | 按顺序触发多个 |
| TC-RB-294 | test_Event_Paused | Paused事件 | 暂停时触发 |
| TC-RB-295 | test_Event_Unpaused | Unpaused事件 | 恢复时触发 |

**覆盖目标**: 所有事件正确发射

---

### 1️⃣8️⃣ Gas Optimization Tests (Gas优化测试)
**文件**: `ETFRebalancerV1.GasOptimization.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-310 | test_Gas_ExecuteRebalance | rebalance gas消耗 | 记录baseline |
| TC-RB-311 | test_Gas_ConfigurePool | 配置池gas消耗 | 记录baseline |
| TC-RB-312 | test_Gas_BatchConfigure | 批量配置gas | 记录并优化 |
| TC-RB-313 | test_Gas_CallbackSmallRebalance | 小额rebalance回调 | 记录gas |
| TC-RB-314 | test_Gas_CallbackLargeRebalance | 大额rebalance回调 | 记录gas |

**覆盖目标**: Gas消耗benchmarking

---

### 1️⃣9️⃣ Fuzz Tests (模糊测试)
**文件**: `ETFRebalancerV1.Fuzz.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-330 | testFuzz_SetMaxSlippage | 随机滑点值 | ≤500时成功 |
| TC-RB-331 | testFuzz_SetCooldownPeriod | 随机冷却期 | 所有值都成功 |
| TC-RB-332 | testFuzz_RebalanceAmounts | 随机rebalance金额 | 正确处理 |
| TC-RB-333 | testFuzz_AssetCount | 随机资产数量 | 1-20个资产 |
| TC-RB-334 | testFuzz_MixedAmounts | 随机正负金额组合 | 正确买卖 |
| TC-RB-335 | testFuzz_SlippageValidation | 随机价值变化 | 正确验证 |

**覆盖目标**: 参数随机性测试

---

### 2️⃣0️⃣ Invariant Tests (不变量测试)
**文件**: `ETFRebalancerV1.Invariant.t.sol`

| 测试用例ID | 测试名称 | 测试目标 | 预期结果 |
|-----------|---------|---------|---------|
| TC-RB-350 | invariant_NoOrphanedTokens | rebalancer不持有代币 | 所有代币返还 |
| TC-RB-351 | invariant_CooldownRespected | 冷却期总是被遵守 | 时间间隔≥cooldownPeriod |
| TC-RB-352 | invariant_SlippageProtection | 滑点保护始终有效 | 价值损失≤maxSlippage |
| TC-RB-353 | invariant_OnlyETFCoreCallback | 只有ETFCore调用回调 | msg.sender验证 |
| TC-RB-354 | invariant_OwnershipIntact | owner权限完整 | owner()始终有效 |
| TC-RB-355 | invariant_PauseBlocks | 暂停阻止操作 | paused时操作revert |

**覆盖目标**: 系统不变量验证

---

## 📈 覆盖率目标

### 代码覆盖率分解

| 类别 | 目标覆盖率 | 测试用例数 |
|------|-----------|-----------|
| 构造函数 | 100% | 8 |
| 查看函数 | 100% | 6 |
| 执行函数 | 100% | 10 |
| 回调函数 | 100% | 11 |
| Swap私有函数 | 100% | 17 |
| 配置函数 | 100% | 12 |
| 参数设置 | 100% | 13 |
| 暂停功能 | 100% | 10 |
| 代币恢复 | 100% | 8 |
| 工具函数 | 100% | 14 |
| 错误处理 | 100% | - |
| 事件发射 | 100% | 6 |
| **总计** | **100%** | **~115+** |

---

## 🧪 测试实现策略

### 测试文件结构
```
test/ETFRebalancerV1/
├── ETFRebalancerV1Test.Base.sol          # 基础测试合约
├── ETFRebalancerV1.Constructor.t.sol     # 构造函数测试
├── ETFRebalancerV1.CanRebalance.t.sol    # 检查功能测试
├── ETFRebalancerV1.ExecuteRebalance.t.sol # 执行测试
├── ETFRebalancerV1.RebalanceCallback.t.sol # 回调测试
├── ETFRebalancerV1.SwapAssetToUSDT.t.sol  # 卖出测试
├── ETFRebalancerV1.SwapUSDTToAsset.t.sol  # 买入测试
├── ETFRebalancerV1.PoolConfiguration.t.sol # 配置测试
├── ETFRebalancerV1.ParameterSettings.t.sol # 参数测试
├── ETFRebalancerV1.PauseUnpause.t.sol     # 暂停测试
├── ETFRebalancerV1.TokenRecovery.t.sol    # 恢复测试
├── ETFRebalancerV1.SlippageValidation.t.sol # 滑点测试
├── ETFRebalancerV1.ReturnAssets.t.sol     # 返还测试
├── ETFRebalancerV1.EstimateUSDT.t.sol     # 估算测试
├── ETFRebalancerV1.Integration.t.sol      # 集成测试
├── ETFRebalancerV1.EdgeCases.t.sol        # 边界测试
├── ETFRebalancerV1.Security.t.sol         # 安全测试
├── ETFRebalancerV1.Events.t.sol           # 事件测试
├── ETFRebalancerV1.GasOptimization.t.sol  # Gas测试
├── ETFRebalancerV1.Fuzz.t.sol            # 模糊测试
└── ETFRebalancerV1.Invariant.t.sol       # 不变量测试
```

### Mock合约需求
- MockBlockETFCore (需要flashRebalance支持)
- MockSwapRouter (V3)
- MockPancakeV2Router (V2)
- MockERC20 (代币)
- MockPriceOracle (可选，用于验证)

### 测试工具
- Forge测试框架
- vm.expectRevert for error testing
- vm.expectEmit for event testing
- vm.warp for time manipulation
- vm.prank for access control testing

---

## 🎯 关键测试点

### 1. 回调安全性
- ✅ 只有ETFCore可调用
- ✅ 重入保护
- ✅ 数据验证

### 2. Swap逻辑
- ✅ V3/V2路由选择
- ✅ USDT中间代币机制
- ✅ 滑点保护
- ✅ 金额缩放

### 3. 状态管理
- ✅ 时间戳更新
- ✅ 配置变更
- ✅ 暂停状态

### 4. 边界条件
- ✅ 零值处理
- ✅ 极值处理
- ✅ 溢出保护

### 5. 事件和错误
- ✅ 所有事件正确触发
- ✅ 所有错误正确抛出
- ✅ 错误消息准确

---

## 📊 执行命令

### 运行所有测试
```bash
forge test --match-path "test/ETFRebalancerV1/*.t.sol" -vv
```

### 运行特定测试文件
```bash
forge test --match-path "test/ETFRebalancerV1/ETFRebalancerV1.Constructor.t.sol" -vvv
```

### 生成覆盖率报告
```bash
forge coverage --match-path "test/ETFRebalancerV1/*.t.sol"
```

### 运行Gas报告
```bash
forge test --match-path "test/ETFRebalancerV1/*.t.sol" --gas-report
```

---

## ✅ 验收标准

1. ✅ **代码覆盖率**: 达到100%行覆盖和分支覆盖
2. ✅ **所有测试通过**: 无失败的测试用例
3. ✅ **边界测试**: 覆盖所有边界条件
4. ✅ **安全测试**: 通过所有安全检查
5. ✅ **集成测试**: 验证与其他合约的交互
6. ✅ **Gas优化**: 识别gas优化机会
7. ✅ **模糊测试**: 通过随机输入测试
8. ✅ **不变量测试**: 系统不变量始终保持

---

## 📝 测试开发顺序

### Phase 1: 基础测试 (第1-2天)
1. Constructor Tests
2. View Function Tests (canRebalance)
3. Configuration Tests
4. Parameter Settings Tests

### Phase 2: 核心功能测试 (第3-5天)
5. ExecuteRebalance Tests
6. RebalanceCallback Tests
7. SwapAssetToUSDT Tests
8. SwapUSDTToAsset Tests

### Phase 3: 辅助功能测试 (第6天)
9. Pause/Unpause Tests
10. Token Recovery Tests
11. Slippage Validation Tests
12. Return Assets Tests

### Phase 4: 高级测试 (第7-8天)
13. Integration Tests
14. Edge Cases Tests
15. Security Tests
16. Events Tests

### Phase 5: 特殊测试 (第9-10天)
17. Gas Optimization Tests
18. Fuzz Tests
19. Invariant Tests

---

## 🔍 代码覆盖率验证

### 函数覆盖清单
- [x] constructor()
- [x] canRebalance()
- [x] executeRebalance()
- [x] rebalanceCallback()
- [x] configureAssetPool()
- [x] configureAssetPools()
- [x] setMaxSlippage()
- [x] setCooldownPeriod()
- [x] setMinRebalanceAmount()
- [x] pause()
- [x] unpause()
- [x] recoverToken()
- [x] _sellAssetsForUSDT()
- [x] _buyAssetsWithUSDT()
- [x] _swapAssetToUSDT()
- [x] _swapUSDTToAsset()
- [x] _swapWBNBToUSDTV2()
- [x] _swapUSDTToWBNBV2()
- [x] _estimateUSDTForAsset()
- [x] _returnAllAssets()
- [x] _validateSlippage()

### 修饰符覆盖清单
- [x] onlyOwner
- [x] whenNotPaused
- [x] nonReentrant

### 错误覆盖清单
- [x] NotETFCore
- [x] RebalanceNotNeeded
- [x] CooldownNotMet
- [x] SlippageExceeded
- [x] InsufficientOutput (如果使用)
- [x] InvalidConfiguration

### 事件覆盖清单
- [x] RebalanceExecuted
- [x] AssetSwapped
- [x] PoolConfigured
- [x] Paused
- [x] Unpaused

---

## 🎓 总结

本测试计划提供了ETFRebalancerV1合约的全面测试覆盖。通过系统性地测试每个功能、边界条件和安全机制，我们确保合约在所有场景下都能正确、安全地运行。

**估计测试用例总数**: ~115个单元测试 + 模糊测试 + 不变量测试

**预期时间**: 8-10天完成所有测试实现

**覆盖率目标**: 100% 代码覆盖率

---

**文档版本**: v1.0
**创建日期**: 2025-09-30
**最后更新**: 2025-09-30
**作者**: BlockETF Testing Team