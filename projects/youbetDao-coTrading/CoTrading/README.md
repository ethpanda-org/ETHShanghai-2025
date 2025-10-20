# CoTrading

## 项目概述与目标

Your AI Copilot for Smarter Crypto Trading

# 一句话说明
> CoTrading 通过理解你的交易偏好结合链上数据、舆情数据、技术分析，通过多智能体协作，带来交易工作流新范式，提供实时、可分析、可解释的交易建议。

## 目标
- 个性化投研与策略共创，提升决策速度与质量
- 多源数据融合与可解释洞见，强化市场把握
- 策略实时协同与自动化执行接口，缩短从想法到落地
- 风险识别/预警与仓位建议，守住风控边界
- 可视化与可追溯记录，沉淀方法论

## 目标用户
- 专业/半专业加密交易员（手动或半自动执行）
- 量化/策略研究员与工程师（研究、回测、迭代策略）
- 做市/套利/流动性管理等团队型交易者
- 需要输出可追溯观点与洞见的投研/社区运营者

## 核心问题与动机（Pain Points）
- 工具割裂与频繁上下文切换（终端、数据面板、脚本、笔记）
- 数据分散与时效不一（CEX/DEX/链上）难以对齐、解释与决策
- 策略从构想到执行路径长、复用差，回测与跟踪成本高
- 风险监控薄弱，难以量化暴露、及时预警与落地风控
- 决策过程不可追溯，难以形成可复用的方法论沉淀

## 解决方案（Solution）
- 多智能体 SubAgents（链上/情绪/量化/技术/风险）协同生成多视角、可执行洞见
- 交易原生 UX：交互式 K 线、仪表盘与分析画布嵌入工作流，减少摩擦
- 个性化学习：基于偏好与历史交互输出定制化策略/提示，持续自适应
- 实时且可解释：关键因子、假设与置信度可追溯，支持复盘与审计
- 自动化接口：连接交易所与钱包，支持半自动执行与风控守护
 - 协作与沉淀：以 Artifacts 将研究—回测—执行—复盘全链路串联

## 集成与数据源
- 钱包与链：MetaMask、Rainbow、OKX Wallet（通过 RainbowKit + wagmi）
- 支持链：Ethereum、Base、Arbitrum、Optimism（可按需扩展；通过 viem 读取链上数据）
- DEX/链上：聚焦 EVM 生态；价格/交易/池子数据可通过链上调用或子图（Subgraph）获取（数据源可配置）
- CEX（计划支持）：Binance、OKX、Bybit（REST/WebSocket 用于行情/订单/执行）
- 市场与情绪（计划支持）：CoinGecko 等价格聚合；社媒/新闻流（需网关与清洗策略）
- 执行接口（计划）：CEX API Key 适配器；DEX 路由与执行（如 Uniswap 生态，钱包签名）


![项目预览](./pic.jpg)

## 系统架构（草图）
```
            用户
             |
     交互界面 / 工作流
             |
      REST + SSE API
             |
   多智能体编排（Orchestrator）
     |       |        |        |        |
  On-chain  Sentiment Quant  Technical  Risk   <- SubAgents
     |         |        |        |        |
  DEX/链上   社媒/新闻   回测/特征  指标/形态   敞口/限额
     |         |                               
  viem/子图   数据网关                         风控策略
             |
    数据与状态存储
  (Postgres / Redis)
             |
      执行适配层
   CEX API / 钱包签名(viem)
```

## 技术栈与依赖说明
- 框架与语言：Next.js 15（App Router）、React 19 RC、TypeScript
- UI/状态：Tailwind CSS、Radix UI、TanStack Query
- 数据与鉴权：Drizzle ORM + Postgres、NextAuth、Redis（可选）
- Web3：wagmi、viem、RainbowKit
- 工具与质量：ESLint、Biome、Playwright E2E、@vercel/*（Analytics/Postgres/Blob 等）

## 部署与使用指南
环境要求：Node 18+、pnpm 9.x

本地开发
- 安装依赖：`pnpm i`
- 配置环境变量：创建 `.env.local`（示例见下）
- 初始化数据库：`pnpm db:migrate`
- 启动开发：`pnpm dev`（默认 http://localhost:3000）
- 测试与质量：`pnpm test`、`pnpm lint`、`pnpm format`

构建与部署
- 构建：`pnpm build`（先运行 DB 迁移再构建）
- 生产启动：`pnpm start`
- 部署建议：Vercel；或自托管 Node 环境，确保数据库与环境变量可用

数据库与工具（可选）
- 生成/迁移/可视化：`pnpm db:generate`、`pnpm db:migrate`、`pnpm db:studio`

## 环境变量示例
- `NEXT_PUBLIC_BACKEND_URL`（可选；不设时本地默认 `http://localhost:8000`）
- `DATABASE_URL`（Postgres 连接串）
- `NEXTAUTH_URL`、`NEXTAUTH_SECRET`
- `REDIS_URL`（可选）

## OpenAPI 客户端（可选）
- 生成：`pnpm openapi:client`（默认 predev/prebuild 跳过；在仓库根也可执行 `make -C .. codegen-frontend-client`）
