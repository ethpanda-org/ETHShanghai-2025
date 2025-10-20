# ExecuteRebalance 增强测试计划

## 🎯 功能分析

### executeRebalance() 执行流程
```
1. whenNotPaused modifier check
2. nonReentrant modifier check
3. cooldown check (line 142-144)
4. needsRebalance check (line 147-150)
5. Record totalValueBefore (line 153)
6. Encode data with msg.sender (line 156)
7. Call etfCore.flashRebalance (line 157)
   └─> triggers rebalanceCallback
       ├─> _sellAssetsForUSDT
       ├─> _buyAssetsWithUSDT
       └─> _returnAllAssets
8. Update lastRebalanceTime (line 160)
9. Get totalValueAfter (line 163)
10. Validate slippage (line 164)
11. Emit event (line 166)
```

### 🔴 发现的问题

**MockBlockETFCore.flashRebalance() 实现错误**:
```solidity
// 当前实现 (错误)
function flashRebalance(address receiver, bytes calldata data) external override onlyOwner {
    (bool success,) = receiver.call(data);  // ❌ 直接call data
    require(success, "Flash rebalance failed");
}

// 应该的实现
function flashRebalance(address receiver, bytes calldata data) external override onlyOwner {
    // 准备资产和amounts数据
    // 调用 IRebalanceCallback(receiver).rebalanceCallback(assets, amounts, data)
}
```

## 📋 完整测试用例清单

### Group 1: 基础执行测试
| ID | 测试用例 | 覆盖目标 | 前置条件 |
|----|---------|---------|---------|
| TC-RB-020 | test_ExecuteRebalance_Success | 成功执行完整流程 | needsRebalance=true, 过冷却期 |
| TC-RB-021 | test_ExecuteRebalance_UpdatesTimestamp | 验证lastRebalanceTime更新 | 同上 |
| TC-RB-022 | test_ExecuteRebalance_EmitsEvent | 验证事件发射 | 同上 |
| TC-RB-023 | test_ExecuteRebalance_RecordsExecutor | 验证executor记录在data中 | 同上 |

### Group 2: 访问控制测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-024 | test_ExecuteRebalance_AnyoneCanCall | 任何人都可调用 | 成功执行 |
| TC-RB-025 | test_ExecuteRebalance_MultipleExecutors | 不同executor执行 | 都能成功 |

### Group 3: 修饰符测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-026 | test_ExecuteRebalance_RevertWhenPaused | whenNotPaused检查 | revert Pausable |
| TC-RB-027 | test_ExecuteRebalance_NonReentrant | nonReentrant检查 | 阻止重入 |

### Group 4: 冷却期测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-028 | test_ExecuteRebalance_RevertCooldownNotMet | 冷却期未满 | revert CooldownNotMet |
| TC-RB-029 | test_ExecuteRebalance_CooldownExactBoundary | 刚好到冷却期 | 成功执行 |
| TC-RB-030 | test_ExecuteRebalance_CooldownMinus1Second | 差1秒到冷却期 | revert CooldownNotMet |
| TC-RB-031 | test_ExecuteRebalance_FirstExecution | 首次执行(lastRebalanceTime=0) | 成功执行 |
| TC-RB-032 | test_ExecuteRebalance_AfterCooldownChange | 冷却期参数改变后 | 使用新cooldown |

### Group 5: Rebalance需求测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-033 | test_ExecuteRebalance_RevertNotNeeded | needsRebalance=false | revert RebalanceNotNeeded |
| TC-RB-034 | test_ExecuteRebalance_NeedsRebalanceTrue | needsRebalance=true | 成功执行 |
| TC-RB-035 | test_ExecuteRebalance_NeedsRebalanceChanges | 执行中needsRebalance变化 | 使用执行前的值 |

### Group 6: 滑点保护测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-036 | test_ExecuteRebalance_SlippageWithinLimit | 滑点在范围内 | 成功执行 |
| TC-RB-037 | test_ExecuteRebalance_SlippageExactlyAtLimit | 滑点刚好在边界 | 成功执行 |
| TC-RB-038 | test_ExecuteRebalance_SlippageExceedsLimit | 滑点超出限制 | revert SlippageExceeded |
| TC-RB-039 | test_ExecuteRebalance_ValueIncrease | 价值增加 | 成功执行 |
| TC-RB-040 | test_ExecuteRebalance_ValueNoChange | 价值不变 | 成功执行 |
| TC-RB-041 | test_ExecuteRebalance_ValueDecrease3Percent | 价值下降3% | 成功(默认maxSlippage=3%) |
| TC-RB-042 | test_ExecuteRebalance_ValueDecrease4Percent | 价值下降4% | revert |

### Group 7: 回调交互测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-043 | test_ExecuteRebalance_TriggersCallback | 触发rebalanceCallback | callback被调用 |
| TC-RB-044 | test_ExecuteRebalance_PassesCorrectData | 传递正确的data | executor和valueBefore正确 |
| TC-RB-045 | test_ExecuteRebalance_CallbackReceivesAssets | callback接收正确assets | assets数组正确 |
| TC-RB-046 | test_ExecuteRebalance_CallbackReceivesAmounts | callback接收正确amounts | amounts数组正确 |

### Group 8: 状态变化测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-047 | test_ExecuteRebalance_UpdatesLastRebalanceTime | lastRebalanceTime更新 | 等于block.timestamp |
| TC-RB-048 | test_ExecuteRebalance_DoesNotUpdateOtherState | 不改变其他状态 | maxSlippage等不变 |
| TC-RB-049 | test_ExecuteRebalance_MultipleSequential | 连续多次执行 | 都遵守冷却期 |

### Group 9: 事件测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-050 | test_ExecuteRebalance_EmitsRebalanceExecuted | 发射正确事件 | RebalanceExecuted事件 |
| TC-RB-051 | test_ExecuteRebalance_EventHasExecutor | 事件包含executor | executor = msg.sender |
| TC-RB-052 | test_ExecuteRebalance_EventHasValueBefore | 事件包含valueBefore | 正确的值 |
| TC-RB-053 | test_ExecuteRebalance_EventHasValueAfter | 事件包含valueAfter | 正确的值 |
| TC-RB-054 | test_ExecuteRebalance_EventHasTimestamp | 事件包含timestamp | block.timestamp |

### Group 10: 边界条件测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-055 | test_ExecuteRebalance_ZeroTotalValue | totalValue为0 | 正确处理 |
| TC-RB-056 | test_ExecuteRebalance_VeryLargeValue | 极大value | 不溢出 |
| TC-RB-057 | test_ExecuteRebalance_MaxSlippage500 | maxSlippage=500(5%) | 使用正确阈值 |
| TC-RB-058 | test_ExecuteRebalance_MaxSlippage0 | maxSlippage=0 | 任何损失都revert |

### Group 11: ETFCore交互测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-059 | test_ExecuteRebalance_CallsGetTotalValueTwice | 调用getTotalValue 2次 | before和after |
| TC-RB-060 | test_ExecuteRebalance_CallsGetRebalanceInfo | 调用getRebalanceInfo | 获取needsRebalance |
| TC-RB-061 | test_ExecuteRebalance_CallsFlashRebalance | 调用flashRebalance | 传递正确参数 |

### Group 12: 时间操作测试
| ID | 测试用例 | 覆盖目标 | 预期结果 |
|----|---------|---------|---------|
| TC-RB-062 | test_ExecuteRebalance_TimeWarp | 时间快进测试 | 正确处理 |
| TC-RB-063 | test_ExecuteRebalance_SameBlock | 同一区块多次尝试 | 第二次revert |
| TC-RB-064 | test_ExecuteRebalance_DifferentBlocks | 不同区块执行 | 都成功 |

## 🛠️ 实现策略

### 1. 修复MockBlockETFCore
需要实现正确的flashRebalance逻辑，能够调用rebalanceCallback

### 2. 创建辅助测试合约
```solidity
contract RebalanceCallbackTracker {
    bool public callbackCalled;
    address[] public receivedAssets;
    int256[] public receivedAmounts;
    bytes public receivedData;

    function trackCallback(
        address[] calldata assets,
        int256[] calldata amounts,
        bytes calldata data
    ) external {
        callbackCalled = true;
        receivedAssets = assets;
        receivedAmounts = amounts;
        receivedData = data;
    }
}
```

### 3. 测试组织结构
```
ExecuteRebalance Tests
├── Basic (4 tests)
├── Access Control (2 tests)
├── Modifiers (2 tests)
├── Cooldown (5 tests)
├── Rebalance Need (3 tests)
├── Slippage (7 tests)
├── Callback (4 tests)
├── State Changes (3 tests)
├── Events (5 tests)
├── Edge Cases (4 tests)
├── ETFCore Interaction (3 tests)
└── Time Operations (3 tests)
```

**总计**: 45个测试用例

## ✅ 覆盖率验证

### 代码行覆盖
- [x] Line 140: function declaration
- [x] Line 142-144: cooldown check
- [x] Line 147-150: needsRebalance check
- [x] Line 153: totalValueBefore
- [x] Line 156: encode data
- [x] Line 157: flashRebalance call
- [x] Line 160: update lastRebalanceTime
- [x] Line 163: totalValueAfter
- [x] Line 164: _validateSlippage
- [x] Line 166: emit event

### 分支覆盖
- [x] paused = true
- [x] paused = false
- [x] cooldown not met
- [x] cooldown met
- [x] needsRebalance = false
- [x] needsRebalance = true
- [x] slippage within limit
- [x] slippage exceeds limit

### 修饰符覆盖
- [x] whenNotPaused - normal
- [x] whenNotPaused - paused
- [x] nonReentrant - normal
- [x] nonReentrant - reentrant

## 📊 预期覆盖率: 100%