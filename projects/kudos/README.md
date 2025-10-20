# Kudos - ETHShanghai 2025

基于可验证链上身份与声誉徽章的 AIGC 创作者社区。

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：包含完整代码与本 README
- [ ] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程（制作中）
- [ ] 在线演示链接（如有）：前端 Demo 或后端 API 文档
- [ ] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本（计划部署至 Sepolia）
- [ ] 可选材料：Pitch Deck（不计入评分权重，筹备中）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：Kudos
- **一句话介绍**：拥有链上声誉的 AIGC 创作者社区
- **目标用户**：AIGC 创作者与爱好者
- **核心问题与动机（Pain Points）**：
  - 创作者与买家对平台的信任高度依赖中心化记录，荣誉与交易证明难以验证。
  - 平台无法在不牺牲成本与用户体验的前提下，将每次交互透明地写入链上。
  - 徽章体系缺乏公开、统一的触发规则，用户难以分辨“真实贡献者”。
- **解决方案（Solution）**：
  - 使用 EIP-4973 账户绑定 NFT 为每位创作者/用户铸造链上身份。
  - 通过 EIP-5114 SBT 徽章记录真实交易成就，规则与颁发流程全部上链。
  - 市场合约只针对真实成交写入状态，发布作品使用离线签名延迟上链，兼顾透明度与成本。

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：略（草图见 `docs/声誉上链如何实现.md`，正式图在设计中）
- **关键模块**：
  - 前端：Next.js Web 客户端（计划放置于 `apps/web`，负责身份绑定、徽章陈列与交易入口）
  - 后端：Node.js BFF 与定时任务（`apps/api` 预留，负责作品验签、批量颁发脚本）
  - 合约：Foundry 构建的 Solidity 套件（身份、徽章、规则、市场、数据源）
  - 其他：后续将接入 The Graph 子图、AI 辅助的内容审核与推荐
- **依赖与技术栈**：
  - 前端：React 18, Next.js, wagmi/ethers.js, Tailwind CSS（计划中）
  - 后端：Node.js 20, Fastify/Express, PostgreSQL, BullMQ（定时徽章脚本）
  - 合约：Solidity ^0.8.20, Foundry (forge/cast/anvil), EIP-4973, EIP-5114
  - 部署：Vercel（web）、Railway/Fly.io（API）、Sepolia 测试网（合约）、IPFS（徽章元数据）

### 3) 合约与部署 (Contracts & Deployment)（如有）

- **网络**：Sepolia 测试网（预定）；当前在本地 Anvil 环境调试
- **核心合约与地址**：
  ```
  IdentityToken: 待部署
  ReputationBadge: 待部署
  BadgeRuleRegistry: 待部署
  Marketplace: 待部署
  ReputationDataFeed: 待部署
  ```
- **验证链接（Etherscan/BlockScout）**：部署后补充
- **最小复现脚本**：
  ```bash

  # 测试网部署（待开放）
  forge script packages/contracts/script/DeployReputation.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --slow

  # 运行单元测试
  make test-unit
  ```

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Foundry (`forge`), Node.js 20+, pnpm, Git，建议使用 `direnv` 管理环境变量
- **环境变量样例**：

```bash
# apps/web/.env.local
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_DEFAULT_CHAIN=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# apps/api/.env
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0x...
PORT=3001
DATABASE_URL=postgresql://...
# 可选：AI_SERVICE_URL=https://api.openai.com/v1/...

# 合约脚本
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0x...
```

- **一键启动（本地示例）**：

```bash
# 安装 Node 依赖（apps/web & apps/api 完成后执行）
pnpm install

# 运行 Foundry 单元测试和集成测试
make test

```

- **在线 Demo（如有）**：暂无（前端开发中）
- **账号与测试说明（如需要）**：待前端接入后提供默认演示账号与测试资金脚本

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：制作中
- **关键用例步骤（2-4 个要点）**：
  - 用例 1：创作者上架作品，使用离线签名登记信息，平台批量上链并验证签名。
  - 用例 2：买家完成首次购买，合约自动铸造身份 NFT 并发放“首购”徽章，同时更新统计数据。
  - 用例 3：月度脚本遍历数据源，为满足阈值的创作者发放“月度成交冠军”等主动徽章。

### 6) 可验证边界 (Verifiable Scope)

- **如未完全开源，请在此明确**：
  - 哪些模块可复现/可验证：`packages/contracts` 下全部智能合约、Foundry 测试、部署脚本、技术文档。
  - 哪些模块暂不公开及原因：前端与后端正在开发中，暂未提交；AI 内容审核与推荐策略仍在实验阶段，待安全评估后开源。

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1-3 周**：完成前端 MVP（作品浏览、购买、徽章陈列）、上线基础 API、部署 Sepolia 版本并邀请创作者内测。
- **赛后 1-3 个月**：引入主动徽章脚本、开放 API 和 SDK（`packages/shared`）、集成 AI 审核与推荐、发布首批荣誉榜单。
- **预期对以太坊生态的价值**：构建可信的链上声誉层，降低创作者经济的信任成本，促进 AIGC 作品的交易透明度，为更多应用提供可组合的身份与徽章数据源。

### 8) 团队与联系 (Team & Contacts)

- **团队名**：Chaoc Kudos Team
- **成员与分工**：
  - Kan – 合约工程师 – 智能合约架构、Foundry 测试与脚本
- **联系方式（Email/TG/X）**：
- **可演示时段（时区）**：UTC+8，工作日 14:00-20:00 可预约远程 Demo

## 三、快速自检清单 (Submission Checklist)

- [x] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [ ] 本地可一键运行，关键用例可复现（前端/后端正在接入）
- [ ] （如有）测试网合约地址与验证链接已提供
- [ ] Demo 视频（≤ 3 分钟，中文）链接可访问
- [x] 如未完全开源，已在"可验证边界"清晰说明
- [x] 联系方式与可演示时段已填写
