# WeardOS - ETHShanghai 2025

## 一、提交物清单 (Deliverables)

- [X] GitHub 仓库（公开或临时私有）：包含完整代码与本 README
- [ ] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程
- [ ] 在线演示链接（如有）：前端 Demo 或后端 API 文档
- [ ] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本
- [ ] 可选材料：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：WeardOS - DeFi Risk Guardian
- **一句话介绍**：基于AI的去中心化金融风险检测和预警系统，支持实时交易监控、智能风险分析和自动化风险控制
- **目标用户**：DeFi投资者、交易员、项目方、安全审计人员
- **核心问题与动机（Pain Points）**：DeFi生态中存在大量安全风险，包括智能合约漏洞、闪电贷攻击、价格操纵等，用户缺乏有效的实时风险预警工具
- **解决方案（Solution）**：通过AI驱动的实时交易监控和智能风险分析，提供3秒延迟容忍的风险预警系统，支持多链监控和自动化风险控制

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：AI驱动的多层架构，包含前端展示层、后端服务层、AI分析层和区块链交互层
- **关键模块**：
  - 前端：React 18 + TypeScript + Vite，现代化Web3界面
  - 后端：Node.js + Express + Socket.IO，实时WebSocket通信
  - 合约：Solidity 0.8.20 智能合约，基于OpenZeppelin安全库
  - AI服务：通义千问(Qwen) API集成，智能风险分析
  - 数据层：MongoDB + Redis缓存优化
- **依赖与技术栈**：
  - 前端：React 18, TypeScript, Vite, Ant Design, TailwindCSS, Framer Motion, Ethers.js, Zustand
  - 后端：Node.js, Express, Socket.IO, MongoDB, Redis, Winston, Web3.js, Ethers.js
  - 合约：Hardhat, Solidity 0.8.20, OpenZeppelin
  - AI服务：通义千问(Qwen) API
  - 部署：支持Docker部署，多链网络支持

### 3) 合约与部署 (Contracts & Deployment)（如有）

- **网络**：支持多链部署（以太坊、Holesky、BSC、Polygon等）
- **核心合约与地址**：
  ```
  AIRiskController: 待部署
  RiskAnalyzer: 待部署
  ```
- **验证链接（Etherscan/BlockScout）**：待部署后提供
- **最小复现脚本**：
  ```bash
  # 编译合约
  pnpm run compile

  # 启动本地区块链节点
  pnpm run node

  # 部署合约到本地网络
  pnpm run deploy:local

  # 部署到私链
  pnpm run deploy:private
  ```

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Node.js >= 18.0.0, pnpm >= 8.0.0, MongoDB >= 5.0, Redis >= 6.0 (可选), Git
- **环境变量样例**：

```bash
# backend/.env
MONGODB_URI=mongodb://localhost:27017/Hark
QWEN_API_KEY=your_qwen_api_key_here
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
WEB3_PROVIDER_URL=https://ethereum-holesky-rpc.publicnode.com
ETHEREUM_API_KEY=your_etherscan_api_key_here
PORT=3001
NODE_ENV=development
REDIS_URL=redis://localhost:6379
PRIVATE_CHAIN_URL=http://localhost:8545
CHAIN_ID=1337
PRIVATE_KEY=your_private_key_here

# frontend-react/.env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

- **一键启动（本地示例）**：

```bash
# 安装依赖
pnpm install

# 启动数据库服务
docker run -d --name mongodb -p 27017:27017 mongo:latest
docker run -d --name redis -p 6379:6379 redis:latest

# 编译智能合约
pnpm run compile

# 启动本地区块链节点 (新终端)
pnpm run node

# 部署合约到本地网络 (新终端)
pnpm run deploy:local

# 同时启动前后端
pnpm run dev

# 访问 http://localhost:5174
```

- **在线 Demo（如有）**：待部署
- **账号与测试说明（如需要）**：需要配置通义千问API密钥和以太坊节点访问权限

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：待录制
- **关键用例步骤（2-4 个要点）**：
  - 用例 1：**实时交易监控** - 连接钱包后自动监控区块链交易，3秒内检测到可疑交易并发出预警
  - 用例 2：**AI智能风险分析** - 上传智能合约代码，通过通义千问AI进行深度安全分析，生成详细风险报告
  - 用例 3：**多链风险预警** - 支持以太坊、BSC、Polygon等多链网络的实时风险监控和预警
  - 用例 4：**可视化风险仪表板** - 通过现代化Web3界面展示实时风险数据、趋势图表和安全建议

### 6) 可验证边界 (Verifiable Scope)

- **项目完全开源，所有模块均可复现/可验证**：
  - 前端React应用：完整源码，包含所有组件和页面
  - 后端Node.js服务：完整API服务，包含所有路由和服务模块
  - 智能合约：Solidity合约源码，基于OpenZeppelin安全库
  - AI集成服务：通义千问API集成代码（需要API密钥）
  - 数据库模型：MongoDB数据模型和Redis缓存配置
  - 部署脚本：Docker配置和部署脚本

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1-3 周**：完善AI风险检测算法，优化实时监控性能，部署到测试网络进行公开测试
- **赛后 1-3 个月**：扩展支持更多区块链网络，集成更多DeFi协议数据，开发移动端应用，建立用户社区
- **预期对以太坊生态的价值**：提升DeFi生态安全性，降低用户资产损失风险，为开发者提供安全审计工具，推动区块链安全标准建设

### 8) 团队与联系 (Team & Contacts)

- **团队名**：WeardOS Team
- **成员与分工**：
  - 核心开发者 - 全栈工程师 - 负责系统架构设计、前后端开发、I集成
  - 区块链开发者 - 智能合约工程师 - 负责智能合约开发、多链集成
  - 产品设计师 - UI/UX设计师 - 负责用户界面设计、用户体验优化
- **联系方式（Email/TG/X）**：待补充
- **可演示时段（时区）**：北京时间 9:00-21:00 (UTC+8)

## 三、快速自检清单 (Submission Checklist)

- [X] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [X] 本地可一键运行，关键用例可复现
- [ ] （如有）测试网合约地址与验证链接已提供 - 待部署
- [ ] Demo 视频（≤3 分钟，中文）链接可访问 - 待录制
- [X] 如未完全开源，已在"可验证边界"清晰说明 - 项目完全开源
- [X] 联系方式与可演示时段已填写

---

## 🚀 项目亮点

- **🤖 AI驱动**: 集成通义千问AI，提供智能风险分析和预警
- **⚡ 实时监控**: 3秒延迟容忍的实时区块链交易监控系统
- **🌐 多链支持**: 支持以太坊、Holesky、BSC、Polygon等多个区块链网络
- **📊 可视化**: 现代化Web3界面，实时数据展示和风险仪表板
- **🔒 安全优先**: 基于OpenZeppelin的安全智能合约架构
- **🏗️ 完整生态**: 从前端到后端，从AI到区块链的完整技术栈
