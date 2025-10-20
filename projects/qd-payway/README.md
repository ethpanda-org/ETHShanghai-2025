# PayWay - ETHShanghai 2025

> 请按照以下模板填写你的项目信息

## 一、提交物清单 (Deliverables)

- [x] **GitHub 仓库**（公开或临时私有）：包含完整代码与本 README
- [x] **Demo 视频**（≤ 3 分钟，中文）：展示核心功能与流程
- [x] **在线演示链接**（如有）：前端 Demo 或后端 API 文档
- [x] **合约部署信息**：网络、地址、验证链接、最小复现脚本
- [ ] **可选材料**：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：PayWay
- **一句话介绍**：基于智能合约的稳定币安全付款与自动结算平台
- **目标用户**：中小外贸企业/自由职业者、从事跨境电商和数字服务外包的中小企业
- **核心问题与动机（Pain Points）**：
  - **技术门槛高**：尽管 USDT 等稳定币在结算方面有巨大优势（高效、低成本），但非技术背景的企业在安全使用钱包、管理私钥、理解链上操作等方面存在巨大困难和风险。
  - **信任与效率低下**：传统的"一方打款，一方履约"流程中，存在严重的信任问题。买方担心付款后收不到合格的产品/服务，卖方担心履约后收不到钱。这导致了流程扯皮、人工确认效率低下，甚至交易失败。
- **解决方案（Solution）**：
  - **智能合约托管**：资金锁定在去中心化的智能合约中，而非第三方平台，确保安全透明。
  - **灵活的验证方式**：支持两种订单确认方式触发放款：
    - **邮件订单确认**：付款方发送邮件指令即可触发自动放款，将复杂的链上操作简化为日常邮件交互
    - **企业签**：支持企业级电子签名验证，提供具备法律效力的放款确认方式
  - **零技术门槛**：用户只需连接钱包（如 MetaMask），填写简单表单，即可完成托管合约创建，无需编写代码或理解智能合约。
  - **自动化结算**：通过 Supabase Edge Functions/ChainLink Functions 作为可信预言机，验证订单确认后自动执行链上放款，实现"代码即信任"。

### 2) 架构与实现 (Architecture & Implementation)

- **系统架构总览**：
  ![系统架构图](docs/architecture.png)

- **关键模块**：
  - **前端**：
    - 框架：Next.js 15.5.6 + React 19.1.0
    - Web3 集成：RainbowKit 2.2.9 + Wagmi 2.18.1 + Viem 2.x
    - UI 组件：Shadcn UI + Tailwind CSS 4
    - 状态管理：React Query 5.90.5
    - 功能：钱包连接、合约创建表单、托管详情展示、邮件放款指引
  
  - **后端（Serverless）**：
    - 平台：Supabase (PostgreSQL + Edge Functions)
    - 运行时：Deno (Edge Functions)
    - 验证服务：SendGrid (邮件确认) + 企业签名服务集成
    - 功能：
      - 多种验证方式处理（邮件订单确认、企业签）
      - 双重验证（发件人/签名验证 + 合约状态）
      - 区块链交易执行
      - 通知发送
  
  - **智能合约**：
    - 语言：Solidity (Compatible with ^0.8.30)
    - 合约名：AdvancedPayment
    - 部署网络：Ethereum Sepolia Testnet
    - 主要功能：
      - `advancePay()`: 创建托管并锁定 USDT
      - `pay()`: 管理员触发放款给收款方
      - `cancel()`: 付款方取消托管并退款
      - `getPayment()`: 查询托管订单详情
  
  - **数据库**：
    - 类型：PostgreSQL (Supabase 托管)
    - 表结构：
      - `contracts`: 存储托管合约信息（订单号、地址、金额、状态等）
      - `release_requests`: 记录放款请求和处理状态
    - 特性：RLS (行级安全)、自动触发器、索引优化

### 3) 合约与部署 (Contracts & Deployment)

- **网络**：Ethereum Sepolia 测试网
- **核心合约与地址**：
  ```
  AdvancedPayment (托管合约): 0xc6f5B24dcE07366a68828cDBc4d7e71601E747a1
  USDT Token (ERC-20):      0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0
  ```
- **Etherscan 验证链接**：
  - 合约地址：https://sepolia.etherscan.io/address/0xc6f5b24dce07366a68828cdbc4d7e71601e747a1
  - 已有 8 笔交易，包含 `advancePay` 和 `pay` 操作

- **最小复现脚本**：
 

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：
  - Node.js 18+ 
  - npm 或 pnpm
  - Git
  - MetaMask 或其他 Web3 钱包（浏览器插件）

- **环境变量配置**：

**前端环境变量** (`frontend/payway/.env.local`)：
```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://ctbklunoxeoowqhjvdxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0YmtsdW5veGVvb3dxaGp2ZHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MzM1MDMsImV4cCI6MjA3NjMwOTUwM30.xSxSvMlQF0LaOalFTNTWk9KAwrF0OKb72fIi0mxi5oM

# WalletConnect 配置（用于 RainbowKit）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=ff8be528710760c02df1063b04c61579

# 智能合约地址
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0xc6f5B24dcE07366a68828cDBc4d7e71601E747a1
NEXT_PUBLIC_USDT_CONTRACT_ADDRESS=0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0

# 放款邮箱地址
NEXT_PUBLIC_RELEASE_EMAIL_ADDRESS=oreply@official.mcppayway.com
```

**后端环境变量** (Supabase Secrets - 用于 Edge Functions)：
```bash
# SendGrid 邮件服务
SENDGRID_API_KEY=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
SENDGRID_FROM_EMAIL=oreply@official.mcppayway.com

# 区块链配置
ETH_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ESCROW_CONTRACT_ADDRESS=0xc6f5B24dcE07366a68828cDBc4d7e71601E747a1

# 平台钱包私钥（用于代替用户触发放款）
PLATFORM_WALLET_PRIVATE_KEY=0x87269b1977619f55a9c6eea5a67209a0331b868e3b2c252ef78d7a0d7c56a55b
```

- **一键启动步骤**：

```bash
# 1. 克隆仓库
git clone https://github.com/beanu/ETHShanghai-2025.git
cd projects/qd-payway

# 2. 进入前端目录
cd frontend/payway

# 3. 安装依赖
npm install

# 4. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际配置

# 5. 启动开发服务器
npm run dev

# 6. 打开浏览器访问
# http://localhost:3000
```

- **数据库设置**：
```sql
-- 在 Supabase SQL Editor 中执行以下迁移
-- 1. 创建 contracts 表
-- 见 backend/database/migrations/001_create_contracts_table.sql

-- 2. 创建 release_requests 表
-- 见 backend/database/migrations/003_create_release_requests.sql
```

- **测试准备**：
  1. **获取 Sepolia ETH**：访问 [Sepolia Faucet](https://sepoliafaucet.com/) 领取测试 ETH
  2. **获取测试 USDT**：uniswap获取
  3. **配置钱包**：在 MetaMask 中添加 Sepolia 测试网
  4. **SendGrid 配置**：按照 `doc/EMAIL_SETUP_GUIDE.md` 配置邮件服务

- **在线 Demo**：https://eth-shanghai-2025.vercel.app/

- **测试账号说明**：
  - 无需注册账号，直接使用 Web3 钱包连接
  - 测试时请使用 Sepolia 测试网，避免使用真实资产
  - 示例测试流程见下方「Demo 与关键用例」章节

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：https://youtu.be/Q95xPS8wGGA?si=RyrGfvivt9SNvqp3

- **关键用例步骤**：

  **用例 1：创建托管订单（付款方视角）**
  1. 访问 PayWay 首页，点击「连接钱包」，使用 MetaMask 连接到 Sepolia 测试网
  2. 进入「创建订单」页面，填写：
     - 收款方钱包地址
     - 托管金额（USDT）
     - 验证方式：邮箱
     - 验证邮箱地址（用于后续放款授权）
     - 系统自动生成12位订单号
  3. 点击「创建并支付」，依次完成两笔链上交易：
     - 第一步：授权 USDT（Approve）
     - 第二步：创建托管订单（advancePay）
  4. 交易成功后，USDT 被锁定在智能合约中，状态显示「资金托管中」
  5. 页面自动跳转到订单详情页，展示完整信息和操作指引

  **用例 2：订单确认与自动放款（付款方视角）**
  1. 在订单详情页，确认收款方已履约，点击「申请放款」按钮
  2. 选择订单确认方式：
     - **方式一：邮件订单确认**
       - 查看弹窗中的邮件指令说明
       - 发件邮箱：需使用创建订单时预留的邮箱
       - 收件地址：release@payway.example.com
       - 邮件主题：`RELEASE: [订单号]`（如 `RELEASE: 123456789012`）
       - 使用预留邮箱发送指令邮件
     - **方式二：企业签(待开发)**
       - 使用企业级电子签名服务完成订单确认
       - 签名完成后自动触发放款流程
  3. 后台系统自动处理：
     - 验证确认方式（邮箱匹配或企业签验证）
     - 验证订单状态是否为「托管中」
     - 平台钱包自动调用智能合约 `pay()` 函数
     - 将 USDT 从合约转账给收款方
  4. 5-10分钟内，订单状态更新为「已完成」
  5. 付款方和收款方收到通知，可在 Etherscan 查看链上交易记录

  **用例 3：查看订单历史和状态（双方视角）**
  1. 连接钱包后，进入「我的订单」控制台
  2. 查看所有相关订单列表：
     - 作为付款方创建的订单
     - 作为收款方接收的订单
  3. 订单状态实时同步：
     - 🟡 资金托管中（PENDING）
     - 🟢 已完成（PAID）
     - ⚫ 已取消（CANCELLED）
  4. 点击订单查看详细信息：
     - 订单号、金额、交易双方地址
     - 验证方式和邮箱
     - 创建时间、交易哈希
     - 区块链浏览器链接
  5. 付款方/收款方会收到订单完成的邮件

### 6) 可验证边界 (Verifiable Scope)

- **项目完全开源**，所有代码均在 GitHub 仓库中公开，可自由查看、复现和验证。
  

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1-3 周（短期计划）**：
  - ✅ 完成端到端测试和 Bug 修复
  - ✅ 部署生产环境前端到 Vercel
  - ✅ 录制产品演示视频（中文，3分钟内）
  - ✅ 完善用户文档和快速开始指南
  - ✅ 实现合约取消功能的完整 UI 流程
  - ✅ 添加更友好的错误提示和用户引导

- **赛后 1-3 个月（中期计划）**：
  - 🎯 **多链支持**：扩展到 Arbitrum、Optimism、TRON 等其他公链
  - 🎯 **多币种支持**：支持 USDC、DAI 等其他主流稳定币
  - 🎯 **验证方式增强**：扩展企业签集成更多电子签名服务（DocuSign、e签宝等），优化邮件确认流程
  - 🎯 **争议仲裁机制**：引入平台仲裁或去中心化仲裁（如 Kleros）解决纠纷
  - 🎯 **移动端适配**：优化移动浏览器体验，支持 WalletConnect 移动钱包
  - 🎯 **通知增强**：
    - 添加浏览器 Web Push 通知
    - 支持 Telegram/Discord 通知机器人
    - 收款方邮箱收集和通知
  - 🎯 **性能优化**：
    - 使用 Supabase Realtime 实现状态实时同步
    - 添加 WebSocket 支持，减少轮询
    - 优化 Gas 费用（批量操作、Layer 2）

- **预期对以太坊生态的价值**：
  
  💡 **降低区块链使用门槛**
  - 为非技术用户提供极简的 Web3 交互体验，将复杂的钱包操作、智能合约调用简化为熟悉的邮件操作
  - 推动更多中小企业和自由职业者接触和使用以太坊及稳定币
  
  💡 **推广智能合约实际应用**
  - 展示智能合约在真实商业场景中的价值：托管、自动结算、去信任化
  - 证明区块链技术可以解决传统贸易中的信任和效率问题
  
  💡 **促进稳定币支付采用**
  - 为跨境支付提供低成本、高效率的替代方案
  - 降低传统银行转账的高额手续费和长时间延迟
  
  💡 **构建开源基础设施**
  - 项目完全开源，可作为其他 DApp 的参考和基础组件
  - 提供可复用的多种验证方式集成方案（邮件确认、企业签等），启发更多创新应用
  
  💡 **扩大以太坊用户基数**
  - 吸引 Web2 用户进入 Web3 世界
  - 为以太坊生态带来更多实际使用场景和链上交易量

### 8) 团队与联系 (Team & Contacts)

- **团队名**：QD-奇点计划
- **成员与分工**：
  - Cedar - 产品经理 - 智能合约开发、产品设计
  - YZ - 技术开发 - 前端开发、后端开发
- **联系方式**：
  - Email: zhaoyunhello@gmail.com
  - Telegram: groot_xxx
  - X (Twitter): robot_yz
- **可演示时段（时区）**：[工作日 9:00-18:00 (UTC+8)]

## 三、快速自检清单 (Submission Checklist)

- [x] **README 按模板填写完整**
- [x] **本地可一键运行**，关键用例可复现
- [x] **测试网合约地址与验证链接已提供**
- [x] **Demo 视频**（≤3 分钟，中文）链接可访问
- [x] **完全开源**，已在"可验证边界"清晰说明
- [x] **联系方式与可演示时段已填写**