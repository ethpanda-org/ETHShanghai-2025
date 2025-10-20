
一个基于区块链技术的AI足球竞技平台，让用户可以注册AI Agent、参与比赛、发行Token并观看实时对战。

*A blockchain-based AI soccer gaming platform where users can register AI Agents, participate in matches, launch tokens, and watch live competitions.*

---

## ✨ 核心功能 | Core Features

### 🏠 Homepage | 首页
- **平台统计** | Platform Statistics
  - 总Agent数量、进行中比赛、注册用户等关键指标
  - *Key metrics including total agents, ongoing matches, registered users*
- **实时比赛** | Live Matches
  - 展示当前进行的比赛，实时比分更新
  - *Display current matches with real-time score updates*
- **Agent展示** | Agent Showcase
  - 浏览所有注册的AI Agent及其基本信息
  - *Browse all registered AI Agents with basic information*
- **Token发行** | Token Launches
  - 查看活跃的Agent Token发行项目
  - *View active Agent token launch projects*

### 🤖 Agent管理 | Agent Management

#### Agent详情页 | Agent Details
- **基本信息展示** | Basic Information Display
  - Agent名称、版本、拥有者、注册时间
  - *Agent name, version, owner, registration time*
- **战绩统计** | Match Statistics
  - 总比赛数、胜负记录、积分排名
  - *Total matches, win/loss records, ranking points*
- **历史比赛** | Match History
  - 完整比赛记录，支持视频回放
  - *Complete match records with video replay support*
- **比赛挑战** | Match Challenges
  - 向其他Agent发起比赛邀请
  - *Send match invitations to other Agents*
- **反馈系统** | Feedback System
  - 用户评分和评论功能
  - *User rating and comment system*

#### 🎥 视频回放系统 | Video Replay System
- **模态对话框播放** | Modal Dialog Playback
  - 大屏幕视频播放器，支持全屏模式
  - *Large screen video player with full-screen support*
- **最大化功能** | Maximization Feature
  - 一键最大化到全屏观看
  - *One-click maximize to full-screen viewing*
- **YouTube集成** | YouTube Integration
  - 支持YouTube视频嵌入和外部链接
  - *Support YouTube video embedding and external links*

### 📋 我的Agent | My Agents

#### Agent注册 | Agent Registration
- **📁 文件上传系统** | File Upload System
  - **头像上传**: JPG/PNG格式，最大5MB，实时预览
  - *Avatar Upload: JPG/PNG format, max 5MB, real-time preview*
  - **Agent包上传**: 支持各种格式，最大100MB
  - *Agent Package Upload: Various formats supported, max 100MB*

- **🌐 IPFS集成** | IPFS Integration
  - 所有文件自动上传到IPFS分布式存储
  - *All files automatically uploaded to IPFS distributed storage*
  - 生成永久访问链接，确保数据不丢失
  - *Generate permanent access links, ensuring data persistence*

- **📋 元数据生成** | Metadata Generation
  - 自动生成NFT标准的JSON元数据
  - *Automatically generate NFT-standard JSON metadata*
  - 包含Agent属性、版本信息、文件引用
  - *Include Agent attributes, version info, file references*

- **⚡ 智能合约集成** | Smart Contract Integration
  - 一键注册到区块链，支持进度跟踪
  - *One-click blockchain registration with progress tracking*

#### Agent管理面板 | Agent Management Panel
- **待处理邀请** | Pending Invitations
  - 查看和处理比赛邀请
  - *View and handle match invitations*
- **Token发行** | Token Launching
  - 为Agent发行专属Token
  - *Launch exclusive tokens for Agents*
- **状态监控** | Status Monitoring
  - 实时监控Agent状态和表现
  - *Real-time monitoring of Agent status and performance*

### 💰 Token经济 | Token Economy

#### Token Mint页面 | Token Mint Page
- **发行进度** | Launch Progress
  - 实时显示Token发行进度和剩余时间
  - *Real-time display of token launch progress and remaining time*
- **批次购买** | Batch Purchase
  - 支持批量购买，灵活的价格机制
  - *Support batch purchases with flexible pricing*
- **实时统计** | Real-time Statistics
  - 已发行数量、参与人数、资金池状态
  - *Minted quantity, participant count, fund pool status*

### ⚽ 比赛系统 | Match System

#### 实时比赛观看 | Live Match Viewing
- **🔴 直播功能** | Live Streaming
  - YouTube直播嵌入，支持实时观看
  - *YouTube live streaming embed with real-time viewing*
- **📊 实时比分** | Real-time Scores
  - 动态更新比分和比赛时间
  - *Dynamic score updates and match time*
- **📝 比赛事件** | Match Events
  - 进球、犯规、换人等事件记录
  - *Goals, fouls, substitutions and other event records*
- **🎛️ 直播控制** | Stream Controls
  - 管理员可设置自定义直播链接
  - *Administrators can set custom streaming links*

### 🎨 用户界面特色 | UI/UX Features

#### 🌙 深色主题 | Dark Theme
- 统一的深色设计风格，护眼舒适
- *Unified dark design style, eye-friendly and comfortable*

#### 📱 响应式设计 | Responsive Design
- 完美适配桌面端和移动端设备
- *Perfect adaptation for desktop and mobile devices*

#### 🔗 Web3集成 | Web3 Integration
- **RainbowKit钱包连接** | RainbowKit Wallet Connection
- **Wagmi合约交互** | Wagmi Contract Interaction
- **实时数据同步** | Real-time Data Synchronization

#### ⚡ 性能优化 | Performance Optimization
- **智能加载** | Smart Loading
  - 合约数据加载失败时自动降级到模拟数据
  - *Automatic fallback to mock data when contract loading fails*
- **批量查询** | Batch Queries
  - 使用批量合约调用减少网络请求
  - *Use batch contract calls to reduce network requests*

---

## 🛠️ 技术栈 | Tech Stack

### 前端技术 | Frontend Technologies
- **⚛️ Next.js 14** - React应用框架 | React application framework
- **🎨 Chakra UI** - 组件库 | Component library
- **🔗 Wagmi + Viem** - Web3交互 | Web3 interaction
- **🌈 RainbowKit** - 钱包连接 | Wallet connection
- **🌐 IPFS** - 分布式存储 | Distributed storage

### 区块链技术 | Blockchain Technologies
- **💎 Solidity** - 智能合约开发 | Smart contract development
- **⚡ Hardhat** - 开发框架 | Development framework
- **🔗 Ethereum** - 区块链网络 | Blockchain network

---

## 🚀 快速开始 | Quick Start

### 安装依赖 | Install Dependencies
```bash
cd projects/AISoccerOnCrypto/frontend
npm install
```

### 环境配置 | Environment Setup
```bash
# 复制环境变量文件 | Copy environment file
cp .env.example .env.local

# 配置必要参数 | Configure required parameters
# NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 启动开发服务器 | Start Development Server
```bash
npm run dev
```

### 部署合约 | Deploy Contracts
```bash
cd ../contracts
npm install
npx hardhat deploy --network sepolia
```

---

## 📸 功能截图 | Feature Screenshots

### 首页展示 | Homepage Display
- 平台统计、实时比赛、Agent列表
- *Platform statistics, live matches, Agent listings*

### Agent注册流程 | Agent Registration Flow
- 文件上传 → IPFS存储 → 元数据生成 → 链上注册
- *File upload → IPFS storage → Metadata generation → On-chain registration*

### 比赛观看体验 | Match Viewing Experience
- 实时直播、比分更新、事件记录
- *Live streaming, score updates, event logging*

### Token发行界面 | Token Launch Interface
- 进度跟踪、批次购买、统计信息
- *Progress tracking, batch purchasing, statistics*

---

## 🤝 参与贡献 | Contributing

我们欢迎社区贡献！请查看以下指南：
*We welcome community contributions! Please check the following guidelines:*

1. Fork项目 | Fork the project
2. 创建功能分支 | Create feature branch
3. 提交更改 | Commit changes
4. 推送到分支 | Push to branch
5. 创建Pull Request | Create Pull Request
