# AquaFlux — Structured RWA Protocol

> ETHShanghai 2025 Hackathon Project

---

## 1) 项目概述 (Overview)

**项目名称**: AquaFlux

**一句话介绍**: AquaFlux是一个专注于RWA赛道的创新DeFi协议，通过其独特的三代币模型将债券等传统金融资产在链上拆分和重构，构建全新的时间维度金融产品。

**目标用户**:
- DeFi 投资者（寻求不同风险收益配置）
- RWA 发行方（债券、票据、应收账款代币化等）
- 机构投资者（需要风险分层的固定收益产品）

**核心问题与动机**:
- 链上缺乏成熟的结构化金融工具
- 传统 RWA 产品流动性差，无法拆分交易
- 固定收益投资者无法自由选择风险偏好（保本 vs 高收益）

**解决方案**:
通过 **三代币模型 (P/C/S)** 将一份 RWA 拆分为:
- **P-Token (本金层)**: 保本型，到期优先兑付
- **C-Token (票息层)**: 收益型，享受利息分配
- **S-Token (首损层)**: 风险型，承担首损换取费用激励

**核心公式**: `1 RWA = 1 AqToken = 1P + 1C + 1S`

---

## 2) 架构与实现 (Architecture & Implementation)

**系统架构图**: [查看详细架构文档](./docs/ARCHITECTURE.md)

```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│  Markets | Portfolio | Swap | Structure │
└────────────┬────────────────────┬────────┘
             │                    │
    ┌────────▼────────┐  ┌────────▼─────────┐
    │  Backend API    │  │ Smart Contracts  │
    │  Express + TS   │  │   Solidity       │
    │  PostgreSQL     │  │   Sepolia        │
    └─────────────────┘  └──────────────────┘
```

**关键模块**:

**前端**:
- React 18 + Vite
- Wagmi v2 + Viem (Web3 交互)
- TailwindCSS (样式)
- Recharts (数据可视化)

**后端**:
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- JWT 认证 + Redis 缓存
- RESTful API 设计

**合约**:
- Solidity 0.8.24 (Hardhat)
- UUPS 可升级代理模式
- EIP-1167 最小代理工厂
- OpenZeppelin 安全库

**其他**:
- 时间锁治理 (Timelock)
- 多角色权限控制 (AccessControl)
- 事件驱动架构

**依赖与技术栈**:
```json
{
  "frontend": ["React", "Vite", "Wagmi", "Viem", "TailwindCSS"],
  "backend": ["Express", "TypeScript", "Prisma", "PostgreSQL", "Redis"],
  "contracts": ["Solidity", "Hardhat", "OpenZeppelin", "EIP-1167"],
  "deployment": ["Sepolia", "Docker", "PM2"]
}
```

---

## 3) 合约与最终部署 (Contracts & Deployment)

**网络**: Sepolia 测试网

**核心合约与地址**: [查看完整部署信息](./deployments/Sepolia_Deployments.json)

| 合约名称 | 地址 | 说明 |
|---------|------|------|
| AquaFluxCore | `0x84b5dCcE1b204153E05bA8DBEe3a340E78C5bC79` | 核心协议逻辑 (UUPS) |
| TokenFactory | `0x3c2efAE52D159a8871931CAC4754f235788c49af` | 代币工厂 (EIP-1167) |
| AquaFluxTimelock | `0x1c77122bD2635367792B06592d540e1BCd14F7e2` | 时间锁治理 |

**验证链接**: 
- [AquaFluxCore on Etherscan](https://sepolia.etherscan.io/address/0x84b5dCcE1b204153E05bA8DBEe3a340E78C5bC79)
- [TokenFactory on Etherscan](https://sepolia.etherscan.io/address/0x3c2efAE52D159a8871931CAC4754f235788c49af)

**部署脚本**:
```bash
# 安装依赖
cd contracts
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env: ALCHEMY_API_KEY, TEST_PRIVATE_KEY, ETHERSCAN_API_KEY

# 一键部署所有合约
pnpm hardhat run scripts/deploy/deploy-all.ts --network sepolia

# 运行测试
pnpm hardhat test
```

**测试覆盖**:
- Split/Merge 1:1:1 不变性
- 费用计提与提取
- 到期分配与领取
- 权限控制
- 完整生命周期测试

---

## 4) 运行与复现 (Run & Reproduce)

**前置要求**: 
- Node.js 18+
- pnpm 8+
- Docker (用于后端数据库)
- Git

**环境变量配置**:

```bash
# contracts/.env
ALCHEMY_API_KEY=your_alchemy_key
TEST_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=your_etherscan_key

# backend/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aquaflux_dev"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-min-32-chars"
PORT=3001

# frontend/.env (可选，默认连接 Sepolia)
VITE_ENABLE_TESTNETS=true
```

**一键启动 (本地模式)**:

```bash
# 1. 克隆仓库
git clone <repo-url>
cd projects/AquaFlux

# 2. 启动后端服务
cd backend
pnpm install
docker-compose up -d          # 启动 PostgreSQL + Redis
pnpm prisma:migrate           # 数据库迁移
pnpm dev                      # 后端运行在 :3001

# 3. 启动前端 (新终端)
cd ../frontend
npm install
npm run dev                   # 前端运行在 :5173

```

**在线 Demo**: 
- 前端: [https://hackthon.aquaflux.pro/](https://hackthon.aquaflux.pro/)
- 使用钱包连接 Sepolia 测试网

---

## 5) Demo 与关键用例 (Demo & Key Flows)

**演示视频**: [观看 3 分钟演示](https://meeting.tencent.com/cw/NgkwR7PXb6)

**关键用例步骤**:

**用例 1: 资产拆分 (Split)**
1. 用户授权 RWA 给 AquaFluxCore
2. 调用 `wrap()` 获得 100 AqToken
3. 调用 `split()` 将 AqToken 拆分为 100 P + 100 C + 100 S
4. 三类代币可在 DEX 独立交易

**用例 2: 风险定制交易**
1. 保守投资者: 在 Uniswap 出售 C/S，只持有 P (保本)
2. 收益追求者: 买入额外的 C-Token (加倍票息)
3. 风险偏好者: 买入额外的 S-Token (费用激励 + 杠杆收益)

**用例 3: 到期分配与领取**
1. 到达 `operationDeadline` 后，协议暂停交易
2. 管理员调用 `withdrawForRedemption()` 提取底层资产
3. 设置分配方案: `setDistributionPlan(80% → P, 15% → C, 5%+2% → S)`
4. 用户调用 `claimMaturityReward()` 领取收益，代币自动销毁

**用例 4: 合并与赎回 (Merge & Unwrap)**
1. 用户持有等量的 P/C/S 代币
2. 调用 `merge()` 合并回 AqToken
3. 调用 `unwrap()` 赎回底层 USDC

---

## 6) 可验证边界 (Verifiable Scope)

**完全开源且可验证的模块**:
- 智能合约源码 (contracts/)
- 前端应用源码 (frontend/)
- 后端 API 源码 (backend/)
- 部署脚本 (contracts/scripts/)
- 测试套件 (contracts/test/)

**已部署并可在线验证**:
- Sepolia 测试网合约 (已在 Etherscan 验证)
- 前端 dApp (可本地运行或访问在线 Demo)
- 后端 API (可本地 Docker 启动)

**暂不公开的部分**: 
- 无

**验证方式**:
1. 克隆仓库并按照 [运行与复现](#4-运行与复现-run--reproduce) 本地启动
2. 访问 Sepolia Etherscan 
3. 查看 [完整文档](./docs/README.md) 了解技术细节

---

## 7) 路线图与影响 (Roadmap & Impact)

**赛后 1-3 周**:
- 完善前端 UI/UX
- 完善安全性测试

**赛后 1-3 个月**:
- 寻求专业审计
- 部署到 Pharos/Plume 等 Layer2
- 对接真实 RWA 发行方 (债券/票据)
- 集成 Uniswap V3 流动性池

**长期价值 (6-12 个月)**:
- 推动 RWA 在以太坊生态的标准化与流动性
- 为机构投资者提供合规的链上风险管理工具
- 探索与 MakerDAO、Compound 等协议的集成

**预期对以太坊生态的价值**:
- **创新**: RWA结构化协议，开创全新的结构化RWA市场
- **可组合性**: P/C/S 代币可与现有 DeFi 乐高自由组合
- **流动性**: 将数万亿美元的传统金融资产引入 DeFi

---

## 8) 团队与联系 (Team & Contacts)

**团队名**: AquaFlux

**成员与分工**:
- Yole - 产品 + 智能合约
- Alex - 合约 + 后端 
- Leon - 前端 + UX
- Aaron - 合约 + 后端

**联系方式**:
- Email: hi@aquaflux.pro
- WeChat: 1547621
- GitHub: [项目仓库](https://github.com/AquafluxPro/ETHShanghai-2025/tree/main/projects/AquaFlux)

**可演示时段**: 
- 北京时间 UTC+8: 10:00 - 22:00 (工作日)
- 周末全天可安排

---

## 附录: 文档导航

**快速开始**: [5 分钟部署指南](./deployments/QUICK_START.md)  
**技术架构**: [深度架构文档](./docs/ARCHITECTURE.md)  
**常见问题**: [FAQ 文档](./docs/FAQ.md)  
**合约详情**: [Contracts README](./contracts/README.md)  
**后端 API**: [Backend README](./backend/README.md)  

---

## License

MIT License © 2025 AquaFlux Contributors

---

**ETHShanghai 2025 Hackathon Submission**  
Last Updated: 2025-10-20