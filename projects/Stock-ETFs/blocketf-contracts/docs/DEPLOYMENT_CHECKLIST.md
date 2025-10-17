# BNB 测试网部署清单

## ✅ 已完成的准备工作

### 1. Mock 合约
- ✅ `MockERC20.sol` - 完整 ERC20 实现，带 faucet 功能
- ✅ `MockPriceOracle.sol` - 可手动设置价格的预言机

### 2. 部署脚本
- ✅ `DeployBlockETFWithMocks.s.sol` - 主部署脚本（5 资产策略）
- ✅ `SetupLiquidity.s.sol` - 流动性池设置脚本

### 3. 配置文件
- ✅ `DeployConfig.sol` - 部署参数配置
- ✅ `.env.example` - 环境变量模板
- ✅ `foundry.toml` - Forge 配置

### 4. 文档
- ✅ `TESTNET_DEPLOYMENT_GUIDE.md` - 详细部署指南
- ✅ `DEPLOYMENT_CHECKLIST.md` - 本清单

## 🔄 待完成的工作

### A. 部署前准备（15分钟）

#### 1. 配置环境变量
```bash
# 复制模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

需要填写：
- [ ] `PRIVATE_KEY` - 部署者私钥（不带 0x）
- [ ] `BSCSCAN_API_KEY` - 从 https://bscscan.com/myapikey 获取

#### 2. 获取测试网 BNB
- [ ] 访问 https://testnet.bnbchain.org/faucet-smart
- [ ] 至少获取 5 BNB（用于 gas）

#### 3. 验证环境
```bash
# 测试 RPC 连接
cast block-number --rpc-url bnb_testnet

# 检查账户余额
cast balance <YOUR_ADDRESS> --rpc-url bnb_testnet

# 编译合约
forge build
```

### B. 执行部署（20分钟）

#### 4. 部署 BlockETF 系统
```bash
forge script script/DeployBlockETFWithMocks.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  --verify \
  -vvvv
```

预期结果：
- [ ] 部署 5 个 Mock 代币（BTCB, ETH, XRP, SOL, USDT）
- [ ] 部署 MockPriceOracle 并设置初始价格
- [ ] 部署 BlockETFCore、ETFRebalancerV1、ETFRouterV1
- [ ] 初始化 ETF（BNB 20%, BTC 30%, ETH 25%, XRP 10%, SOL 15%）
- [ ] 所有合约自动验证成功

#### 5. 记录合约地址
复制输出的地址到 `.env`：
- [ ] `BLOCK_ETF_CORE`
- [ ] `ETF_REBALANCER_V1`
- [ ] `ETF_ROUTER_V1`
- [ ] `MOCK_PRICE_ORACLE`
- [ ] `MOCK_TOKEN_FAUCET` ⭐ 重要！
- [ ] `WBNB`, `BTCB`, `ETH`, `XRP`, `SOL`, `USDT`

### C. 设置流动性（30分钟）

#### 6. 获取测试代币（一键领取！）
```bash
# 🎉 新方式：一键领取所有 6 个代币！
cast send $MOCK_TOKEN_FAUCET "claimAll()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

一次交易将获得：
- [ ] ✅ 10 WBNB
- [ ] ✅ 0.1 BTCB
- [ ] ✅ 1 ETH
- [ ] ✅ 1000 XRP
- [ ] ✅ 10 SOL
- [ ] ✅ 10,000 USDT

💡 **优势**：1 次交易 vs 6 次交易，节省 gas 和时间！

#### 7. 创建流动性池
```bash
forge script script/SetupLiquidity.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  -vvvv
```

预期结果：
- [ ] V2 池：WBNB/USDT, WBNB/BTCB, WBNB/ETH, WBNB/XRP, WBNB/SOL
- [ ] V3 池：BTCB/USDT, ETH/USDT, XRP/USDT, SOL/USDT

### D. 功能测试（20分钟）

#### 8. 测试铸造 ETF
```bash
# 1. 批准 USDT
cast send $USDT "approve(address,uint256)" $ETF_ROUTER_V1 1000000000000000000000 \
  --rpc-url bnb_testnet --private-key $PRIVATE_KEY

# 2. 铸造 1000 USDT 的 ETF
cast send $ETF_ROUTER_V1 "mintWithUSDT(uint256,uint256,uint256)" \
  1000000000000000000000 0 $(($(date +%s) + 3600)) \
  --rpc-url bnb_testnet --private-key $PRIVATE_KEY
```

- [ ] 批准成功
- [ ] 铸造成功
- [ ] 检查 ETF 余额

#### 9. 检查 ETF 状态
```bash
# 总供应量
cast call $BLOCK_ETF_CORE "totalSupply()(uint256)" --rpc-url bnb_testnet

# 资产列表
cast call $BLOCK_ETF_CORE "getAssets()(address[])" --rpc-url bnb_testnet

# 当前权重
cast call $BLOCK_ETF_CORE "getCurrentWeights()(uint256[])" --rpc-url bnb_testnet
```

- [ ] 总供应量 > 0
- [ ] 资产列表正确（5个资产）
- [ ] 权重接近目标（考虑滑点）

#### 10. 测试 Rebalance
```bash
# 检查是否需要 rebalance
cast call $BLOCK_ETF_CORE "needsRebalance()(bool)" --rpc-url bnb_testnet

# 如果需要，执行 rebalance
cast send $ETF_REBALANCER_V1 "executeRebalance()" \
  --rpc-url bnb_testnet --private-key $PRIVATE_KEY --gas-limit 5000000
```

- [ ] Rebalance 检查正常
- [ ] 如需要，rebalance 执行成功

## 🎯 部署成功标准

### 必须达到的标准：
1. ✅ 所有合约部署成功且已验证
2. ✅ 所有流动性池创建成功
3. ✅ 能够成功铸造 ETF 份额
4. ✅ ETF 持有 5 种资产，权重接近目标
5. ✅ Rebalance 功能可以执行

### 可选验证：
- [ ] 测试赎回 ETF（burnToUSDT）
- [ ] 测试更新价格后的 rebalance
- [ ] 检查 gas 消耗是否合理
- [ ] 在 BscScan 上查看合约代码

## 📊 关键参数

### 资产配置
```
BNB:  20% (PancakeSwap V2)
BTC:  30% (PancakeSwap V3)
ETH:  25% (PancakeSwap V3)
XRP:  10% (PancakeSwap V3)
SOL:  15% (PancakeSwap V3)
```

### 初始价格
```
BNB:  $600
BTC:  $95,000
ETH:  $3,400
XRP:  $2.5
SOL:  $190
USDT: $1.0
```

### 费用配置
```
铸造费用:     0.3% (30 bps)
赎回费用:     0.3% (30 bps)
管理费:       2% 年化 (200 bps)
Rebalance 阈值: 5% (500 bps)
```

## 🔗 有用链接

- BNB 测试网浏览器: https://testnet.bscscan.com/
- PancakeSwap 测试网: https://pancakeswap.finance/?chain=bscTestnet
- BNB 水龙头: https://testnet.bnbchain.org/faucet-smart
- BscScan API Key: https://bscscan.com/myapikey

## 🆘 故障排查

### 问题：部署失败 "insufficient funds"
**解决**：确保账户有足够的测试网 BNB（至少 5 BNB）

### 问题：合约验证失败
**解决**：手动验证合约
```bash
forge verify-contract \
  --chain-id 97 \
  --compiler-version v0.8.28 \
  <CONTRACT_ADDRESS> \
  src/<CONTRACT>.sol:<CONTRACT_NAME>
```

### 问题：SetupLiquidity 失败 "insufficient balance"
**解决**：先调用所有代币的 `faucet()` 函数获取测试代币

### 问题：Rebalance 失败 "insufficient liquidity"
**解决**：增加流动性池的流动性，或减小 rebalance 金额

## 📝 下一步计划

测试网验证完成后：
1. [ ] 记录所有测试结果
2. [ ] 优化 gas 消耗
3. [ ] 准备主网部署脚本
4. [ ] 集成真实 Chainlink 预言机
5. [ ] 安全审计
6. [ ] 主网部署
