# Merit Protocol

## 项目概述

### 项目名称
Merit Protocol - 基于链上声誉的无抵押借贷协议

### 项目介绍
Merit Protocol 是一个创新的 DeFi 协议，通过聚合用户在 Web3 生态中的多维度贡献（Gitcoin Passport、ENS、Farcaster、链上活动、POAP、Nouns DAO 等），计算出可信的 Merit Score（信誉分数），并将其转化为无需抵押的信用额度。

### 目标用户
- **Web3 活跃贡献者**：拥有丰富链上履历但缺乏流动性的用户
- **DAO 成员**：需要短期资金周转的社区贡献者
- **开发者**：参与黑客松、开源项目的建设者
- **流动性提供者**：希望获得收益的资金方

### 问题与解决方案

**问题**：
1. 传统 DeFi 借贷需要超额抵押，资金利用率低
2. Web3 贡献者的链上声誉无法转化为金融价值
3. 缺乏透明、可验证的信用评估机制
4. 违约记录难以追溯和共享

**解决方案**：
1. **多维度信誉评估**：聚合 6+ 数据源，全面评估用户 Web3 贡献
2. **无抵押借贷**：基于 Merit Score 提供信用额度（分数 × $30）
3. **透明可验证**：所有数据源和计算逻辑公开透明
4. **EAS 违约记录**：利用 Ethereum Attestation Service 永久记录违约行为

---

## 架构与实现

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Score Check │  │  Dashboard   │  │  Liquidation │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Oracle Service (Node.js)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Score Calculator                                     │   │
│  │  - Gitcoin Passport  - ENS          - Farcaster      │   │
│  │  - On-Chain Activity - POAP         - Nouns DAO      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Smart Contracts (Sepolia)                   │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ MeritScoreOracle │  │ SponsoredLending │                │
│  │                  │  │      Pool        │                │
│  └──────────────────┘  └──────────────────┘                │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────────┐                     │
│                    │       EAS        │                     │
│                    │ (Default Record) │                     │
│                    └──────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### 关键模块

#### 1. Oracle Service（信誉计算引擎）
- **功能**：聚合多个数据源，实时计算 Merit Score
- **数据源**：
  - Gitcoin Passport（最高 100 分）
  - ENS（500 分）
  - Farcaster（最高 1000 分）
  - 链上活动（最高 100 分）
  - POAP（最高 1000 分）
  - Nouns DAO（100 分）
- **技术栈**：Node.js, TypeScript, Express, Viem

#### 2. MeritScoreOracle 合约
- **功能**：存储和管理用户的 Merit Score
- **核心方法**：
  - `updateMerits(address, MeritData)` - 更新单个用户分数
  - `batchUpdateMerits(address[], MeritData[])` - 批量更新
  - `getScore(address)` - 查询分数
  - `getMeritData(address)` - 查询完整数据（分数 + 更新时间）

#### 3. SponsoredLendingPool 合约
- **功能**：无抵押借贷池
- **核心方法**：
  - `deposit(uint256)` - 存入 USDC 提供流动性
  - `borrow(uint256)` - 基于 Merit Score 借款
  - `repay(uint256)` - 还款
  - `liquidate(address)` - 清算违约贷款并记录到 EAS
- **借款规则**：
  - 最低分数：100
  - 信用额度：Merit Score × $30
  - 利率：5.5% 基础利率
  - 期限：可配置（演示为 15 秒）

#### 4. Frontend（用户界面）
- **主页**：查询任意地址的 Merit Score 和分数分解
- **Dashboard**：
  - 查看个人信誉和信用额度
  - 借款和还款操作
  - 交易历史
  - 清算模块
- **技术栈**：Next.js, React, Scaffold-ETH 2, TailwindCSS, DaisyUI

### 技术栈

**智能合约**：
- Solidity 0.8.20
- Foundry (开发、测试、部署)
- OpenZeppelin (安全库)
- Ethereum Attestation Service (EAS)

**Oracle Service**：
- Node.js + TypeScript
- Express.js
- Viem (以太坊交互)
- Alchemy SDK

**Frontend**：
- Next.js 14
- Scaffold-ETH 2
- Wagmi + Viem
- RainbowKit
- TailwindCSS + DaisyUI

---

## 合约与部署信息

### 部署网络
Sepolia Testnet

### 合约地址

| 合约名称 | 地址 | Etherscan |
|---------|------|-----------|
| MeritScoreOracle | `0x48f2A3f3bF5fa7fbe7cfB6B36D3f335c0F7197a7` | [查看](https://sepolia.etherscan.io/address/0x48f2A3f3bF5fa7fbe7cfB6B36D3f335c0F7197a7) |
| SponsoredLendingPool | `0x0471a65da5c08e0e2dc573992691df54b65b3487` | [查看](https://sepolia.etherscan.io/address/0x0471a65da5c08e0e2dc573992691df54b65b3487) |
| MockUSDC | `0xabc530ff98db0649ec7c098662a446701f5b5e90` | [查看](https://sepolia.etherscan.io/address/0xabc530ff98db0649ec7c098662a446701f5b5e90) |

### EAS Schema
- **Schema UID**: `0x...` (Default Record Schema)
- **EAS Explorer**: [查看 Schema](https://sepolia.easscan.org)

### 验证链接
所有合约已在 Etherscan 上验证，可直接查看源代码。

---

## 运行与复现说明

### 环境要求

**必需**：
- Node.js >= 18
- Yarn
- Foundry
- Git

**可选**：
- MetaMask 钱包（用于前端交互）

### 一键启动脚本

```bash
# 1. 克隆仓库
git clone https://github.com/KarlLeen/subgraph-package.git
cd subgraph-package

# 2. 安装依赖
yarn install

# 3. 配置环境变量
cp packages/oracle-service/.env.example packages/oracle-service/.env
cp packages/nextjs/.env.example packages/nextjs/.env.local

# 编辑 .env 文件，填入你的 Alchemy API Key

# 4. 启动 Oracle Service
cd packages/oracle-service
yarn install
yarn start
# 服务运行在 http://localhost:3002

# 5. 启动 Frontend（新终端）
cd packages/nextjs
yarn install
yarn dev
# 前端运行在 http://localhost:3000
```

### 关键用例复现

#### 用例 1：查询 Merit Score

1. 访问 http://localhost:3000
2. 在 "Check Any Address's Merit Score" 输入：
   ```
   vitalik.eth
   ```
3. 点击 Search
4. 查看 On-Chain Score 和 Calculated Score

#### 用例 2：借款流程

1. 访问 http://localhost:3000/dashboard
2. 连接 MetaMask（确保在 Sepolia 网络）
3. 查看你的 Merit Score 和信用额度
4. 在 "Borrow" 标签输入金额（如 100 USDC）
5. 点击 "Access Liquidity"
6. 在 MetaMask 确认交易
7. 查看借款记录

#### 用例 3：违约与 EAS 记录（演示）

**前提**：已有活跃贷款

1. 等待贷款到期（演示环境为 15 秒）
2. 在 Dashboard 的 "Liquidation Module" 输入违约地址
3. 点击 "Liquidate & Record Default"
4. 交易确认后，从日志中获取 Attestation ID
5. 访问 https://sepolia.easscan.org/attestation/view/[ID]
6. 查看永久违约记录

### 测试命令

```bash
# 合约测试
cd packages/foundry
forge test -vvv

# Oracle Service 测试
cd packages/oracle-service
yarn test

# 前端测试
cd packages/nextjs
yarn test
```

---

## 核心创新点

### 1. 多维度信誉聚合
首次将 Gitcoin、ENS、Farcaster、POAP、Nouns DAO 等 6+ 数据源整合到统一的信誉评分系统。

### 2. 透明的分数计算
- 所有数据源权重公开
- 分数组成可视化展示
- Oracle Service 开源可审计

### 3. EAS 集成
利用 Ethereum Attestation Service 创建不可篡改的违约记录，为未来的信用系统奠定基础。

### 4. 灵活的借贷机制
- 动态信用额度（基于实时分数）
- 可配置的风险参数
- 社区驱动的清算机制

---

## Demo 视频

📹 **演示视频**：[YouTube 链接]

**视频内容**：
1. 查询 vitalik.eth 的 Merit Score
2. 连接钱包查看个人信誉
3. 执行无抵押借款
4. 演示违约清算和 EAS 记录

---

## 可验证边界

### 完全开源
- ✅ 所有智能合约代码
- ✅ Oracle Service 完整实现
- ✅ Frontend 源代码
- ✅ 部署脚本和配置

### 可验证组件
- ✅ Sepolia 上的合约地址
- ✅ Etherscan 验证的合约代码
- ✅ EAS 上的违约记录
- ✅ 公开的 API 端点

### 第三方依赖
- Alchemy API（需要自己的 API Key）
- Gitcoin Passport API
- Farcaster Hub
- EAS 合约

---

## 团队信息

### 团队名称
karl4c

### 成员
- Karl - 全栈开发

### 联系方式
- GitHub: [@KarlLeen](https://github.com/KarlLeen)
- Email: [你的邮箱]
- Twitter: [你的 Twitter]

### 可演示时段
- 工作日：18:00 - 22:00 (UTC+8)
- 周末：全天

---

## 未来规划

### 短期（3个月）
- [ ] 集成更多数据源（Lens Protocol、Mirror、etc.）
- [ ] 优化分数计算算法（机器学习模型）
- [ ] 支持更多稳定币（USDT、DAI）
- [ ] 移动端适配

### 中期（6个月）
- [ ] 主网部署
- [ ] 引入保险机制
- [ ] 跨链支持（Arbitrum、Optimism）
- [ ] DAO 治理

### 长期（1年+）
- [ ] 构建信用评分标准
- [ ] 与其他 DeFi 协议集成
- [ ] 企业级信用服务
- [ ] 全球化推广

---

## 致谢

感谢 ETHShanghai 2025 提供的平台和支持！

特别感谢：
- Ethereum Foundation
- Ethereum Attestation Service
- Scaffold-ETH 2
- Alchemy
- 所有开源贡献者

---

## License

MIT License

---

**Built with ❤️ at ETHShanghai 2025**
