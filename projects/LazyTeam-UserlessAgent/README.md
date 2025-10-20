# [项目名称] - ETHShanghai 2025

> 请按照以下模板填写你的项目信息

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：包含完整代码与本 README
- [ ] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程
- [ ] 在线演示链接（如有）：前端 Demo 或后端 API 文档
- [ ] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本
- [ ] 可选材料：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：[请填写你的项目名称]
- **一句话介绍**：[一句话描述你的项目]
- **目标用户**：[谁是你的目标用户？]
- **核心问题与动机（Pain Points）**：[你要解决什么问题？]
- **解决方案（Solution）**：[你的解决方案是什么？]

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：[系统架构图链接]
- **关键模块**：
  - 前端：React/Next.js/Vue.js 等
  - 后端：Node.js/Python/Go 等
  - 合约：Solidity 智能合约
  - 其他：[索引、Oracles、AI 代理等]
- **依赖与技术栈**：
  - 前端：React, Next.js, ethers.js, Tailwind CSS
  - 后端：Node.js, Express, PostgreSQL
  - 合约：Solidity, Foundry/Hardhat
  - 部署：Vercel, Railway, Sepolia 测试网

### 3) 合约与部署 (Contracts & Deployment)（如有）

- **网络**：Sepolia 测试网
- **核心合约与地址**：
  ```
  ContractName: 0x...
  ```
- **验证链接（Etherscan/BlockScout）**：[验证链接]
- **最小复现脚本**：
  ```bash
  # 部署合约
  forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
  
  # 运行测试
  forge test
  ```

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Node 18+, pnpm, Git
- **环境变量样例**：

```bash
# frontend/.env.local
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_DEFAULT_CHAIN=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# backend/.env
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0x...
PORT=3001
DATABASE_URL=postgresql://...
```

- **一键启动（本地示例）**：

```bash
# 安装依赖
pnpm install

# 启动后端
pnpm --filter backend dev

# 启动前端
pnpm --filter frontend dev

# 打开 http://localhost:3000
```

- **在线 Demo（如有）**：[Demo 链接]
- **账号与测试说明（如需要）**：[测试账号信息]

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：[视频链接]
- **关键用例步骤（2-4 个要点）**：
  - 用例 1：[描述第一个关键功能]
  - 用例 2：[描述第二个关键功能]
  - 用例 3：[描述第三个关键功能]

### 6) 可验证边界 (Verifiable Scope)

- **如未完全开源，请在此明确**：
  - 哪些模块可复现/可验证：[列出可验证的部分]
  - 哪些模块暂不公开及原因：[说明原因]

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1-3 周**：[短期计划]
- **赛后 1-3 个月**：[中期计划]
- **预期对以太坊生态的价值**：[长期价值]

### 8) 团队与联系 (Team & Contacts)

- **团队名**：[你的团队名称]
- **成员与分工**：
  - [姓名] - [角色] - [负责模块]
  - [姓名] - [角色] - [负责模块]
- **联系方式（Email/TG/X）**：[联系方式]
- **可演示时段（时区）**：[可演示时间]

## 三、快速自检清单 (Submission Checklist)

- [ ] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [ ] 本地可一键运行，关键用例可复现
- [ ] （如有）测试网合约地址与验证链接已提供
- [ ] Demo 视频（≤3 分钟，中文）链接可访问
- [ ] 如未完全开源，已在"可验证边界"清晰说明
- [ ] 联系方式与可演示时段已填写

---

**注意**：请删除此模板说明，只保留你填写的内容。
