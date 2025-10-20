# 运行与运维操作指南（Py‑Polymarket）

本文汇总了从安装、启动、配置，到监控与排障的常用操作，涵盖离线/干跑/实盘三种模式，并说明订单状态流与新监控面板的使用方法。

## 1. 前置条件

- Python ≥ 3.10，pip 可用
- 建议在虚拟环境中安装（如 `python -m venv .venv && .venv/Scripts/activate`）
- Windows PowerShell 用户建议使用仓库自带脚本一键启动
- 实盘需准备：Polygon 私钥、CLOB API 三件套（`POLYMARKET_API_KEY/SECRET/PASSPHRASE`）

## 2. 安装

```bash
pip install -r requirements/base.txt
pip install -e .
```

开发工具（可选）：

```bash
pip install -r requirements/dev.txt
```

## 3. 运行模式与环境

- 离线（OFFLINE）：`POLY_OFFLINE_MODE=true`（默认更安全，回放/仿真）
- 干跑（DRY‑RUN）：`POLY_DRY_RUN=true`（不提交链上，只做模拟成交与持久化）
- 实盘（LIVE）：提供私钥与 CLOB API 凭据，且不要设置 `POLY_DRY_RUN=true`

常用环境变量（示例）：

```
POLY_OFFLINE_MODE=false
POLY_DRY_RUN=true
POLY_PRIVATE_KEY=0x...
POLYMARKET_API_KEY=...
POLYMARKET_API_SECRET=...
POLYMARKET_API_PASSPHRASE=...
CLOB_REST_URL=https://clob.polymarket.com
CLOB_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws
```

安全提示：切勿把密钥写入仓库；泄漏后需立即更换。

## 4. 快速启动

### 4.1 Windows 一键脚本（推荐）

```powershell
powershell -ExecutionPolicy Bypass -File scripts\launch_online_stack.ps1 -Port 8888 -Interval 60 -UseWs -OpenBrowser
```

- 加 `-Live` 开启签名/链上提交（确保已配置私钥与 CLOB 凭据）
- `-UseWs` 启用市场 WS 推送（策略更及时，REST 自动兜底）

停止：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\stop_stack.ps1 -Port 8888
```

### 4.2 CLI 启动

```bash
polymarket-launch trade --interval 60
polymarket-launch monitor --port 8888
# 订单状态 WS（可选独立进程）
polymarket-launch orders-ws --limit 50
```

## 5. 关键配置开关

- 市场 WS：`SERVICE_USE_WS=true`（默认建议开启）
  - 热点订阅：`SERVICE_WS_ASSET_LIMIT`、`SERVICE_WS_STATIC_ASSETS`、`SERVICE_WS_MIN_SCORE`、`SERVICE_WS_HOT_STICKY_SECONDS`、`SERVICE_WS_HOT_TTL_SECONDS`、`SERVICE_WS_HIT_BOOST`
- REST 兜底：并发 & 频率：`SERVICE_REST_MAX_CONCURRENCY`、`SERVICE_REST_RATE_LIMIT_PER_SEC`
- 订单状态 WS：`SERVICE_USE_ORDER_WS=true`（需 CLOB API 三件套）
- 订单状态 REST 回退：`SERVICE_USE_ORDER_REST_FALLBACK=true`、`ORDER_REST_POLL_SECONDS`、`ORDER_REST_POLL_LIMIT`
- 策略频控：`trading.order_frequency` 与 `trading.strategy_order_frequency`（支持全局/分策略/分市场×方向）

## 6. 监控面板与 API

- 浏览器访问：`http://localhost:8888`
- 面板概览：
  - Realized Summary：已实现盈亏、胜率与均值
  - Strategy Rate Limits：策略频控追踪与 Top 热点（按市场×方向）
  - Order Lifecycle：Approvals/Rejects/Fills/Partials/Pending；WS/REST 状态（含最近成功/错误）；外部成交计数（Opened/Applied/Reduced/Closed/Last）；Ext Trend（近 5/15/60 分钟）与 I/O 写失败小卡
  - Risk Audit：风控通过/拒绝计数与 Top Rejections（来自 `reports/risk_audit.jsonl`）
  - Backtest Frontier、Ledger Summary：回测指标摘要

接口：

```
GET /api/data            # 主 JSON 数据
GET /api/data?ext_window=60   # 指定外部成交趋势窗口（分钟）
```

## 7. 重要输出文件

- `reports/pipeline_status.json`：主状态（含 `fetch_info`、`external_fills`、`external_fills_trend`、`io_errors`、`risk_audit`）
- `reports/open_positions.json`：当前持仓快照
- `reports/realized_exits.jsonl`、`reports/realized_summary.json`：已实现盈亏流水与汇总
- `reports/orders.jsonl`、`reports/trades.jsonl`：订单/成交记录（订单状态 WS/REST 统一归一化）
- `reports/fills.jsonl`：执行遥测（进出场、滑点、费用、执行模式等）
- `reports/risk_audit.jsonl`：风控审计（通过/拒绝与因子详情）

## 8. 订单回放与排错

回放/导出工具：

```bash
# 近 30 分钟 trades，方向 yes，输出聚合统计
python scripts/replay_order_store.py --trades --last-minutes 30 --side yes --stats

# 指定时间段 orders，按市场过滤，导出 CSV
python scripts/replay_order_store.py --orders --since 2025-10-13T00:00:00Z --market SIM-1 --csv out.csv

# 同时导出 orders/trades（自动后缀 _orders/_trades）
python scripts/replay_order_store.py --orders --trades --last-minutes 60 --csv out.csv
```

## 9. 常见问题排查

- WS 状态 `degraded`/`stale`：确认 `SERVICE_USE_WS=true` 与公网连通；查看 `fetch_info.ws_cooldown_remaining_seconds`、重试后是否恢复；必要时检查代理配置
- REST 429/5xx 多：降低 `SERVICE_REST_MAX_CONCURRENCY`、设置 `SERVICE_REST_RATE_LIMIT_PER_SEC`
- I/O 写失败：面板小卡与 `pipeline.io_errors` 会显示累计次数，确认 `reports/` 可写与磁盘空间
- 风控拒绝过高：`Risk Audit` 面板查看 Top Rejections；检查 `settings.trading` 限额、`risk` 相关阈值
- 外部成交趋势为 0：确认 `orders_ws`/`orders_rest` 正在运行且有成交，或通过回放工具核对 JSONL 内容

## 10. 安全与合规

- 切勿提交密钥；泄漏后立即旋转
- 遵守 Polymarket ToS 与频率限制；尽量使用 WebSocket，REST 做兜底

---

如需进一步自动化（报警阈值、导出报表、按策略分层审计等），可在 `scripts/` 下扩展辅助脚本，或将指标接入你现有的监控系统。

## 11. 配置热加载与诊断

- 查看当前配置快照（关键项）：

```bash
polymarket-launch config show --log-level INFO
```

- 热加载配置（从磁盘与环境变量刷新）：

```bash
polymarket-launch config reload --log-level INFO
```

- API 探针（快速验证 REST/GraphQL 聚合是否可用）：

```bash
polymarket-launch probe api --limit 5 --log-level INFO
```

常见返回项包括市场数量与样例市场的 bid/ask，失败时可结合代理/网络排查。

## 12. 关键 JSON 字段速查（pipeline_status.json）

- `fetch_info`：
  - `current_source`: `ws_live | ws_stale | ws_initialising | rest_only`
  - `ws_cooldown_remaining_seconds`: WS 冷却剩余秒
  - `orders_ws`: `{ status, failures, cooldown_remaining_seconds, last_success_epoch, last_error_epoch, last_error }`
  - `orders_rest`: `{ running, interval_seconds, limit, success, errors, last_success_epoch, last_error_epoch, last_error }`
- `external_fills`：`{ processed, opened, applied_same_side, reduced_opposite, closed, last_seen }`
- `external_fills_trend`：近 N 分钟每分钟外部成交计数数组（`[{ t, count }]`）
- `risk_audit`：`{ approved, rejected, reasons: { name: count } }`
- `io_errors`：`{ orders, trades, status, positions, risk_audit }`（JSONL 写失败计数）
- `execution`：订单生命周期跟踪摘要（最近挂单/部分成交/已成）

## 13. 常见错误与排查建议

- 订单 WS 未启用：`orders_ws.status=disabled` 或 UI 提示“Order WS disabled”
  - 检查是否设置 `SERVICE_USE_ORDER_WS=true`
  - 确认环境存在 `POLYMARKET_API_KEY/SECRET/PASSPHRASE`
  - 代理环境：如需经代理连 WS，设置 `PROXY_ENABLED=true` 与 `PROXY_URL`

- WS 降级：`orders_ws.status=degraded` 或横幅出现“Fallback/WS degraded”
  - 观察 `orders_ws.cooldown_remaining_seconds`，等待自动重试
  - 若持续降级，检查网络/代理与 CLOB WS 地址是否可达

- REST 轮询错误增加：`orders_rest.errors` 增长
  - 降低 `ORDER_REST_POLL_SECONDS` 的频率或暂时关闭回退：`SERVICE_USE_ORDER_REST_FALLBACK=false`
  - 核对 API 凭据与频率限制（429/5xx）

- JSONL 写失败：横幅 IO degraded 或 `io_errors.*` 增长
  - 确认 `reports/` 目录存在且可写，磁盘空间充足
  - Windows 下避免与同步盘/杀毒软件冲突（可将仓库放在本地非同步路径）

- 风控拒绝过多：`risk_audit.rejected` 上升、Top Rejections 集中
  - 检查 `config/runtime.yaml` 中 `trading` 与 `risk` 配置，放宽必要阈值（如 VAR 上限、单单上限）
  - 结合回放工具定位具体订单与上下文

## 14. 日志与留存

- 运行日志：`logs/polymarket.log`
  - 日志轮转：默认最大 10MB，最多 5 个备份（可在 `config/settings.py:logging` 调整）
- 结构化流水：所有 JSON/JSONL 输出位于 `reports/`，可按需归档

## 15. 生产部署提示

- 优先 WS，REST 作为兜底（配置 `SERVICE_USE_WS=true`；回退 `SERVICE_USE_ORDER_REST_FALLBACK=true`）
- 设置 REST 并发与频率以规避 429/5xx：`SERVICE_REST_MAX_CONCURRENCY`、`SERVICE_REST_RATE_LIMIT_PER_SEC`
- 若使用代理，启用健康检查跳过与自动重试策略，定期观察 `rpc_metrics` 与横幅告警
- 持续观察 `io_errors` 与 `orders_rest.errors`；出现上升趋势时优先排查磁盘/网络

## 16. JSONL 字段示例

以下为各类 JSONL 的单行示例，便于对接审计/ETL：

- orders.jsonl（订单事件）

```json
{
  "timestamp": "2025-10-13T10:05:12.345Z",
  "event": "reject",              // submit | partial | filled | cancel | reject
  "market_id": "SIM-1",
  "action": "yes",                // yes | no
  "size": 250.0,
  "reason": "strategy_rate_limit",
  "metadata": {"interval_seconds":60, "max_orders":3, "current_window":3},
  "runtime_mode": "dry-run",
  "status": "reject",             // 订单状态（如有）
  "source": "rest_poll"           // 可选：来源标记
}
```

- trades.jsonl（成交事件，按“增量”记录）

```json
{
  "timestamp": "2025-10-13T10:06:01.123Z",
  "order_id": "b4e...",
  "market_id": "SIM-1",
  "action": "yes",
  "filled_shares": 120.5,          // 本次增量成交的份额
  "average_price": 0.55,           // 本次增量成交的价格
  "notional": 66.275,              // 本次增量成交 Notional（price × shares）
  "status": "partial",            // partial | filled（增量对应的生命周期状态）
  "execution_mode": "order_ws"     // order_ws | order_rest | simulation 等
}
```

- fills.jsonl（执行遥测，进出场/滑点/费用/模式）

```json
{
  "timestamp": "2025-10-13T10:06:02.000Z",
  "event": "entry",               // entry | exit
  "market_id": "SIM-1",
  "side": "yes",
  "notional": 200.0,
  "fill_price": 0.56,
  "reference_price": 0.55,
  "slippage": 0.01,
  "fees": 0.2,
  "execution_mode": "dry-run",
  "mid": 0.555,
  "spread": 0.02,
  "shares": 357.14
}
```

- risk_audit.jsonl（风控审计）

```json
{
  "timestamp": "2025-10-13T10:07:00.000Z",
  "market_id": "SIM-1",
  "action": "no",
  "size": 150.0,
  "approved": false,
  "risk": {
    "timestamp": "2025-10-13T10:07:00.000Z",
    "portfolio_balance": 10000.0,
    "order_size": 150.0,
    "factors": {
      "var": {"approved": true, "var": -0.013, "allowed_loss": 500.0, "potential_loss": 1.95},
      "liquidity": {"approved": false, "max_allocation": 120.0, "volatility_adjustment": 0.8, "balance": 10000.0}
    },
    "approved": false,
    "rejections": ["liquidity"]
  }
}
```

## 17. 最小 .env 模板（示例）

```
# 运行环境
POLY_OFFLINE_MODE=false
POLY_DRY_RUN=true

# 核心端点
CLOB_REST_URL=https://clob.polymarket.com
CLOB_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws

# 订单状态 WS/REST（可选）
SERVICE_USE_ORDER_WS=true
SERVICE_USE_ORDER_REST_FALLBACK=true

# 私有凭据（用于订单 WS/REST 与签名提交）
POLYMARKET_API_KEY=
POLYMARKET_API_SECRET=
POLYMARKET_API_PASSPHRASE=
POLY_PRIVATE_KEY=
```

## 18. 结构化持久化与导出

- 数据库表（SQLite 默认，MySQL 可选）：
  - `order_events`（订单事件）、`trade_events`（成交事件，增量）、`position_snapshots`（持仓快照）、`realized_exits`（已实现盈亏）
  - 自动建表，路径由 `config/settings.py` 的 DB_CONFIG 决定（默认同目录 SQLite）

- 导出脚本：

```bash
# 导出订单与成交为 CSV 到 exports 目录
python scripts/export_db.py --tables orders trades --format csv --out-dir exports

# 导出持仓与已实现为 Parquet（若 pyarrow 可用），否则回退 CSV
python scripts/export_db.py --tables positions realized --format parquet --out-dir exports
```

## 19. 告警配置（邮件）

- 在 `config/settings.py:DEFAULT_RUNTIME.alert` 调整 SMTP：
  - `enable_email`、`smtp_server`、`smtp_port`、`username/password`、`to_email`、`subject`
- Runner 内置阈值：
  - I/O 写失败累计增长（io_errors）
  - 订单 REST 轮询错误累积（errors ≥ 5 增长）
  - Fallback 持续 > 5 分钟
  - 触发后写日志并尝试发送邮件（开启时）
