# CINA

## 1. 摘要

CINA DOLLAR 是一项机构级 RWA 流动性管理与去中心化稳定币协议，将合规发行能力与链上流动性效率深度融合，提供一键准入 DeFi 生态路径其治理代币 CINA 负责抵押品准入、权限管理与协议安全参数的治理。WRMB用于兑换和合约开仓。

## 2. 项目概述

### 2.1 详情
CINA DOLLAR 是一项机构级的 RWA 流动性管理与去中心化稳定币协议，深度整合合规发行能力与链上流动性效率，提供一键接入 DeFi 的通道。

在私募基金架构下，Token Studio 将合格投资人认购的货币市场基金份额或本金代币化为可审计的通证，并包装入托管支持、可实时估值的标准化抵押池。在 CINA 协议的智能合约模块中，这些代币化抵押品可用于合成并铸造稳定币 WRMB，且可直接接入 AMM 做市与链上分销网络，从而实现从资产上链到流动性释放的闭环流程。

通过链上投票，CINA 代币持有人参与抵押品准入与协议安全参数的决策；RWA 产生的收益按链上智能合约规则回流至 WRMB 持有人，CINA 质押者则持续分享协议收入（包括手续费分成与收益分配）。链上 NAV 的实时估值依托托管行提供的基金数据与预言机同步喂价，并由多方验证者复核，以确保链上 NAV 与链下实际一致。


### 2.2 核心价值主张
- **零资本杠杆**: 通过闪电贷机制实现无需初始资本的杠杆交易
- **流动性聚合**: 整合多个 DeFi 协议，提供最优交易路径
- **模块化架构**: 基于 Diamond 模式的可扩展智能合约系统

### 2.3 目标用户
- **DeFi 交易者**: 寻求高效杠杆交易的用户
- **流动性提供者**: 为协议提供流动性的用户
- **开发者**: 集成杠杆交易功能的 DApp 开发者

### 2.4 问题与解决方案

**挑战**:
- 传统杠杆交易需要大量初始资本
- 流动性分散，交易效率低
- 缺乏统一的杠杆交易接口

**解决方案**:
- 闪电贷机制实现零资本杠杆
- 流动性聚合提供最优路径
- 统一 Router 接口支持多种策略

## 3. 架构概览

### 3.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    CINA Protocol 架构                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend Layer                                             │
│  ├── Next.js (React Framework)                             │
│  ├── Wagmi (Ethereum Integration)                           │
│  └── RainbowKit (Wallet Connection)                         │
├─────────────────────────────────────────────────────────────┤
│  Router System (Diamond Pattern)                            │
│  ├── DiamondCutFacet (Contract Upgrade)                     │
│  ├── RouterManagementFacet (Route Management)               │
│  ├── PositionOperateFacet (Position Operations)              │
│  └── FlashLoanFacet (Flash Loan Integration)               │
├─────────────────────────────────────────────────────────────┤
│  Core Protocol (f(x) Protocol)                             │
│  ├── PoolManager (Pool Management)                         │
│  ├── FxUSD (Stablecoin)                                     │
│  ├── AaveFundingPool (Funding Pool)                        │
│  └── PriceOracle (Price Data Source)                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 关键组件

#### 3.2.1 Router 系统 (Diamond 架构)
- **Diamond 合约**: 核心路由合约，支持模块化功能扩展
- **7 个 Facets**: 模块化功能实现，包含 23 个核心函数
- **功能模块**: 合约升级、路由管理、仓位操作、闪电贷集成

#### 3.2.2 核心协议组件
- **PoolManager**: 池子管理和配置系统
- **FxUSD**: 协议稳定币，基于 f(x) 协议
- **AaveFundingPool**: 资金池实现，支持杠杆交易
- **PriceOracle**: 价格数据源，提供实时价格信息

#### 3.2.3 前端应用
- **Next.js**: React 全栈框架
- **Wagmi**: 以太坊连接库
- **RainbowKit**: 钱包连接组件
- **TypeScript**: 类型安全的开发环境

### 3.3 技术栈

#### 智能合约技术栈
- **Solidity**: ^0.8.26 (最新安全版本)
- **OpenZeppelin**: ^5.0.2 (安全合约库)
- **Foundry**: 测试和部署框架
- **Hardhat**: 开发环境工具

#### 前端技术栈
- **Next.js**: 14.2.5 (React 框架)
- **React**: 18.2.0 (UI 库)
- **TypeScript**: 5.4.5 (类型系统)
- **Tailwind CSS**: 3.4.10 (样式框架)
- **Wagmi**: 2.12.7 (以太坊集成)
- **Viem**: 2.9.20 (以太坊客户端)

#### 开发工具
- **pnpm**: 包管理器
- **ESLint**: 代码检查工具
- **Prettier**: 代码格式化工具

## 4. 合约与部署信息

### 4.1 网络配置
- **测试网**: Sepolia
- **链 ID**: 11155111
- **RPC URL**

### 4.2 核心合约地址

#### Router 系统

* [Router (Diamond)](https://sepolia.etherscan.io/address/0x2F1Cdbad93806040c353Cc87a5a48142348B6AfD)
* [DiamondCutFacet](https://sepolia.etherscan.io/address/0x1adb1d517f0fAd6695Ac5907CB16276FaC1C3e8B)
* [DiamondLoupeFacet](https://sepolia.etherscan.io/address/0x28909aA9fA21e06649F0E9A0a67E7CcabAAef947)
* [OwnershipFacet](https://sepolia.etherscan.io/address/0xf662BA47BE8d10a9573afb2553EDA46db3854715)
* [RouterManagementFacet](https://sepolia.etherscan.io/address/0xD3A63FfBE2EDa3D0E07426346189000f39fDa1C0)
* [MorphoFlashLoanCallbackFacet](https://sepolia.etherscan.io/address/0x7DfE7037d407af7d5B84f0aeE56f8466ce0AC150)
* [PositionOperateFlashLoanFacetV2](https://sepolia.etherscan.io/address/0x6403A2D1A99e15369A1f5C46fA2983C619D0B410)
* [FxUSDBasePoolV2Facet](https://sepolia.etherscan.io/address/0x08aD9003331FFDbe727354711bE1E8a67646C460)

#### 核心协议

* [PoolManager](https://sepolia.etherscan.io/address/0xBb644076500Ea106d9029B382C4d49f56225cB82)
* [FxUSD](https://sepolia.etherscan.io/address/0x085a1b6da46aE375b35Dea9920a276Ef571E209c)
* [FxUSDBasePool](https://sepolia.etherscan.io/address/0x420D6b8546F14C394A703F5ac167619760A721A9)
* [PegKeeper](https://sepolia.etherscan.io/address/0x628648849647722144181c9CB5bbE0CCadd50029)
* [PoolConfiguration](https://sepolia.etherscan.io/address/0x35456038942C91eb16fe2E33C213135E75f8d188)
* [AaveFundingPool](https://sepolia.etherscan.io/address/0x3C67A6Fea47A00f2Ce6D3c1D1f170558d2b091AB)
* [MockPriceOracle](https://sepolia.etherscan.io/address/0x0347f7d0952b3c55E276D42b9e2950Cc0523d787)

#### 基础设施

* [EmptyContract](https://sepolia.etherscan.io/address/0x9cca415aa29f39e46318b60ede8155a7041260b8)
* [ProxyAdmin](https://sepolia.etherscan.io/address/0x7bc6535d75541125fb3b494decfde10db20c16d8)
* [MockTokenConverter](https://sepolia.etherscan.io/address/0xc3505d17e4274c925e9c736b947fffbdafcdab27)
* [MultiPathConverter](https://sepolia.etherscan.io/address/0xc6719ba6caf5649be53273a77ba812f86dcdb951)

## 5. 运行与复现说明

### 5.1 环境要求

#### 5.1.1 系统要求
- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **Git**: >= 2.30.0

#### 5.1.2 开发工具
- **MetaMask**: 钱包连接
- **VS Code**: 推荐编辑器
- **Hardhat**: 合约开发环境
- **Foundry**: 合约测试框架

### 5.2 快速启动

#### 5.2.1 项目初始化
```bash
# 克隆项目
git clone https://github.com/CINALabs/ETHShanghai-2025.git .

# 安装合约依赖
cd contracts
pnpm install

# 安装前端依赖
cd ../frontend
pnpm install
```

#### 5.2.2 环境配置

**合约环境配置**:
```bash
cd contracts
cp env.example .env
# 编辑 .env 文件，添加私钥和 RPC URL
```

**前端环境配置**:
```bash
cd frontend
cp .env.local.example .env.local
# 编辑 .env.local 文件，配置合约地址
```

### 5.3 开发环境启动

#### 5.3.1 本地开发模式
```bash
# 启动本地 Hardhat 网络
cd contracts
npx hardhat node

# 部署合约到本地网络
npx hardhat run scripts/deploy.js --network localhost

# 启动前端应用
cd frontend
NEXT_PUBLIC_USE_LOCAL=true pnpm dev
```

#### 5.3.2 测试网模式
```bash
# 部署到 Sepolia 测试网
cd contracts
npx hardhat run scripts/deploy-sepolia.ts --network sepolia

# 启动前端应用
cd frontend
pnpm dev
```

### 5.4 合约部署指南

#### 5.4.1 Hardhat 部署
```bash
cd contracts

# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 部署到 Sepolia
npx hardhat run scripts/deploy-router-sepolia.ts --network sepolia

# 验证合约
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

#### 5.4.2 Foundry 部署
```bash
cd contracts

# 编译
forge build

# 测试
forge test

# 部署
forge script script/DeployMockOracle.s.sol --rpc-url sepolia --broadcast

# 验证
forge verify-contract ADDRESS CONTRACT_PATH:CONTRACT_NAME --chain sepolia
```

### 5.5 前端开发指南

#### 5.5.1 基础设置
```bash
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

#### 5.5.2 钱包连接配置
```bash
# 设置 WalletConnect 项目 ID
pnpm run setup-walletconnect
```

### 5.6 测试指南

#### 5.6.1 合约测试
```bash
cd contracts

# Hardhat 测试
npx hardhat test

# Foundry 测试
forge test

# 覆盖率测试
npx hardhat coverage
```

#### 5.6.2 前端测试
```bash
cd frontend

# 运行测试
pnpm test

# 类型检查
pnpm run type-check

# 代码检查
pnpm run lint
```

### 5.7 故障排除

#### 5.7.1 常见问题解决

**合约部署失败**:
```bash
# 清理缓存
npx hardhat clean
npx hardhat compile --force
```

**前端连接失败**:
```bash
# 检查网络配置
echo $NEXT_PUBLIC_CHAIN_ID
echo $NEXT_PUBLIC_RPC_URL
```

**钱包连接问题**:
- 确保 MetaMask 连接到正确的网络
- 检查 RPC URL 和 Chain ID
- 重启浏览器和 MetaMask

## 6. 参赛团队信息

- **Gavin** Lead
- **segment7** Dev
- **Leaf** Dev
- **超** Dev
- **文斌** Dev

## 7. 相关文档

### 7.1 技术文档
- [完整部署指南](contracts/COMPLETE_DEPLOYMENT_GUIDE.md)
- [前端集成指南](contracts/FRONTEND_INTEGRATION_GUIDE.md)
- [开发计划](contracts/FRONTEND_DEVELOPMENT_PLAN.md)
- [本地开发指南](frontend/LOCAL_DEVELOPMENT_GUIDE.md)

### 7.2 部署文档
- [Sepolia 部署报告](contracts/SEPOLIA_FINAL_DEPLOYMENT_REPORT.md)
- [合约地址列表](contracts/DEPLOYMENT_ADDRESSES.md)
- [测试总结](contracts/FOUNDRY_测试总结.md)
