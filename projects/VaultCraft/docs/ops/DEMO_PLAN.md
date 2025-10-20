## 黑客松评审 Demo 计划（GUI 优先）

目标：用最少“讲解文字 + 最多 GUI 画面”完成 5–8 分钟演示。

### 1) 预演准备（仅 GUI 所需）
- 根 `.env`（统一配置）：
  - HYPER_RPC_URL / HYPER_API_URL
  - PRIVATE_KEY（或 HYPER_TRADER_PRIVATE_KEY）+ ADDRESS（可选，仅用于监听回写）
  - ENABLE_HYPER_SDK=1；ENABLE_LIVE_EXEC=1（如需实单）；ENABLE_USER_WS_LISTENER=1（如需回写）；ENABLE_SNAPSHOT_DAEMON=1（可选）
  - EXEC_ALLOWED_SYMBOLS=BTC,ETH（风控白名单）
  - EXEC_MARKET_SLIPPAGE_BPS=50 / EXEC_RO_SLIPPAGE_BPS=75 / EXEC_RETRY_ATTEMPTS=2 / EXEC_RETRY_BACKOFF_SEC=2（Hyper 测试网推荐值，主网可调低）
- 余额：ADDRESS 有 Hyper Testnet gas
- 启动：后台 `uvicorn app.main:app --reload --port 8000`；前台 `pnpm dev`（apps/vaultcraft-frontend）
- 检查：前端页头 StatusBar（或 `/api/v1/status`）显示 Mode、SDK、Listener、Snapshot、chainId/block
 - 钱包按钮：默认可见。如需临时隐藏，可自行注释前端按钮。
- Listener Registry：首次执行前，可先在 /manager 执行一次小额开仓（或运行 `uv run python demo_exec.py`）登记 Vault；WS listener 会将 fills fan-out 到登记 Vault 并标记 `source:"ws"`。若测试网暂未推送实时填单，保留截图/说明（事件仍有 `source:"ack"` 回写）。 

（CLI 仅作为排障备用，不进入评审脚本）

### 2) 演示流程（全 GUI）
1. 连接钱包（Hyper Testnet）
   - Header 点击 “Connect Wallet”
   - 自动切换/添加到链 998（Hyper Testnet）；状态条显示 chainId/block
2. Manager Launch Checklist
   - 打开 /manager，检查顶部 Checklist：资产地址（USDC）、Decimals、Manager 余额是否充足、自助提醒。
   - 若默认 `NEXT_PUBLIC_DEFAULT_ASSET_ADDRESS` 已配置，Asset 自动预填；余额不足时可以提示评委使用测试水龙头或运维辅助。
3. Vault 浏览与搜索（Browse）
   - 点击首页“Explore Vaults”或顶部导航“Browse”进入列表页
   - 通过筛选（Public/Private）与排序（Sharpe/AUM/Return）浏览公募/私募
4. 公募 Vault 详情（Transparency）
   - KPI 区：AUM / Unit NAV / Return / Sharpe / MDD
   - NAV 曲线：随快照/NAV 序列更新（/nav_series）
   - Holdings（公开）：Positions History 折线图（由事件 `fill` 重建头寸时间线）
   - Risk Controls：展示允许交易对、杠杆区间、名义上限（/status）
5. 私募 Vault 入口（Access Control）
   - “Join Private Vault” 输入邀请码（演示：接受任意非空码并提示“Demo 已加入”；真实场景需预先白名单）
6. Manager 创建与执行（/manager）
   - “Deploy New Vault”：验证 Asset 字段（推荐 USDC），设置名称符号等，点击部署；部署完成后 Launch Checklist 会记录最近部署地址。
   - “Manage Vault”：输入新地址，读取当前参数；可修改白名单、锁期、绩效费、Adapter。
   - “Perps Execution”：在 Exec 面板尝试过小名义金额（提示最小 $10）→ 调整为 ETH `0.01`；若 Listener 运行，事件流将出现 `source: ws`。
7. 投资（Deposit）
   - 打开 Deposit 弹窗，输入金额 → 自动走 ERC20 `approve` → `vault.deposit` 交易发送与确认
   - 若为私募且未白名单：交易将被拒绝，前端友好提示（演示前建议预白名单评委地址）
8. 风控展示（Pretrade）
   - 切换 Exec 标签：尝试超限杠杆/不在白名单/过小名义金额（< $10）→ 预检报错（"notional below minimum"）
   - 正常 open/close（建议 ETH `0.01`）→ 事件流与 NAV 曲线联动更新；若 close 遭遇价带限制，可展示 Reduce-Only fallback（事件流会记录）。
9. 我的组合（Portfolio）
   - 自动读取钱包地址在各金库的份额 `balanceOf(user)`，显示锁定状态与当前价值
   - 可对已解锁的金库发起 `redeem(shares, receiver, owner)` 提现
10. 异常与告警（Alert Simulation）
   - 点击 “Simulate -10% Shock” → 后端写入 NAV 低值快照 → 曲线陡降，可讲述告警触发（电话/短信预留）

旁白要点：
- 私募透明边界：Private 仅展示 NAV/绩效，不披露持仓；Public 可扩展展示持仓
- 受控执行：风险白名单/杠杆范围/名义上限；一键切换 Live/Dry-run；全在 .env 控制
- 稳定性：行情有重试 + last‑good；Listener 有重连；快照守护提供平滑曲线

### 2.1）可选：现场创建 Vault（如需）
- 使用 Hardhat 任务在演示前准备（建议离线准备，避免现场卡顿）：
```
cd hardhat
npx hardhat vault:create-private --network hyperTestnet --perf 1000 --lock 1 --whitelist 0xJudgeAddress
```
- 将生成的 `vault` 与 `asset` 写入 `deployments/hyper-testnet.json`，前端/后端会自动读取。

### 3) 兜底方案（现场网络/权限异常时）
- 若 Listener 不可用：仍可用 ack→positions 回写→快照 完成闭环；对观众无感
- 若钱包连接不可用：隐藏“连接钱包”交互，保留 Exec 面板（后端受控）
- 若 RPC 波动：/status 观察网络；/events /nav_series 可人工验证数据

---

## 任务拆解与优先级（Demo First）

P0（必须）
- 钱包连接与链切换（Header 按钮，EIP‑1193 原生）
- 公募持仓历史（由事件流重建、只读）
- 风控参数可视化（/status → symbols/lev/notional）
- Deposit 真实链上交互（approve + deposit）
- Shock 模拟按钮（写入低 NAV 快照）

P1（加分）
- 私募邀请码 UI（演示用，实白名单需预操作）
- Listener 前端标注（“fill via listener”）
- Exec 面板更多提示与空态

P2（跳过，记录）
- 私募邀请码签名校验（服务端/合约门票）
- on‑chain Vault 创建与参数表单化（现场成本高，改为 Hardhat 预部署）
- 实时价格/仓位多源聚合与分页历史（替用轻量事件重建）
