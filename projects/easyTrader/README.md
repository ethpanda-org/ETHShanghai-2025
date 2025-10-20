# EasyTrader - ETHShanghai 2025

> 基于 Rust + Next.js + PostgreSQL 的去中心化网格交易系统，集成以太坊主网与 Uniswap V3，实现可配置的买低卖高网格策略与实时价格监控。

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：包含完整代码与本 README
- [x] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程
- [x] 在线演示链接（如有）：前端 Demo 或后端 API 文档
- [x] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本（本项目当前未包含自定义智能合约）
- [x] 可选材料：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：EasyTrader
- **一句话介绍**：面向普通与专业交易者的链上网格交易机器人，支持 Uniswap V3 实时报价与自动化执行。
- **目标用户**：
  - 初级投资者：希望使用零代码网格策略、可视化配置与一键运行。
  - 高级交易员：需要高性能、可扩展与可组合策略的专业执行工具。
- **核心问题与动机（Pain Points）**：
  - CEX 机器人策略单一、难以组合，难以适配不同行情。
  - 跨平台与跨所操作繁琐，资金利用率低，错失机会。
  - 成本、风险与执行透明度差，难以审计与复现。
- **解决方案（Solution）**：
  - 基于 Rust 的高并发后端与 Next.js 前端，提供参数化网格策略与实时价格，支持暂停/恢复/停止控制。
  - 集成 Uniswap V3 多费率池 Quoter，优先选择流动性更好的池获取真实价格，失败回退到模拟价以保障可用性。
  - 以 PostgreSQL 进行持久化管理策略与订单数据，提供可扩展的交易所适配层。

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：见仓库根目录 `image.png`（系统概览）。
- **关键模块**：
  - 前端：Next.js 15 + TypeScript + Tailwind（表单配置、状态面板、价格显示）
  - 后端：Rust + Axum + Tokio + SQLx（API、策略引擎、价格获取、执行调度）
  - 其他：以太坊主网接入 + Uniswap V3 Quoter/Router（ethers-rs）
- **依赖与技术栈**：
  - 前端：React, Next.js 15, TypeScript, Tailwind CSS
  - 后端：Rust, Axum, Tokio, SQLx, ethers-rs, PostgreSQL
  - 合约：无自定义合约（集成 Uniswap V3 协议）
  - 部署：本地开发（推荐），前端可部署至 Vercel，后端可部署至任意支持二进制的环境

### 3) 合约与部署 (Contracts & Deployment)（如有）

- 当前版本未包含自定义 Solidity 合约，主要集成 Uniswap V3 协议（Quoter/Router）。
- 如后续加入自定义合约，将在此处补充：网络、地址、验证链接与最小复现脚本。

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Node 18+, npm, Rust stable, PostgreSQL 14+, Git
- **环境变量样例**：

建表语句在./backend/migrations/001_initial.sql

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:password@localhost/grid_trading
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
ETH_RPC_URL=https://ethereum-rpc.publicnode.com
PRIVATE_KEY=0x...                # 可选：用于真实链上价格/交易（谨慎）
CHAIN_ID=1                        # 主网: 1（可改为测试网）
RUST_LOG=info

# frontend/.env.local（如需）
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

- **一键启动（本地示例）**：

```bash
# 1) 启动 PostgreSQL 并创建数据库
# Windows/macOS/Linux 请按系统方式启动服务
psql -U postgres -c "CREATE DATABASE grid_trading;"

# 2) 启动后端
cd backend
cargo run
# API: http://localhost:8080

# 3) 启动前端
cd ../my-next-app
npm install
npm run dev
# 前端: http://localhost:3000
```

- **关键 API（摘录）**：
  - 健康检查：`GET /health`
  - 获取价格：`GET /api/price/:pair`（示例：`/api/price/ETH-USDC` 或 `ETH/USDC`）
  - 启动策略：`POST /api/strategy/start`

示例请求体（与后端 `GridConfig` 对齐）：

```json
{
  "config": {
    "pair": "ETH/USDC",
    "upper_price": 4500.0,
    "lower_price": 3500.0,
    "grid_count": 10,
    "total_amount": 1000.0,
    "private_key": "0x...",
    "exchange": "uniswap"
  }
}
```

- 常见返回字段：
  - 启动策略：`{ "strategy_id": "uuid", "message": "..." }`
  - 查询状态：`GET /api/strategy/:id/status`
  - 暂停/恢复/停止：`POST /api/strategy/:id/(pause|resume|stop)`

### 5) Demo 与关键用例 (Demo & Key Flows)

- 视频链接（≤3 分钟，中文）：待补充
- 关键用例步骤：
  - 用例 1：在前端填写 `交易对/价格区间/网格数/总投入` → 启动策略
  - 用例 2：查看实时价格与运行日志 → 暂停/恢复策略
  - 用例 3：在运行一段时间后停止策略 → 查看累计成交与收益统计

### 6) 可验证边界 (Verifiable Scope)

- 可复现/可验证：
  - 前端页面与交互（参数表单、状态面板、价格展示）
  - 后端 API（健康检查、价格查询、策略控制）
  - Uniswap V3 实时报价（具备有效 `ETH_RPC_URL` 与 `PRIVATE_KEY` 时）
- 暂不公开/限制：
  - 无自定义合约；链上真实交易需自备账户与 Gas，建议测试网络先行

### 7) 路线图与影响 (Roadmap & Impact)

- 赛后 1-3 周：
  - 完善前后端联调细节与错误处理，补充策略执行可视化
  - 增加日志持久化与收益分析报表
- 赛后 1-3 个月：
  - 扩展更多 DEX（SushiSwap、1inch 等）与更多策略（动态网格、止盈止损）
  - 引入 AI/数据指标（如 Alpha Vantage 指标）优化参数与区间
- 预期对以太坊生态的价值：
  - 降低链上量化门槛，提供可配置且透明的策略执行框架
  - 促进多 DEX 流动性利用与跨协议工具化实践

### 8) 团队与联系 (Team & Contacts)

- 团队名：EasyTrader
- 成员与分工：
  - @LMX（李蒙西(3262370263@qq.com)）
  - @theo（刘志超（kennyharris@163.com））
  - @喻天宇(hejunlbbc@gmail.com)
  - @jiaxin（赖嘉欣( x: @cara_data)）
  - @Rick（伍韬 t.observe@outlook.com）
- 联系方式（Email/TG/X）：见仓库 `README.md` 团队介绍部分
- 可演示时段（时区）：待确认

## 三、快速清单 

### Github链接
https://github.com/Liuzhichao99/ETHShanghai-2025

### Demo视频链接
https://www.bilibili.com/video/BV1CZW1zCEze/?spm_id_from=333.1387.homepage.video_card.click&vd_source=d7908c038bd9565f8e7805d68cb4353b

### Deck链接
https://n118t4igr9l.feishu.cn/wiki/MU8awRclDiPuo5k6jdYc5Pz7ngf

---

**注意**：如部署到生产，请务必做好私钥安全与风险控制；链上交易存在风险与成本，建议先在测试网充分验证。
