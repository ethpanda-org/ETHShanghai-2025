# # [Thyra] - ETHShanghai 2025

## 一、提交物清单 (Deliverables)

- GitHub 仓库：https://github.com/Thyra-Protocol/Thyra-Demo/tree/main/ThyraFrontend
- Demo 视频（≤ 3 分钟，中文）：https://drive.google.com/file/d/1BrpjQnTh6510EurKgnyO6yWWtrQr5bFS/view?usp=sharing
- 在线演示链接：thyra.figma.site
- 合约部署信息：见下文“合约与部署”


---

## 二、参赛队伍填写区

### 1) 项目概述 (Overview)

- **项目名称**：Thyra
- **一句话介绍**：Thyra 是一个自托管的 DeFi Automation 解决方案，它能够将自然语言的意图转化为持久化执行的链上交易策略。可以将它理解为一个“始终在线的助手”，持续监测市场，并在你的授权下，自动执行你的策略 —— 例如定投、收益管理以及头寸风控等操作。
- **目标用户**：
  
  - Daily DeFi Users：Thyra 提供机构级收益/头寸管理，基于AI或用户选择的规则，在 DSR/Aave/Morpho 等协议之间自动管理头寸，追求稳健的风险管理或收益优化。
  - Advanced Traders：Thyra 提供高级交易工具，为链上交易提供 CeFi 级 EMS/OMS 能力（VWAP/TWAP/iceberg、Bracket/OCO、MEV/成本感知），在多协议/多链上实现机构级执行与风控，同时保持资产自托管。
  - 寻求增长的DeFi项目方：Thyra 提供可编程限价单引擎。在 DEX/借贷/永续等多场景下，编写链上Orderbook开发成本高，开发周期长。Thyra提供可一键接入的限价单执行&撮合引擎，帮助DeFi协议释放流动性的同时保持原有产品 UX 与完全自托管，同时提升执行质量与效率。
  - Other Agents：Thyra 提供可执行代理，为第三方 AI 提供经 Merkle 预授权的受限、可撤销执行通道（预算/速率/角色隔离），外部 AI 向 Thyra 代理发送意图，由 Thyra Engine 在链上可审计地执行，实现无人值守但可控的自动化。

- **核心问题与动机（Pain Points）**：
  - DeFi 生态碎片化、跨协议/多链操作门槛高，人工 24/7 维护难以为继；
  - 现有 DeFAI 多停留在一次性 `calldata` 翻译，缺乏持久状态、条件逻辑与动态适应；
  - 现有自动化解决方案大多停留在trigger模式，无法适应用户和agent的执行需求
- **解决方案（Solution）**：
  - 将自然语言意图翻译为标准化的策略中间表示（SIR），并在去中心化、事件驱动的 Thyra VM 中长期运行；
  - 通过 `ThyraAccount`（Gnosis Safe + Diamond Proxy）实现细粒度、可撤销的自托管授权与链上护栏；
  - 提供可组合、可审计、可复现的策略工件，支持跨协议/链/数据的模块化扩展。

### 2) 架构与实现 (Architecture & Implementation)

- **总览图**：见仓库图片（如 `502f2bcb5c9f2bfafa6e6e6e5dcb3a4.png`，或 Pitch Deck/白皮书相应章节）。
- **关键模块**：
  - 前端：后续开放 Visual Strategy Builder；
  - 后端/服务：事件订阅与策略编排（规划中）；
  - 合约：`ThyraAccount`（Gnosis Safe + EIP-2535 Diamond）、Registry、Factory、各 Facet；
  - 扩展：策略模板、协议适配器、审计/回放工具链。
- **依赖与技术栈（计划）**：
  - 前端：Next.js/React、ethers.js、Tailwind CSS；
  - 服务：Node.js/TypeScript；
  - 合约：Solidity、Foundry；
  - 部署与监控：Etherscan/Arbiscan/BaseScan 校验、链上事件索引。

### 3) 合约与部署 (Contracts & Deployment)

以下为核心合约在主流网络的部署地址：

- **Ethereum Mainnet (chainId: 1)**
  - `ThyraRegistry`: 0x00fabfccb6ae32592be4dd1ff2f85e3171d8cc29 (`https://etherscan.io/address/0x00fabfccb6ae32592be4dd1ff2f85e3171d8cc29`)
  - `DiamondCutFacet`: 0xd7022e843a1b9f15547ddcf579a5e12e8a56f10a (`https://etherscan.io/address/0xd7022e843a1b9f15547ddcf579a5e12e8a56f10a`)
  - `DiamondLoupeFacet`: 0x4052bcd88265737e6e9a7cea82d51c03ed8cc1c5 (`https://etherscan.io/address/0x4052bcd88265737e6e9a7cea82d51c03ed8cc1c5`)
  - `ExecutorFacet`: 0x31cad720b2bbcbc799e0edee0ec2a61c40ab9667 (`https://etherscan.io/address/0x31cad720b2bbcbc799e0edee0ec2a61c40ab9667`)
  - `OwnershipFacet`: 0x7620f8de33daa4e03e26d9ea6222ed9953e5eb09 (`https://etherscan.io/address/0x7620f8de33daa4e03e26d9ea6222ed9953e5eb09`)
  - `ThyraFactory`: 0x2017ccd606f5e0eb411e1d750c6f26acd2421078 (`https://etherscan.io/address/0x2017ccd606f5e0eb411e1d750c6f26acd2421078`)

- **Arbitrum (chainId: 42161)**
  - `ThyraRegistry`: 0x00fabfccb6ae32592be4dd1ff2f85e3171d8cc29 (`https://arbiscan.io/address/0x00fabfccb6ae32592be4dd1ff2f85e3171d8cc29`)
  - `DiamondCutFacet`: 0xd7022e843a1b9f15547ddcf579a5e12e8a56f10a (`https://arbiscan.io/address/0xd7022e843a1b9f15547ddcf579a5e12e8a56f10a`)
  - `DiamondLoupeFacet`: 0x4052bcd88265737e6e9a7cea82d51c03ed8cc1c5 (`https://arbiscan.io/address/0x4052bcd88265737e6e9a7cea82d51c03ed8cc1c5`)
  - `ExecutorFacet`: 0x31cad720b2bbcbc799e0edee0ec2a61c40ab9667 (`https://arbiscan.io/address/0x31cad720b2bbcbc799e0edee0ec2a61c40ab9667`)
  - `OwnershipFacet`: 0x7620f8de33daa4e03e26d9ea6222ed9953e5eb09 (`https://arbiscan.io/address/0x7620f8de33daa4e03e26d9ea6222ed9953e5eb09`)
  - `ThyraFactory`: 0x2017ccd606f5e0eb411e1d750c6f26acd2421078 (`https://arbiscan.io/address/0x2017ccd606f5e0eb411e1d750c6f26acd2421078`)

- **Base (chainId: 8453)**
  - `ThyraRegistry`: 0x00fabfccb6ae32592be4dd1ff2f85e3171d8cc29 (`https://basescan.org/address/0x00fabfccb6ae32592be4dd1ff2f85e3171d8cc29`)
  - `DiamondCutFacet`: 0xd7022e843a1b9f15547ddcf579a5e12e8a56f10a (`https://basescan.org/address/0xd7022e843a1b9f15547ddcf579a5e12e8a56f10a`)
  - `DiamondLoupeFacet`: 0x4052bcd88265737e6e9a7cea82d51c03ed8cc1c5 (`https://basescan.org/address/0x4052bcd88265737e6e9a7cea82d51c03ed8cc1c5`)
  - `ExecutorFacet`: 0x31cad720b2bbcbc799e0edee0ec2a61c40ab9667 (`https://basescan.org/address/0x31cad720b2bbcbc799e0edee0ec2a61c40ab9667`)
  - `OwnershipFacet`: 0x7620f8de33daa4e03e26d9ea6222ed9953e5eb09 (`https://basescan.org/address/0x7620f8de33daa4e03e26d9ea6222ed9953e5eb09`)
  - `ThyraFactory`: 0x2017ccd606f5e0eb411e1d750c6f26acd2421078 (`https://basescan.org/address/0x2017ccd606f5e0eb411e1d750c6f26acd2421078`)

> 说明：上述地址来自链上部署记录文件；如需验证事件与交易详情，可通过各链区块浏览器查看对应交易哈希与日志。

### 4) 运行与复现 (Run & Reproduce)

<details>
<summary><b>4.1 ThyraFrontend</b></summary>

**一键启动**：

```bash
# 进入前端项目目录
cd ThyraFrontend

# 给启动脚本添加执行权限
chmod +x START_DEV.sh

# 运行自动化启动脚本（会自动启动后端和前端）
# 该脚本会自动检查依赖、创建环境变量文件、并同时启动前后端服务
./START_DEV.sh
```

**分步部署**：

```bash
# 1. 进入前端项目目录
cd ThyraFrontend

# 2. 安装前端依赖（使用 pnpm，因为项目使用 workspace）
# 这会安装所有 workspace 中的依赖包
pnpm install

# 3. 安装后端依赖
cd backend
npm install
cd ..

# 4. 创建前端环境变量文件（如果不存在）
# 从模板复制并需要手动编辑配置
cp env.example .env

# 5. 创建后端环境变量文件（如果不存在）
# 从模板复制并需要手动编辑配置
cp backend/env.example backend/.env

# 6. 启动后端服务
cd backend
npm run dev &
cd ..

# 7. 启动前端服务
pnpm dev
```

**环境变量说明**：

```bash
# frontend/.env
NEXT_PUBLIC_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_DEFAULT_CHAIN=1
NEXT_PUBLIC_FACTORY_ADDRESS=0x2017ccd606f5e0eb411e1d750c6f26acd2421078

# backend/.env
RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
PORT=3001
```

</details>

<details>
<summary><b>4.2 ThyraCore</b></summary>

**前置准备**：

```bash
# 1. 确保已安装 Node.js 16+ (推荐 18.17.0)
node --version

# 2. 确保已安装 pnpm 8+
pnpm --version

# 3. 如果没有安装 pnpm，先全局安装
npm install -g pnpm

# 4. 确保已安装 Python (scratch-blocks 构建需要)
python --version
```

**安装依赖**：

```bash
# 进入 ThyraCore 目录
cd ThyraCore

# 安装所有工作空间的依赖（会自动安装所有 packages 下的依赖）
pnpm install
```

**启动开发服务器**：

**方法 1: 自动完整启动（推荐）**

```bash
# 此命令会：
# 1. 先构建 thyra-blocks
# 2. 然后启动 thyra-gui 开发服务器（带热重载）
# 3. 自动在浏览器打开 http://localhost:3000
pnpm dev
```

**方法 2: 手动分步启动**

```bash
# 第一步：构建 thyra-blocks（仅首次或修改后需要）
pnpm build:blocks

# 第二步：启动 thyra-gui 开发服务器
pnpm --filter=@thyra/gui dev
```

</details>

<details>
<summary><b>4.3 ThyraAccount</b></summary>

**安装与测试**：

```bash
# 进入 ThyraAccount 目录
cd ThyraAccount

# 安装 Foundry 依赖
forge install

# 运行测试
forge test

# 运行测试并显示详细输出
forge test -vvv
```

</details>

---

- **在线 Demo**：筹备中。

### 5) Demo 与关键用例 (Demo & Key Flows)

- 代表性用例（详见 `UseCase.md` 与 Pitch Deck）：
  1. **统一可编程限价单 (Unified Programmable Limit Orders)**：在 Uniswap/Curve/Balancer/RFQ 等多协议间实现限价单/TWAP/DCA，支持分片执行、波动带控制与 TIF（Time-In-Force）语义，无需改变现有 UX 或放弃自托管；
  2. **收益优化 (Yield Optimization)**：在 DSR/Aave/Morpho 等协议间基于净 APY（扣除 gas 与滑点成本）自动轮换稳定币/LST/LRT 头寸，仅在收益增量覆盖成本时执行再平衡，实现"设置即忘"的风险调整收益最大化；
  3. **可执行代理 (Execution-Capable Agents)**：为第三方 AI Agent（如 Olas、Virtuals 等框架）提供安全、可撤销的链上执行通道，通过 SIR 接收意图并由 SEE 在链上自主执行，支持角色隔离、预算/速率限制与全流程可审计；
  4. **高级交易工具 (Advanced Trading Tool)**：为专业交易者提供 CeFi 级 EMS/OMS 能力，包括 VWAP/TWAP/iceberg、Bracket/OCO 订单、MEV 感知路由、跨协议智能订单路由（SOR）以及组合级风控熔断机制，在保持完全自托管的前提下实现机构级执行质量。

- **测试覆盖说明**：
  - **ThyraAccount**：包含完整 Executor 执行交易的端到端（E2E）测试；
  - **ThyraCore**：包含两个真实策略的端到端测试：
    1. **收益优化策略**：如果 Aave USDC APY 大于 5%，则自动存入 1000 USDC；
    2. **价格触发交易策略**：如果 Uniswap V3 的 ETH 报价高于 4000 美元，则执行一笔 swap 交易。

### 6) 可验证边界 (Verifiable Scope)

- 已公开且可验证：
  - 多链合约地址与部署交易（见上）；
  - Thyra Account repo；
  - 技术文档、Pitch Deck、用例说明与设计细节；
- 暂未公开（ThyraCore部分在进行security review，review完成后逐步开源）：
  - 前端 Visual Strategy Builder 与部分服务端代码；
  - Thyra Agent服务的提示词及工具调用未公开，以防止潜在的提示词注入、供应链投毒等安全威胁，从而保护Thyra用户的资产安全与系统可信执行环境。
  - Thyra Core正在进行security review。我们可以

### 7) 路线图与影响 (Roadmap & Impact)

#### 2025 Q3-Q4: Foundation
- Thyra VM + Thyra Account MVP
- AI Agent alpha
- Security audits (Tier-1 firms)
- Alpha testnet launch
- Integrate into Virtuals ACP

#### 2026 Q1: Expansion
- Visual Strategy Builder release
- Strategy template marketplace
- Integrate 20+ major DeFi protocols

#### 2026 Q2: Decentralization
- $THYRA token generation event (TGE)
- Decentralized keeper network
- DAO governance activation
- Enable third-party strategy developers, AI agent marketplace

#### 长期价值
- 将"意图执行层"标准化，降低自动化门槛，提升执行质量与透明度。

### 8) 团队与联系 (Team & Contacts)

- **团队名**：Thyra Protocol
- **联系方式**：
  - 网站：`https://thyra.fi`
  - Email：`contact@thyra.fi`
  - Twitter：`https://twitter.com/Thyra_agent`
  - GitHub：`https://github.com/thyra-protocol`

---



