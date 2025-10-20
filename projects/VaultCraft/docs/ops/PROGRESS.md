# 进度跟踪与交接说明（PROGRESS & HANDOFF）

## 当前进度（最新）

- 文档
  - PRD v0（../product/PRD.md）；Tech Design（../architecture/TECH_DESIGN.md）；架构解析（../architecture/ARCHITECTURE.md）；前端规范（../architecture/FRONTEND_SPEC.md）；配置清单（CONFIG.md）；Hyper 集成（../architecture/HYPER_INTEGRATION.md）；Hyper 部署（HYPER_DEPLOYMENT.md）
  - v1 里程碑与验收清单：../product/PLAN_V1.md（黑客松演示范围 P0–P3；集中仓位相关移至 v2）
  - README.md 全量重写（Hyper Testnet 定位、Feature Matrix、Quickstart、Roadmap）；新增 `docs/ops/PITCH_DECK.md` 路演稿
- 合约（Hardhat + Foundry）
  - Vault（ERC20 shares，最短锁定、HWM 绩效费、私募白名单、适配器白名单、可暂停）
  - Hardhat 测试 + 覆盖率：Vault.sol statements 85.71%，branches 51.16%，functions 77.78%，lines 100%
  - 任务与脚本：whitelist/adapter/lock/fee/deposit、token:mint、vault:create-private、ping、seed
- 后端（FastAPI + 工具）
  - 新增 API：GET `/api/v1/metrics/:address`、GET `/api/v1/nav/:address`、GET `/api/v1/events/:address`
    - 支持通过 `series` 查询参数喂入 NAV（测试/演示用）；生产接入存储/索引器
  - HyperHTTP 增强：`get_markets()`、`get_index_prices(symbols)`（测试用 monkeypatch，无需外网）
  - HyperExec 增强：杠杆区间校验（`min_leverage/max_leverage`）、`build_reduce_only()`
  - CORS 现支持任意 `localhost`/`127.0.0.1` 端口（regex 匹配），解决 `localhost`⇄`127` 混用导致的 `Failed to fetch`；新增 `test_artifact_cors_allows_local_dev` 回归测试
  - Exec Service：最小名义金额校验（默认 $10）、close reduce-only fallback、事件打点（source=ack/ws）；`/api/v1/status` 返回运行态（listener/snapshot running/idle/disabled）；实单滑点默认 10bps（`EXEC_MARKET_SLIPPAGE_BPS` 可调），遇流动性错误按 `EXEC_RETRY_ATTEMPTS`/`EXEC_RETRY_BACKOFF_SEC` 退避重试；已成功验证 0.01 ETH 开仓（测试网平仓需等待对手单，详见 ISSUES.md）。
  - Listener Registry：`exec_service` 在 open/close 时登记 Vault，WS listener 将 fills fan-out 到所有登记 Vault（source=`ws`），并配合 `snapshot_now` 更新 NAV；新增 `listener_registry` 模块与覆盖单测（`test_user_listener.py`）。
  - 新增 API：GET `/api/v1/markets`、GET `/api/v1/price?symbols=`、GET `/api/v1/vaults`、GET `/api/v1/vaults/:id`
    - `markets` 从 `deployments/hyper-testnet.json` 读取配置对（BTC/ETH 5x 缺省）；`price` 采用 Hyper REST 助手（失败则回退确定性演示价格）
  - 新增价格路由：优先官方 Python SDK（启用需 `ENABLE_HYPER_SDK=1`），失败回落 REST，再回落演示价格
  - 后端测试：全部通过（`uv run pytest -q`）。修复了因 SDK 覆盖导致的价格端点单测不稳定：在测试 monkeypatch `HyperHTTP.get_index_prices` 时优先走 REST，且应用启动清空价格/NAV 缓存以保证确定性。
  - 实单验证（Hyper Testnet）：已完成 ETH `0.01` 市价开仓与随后平仓（调整 `EXEC_MARKET_SLIPPAGE_BPS=50`、`EXEC_RO_SLIPPAGE_BPS=75`、`EXEC_RETRY_ATTEMPTS=2`），事件中记录 attempts；预检新增最小名义金额（默认 $10）。测试网若仍价带限制，可参考 HYPER_DEPLOYMENT.md 的挂单/协同时序。
  - Positions Store：环境变量 `POSITIONS_FILE` 统一解析为仓库根路径，避免不同工作目录生成多个副本。
- 前端（Next.js+Tailwind）
  - 集成设计骨架并对接后端 API：
    - Discover：`/api/v1/vaults`（失败回退本地示例）
    - 详情：`/api/v1/vaults/:id`、`/api/v1/nav_series/:id` 渲染 KPI 与 NAV 曲线
    - 新增 `StatusBar`（/status）、`EventsFeed`（/events）、可选 `ExecPanel`（/pretrade + /exec）
  - Discover 页在 API 失败时展示提示文案（保留示例金库但提醒检查后端 & `NEXT_PUBLIC_BACKEND_URL`），Manager 部署/Dev Helper 请求增加状态码校验与友好的 “Failed to fetch” 提示
  - P0 修复：移除 `mockVault.*` 残留（统一 `vault.*`），避免 Hydration 报错；默认显示“Connect Wallet”按钮（Header/Hero）。
  - 导航调整：新增 Browse 页面（搜索/排序），About 跳转仓库；默认显示钱包按钮（Header/ Hero）。
  - Portfolio：改为真实链上读取 `balanceOf/ps/nextRedeemAllowed`，支持 Withdraw。
  - Manager：新增 /manager 页面，浏览器内一键部署 Vault（读取后端提供的 Hardhat Artifact），以及参数管理与白名单设置。
    - Launch Checklist：自动读取 USDC 资产元数据与 Manager 余额；记录最近部署地址；默认资产可通过 `NEXT_PUBLIC_DEFAULT_ASSET_ADDRESS` 预填。

## 需求更新与排序（概览）

- 已知问题（详见 ISSUES.md）：
  - Hydration mismatch：已修复 `mockVault`；如有其他警告，排查随机/时间依赖并改用 CSR。

### P0（Demo 必需）
- [x] 详情页残留与 Hydration 修复；统一 CSR/SSR 数据
- [x] 钱包连接与链切换（Header/Hero）
- [x] Deposit/Withdraw 真实交互（approve+deposit / redeem）
- [x] 公募持仓历史（事件重建）与风险参数可视化（/status）
- [x] Shock 模拟（写入 NAV 低值快照）与 Drawdown 警示条
- [x] Browse/Manager 页面：发现/搜索/排序；一键部署与参数管理（白名单/锁期/绩效费/暂停）
- [x] Exec 面板增强（杠杆/Reduce‑Only 输入）

- 私募邀请码 UI（演示）与前端 gating；实白名单通过 Hardhat/Manager 预操作
- Listener（WS）回写落地与前端标注（"fill via listener"）
- UI polish（进一步空态/骨架、图表/事件时间对齐）
- Manager 扩展：Adapter 管理、Guardian/Manager 变更、部署记录写回

### P1.5（Off‑chain 执行最小闭环）
- 后端：落地 Ingestor/Execution Bus/Allocator/Reconciler 四模块（最小版）
- 数据库：新增 orders/bus_orders/fills/allocations 四表（SQLite）
- 对接 Hyper Testnet：dry‑run → 小额 live 受控开关，Listener 落地，分摊回写事件
- 前端：Manager Exec 面板联动（展示订单/分摊/对账状态），金库页风险提示栏显示 RO/异常状态
 - Manager 扩展：Adapter 管理、Guardian/Manager 变更、部署记录写回。

- **v1 完成度速览（2025-10-19）**

  | 模块 | P0 | P1 | P2 | P3 |
  | --- | --- | --- | --- | --- |
  | 合约 & Hardhat | ✅ 份额/锁期/HWM/白名单/暂停，测试覆盖率 85%+ | ✅ Adapter/Guardian 调整入口 | ✅ Hyper Testnet 部署脚本与配置 | ⏳ Demo 剧本全链路复盘 |
  | 后端 (FastAPI) | ✅ `/status` `/nav_series` `/events` `/metrics` | ✅ Listener/Exec Service/风险提示；待实网验证 `source="ws"` | ✅ SDK 下单（dry-run / live 受控），NAV 快照 | ⏳ 异常回退/压测脚本 |
  | 前端 (Next.js) | ✅ Discover / Vault / Portfolio / Manager / Status Bar | ✅ Manager 标签页 + Vault 下拉 + 高级折叠 | ✅ Exec Panel + 风险提示 + NAV 图 | 🔄 Skeleton/空态全面打磨 |
  | 告警/可观测 | ✅ Shock → Drawdown Banner | ✅ Webhook 触发器（nav & exec error） | 🔄 电话告警演示脚本 | 🔄 冷却/节流压测 |

  > 图例：✅ 已满足验收；🔄 进行中；⏳ 待回归/验证。

- **v1 当前待办 / 风险**
- [ ] Listener e2e 验证：listener registry 已 fan-out 至 Vault，仍需在 Hyper Testnet 实测 `source:"ws"`（测试网偶尔无实时 fills，需准备截图与复现说明）。
  - 2025-10-19 再次尝试 ETH 0.02 buy（order=41408472092）仍未收到 `last_ws_event`；事件流仅有 `source:"ack"`，保持 ack fallback 并记录演示话术。
- [ ] Demo 剧本回归：自测“创建 → 申购 → 下单 → Shock → 告警”，确认 Skeleton/空态/提示完整并更新 DEMO_PLAN。
  - [ ] 空态与提示：Manager/Discover/Portfolio Skeleton、错误提示再打磨，准备 Showcase 截图。
  - [ ] Alert 演示指引：在 DEMO_PLAN 中补充 webhook 演示提示（如何触发 drawdown、冷却/降级说明）。


---

## v1（P0–P3）与 v2（简版）

- v1 P0：链上闭环（申赎/锁定/HWM/白名单/暂停）+ 前后端展示闭环（已完成）
- v1 P1：Listener e2e 与 UI 打磨（进行中）
- v1 P2：Hyper SDK 最小真实下单（BTC/ETH），dry‑run→小额 live，事件/NAV 联动
- v1 P3：脚本打磨与验收（骨架/空态、错误与降级提示、端到端走查）
- v2：集中仓位与对账（Ingestor/Bus/Allocator/Reconciler 与四表），演示不启用

详情与验收条款：见 ../product/PLAN_V1.md

---

## 交接要点（更新）

- 统一根 .env；钱包链 998；默认 dry‑run，启用真实下单需 ENABLE_LIVE_EXEC=1 且小额测试
- 资金始终在 Vault；后端仅代下单/估值；Adapter 与执行市场白名单与限权生效
- 常见故障：
  - 无效地址 → 前端禁用按钮（避免 ENS 查找）；
  - 私募未白名单 → Manager 白名单后再 deposit；
  - Hyper SDK 不可用或 RPC 波动 → 价格回退 REST，Exec 走 dry‑run；UI 黄条提示保守估值/RO；
- 文档：方案（PRD/TECH/ARCH），部署（HYPER_DEPLOYMENT），计划（PLAN_V1）；演示脚本见 DEMO_PLAN

## 环境与配置

- Hyper Testnet：见 deployments/hyper-testnet.json（chainId 998，RPC 已配置）
- 统一 env：仅根 `.env`，参数与说明见 README 与 DEPLOYMENT.md

## 交接要点（给后续开发者）

- 安全：默认 dry-run；需要真实下单时开启 ENABLE_LIVE_EXEC=1 且小额测试
- 文档：README“统一环境变量”、DEPLOYMENT.md（私钥格式与余额排错）、DEMO_PLAN.md（评审脚本）
- 入口：Hardhat（部署）、FastAPI（后端）、Next.js（前端）
- 故障：insufficient funds（给 ADDRESS 充测试币）；私钥格式（0x+64hex）；SSR/Hydration 与 `mockVault` 残留（详见 ISSUES.md）

---


## v2 展望（更新）
- 多品种接入：Polymarket、美股、贵金属、期权等适配器；保持资金留在 Vault，仅路由限权。
- WhisperFi 私募增强：投前摘要、投后 NAV、隐私执行凭证。
- Vault Composer：支持新 Vault 复用既有 Vault 作为按比例建仓模块或自动化策略组合。
- 手续费率曲线：默认无锁期，按持有时长/波动段收费；需要 Backtest 与 UI。
- Alert & Reporting：多语言（含中文）、告警订阅、Merke 承诺展示。


## 多端协同开发同步清单（Dev Sync Checklist）

- 统一环境：仅根 `.env` 生效；前端读取 `NEXT_PUBLIC_*`；Hardhat/Backend 共用 `HYPER_*` 与私钥。
- 钱包/监听一致：`ADDRESS` 必须与用于实单的 `PRIVATE_KEY/HYPER_TRADER_PRIVATE_KEY` 对应，否则 Listener 收不到成交。
- 风控参数口径：`EXEC_ALLOWED_SYMBOLS`、`EXEC_MIN/MAX_LEVERAGE`、`EXEC_MIN/MAX_NOTIONAL_USD` 在 `/api/v1/status` 输出；前端 StatusBar 直接展示。
- 演示尺寸：Hyper 最小下单约 $10；前端/文档默认建议 ETH `0.01`；过小尺寸前置拒单（Pretrade）。
- API 稳定性：FE 通过 `BACKEND_URL` 访问 `/status`、`/nav_series`、`/events`、`/pretrade`、`/exec/*`；路径/返回字段保持向后兼容。
- 构建/运行：
  - Backend：`uv run uvicorn app.main:app --reload`（tests：`uv run pytest -q`）
  - Frontend：`pnpm dev`（状态条检查 flags/chainId/block）
  - Hardhat：`npx hardhat test` / `npm run deploy:hyperTestnet`
  - 快照/事件：`npx hardhat vault:snapshot --network hyperTestnet --vault 0x...`

---

## 后续开发者提示（更新）

1. **USDC 流程优先**：若 `.env` 中设置 `NEXT_PUBLIC_DEFAULT_ASSET_ADDRESS`（建议填 Hyper Testnet USDC），/manager 将默认载入该资产；只有缺失时才使用 “Dev: Deploy MockERC20” 辅助按钮。
2. **Listener 条件**：开启 `ENABLE_LIVE_EXEC=1` 与 `ENABLE_USER_WS_LISTENER=1` 且 `ADDRESS` 对应执行私钥，否则事件流不会出现 `source: ws`。
3. **Close Fallback**：`ENABLE_CLOSE_FALLBACK_RO=1` 时，平仓失败会自动尝试 Reduce-Only；若仍报错，可在事件流查看 payload 并手动调仓。
4. **演示流程**：推荐顺序 Manager Checklist → Deploy → Manage/Exec → Deposit/Withdraw → Portfolio → Shock；详见 DEMO_PLAN.md。
5. **测试**：保持 `uv run pytest -q` 与 `npx hardhat test` 通过。新增功能时同步补充单测，维持高覆盖率。
6. **测试环境隔离**：pytest 启动时会强制将 `ENABLE_LIVE_EXEC`/`ENABLE_USER_WS_LISTENER` 设为 0，避免无意触发实单；如需在测试内验证实单逻辑，请显式覆盖环境变量。
7. **实盘风险提示**：Hyper 测试网流动性有限，目前执行账号持有 ~0.01 ETH 多单；若需清仓请在订单簿有人对手时手动执行或挂单，具体报错与应对见 ISSUES.md《Hyper Testnet 流动性稀薄》。
8. **手动验收**：推荐 `.env` 设置 `EXEC_MARKET_SLIPPAGE_BPS=50`、`EXEC_RO_SLIPPAGE_BPS=75`、`EXEC_RETRY_ATTEMPTS=2`、`EXEC_RETRY_BACKOFF_SEC=2`，先 `exec-open`（dry-run/少量）后 `exec-close`；事件与 StatusBar 会展示 attempts 与最近 fill 时间。
9. **本地 CORS**：后端默认允许 `http://localhost:3000` / `http://127.0.0.1:3000`，确保前端使用此域名启动；如需其它源，请调整 `apps/backend/app/main.py` 中的 `CORSMiddleware` 配置。
10. **告警配置**：若需电话/短信告警，请在 `.env` 配置 `ALERT_WEBHOOK_URL`（例如 fwalert 链路）、`ALERT_COOLDOWN_SEC`、`ALERT_NAV_DRAWDOWN_PCT`，演示前可先用 Shock 或模拟 exec error 验证。
