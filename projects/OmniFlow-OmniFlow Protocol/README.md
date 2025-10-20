# OmniFlow Protocol - ETHShanghai 2025

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：https://github.com/SJW1111011/OmniFlow-Protocol
- [x] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程
- [x] 在线演示链接（如有）：前端 Demo 或后端 API 文档
- [x] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本
- [ ] 可选材料：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：OmniFlow Protocol
- **一句话介绍**：基于AI驱动的智能账户抽象协议，让用户通过自然语言对话即可完成复杂的跨链交易和DeFi操作
- **目标用户**：
  - 🌟 **Web2用户**：希望无缝进入Web3世界的传统互联网用户
  - 🔰 **Web3新手**：对区块链技术感兴趣但被复杂操作劝退的新用户  
  - 💎 **DeFi老手**：追求更高效、更安全交易体验的资深用户
- **核心问题与动机（Pain Points）**：
  - 💸 **Gas费用复杂**：用户需要持有ETH支付Gas，增加使用门槛
  - 🔐 **私钥管理困难**：助记词丢失风险高，恢复机制不友好
  - 🌉 **跨链操作复杂**：需要理解不同协议、桥接风险、滑点等概念
  - 🤖 **交互门槛高**：复杂的DApp界面和参数设置让普通用户望而却步
- **解决方案（Solution）**：
  - 🧠 **AI智能助手**：通过自然语言理解用户意图，自动生成交易参数
  - 🔒 **智能账户抽象**：基于ERC-4337的社交恢复和Gas代付功能
  - 🌐 **智能跨链聚合**：集成多协议路由，自动选择最优路径和安全策略
  - 💡 **一键式体验**：用户只需描述需求，AI自动完成复杂的DeFi操作

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Chat UI    │    │  Smart Account  │    │ Cross-Chain     │
│                 │    │   (ERC-4337)    │    │   Aggregator    │
│ • 自然语言交互   │◄──►│ • 跨链交易      │◄──►│ • Li.Fi + Across│
│ • 智能表单生成   │    │ • Gas 代付      │    │ • 安全分析      │
│ • 交易预览      │    │ • 批量执行      │    │ • 路由拆分      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **关键模块**：
  - **前端**：React + Ant Design + ethers.js - AI聊天界面和智能表单
  - **后端**：Node.js + Express - AI意图解析和交易构建
  - **合约**：Solidity + Hardhat - 智能账户工厂和跨链聚合器
  - **AI集成**：阿里云通义千问 - 自然语言处理和交易参数生成
  - **账户抽象**：ERC-4337 + Etherspot SDK - 无Gas交易和社交恢复
  - **跨链协议**：Li.Fi + Across Protocol - 多协议路由聚合

- **依赖与技术栈**：
  - **前端**：React 18, Ant Design 5, ethers.js 5, RainbowKit, Wagmi
  - **后端**：Node.js 18, Express 5, ethers.js 6, JWT认证
  - **合约**：Solidity 0.8.27, Hardhat, OpenZeppelin, ERC-4337
  - **AI服务**：阿里云DashScope API, 通义千问大模型
  - **部署**：Sepolia测试网, Alchemy RPC, 本地Hardhat网络

### 3) 合约与部署 (Contracts & Deployment)

- **网络**：Sepolia 测试网 + 本地Hardhat网络
- **核心合约与地址**：
  ```
  # Sepolia 测试网
  EntryPoint (ERC-4337):           0x7A93344826CA3E410F8838E05C378d77f25aC0Ab
  SmartAccountFactory:             0x1d76001Bc2323Cccd4FdC8B1231e907F645AB765
  OmniFlowSmartAggregator:         0x2A13d17bD06FaA395a6b2A623c7b27AAfC9B6341
  
  # 本地网络 (开发测试)
  EntryPoint:                      0x5FbDB2315678afecb367f032d93F642f64180aa3
  SmartAccountFactory:             0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  MockERC20:                       0xDc64a140Aa3E981100a9becC4E685f962f0cF6C9
  ```
- **验证链接（Etherscan）**：
  - [SmartAccountFactory](https://sepolia.etherscan.io/address/0x1d76001Bc2323Cccd4FdC8B1231e907F645AB765)
  - [EntryPoint](https://sepolia.etherscan.io/address/0x7A93344826CA3E410F8838E05C378d77f25aC0Ab)
- **最小复现脚本**：
  ```bash
  # 部署到本地网络
  cd contracts
  npx hardhat node
  npx hardhat run scripts/deploy.js --network localhost
  
  # 部署到Sepolia
  npx hardhat run scripts/deploy.js --network sepolia
  ```

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Node.js 18+, npm/yarn, Git
- **环境变量样例**：

```bash
# contracts/.env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0x...

# backend/.env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key
RPC_URL=http://localhost:8545
CHAIN_ID=31337

# front/.env
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_DASHSCOPE_API_KEY=sk-...
REACT_APP_DEFAULT_CHAIN_ID=31337
```

- **一键启动（本地示例）**：

```bash
# 1. 克隆项目
git clone <repository-url>
cd zhineng

# 2. 启动本地区块链网络
cd contracts
npm install
npx hardhat node

# 3. 部署合约（新终端）
npx hardhat run scripts/deploy.js --network localhost

# 4. 启动后端服务（新终端）
cd ../backend
npm install
npm run dev

# 5. 启动前端应用（新终端）
cd ../front
npm install
npm start

# 6. 打开浏览器访问 http://localhost:3000
```

- **在线 Demo**：[部署后提供链接]
- **测试账号说明**：使用MetaMask连接Sepolia测试网，需要测试ETH

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：[录制完成后提供]
- **关键用例步骤**：
  - **用例 1：AI驱动的跨链转账**
    1. 用户输入："我想把100 USDC从以太坊转到Polygon"
    2. AI解析意图并生成智能表单，显示最优路由和费用预估
    3. 用户确认后，智能账户自动执行跨链交易
  - **用例 2：无Gas费交易体验**
    1. 新用户创建智能账户，设置社交恢复守护者
    2. 使用Paymaster代付Gas费，用USDC支付交易费用
    3. 批量执行多笔交易，享受Gas优化
  - **用例 3：智能DeFi操作**
    1. 用户说："帮我在Uniswap上用ETH买一些LINK"
    2. AI自动计算滑点、选择最佳交易时机
    3. 智能合约执行DEX交易，并提供详细的执行报告

### 6) 可验证边界 (Verifiable Scope)

- **完全开源模块**：
  - ✅ 智能合约代码（Solidity）
  - ✅ 前端应用代码（React）
  - ✅ 后端API服务（Node.js）
  - ✅ 部署脚本和配置文件
- **第三方依赖**：
  - 🔗 阿里云通义千问API（需要API Key）
  - 🔗 Alchemy RPC服务（需要API Key）
  - 🔗 Li.Fi和Across协议（公开接口）

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1-3 周**：
  - 🚀 主网部署和安全审计
  - 📱 移动端PWA应用开发
  - 🤝 与更多DeFi协议集成
- **赛后 1-3 个月**：
  - 🌍 支持更多Layer2网络（Arbitrum、Optimism、Base）
  - 🎯 AI策略优化，支持更复杂的DeFi组合操作
  - 👥 社区治理和DAO机制建设
- **预期对以太坊生态的价值**：
  - 💡 **降低准入门槛**：让Web2用户无缝进入Web3世界
  - 🔄 **提升交易效率**：通过AI和账户抽象优化用户体验
  - 🌐 **促进跨链互操作**：安全、智能的多链资产管理
  - 🚀 **推动Mass Adoption**：为以太坊生态带来更多主流用户

### 8) 团队与联系 (Team & Contacts)

- **团队名**：OmniFlow Protocol Team
- **成员与分工**：
  - **技术负责人** - 全栈开发 - 智能合约、后端API、前端集成
  - **产品经理** - 产品设计 - AI交互设计、用户体验优化
  - **区块链工程师** - 基础设施 - ERC-4337集成、跨链协议对接
- **联系方式**：
  - 📧 Email: team@omniflow.protocol
  - 💬 Telegram: @OmniFlowProtocol
  - 🐦 Twitter: @OmniFlowDeFi
- **可演示时段**：北京时间 9:00-22:00 (UTC+8)

## 三、快速自检清单 (Submission Checklist)

- [x] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [x] 本地可一键运行，关键用例可复现
- [x] 测试网合约地址与验证链接已提供
- [ ] Demo 视频（≤3 分钟，中文）链接可访问
- [x] 如未完全开源，已在"可验证边界"清晰说明
- [x] 联系方式与可演示时段已填写

---

**🎯 OmniFlow Protocol - 让AI成为你的Web3入口，让复杂的DeFi操作变得像聊天一样简单！**
