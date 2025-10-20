# 主网 WBNB V3 池配置指南

## 背景

PancakeSwap V3 WBNB/USDT 池流动性已大幅增加，与 V2 持平且费率更低。因此需要将 WBNB 的交易路由从 V2 切换到 V3。

## 合约修改内容

### 1. ETFRouterV1.sol
- ✅ 移除构造函数中 `useV2Router[_wbnb] = true` 的硬编码
- ✅ WBNB 路由模式现在可通过 `setAssetUseV2Router()` 动态配置

### 2. ETFRebalancerV1.sol
- ✅ 移除 `_swapAssetToUSDT` 中对 WBNB 的特殊 V2 判断
- ✅ 移除 `_swapUSDTToAssetExactInput` 中对 WBNB 的特殊 V2 判断
- ✅ 添加 `useV2Router` 映射和 `setAssetUseV2Router()` 配置函数
- ✅ 将 V2 函数改为通用函数，支持任意资产

## 主网部署配置步骤

### 前置准备

1. **查询 WBNB/USDT V3 池信息**
   ```javascript
   // PancakeSwap V3 Factory: 0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865
   // WBNB: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
   // USDT: 0x55d398326f99059fF775485246999027B3197955

   // 可能的费率层级：
   // - 500 (0.05%)
   // - 2500 (0.25%)
   // - 10000 (1%)

   // 使用 PancakeSwap V3 Factory 查询池地址：
   const poolAddress = await factory.getPool(WBNB, USDT, fee);
   ```

2. **验证池流动性和交易量**
   - 确认 V3 池有足够的流动性
   - 对比 V2 和 V3 的滑点情况
   - 选择最优的费率层级

### 部署后配置

假设你已经部署了合约，现在需要配置 WBNB 使用 V3：

#### 方案 A：使用 cast 命令行配置

```bash
# 设置环境变量
export PRIVATE_KEY="your_private_key"
export RPC_URL="https://bsc-dataseed.binance.org/"

# WBNB/USDT V3 池地址（需要根据实际查询结果填写）
export WBNB_USDT_V3_POOL="0x..." # 替换为实际池地址
export FEE_TIER=500  # 或 2500，根据流动性选择

# 1. 配置 Router
cast send $ROUTER_ADDRESS \
  "setAssetUseV2Router(address,bool)" \
  $WBNB false \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

cast send $ROUTER_ADDRESS \
  "setAssetV3Pool(address,address)" \
  $WBNB $WBNB_USDT_V3_POOL \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# 2. 配置 Rebalancer
cast send $REBALANCER_ADDRESS \
  "setAssetUseV2Router(address,bool)" \
  $WBNB false \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

cast send $REBALANCER_ADDRESS \
  "configureAssetPool(address,address,uint24)" \
  $WBNB $WBNB_USDT_V3_POOL $FEE_TIER \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

#### 方案 B：在部署脚本中添加配置

在 `DeployBlockETF.s.sol` 的 `configurePermissions()` 函数中添加：

```solidity
// 主网配置：使用 WBNB/USDT V3 池
address constant WBNB_USDT_V3_POOL = 0x...; // 替换为实际池地址
uint24 constant WBNB_USDT_FEE_TIER = 500; // 或 2500

// 配置 Router 使用 V3
router.setAssetUseV2Router(WBNB, false);
router.setAssetV3Pool(WBNB, WBNB_USDT_V3_POOL);

// 配置 Rebalancer 使用 V3
rebalancer.setAssetUseV2Router(WBNB, false);
rebalancer.configureAssetPool(WBNB, WBNB_USDT_V3_POOL, WBNB_USDT_FEE_TIER);

console2.log("  WBNB V3 Pool configured:", WBNB_USDT_V3_POOL);
console2.log("  WBNB V3 Fee Tier:", WBNB_USDT_FEE_TIER);
```

### 验证配置

```bash
# 验证 Router 配置
cast call $ROUTER_ADDRESS "useV2Router(address)(bool)" $WBNB --rpc-url $RPC_URL
# 应该返回: false

cast call $ROUTER_ADDRESS "assetV3Pools(address)(address)" $WBNB --rpc-url $RPC_URL
# 应该返回: V3 池地址

# 验证 Rebalancer 配置
cast call $REBALANCER_ADDRESS "useV2Router(address)(bool)" $WBNB --rpc-url $RPC_URL
# 应该返回: false

cast call $REBALANCER_ADDRESS "assetPools(address)(address)" $WBNB --rpc-url $RPC_URL
# 应该返回: V3 池地址
```

## 回滚方案

如果 V3 池出现问题，可以快速切换回 V2：

```bash
# Router 切换回 V2
cast send $ROUTER_ADDRESS \
  "setAssetUseV2Router(address,bool)" \
  $WBNB true \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# Rebalancer 切换回 V2
cast send $REBALANCER_ADDRESS \
  "setAssetUseV2Router(address,bool)" \
  $WBNB true \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

## 监控建议

1. **交易监控**
   - 监控 V3 交换的滑点
   - 对比 V2 和 V3 的实际成本
   - 关注大额交易的价格影响

2. **Gas 优化**
   - V3 交换可能比 V2 消耗更多 gas
   - 需要权衡费率节省 vs gas 成本

3. **流动性监控**
   - 定期检查 V3 池流动性
   - 如果流动性显著下降，考虑切回 V2

## 相关合约地址

### BSC 主网
- PancakeSwap V3 Factory: `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865`
- PancakeSwap V3 Router: `0x1b81D678ffb9C0263b24A97847620C99d213eB14`
- PancakeSwap V2 Router: `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- WBNB: `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`
- USDT: `0x55d398326f99059fF775485246999027B3197955`

### 查询 V3 池地址
```javascript
// 使用 ethers.js
const factory = new ethers.Contract(
  "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
  ["function getPool(address,address,uint24) view returns (address)"],
  provider
);

// 查询 0.05% 费率池
const pool_500 = await factory.getPool(WBNB, USDT, 500);

// 查询 0.25% 费率池
const pool_2500 = await factory.getPool(WBNB, USDT, 2500);
```

## 注意事项

1. ⚠️ **测试网行为**
   - 在测试网使用 Mock tokens，没有真实的 V3 流动性
   - 测试网部署默认使用 V2 模式

2. ⚠️ **主网切换**
   - 建议在低峰时段进行切换
   - 先小额测试，确认无误后再全面使用
   - 准备好回滚方案

3. ⚠️ **权限管理**
   - 只有 owner 可以调用配置函数
   - 确保部署账户有足够权限
