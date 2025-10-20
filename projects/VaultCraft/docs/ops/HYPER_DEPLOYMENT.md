# Hyper Testnet 部署与联调步骤（Exec Service v1）

本手册指导如何配置 Hyper Testnet（chainId 998）、验证 RPC、运行后端 Demo CLI、准备 Exec Service 环境，并与前端/合约演示联动。

---

## 1. 网络与 RPC

- 链：Hyper Testnet（chainId 998）
- RPC：`https://rpc.hyperliquid-testnet.xyz/evm`
- REST：`https://api.hyperliquid-testnet.xyz`

验证 RPC：
```
cd hardhat
npm run ping:hyper
# 输出示例：{"network":"hyperTestnet","chainId":998,"blockNumber":...,"gasPrice":"..."}
```

---

## 2. 统一环境变量（根 .env）

- `HYPER_RPC_URL`：Testnet EVM RPC（https://rpc.hyperliquid-testnet.xyz/evm）
- `HYPER_API_URL`：Testnet REST（https://api.hyperliquid-testnet.xyz）
- `PRIVATE_KEY` 或 `HYPER_TRADER_PRIVATE_KEY`：实单私钥（小额）
- `ADDRESS`：监听用户事件所需（可选）
- `ENABLE_HYPER_SDK`：SDK 优先行情（只读）
- `ENABLE_LIVE_EXEC`：实单开关（默认 0，开启前务必小额）
- `ENABLE_USER_WS_LISTENER`：用户事件监听回写（默认 0）
- `ENABLE_SNAPSHOT_DAEMON` / `SNAPSHOT_INTERVAL_SEC`：后台快照
- `EXEC_ALLOWED_SYMBOLS`、`EXEC_MIN/MAX_LEVERAGE`、`EXEC_MIN_NOTIONAL_USD`/`EXEC_MAX_NOTIONAL_USD`：风控（Hyper 最小下单 $10）
- `EXEC_MARKET_SLIPPAGE_BPS`：市价/开仓滑点限制（默认 10bps，测试网可调高；示例 50）
- `EXEC_RO_SLIPPAGE_BPS`：Reduce-Only 滑点（默认继承上项；示例 75）
- `EXEC_RETRY_ATTEMPTS` / `EXEC_RETRY_BACKOFF_SEC`：流动性不足时的额外重试次数与间隔（示例 2 次 / 2s）
- `APPLY_DRY_RUN_TO_POSITIONS` / `APPLY_LIVE_TO_POSITIONS`：是否回写头寸
- `POSITIONS_FILE`：头寸文件路径
- `EVENT_LOG_FILE`：事件日志（JSONL追加写）

启用 SDK（推荐）步骤：
```
cd apps/backend
uv venv
uv add hyperliquid-python-sdk
# 验证安装
uv run python -c "import hyperliquid, hyperliquid.info; print('OK')"
# Windows PowerShell 设置 env（或写入 .env）
$env:ENABLE_HYPER_SDK="1"
```

---

## 3. 后端与 Demo CLI（只读/实单）

运行（Windows PowerShell）：
```
cd apps/backend
uv venv
# 启动 REST API（默认端口 8000）
uv run uvicorn app.main:app --reload --port 8000
# 另一个终端运行 Demo CLI
uv run python -m app.cli rpc-ping
uv run python -m app.cli build-open ETH 0.1 buy --leverage 5
uv run python -m app.cli build-close ETH --size 0.1
uv run python -m app.cli nav --cash 1000 --positions '{"ETH":0.2,"BTC":-0.1}' --prices '{"ETH":3000,"BTC":60000}'
# Exec（默认 dry-run；设置 ENABLE_LIVE_EXEC=1 后走实单）
uv run python -m app.cli exec-open 0xYourVault ETH 0.1 buy --reduce
uv run python -m app.cli exec-close 0xYourVault ETH --size 0.1
```

说明：
- `rpc-ping`：检测 RPC 可用性（chainId、区块、gas）
- `build-open/close`：构造下单/平仓 payload（干运行，不落地）
- `nav`：从现金 + 头寸 + 指数价计算 NAV（仅演示会计口径）

---

## 4. Exec Service（v1 计划）

- 集成 Hyper Python SDK（或 REST/WS）：
  - open/close/reduce 下单接口（服务账号）
  - WS 监听成交，汇总账户权益
- 会计：`NAV = 现金腿 + Σ(持仓权益)`
- 承诺：周期性生成 NAV 快照 hash（上链/链下皆可），供前端和审计复核
- API：
  - `GET /api/v1/metrics/:vault`（KPI）
  - `GET /api/v1/nav/:vault`（NAV 时间序列）
  - `GET /api/v1/events/:vault`（事件）

---

## 5. 与前端联动

- 合约：Vault 在 Base 或 HyperEVM 部署，前端读链（ps/totalAssets/isPrivate/lock/perfFeeP）
- 前端：/vault/[id] 展示 KPI、NAV 曲线与事件流；可选 Exec 面板（NEXT_PUBLIC_ENABLE_DEMO_TRADING=1）
- 后端：聚合 NAV 与指标，并提供 /pretrade 与 /status 便于风控与可视化

Demo Registry（演示金库目录）：
- 当前 `/api/v1/vaults` 返回内置的演示列表（私募/公募若干）用于前端渲染
- 部署到测试网后，可在 `deployments/hyper-testnet.json` 中维护 pairs/参数
- 后续版本会将注册表迁移到轻量数据库或链上事件索引，保持接口不变
  - Demo NAV 计算：后端内置两个示例地址 `0x1234...5678` 与 `0x8765...4321` 的现金+头寸配置，用于 `/api/v1/nav/:id` 计算演示 NAV；也可直接传入任意地址按默认配置计算

维护头寸（Positions）用于 NAV 计算：
- 文件：`deployments/positions.json`（可通过环境变量 `POSITIONS_FILE` 指定路径）
- 结构示例：
```
{
  "0x1234...5678": {
    "cash": 1000000,
    "positions": { "BTC": 0.1, "ETH": 2.0 },
    "denom": 1000000
  }
}
```
- CLI 管理：
```
cd apps/backend
uv run python -m app.cli positions:get 0x1234...5678
uv run python -m app.cli positions:set 0x1234...5678 '{"cash":1000000,"positions":{"BTC":0.2},"denom":1000000}'
```

---

## 6. 注意事项

- 测试前请先检查 Hyper 测试网 agent 钱包与 API 权限
- Demo 环境优先 dry-run（构造 payload、不真实下单）
- 需要真实下单时务必用小额测试资金，并启用额度/频次限权
```
常用 API（本地）
- GET http://127.0.0.1:8000/health
- GET http://127.0.0.1:8000/api/v1/markets
- GET http://127.0.0.1:8000/api/v1/price?symbols=BTC,ETH
- GET http://127.0.0.1:8000/api/v1/vaults
- GET http://127.0.0.1:8000/api/v1/vaults/0x1234...5678

小技巧与排错
- Hyper 最小下单金额为 $10：若 `pretrade` 返回 `notional below minimum` 或 ACK 中出现“Order must have minimum value of $10”，请增大下单 `size`（例如 ETH 取 `0.01`）。
- 市价平仓 `market_close` 使用 `coin` 参数；若 ACK 报 “Price too far from oracle”，通常为临时价带限制，可稍后重试或采用更小 `size`。
- 监听器（WS）需 `ADDRESS` 与真实执行的钱包一致，否则不会收到成交事件。
- 若启用 `ENABLE_CLOSE_FALLBACK_RO=1`，平仓失败会自动尝试 Reduce-Only 订单；若仍失败，可在事件流查看 error payload 并手动调整仓位。
- 测试网常缺对手单：可在 `.env` 提高 `EXEC_MARKET_SLIPPAGE_BPS` / `EXEC_RO_SLIPPAGE_BPS`（例如 50 / 75 bps）并设置 `EXEC_RETRY_ATTEMPTS=2`、`EXEC_RETRY_BACKOFF_SEC=2`，仍失败则改用 CLI 提交挂单（如 `order_type={"limit":{"tif":"Gtc"}}`）或提前与协作者约定对敲。
```
