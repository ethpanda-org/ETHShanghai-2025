# ETF配置已更新为5个资产

## 更新内容

ETF配置已从4个资产更新为5个资产（Top 5加密货币），配置如下：

### 资产配置

| 资产 | 权重 | 说明 |
|------|------|------|
| WBNB | 30% (3000 bps) | Wrapped BNB |
| BTCB | 30% (3000 bps) | Bitcoin BEP20 |
| ETH  | 20% (2000 bps) | Ethereum BEP20 |
| ADA  | 10% (1000 bps) | Cardano BEP20 |
| BCH  | 10% (1000 bps) | Bitcoin Cash BEP20 |

**总权重**: 100% (10000 bps)

### 已部署合约地址

根据 `deployed-contracts.json`:

```json
{
  "WBNB": "0xfadc475b03e3bd7813a71446369204271a0a9843",
  "BTCB": "0x15ab97353bfb6c6f07b3354a2ea1615eb2f45941",
  "ETH": "0x1cd44ec6cfb99132531793a397220c84216c5eed",
  "ADA": "0xbe1bf5c613c64b2a5f2ded08b4a26dd2082fa2cb",
  "BCH": "0x1ab580a59da516f068f43efcac10cc33862a7e88",
  "ETF Core": "0x862aDe3291CA93ed9cAC581a96A03B9F82Aaf84f",
  "Price Oracle": "0x33bfb48f9f7203259247f6a12265fcb8571e1951",
  "Rebalancer": "0xC7f5Be24d0aCd658bCC728aF3619bFb5FA6BA049",
  "Router": "0x0926839eA33f3d776Ce2C184E52DF330561BEdA2"
}
```

## 更新的文件

以下文件已更新以支持5个资产：

### 1. DeployConfig.sol
- ✅ 更新资产权重配置
- ✅ 更新 `getInitialAssets()` 函数（5个资产）
- ✅ 更新 `getInitialWeights()` 函数
- ✅ 更新 `getPoolFees()` 函数
- ✅ 更新 `validateConfig()` 函数

### 2. InitializeETF.s.sol
- ✅ 更新token地址变量（添加ADA和BCH）
- ✅ 更新环境变量要求
- ✅ 更新 `getTokenAddresses()` 函数
- ✅ 更新 `getTokenSymbols()` 函数

### 3. QuickInitializeETF.sh
- ✅ 更新必需环境变量检查
- ✅ 更新token数组
- ✅ 更新资产权重显示

### 4. DeployBlockETF.s.sol
- ✅ 更新mock token部署（添加ADA和BCH）
- ✅ 更新 `initializeBlockETFCore()` 函数
- ✅ 更新部署摘要输出

### 5. .env.example
- ✅ 添加 ADA_ADDRESS
- ✅ 添加 BCH_ADDRESS
- ✅ 更新资产权重配置

## 使用新配置初始化ETF

### 步骤 1: 更新环境变量

编辑你的 `.env` 文件，添加所有5个资产地址：

```bash
# 已部署的合约地址
ETF_CORE_ADDRESS=0x862aDe3291CA93ed9cAC581a96A03B9F82Aaf84f
PRICE_ORACLE_ADDRESS=0x33bfb48f9f7203259247f6a12265fcb8571e1951

# Top 5 Crypto资产地址
WBNB_ADDRESS=0xfadc475b03e3bd7813a71446369204271a0a9843
BTCB_ADDRESS=0x15ab97353bfb6c6f07b3354a2ea1615eb2f45941
ETH_ADDRESS=0x1cd44ec6cfb99132531793a397220c84216c5eed
ADA_ADDRESS=0xbe1bf5c613c64b2a5f2ded08b4a26dd2082fa2cb
BCH_ADDRESS=0x1ab580a59da516f068f43efcac10cc33862a7e88

# 资产权重（新配置）
WEIGHT_WBNB=3000  # 30%
WEIGHT_BTCB=3000  # 30%
WEIGHT_ETH=2000   # 20%
WEIGHT_ADA=1000   # 10%
WEIGHT_BCH=1000   # 10%
```

### 步骤 2: 确保价格已设置

所有5个资产的价格都必须在PriceOracle中设置：

```bash
# 检查所有资产的价格
cast call 0x33bfb48f9f7203259247f6a12265fcb8571e1951 \
    "getPrice(address)(uint256)" \
    0xfadc475b03e3bd7813a71446369204271a0a9843 \
    --rpc-url $RPC_URL  # WBNB

# 对其他4个资产重复执行...
```

如果价格未设置，运行价格同步脚本：

```bash
forge script script/SyncPoolPrices.s.sol --rpc-url bnb_testnet --broadcast
```

### 步骤 3: 运行初始化脚本

```bash
# 方法A：使用快速脚本（推荐）
./script/QuickInitializeETF.sh

# 方法B：使用Forge脚本
forge script script/InitializeETF.s.sol:InitializeETF \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $PRIVATE_KEY \
    -vvv
```

## 所需Token数量示例

假设价格如下（实际价格从Oracle获取）：
- WBNB = $600
- BTCB = $95,000
- ETH = $3,500
- ADA = $0.50
- BCH = $400

对于$100目标价值：

| 资产 | 权重 | 目标价值 | 所需数量 |
|------|------|----------|----------|
| WBNB | 30% | $30 | 0.050 WBNB |
| BTCB | 30% | $30 | 0.000316 BTCB |
| ETH | 20% | $20 | 0.00571 ETH |
| ADA | 10% | $10 | 20 ADA |
| BCH | 10% | $10 | 0.025 BCH |

**注意**: 脚本会根据Oracle中的实时价格自动计算所需数量。

## 验证配置

编译并验证配置正确：

```bash
# 编译所有合约和脚本
forge build

# 验证权重总和为10000
forge script script/DeployConfig.sol --sig "validateConfig()(bool)"
```

## Pool信息

根据 `deployed-contracts.json`，以下V3 Pool已部署：

| Pool | 地址 | 费率 | TVL |
|------|------|------|-----|
| WBNB-USDT | 0xc0ABC31fEf2747B54fBfB44c176EF3d775928Fe7 | 0.25% | ~$1M |
| BTCB-USDT | 0x8c9004dcaf0ddeac935a173ac1763935c5d2b0fb | 0.25% | ~$1M |
| ETH-USDT | 0xad7e45981973026ef7d296aa158836b44379192a | 0.25% | ~$1M |
| ADA-USDT | 0xde40e85e517bb99db0de0d2d17e7a13d63bf0319 | 0.05% | ~$1M |
| BCH-USDT | 0xf0e84c2dda797cd9ab7b206a7cdd4acc3cabadcf | 0.05% | ~$1M |

## 变更说明

### 从4资产到5资产的变更

**旧配置** (4个资产):
- WBNB: 40%
- BTCB: 30%
- ETH: 20%
- USDT: 10%

**新配置** (5个资产):
- WBNB: 30%
- BTCB: 30%
- ETH: 20%
- ADA: 10%
- BCH: 10%

### 主要变更点

1. **移除USDT**: USDT作为稳定币，不计入"Top 5 Crypto"
2. **添加ADA和BCH**: 增加了两个主流加密货币
3. **调整WBNB权重**: 从40%降至30%，为新资产腾出空间
4. **保持BTCB和ETH权重**: BTCB保持30%，ETH保持20%

## 注意事项

### ⚠️ 重要提示

1. **ETF已初始化**: 如果ETF Core合约已经初始化，则无法更改资产配置。需要部署新的ETF Core合约。

2. **价格必须设置**: 所有5个资产的价格必须在Oracle中正确设置。

3. **足够的Token余额**: 确保你的钱包有足够的所有5个token。

4. **Gas费用**: 处理5个资产会消耗更多gas，确保有足够的BNB支付gas费。

5. **测试网部署**: 当前配置适用于BNB Testnet (Chain ID 97)。

## 故障排除

### 错误: "ETF is already initialized"

当前的ETF Core合约已经初始化。解决方案：
1. 部署新的ETF Core合约
2. 使用新合约地址更新环境变量
3. 重新运行初始化脚本

### 错误: "Price not set for token"

某个资产的价格未在Oracle中设置。解决方案：
```bash
forge script script/SyncPoolPrices.s.sol --rpc-url bnb_testnet --broadcast
```

### 错误: "Insufficient balance"

钱包中某个token余额不足。解决方案：
1. 从水龙头获取测试token
2. 在PancakeSwap上交换token
3. 使用mock token的mint功能（如果可用）

## 下一步

初始化完成后：

1. ✅ 设置费用配置
2. ✅ 配置Rebalancer地址
3. ✅ 设置重新平衡参数
4. ✅ 测试mint/burn操作
5. ✅ 监控ETF性能

## 相关文档

- [INITIALIZATION_GUIDE.md](INITIALIZATION_GUIDE.md) - 完整初始化指南
- [script/README_INITIALIZATION.md](script/README_INITIALIZATION.md) - 脚本文档
- [deployed-contracts.json](deployed-contracts.json) - 已部署合约地址

---

**更新时间**: 2025-10-10  
**状态**: ✅ 所有脚本已更新并编译通过
