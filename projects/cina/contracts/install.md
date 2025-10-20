# Sepolia 测试网部署方案

## 📊 当前状态

### ✅ 已部署的核心合约

| 合约类别 | 合约名称 | 代理地址 | 状态 |
|---------|---------|---------|------|
| **代币** | FxUSD | `0x085a1b6da46ae375b35dea9920a276ef571e209c` | ✅ 已部署并初始化 |
| **基础池** | FxUSDBasePool | `0x420D6b8546F14C394A703F5ac167619760A721A9` | ✅ 已部署并初始化 |
| **稳定器** | PegKeeper | `0x628648849647722144181c9CB5bbE0CCadd50029` | ✅ 已部署并初始化 |
| **池管理器** | PoolManager | `0xbb644076500ea106d9029b382c4d49f56225cb82` | ✅ 已部署并初始化 |
| **长仓池** | AaveFundingPool | `0xAb20B978021333091CA307BB09E022Cec26E8608` | ✅ 已部署并注册 |
| **储备池** | ReservePool | `0x3908720b490a2368519318dD15295c22cd494e34` | ✅ 已部署 |
| **收益池** | RevenuePool | `0x54AC8d19ffc522246d9b87ED956de4Fa0590369A` | ✅ 已部署 |

### ❌ 主网已有但 Sepolia 缺失的合约

根据主网部署情况，以下合约建议部署到 Sepolia：

#### 1. **价格预言机系统** (优先级：🔥🔥🔥 最高)
- **StETHPriceOracle** - wstETH 价格预言机
  - 依赖：Chainlink ETH-USD, Curve stETH/ETH 池
  - **重要性**: 这可能是导致当前开仓失败的主要原因
  
#### 2. **WstETH 长仓池** (优先级：🔥🔥 高)
- **WstETHPool** (AaveFundingPool 类型)
  - 依赖：StETHPriceOracle, PoolManager
  - 用途：提供 wstETH 作为抵押品的长仓功能

#### 3. **Router 系统** (优先级：🔥🔥 高)
- **Diamond Proxy** + **多个 Facets**
  - DiamondCutFacet
  - DiamondLoupeFacet
  - FlashLoanCallbackFacet
  - FxUSDBasePoolFacet
  - PositionOperateFlashLoanFacet
  - MigrateFacet
  - OwnershipFacet
  - RouterManagementFacet
- 用途：提供用户友好的前端交互接口

#### 4. **短仓系统** (优先级：🔥 中)
- **ShortPoolManager** - 短仓池管理器
- **FxUSDPriceOracle** - fxUSD 价格预言机
- **PoolConfiguration** - 池配置合约
- **ProtocolTreasury** - 协议金库
- **ShortPool** (wstETH) - wstETH 短仓池
- **CreditNote** - 信用票据
- **InverseWstETHPriceOracle** - 反向价格预言机

#### 5. **辅助工具** (优先级：低)
- **DebtReducer** - 债务削减器
- **GaugeRewarder** - 流动性挖矿奖励器
- **PositionAirdrop** - 仓位空投
- **StrategyHarvester** - 策略收割器

## 🎯 推荐部署方案

### 方案 A: 快速修复方案 (推荐) ⭐

**目标**: 最快速度让当前 Sepolia 部署可用

**步骤**:
1. **部署 PoolConfiguration** (如果还没有)
   - 这是当前开仓失败的可能原因
   - 主网地址参考: 部署在 ShortPoolManager 模块中

2. **配置 PoolManager**
   - 检查是否正确设置了 PoolConfiguration
   - 验证所有费用参数

3. **调试并修复开仓功能**
   - 使用 Tenderly 模拟
   - 检查 revert 原因

**优点**:
- 工作量小
- 可以快速验证核心功能

**缺点**:
- 功能不完整
- 只支持 USDC 池

---

### 方案 B: 完整部署方案 (全面)

**目标**: 复制主网的完整功能到 Sepolia

**阶段 1: 价格预言机** (1-2 小时)
```bash
# 1. 部署 StETHPriceOracle
npx hardhat ignition deploy ignition/modules/PriceOracle.ts --network sepolia

# 注意: Sepolia 可能没有相同的 Curve 池，需要：
# - 使用 Mock 价格预言机，或
# - 部署简化版只使用 Chainlink
```

**阶段 2: WstETH 长仓池** (1-2 小时)
```bash
# 2. 部署 WstETHPool
npx hardhat ignition deploy ignition/modules/pools/WstETHPool.ts \
  --network sepolia \
  --parameters ignition/parameters/sepolia-wsteth-pool.json
```

**阶段 3: Router 系统** (2-3 小时)
```bash
# 3. 部署 Router (Diamond)
npx hardhat ignition deploy ignition/modules/Router.ts \
  --network sepolia \
  --parameters ignition/parameters/sepolia-router.json
```

**阶段 4: 短仓系统** (3-4 小时)
```bash
# 4. 部署 ShortPoolManager 及相关合约
npx hardhat ignition deploy ignition/modules/ShortPoolManager.ts \
  --network sepolia \
  --parameters ignition/parameters/sepolia-short-pool.json
```

**总时间**: 7-11 小时

**优点**:
- 完整功能
- 与主网一致
- 全面测试

**缺点**:
- 工作量大
- Sepolia 可能缺少某些依赖（如 Curve 池）

---

### 方案 C: 渐进式部署方案 (平衡) ⭐⭐

**目标**: 先部署关键功能，逐步扩展

**第一步: 修复当前问题** (立即)
1. 检查并部署缺失的 PoolConfiguration
2. 调试开仓功能
3. 验证 USDC 池可用

**第二步: 添加 wstETH 支持** (1-2 天后)
1. 部署价格预言机
2. 部署 WstETHPool
3. 测试 wstETH 长仓

**第三步: 部署 Router** (1 周后)
1. 部署 Diamond 和 Facets
2. 集成前端
3. 用户体验测试

**第四步: 完整功能** (按需)
1. 部署短仓系统
2. 部署辅助工具
3. 全面测试

**优点**:
- 灵活性高
- 可以根据反馈调整
- 风险分散

**缺点**:
- 需要多次部署
- 总时间较长

## 🔧 具体实施建议

### 1. 环境准备

#### 1.1 检查 Sepolia 依赖
```typescript
// 需要确认 Sepolia 上是否有:
- Chainlink Price Feeds (ETH-USD, USDC-USD)
- wstETH 代币
- USDC 代币
- Curve 池 (stETH/ETH, USDC/fxUSD) - 可能需要 Mock
- Balancer 池 - 可能需要 Mock
```

#### 1.2 创建参数文件
```bash
# 为每个模块创建 Sepolia 专用参数
mkdir -p ignition/parameters/sepolia
```

### 2. 部署脚本准备

#### 2.1 创建 PoolConfiguration 参数文件
```json
// ignition/parameters/sepolia-pool-config.json
{
  "ShortPoolManager": {
    "FxUSDBasePoolProxy": "0x420D6b8546F14C394A703F5ac167619760A721A9",
    "LendingPool": "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951", // Aave V3 Sepolia
    "BaseAsset": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC Sepolia
    "Treasury": "你的地址",
    "PoolManagerProxy": "0xbb644076500ea106d9029b382c4d49f56225cb82"
  }
}
```

#### 2.2 使用简化的价格预言机
由于 Sepolia 可能没有完整的 Curve 池，建议：

**选项 A: Mock 价格预言机**
```solidity
// 创建 MockPriceOracle.sol
contract MockPriceOracle {
    function getPrice() external pure returns (uint256) {
        return 2000e18; // 固定价格用于测试
    }
}
```

**选项 B: 纯 Chainlink 预言机** (推荐)
```solidity
// SimplifiedStETHPriceOracle.sol
// 只使用 Chainlink，不依赖 Curve
```

### 3. 分步部署命令

#### 步骤 1: 检查当前状态
```bash
# 创建检查脚本
cat > scripts/check-deployment-status.ts << 'EOF'
import { ethers } from "hardhat";

async function main() {
  const poolManager = await ethers.getContractAt(
    "PoolManager",
    "0xbb644076500ea106d9029b382c4d49f56225cb82"
  );
  
  // 检查配置
  try {
    const config = await poolManager.configuration();
    console.log("✅ PoolConfiguration:", config);
  } catch (e) {
    console.log("❌ PoolConfiguration not set");
  }
  
  // 检查其他参数...
}

main().catch(console.error);
EOF

npx hardhat run scripts/check-deployment-status.ts --network sepolia
```

#### 步骤 2: 部署缺失的 PoolConfiguration
```bash
# 如果缺失，单独部署
cat > scripts/deploy-pool-configuration.ts << 'EOF'
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const PoolConfiguration = await ethers.getContractFactory("PoolConfiguration");
  
  // 部署实现
  const impl = await PoolConfiguration.deploy(
    "0x420D6b8546F14C394A703F5ac167619760A721A9", // FxUSDBasePool
    "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951", // Aave V3 Sepolia
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"  // USDC
  );
  
  await impl.waitForDeployment();
  console.log("Implementation:", await impl.getAddress());
  
  // 部署代理并初始化...
}

main().catch(console.error);
EOF

npx hardhat run scripts/deploy-pool-configuration.ts --network sepolia
```

#### 步骤 3: 配置并测试
```bash
# 配置 PoolManager
npx hardhat run scripts/configure-pool-manager.ts --network sepolia

# 测试开仓
npx hardhat run scripts/test-open-position.ts --network sepolia
```

### 4. 测试网络特殊考虑

#### 4.1 Gas 价格
```typescript
// Sepolia gas 价格较低，建议设置:
{
  gasPrice: ethers.parseUnits("1", "gwei"), // 1 gwei 足够
}
```

#### 4.2 获取测试代币
```bash
# Sepolia USDC 水龙头
# https://faucet.circle.com/

# Sepolia ETH 水龙头
# https://sepoliafaucet.com/
```

#### 4.3 使用测试 Oracle
对于不存在的池子，使用固定价格或 Mock：
```typescript
// 在参数文件中使用 Mock 地址
{
  "SpotPriceOracle": "0x...", // MockOracle 地址
}
```

## 📝 推荐的部署顺序

### 优先级排序

1. **🔥🔥🔥 立即 (今天)**
   - 调试当前开仓失败原因
   - 部署/配置 PoolConfiguration (如缺失)
   - 验证 USDC 池功能

2. **🔥🔥 短期 (本周)**
   - 部署简化版价格预言机
   - 部署 WstETHPool
   - 测试多资产支持

3. **🔥 中期 (下周)**
   - 部署 Router 系统
   - 集成前端
   - 用户体验测试

4. **💡 长期 (按需)**
   - 短仓系统
   - 完整功能复制
   - 性能优化

## ⚠️ 注意事项

### 1. Sepolia 与主网的差异

| 项目 | 主网 | Sepolia | 解决方案 |
|------|------|---------|---------|
| Curve 池 | 完整 | 可能缺失 | 使用 Mock 或跳过 |
| Chainlink Feeds | 完整 | 部分支持 | 检查可用性 |
| Aave V3 | 完整 | 支持 | ✅ 可用 |
| 流动性 | 充足 | 有限 | 准备足够测试币 |

### 2. 参数调整建议

```typescript
// Sepolia 建议使用更宽松的参数
{
  // 降低容量限制
  collateralCapacity: ethers.parseUnits("10000", 6),  // 10K USDC
  debtCapacity: ethers.parseUnits("50000", 18),       // 50K fxUSD
  
  // 降低最小金额
  minCollateral: ethers.parseUnits("10", 6),          // 10 USDC
  
  // 更宽松的债务比率
  maxDebtRatio: ethers.parseEther("0.9"),             // 90%
}
```

### 3. 安全考虑

```bash
# 使用测试账户，不要用主网私钥
PRIVATE_KEY=0x... # 测试账户

# 设置合理的 gas 限制
MAX_FEE_PER_GAS=10gwei

# 验证所有合