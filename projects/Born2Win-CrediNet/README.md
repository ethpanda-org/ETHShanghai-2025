# CrediNet - ETHShanghai 2025

> ETH Shanghai 黑客松参赛版 README（已按官方模板重构）

---

## 一、提交物清单 (Deliverables)

- [ ] GitHub 仓库（公开或临时私有）：包含完整代码与本 README  
- [ ] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程（占位）  
- [ ] 在线演示链接（如有）：前端 Demo 或后端 API 文档（占位）  
- [ ] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本（当前等待测试网部署）  
- [ ] 可选材料：Pitch Deck（不计入评分权重）

---

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：CrediNet  
- **一句话介绍**：用“五维信用光谱 + 动态 SBT”让用户拥有可移植、可授权、可激励的链上信用画像。  
- **目标用户**：  
  - Web3 个体用户（希望沉淀声誉并在各场景复用）  
  - DApp/DeFi/招聘/保险/社交/DAO 等应用方（需要低摩擦可信度量）  
  - 数据提供方与分析方（参与数据经济并获得激励）  
- **核心问题与动机（Pain Points）**：  
  - 传统信用高度中心化、不可携带、跨场景复用成本高  
  - 链上信誉多以资产与交易为主，维度单一、难以反映“人”的多面能力  
  - 用户难以掌控数据授权边界与收益分配  
- **解决方案（Solution）**：  
  - **信用光谱模型**：以“基石K / 能力A / 财富F / 健康H / 行为B”五维为基础形成可解释的信用向量  
  - **动态 SBT**：将用户的多源数据映射为可成长的链上勋章与画像  
  - **数据主权与授权**：前端可视化授权，最小必要、可撤销  
  - **经济激励（CRN）**：按贡献与使用结算，驱动数据供需循环  
  - **生态接口**：为 DeFi、招聘、保险、DAO 等提供低耦合对接能力

---

### 2) 架构与实现 (Architecture & Implementation)

- **关键模块**：  
  - 前端：React + TypeScript + Vite + TailwindCSS（含仪表盘、数据授权、市场、SBT 预览等）  
  - 合约：SBTRegistry、CRNToken、DataMarketplace、CrediNetCore（计划部署到 Sepolia）  
  - 其他：Wagmi/Viem/ethers 交互、RainbowKit 钱包、（可选）World ID / self.xyz 集成  
  - 后端（规划中）：agent-service（五维数据采集与安全代理）
- **依赖与技术栈**：  
  - 前端：React 18.3、TypeScript 5.6、Vite 5.4、TailwindCSS 3.4、Framer Motion、Recharts、React Router、Zustand、React Query  
  - Web3：ethers.js 6.13、wagmi 2.12、viem 2.21、RainbowKit 2.1  
  - 智能合约：智能合约已在sepolia测试网部署：https://sepolia.etherscan.io/address/0xb95e8e0960ad789d560ad6e65d574180af9361b8

---

### 3) 合约与部署 (Contracts & Deployment)（如有）

- **网络**：Sepolia 测试网（计划）  
- **核心合约与地址**：
  ```
  CrediNetCore: 0xB95E8e0960Ad789D560AD6e65D574180Af9361b8
  ```
- **验证链接（Etherscan/BlockScout）**：https://sepolia.etherscan.io/address/0xb95e8e0960ad789d560ad6e65d574180af9361b8
- **最小复现脚本（Foundry）**：
  ```bash
  # 部署合约（示例）
  forge script script/Deploy.s.sol     --rpc-url $SEPOLIA_RPC_URL     --private-key $PRIVATE_KEY     --broadcast

  # 运行测试
  forge test -vv
  ```

---

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Node.js 18+、npm 或 yarn、Git、（可选）MetaMask  
- **环境变量样例（Vite）**：
  ```bash
  # .env（示例）
  # 从 https://cloud.walletconnect.com/ 获取
  VITE_WALLETCONNECT_PROJECT_ID=你的PROJECT_ID

  # 可选：默认链与 RPC
  VITE_DEFAULT_CHAIN=11155111            # Sepolia
  VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
  ```
- **一键启动（本地）**：
  ```bash
  # 克隆并进入项目
  git clone <your-repo-url>
  cd CrediNet

  # 安装依赖
  npm install      # 或 yarn install

  # 启动开发服务器
  npm run dev      # 或 yarn dev

  # 打开 http://localhost:5173
  ```

---

### 5) Demo 与关键用例 (Demo & Key Flows)

- **关键用例步骤**：  
  - 用例 1：连接钱包 → 进入 Dashboard → 查看 C-Score 与五维雷达图  
  - 用例 2：在 Data 模块切换/授权数据源（World ID/self.xyz/Wallet/Off-chain）并查看授权记录  
  - 用例 3：在 Marketplace 选择应用并按需授权维度 → 产生使用记录与 CRN 收益  
  - 用例 4：在 Profile 浏览 SBT 勋章与成长历史（动态渲染）

---

### 6) 可验证边界 (Verifiable Scope)

- **可复现/可验证**：  
  - 前端 UI（Dashboard/Data/Marketplace/Profile/Settings）及交互  
  - Web3 交互框架（RainbowKit + Wagmi + Viem）与演示页 `/web3-demo`  
  - 动态 SBT 渲染与 Mock 数据（`src/mock/data.ts`）  
- **暂未公开/未完成及原因**：  
  - 合约部署地址与验证链接：⏳ 等待测试网部署  
  - agent-service（五维数据采集）：功能与安全加固开发中  
  - World ID / self.xyz SDK：可选项，赛期内择机集成

---

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1–3 周（短期）**：  
  - 完成 agent-service P1 能力，补齐数据采集闭环  
  - 部署与验证核心合约（SBTRegistry / CRNToken / CrediNetCore / DataMarketplace）  
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

- [ ] README 按模板填写完整（概述、架构、复现、Demo、边界）  
- [ ] 本地可一键运行（`npm run dev`），关键用例可复现（含 Mock）  
- [ ] （如有）测试网合约地址与验证链接已提供  
- [ ] Demo 视频（≤ 3 分钟，中文）链接可访问  
- [ ] 如未完全开源，已在「可验证边界」清晰说明  
- [ ] 联系方式与可演示时段已预留占位，待补充

---

### 附：项目要点（便于评委快速了解）

- **核心模型**：五维信用光谱（K/A/F/H/B） → 动态 SBT  
- **数据主权**：明确授权、可撤销、最小必要  
- **经济设计**：CRN 奖励数据贡献与使用  
- **现状**：前端完成度高（95/100），Web3 架构完备；等待合约部署与 agent-service 上线  
- **文档索引**：PRD、Web3 集成指南、快速开始、部署清单、合约集成说明、审计报告/修复清单/总结（均已在仓库就绪）

---

