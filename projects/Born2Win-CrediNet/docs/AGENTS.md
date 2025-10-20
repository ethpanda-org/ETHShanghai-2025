# 仓库指南

本文件为 CrediNet 仓库的贡献者指南，帮助你快速理解结构、运行方式与协作规范。

## 项目结构与模块组织
- `backend/` Rust API 服务（Axum）。核心模块：`auth/`、`did/`、`identity/`、`authorization/`、`credit/`、`sbt/`、`api/`、`shared/`；辅助脚本：`service.sh`、`run_tests.sh`；文档：`backend/docs/`。
- `frontend/` Vite + React + TypeScript。代码位于 `src/`（`components/`、`pages/`、`hooks/`、`services/`、`contracts/`、`config/`）。
- `contracts/` Hardhat + Solidity。目录：`contracts/`、`scripts/`、`test/`，以及 `agent-service/`（Node.js 编排服务）。
- `docs/` 跨模块说明与清单；根级 `README.md`、移交与进度文档用于背景参考。

## 构建、测试与本地运行
- 后端（Rust）
  - 启动：`cd backend && ./service.sh start` 或 `cargo run --release`
  - 停止/状态/日志：`./service.sh stop|status|logs`
  - 集成测试：服务运行后执行 `./run_tests.sh all` 或 `./run_tests.sh auth|did|identity|authorization|credit|sbt|integration`
- 前端（Web）
  - `cd frontend && npm i`
  - 开发/构建/预览：`npm run dev | build | preview`
  - 代码检查：`npm run lint`
- 合约（Hardhat）
  - `cd contracts && npm i`
  - 编译/测试：`npx hardhat compile` / `npm test`
  - 部署示例：`npm run deploy:sepolia`（需 `.env` 配置 RPC 与私钥）
- 代理服务：`cd contracts/agent-service && npm i && npm run dev`（读取 `../.env`）

## 代码风格与命名规范
- 前端：遵循 ESLint。缩进 2 空格；React 组件与类型用 PascalCase；Hook 以 `use` 前缀；组件文件名与组件同名（如 `CRNBalanceCard.tsx`）；工具/服务使用 camelCase（如 `apiClient.ts`、`credit.service.ts`）。
- 后端：Rust 标准风格（`rustfmt`）。模块与文件 snake_case，类型与枚举 PascalCase，函数与变量 snake_case。
- 合约：Solidity 0.8.24，4 空格缩进；合约名与文件名一致（PascalCase），启用优化器（参见 `hardhat.config.js`）。

## 测试指南
- 后端：先启动服务，再运行 `backend/run_tests.sh`；可按模块选择子集（如 `./run_tests.sh credit`）。
- 合约：在 `contracts/` 下执行 `npm test` 运行 Hardhat 测试。
- 前端：当前未提供自动化测试脚本；提交前请本地自测关键流程（连接钱包、仪表盘加载、SBT 流程）。

## 提交与 PR 规范
- 提交信息：使用简洁祈使句，必要时添加范围前缀（如 `frontend:`、`backend:`、`contracts:`）。示例：`frontend: fix Web3StatusCard loading state`。
- PR 要求：
  - 目的与变更摘要；关联 Issue（如有）。
  - 测试说明与影响面；必要的截图/日志。
  - 保持最小化变更，遵循上述目录与风格约定。

## 安全与配置提示
- 后端：复制 `backend/env.example` 为 `backend/.env` 并按需修改（切勿提交密钥）。
- 合约与代理：在 `contracts/.env` 配置 `SEPOLIA_RPC_URL`、`BASE_SEPOLIA_RPC_URL`、`DEPLOYER_PRIVATE_KEY` 等；避免将私钥与令牌提交至版本库。

