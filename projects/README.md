# Vibecoding market - ETHShanghai 2025


## 一、提交物清单 (Deliverables)

- GitHub 仓库（公开或临时私有）：包含完整代码与本 README
- Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程



### 项目概述 (Overview)

- **项目名称**：Vibecoding market
- **一句话介绍**：AI Coding 时代的即时 Debug 与交付保障平台  
- **目标用户**：vibe coding 用户和专业开发者
- **核心问题与动机（Pain Points）
“AI 能生成代码，但无法生成上线产品”  
● ⚠️ 95% 的 AI 生成项目卡在最后 20%（Debug、部署、环境配置）  
● ⚠️ 开发者孤立无援：ChatGPT 答非所问，论坛回复慢，Discord 无责任制  
● ⚠️ 结果：项目废弃，创新停滞，开发者挫败

### 使用流程（用户视角）
1. 用户登录 → 发布任务 → 输入需求 + 上传项目链接（GitHub/Lovable）
2. 工程师接单 → 进入协作空间 → 分析代码
3. 双方实时聊天 → 工程师修复 → 可直接 Remix Run/Screenshot/Commit
4. 用户确认结果 → 区块链合约释放付款
5. 任务完成 → 双方评分

### 产品功能亮点
功能模块	价值
任务市场	按需发布，即时响应（<10分钟）
代码协作	直接查看、调试用户代码（集成 Lovable）
托管支付	链上担保，完成付款，拒绝欺诈
信用体系	双向评价，构建可信开发者网络

### 目标用户
- AI Coding 用户（0–2年经验）	希望快速把产品跑起来，上线真实网站
- Part-time 工程师	希望利用碎片时间接 Debug 任务赚取收入
- Hackathon 参与者 / Indie Hacker	时间紧、需要稳定的救火支援


### 架构与实现 (Architecture & Implementation)

系统采用 Web + Web3 + 实时协作 + 托管支付 + 外部代码查看/调试能力 的混合架构：
用户浏览器
  │
  ▼
前端（Next.js / React）
  │  ├─ Chat UI（Socket.IO）
  │  ├─ Task Market UI
  │  ├─ Wallet 支付交互（ethers.js + MetaMask）
  │  └─ 代码查看器（Lovable Remix iframe/SaaS SDK）
  │
  ▼
后端 API（Node.js / NestJS / Express）
  │  ├─ Auth / 注册登录 / Token认证
  │  ├─ 任务管理（Task Service）
  │  ├─ 聊天记录存储（Chat Service）
  │  └─ 仲裁与订单状态管理
  │
  ▼
数据库（PostgreSQL / Supabase）存储任务 + 聊天 + 用户信誉
  │
  ▼
智能合约（Escrow 托管合约 / Solidity · ETH Testnet）

### 智能合约设计（核心逻辑）
合约：DebugTaskEscrow.sol
必须具备：
功能	方法
托管资金	deposit(taskId, amount)
支付给工程师	release(taskId)
退款	refund(taskId)
查询余额	getTaskBalance(taskId)
安全要求：
● no re-entrancy（加入 ReentrancyGuard）
● owner无权限取资金（保障信任）
● 用户与接单人绑定
测试网建议：Sepolia
钱包交互：ethers.js + MetaMask



### 团队与联系 (Team & Contacts)
- **zoe51**：zoe.wuyanren@gmail.com

