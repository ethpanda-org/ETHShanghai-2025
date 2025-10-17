# SetupLiquidity 脚本使用说明 (V3 Only)

## 📋 概述

**SetupLiquidity.s.sol** 脚本已全面升级为 **V3 Only** 策略，为所有代币对创建 PancakeSwap V3 流动性池。

### ✨ 主要特性

1. ✅ **统一使用 V3 池**：所有代币（包括 WBNB）都使用 V3 池
2. ✅ **从预言机获取价格**：价格与合约逻辑完全一致，避免不匹配
3. ✅ **深度流动性**：每个池 500 万 USDT，确保交易顺畅
4. ✅ **差异化费率**：根据代币交易量特性选择最优费率层级
5. ✅ **自动余额管理**：脚本会自动检查余额，不足时自动 mint
6. ✅ **从 JSON 读取配置**：所有地址从 deployed-contracts.json 自动加载

## 🔧 修改内容

### **之前的策略（已废弃）**
- V2: WBNB/USDT 池（1.28万 WBNB + 1420万 USDT）
- V3: BTC/ETH/XRP/SOL 池（每个 5 万 USDT）
- 手动配置价格

### **现在的策略（推荐）**
- V3: 所有 5 个代币对 USDT 池
- 每个池：**500 万 USDT** + 对应数量的代币
- 价格从 **PriceOracle** 动态获取
- 代币地址从 **deployed-contracts.json** 自动读取
- 费率：**差异化配置**
  - WBNB: **0.05%** (500) - 最高交易量
  - BTC/ETH/ADA/BCH: **0.25%** (2500) - 标准费率

## 📊 流动性配置

| 代币对 | USDT 数量 | 代币数量 | 价格来源 | 费率 | 费率说明 |
|--------|-----------|----------|----------|------|----------|
| WBNB/USDT | 5,000,000 | 根据预言机价格计算 | Oracle | **0.05%** (500) | 最高交易量，使用最低费率 |
| BTCB/USDT | 5,000,000 | 根据预言机价格计算 | Oracle | **0.25%** (2500) | 主流资产，标准费率 |
| ETH/USDT | 5,000,000 | 根据预言机价格计算 | Oracle | **0.25%** (2500) | 主流资产，标准费率 |
| ADA/USDT | 5,000,000 | 根据预言机价格计算 | Oracle | **0.25%** (2500) | 标准费率 |
| BCH/USDT | 5,000,000 | 根据预言机价格计算 | Oracle | **0.25%** (2500) | 标准费率 |

**示例计算**（假设 WBNB = $600）：
- USDT: 5,000,000
- WBNB: 5,000,000 / 600 = 8,333.33 WBNB

### 🎯 **费率策略说明**

V3 支持多个费率层级，应根据代币特性选择：

| 费率层级 | 费率 | 适用场景 | 优势 |
|---------|------|---------|------|
| **Lowest** | 0.01% (100) | 稳定币对（如 USDT/USDC） | 极低交易成本，适合大额交易 |
| **Low** | 0.05% (500) | 高交易量代币（如 WBNB） | 更低交易成本，吸引更多交易者 |
| **Medium** | 0.25% (2500) | 主流资产（如 BTC/ETH） | 平衡收益与竞争力 |
| **High** | 1% (10000) | 低流动性/高波动代币 | 补偿流动性提供者风险 |

**为什么 WBNB 使用 0.05%？**
- WBNB 是 BSC 链的原生代币，交易量最高
- 主网数据显示 WBNB/USDT V3 池在 0.05% 费率下流动性最佳
- 更低费率能吸引套利者，提升池子活跃度

**如何修改费率配置？**

在 `setUp()` 函数中调整 `tokenFees` 映射：

```solidity
// 示例：将 XRP 改为低费率
tokenFees[xrpToken] = FEE_LOW; // 0.05%

// 示例：为波动性高的代币使用高费率
tokenFees[someVolatileToken] = FEE_HIGH; // 1%
```

## 🚀 使用方法

### **前置条件**

1. ✅ 已部署 Mock 代币（通过 `DeployMockTokens.s.sol` 和 `DeployAdditionalTokens.s.sol`）
2. ✅ 已部署 PriceOracle 并配置 Chainlink price feeds
3. ✅ `deployed-contracts.json` 包含所有代币地址
4. ✅ 部署者账户有一定 BNB 余额用于 gas 费

**注意**：脚本会自动检查每个代币的余额，如果不足会自动 mint 所需数量，无需手动准备代币!

### **配置说明**

**脚本自动从 `deployed-contracts.json` 读取以下信息：**
- 所有代币地址 (WBNB, BTCB, ETH, ADA, BCH, USDT)
- PriceOracle 地址

**仅需在 `.env` 文件中配置：**

```bash
# 私钥（唯一必需的环境变量）
PRIVATE_KEY=your_private_key
```

**不再需要手动配置代币地址！** 脚本会自动从 JSON 文件读取。

### **自动余额管理**

脚本在设置流动性前会自动检查代币余额：

```
Checking balance for token: 0x2213...
  Current balance: 1000000
  Required amount: 5000000
  Insufficient! Minting: 4000000
  New balance: 5000000
```

如果余额不足，脚本会自动调用 `mint()` 函数补充所需代币。

**这意味着：**
- ✅ 不需要手动 mint 大量代币
- ✅ 初始部署时只需 mint 少量代币即可
- ✅ 脚本会根据价格自动计算并 mint 精确数量

### **运行脚本**

#### 测试网部署

```bash
forge script script/SetupLiquidity.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  --verify
```

#### 本地模拟（不广播）

```bash
forge script script/SetupLiquidity.s.sol \
  --rpc-url bnb_testnet
```

## 📝 脚本执行流程

1. **读取配置**
   - 从环境变量加载代币地址和预言机地址

2. **为每个代币创建 V3 池**
   - 从预言机获取代币价格
   - 计算所需代币数量（500万 USDT ÷ 价格）
   - 批准代币给 V3 Position Manager
   - 计算 sqrtPriceX96（初始化价格）
   - 创建并初始化 V3 池
   - 提供全范围流动性

3. **输出结果**
   - 显示创建的池地址
   - 显示 Position ID 和流动性数量

## 🔍 关键函数说明

### `setupV3PoolWithOracle(address token, string memory symbol)`

从预言机获取价格并创建 V3 池。

**流程**：
```solidity
1. 调用 IPriceOracle(priceOracle).getPrice(token)
2. 打印价格信息
3. 调用 setupV3Pool() 创建池
```

### `setupV3Pool(address token, address usdt, uint24 fee, uint256 usdtAmount, uint256 tokenPrice)`

创建 V3 流动性池的核心函数。

**参数**：
- `token`: 代币地址（非 USDT）
- `usdt`: USDT 地址
- `fee`: 费率层级（2500 = 0.25%）
- `usdtAmount`: USDT 数量（5,000,000e18）
- `tokenPrice`: 代币价格（18 位小数，从预言机获取）

**流程**：
1. 根据价格计算代币数量：`tokenAmount = (usdtAmount * 1e18) / tokenPrice`
2. 排序 token0 和 token1（地址从小到大）
3. 计算 sqrtPriceX96（初始化价格）
4. 创建并初始化池
5. 提供全范围流动性（tick: -887220 到 887220）

## ⚙️ 价格计算原理

### **从预言机获取价格的优势**

```solidity
// 预言机返回价格格式
uint256 price = oracle.getPrice(WBNB); // 例如: 600e18 (18位小数)

// 计算 WBNB 数量
uint256 wbnbAmount = (5_000_000e18 * 1e18) / 600e18;
// = 8,333.33e18 WBNB
```

### **为什么选择预言机而非手动配置？**

| 方式 | 优点 | 缺点 |
|------|------|------|
| **预言机** | ✅ 价格一致性<br>✅ 自动化<br>✅ 减少错误<br>✅ 易于维护 | ⚠️ 依赖预言机部署 |
| **手动配置** | ✅ 不依赖外部合约 | ❌ 价格可能不一致<br>❌ 需要手动更新<br>❌ 容易出错 |

## 🎯 与合约配置的关联

在部署脚本中需要配置 Router 和 Rebalancer 使用 V3 池：

```solidity
// DeployBlockETFWithMocks.s.sol

// 所有代币都使用 V3（不再需要 V2 配置）
// V3 池地址将在 SetupLiquidity 脚本中创建

// 如果需要指定特定池地址（可选）：
router.setAssetV3Pool(WBNB, WBNB_USDT_V3_POOL);
rebalancer.configureAssetPool(WBNB, WBNB_USDT_V3_POOL, 2500);
```

## 📊 验证池创建

### **方法 1：通过脚本输出**

脚本执行后会显示：
```
Setting up WBNB/USDT pool
  Token: 0x...
  Price from oracle: 600 USD
  V3 Pool created:
    Pool: 0x...
    Position ID: 12345
    Liquidity: 1234567890
```

### **方法 2：通过 PancakeSwap 测试网**

访问 [PancakeSwap Testnet](https://pancake.kiemtienonline360.com/) 查看池子。

### **方法 3：通过 Cast 命令**

```bash
# 查询池地址
cast call $V3_FACTORY \
  "getPool(address,address,uint24)(address)" \
  $WBNB $USDT 2500 \
  --rpc-url bnb_testnet

# 查询池流动性
cast call $POOL_ADDRESS \
  "liquidity()(uint128)" \
  --rpc-url bnb_testnet
```

## ⚠️ 注意事项

1. **代币余额**
   - 确保部署账户有足够的代币余额
   - 每个代币需要：500万 USDT + 对应数量的代币
   - 建议先 mint 足够的 Mock 代币

2. **预言机价格**
   - 确保预言机已设置所有代币的价格
   - 价格应该合理，避免极端值

3. **Gas 费用**
   - V3 池创建需要较多 gas
   - 建议在测试网有足够的 BNB

4. **池子验证**
   - 创建后检查池地址是否正确
   - 验证流动性是否符合预期

## 🔧 故障排除

### **问题 1：预言机地址未设置**

```
Error: Environment variable "PRICE_ORACLE" not found
```

**解决**：在 `.env` 中添加 `PRICE_ORACLE=0x...`

### **问题 2：代币余额不足**

```
Error: ERC20: transfer amount exceeds balance
```

**解决**：先运行 `DeployMockTokens.s.sol` 或手动 mint 代币

### **问题 3：价格为 0**

```
Error: Price oracle access failed
```

**解决**：确保预言机已设置所有代币价格

### **问题 4：池已存在**

如果池已创建，脚本会跳过初始化，直接添加流动性。

## 📚 相关文档

- [PancakeSwap V3 文档](https://docs.pancakeswap.finance/developers/smart-contracts/pancakeswap-exchange/v3-contracts)
- [Uniswap V3 核心概念](https://docs.uniswap.org/concepts/protocol/concentrated-liquidity)
- [WBNB V3 配置指南](./MAINNET_V3_CONFIG.md)

## 🎉 总结

**SetupLiquidity** 脚本现在完全使用 V3 池，通过预言机自动获取价格，为所有代币对提供深度流动性（每个池 500 万 USDT）。这确保了：

✅ 价格一致性
✅ 更低的交易费率
✅ 更好的资本效率
✅ 与 Router/Rebalancer 完美配合

---

**最后更新**: 2025-10-08
**版本**: v2.0 (V3 Only)
