# ZKredential: 面向现实资产上链(RWA)的零知识合规基础设施

> **Privacy-First Compliance Infrastructure for Real World Assets**

---

## 一、提交物清单 (Deliverables)

- ✅ **GitHub 仓库**: [本仓库] 
- ✅ **Demo 视频**: [待添加] 
- ✅ **合约部署信息**: Sepolia 测试网 - [详见下文](#三合约与部署)
- ✅ **技术文档**: 完整的架构说明、集成指南、API文档

---

## 二、参赛队伍信息

### 1) 项目概述 (Overview)

**项目名称**: ZKredential (Zero-Knowledge Credential Infrastructure)

**一句话介绍**: 
为 RWA 项目提供隐私保护的合规基础设施，用户进行 ZK 身份验证，满足监管要求，真实数据永不上链。

**目标用户**:
-  **RWA 项目方**: 需要满足 KYC/AML 合规要求的代币化资产平台
-  **投资者**: 希望在保护隐私的同时合法投资 RWA 资产的用户
-  **开发者**: 需要集成隐私合规功能的 DeFi 应用开发者

**核心问题与动机 (Pain Points)**:

当前 RWA 项目的合规现状与痛点：

** 主流做法（Securitize, Tokeny 等）**：
- 使用**白名单模式**：用户通过 KYC 后，地址加入链上白名单
- 转账时**查询白名单**（~5,000 gas），而非重复验证
- Gas 成本很低，用户体验好

** 但存在严重的隐私问题**：

1. **用户隐私完全泄露** 
   - 传统 KYC：真实姓名、年龄、资产、国籍等**直接上链**或存储在中心化服务器
   - 区块链地址与真实身份永久关联
   - 无法满足 GDPR、CCPA 等全球隐私法规
   - 数据泄露风险高（如 2023 年多起 CEX 数据泄露事件）

2. **缺乏隐私保护的标准化方案** 
   - RWA 平台需要自主开发 ZK 电路
   - 密码学专业知识要求高
   - 缺少可复用的基础设施

3. **集成复杂度高**
   - 部分 ZK 方案需要修改现有代币合约
   - 代码变更需要重新审计
   - 增加开发和测试成本

4. **一些项目方案无法满足复杂合规要求**
   - 单一 ZK 身份协议（如 Polygon ID）只能证明单一条件
   - 私募基金等场景需要组合多个条件（如"合格投资者 AND 非制裁国家 AND 流动资产>$100万"）
   - 现有方案无法做到

**解决方案 (Solution)**:

本项目提供 **ZK 隐私合规基础设施**：

**设计理念**：
- 兼容现有 RWA 平台的白名单模式
- 将白名单填充方式从传统 KYC 升级为 ZK 证明
- 在保护用户隐私的同时维持原有的性能特性

**三大核心技术**：

1. **🔧 自定义复合 ZK 电路**
   - 使用 Circom 设计可组合的验证模块（KYC + 资产 + AML）
   - 在电路层面组合多个独立条件为单一匿名证明
   - 支持灵活的合规规则配置
   - 与单一凭证协议的主要区别：支持复合条件证明

2. **🔌 ERC-3643 标准集成** 
   - 实现标准的 `ICompliance` 接口
   - 通过 `token.setCompliance(zkModule)` 完成集成
   - 兼容现有 ERC-3643 代币合约
   - 支持可逆的模块切换

3. **⚡ 两阶段验证架构**
   - **Phase 1**: 用户生成 ZK 证明并链上验证
   - **Phase 2**: 后续交易查询白名单
   - 提供额外的隐私保护层

---

### 2) 架构与实现 (Architecture & Implementation)

#### 总览图

```
┌──────────────────────────────────────────────────────────────┐
│                        用户浏览器                               │
│                    http://localhost:3000                      │
│                                                               │
│  🎨 前端应用 (Next.js)                                         │
│  ├─ /proof-generation     证明生成页面                         │
│  ├─ /rwa-platform          RWA演示平台                         │
│  ├─ /dashboard             投资面板                            │
│  └─ /rwa-platform/register 链上注册页面                        │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP API
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    ZK 证明生成服务器                            │
│                    http://localhost:8080                      │
│                                                               │
│  ⚙️ 核心服务 (Express.js + SnarkJS)                           │
│  ├─ POST /generate-proof   生成 Groth16 证明                  │
│  ├─ POST /verify-proof     链下验证                           │
│  └─ 3个平台电路            PropertyFy/RealT/RealestateIO      │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Web3
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    智能合约 (Sepolia)                          │
│                                                               │
│  🔐 验证器层                                                   │
│  ├─ PropertyFyVerifier      KYC + 资产 (12信号)               │
│  ├─ RealTVerifier           KYC + AML (12信号)                │
│  └─ RealestateVerifier      KYC + 资产 + AML (16信号)         │
│                                                               │
│  🎯 核心基础设施                                               │
│  ├─ ZKRWARegistryMultiPlatform  多平台身份注册                 │
│  │   ├─ registerIdentity()       注册ZK身份                   │
│  │   ├─ hasValidIdentity()       查询是否已验证               │
│  │   └─ isPlatformCompliant()    查询平台合规性                │
│  │                                                            │
│  └─ ZKComplianceModule         ERC-3643 合规模块（即插即用）   │
│      ├─ canTransfer()           转账前合规检查                 │
│      ├─ isVerified()            查询验证状态                   │
│      └─ markAsVerified()        标记用户已验证                 │
└──────────────────────────────────────────────────────────────┘
```

#### 关键模块

**前端 (Frontend)**
- **框架**: Next.js 14 (App Router) + React 18
- **样式**: Tailwind CSS v3
- **Web3**: Wagmi v1 + Ethers.js v6
- **UI组件**: Radix UI + Shadcn/ui
- **功能**:
  - 多平台证明生成界面
  - ZK证明下载/上传
  - 链上身份注册
  - RWA资产演示平台

**后端 (Backend / ZK Proof Server)**
- **框架**: Express.js + Node.js 18+
- **ZK库**: SnarkJS (Groth16)
- **电路**: Circom 2.0
- **功能**:
  - 根据平台动态生成ZK证明
  - 字段验证和清理
  - 链下证明验证
  - 多平台证明生成器管理

**合约 (Smart Contracts)**
- **语言**: Solidity ^0.8.20
- **开发框架**: Hardhat
- **测试**: Hardhat + Ethers.js
- **部署网络**: Sepolia 测试网
- **核心合约**:
  - 3个 Groth16 验证器
  - ZKRWARegistryMultiPlatform (多平台注册表)
  - ZKComplianceModule (ERC-3643 适配器)
  - ZKToERC3643Adapter (通用适配器)

**其他**
- **电路编译**: Circom 2.0
- **密钥生成**: Powers of Tau (15约束)
- **代码架构**: Monorepo (pnpm workspaces)

#### 依赖与技术栈

**前端依赖**
```json
{
  "next": "14.0.3",
  "react": "^18.2.0",
  "ethers": "^6.9.0",
  "viem": "^1.19.9",
  "wagmi": "^1.4.7",
  "tailwindcss": "^3.4.0",
  "@radix-ui/react-*": "^1.0.0"
}
```

**后端依赖**
```json
{
  "express": "^4.18.2",
  "snarkjs": "^0.7.0",
  "circom_runtime": "^0.1.21",
  "cors": "^2.8.5"
}
```

**合约依赖**
```json
{
  "hardhat": "^2.19.2",
  "@nomicfoundation/hardhat-toolbox": "^4.0.0",
  "ethers": "^6.9.0"
}
```

**部署**
- **前端**: 本地部署 (可部署到 Vercel)
- **后端**: 本地运行 (可部署到 Railway/Render)
- **合约**: Sepolia 测试网 (已验证)

---

### 3) 合约与部署 (Contracts & Deployment)

**网络**: Sepolia 测试网 (Chain ID: 11155111)

**部署时间**: 2025-10-19

**部署账户**: `0x6C29b9dA4A53236dc46DbE0BEFb6b4358e982E26`

#### 核心合约与地址

| 合约名称 | 地址 | 验证链接 | 功能 |
|---------|------|---------|------|
| **PropertyFyVerifier** | `0xe0c16bDE095DD8C2794881b4a7261e2C0Fc9d2dc` | [查看](https://sepolia.etherscan.io/address/0xe0c16bDE095DD8C2794881b4a7261e2C0Fc9d2dc) | Groth16验证器(KYC+资产) |
| **RealTVerifier** | `0x71dE2f8cD0b5483DAB7dc7064e82156DFd966257` | [查看](https://sepolia.etherscan.io/address/0x71dE2f8cD0b5483DAB7dc7064e82156DFd966257) | Groth16验证器(KYC+AML) |
| **RealestateVerifier** | `0xaa276B0729fEAa83530e5CC1Cd387B634A6c45d6` | [查看](https://sepolia.etherscan.io/address/0xaa276B0729fEAa83530e5CC1Cd387B634A6c45d6) | Groth16验证器(完整) |
| **ZKRWARegistryMultiPlatform** | `0x2dF31b4814dff5c99084FD93580FE90011EE92b2` | [查看](https://sepolia.etherscan.io/address/0x2dF31b4814dff5c99084FD93580FE90011EE92b2) | 多平台身份注册表 |
| **ZKComplianceModule** | `0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81` | [查看](https://sepolia.etherscan.io/address/0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81) | ERC-3643合规模块 |

#### 合约架构

```
packages/zk-contracts/contracts/
├── core/                   # 🎯 核心基础设施（可独立使用）
│   ├── ZKRWARegistryMultiPlatform.sol    # 多平台身份注册
│   ├── ComplianceGateway.sol             # 合规网关
│   ├── CompositeProofVerifier.sol        # 组合验证器
│   └── ZKRWARegistry.sol                 # 基础注册合约
├── demo/                   # 🎨 演示应用（参考实现）
│   ├── ZKRWAAssetFactory.sol             # RWA资产工厂
│   └── ZKRWATokenERC3643.sol             # RWA代币示例
├── adapters/               # 🔌 适配器层
│   ├── ZKComplianceModule.sol            # ERC-3643合规适配器
│   └── ZKToERC3643Adapter.sol            # ZK到ERC-3643适配
├── interfaces/             # 📋 接口定义
│   ├── IZKRWARegistry.sol
│   ├── ICompliance.sol
│   ├── IERC3643.sol
│   └── IIdentityRegistry.sol
├── verifiers/              # 🔐 ZK验证器合约
│   ├── PropertyFyVerifier.sol            # PropertyFy平台验证器
│   ├── RealTVerifier.sol                 # RealT平台验证器
│   └── RealestateVerifier.sol            # Realestate.io平台验证器
└── mocks/                  # 🧪 测试模拟合约
    └── MockGroth16Verifier.sol
```

#### 验证链接

所有合约均已在 Etherscan 上验证：
- [PropertyFyVerifier](https://sepolia.etherscan.io/address/0xe0c16bDE095DD8C2794881b4a7261e2C0Fc9d2dc#code)
- [RealTVerifier](https://sepolia.etherscan.io/address/0x71dE2f8cD0b5483DAB7dc7064e82156DFd966257#code)
- [RealestateVerifier](https://sepolia.etherscan.io/address/0xaa276B0729fEAa83530e5CC1Cd387B634A6c45d6#code)
- [ZKRWARegistryMultiPlatform](https://sepolia.etherscan.io/address/0x2dF31b4814dff5c99084FD93580FE90011EE92b2#code)
- [ZKComplianceModule](https://sepolia.etherscan.io/address/0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81#code)

#### 最小复现脚本

**部署合约**
```bash
cd packages/zk-contracts

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 SEPOLIA_RPC_URL 和 PRIVATE_KEY

# 编译合约
pnpm compile

# 部署到 Sepolia
pnpm deploy:sepolia

# 或部署到本地测试网
pnpm deploy:localhost
```

**运行测试**
```bash
cd packages/zk-contracts

# 运行所有测试
pnpm test

# 运行特定测试
npx hardhat test test/ZKRWARegistry.multi-platform.test.ts
```

**集成到现有 RWA 项目**
```solidity
// 任何 ERC-3643
await rwaToken.setCompliance("0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81");
// ✅ 完成！代币立即获得 ZK 隐私保护能力
```

---

### 4) 运行与复现 (Run & Reproduce)

#### 前置要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0 
- **Git**: 最新版
- **MetaMask**: 浏览器扩展
- **测试 ETH**: Sepolia 测试网水龙头

#### 环境变量样例

**前端 (packages/frontend/.env.local)**
```bash
# Sepolia 测试网配置
NEXT_PUBLIC_RPC_URL=https://sepolia.gateway.tenderly.co
NEXT_PUBLIC_DEFAULT_CHAIN=11155111

# 合约地址
NEXT_PUBLIC_ZKRWA_REGISTRY=0x2dF31b4814dff5c99084FD93580FE90011EE92b2
NEXT_PUBLIC_ZK_COMPLIANCE=0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81

# ZK 证明服务器
NEXT_PUBLIC_ZK_SERVER_URL=http://localhost:8080

# WalletConnect (可选)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

**后端 (packages/zk-proof-server/.env)**
```bash
# 服务器配置
PORT=8080
NODE_ENV=development
HOST=127.0.0.1
```

**合约 (packages/zk-contracts/.env)**
```bash
# Sepolia 测试网
SEPOLIA_RPC_URL=https://sepolia.gateway.tenderly.co
PRIVATE_KEY=0x_your_private_key_here

# Etherscan (用于验证合约)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

#### 一键启动（本地示例）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd zk-rwa

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp packages/frontend/.env.example packages/frontend/.env.local
cp packages/zk-proof-server/.env.example packages/zk-proof-server/.env
# 编辑 .env.local 和 .env 文件

# 4. 启动 ZK 证明服务器（终端1）
cd packages/zk-proof-server
node server.js

# 5. 启动前端（终端2）
cd packages/frontend
pnpm dev

# 6. 打开浏览器
# 访问 http://localhost:3000
```

####  Demo

**本地部署**
- 前端: http://localhost:3000
- ZK 服务器: http://localhost:8080
- 合约: Sepolia 测试网

**可用页面**
- 主页: http://localhost:3000
- 证明生成: http://localhost:3000/proof-generation
- 链上注册: http://localhost:3000/rwa-platform/register
- RWA 平台: http://localhost:3000/rwa-platform
- 投资面板: http://localhost:3000/dashboard

#### 测试账号与说明

**MetaMask 配置**
```
网络名称: Sepolia
RPC URL: https://sepolia.gateway.tenderly.co
链ID: 11155111
货币符号: ETH
区块浏览器: https://sepolia.etherscan.io
```

**获取测试 ETH**
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

**测试流程**
1. 连接 MetaMask（确保在 Sepolia 网络）
2. 获取测试 ETH（约 0.1 ETH 足够）
3. 访问 `/proof-generation` 选择平台生成证明
4. 下载证明 JSON 文件
5. 访问 `/rwa-platform/register` 上传证明并注册
6. 等待交易确认（约 15-30 秒）
7. 查看投资面板验证身份状态

---

### 5) Demo 与关键用例 (Demo & Key Flows)

#### 视频链接

**Demo 视频** (≤3 分钟，中文): [正在录制]

---

### 6) 可验证边界 (Verifiable Scope)

#### 完全开源的模块

✅ **所有模块均可复现、可验证**:

1. **前端应用** (`packages/frontend/`)
   - 所有页面源码
   - Web3 集成代码
   - UI 组件库
   - 可直接运行 `pnpm dev`

2. **ZK 证明服务器** (`packages/zk-proof-server/`)
   - Express.js 服务器
   - 证明生成逻辑
   - 3 个平台的完整电路
   - 可直接运行 `node server.js`

3. **智能合约** (`packages/zk-contracts/`)
   - 所有 Solidity 源码
   - 部署脚本
   - 单元测试
   - 可直接运行 `pnpm test`

4. **ZK 电路** (`packages/zk-proof-server/circuits/`)
   - Circom 电路源码
   - 模块化验证组件
   - 编译脚本
   - 密钥生成脚本

#### 验证步骤

**1. 验证智能合约**
```bash
# 所有合约均已在 Etherscan 上验证
# 可直接查看源码：
https://sepolia.etherscan.io/address/0x2dF31b4814dff5c99084FD93580FE90011EE92b2#code
```

**2. 验证 ZK 电路**
```bash
cd packages/zk-proof-server/circuits

# 编译电路
./compile_all_platforms.sh

# 生成验证密钥
./generate_keys.sh

# 对比生成的验证器合约
diff keys/PropertyFyVerifier.sol \
     ../../zk-contracts/contracts/verifiers/PropertyFyVerifier.sol
# 应该完全一致 ✅
```

**3. 验证证明生成**
```bash
# 启动 ZK 服务器
cd packages/zk-proof-server
node server.js

# 测试生成证明
curl -X POST http://localhost:8080/generate-proof \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "propertyfy",
    "actualAge": 25,
    "actualCountry": 156,
    "actualNetWorth": 100000,
    ...
  }'

# 会返回真实的 Groth16 证明
```

**4. 验证链上注册**
```bash
# 克隆项目并运行
git clone <your-repo>
cd zk-rwa
pnpm install
cd packages/frontend && pnpm dev

# 浏览器访问
http://localhost:3000/proof-generation

# 完整流程可复现
```

#### 无不公开模块

**本项目 100% 开源**:
- ✅ 所有代码均可查看
- ✅ 所有合约均已验证
- ✅ 所有电路均可编译
- ✅ 所有功能均可复现

---

### 7) 路线图与影响 (Roadmap & Impact)

#### 赛后 1-3 周

**核心目标: 补完功能 1 - 统一身份适配层**

当前完成度：55% → 目标：85%

1. **Week 1**:
   - [ ] 创建 `IdentityAdapter` 抽象接口
   - [ ] 重构百度 KYC 为适配器模式
   - [ ] 更新文档，明确支持的身份源

2. **Week 2**:
   - [ ] 集成 Polygon ID（优先级最高）
   - [ ] 测试 Polygon ID 凭证验证
   - [ ] 实现多身份源切换 UI

3. **Week 3**:
   - [ ] 集成 zkPass（Web2 数据源）
   - [ ] 编写集成指南文档

---

#### 赛后 1-3 个月

**核心目标: SDK 封装 + 商业化准备**

1. **Month 1**: SDK 开发
   - [ ] 创建对应的SDK npm 包
   - [ ] 封装证明生成、验证、注册 API
   - [ ] 编写 SDK 文档和示例

2. **Month 2**: 生态拓展
   - [ ] 进行更多的测试
   - [ ] 支持更多 L2（Arbitrum, Optimism, Base）
   - [ ] 优化 Gas 成本（目标降至 200,000）
   - [ ] 实现批量验证功能

---

#### 预期对以太坊生态的价值

**技术创新**:
1. **首个 RWA 专用的 ZK 合规基础设施**
   - 填补了"隐私"与"合规"之间的空白
   - 为 RWA 赛道提供标准化解决方案

2. **复合条件 ZK 证明技术**
   - 支持多维度合规条件组合
   - 为复杂合规场景提供技术方案

3. **非侵入式的 ERC-3643 集成**
   - 降低 RWA 项目集成门槛
   - 加速 RWA 行业采用 ZK 技术

**生态影响**:
1. **隐私保护**
   - 保护千万级 RWA 投资者隐私
   - 满足 GDPR 等全球隐私法规
   - 提升 Web3 在监管方面的合规性

2. **技术可复用性**
   - 提供开源的 ZK 电路基础设施
   - 用户 gas 成本与传统 RWA 平台相当（~5k gas）
   - 降低 ZK 技术的实现门槛

3. **标准化推进**
   - 探索 ZK证明 在 RWA 领域的应用
   - 提供隐私合规的参考实现
   - 促进 RWA 与 DeFi 的技术融合


### 8) 团队与联系 (Team & Contacts)

**团队名**: ZKredential Team

**成员与分工**:
- **Lewis** - Product Manager - Product design and strategy
- **Kieran** - Developer - Smart contracts, ZK circuits, and frontend development

**联系方式**:
- **Email**: smartisanr3@gmail.com



---

## 三、快速自检清单 (Submission Checklist)

- ✅ **README 按模板填写完整**（概述、架构、复现、Demo、边界）
- ✅ **本地可一键运行**，关键用例可复现（`.\快速启动多平台系统.bat`）
- ✅ **测试网合约地址与验证链接已提供**（5 个核心合约 + Etherscan 验证）
- ⏳ **Demo 视频（≤3 分钟，中文）**（正在录制）
- ✅ **完全开源**，所有模块均可验证

---

## 四、核心竞争力总结

### 🏆 三大技术壁垒

| 功能 | 完成度 | 技术特点 | 说明 |
|------|--------|---------|------|
| **复合 ZK 电路** | 100% | 多条件组合 | 可组合 KYC+资产+AML 为单一证明 |
| **ERC-3643 集成** | 100% | 标准接口 | 通过 ICompliance 接口集成 |
| **身份适配层** | 正在适配更多平台| 可扩展 | 支持多种 ZK 身份源 |

### 💎 独特价值

1. **对 RWA 平台**: 
   - ✅ 提供可复用的 ZK 电路基础设施
   - ✅ 降低密码学实现门槛
   - ✅ 标准化的集成接口
   - ✅ 保持原有的白名单架构性能（~5k gas）

2. **对用户**: 
   - ✅ 隐私完全保护（真实数据永不上链）
   - ✅ 一次验证，多平台通用
   - ✅ 低 Gas 成本（与传统 RWA 平台一致）

3. **对以太坊生态**: 
   - ✅ 填补 RWA 行业的隐私保护空白
   - ✅ 推动 ZK-KYC 成为行业标准
   - ✅ 加速 $16 万亿 RWA 市场的 Web3 化

### 🎯 市场定位

**我们不是**:
- ❌ 通用的 ZK 身份协议（如 Polygon ID）- 他们服务终端用户
- ❌ Web2 数据验证工具（如 zkPass）- 他们聚焦数据源
- ❌ 单一的合规服务（如 Chainalysis）- 他们做链上分析

**本项目定位**:
- ✅ RWA 平台的 ZK 合规技术基础设施
- ✅ 为 RWA 平台提供隐私保护方案
- ✅ 支持复合条件的 ZK 证明生成
- ✅ 降低 RWA 平台实现 ZK 合规的技术门槛

**目标客户**:
- 🎯 ERC-3643 RWA 代币平台（Tokeny, Securitize 等）
- 🎯 房地产代币化平台
- 🎯 私募股权代币化平台
- 🎯 债券代币化平台
- 🎯 任何需要 KYC/AML 合规的资产代币化项目

---

## 五、技术细节与资源


### 📁 项目结构

```
zk-rwa/  
├── packages/
│   ├── frontend/              # Next.js 前端 (3000端口)
│   ├── zk-proof-server/       # ZK 证明服务器 (8080端口)
│   └── zk-contracts/          # Solidity 智能合约
├── docs/                      # 详细文档
├── scripts/                   # 工具脚本
├── pnpm-workspace.yaml        # Monorepo 配置
├── README.md                  # 本文档
```

### 🔗 重要链接

- **智能合约**: [packages/zk-contracts/contracts/](./packages/zk-contracts/contracts/)
- **ZK 电路**: [packages/zk-proof-server/circuits/](./packages/zk-proof-server/circuits/)
- **前端应用**: [packages/frontend/app/](./packages/frontend/app/)
- **部署信息**: [packages/zk-contracts/deployments/](./packages/zk-contracts/deployments/)
- **项目文档**: [docs/](./docs/)

---


---

**🎊 ZKredential: 完全隐私 + 完全合规 = Web3 RWA 的未来！** 🚀

**Let's Make RWA Privacy-First!** 💎

