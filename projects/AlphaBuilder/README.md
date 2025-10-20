# AlphaBuilder - ETHShanghai 2025

> 基于账户抽象的钱包引擎与链上情报工作台。

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：AlphaBuilder mono repo（当前目录）
- [ ] Demo 视频（≤ 3 分钟，中文）：计划录制，暂未提供
- [ ] 在线演示链接（如有）：暂无对外可访问环境
- [ ] 合约部署信息（如有）：待完成测试网部署
- [ ] 可选材料：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：AlphaBuilder
- **一句话介绍**：用邮箱登录即可开通 ZeroDev Kernel 智能钱包，并实时跟踪稳定性与空投机会。
- **目标用户**：希望无痛体验账户抽象的 Web3 新用户、运营多钱包的项目方、需要情报的量化/空投策略团队。
- **核心问题与动机（Pain Points）**：传统 AA 方案 onboarding 繁琐，用户缺乏可操作的数据情报，团队难以统一管理社交恢复与会话密钥。
- **解决方案（Solution）**：提供 NestJS + Prisma 的邮箱注册 API、自动派生 ZeroDev Kernel 钱包、Solidity 多模块 AA 套件，以及可视化的稳定性/空投看板。

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：暂无架构图（开发中），详见关键模块说明。
- **关键模块**：
  - 前端：React 19 + Vite + Tailwind CSS，内置 `EmailAuthProvider`、实时稳定性表格与空投卡片/历史列表。
  - 后端：NestJS 10、Prisma 5、PostgreSQL，提供 `/auth/signup` / `/auth/login`、JWT 会话、Argon2 密码与钱包密钥存储。
  - 合约：Solidity 0.8.26 AA 组件，含 AlphaAAWallet、AlphaAAFactory、Guardian/Policy/SessionKey 模块与 AlphaVerifyingPaymaster、AlphaVault 金库。
  - 其他：ZeroDev Kernel v3.1 SDK、Hardhat、alpha123.uk 稳定性/空投数据源、Docker 化 PostgreSQL。
- **依赖与技术栈**：
  - 前端：React 19、Vite 7、React Router 7、Tailwind CSS 4、@zerodev/sdk、viem 2。
  - 后端：NestJS 10、@nestjs/jwt、Prisma 5、PostgreSQL、Argon2、Class-Validator。
  - 合约：Solidity 0.8.26、Hardhat 2.22、OpenZeppelin Contracts 5、@nomicfoundation/hardhat-toolbox。
  - 部署：ZeroDev RPC（链 ID 223/233 可配置）、自托管 PostgreSQL（Docker 镜像提供）。

### 3) 合约与部署 (Contracts & Deployment)

- **网络**：ZeroDev EVM（配置化 RPC），本地 Hardhat 网络用于测试。
- **核心合约与地址**：
  ```
  AlphaVault             : 待部署（vault 金库）
  AlphaAAFactory         : 待部署（CREATE2 工厂，生成 AlphaAAWallet）
  AlphaAAWallet          : 由工厂按需实例化
  AlphaVerifyingPaymaster: 待部署（赞助支付与预算控制）
  ```
- **验证链接（Etherscan/BlockScout）**：待部署后补充。
- **最小复现脚本**：
  ```bash
  cd alpha-builder-ethereum
  pnpm install
  pnpm build            # hardhat compile
  pnpm test             # hardhat test
  pnpm hardhat run scripts/deploy.ts --network zerodev
  ```

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Node.js ≥ 18.17、pnpm、Docker（可选，用于本地 PostgreSQL）、Git。
- **环境变量样例**：

```bash
# alpha-builder-backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/alpha_builder"
JWT_SECRET="replace-me"
JWT_EXPIRES_IN="1h"
CORS_ORIGINS="http://localhost:5173"
PORT=4000

# alpha-builder-frontend/.env
VITE_API_BASE_URL=http://localhost:4000
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_SIGNUP_PATH=/auth/signup
VITE_ZERODEV_RPC_URL=https://rpc.zerodev.app/api/v3/YOUR_PROJECT_ID/chain/223
# VITE_ZERODEV_CHAIN_ID=223

# alpha-builder-ethereum/.env
ZERODEV_RPC_URL=https://rpc.zerodev.app/api/v3/YOUR_PROJECT_ID/chain/233
ZERODEV_CHAIN_ID=233
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
ALPHA_VAULT_ADMIN=0xAdminAddress
```

- **一键启动（本地示例）**：

```bash
# 可选：拉起 PostgreSQL
docker run --name alpha-builder-db -p 5432:5432 -e POSTGRES_DB=alpha-builder-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password postgres:16

# Backend
cd alpha-builder-backend
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm start:dev

# Frontend（新终端）
cd ../alpha-builder-frontend
pnpm install
pnpm dev -- --host

# Hardhat 合约工具（按需）
cd ../alpha-builder-ethereum
pnpm install
pnpm build
```

- **在线 Demo（如有）**：暂无。
- **账号与测试说明（如需要）**：本地运行后可自行注册邮箱账号，钱包密钥加密结果持久化在数据库与浏览器 `localStorage`。

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：计划录制，暂未提供。
- **关键用例步骤（2-4 个要点）**：
  - 用例 1：用户以邮箱+密码注册，后端创建 Prisma 用户、返回 JWT 与默认 ZeroDev 钱包凭证。
  - 用例 2：登录后自动生成/恢复 Kernel 智能钱包，并在「My Account」页查询链上余额、支持复制地址。
  - 用例 3：主页实时轮询稳定性数据，按颜色分组、可筛选「稳定/一般/不稳定」并展示价差指标。
  - 用例 4：空投卡片&历史列表聚合 alpha123.uk 数据源，按时间排序并提供事件细节。

### 6) 可验证边界 (Verifiable Scope)

- **如未完全开源，请在此明确**：
  - 哪些模块可复现/可验证：前端、后端、合约与数据库 schema 均已开源，可本地跑通。
  - 哪些模块暂不公开及原因：外部数据源 `alpha123.uk` 由第三方维护，仅提供只读接口；ZeroDev 托管服务需要自行申请项目 ID。

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1-3 周**：补充演示视频、完成测试网部署与合约验证、为空投数据提供缓存服务。
- **赛后 1-3 个月**：集成真实邮箱证明（如 zkEmail）、打通 AlphaVault 存取款、上线多链支持与批量会话密钥策略。
- **预期对以太坊生态的价值**：降低账户抽象的使用门槛，强化钱包安全策略管理，提供给运营团队的数据驱动决策支持。

### 8) 团队与联系 (Team & Contacts)

- **团队名**：ABCLabs
- **成员与分工**：
  - Artist 负责产品设计和Deck撰写
  - AQ 负责打通钱包与我的页面，前后端开发
  - Aiden 负责整体架构和前后端开发
- **联系方式（Email/TG/X）**：
  - Artist: nevermorezxt@gmail.com
  - AQ: qinhaojian404@gmail.com
  - Aiden: csiyu100@gmail.com
- **可演示时段（时区）**：待补充

## 三、快速自检清单 (Submission Checklist)

- [x] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [ ] 本地可一键运行，关键用例可复现
- [ ] （如有）测试网合约地址与验证链接已提供
- [ ] Demo 视频（≤ 3 分钟，中文）链接可访问
- [x] 如未完全开源，已在"可验证边界"清晰说明
- [ ] 联系方式与可演示时段已填写
