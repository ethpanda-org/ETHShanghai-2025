# [Predmoon] - ETHShanghai 2025


## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：包含完整代码与本 README
- [ ] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程
- [x] 在线演示链接（如有）：前端 Demo 或后端 API 文档
- [x] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本
- [x] 可选材料：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：Predmoon
- **一句话介绍**：A prediction market platform that users could trade by their belifs and knowledges
- **目标用户**：All crypto users
- **核心问题与动机（Pain Points）**：Monetizing Beliefs and getting collective wisdom based on blockchain
- **解决方案（Solution）**：We developed Predmoon using a combination of smart contracts, Vue, Supabase, and Privy to let users trade their knowledge on-chain. The platform operates like Tinder: swiping left or right corresponds to a YES/NO transaction, and users can earn a profit.

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：[![structure](https://raw.githubusercontent.com/TuringM-Labs/TuringM/main/assets/flow.jpg)]
- **关键模块**：
  - 前端：滑动交易系统/嵌入式钱包/跨链转账集成等
  - 后端：链下订单撮合/混合去中心化交易所模型
  - 合约：跨链桥技术/高效交易结算/去中心化安全/生态兼容性等
  - 其他：自研大型語言模型（LLM）
- **依赖与技术栈**：
  - 前端：Vue/Nuxt.js, ethers.js, Tailwind CSS, Privy.js
  - 后端：Node.js, Supabase, PostgreSQL
  - 合约：Solidity, Hardhat
  - 部署：Vercel, AWS, Sepolia 测试网

### 3) 合约与部署 (Contracts & Deployment)（如有）

- **网络**：Sepolia 测试网
- **核心合约与地址**：
  ```
  ContractName: PredMoonApp https://sepolia.etherscan.io/address/0xfa8472996347B8636f7Cf969F775c200A7d6c259
  ```
- **验证链接（Etherscan/BlockScout）**：https://repo.sourcify.dev/11155111/0xfa8472996347B8636f7Cf969F775c200A7d6c259


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

- **在线 Demo（如有）**：pred.wtf
- **账号与测试说明（如需要）**：register by your own email

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：[视频链接]
- **关键用例步骤（2-4 个要点）**：
  - 用例 1：Login module with Privy(embed wallet)
  - 用例 2：Deposit through multi-chain
  - 用例 3：Trade module

### 6) 可验证边界 (Verifiable Scope)
商业应用原因，无法提供完整的系统代码

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1-3 周**：完成页面与系统性能的持续优化，提升用户体验与市场稳定性。
- **赛后 1-3 个月**：通过冷启动运营与社区激励计划推动用户增长；
 开展多轮营销活动提升品牌曝光与预测市场流动性；
 逐步开启 PredSeed 融资计划，为后续产品扩展与生态建设提供资金支持。
- **预期对以太坊生态的价值**：成为 以太坊生态中首个华语预测市场项目，以特色风格创新用户体验，助力全球预测市场的多元化发展。

### 8) 团队与联系 (Team & Contacts)

- **团队名**：[帝景苑8号10层泳池维护团队]
- **成员与分工**：
  - Adam Ma – Founder
  Adam has extensive experience in both Web2 and Web3 entrepreneurship, as well as years of experience at major tech companies including 360, RC, and iHealth. He has won 20+ global hackathon awards and previously founded a sneaker marketplace with millions in transaction volume, as well as Web3 RWA projects. Notably, he has executed a user cold-start of 5,000+ users in a single day.
  - KK – Co-founder
  KK graduated from HKUST and brings extensive development experience, including years at Tsinghua Research Institute, combined with strong social and creative insight. He leads product design, social media, and brand strategy, and has deep experience with AI tools and innovative product ideation.
  - Ben – Co-founder
  Ben graduated from Shanghai University and has 9 years of solid front-end development experience. He previously worked at Citibank Singapore HQ, specializing in React and Vue development.
  - Other core team members
  Our team consists of 10+ talented professionals, covering development, design, community, and marketing. Together, we bring a balanced mix of technical expertise, creative vision, and operational experience to build PredMoon.
- **联系方式（Email/TG/X）**：b@pred.wtf
- **可演示时段（时区）**：free

