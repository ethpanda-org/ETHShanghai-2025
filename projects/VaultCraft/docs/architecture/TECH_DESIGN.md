# VaultCraft 技术方案（Tech Design）v0

目标：在黑客松周期内，交付一个“与 Hyper 公募体验相当 + 新增私募（不公开持仓）”的最小可行版本；以 ERC‑4626 为核心份额会计，保持部署与迁移简单；为后续迁移 HyperEVM 与隐私执行（WhisperFi）预留抽象层。

本设计专注 v0（极简）：不实现锁期费曲线、Reduce‑Only、容量函数、批量窗口、私有路由/AA、复杂风控；只做必要的白名单、最短锁定、绩效费（HWM）、公募透明与私募“不公开持仓”的门控。

---

## 1) 架构总览

- On‑chain（合约）
  - `Vault4626`: 份额化金库（ERC‑4626），支持 v0 核心会计与最短锁定、绩效费（HWM 铸份额）、Public/Private 模式。
  - `Access`: 访问控制（`MANAGER`、`GUARDIAN`、`ADMIN`）、`Pausable`。
  - `Router`: 交易统一入口，金库只通过 Router 与白名单适配器交互（v0：现货 DEX + 1 条 perps）。
  - `IAdapter` + 具体适配器：`AdapterUniswapV3`、`AdapterSynthetixPerps`（最小可用）。
  - `Config`（内嵌或独立）：金库级参数（p、lock_min_days、assets_whitelist、visibility、privacy_mode）。
  - 事件/快照：`NavSnapshot`（A、L、S、PS）、参数变更、白名单变更、适配器变更等。

- Off‑chain（后端/工具）
  - `apps/backend`（FastAPI）：
    - 索引事件（NAV 快照、申赎、费率计提）与计算指标（年化、波动、Sharpe、回撤）。
    - 私募视图门控（仅展示 NAV/PnL 与绩效指标，不展示持仓）。
    - 调研工具：检查测试网目标资产/Perps 的可用性、价格基准。
    - 告警 Webhook：净值阈值/暂停/参数变更等事件转发。
  - DB：SQLite（v0）保存快照与指标缓存。

- Frontend（最小）
  - 列表与详情页：公募=透明（含持仓/交易）；私募=仅摘要和 NAV/PnL 曲线。
  - 发现页默认隐藏小金库（AUM < 阈值），可切换显示全部。

- 迁移预留（HyperEVM）
  - `Router/Adapter` 解耦协议差异；
  - 快照/事件结构保持稳定，可在新链重放；
  - `privacy_mode` 预留 `whisperfi`，v0 不启用。

---

## 2) 合约设计（v0）

### 2.1 Vault4626（核心）

- 继承：`ERC20`（份额）、`ERC4626`、`Pausable`、`AccessControl`。
- 关键参数（配置）
  - `asset`（ERC20）：底层计价与存取资产（建议 USDC/稳定币）。
  - `performance_fee_p`：绩效费率（默认 10%）。
  - `management_fee_m`：管理费（v0=0）。
  - `lock_min_days`：最短锁定天数（默认 1）。
  - `is_private`：是否为私募金库（影响申购门控与前端展示）。
  - `privacy_mode`：`none`（v0），预留 `whisperfi`（v1+）。

- 账户状态
  - `nextRedeemAllowed[account]`: 地址下次可赎回的 Unix 时间（简化实现：每次新申购后 `= max(old, now + lock)`）。
  - `HWM`：单位净值历史高点（18 位精度）。
  - `whitelist[account]`（仅私募）：是否允许地址申购。

- 会计与公式
  - 单位净值：`PS = (A − L) / S`（v0 约定 `L=0`）。
  - 申购（deposit）：`ΔS_dep = M / PS_before`；`A += M`，`S += ΔS_dep`。
  - 赎回（redeem/withdraw）：`Payout = X * PS_before`；`A -= Payout`，`S -= X`。
  - 绩效费（HWM）：如果 `PS > HWM`，`perfAssets = (PS − HWM) * S * p`；`ΔS_perf = perfAssets / PS`；铸给费收方；更新 `HWM = PS`。
  - 舍入：份额/资产转换向下取整，避免凭空增益；误差由事件可审计。

- 公募/私募
  - Public：任何人可 `deposit`/`mint`。
  - Private：仅 `whitelist` 地址可 `deposit`/`mint`；投前仅摘要展示由前端控制；链上不暴露持仓隐私（仅限制交互）。

- 交易执行（与 Router）
  - `execute(adapter, data)`：仅 `MANAGER` 调用，检查 `adapter` 在白名单；将 `asset/token` 授权给 Router/Adapter；`Adapter` 内部与目标协议交互。
  - v0 不做价格带/滑点预算/Reduce‑Only；仅白名单约束与可暂停。

- 事件（部分）
  - `Initialized(asset, manager, isPrivate)`
  - `Deposit(user, assets, shares)` / `Withdraw(user, shares, assets)`
  - `PerformanceFeeMinted(p, perfShares, newHWM)`
  - `LockUpdated(days)` / `WhitelistSet(user, allowed)` / `AdapterSet(adapter, allowed)`
  - `NavSnapshot(assets, liabilities, shares, ps, timestamp)`
  - `Paused()` / `Unpaused()`

- 错误（部分）
  - `ErrLocked()`（未到赎回时间）
  - `ErrNotWhitelisted()`（私募）
  - `ErrAdapterNotAllowed()` / `ErrAssetNotWhitelisted()`

- 不变量（invariants）
  - 申购/赎回不改变 `PS`；`PS` 仅由资产价值变化/铸费影响。
  - `S_after = S_before + ΔS_dep + ΔS_perf − ΔS_red`。
  - 经理无提币权；只有投资者赎回路径可转出底层资产。
  - 私募金库的 `deposit` 仅允许白名单地址。
  - `nextRedeemAllowed[msg.sender] <= block.timestamp` 方可赎回。

### 2.2 Router / Adapters

- Router 仅转发到已白名单的 `IAdapter`；保留对 `Vault` 的 `onlyVault`/`onlyManager` 校验。

- 接口 `IAdapter`
  - `function canHandle(address token) external view returns (bool)`
  - `function execute(bytes calldata data) external returns (int256 pnl, uint256 spent, uint256 received)`
  - `function valuation(address vault) external view returns (uint256 assetsInUnderlying)`（可选，v0 可返回 0，后台做估值）

- 现货适配器 `AdapterUniswapV3`
  - 最小化：`swapExactInput(tokenIn, tokenOut, amountIn, minOut)`；需要事先由 Vault 授权。

- Perps 适配器 `AdapterSynthetixPerps`
  - 最小化：`increasePosition(market, sizeDelta, marginDelta)`、`decreasePosition(...)`、`closePosition(...)`。
  - 估值：v0 可不在链上计算；后台读取协议可得的账户权益用于指标展示。

注意：v0 估值/NAV 可主要由后台基于事件与价格源计算；合约端通过 `NavSnapshot` 记录到账面 A/L/S/PS（A/L 由 Vault 维护为账面值）。

---

## 3) 数据模型（Off‑chain）

- 表 `vaults`
  - `address`、`asset`、`is_private`、`p`、`lock_min_days`、`visibility`、`created_at`

- 表 `nav_snapshots`
  - `vault`、`ts`、`assets`、`liabilities`、`shares`、`ps`

- 表 `fees`
  - `vault`、`ts`、`type`（performance/management）、`shares_minted`、`p`、`hwm`

- 表 `positions_public`
  - 仅公募：`vault`、`asset`、`qty`、`avg_px`、`ts`（从链上事件或适配器回写获取）

- 表 `metrics`
  - `vault`、`window_days`、`ann_return`、`ann_vol`、`sharpe`、`mdd`、`recovery_days`

- 表 `whitelist_private`
  - `vault`、`account`、`added_at`

- 表（新增）`orders`
  - `id`、`vault`、`venue`、`market`、`side`、`size`、`notional`、`leverage`、`reduce_only`、`tif`、`execution_channel`、`status`、`created_at`

- 表（新增）`fills`
  - `id`、`order_id`、`venue`、`price`、`qty`、`fee`、`ts`、`source`（ack/ws）

- 表（新增）`nav_snapshots`
  - `vault`、`ts`、`nav`、`merkle_root`

- 表（新增）`positions_state`
  - `vault`、`payload`（各 venue 仓位 JSON）、`updated_at`

---

## 4) 指标与计算（口径）

- 日收益 `r_d = (PS_d / PS_{d-1}) − 1`；缺失日用最近有效净值前向填充。
- 年化收益 `=(Π(1+r_d))^(365/N)−1`；年化波动 `= std(r_d)*sqrt(365)`。
- Sharpe `=(年化收益 − r_f)/年化波动`（v0 取 `r_f=0`）。
- 最大回撤：净值曲线的峰‑谷最大跌幅；恢复期：回到峰值天数。

---

## 5) 执行路径与渠道（v1 → v2）

- Exec Service 接收前端“订单票据”，校验 `venue_whitelist`、杠杆、名义等风险，并基于 `execution_channel` 路由：
  - `onchain`：直接调用链上 Router/Adapter。
  - `off_venue`：通过 Hyper SDK（或未来其它 venue SDK）下单，记录 Ack/Fills 并将回执写回链上/数据库。
- UserEventsListener / REST Ack => Indexer：汇总成交，更新 `positions.json`、`nav_snapshots.json`，触发 Alert Manager。
- NAV 计算：`NAV = 现金腿 + Σ(position × index_price)`；按窗口生成 NAV 序列与 Merkle root（可上链承诺）。
- 降级策略：当 off-venue 回执延迟或对账漂移超过阈值，触发 reduce-only、排队或拒单；不做集中清算。
- `ErrReduceOnly`（在 RO 模式下尝试开仓）

降级策略：
- 外部场所不可用 → 后台切换 `reduce_only`，前端提示，停止新开仓
- 对账失败 → 暂停下一批聚合，只允许减仓；UI 黄条“保守估值”

承诺：
- 固定指数价来源（或 SDK mids），落地频率（60s），NAV 计算公式，误差桶归集

---

## 6) 安全与治理（v0）

- 访问控制：`ADMIN`（平台）、`MANAGER`（调仓）、`GUARDIAN`（暂停）。
- 白名单：资产/协议与适配器层；私募地址白名单；
- 可暂停：紧急暂停 `deposit/withdraw/execute`。
- 参数变更：事件化记录；v0 可无时间锁，未来移交 DAO 并加时间锁。
- 迁移：事件/快照结构稳定，便于在 HyperEVM 重放。

---

## 7) 目录结构与开发环境

- 目录
  - `contracts/` Solidity 源码与 Foundry 测试
  - `apps/backend/` FastAPI 与 pytest
  - `apps/web/` 最小前端（可后置）
  - `docs/product/` 产品文档（PRD、计划）
  - `docs/architecture/` 技术设计与前端规范

- Windows + PowerShell + uv
  - 后端
    - `cd apps/backend`
    - `uv venv`
    - `uv add fastapi uvicorn pydantic-settings httpx web3 pytest pytest-cov ruff sqlalchemy aiosqlite` 
    - `uv run pytest -q`
    - `uv run uvicorn app.main:app --reload`
  - 合约
    - 安装 Foundry（本地、可跳过到后续）：`cargo`/`foundryup` 等；
    - `cd contracts && forge build && forge test -vvv`

---

## 8) TDD 计划与测试矩阵

- 合约单测（Foundry）
  - Vault 会计
    - `test_deposit_minting_conserves_PS()`
    - `test_withdraw_burn_conserves_PS()`
    - `test_hwm_perf_fee_minting_only_when_PS_gt_HWM()`
    - `test_precision_rounding_floor_no_free_shares()`
  - 锁定
    - `test_redeem_before_lock_reverts_ErrLocked()`
    - `test_new_deposit_extends_nextRedeemAllowed()`
  - 私募白名单
    - `test_private_vault_rejects_non_whitelisted_deposit()`
    - `test_whitelisted_can_deposit_and_redeem_after_lock()`
  - 访问与暂停
    - `test_only_manager_can_execute_router()`
    - `test_pause_blocks_external_actions()`
  - 适配器白名单
    - `test_execute_reverts_if_adapter_not_whitelisted()`

- 合约性质测试（可选）
  - Invariant: `totalAssets ≈ PS*S` 在允许的舍入误差内保持一致（在价格不变/不交易情况下）。
  - Invariant: 无人可通过直接调用把资产从 Vault 转走（除赎回路径）。

- 适配器集成测（本地/模拟）
  - `AdapterUniswapV3`: 使用本地池或 Mock 合约模拟 `swapExactInput`，验证授权与余额变化。
  - `AdapterSynthetixPerps`: 若测试网可用，则最小开/平仓调用回路；不可用则用 Mock 接口。

- 后端测试（pytest）
  - 指标计算：给定净值序列 → 年化/波动/Sharpe/回撤正确。
  - 事件索引：模拟合约事件 → 入库快照/费率事件 → 指标缓存更新。
  - 私募视图：公募显示持仓，私募仅显示 NAV/PnL 与指标。

- 端到端（本地 anvil）
  - 部署 → 创建 Public/Private Vault → 白名单私募地址 → 申购（PS=1）→ 模拟价格上涨并触发 HWM 计提 → 赎回解锁后到账 → 后端抓取并展示。

---

## 8) 接口草案（Solidity）

```solidity
// 核心：Vault4626 片段
interface IVaultEvents {
  event Initialized(address indexed asset, address indexed manager, bool isPrivate);
  event PerformanceFeeMinted(uint256 p, uint256 perfShares, uint256 newHWM);
  event LockUpdated(uint256 daysMin);
  event WhitelistSet(address indexed user, bool allowed);
  event AdapterSet(address indexed adapter, bool allowed);
  event NavSnapshot(uint256 assets, uint256 liabilities, uint256 shares, uint256 ps, uint256 ts);
}

interface IVault is IVaultEvents {
  function setWhitelist(address user, bool allowed) external;
  function setAdapter(address adapter, bool allowed) external;
  function setLockMinDays(uint256 daysMin) external;
  function setPerformanceFee(uint256 pBps) external; // 1000 = 10%
  function execute(address adapter, bytes calldata data) external; // onlyManager
}

// Router 与 IAdapter
interface IAdapter {
  function canHandle(address token) external view returns (bool);
  function execute(bytes calldata data) external returns (int256 pnl, uint256 spent, uint256 received);
  function valuation(address vault) external view returns (uint256 assetsInUnderlying);
}
```

---

## 9) 超出 v0 的预留点

- 锁期费曲线：`f_in(T), f_out(T)` 与事件化更新；
- Reduce‑Only：状态机与触发器；
- 容量函数：平方根冲击律与自动排队/提费/拒收；
- 批量窗口：窗口化申赎与统一成交；
- 私有/批量路由 + AA：CoW/Protect、Session Key 限权；
- WhisperFi：隐私执行/清白证明的接口与验真；
- 经理质押与削减：违规事件的经济惩罚路径。

---

## 10) 研究与实现依赖（与 PRD 对齐）

- 测试网与资产
  - 选择稳定测试网（Base/Arbitrum Sepolia）；确认 USDC/稳定币代币、DEX 可用性；
  - PAXG/XAUT 若缺乏流动性，v0 以稳定币 + 演示性 perps 为主。

- Perps（Synthetix 优先）
  - 目标测试网的市场/接口可用性；最小接口映射到 `AdapterSynthetixPerps`。

- 价格与估值
  - v0 合约侧允许账面 `A/L` 由 Vault 维护（保守）；
  - 后端计算 NAV/指标；若引入链上估值，优先 Chainlink 指数价。

- HyperEVM 迁移
  - Router/Adapter 地址映射表；
  - 快照/事件重放脚本；
  - 份额/HWM 初始值迁移策略与对账脚本。

---

## 11) 实施步骤（建议里程碑）

- M1（合约最小闭环）
  - Vault4626：申赎/锁定/HWM 绩效费/暂停/白名单事件。
  - Router + MockAdapter：打通 `execute` 路径与事件。
  - Foundry 单测通过。

- M2（后端最小展示）
  - 事件索引 + NAV/指标计算 + API；
  - 私募视图门控；
  - 告警 Webhook。

- M3（演示整合）
  - 公募与私募金库创建/申赎/指标可视化；
  - 如测试网允许，接入 1 条 perps；否则使用 Mock 展示接口与调用链。

---

## 12) 命令速查（PowerShell）

- 后端
  - `cd apps/backend`
  - `uv venv`
  - `uv add fastapi uvicorn pydantic-settings httpx web3 pytest pytest-cov ruff sqlalchemy aiosqlite`
  - `uv run pytest -q`
  - `uv run uvicorn app.main:app --reload`

- 合约
  - `cd contracts`
  - `forge build`
  - `forge test -vvv`
  - 覆盖率：`forge coverage --report lcov`（可结合 `genhtml` 生成报告）

Windows 安装 Foundry（提示）
- 推荐 WSL 或包管理器（如 scoop/choco）安装 Foundry；或参照 Foundry 官方文档下载安装脚本。
- 若不方便安装，可先审阅与改动合约/测试，后续在 CI 或其他环境跑 `forge` 测试与覆盖率。

---

附注
- v0 尽量保持“公募像 Hyper、一看就懂；私募不公开持仓”，以叙事为主。
- 尽可能将复杂度留到 v1+，但保留抽象层与事件标准，便于增长与迁移。

---

## 13) 网络与执行选择更新（重要）

- 背景：Synthetix 近期退出 Base，短期难以在 Base 测试网直连合约 perps。
- 决策：
  - 演示链：继续支持 Base Sepolia（已有部署与前端读取）
  - 执行/行情：v1 采用 Hyper Testnet，对接 Hyperliquid API 作为 perps 来源（详见 ./HYPER_INTEGRATION.md）
  - 架构：链上金库与服务端执行解耦；会计以 Exec/行情侧数据生成 NAV 承诺

影响与行动：
- Hardhat 已新增 `hyperTestnet` 网络占位（hardhat/hardhat.config.ts），待提供 RPC 与 chainId 即可部署
- 文档新增：architecture/HYPER_INTEGRATION.md、architecture/ARCHITECTURE.md、ops/CONFIG.md
- 前端保持链上读数 + 后端指标，perps 明细仅在 v1 后端展示，私募不公开持仓

跨市场扩展：
- v1：维持 Hyper Testnet 作为主执行场；新增多市场行情/指标抽象，以便后续适配。
- v2：为 Polymarket、美股、贵金属、期权等接入 Adapter，仍由各 Vault 独立路由执行；平台负责额度、限权、指标与告警，不集中仓位。

---

## 14) Hyper 集成要点（核对自官方文档）

- API Base：Mainnet https://api.hyperliquid.xyz · Testnet https://api.hyperliquid-testnet.xyz
- HyperEVM RPC：https://rpc.hyperliquid.xyz/evm
- SDK：优先使用 Python SDK（apps/backend 集成），实现 open/close/reduce 与权益读取
- 会计：NAV = 现金腿 + Σ(持仓权益)；周期性承诺（hash）供前端/审计校验
- 权限：Exec Service 使用服务账号与限权策略（额度/频次/白名单）
