# AquaFlux 项目文档中心

> **结构化RWA三代币协议** — 将RWA分拆为可组合的DeFi产品  
> ETHShanghai 2025 Hackathon

---

## 🚀 快速入口

<table>
<tr>
<td width="50%">

### 📘 新手入门
- **[快速开始 →](../deployments/QUICK_START.md)**  
  5分钟部署并体验完整流程
  
- **[常见问题 →](./FAQ.md)**  
  25+个高频问题解答

</td>
<td width="50%">

### 🏗️ 深入了解
- **[技术架构 →](./ARCHITECTURE.md)**  
  深度解析合约设计与数据流
  
- **[项目概览 →](../README.md)**  
  返回项目主页

</td>
</tr>
</table>

---

## 📖 文档导航

### 🎯 快速了解

- **项目概述**: 请阅读 [根目录 README](../README.md)
- **核心概念**: P/C/S 三代币模型 — 将一份RWA底层资产通过金融工程拆分为本金（Principal）、票息（Coupon）、首损保护（Shield）三个独立交易的代币
- **技术亮点**: 
  - ✅ 时间锁治理 + 角色权限管理
  - ✅ 完整生命周期管理（注册→验证→包裹→分拆→到期分配）
  - ✅ 内置费用计提与收益分配机制
  - ✅ 前后端完整集成

---

## 🏗️ 技术文档

### 1️⃣ 智能合约 (Contracts)

**📂 路径**: [`../contracts/`](../contracts/)  
**📄 详细文档**: [Contracts README](../contracts/README.md)

**核心内容**:
- ✅ `AquaFluxCore.sol` - 核心协议逻辑 (UUPS可升级)
- ✅ `TokenFactory.sol` - EIP-1167代理工厂，批量部署P/C/S代币
- ✅ `AqToken/PToken/CToken/SToken` - 四类ERC-20代币实现
- ✅ `AquaFluxTimelock.sol` - 时间锁治理
- ✅ 完整的生命周期状态机与安全约束

**快速命令**:
```bash
cd contracts
pnpm install
pnpm compile
pnpm test                    # 运行测试套件
pnpm hardhat run scripts/deploy/deploy-all.ts --network sepolia
```

**关键特性**:
- 🔐 多角色权限控制 (Admin/Timelock/Verifier/Operator)
- 💰 灵活的费用计提机制 (wrap/split/merge/unwrap)
- 📊 到期分配与收益领取
- ⏱️ 交易截止日期与操作窗口管理

---

### 2️⃣ 后端服务 (Backend)

**📂 路径**: [`../backend/`](../backend/)  
**📄 详细文档**: [Backend README](../backend/README.md)

**技术栈**:
- Express + TypeScript
- Prisma ORM + PostgreSQL
- JWT 认证 + Redis 缓存
- 依赖注入 (TSyringe)

**核心功能**:
- 📡 资产管理 API (列表、详情、筛选)
- 🔄 结构化操作接口 (split/merge监听)
- 📊 投资组合数据聚合
- 🔐 用户认证与权限管理

---

### 3️⃣ 前端应用 (Frontend)

**📂 路径**: [`../frontend/`](../frontend/)  
**📄 文档**: 查看 `frontend/` 目录下的README

**技术栈**:
- React + Vite
- Wagmi + Viem (Web3交互)
- TailwindCSS (样式)
- Recharts (图表可视化)

**核心页面**:
- 🏠 **Markets**: 浏览所有RWA资产及P/C/S代币市场
- 💼 **Portfolio**: 用户持仓与收益跟踪
- 🔀 **Swap**: DEX交易界面 (Uniswap V3集成)
- 🏗️ **Structure**: Split/Merge操作界面

**快速启动**:
```bash
cd frontend
npm install
npm run dev                   # 开发模式 (localhost:5173)
npm run build                 # 生产构建
```

---

## 🚀 完整部署流程

### Step 1: 部署智能合约
```bash
cd contracts
pnpm hardhat run scripts/deploy/deploy-all.ts --network sepolia
# 会生成 scripts/deploy/addresses.json
```

### Step 2: 启动后端服务
```bash
cd backend
cp .env.example .env          # 配置环境变量
docker-compose up -d
pnpm prisma:migrate
pnpm dev
```

### Step 3: 启动前端
```bash
cd frontend
# 更新 src/constants/addresses.ts (使用Step 1的合约地址)
npm run dev
```

### Step 4: 演示流程
1. **注册资产**: 调用 `AquaFluxCore.register()`
2. **验证资产**: 由 Verifier 角色调用 `verify()`
3. **包裹资产**: 用户调用 `wrap()` 将底层资产换为AqToken
4. **分拆代币**: 调用 `split()` 将AqToken分拆为P/C/S (1:1:1)
5. **交易/转让**: P/C/S代币可在DEX自由交易
6. **合并代币**: 调用 `merge()` 将P/C/S合并回AqToken
7. **解包资产**: 调用 `unwrap()` 赎回底层资产
8. **到期流程**: 
   - `withdrawForRedemption()` - 提取底层资产进行线下兑付
   - `setDistributionConfig()` - 配置分配代币与资金池
   - `setDistributionPlan()` - 设定P/C/S分配比例
   - `claimMaturityReward()` - 用户领取到期收益

---

## 📊 架构图

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend dApp                        │
│  (React + Wagmi + Viem)                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Markets  │ │Portfolio │ │   Swap   │ │Structure │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└──────────────────┬──────────────────────────┬───────────────┘
                   │                          │
         ┌─────────▼──────────┐    ┌─────────▼──────────┐
         │   Backend API      │    │  Smart Contracts   │
         │   (Express + TS)   │    │   (Solidity)       │
         │                    │    │                    │
         │ • Asset APIs       │    │ • AquaFluxCore    │
         │ • Market Data      │    │ • TokenFactory     │
         │ • Portfolio        │    │ • P/C/S Tokens    │
         │ • Authentication   │    │ • Timelock Gov    │
         └─────────┬──────────┘    └─────────┬──────────┘
                   │                          │
         ┌─────────▼──────────┐    ┌─────────▼──────────┐
         │    PostgreSQL      │    │    Blockchain      │
         │  (Prisma ORM)     │    │  (Sepolia/Mainnet) │
         └────────────────────┘    └────────────────────┘
```

### 代币流转图

```
Underlying Asset (USDC/USDT/RWA)
         │
         │ wrap()
         ▼
    AqToken (Wrapped)
         │
         │ split()
         ▼
    ┌────┴────┐
    │         │         │
 P-Token   C-Token   S-Token
 (本金)    (票息)   (首损保护)
    │         │         │
    │   可在DEX/AMM交易  │
    │         │         │
    └────┬────┘
         │ merge()
         ▼
    AqToken (Wrapped)
         │
         │ unwrap()
         ▼
Underlying Asset (Redeemed)
```

---

## 🔐 安全性

- ✅ **重入保护**: 使用 `ReentrancyGuard`
- ✅ **权限控制**: `AccessControl` 多角色管理
- ✅ **安全转账**: `SafeERC20` 包装
- ✅ **暂停机制**: 全局/单资产级别的紧急暂停
- ✅ **升级治理**: UUPS可升级 + Timelock时间锁
- ✅ **输入验证**: 严格的参数校验与边界检查
- ✅ **费用上限**: 所有费率限制在 ≤100% (10000 bps)

**⚠️ 黑客松免责声明**: 
- 本项目为概念验证，未经审计
- 仅用于测试网环境
- 不构成投资建议

---

## 🧪 测试

### 合约测试
```bash
cd contracts
pnpm test                      # 运行所有测试
pnpm test test/basic.test.js   # 运行单个测试
pnpm coverage                  # 测试覆盖率报告
```

**测试覆盖**:
- ✅ Split/Merge不变式验证
- ✅ 完整生命周期流程测试
- ✅ 时间锁治理测试
- ✅ 权限控制测试
- ✅ 费用计提与提取测试
- ✅ 到期分配测试

---

## 📦 项目结构速查

```
AquaFlux/
├── contracts/           # Solidity智能合约
│   ├── core/           # 核心协议逻辑
│   ├── token/          # P/C/S代币实现
│   ├── governance/     # 时间锁治理
│   └── test/           # 测试文件
├── backend/            # Node.js后端服务
│   ├── src/
│   │   ├── modules/    # 业务模块
│   │   ├── middlewares/ # 中间件
│   │   └── lib/        # 工具库
│   └── prisma/         # 数据库模型
├── frontend/           # React前端应用
│   ├── src/
│   │   ├── pages/      # 页面组件
│   │   ├── components/ # UI组件
│   │   ├── hooks/      # 自定义Hooks
│   │   └── api/        # API接口
│   └── public/         # 静态资源
├── docs/               # 📍 你在这里
└── README.md           # 项目主README
```

---

## 🎯 黑客松评审要点

### 创新性
- ✅ **独创的三代币模型**: 将RWA拆分为可独立交易的风险/收益层级
- ✅ **时间维度金融产品**: 引入到期日与操作窗口概念
- ✅ **首损保护机制**: S-Token持有者享受费用激励同时承担首损

### 完整性
- ✅ 合约已部署到Sepolia测试网
- ✅ 前后端完整集成
- ✅ 完善的权限管理与治理机制
- ✅ 详细的测试覆盖

### 技术深度
- ✅ UUPS可升级合约模式
- ✅ EIP-1167最小代理工厂
- ✅ 复杂的费用会计系统
- ✅ 状态机驱动的生命周期管理

### 可用性
- ✅ 直观的前端交互界面
- ✅ 完整的API文档
- ✅ 清晰的部署脚本

---

## 📞 联系方式

- **Team**: AquaFlux
- **Email**: hi@aquaflux.pro
- **GitHub**: [项目仓库链接]

---

## 📄 许可证

MIT License © 2025 AquaFlux Contributors

---

**为评审准备的快速链接**:
- 📝 [合约详细文档](../contracts/README.md)
- 🔧 [后端API文档](../backend/README.md)
- 🎨 [前端使用说明](../frontend/)
- 🚀 [部署地址](../contracts/scripts/deploy/addresses.json)

