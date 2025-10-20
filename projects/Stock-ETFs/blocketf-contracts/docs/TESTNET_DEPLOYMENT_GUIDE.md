# BlockETF 测试网部署指南

## 概述

本指南介绍如何将 BlockETF 系统部署到 BNB 测试网，包括 Mock 代币部署和流动性设置。

## 部署策略

### 为什么使用 Mock 代币？

考虑到主网部署计划（BTC、ETH、XRP、SOL、BNB），我们在测试网使用 Mock 代币而非真实测试网代币：

1. **流动性控制**：测试网 PancakeSwap 流动性极低或不存在
2. **混合场景测试**：BNB 使用 V2，其他代币使用 V3
3. **完整功能测试**：不受测试网流动性限制
4. **价格控制**：通过 MockPriceOracle 模拟真实价格

### 5 代币策略

主网目标配置：
- **BNB** (20%) - PancakeSwap V2（V2 流动性更好）
- **BTC** (30%) - PancakeSwap V3
- **ETH** (25%) - PancakeSwap V3
- **XRP** (10%) - PancakeSwap V3
- **SOL** (15%) - PancakeSwap V3

## 前置准备

### 1. 环境配置

确保 `.env` 文件已配置：

```bash
# 部署者私钥（不带 0x 前缀）
PRIVATE_KEY=your_private_key_here

# BscScan API Key（用于合约验证）
BSCSCAN_API_KEY=your_bscscan_api_key_here

# RPC URL
BNB_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
```

### 2. 获取测试网 BNB

从水龙头获取测试网 BNB：
- https://testnet.bnbchain.org/faucet-smart

建议准备至少 **5 BNB** 用于：
- 合约部署 gas
- Mock 代币部署
- 流动性池创建

### 3. 获取 BscScan API Key

访问 https://bscscan.com/myapikey 获取 API Key 用于合约验证。

## 部署步骤

### 步骤 1：编译合约

```bash
forge build
```

验证所有合约编译成功。

### 步骤 2：测试网络连接

```bash
# 检查 RPC 连接
cast block-number --rpc-url bnb_testnet

# 检查部署账户余额
cast balance <YOUR_ADDRESS> --rpc-url bnb_testnet
```

### 步骤 3：部署 BlockETF 系统（含 Mock 代币）

```bash
forge script script/DeployBlockETFWithMocks.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  --verify \
  -vvvv
```

这个脚本会自动完成：
1. ✅ 部署 5 个 Mock ERC20 代币（BTCB, ETH, XRP, SOL, USDT）
2. ✅ 部署 MockPriceOracle
3. ✅ 设置初始价格（BNB $600, BTC $95k, ETH $3.4k, XRP $2.5, SOL $190, USDT $1）
4. ✅ 部署 BlockETFCore
5. ✅ 部署 ETFRebalancerV1
6. ✅ 部署 ETFRouterV1
7. ✅ 初始化 ETF（5 资产，权重 20%/30%/25%/10%/15%）
8. ✅ 配置权限和阈值

### 步骤 4：记录合约地址

部署完成后，保存输出的合约地址到 `.env`：

```bash
# 核心合约
BLOCK_ETF_CORE=0x...
ETF_REBALANCER_V1=0x...
ETF_ROUTER_V1=0x...
MOCK_PRICE_ORACLE=0x...

# Mock 代币
BTCB=0x...
ETH=0x...
XRP=0x...
SOL=0x...
USDT=0x...
```

### 步骤 5：设置流动性池

⚠️ **重要**：在运行此脚本前，需要先将 Mock 代币转入部署账户。

```bash
# 首先，使用部署账户调用 Mock 代币的 faucet() 或 mint() 获取代币

# 然后设置流动性
forge script script/SetupLiquidity.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  -vvvv
```

这个脚本会：
1. 在 PancakeSwap V2 创建 BNB 配对池（WBNB/USDT, WBNB/BTCB, 等）
2. 在 PancakeSwap V3 创建 USDT 配对池（BTCB/USDT, ETH/USDT, 等）

### 步骤 6：验证合约（如果自动验证失败）

```bash
# 验证 BlockETFCore
forge verify-contract \
  --chain-id 97 \
  --num-of-optimizations 200 \
  --compiler-version v0.8.28 \
  <BLOCK_ETF_CORE_ADDRESS> \
  src/BlockETFCore.sol:BlockETFCore \
  --constructor-args $(cast abi-encode "constructor(string,string,address)" "BlockETF Index" "BETF" <ORACLE_ADDRESS>)

# 类似地验证其他合约...
```

## 部署后测试

### 1. 获取测试代币

Mock 代币提供了 faucet 功能：

```bash
# 使用 cast 调用 faucet
cast send <BTCB_ADDRESS> "faucet()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY

# 检查余额
cast call <BTCB_ADDRESS> "balanceOf(address)(uint256)" <YOUR_ADDRESS> \
  --rpc-url bnb_testnet
```

### 2. 测试铸造 ETF

使用 ETFRouterV1 铸造 ETF 份额：

```bash
# 1. 批准 USDT 给 Router
cast send <USDT_ADDRESS> "approve(address,uint256)" <ROUTER_ADDRESS> 1000000000000000000000 \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY

# 2. 使用 USDT 铸造 ETF
cast send <ROUTER_ADDRESS> "mintWithUSDT(uint256,uint256,uint256)" \
  1000000000000000000000 \  # 1000 USDT
  0 \                        # minShares
  $(($(date +%s) + 3600)) \  # deadline
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

### 3. 检查 ETF 状态

```bash
# 查看总供应量
cast call <ETF_CORE_ADDRESS> "totalSupply()(uint256)" --rpc-url bnb_testnet

# 查看资产信息
cast call <ETF_CORE_ADDRESS> "getAssets()(address[])" --rpc-url bnb_testnet

# 查看当前权重
cast call <ETF_CORE_ADDRESS> "getCurrentWeights()(uint256[])" --rpc-url bnb_testnet
```

### 4. 测试 Rebalance

```bash
# 检查是否需要 rebalance
cast call <ETF_CORE_ADDRESS> "needsRebalance()(bool)" --rpc-url bnb_testnet

# 触发 rebalance（通过 rebalancer）
cast send <REBALANCER_ADDRESS> "executeRebalance()" \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY \
  --gas-limit 5000000
```

## 合约架构

```
BlockETF System on BNB Testnet
│
├── Core Contracts
│   ├── BlockETFCore         (ETF 核心合约，管理资产和份额)
│   ├── ETFRebalancerV1      (Rebalance 执行器)
│   └── ETFRouterV1          (用户交互路由)
│
├── Mock Infrastructure
│   ├── MockPriceOracle      (价格预言机 Mock)
│   └── MockERC20 × 5        (BTCB, ETH, XRP, SOL, USDT)
│
└── External Dependencies
    ├── PancakeSwap V2       (BNB 流动性)
    ├── PancakeSwap V3       (其他代币流动性)
    └── WBNB                 (真实测试网 WBNB)
```

## 常见问题

### Q: 为什么不使用测试网真实代币？

A: 测试网 PancakeSwap 流动性极低，无法支持真实的 swap 和 rebalance 测试。Mock 代币允许我们完全控制流动性和价格。

### Q: Mock 代币与主网有什么区别？

A: Mock 代币实现了完整的 ERC20 标准，唯一区别是：
- 有 faucet 功能方便测试
- 有 mint/burn 功能（仅 owner）
- 不依赖外部预言机

### Q: 如何更新价格？

A: MockPriceOracle 支持手动设置价格：

```bash
cast send <ORACLE_ADDRESS> "setPrice(address,uint256)" \
  <TOKEN_ADDRESS> \
  3500000000000000000000 \  # $3500 (18 decimals)
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

### Q: 测试网部署和主网部署的主要区别？

主网部署时需要：
1. 使用真实代币地址（BTCB, ETH, XRP, SOL, WBNB）
2. 集成 Chainlink 价格预言机（不使用 Mock）
3. 调整 gas 优化参数
4. 进行安全审计
5. 使用多签钱包管理 admin 权限

## 下一步

1. ✅ 在测试网完整测试所有功能
2. ✅ 测试极端场景（大额交易、价格波动等）
3. ✅ 测试 V2/V3 路由逻辑
4. ✅ 优化 gas 消耗
5. ⬜ 准备主网部署脚本
6. ⬜ 安全审计
7. ⬜ 主网部署

## 参考资料

- [PancakeSwap V2 文档](https://docs.pancakeswap.finance/developers/smart-contracts/pancakeswap-exchange/v2-contracts)
- [PancakeSwap V3 文档](https://docs.pancakeswap.finance/developers/smart-contracts/pancakeswap-exchange/v3-contracts)
- [BNB Chain 测试网](https://testnet.bscscan.com/)
- [Foundry Book](https://book.getfoundry.sh/)
