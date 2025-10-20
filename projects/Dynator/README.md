# [项目名称] - ETHShanghai 2025

> 请按照以下模板填写你的项目信息

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：包含完整代码与本 README
- [x] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程
- [ ] 在线演示链接（如有）：前端 Demo 或后端 API 文档
- [x] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本
- [x] 可选材料：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：Dynator - AI-Powered Perp DEX Trading System
- **一句话介绍**：集成AI智能助手的专业级Dex Perp交易系统，提供强大的市场分析能力，支持多种交易策略和AI自动化策略执行。
- **目标用户**：加密货币交易者、专业投资者、对冲基金和机构投资者
- **核心问题与动机（Pain Points）**：现有的Dex Perp缺少专业易用的自动化交易工具，并且鲜有AI系统能够支持Dex Perp交易。
- **解决方案（Solution）**：Dynator提供策略生成、市场分析、风险管理和自动化交易执行的全套解决方案，支持多种交易策略，能够在Hyperliquid和Aster等去中心化交易所进行AI交易。

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：[系统架构图链接]
- **关键模块** ：
  - 前端：Next.js 15 + React 19 + TypeScript现代化Web应用
  - 后端：FastAPI + Python 3.12高性能异步API服务
  - 合约：Solidity智能合约，支持EIP-7702的订阅服务
  - AI代理：OpenAI GPT-4 + LangChain智能策略生成和市场分析
- **依赖与技术栈**：
  - 前端：Next.js 15, React 19, TypeScript, Tailwind CSS 4, Radix UI, wagmi, RainbowKit
  - 后端：FastAPI 0.100+, Python 3.12+, PostgreSQL 14+, Redis 7+, Celery, SQLAlchemy 2.0
  - AI集成：OpenAI GPT-4, LangChain, TA-Lib技术分析库
  - 合约：Solidity ^0.8.19, Foundry, OpenZeppelin, Chainlink Automation
  - 部署：Docker, K8s, Vercel (前端), Sepolia测试网/以太坊主网

### 3) 合约与部署 (Contracts & Deployment)（如有）

- **网络**：Sepolia 测试网（可升级到以太坊主网）

- **核心合约与地址**：

```text
SubscriptionService: [待部署后填写合约地址]
```

- **验证链接（Etherscan/BlockScout）**：[验证链接](https://sepolia.etherscan.io/address/0xb7505213f87f4ee854a29a7b39fed51792f027e7)
- **最小复现脚本**：

```bash
# 部署合约到Sepolia测试网
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify

  # 本地开发环境部署
  forge script script/Deploy.s.sol --rpc-url anvil --broadcast

  # 运行合约测试
  forge test

  # 合约格式化
  forge fmt

  # 气体消耗快照
  forge snapshot
  ```

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Node 20+, pnpm 9+, Python 3.12+, PostgreSQL 14+, Redis 7+, Git
- **环境变量样例**：

```bash
# 前端环境变量 (.env.local)
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_DEFAULT_CHAIN=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# 后端环境变量 (.env)
DB_URL=postgresql+psycopg://postgres:password@localhost:5432/dynator
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-char-encryption-key
OPENAI_API_KEY=your-openai-api-key

# 交易所凭证（可选，用于真实交易测试）
HYPERLIQUID_PRIVATE_KEY=0x...
ASTER_API_KEY=your-aster-api-key
ASTER_API_SECRET=your-aster-api-secret
```

- **一键启动（本地示例）**：

```bash
# 克隆项目
git clone https://github.com/veithly/Dynator_ETHShanghai.git
cd Dynator_ETHShanghai

# 安装前端依赖
cd frontend && pnpm install && cd ..

# 安装后端依赖
cd backend && uv sync && cd ..

# 启动后端服务（新终端）
cd backend && uv run python start.py

# 启动前端开发服务器（新终端）
cd frontend && pnpm dev

# 启动Worker进程（新终端，可选）
cd backend && uv run celery -A apps.worker.celery_app worker --loglevel=info

# 访问应用：http://localhost:3000
```

- **在线 Demo（如有）**：[部署后提供Demo链接]
- **账号与测试说明（如需要）**：[如需要测试账号，请联系团队成员]

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：[视频链接](https://drive.google.com/drive/folders/1M2k3LYHLBZYLSG2K4bg9fTkknhB1ruxc?usp=sharing)
- **Pitch Deck**：[Pitch Deck](https://drive.google.com/drive/folders/1M2k3LYHLBZYLSG2K4bg9fTkknhB1ruxc?usp=sharing)
- **关键用例步骤（2-4 个要点）**：
  - **AI策略生成**：用户描述交易意图（如"在BTC 40k-50k区间做网格交易"），AI助手自动生成完整的策略参数并提供技术分析依据
  - **智能风险管理**：系统实时监控持仓风险，自动触发止损或减仓，结合11种风控规则保护用户资金安全
  - **多交易所集成**：无缝连接Hyperliquid和Aster交易所，支持钱包签名认证和API密钥双重认证模式
  - **实时盈亏监控**：WebSocket实时推送交易数据，用户可通过仪表板查看总资产、今日盈亏和策略表现排行

### 6) 可验证边界 (Verifiable Scope)

- **完全开源项目，所有核心功能均可复现**：
  - **前端完整开源**：Next.js应用、UI组件、Web3集成代码全部公开
  - **后端完整开源**：FastAPI服务、AI集成、交易引擎、风险管理模块全部公开
  - **智能合约开源**：SubscriptionService合约，支持EIP-7702的订阅功能完整开源
  - **部署配置公开**：Docker、K8s部署配置和CI/CD流水线完整公开
  - **文档完整公开**：技术文档、API文档、使用指南全部公开

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1-3 周**：完成前端界面优化，集成实时图表展示，完善用户体验细节
- **赛后 1-3 个月**：上线多语言支持，扩展更多交易所集成，支持跨链交易功能
- **预期对以太坊生态的价值**：
  - **降低交易门槛**：AI助手让普通用户也能制定专业交易策略
  - **提升资金效率**：智能风险管理和自动化执行减少人为失误
  - **促进生态发展**：开源技术栈可被其他项目复用，推动DeFi创新
  - **普及区块链技术**：直观的Web3界面降低用户使用门槛，吸引更多用户进入加密领域

### 8) 团队与联系 (Team & Contacts)

- **团队名**：Dynator Team
- **成员与分工**：
  - Ricky - 全栈工程师 - AI开发、系统架构、项目协调
  - Yeyu - 前端 - 前端开发、UI设计、用户体验优化
  - YaCo - 合约 - 合约开发、部署、测试
- **联系方式（Email/TG/X）**：
  - Email: veithly@live.com
  - Telegram: rickyeacc
  - GitHub: <https://github.com/veithly>
- **可演示时段（时区）**：UTC+8 (北京时间)，工作日 14:00-18:00

