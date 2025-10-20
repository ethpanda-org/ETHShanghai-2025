# 配置与环境（CONFIG）

本文件梳理部署与运行中的配置项，给出默认值与建议，便于统一管理与审阅。

---

## 1. Hardhat .env（部署）

- RPC_URL：选定测试网 RPC（Base Sepolia / Arbitrum Sepolia / Hyper Testnet）
- PRIVATE_KEY：部署私钥（小额热钱包）
- INIT_MANAGER（可选）：默认经理地址（默认 deployer）
- INIT_GUARDIAN（可选）：默认守护者地址（默认 deployer）
- ASSET_ADDRESS（可选）：金库资产 ERC20 地址；缺省时脚本会部署 MockERC20
- IS_PRIVATE（可选）：是否私募金库（默认 false）
- PERF_FEE_BPS（可选）：绩效费基点（默认 1000=10%）
- LOCK_DAYS（可选）：最短锁定天数（默认 1）
- HYPER_RPC_URL（可选）：Hyper Testnet RPC（若切链）

---

## 2. 部署记录（deployments/*.json）

示例：deployments/base-sepolia.json
- network：网络名
- deployer：部署地址
- asset：资产 ERC20 地址
- vault：金库地址
- timestamp：部署时间
- config：
  - lockDays：默认锁定天数（1）
  - perfFeeBps：绩效费（1000）
  - whitelist：初始白名单数组（可空）

用途：前端/后端可读取该文件初始化显示与内置参数（仅演示场景）。

---

## 3. Web（apps/vaultcraft-frontend）

- NEXT_PUBLIC_RPC_URL：前端只读 RPC，用于读取 ps/totalAssets 等链上数据
- NEXT_PUBLIC_BACKEND_URL：后端 API 基地址（指标/事件）
- NEXT_PUBLIC_ENABLE_DEMO_TRADING：是否展示受控下单面板（默认 0）
- NEXT_PUBLIC_DEFAULT_ASSET_ADDRESS：默认金库资产地址（建议填 USDC 测试网地址；为空时可使用 MockERC20 Dev Helper）
  （钱包按钮默认显示，无需配置）

---

## 4. Backend（apps/backend）

- HYPER_API_URL / HYPER_RPC_URL / HYPER_WS_URL：Hyper API / RPC / WS 地址
- ENABLE_HYPER_SDK：启用官方 Python SDK 获取行情（默认 0）
- ENABLE_LIVE_EXEC：启用实单执行（默认 0）
- EXEC_*：风险与额度参数（allowed symbols/lev/notional/slippage/retry）
  - EXEC_MARKET_SLIPPAGE_BPS：市价/开仓滑点限制（默认 10 bps；测试网可适度调高）
  - EXEC_RO_SLIPPAGE_BPS：Reduce-Only 滑点（留空时继承上项）
  - EXEC_RETRY_ATTEMPTS：遇到“Price too far…”等错误时的额外重试次数（默认 0）
  - EXEC_RETRY_BACKOFF_SEC：重试间隔秒数（默认 1.0）
- ALERT_WEBHOOK_URL：告警 webhook 地址（例如 `https://fwalert.com/...`），为空则不发送
- ALERT_COOLDOWN_SEC：告警冷却秒数（默认 120）
- ALERT_NAV_DRAWDOWN_PCT：NAV 回撤触发阈值（默认 0.05，即 5%）
- ENABLE_CLOSE_FALLBACK_RO：实单 close 失败时是否尝试 Reduce-Only fallback（默认 1）
- POSITIONS_FILE / EVENT_LOG_FILE：本地持仓/事件持久化（演示）

---

## 5. 建议

- 所有敏感密钥仅存放在本地 .env 或安全密管；不要提交到仓库
- 部署成功后将地址同步到 deployments/*.json 并告知前端/后端团队
