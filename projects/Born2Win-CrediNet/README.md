# CrediNet - ETHShanghai 2025

> ETH Shanghai 黑客松参赛版 README（已按官方模板重构）

---

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：包含完整代码与本 README
- [ ] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程（占位）
- [ ] 在线演示链接（如有）：前端 Demo 或后端 API 文档（占位）
- [x] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本
- [ ] 可选材料：Pitch Deck（不计入评分权重）

---

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：CrediNet
- **一句话介绍**：用"五维信用光谱 + 动态 SBT"让用户拥有可移植、可授权、可激励的链上信用画像。
- **目标用户**：
  - Web3 个体用户（希望沉淀声誉并在各场景复用）
  - DApp/DeFi/招聘/保险/社交/DAO 等应用方（需要低摩擦可信度量）
  - 数据提供方与分析方（参与数据经济并获得激励）
- **核心问题与动机（Pain Points）**：
  - 传统信用高度中心化、不可携带、跨场景复用成本高
  - 链上信誉多以资产与交易为主，维度单一、难以反映"人"的多面能力
  - 用户难以掌控数据授权边界与收益分配
- **解决方案（Solution）**：
  - **信用光谱模型**：以"基石K / 能力A / 财富F / 健康H / 行为B"五维为基础形成可解释的信用向量
  - **动态 SBT**：将用户的多源数据映射为可成长的链上勋章与画像
  - **数据主权与授权**：前端可视化授权，最小必要、可撤销
  - **经济激励（CRN）**：按贡献与使用结算，驱动数据供需循环
  - **生态接口**：为 DeFi、招聘、保险、DAO 等提供低耦合对接能力

---

### 2) 架构与实现 (Architecture & Implementation)

- **关键模块**：
  - 前端：React + TypeScript + Vite + TailwindCSS（含仪表盘、数据授权、市场、SBT 预览等）
  - 合约：SBTRegistry、CRNToken、DataMarketplace、CrediNetCore（已部署到 Sepolia）
  - Web3集成：Wagmi/Viem/ethers 交互、RainbowKit 钱包、（可选）World ID / self.xyz 集成
  - 后端：Rust + Actix-web（DID、信用评分、SBT 服务、授权管理）
- **依赖与技术栈**：
  - 前端：React 18.3、TypeScript 5.6、Vite 5.4、TailwindCSS 3.4、Framer Motion、Recharts、React Router、Zustand、React Query
  - Web3：ethers.js 6.13、wagmi 2.12、viem 2.21、RainbowKit 2.1
  - 后端：Rust、Actix-web、SQLite、ethers-rs
  - 智能合约：Solidity 0.8.x、Hardhat、OpenZeppelin

---

### 3) 合约与部署 (Contracts & Deployment)

- **网络**：Sepolia 测试网
- **核心合约与地址**：
  ```
  CrediNetCore: 0xB95E8e0960Ad789D560AD6e65D574180Af9361b8
  ```
- **验证链接（Etherscan）**：https://sepolia.etherscan.io/address/0xb95e8e0960ad789d560ad6e65d574180af9361b8
- **最小复现脚本**：
  ```bash
  # 进入合约目录
  cd contracts

  # 安装依赖
  npm install

  # 配置环境变量（.env）
  cp .env.example .env
  # 编辑 .env 填入 SEPOLIA_RPC_URL 和 PRIVATE_KEY

  # 编译合约
  npx hardhat compile

  # 部署到 Sepolia
  npx hardhat run scripts/deploy.js --network sepolia

  # 运行测试
  npx hardhat test
  ```

---

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Node.js 18+、Rust 1.70+、npm 或 yarn、Git、MetaMask
- **环境变量样例**：

  前端（`frontend/.env`）：
  ```bash
  # 从 https://cloud.walletconnect.com/ 获取
  VITE_WALLETCONNECT_PROJECT_ID=你的PROJECT_ID

  # Sepolia 测试网配置
  VITE_DEFAULT_CHAIN=11155111
  VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

  # 后端 API 地址
  VITE_API_BASE_URL=http://localhost:8080
  ```

  后端（`backend/.env`）：
  ```bash
  # 数据库
  DATABASE_URL=sqlite://credinet.db

  # JWT 密钥
  JWT_SECRET=your_jwt_secret_here

  # 合约地址
  CONTRACT_ADDRESS=0xB95E8e0960Ad789D560AD6e65D574180Af9361b8
  SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
  ```

- **一键启动（本地）**：

  启动后端：
  ```bash
  cd backend
  cargo run --release
  # 后端运行在 http://localhost:8080
  ```

  启动前端：
  ```bash
  cd frontend
  npm install      # 或 yarn install
  npm run dev      # 或 yarn dev
  # 前端运行在 http://localhost:5173
  ```

---

### 5) Demo 与关键用例 (Demo & Key Flows)

- **关键用例步骤**：
  - 用例 1：连接钱包 → 进入 Dashboard → 查看 C-Score 与五维雷达图
  - 用例 2：在 Data 模块切换/授权数据源（World ID/self.xyz/Wallet/Off-chain）并查看授权记录
  - 用例 3：在 Marketplace 选择应用并按需授权维度 → 产生使用记录与 CRN 收益
  - 用例 4：在 Profile 浏览 SBT 勋章与成长历史（动态渲染）
  - 用例 5：铸造 SBT → 查看链上凭证与动态更新

---

### 6) 可验证边界 (Verifiable Scope)

- **可复现/可验证**：
  - 前端 UI（Dashboard/Data/Marketplace/Profile/Settings）及交互
  - Web3 交互框架（RainbowKit + Wagmi + Viem）与演示页 `/web3-demo`
  - 动态 SBT 渲染与 Mock 数据（`src/mock/data.ts`）
  - 后端 API（身份验证、信用评分、SBT 服务）
  - 智能合约部署与验证（Sepolia 测试网）
- **暂未公开/未完成及原因**：
  - agent-service（五维数据采集）：功能与安全加固开发中
  - World ID / self.xyz SDK：可选项，赛期内择机集成
  - 部分高级功能（如完整的数据市场交易流程）仍在优化中

---

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1–3 周（短期）**：
  - 完成 agent-service P1 能力，补齐数据采集闭环
  - 完成动态 SBT Agent 的安全增强与资源上传
  - 准备在线 Demo 与三分钟中文解说视频
- **赛后 1–3 个月（中期）**：
  - 接入 World ID/self.xyz 等隐私与身份数据源
  - 引入最小可用的收益与结算策略，运行小规模灰度
  - 优化移动端与性能（虚拟列表/图片懒加载/动画优化）
- **预期对以太坊生态的价值（长期）**：
  - 提供可解释、可移植的用户信用画像，为 DeSoc/DeFi/招聘/保险/DAO 等提供低耦合的风控与激励基元
  - 以可授权的数据主权与 CRN 激励，促进数据的合法合规流通与价值回流用户

---

### 8) 团队与联系 (Team & Contacts)

- **团队名**：Born2Win
- **联系方式（Email/TG/X）**：zc040809@gmail.com

---

## 三、快速自检清单 (Submission Checklist)

- [x] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [x] 本地可一键运行（`npm run dev`），关键用例可复现
- [x] 测试网合约地址与验证链接已提供
- [ ] Demo 视频（≤ 3 分钟，中文）链接可访问
- [x] 如未完全开源，已在「可验证边界」清晰说明
- [x] 联系方式与可演示时段已填写

---

### 附：项目要点（便于评委快速了解）

- **核心模型**：五维信用光谱（K/A/F/H/B） → 动态 SBT
- **数据主权**：明确授权、可撤销、最小必要
- **经济设计**：CRN 奖励数据贡献与使用
- **现状**：
  - 前端完成度高（95%），Web3 架构完备
  - 后端服务完成（DID、信用评分、SBT、授权管理）
  - 智能合约已部署到 Sepolia 测试网并验证
  - 等待 agent-service 上线与 Demo 视频录制
- **文档索引**：完整的技术文档、API 文档、部署指南均已在仓库中

---

**祝 ETHShanghai 2025 评审顺利！** 🚀
