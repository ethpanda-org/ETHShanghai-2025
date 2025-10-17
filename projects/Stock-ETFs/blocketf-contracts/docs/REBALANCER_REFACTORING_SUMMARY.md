# ETFRebalancerV1 Refactoring Summary

## 重构完成时间
2025-09-30

## 核心改进

### 旧算法 (Scale Factor Approach)
```solidity
// Phase 1: 卖出收集USDT
uint256 totalUSDTCollected = _sellAssetsForUSDT(assets, amounts);

// Phase 2: 估算所需USDT
uint256 totalUSDTNeeded = 0;
for (uint256 i = 0; i < assets.length; i++) {
    if (amounts[i] < 0) {
        uint256 buyAmount = uint256(-amounts[i]);
        uint256 usdtNeeded = _estimateUSDTForAsset(asset, buyAmount);
        totalUSDTNeeded += usdtNeeded;
    }
}

// Phase 3: 如果USDT不足，按比例缩小所有买单
uint256 scaleFactor = 1e18;
if (totalUSDTNeeded > availableUSDT) {
    scaleFactor = (availableUSDT * 1e18) / totalUSDTNeeded;
}

// Phase 4: 执行买入（使用scaled amount）
for (uint256 i = 0; i < assets.length; i++) {
    if (amounts[i] < 0) {
        uint256 buyAmount = uint256(-amounts[i]);
        if (scaleFactor < 1e18) {
            buyAmount = (buyAmount * scaleFactor) / 1e18;  // 等比缩放
        }
        _swapUSDTToAsset(asset, buyAmount);  // exactOutput模式
    }
}
```

**问题**：
- 估算不准确（依赖价格Oracle但实际swap价格可能偏差）
- 等比缩放不符合rebalance本质（应该优先弥补权重缺口大的资产）
- exactOutput模式需要预估，复杂且不确定

### 新算法 (Weight Deficit Proportional Allocation)
```solidity
// Phase 1: 卖出收集USDT
uint256 totalUSDTCollected = 0;
for (uint256 i = 0; i < assets.length; i++) {
    if (amounts[i] > 0) {
        uint256 usdtReceived = _sellAssetForUSDT(assets[i], uint256(amounts[i]));
        totalUSDTCollected += usdtReceived;
    }
}

// Phase 2: 计算每个资产的买入价值（反映权重缺口）
uint256 totalBuyValue = 0;
uint256[] memory buyValues = new uint256[](assets.length);

for (uint256 i = 0; i < assets.length; i++) {
    if (amounts[i] < 0 && assets[i] != USDT) {
        uint256 targetAmount = uint256(-amounts[i]);
        buyValues[i] = _calculateAssetBuyValue(assets[i], targetAmount);
        totalBuyValue += buyValues[i];
    }
}

// Phase 3: 按权重缺口比例分配USDT
// 权重缺口最大的资产获得剩余USDT（处理舍入误差）
uint256 maxDeficitIndex = findMaxDeficitIndex(buyValues);

uint256 usdtSpent = 0;
for (uint256 i = 0; i < assets.length; i++) {
    if (buyValues[i] > 0 && i != maxDeficitIndex) {
        uint256 allocatedUSDT = (totalUSDTCollected * buyValues[i]) / totalBuyValue;
        _buyAssetWithExactUSDT(assets[i], allocatedUSDT);  // exactInput模式
        usdtSpent += allocatedUSDT;
    }
}

// 最大缺口资产获得所有剩余USDT（消化舍入dust）
if (maxDeficit > 0) {
    uint256 remainingUSDT = totalUSDTCollected - usdtSpent;
    _buyAssetWithExactUSDT(assets[maxDeficitIndex], remainingUSDT);
}
```

**优势**：
✅ **零估算**：直接用实际收集的USDT进行分配
✅ **权重导向**：按Core计算的权重缺口比例分配（amounts已反映权重）
✅ **确定性**：exactInput模式，输入确定，输出尽力而为
✅ **无舍入损失**：最大缺口资产获得所有剩余dust
✅ **与Core配合**：Core验证最终结果，Rebalancer只负责执行

## 测试更新

### 需要更新的测试（共4个）

#### 1. test_TC107_Buy_WithInsufficientUSDT
**原逻辑**：期望所有买单等比例缩小
**新逻辑**：按权重缺口比例分配USDT，不是等比例

**修复方案**：更新断言，改为验证：
- 所有USDT被用完
- 权重缺口大的资产获得更多USDT份额
- 总买入价值接近可用USDT

#### 2. test_TC108_Buy_ScalingApplied
**原逻辑**：期望scaleFactor被应用
**新逻辑**：不再有scaleFactor概念

**修复方案**：重新设计测试，验证：
- USDT按权重缺口比例分配
- 最大缺口资产获得最多预算

#### 3. test_TC325_Event_AssetSwapped_OnBuy
**原逻辑**：事件参数是 (USDT, asset, estimatedUSDT, assetReceived)
**新逻辑**：事件参数是 (USDT, asset, allocatedUSDT, assetReceived)

**修复方案**：更新事件期望值，使用实际分配的USDT

#### 4. test_TC075_Callback_UpdatesTimestampForBoughtAssets
**原逻辑**：期望USDT作为买入资产，timestamp被更新
**新逻辑**：USDT作为中间币，不再被记录为"买入资产"

**修复方案**：更新断言，USDT的timestamp不应该被更新

## 测试结果

**总计**：312个测试
**通过**：308个 (98.7%)
**失败**：4个（预期失败，需更新）

**主要测试套件通过情况**：
- ✅ ExecuteRebalance (16/16)
- ✅ Integration (14/14)
- ✅ Security (22/22)
- ✅ SellAssets (18/18)
- ✅ Slippage (21/21)
- ✅ Events (19/20) - 1个需要更新
- ✅ BuyAssets (20/22) - 2个需要更新
- ✅ RebalanceCallback (15/16) - 1个需要更新

## 代码变更统计

### 新增函数
- `_sellAssetForUSDT(asset, amount)` - 单个资产卖出
- `_calculateAssetBuyValue(asset, targetAmount)` - 计算买入价值
- `_buyAssetWithExactUSDT(asset, usdtAmount)` - exactInput买入
- `_getAssetPrice(asset)` - 访问价格Oracle
- `_swapUSDTToAssetExactInput(asset, usdtAmount)` - exactInput swap
- `_swapUSDTToWBNBV2ExactInput(usdtAmount)` - V2 exactInput

### 删除函数
- `_sellAssetsForUSDT(assets, amounts)` - 被拆分为单个调用
- `_buyAssetsWithUSDT(assets, amounts, availableUSDT)` - 被新逻辑替代
- `_swapUSDTToAsset(asset, targetAmount)` - exactOutput模式不再需要
- `_swapUSDTToWBNBV2(targetAmount)` - V2 exactOutput不再需要
- `_estimateUSDTForAsset(asset, amount)` - 不再需要估算

### 修改函数
- `rebalanceCallback(assets, amounts, data)` - 完全重写核心逻辑

## 向后兼容性

### 不兼容变更
1. **Swap模式改变**：从exactOutput改为exactInput
2. **买入逻辑改变**：从等比缩放改为权重比例分配
3. **事件参数改变**：AssetSwapped的USDT数量从估算值改为实际值

### 接口保持不变
- ✅ `rebalanceCallback(address[], int256[], bytes)` 签名未变
- ✅ 与Core合约的交互协议未变
- ✅ 管理员函数接口未变

## 建议

### 短期
1. 更新4个失败的测试用例
2. 添加新算法的专项测试（权重比例分配验证）
3. 运行完整回归测试

### 中期
1. 监控生产环境rebalance效果
2. 对比新旧算法的权重收敛速度
3. 收集真实市场数据验证算法

### 长期
1. 考虑添加动态调整逻辑（如市场波动大时调整分配策略）
2. 优化gas消耗
3. 支持更多Swap协议

## 文档
- 算法仿真：`docs/REBALANCE_ALGORITHM_SIMULATION.md`
- 本总结：`docs/REBALANCER_REFACTORING_SUMMARY.md`