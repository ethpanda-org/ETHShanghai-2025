# ETF Contracts Deployment Guide

## 部署顺序

### 1. 部署 QuoterV3

首先需要在 `view-quoter-v3` 项目中部署 Quoter 合约：

```bash
cd ../view-quoter-v3
forge script script/DeployQuoter.s.sol --rpc-url bnb_testnet --broadcast
```

**保存输出的 Quoter 地址**，例如：`0x...`

### 2. 更新部署脚本

编辑 `script/DeployETFContractsWithQuoter.s.sol`，更新第 25 行：

```solidity
// 将 address(0) 替换为实际的 QuoterV3 地址
address constant QUOTER_V3 = 0xYourQuoterAddressHere;
```

### 3. 部署 ETF 核心合约

```bash
cd ../blocketf-contracts
forge script script/DeployETFContractsWithQuoter.s.sol --rpc-url bnb_testnet --broadcast
```

这将依次部署：
1. **BlockETFCore** - ETF 核心合约（ERC20 token）
2. **ETFRebalancerV1** - 再平衡合约
3. **ETFRouterV1** - 路由合约（用户交互入口）

并自动完成配置：
- 将 Rebalancer 设置到 ETFCore

### 4. 保存部署地址

部署完成后，保存以下地址到 `deployed-contracts.json`：

```json
{
  "contracts": {
    "etfCore": "0x...",
    "rebalancer": "0x...",
    "router": "0x...",
    "quoterV3": "0x..."
  }
}
```

## 已部署的依赖

以下合约已经部署（从 `deployed-contracts.json` 读取）：

- **PriceOracle**: 价格预言机
- **WBNB**: 测试网 BNB token
- **USDT**: 测试网 USDT token
- **其他资产**: BTCB, ETH, ADA, BCH

## PancakeSwap V3 地址 (BSC Testnet)

- **V3 Factory**: `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865`
- **V3 SwapRouter**: `0x1b81D678ffb9C0263b24A97847620C99d213eB14`
- **V2 Router**: `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`

## 下一步

部署完成后：

1. **初始化 ETF** - 设置资产和权重
2. **配置费用** - 设置管理费等（可选）
3. **测试功能** - mint/burn/rebalance

## 验证合约

如果需要在 BscScan 上验证合约：

```bash
# 验证 ETFCore
forge verify-contract <ETFCore地址> BlockETFCore --rpc-url bnb_testnet --watch

# 验证 Rebalancer
forge verify-contract <Rebalancer地址> ETFRebalancerV1 --rpc-url bnb_testnet --watch

# 验证 Router
forge verify-contract <Router地址> ETFRouterV1 --rpc-url bnb_testnet --watch
```

确保 `.env` 文件中包含 `BSCSCAN_API_KEY`。
