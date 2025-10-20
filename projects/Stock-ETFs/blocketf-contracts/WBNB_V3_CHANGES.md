# WBNB V3 路由支持 - 修改总结

## 📝 修改概述

为了支持 PancakeSwap V3 WBNB/USDT 池（流动性已与 V2 持平且费率更低），我们对合约进行了以下调整：

## ✅ 完成的修改

### 1. **ETFRouterV1.sol**
**文件路径**: `src/ETFRouterV1.sol`

**修改内容**:
- ✅ 移除构造函数中的硬编码：`useV2Router[_wbnb] = true;`
- ✅ 改为注释说明：可通过 `setAssetUseV2Router()` 动态配置

**代码位置**: Line 122-123

**影响**:
- WBNB 默认不再强制使用 V2
- 管理员可以灵活配置使用 V2 或 V3
- 向后兼容，不影响现有功能

---

### 2. **ETFRebalancerV1.sol**
**文件路径**: `src/ETFRebalancerV1.sol`

**修改内容**:

#### 2.1 添加状态变量和配置函数
- ✅ 添加 `mapping(address => bool) public useV2Router;` (Line 68)
- ✅ 添加 `setAssetUseV2Router(address asset, bool useV2)` 函数 (Line 305-312)

#### 2.2 修改 `_swapAssetToUSDT` 函数 (Line 399-432)
- ✅ 移除硬编码的 WBNB 特殊判断
- ✅ 添加通用的 V2 路由检查：
  ```solidity
  if (useV2Router[asset]) {
      return _swapAssetToUSDTV2(asset, amount);
  }
  ```

#### 2.3 修改 `_swapUSDTToAssetExactInput` 函数 (Line 440-474)
- ✅ 移除硬编码的 WBNB 特殊判断
- ✅ 添加通用的 V2 路由检查

#### 2.4 重构 V2 交换函数
- ✅ `_swapWBNBToUSDTV2` → `_swapAssetToUSDTV2` (Line 479-502)
  - 支持任意资产，不仅限于 WBNB

- ✅ `_swapUSDTToWBNBV2ExactInput` → `_swapUSDTToAssetV2ExactInput` (Line 510-533)
  - 支持任意资产，不仅限于 WBNB

---

### 3. **DeployBlockETFWithMocks.s.sol**
**文件路径**: `script/DeployBlockETFWithMocks.s.sol`

**修改内容**:
- ✅ 在 `configurePermissions()` 函数中添加路由配置逻辑 (Line 239-254)
- ✅ 测试网默认使用 V2（因为 Mock tokens 没有 V3 流动性）
- ✅ 添加主网配置注释和示例代码

**配置逻辑**:
```solidity
// 测试网：使用 V2
router.setAssetUseV2Router(address(wbnbToken), true);
rebalancer.setAssetUseV2Router(address(wbnbToken), true);

// 主网：使用 V3（注释中提供示例）
// router.setAssetUseV2Router(WBNB, false);
// router.setAssetV3Pool(WBNB, WBNB_USDT_V3_POOL_ADDRESS);
// rebalancer.setAssetUseV2Router(WBNB, false);
// rebalancer.configureAssetPool(WBNB, WBNB_USDT_V3_POOL_ADDRESS, 500);
```

---

### 4. **文档**

新增文件：
- ✅ `MAINNET_V3_CONFIG.md` - 主网 V3 配置完整指南
- ✅ `WBNB_V3_CHANGES.md` - 本修改总结文档

---

## 🎯 核心改进

### 之前的问题
1. WBNB 硬编码使用 V2 路由
2. 无法利用 V3 更低的费率和更好的流动性
3. 代码耦合度高，不易维护

### 现在的优势
1. ✅ **灵活配置**: 可动态切换 V2/V3
2. ✅ **统一逻辑**: 所有资产使用相同的路由选择机制
3. ✅ **向后兼容**: 不破坏现有功能
4. ✅ **易于维护**: 代码更简洁，逻辑更清晰
5. ✅ **快速回滚**: 如果 V3 有问题，可立即切回 V2

---

## 📊 配置对比

| 场景 | V2 配置 | V3 配置 |
|------|---------|---------|
| **测试网 (Mock)** | ✅ 默认 | ❌ 不推荐 |
| **主网 (真实 WBNB)** | ⚠️ 可用但费率高 | ✅ 推荐（流动性足够）|
| **费率** | 0.25% | 0.05% - 0.25% |
| **Gas 成本** | 较低 | 稍高 |
| **流动性** | 充足 | 与 V2 持平 |

---

## 🚀 部署流程

### 测试网部署
```bash
forge script script/DeployBlockETFWithMocks.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  --verify
```
默认配置：WBNB 使用 V2

### 主网部署

#### 选项 A：部署时配置 V3
修改 `script/DeployBlockETF.s.sol` 中的配置，参考 `MAINNET_V3_CONFIG.md`

#### 选项 B：部署后动态配置
使用 cast 命令配置，详见 `MAINNET_V3_CONFIG.md`

---

## ⚠️ 注意事项

1. **测试网行为**
   - Mock tokens 没有真实 V3 流动性
   - 保持 V2 配置

2. **主网切换**
   - 先查询 V3 池地址和流动性
   - 小额测试后再全面使用
   - 准备回滚方案

3. **权限要求**
   - 只有合约 owner 可以配置路由
   - 确保私钥安全

---

## 🔍 验证清单

部署/配置后检查：

```bash
# 1. 检查 Router 配置
cast call $ROUTER "useV2Router(address)(bool)" $WBNB

# 2. 检查 Rebalancer 配置
cast call $REBALANCER "useV2Router(address)(bool)" $WBNB

# 3. 如果使用 V3，检查池地址
cast call $ROUTER "assetV3Pools(address)(address)" $WBNB
cast call $REBALANCER "assetPools(address)(address)" $WBNB
```

---

## 📚 相关文档

- [主网 V3 配置指南](./MAINNET_V3_CONFIG.md)
- [PancakeSwap V3 文档](https://docs.pancakeswap.finance/developers/smart-contracts/pancakeswap-exchange/v3-contracts)
- [BSC 网络信息](https://docs.bnbchain.org/docs/rpc)

---

## 🤝 支持

如有问题，请查看：
1. `MAINNET_V3_CONFIG.md` 详细配置指南
2. 合约代码注释
3. 测试用例

---

**修改完成时间**: 2025-10-08
**修改作者**: BlockETF Team
**版本**: v1.0
