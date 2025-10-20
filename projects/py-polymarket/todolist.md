茂禄驴# Continuous Online Simulation & Monitoring TODO



- [x] Configure `.env` with online credentials (`POLY_OFFLINE_MODE=false`, `CLOB_REST_URL`, `CLOB_WS_URL`, API key triplet, `POLY_PRIVATE_KEY`).

- [x] Verify dependency footprint (`pip install -r requirements/base.txt` and `pip install -e .`).

- [x] Author automation script (e.g., `scripts/run_online_simulation.py`) that loops `polymarket-simulate` and timestamps reports.

- [x] Adjust script output naming to `reports/simulation_report_*.json` for monitor compatibility.

- [x] Create wrapper/launcher (PowerShell or Make target) that starts both the simulation loop and monitoring UI (`polymarket-launch monitor`).

- [x] Document start/stop instructions in README or CHANGELOG follow-up section.

- [x] Add optional analytics step (e.g., script summarizing recent simulation reports) to evaluate strategy win rate.

## New Priority (2025-10-14) – 事件驱动策略优化

- [x] 参数外显与接入（优先）
  - [x] 在注册表接入可调参数：`require_true_source`, `non_news_conf_scale`, `max_age_seconds`, `decay_half_life_seconds`, `volume_spike_multiplier_non_news`（见 `src/polymarket/strategies/registry.py`）。
  - [x] 在 `config/strategies.yaml` 下调 `min_confidence→0.30`、`volume_threshold→5000`，并启用 `require_true_source: true`、`non_news_conf_scale: 0.65`、`max_age_seconds: 1800`、`decay_half_life_seconds: 900`。
- [x] 数据富化强化
  - [x] 给所有情绪读数（含回退）写入 `sentiment_updated_at`，触发新鲜度与半衰衰减逻辑（`src/polymarket/data/enrichment.py`）。
  - [x] 情绪提供方走代理（若配置）：为 NewsAPI/Twitter Session 设置 `settings.PROXY_URL` 代理（`src/polymarket/data/sentiment_provider.py`）。
- [x] 策略评估逻辑增强
  - [x] 识别真实来源别名（`newsapi`/`twitter` 等），其他视为合成来源；合成来源须观察到 `volume` 脉冲且放大 `spike_effective`。
  - [x] 置信度乘以 `sentiment_confidence`（富化生成），并对合成来源按 `non_news_conf_scale` 下调；记录 `spike_effective` 与 `expected_duration_seconds` 以利退出策略。
- [x] 运行验证与监控
  - [x] 观察 `reports/decisions.jsonl`/`fills.jsonl`/`realized_exits.jsonl`，记录 `event_*` 触发与退出原因占比；输出 24 小时回顾报告（新增 `scripts/analyze_event_driven.py`）。
  - [x] 在 REST 采集路径透出 `sentiment_telemetry` 到 `pipeline_status`；后续在监控面板展示情绪来源占比与新鲜度分布（UI 待做）。
- [x] 稳健性与节流
  - [x] 为 `SentimentProvider` 的外部请求增加指数退避+速率限制（轻量 RL），避免 429/5xx 抖动放大。
  - [x] 为事件驱动增加可选风险闸：仅在 `risk_level ∈ {LOW, MEDIUM}` 时触发（`allowed_risk_levels`）。
- [ ] 调参与放量计划（按梯度推进）
  - [ ] 若触发偏少：`volume_threshold ↓ 3000` 或 `sentiment_weight ↑ 0.6–0.65`；若偏噪：`min_confidence ↑ 0.35–0.40` 或 `sentiment_floor ↑ 0.08`。
  - [ ] 运行 24–72 小时后，按报告调参并固化到 `config/strategies.yaml`，附带变更理由与前后对比（胜率/回撤/样本量）。
- [ ] 归因与评估工具（配合策略权重决策）
  - [ ] 扩展 `scripts/strategy_markets_winrate.py`：基于 `strategy_metadata.strategies` 中 `confidence×size_hint` 做加权归因；新增“按退出策略归因”的胜率统计。
  - [ ] 在日报中单列 `event_driven` 的胜率、平均持有、滑点与费用，并与其他策略拆分对比。

## Completed (2025-10-13) – Order Lifecycle

- [x] Order State Streaming: add private CLOB order-status WebSocket client (env?gated) with JSONL reconciliation; safe defaults.
- [x] Runner integration: maintain WS subscriptions from current snapshots; expose `fetch_info.orders_ws` with health/cooldown.
- [x] REST fallback (phase 1): best?effort polling via `py_clob_client` for user orders when WS is degraded/disabled; normalized events written to JSONL.
- [x] Dashboard panel: show Approvals/Rejects/Fills/Partials/Pending + recent order events.

## Completed (2025-10-13) – Order Lifecycle Phase 2

- [x] REST reconciliation v2: stronger dedupe（status + filled delta），分页游标支持，多状态机对齐。
- [x] UI mini-cards: 展示 `orders_ws` + `orders_rest` 状态，加入错误计数与最近成功时间。

## Completed (2025-10-13) – Tooling

- [x] OrderStore replay tool: `scripts/replay_order_store.py` 支持按时间/市场/方向过滤 orders/trades JSONL，并输出聚合统计或尾部样例；支持 `--csv` 导出。

## Completed (2025-10-13) – Risk Audit

- [x] 持久化风险审计：将 RiskEngine 评估结果（approved/factors/size/market/side）写入 `reports/risk_audit.jsonl`，并将写入失败计数纳入 `pipeline_status.io_errors.risk_audit` 以便监控。

## New Priority (Stability & Performance)

- [x] Fix aiohttp session leakage in data ingestion (ensure REST provider closes ClientSession cleanly; monitor `_metrics` for inflight drift).
- [x] Add sentiment-provider telemetry: report live vs fallback usage to `reports/pipeline_status.json` so dashboard can show external source health.
- [x] Harden VAR estimation with robust outlier handling (e.g., MAD trimming + Harrell-Davis), include confidence range in risk metadata/pipeline output.
- [x] Add liquidity-aware exit scheduling (TWAP/maker-style) for low-liquidity fills; persist order dedupe history to durable storage (sqlite/CSV).
- [x] Extend dashboard Execution Telemetry to display internal vs external micro-arb signals and per-strategy hold/reject counts.
- [x] Script to auto-build `micro_arbitrage_reference_pairs` (e.g., via GraphQL grouped by condition_id), updating runtime config.



## Top Priorities (2025-10-05)

- [x] Tiered exit tuning: revisit `TIERED_TP_SL_SOFT_STOP_PCT`, `TIERED_TP_SL_HARD_STOP_PCT`, and `TIERED_TP_SL_TRIM_RATIO` so stage-1 trims do not immediately cascade into full liquidation.
- [x] Add post-stop cooldown logic to suppress immediate re-entry after `tp_sl_stage1` partial exits.
- [x] Re-evaluate kill-switch recovery knobs (`trading.daily_loss_recovery_ratio`, cooldown minutes) to slow sizing ramp following large drawdowns.

- [x] CRITICAL: Exit/Settlement pipeline (sell + resolution)

  - [x] Add resolution watcher to detect market resolution and winning outcome; realize PnL on resolution and write to `reports/realized_exits.jsonl` and `reports/realized_summary.json`.

  - [x] Externalize exit/cost parameters (DONE): see `config/runtime.yaml:execution` and consumption in `config/settings.py` and `src/polymarket/services/runner.py`.

  - [x] Add smoke test: force time-based exit with offline fixtures to validate open??exit??summary pipeline.

- [x] Strategy config hardening (config/strategies.yaml)
  - [x] event_driven: set `volume_threshold >= 10000`, `min_confidence >= 0.35`.
  - [x] micro_arbitrage: set `min_net_edge >= 0.004` and require `external_spread < 0.05` (enforce in strategy).
  - [x] momentum_scalping: set `threshold 0.02~0.03`, `min_confidence >= 0.20`.
  - [x] mean_reversion: add `min_deviation 0.05~0.08` and `require_non_negative_momentum: true`.
- [x] Strategy execution polishing (PRIORITY)
  - [x] Add partial-fill tracking and order lifecycle reconciliation so CLOB fills update positions/slippage correctly.
  - [x] Differentiate maker vs taker fees per venue in cost-budget logic and sizing, sourcing live fee config instead of fixed taker assumptions.
  - [x] Promote WebSocket streaming (`SERVICE_USE_WS=true`) as default data path with health monitoring and automatic REST fallback when WS degrades.
- [x] StrategyEngine gates (src/polymarket/strategies/engine.py)
  - [x] Promote `strategy.signal_floor` into config/settings so it can vary by environment (runtime.yaml) and default to 0.12.
  - [x] Implement a consensus gate requiring at least two aligned strategies (configurable via `runtime.strategy.consensus_min`).
  - [x] Apply execution-cost budget filtering using `taker_fee`, half-spread, and `EDGE_RISK_PREMIUM` from settings before enqueueing orders.
  - [x] Extend strategy debug logging/tests to confirm signals explain why they were gated or accepted.
- [x] Risk engine tuning (src/polymarket/risk/engine.py + config/runtime.yaml)

  - [x] Expose and lower `volatility_risk_ceiling` to `0.15~0.20` via config; ensure VAR/liquidity checks use it.

  - [x] Wire `max_single_order_ratio` to `settings.trading.max_single_position` (single source of truth).

- [x] Externalize exit/cost params (src/polymarket/services/runner.py + config/runtime.yaml)

  - Move `EXIT_*` and `TAKER_FEE`/`EDGE_RISK_PREMIUM` to config with sane defaults; add A/B toggles for exit policy.

  - Add slippage model selector `{taker, maker_limit, mid}` and per-venue slippage settings.

- [x] Trade telemetry (src/polymarket/execution/engine.py)

  - [x] Implement execution recorder (JSONL) capturing timestamps, side, size, quote, fill price, slippage, fees, `execution_mode`.

  - [x] Surface telemetry path via settings and ensure monitoring/report jobs consume the new feed.

  - [x] Add regression test/offline fixture to validate telemetry schema when execution events fire.

- [x] Exit policy tuning (config/runtime.yaml + runner)

  - [x] Widen stop-loss buffer (>=0.05) or extend min hold so entries aren't instantly stopped.

  - [x] Confirm exits honour revised thresholds with live fills (analysis run 2025-10-09; results show no improvement, follow-up tuning required).

- [x] Strategy gating diagnostics

  - [x] Review consensus_min/signal floor against today's holds and adjust to regain signal throughput.

  - [x] Add monitor metric/log snapshot for hold reasons per loop.

- [x] Telemetry enrichment follow-up

  - [x] Populate slippage/price fields in `reports/fills.jsonl` and update dashboard to surface them.

- [x] Legacy position cleanup

  - [x] Close or re-mark stale position `0x830eb792fa2f...` so exposure snapshot is current.

- [x] Data validation noise reduction (src/polymarket/data/validation.py)

- [x] Market ingest performance (REST + WS)

  - [x] Wire `SERVICE_USE_WS` into DataIngestionFacade cache so core loop can consume WebSocket streaming updates (fallback to REST when WS disabled).



  - [x] Maintain lightweight market registry: subscribe via WS for top tokens, rely on REST batching for cold-start or misses; make asset list configurable.

  - [x] Implement SERVICE_REST_MAX_CONCURRENCY knob and semaphore-limited batch fetch so REST fallback stays within venue guidance.

  - [x] Add SERVICE_REST_RATE_LIMIT_PER_SEC token bucket (async) to smooth burst traffic and honour 429 backoff guidance.

  - [x] Emit ingest metrics (latency histogram, in-flight concurrency, 429 count) to reports/pipeline_status.json for monitoring.

  - [x] Implement adaptive cache TTL (shorter when WS idle, longer when updates frequent) and expose metrics for REST latency / 429 hit rate.



  - Treat computed `mid_price/spread/volatility` as filled to avoid optional-field spam; keep only material warnings.

  - [x] Add readiness summary per strategy to `reports/pipeline_status.json`.

- [x] Live data verification tasks

  - [x] Confirm provider `best_bid/best_ask` are used end-to-end (facade/enrichment/strategy) in online mode (refer to scripts/verify_market_fields.py).

  - [x] Verify `volatility` is present in raw markets and is consumed by risk sizing (see scripts/verify_market_fields.py output and risk engine usage).

- [x] Fee schedule alignment

  - Confirm Polymarket current taker/maker fee and min tick; update `TAKER_FEE` and cost budget accordingly.

- [x] Regression checks

  - Run offline/online simulation A/B (pre/post changes) and summarize: approved rate, average size, realized exits, PnL.



## Immediate Priorities (2025-10-09)

- [x] Recovery mode playbook: lower `trading.daily_loss_recovery_ratio` to ≤0.20, cap `max_orders_per_loop` at 4, clear `reports/kill_switch_state.json`, and relaunch the stack to confirm small-size fills while kill-switch recovery is active.

- [x] Spread gate triage: review `reports/pipeline_status.json` rejects, widen `STRATEGY_MAX_SPREAD_BPS` to ~2200, and prototype a 24h-volume based dynamic spread ceiling for the next iteration.

- [x] Exit/hold alignment: raise `strategy.signal_floor` to ≥0.15, bump `exit_policy.stop_loss_pct` toward 0.06–0.07, and extend `min_hold_seconds` so `tp_sl` exits stop dominating realized losses.

- [x] Market blacklist sweep: rank `reports/fills.jsonl` by cumulative PnL per `market_id` and populate `STRATEGY_BLACKLIST` with the worst offenders until spreads/liquidity recover.

  - [x] Holding-time & confidence analysis: slice `reports/fills.jsonl` by holding duration (≤120/300s) and entry confidence to pinpoint premature `tp_sl` triggers.

  - [x] `tp_sl` reduction plan: tiered exit logic enabled (monitor results via analytics).

    - [x] Prototype staged exit policy (50% trim + wider trailing stop) implemented via `execution.exit_policy.tiered_tp_sl`.

    - [x] Implement feature flag in runner to toggle new exit behaviour and capture A/B metrics.

    - [x] Adjust staged parameters: soft stop 2.5%, hard stop 7%, trim ratio 0.7 (update runtime.yaml) and rerun analytics.

    - [x] Run historical/dry-run A/B comparison to validate staged exits vs legacy `tp_sl` (results logged in docs/tiered_exit_plan.md).

  - [x] Market clamp follow-up: tightened blacklist with top loss markets; add exposure-cap review to next sprint.

  - [x] Strategy-stage metrics: logged stage counts (no stage1 yet); adjust strategy weighting once stage1 data appears.

- [x] Daily exit analytics: automate pre/post parameter comparison (reason distribution, per-market PnL) and alert when `tp_sl` share exceeds 70%.



## New Priorities (2025-10-02)

- [x] Monitor risk metrics in runtime logs/dashboard once live data resumes.

- [x] Backtest revised strategy mix against archived market data to confirm diversification gains.

- [x] Monitor REST ingest in production (alert on repeated fallbacks and revisit endpoint compatibility).

- [x] Stabilize REST market ingest (GraphQL temporarily disabled): verify REST endpoints, add offline fallback, and log failures for later GraphQL re-enablement.

- [x] Rebalance strategies: tighten event-driven logic (require non-zero sentiment / bidirectional signals) and lower activation thresholds for mean reversion, momentum, and arbitrage once enrichment fields are verified.

- [x] Revisit sizing controls: review `settings.trading.min_position_size` and `max_single_position` so order sizes can scale with signal strength.

- [x] Feed risk analytics: ensure `MarketDataService` writes timestamped price data for `DatabaseManager`, then add an integration test proving VaR/liquidity checks work with real snapshots.

- [x] Clean runtime packaging: remove lingering `polymarket.monitor` references by reinstalling the editable package and clearing obsolete wheels before relaunching the monitor.



## Next Priorities (2025-10-03)

- [x] Backtest with attribution (priority). Run a larger sweep and compute realized PnL/win-rate + per-strategy attribution.

    - [x] Script scaffold (reports/backtest_summary.json); pending real backtest run.

  - Command: `polymarket-backtest --offline --markets 200 --limit 100 --output reports/backtest.json`

  - [x] Follow-up: add a small summarizer to aggregate per-strategy results into `reports/backtest_summary.json`.

- [x] Strategy loss clustering: aggregate `reports/fills.jsonl` by `strategy_metadata/exit_reason` to identify the worst combinations and drive re-weighting/blacklist decisions (in progress via stage metrics).

- [x] Time-exit refactor: replace hard TTL exits with tiered logic (reduce size first, then exit) and document the results in `reports/pipeline_status.json`.

  - [x] Dynamic spread ceiling: derive 24h-volume tiers and set matching `max_spread_bps` values for the strategy gate.

  - [x] Integrate exit analytics into monitoring: surface `exit_analytics.json` on dashboard and wire tp_sl alert into ops notifications.

- [x] Online simulation: realize PnL. Add a simple closure/holding-horizon in the simulation loop so `performance_metrics` includes non-zero `closed_trades`, `win_rate`, and `total_return` in `simulation_report_*`.

- [x] Risk alignment and exposure cap. Align `RiskEngine(max_single_order_ratio)` with `settings.trading.max_single_position` (e.g., 0.06) and add a `max_total_exposure` gate to limit concurrent open positions across markets.

- [x] Strategy attribution in reports/monitor. Emit `strategy_performance` into `simulation_summary` and render in the dashboard to see which strategies drive outcomes.

- [x] Event-driven data sources. If `NEWSAPI_KEY`/`TWITTER_BEARER_TOKEN` are valid, integrate true news/social signals; otherwise keep the current volume/price-based fallback. Record `sentiment_source` in reports for transparency.

- [x] One-click Windows starters. Update `start_*.bat` to call `scripts/launch_online_stack.ps1` and pass through parameters (`-Port`, `-Markets`, `-Limit`, `-Interval`).

- [x] Live data coverage check (recurring). On each probe, verify required fields exist for active strategies and write a brief coverage summary to `reports/pipeline_status.json` (e.g., readiness per strategy).



## Findings & Actions From Live Backtest (2025-10-04)

- Position sizing and PnL model

  - [x] Use share-based accounting in backtests: shares = `notional / entry_price`; PnL = `shares * (exit - entry)`; include taker-fee and slippage assumptions.

  - [x] Expose entry/exit model switch: `{taker, maker-limit, mid}` with configurable slippage per venue; default to taker for realism, maker for conservative sizing.

- Exit/holding policy

  - [x] Add time-stop (e.g., 60–300s) + protective stops: `stop_loss_pct=5%`, `take_profit_pct=10%`, and break-even stop after +5% move.

  - [x] Run small grid search over holding horizon vs. win-rate/return and persist the frontier to `reports/backtest_frontier.json`.

- Strategy gates (reduce false “yes” bias)

  - [x] Mean reversion: require non-negative short-term momentum before taking long; skip extremes (`mid_price<0.08 or >0.92`); add minimum distance to target (e.g., ≥0.06).

  - [x] Micro arbitrage: require real external prices (not derived) and minimum liquidity (`order_liquidity` threshold); gate on `(external_bid - local_bid) - (local_ask - local_bid) >= min_net_edge`. (implemented in strategies/simple.py: MicroArbitrageStrategy external/internal gating; external edge accounts for taker fee; tests in tests/strategies/test_strategy_filters.py and tests/strategies/test_strategy_engine.py)

  - [x] Event-driven: when `sentiment_source != news/social`, down-weight confidence or require larger volume spike; when keys available, switch to real sources.

  - [x] Momentum scalping: require directional confirmation across 1h/24h and avoid signals against mean-reversion bias unless confidence > 0.7.

  - [x] Strategy filter alignment: add shared spread, volume, and liquidity gates so simple strategies skip thin books before evaluating signals.

  - [x] Momentum normalization: scale momentum bias/confidence by volatility (ATR) and enforce minimum liquidity thresholds to avoid oversized signals.

  - [x] Micro-arbitrage liquidity safeguards: incorporate venue liquidity and external fee assumptions into net-edge checks before emitting trades.

  - [x] Event-driven recency decay: damp confidence for stale events and bypass redundant enrichment when REST sentiment data is already provided.

  - [x] Mean-reversion state hygiene: prune resolved markets from history buffers and cache metrics within each loop to prevent stale calculations.

  - [x] Fallback-aware strategy behavior: on ingest fallback (e.g., stale WS), optionally skip listed strategies (`STRATEGY_SKIP_ON_FALLBACK`) or downsize per-strategy (`STRATEGY_SIZE_SCALES_ON_FALLBACK`). Implemented in services/runner.py; documented in README.

- Risk

  - [x] Lower `max_single_position` from 6%→3% for live; add `max_total_exposure` (e.g., 15%) and daily loss kill-switch (e.g., -2%).

  - [x] Add per-market cap to prevent multiple overlapping orders in same market within short window.

  - [x] Retune simulation risk caps so sizing can pass (adjust `max_single_position`, per-market exposure, cooldown) and capture resulting telemetry for review.

- Data quality

  - [x] Silence optional-field warnings by accepting `volatility_24h/volatility_1h` as optional equivalents; do not overwrite REST external prices in enrichment.

  - [x] Market identifier enrichment: guarantee `market_id`/`token_id` are preserved from REST/WS payloads into strategy outputs (`snapshot.raw`, order metadata, open_positions). Add alert if any order emits `market_id=unknown`.

  - [x] Validate momentum/price-change scaling against real CLOB fields; rescale simulated fields or swap to official endpoints so `momentum` stays within realistic bounds.

  - [x] Integrate orderbook depth checks (Per outcome size/TWAP) before sizing to stop overestimating liquidity.

- Reporting/monitoring

  - [x] Show realized PnL and win-rate in the dashboard when backtest-with-PnL is used; render per-strategy PnL table.

  - [x] Export CSV for each live backtest automatically and append to a cumulative ledger `reports/backtests_ledger.csv`.



## Priority Sprint (2025-10-04)

- [x] Position accounting (shares + taker marks). Persist `shares/notional/entry_yes` and compute PnL% on exit.

- [x] Strategy-aware exits. Add EV dead-zone (|p??mid|≤cost), trailing (+3%/-2%), invalidation (edge flip), TTL(min/max) with hard SL/TP.

- [x] VaR + Liquidity sizing. Clamp by `cap_liq = balance*max_single_order_ratio` and `cap_var = allowed_loss/|VaR_5%|` with runtime balance scaling.

- [x] Risk/size params. `max_single_position=1%`, `min_position_size=10`; align RiskEngine `max_single_order_ratio=1%`.

- [x] Micro-arbitrage net-edge gating. Require real `external_bid/ask`; net_edge > taker_cost; exit on edge≤cost.

- [x] Mean-reversion filters. Add `min_deviation=0.06` and `require_non_negative_momentum` before long bias.

- [x] Engine base clamp. Limit proposed base by `initial_balance * max_single_position` prior to scaling.

- [x] One-click start/stop docs. README Usage: start/stop/backtest/summarize; add `scripts/stop_stack.ps1`.

- [x] Robust VaR estimate. Trim outliers and use robust quantile (e.g., Harrell-Davis) for sizing.

- [x] Dashboard realized PnL + exit reasons. Surface realized metrics and reason distribution.

- [x] Exposure caps. Add per-market & per-strategy caps in risk gate.

- [x] Liquidity-aware exits. Add basic maker/TWAP scheduling for low-liquidity exits.



## Immediate Hotfix Plan (2025-10-04)

- [x] Size orders using real-time balance. Rescale StrategyEngine output size by `portfolio.balance / settings.trading.initial_balance` (respect `min_position_size`).

- [x] Fix invalid market_id before submission. If order.market_id is empty/unknown, fallback to `snapshot.market_id`; validate format and skip invalid.

- [x] Add lightweight positions + exits. Persist open positions to `reports/open_positions.json` and auto-generate exit orders with:

  - time-stop (default 300s), stop-loss 5%, take-profit 10% (configurable constants inside runner).

  - Exit orders bypass VaR/liquidity risk checks (risk shouldn’t block closing).

- [x] Align StrategyEngine base-sizing with runtime balance (longer-term refactor: accept portfolio at construction).

- [x] Add total exposure cap + per-market cap in risk gate.



## Order State Streaming (DONE)

 - [x] Implement CLOB order-status WebSocket client (subscribe to order/lifecycle topics where available) and map to internal schema.
 - [x] Add REST polling fallback and reconciliation into lifecycle (submitted/partial/filled/cancelled) when WS is disabled or stale.
- [x] Persist lifecycle updates into `reports/orders.jsonl` (submissions/rejections/updates) and `reports/trades.jsonl` (fills), reusing `OrderStore`.
 - [x] Reconcile with runner `open_positions` and per-strategy exposure state; update strategy hold/reject breakdown accordingly.
 - [x] Dashboard: add Order Status panel (latest lifecycle updates, partials, pending, per-strategy rate-limit counters).
 - [x] Configuration flags: `SERVICE_USE_ORDER_WS` (enable/disable), `ORDER_WS_ASSET_LIMIT`, `ORDER_WS_COOLDOWN_SECONDS` (backoff), reuse freshness/fallback fields in `fetch_info`.

## 真实线上交易（Go?Live）待改动清单（先不修改代码）

- 执行引擎（ExecutionEngine）

  - [x] 新增 `DRY_RUN` 环境开关：即使提供私钥也可只读模拟（从 `config/env.py`/`settings.py` 读取）。

  - [x] 金额单位与小数位校准：按 USDC/合约要求进行单位换算（例如 6 位小数），避免 `int(amount)` 直接截断；将换算逻辑集中到一个帮助函数并在下单前校验。

  - [x] 价格边界/滑点保护：基于顶级档位/最近成交价设置允许偏离阈值；超过阈值拒单并写明原因。

  - [x] 幂等与去重：为同一市场在短周期内的重复信号加去重键（market_id+方向+时间窗），防止重复下单；在本地持久化订单意图以便重启恢复。



- 风险控制（RiskEngine）

  - [x] 与配置对齐：将 `max_single_order_ratio` 与 `settings.trading.max_single_position` 保持一致，并通过设置可调；新增 `max_total_exposure`（总敞口上限）。

  - [ ] 日内风控开关：增加日亏损阈值/拉闸机制（持久化并跨重启生效）。

  - [x] 频率与市场限额：每周期最大下单数、单市场持仓上限、单策略权重/仓位上限。 (已实现：全局频率 `trading.order_frequency`、每策略与每策略×每市场限流 `trading.strategy_order_frequency`，代码在 services/runner.py；单市场持仓上限 `trading.max_positions_per_market` 与每策略敞口上限 `STRATEGY_EXPOSURE_CAPS` 生效)

  - [x] 将风控拒单原因写入订单 JSONL，串联“策略→风控→执行”链路（已在 `orders.jsonl` 的 reject 事件 metadata 中记录；`risk_audit.jsonl` 另行存档明细）。



- 持仓与结算

  - [ ] 建立订单/交易/持仓数据层（本地 DB 或轻量 JSON）用于跟踪成本、持仓、市值与已实现 PnL。

  - [ ] 接入 CLOB 下单与状态查询，处理拒单/超时/部分成交；根据成交结果更新敞口与持仓。

  - [x] 文档化 `orders.jsonl`/`trades.jsonl` 字段及示例（见 `docs/OPERATIONS_GUIDE.md` 第 16 节）。

  - [ ] 提供基于 OrderStore 的本地导出/回放脚本，可按时间范围或市场过滤输出。



- 数据与富化

  - [ ] 确保富化阶段不覆盖 REST 提供的 `external_bid/ask` 真值（当前存在被模拟外部价覆盖的风险）。

  - [ ] WebSocket/流式（如可用）用于订单状态与价格刷新；否则优化 REST 轮询与退避策略。



- 监控与告警

  - [ ] 在交易循环写入 `reports/pipeline_status.json`（含 `loop_summary` 与 `exec` 指标、RPC 错误计数、退避状态）。

  - [ ] 报告与面板补充：已实现 PnL、持仓价值、按策略归因；显示余额（USDC/MATIC）与 RPC 延迟。

  - [x] 在监控面板展示最新订单/成交快照（Order Lifecycle 面板），并对 JSONL 写入失败计数（io_errors）在横幅做告警提示与小卡片展示。

  - [ ] 告警：RPC 连接失败、API 连续错误、批准率异常、余额/燃料费不足、异常滑点、日亏损触发等。



- 安全与密钥

  - [ ] 机密从环境注入，提供安全存储方案（Windows Credential Manager/加密文件）；日志脱敏（不打印密钥/地址私密信息）。

  - [ ] 密钥与 API 凭证轮换流程文档化；失败时自动切换到 `DRY_RUN` 模式。



- 部署与运维

  - [ ] 启动器增强：`scripts/launch_online_stack.ps1` 同时后台启动 `polymarket-launch trade` 与监控，并附健康检查提示。

  - [ ] 提供 Windows 任务计划或 Docker Compose/K8s 清单，用于自动重启与日志收集。



- 验证流程（上线前）

  - [ ] Dry?Run：无私钥运行 `polymarket-launch trade`，观察面板 `Loop Processed/Approved` 与日志。

  - [ ] 小额真实资金灰度：极小 `max_single_position` 下发送一笔限价单，核对单位、费用与回报路径；通过后再扩大限额。





























- [x] Design per-strategy exit interfaces (capture strategy-specific state in positions)
- [x] Implement mean_reversion + momentum exit evaluators and integrate with runner
- [x] Add event_driven-specific exit flow (event-driven trailing or hold-to-resolution path)
- [x] Update runner to prioritize strategy-specific exits before fallback logic
- [x] Dry-run verification + telemetry review for strategy-specific exits

## New Priorities (2025-10-14) — Post-2025-10-13 Analysis

- [x] CRITICAL: Concentration risk clamp
  - [x] Set `trading.max_positions_per_market=1` and restart stack.
  - [x] Add per-market daily-loss kill-switch (spec + implement) with conservative default (1% balance per market/day).
  - [x] Blacklist or cap worst markets from 2025-10-13: `0x1c7280…0987`, `0x0b6aae…5355` (also set `per_market_exposure_caps=10`).

- [x] Exit/time controls
  - [x] Reduce `execution.exit_policy.holding_seconds` to 480.
  - [x] Retune tiered stops: soft 4%, hard 10%, keep `trim_ratio=0.35`; validate via dry-run.
  - [x] Increase `execution.entry_cooldown_seconds` to 900 to suppress rapid re-entries.

- [x] Spread/liquidity gating
  - [x] Tighten `strategy.spread_volume_tiers` top-tier `max_spread_bps` 800→600; set global `max_spread_bps` 1000.

- [x] WS hot-asset tuning
  - [x] Raise `SERVICE_WS_ASSET_LIMIT` to 20 and set `SERVICE_WS_MIN_SCORE=2500` via launcher; sticky(180s)/ttl(900s) kept; static list supported by `-StaticAssets`.

- [x] Strategy gating (momentum 1h reversal)
  - [x] Raise activation globally: `strategy.signal_floor=0.25`, `consensus_min=3`.
  - [x] On ingest fallback, configure skip/scale via env; launcher supports `-FallbackSkip` and `-FallbackScale` and applied in current run.

- [x] Analytics & verification
  - [x] Add `scripts/run_daily_analytics.ps1` to run/schedule daily analytics; one-shot run completed and wrote `reports/exit_analytics.json`.
  - [x] Offline A/B with above params (`POLY_OFFLINE_MODE=true`); add `scripts/run_offline_ab.py` and write `reports/ab_offline_result.json`.


## Updates (2025-10-14)

- [x] Monitor sentiment UI: add Sentiment Telemetry section (source mix, freshness, fallback reasons) backed by /api/data payload (pipeline.sentiment).
- [x] Event-driven analyzer: add vg_holding_seconds, weighted slippage, and total_fees to scripts/analyze_event_driven.py output.
- [x] Weighted attribution: add exit_strategy_breakdown to scripts/strategy_markets_winrate.py for per-strategy exit wins/losses and PnL.


- [x] Dashboard: add Event-Driven Exits table (counts for current vs previous 24h) powered by exit_analytics.reason_counts (event_*).


- [x] Dashboard: wire in Event-Driven metrics (wins/losses/win rate/avg hold/slippage/fees) using reports/_analysis_event_driven_last24h.json when available.


- [x] Daily report: include event_driven metrics (wins/losses/win rate/avg hold/slippage/fees) in scripts/analyze_yesterday.py and /api/data via event_driven.
- [x] Dashboard: show Event-Driven source mix table (last 24h) using analyzer entries_by_source.
- [x] Scheduler: extend scripts/run_daily_analytics.ps1 to run exit reasons, event-driven, and daily summary on an interval.
- [x] Scheduled analyzer run: ensure register_scheduled_tasks.ps1 calls run_daily_analytics.ps1 (already wired) to refresh both exit and event-driven reports.
- [x] 日报：新增 scripts/report_daily_strategy_metrics.py 生成 per-strategy 胜率/持有/滑点/费用（含 event_driven vs others 聚合）。
- [x] 调参与放量：新增 scripts/recommend_event_driven_params.py 基于 24h 分析给出参数建议（支持 --apply 写回 strategies.yaml）。
- [x] Dashboard: add Daily Strategy Metrics panel (wins/losses/win rate/net PnL/avg hold/NW slip/fees/events).
 - [x] /api/data: include latest daily strategy metrics under pipeline.daily_strategy (reads reports/_daily_strategy_metrics_*.json).

  - [ ] CLOB REST 恢复时优先 CLOB；保留 Data API 作为读侧兜底；UI/日志明确标注来源切换
