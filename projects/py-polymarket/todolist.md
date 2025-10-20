ï»¿# Continuous Online Simulation & Monitoring TODO



- [x] Configure `.env` with online credentials (`POLY_OFFLINE_MODE=false`, `CLOB_REST_URL`, `CLOB_WS_URL`, API key triplet, `POLY_PRIVATE_KEY`).

- [x] Verify dependency footprint (`pip install -r requirements/base.txt` and `pip install -e .`).

- [x] Author automation script (e.g., `scripts/run_online_simulation.py`) that loops `polymarket-simulate` and timestamps reports.

- [x] Adjust script output naming to `reports/simulation_report_*.json` for monitor compatibility.

- [x] Create wrapper/launcher (PowerShell or Make target) that starts both the simulation loop and monitoring UI (`polymarket-launch monitor`).

- [x] Document start/stop instructions in README or CHANGELOG follow-up section.

- [x] Add optional analytics step (e.g., script summarizing recent simulation reports) to evaluate strategy win rate.

## New Priority (2025-10-14) �C �¼����������Ż�

- [x] ������������루���ȣ�
  - [x] ��ע������ɵ�������`require_true_source`, `non_news_conf_scale`, `max_age_seconds`, `decay_half_life_seconds`, `volume_spike_multiplier_non_news`���� `src/polymarket/strategies/registry.py`����
  - [x] �� `config/strategies.yaml` �µ� `min_confidence��0.30`��`volume_threshold��5000`�������� `require_true_source: true`��`non_news_conf_scale: 0.65`��`max_age_seconds: 1800`��`decay_half_life_seconds: 900`��
- [x] ���ݸ���ǿ��
  - [x] ���������������������ˣ�д�� `sentiment_updated_at`���������ʶ����˥˥���߼���`src/polymarket/data/enrichment.py`����
  - [x] �����ṩ���ߴ��������ã���Ϊ NewsAPI/Twitter Session ���� `settings.PROXY_URL` ����`src/polymarket/data/sentiment_provider.py`����
- [x] ���������߼���ǿ
  - [x] ʶ����ʵ��Դ������`newsapi`/`twitter` �ȣ���������Ϊ�ϳ���Դ���ϳ���Դ��۲쵽 `volume` �����ҷŴ� `spike_effective`��
  - [x] ���Ŷȳ��� `sentiment_confidence`���������ɣ������Ժϳ���Դ�� `non_news_conf_scale` �µ�����¼ `spike_effective` �� `expected_duration_seconds` �����˳����ԡ�
- [x] ������֤����
  - [x] �۲� `reports/decisions.jsonl`/`fills.jsonl`/`realized_exits.jsonl`����¼ `event_*` �������˳�ԭ��ռ�ȣ���� 24 Сʱ�ع˱��棨���� `scripts/analyze_event_driven.py`����
  - [x] �� REST �ɼ�·��͸�� `sentiment_telemetry` �� `pipeline_status`�������ڼ�����չʾ������Դռ�������ʶȷֲ���UI ��������
- [x] �Ƚ��������
  - [x] Ϊ `SentimentProvider` ���ⲿ��������ָ���˱�+�������ƣ����� RL�������� 429/5xx �����Ŵ�
  - [x] Ϊ�¼��������ӿ�ѡ����բ������ `risk_level �� {LOW, MEDIUM}` ʱ������`allowed_risk_levels`����
- [ ] ����������ƻ������ݶ��ƽ���
  - [ ] ������ƫ�٣�`volume_threshold �� 3000` �� `sentiment_weight �� 0.6�C0.65`����ƫ�룺`min_confidence �� 0.35�C0.40` �� `sentiment_floor �� 0.08`��
  - [ ] ���� 24�C72 Сʱ�󣬰�������β��̻��� `config/strategies.yaml`���������������ǰ��Աȣ�ʤ��/�س�/����������
- [ ] �������������ߣ���ϲ���Ȩ�ؾ��ߣ�
  - [ ] ��չ `scripts/strategy_markets_winrate.py`������ `strategy_metadata.strategies` �� `confidence��size_hint` ����Ȩ�������������˳����Թ��򡱵�ʤ��ͳ�ơ�
  - [ ] ���ձ��е��� `event_driven` ��ʤ�ʡ�ƽ�����С���������ã������������Բ�ֶԱȡ�

## Completed (2025-10-13) �C Order Lifecycle

- [x] Order State Streaming: add private CLOB order-status WebSocket client (env?gated) with JSONL reconciliation; safe defaults.
- [x] Runner integration: maintain WS subscriptions from current snapshots; expose `fetch_info.orders_ws` with health/cooldown.
- [x] REST fallback (phase 1): best?effort polling via `py_clob_client` for user orders when WS is degraded/disabled; normalized events written to JSONL.
- [x] Dashboard panel: show Approvals/Rejects/Fills/Partials/Pending + recent order events.

## Completed (2025-10-13) �C Order Lifecycle Phase 2

- [x] REST reconciliation v2: stronger dedupe��status + filled delta������ҳ�α�֧�֣���״̬�����롣
- [x] UI mini-cards: չʾ `orders_ws` + `orders_rest` ״̬������������������ɹ�ʱ�䡣

## Completed (2025-10-13) �C Tooling

- [x] OrderStore replay tool: `scripts/replay_order_store.py` ֧�ְ�ʱ��/�г�/������� orders/trades JSONL��������ۺ�ͳ�ƻ�β��������֧�� `--csv` ������

## Completed (2025-10-13) �C Risk Audit

- [x] �־û�������ƣ��� RiskEngine ���������approved/factors/size/market/side��д�� `reports/risk_audit.jsonl`������д��ʧ�ܼ������� `pipeline_status.io_errors.risk_audit` �Ա��ء�

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

- [x] Recovery mode playbook: lower `trading.daily_loss_recovery_ratio` to ��0.20, cap `max_orders_per_loop` at 4, clear `reports/kill_switch_state.json`, and relaunch the stack to confirm small-size fills while kill-switch recovery is active.

- [x] Spread gate triage: review `reports/pipeline_status.json` rejects, widen `STRATEGY_MAX_SPREAD_BPS` to ~2200, and prototype a 24h-volume based dynamic spread ceiling for the next iteration.

- [x] Exit/hold alignment: raise `strategy.signal_floor` to ��0.15, bump `exit_policy.stop_loss_pct` toward 0.06�C0.07, and extend `min_hold_seconds` so `tp_sl` exits stop dominating realized losses.

- [x] Market blacklist sweep: rank `reports/fills.jsonl` by cumulative PnL per `market_id` and populate `STRATEGY_BLACKLIST` with the worst offenders until spreads/liquidity recover.

  - [x] Holding-time & confidence analysis: slice `reports/fills.jsonl` by holding duration (��120/300s) and entry confidence to pinpoint premature `tp_sl` triggers.

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

  - [x] Add time-stop (e.g., 60�C300s) + protective stops: `stop_loss_pct=5%`, `take_profit_pct=10%`, and break-even stop after +5% move.

  - [x] Run small grid search over holding horizon vs. win-rate/return and persist the frontier to `reports/backtest_frontier.json`.

- Strategy gates (reduce false ��yes�� bias)

  - [x] Mean reversion: require non-negative short-term momentum before taking long; skip extremes (`mid_price<0.08 or >0.92`); add minimum distance to target (e.g., ��0.06).

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

  - [x] Lower `max_single_position` from 6%��3% for live; add `max_total_exposure` (e.g., 15%) and daily loss kill-switch (e.g., -2%).

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

- [x] Strategy-aware exits. Add EV dead-zone (|p??mid|��cost), trailing (+3%/-2%), invalidation (edge flip), TTL(min/max) with hard SL/TP.

- [x] VaR + Liquidity sizing. Clamp by `cap_liq = balance*max_single_order_ratio` and `cap_var = allowed_loss/|VaR_5%|` with runtime balance scaling.

- [x] Risk/size params. `max_single_position=1%`, `min_position_size=10`; align RiskEngine `max_single_order_ratio=1%`.

- [x] Micro-arbitrage net-edge gating. Require real `external_bid/ask`; net_edge > taker_cost; exit on edge��cost.

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

  - Exit orders bypass VaR/liquidity risk checks (risk shouldn��t block closing).

- [x] Align StrategyEngine base-sizing with runtime balance (longer-term refactor: accept portfolio at construction).

- [x] Add total exposure cap + per-market cap in risk gate.



## Order State Streaming (DONE)

 - [x] Implement CLOB order-status WebSocket client (subscribe to order/lifecycle topics where available) and map to internal schema.
 - [x] Add REST polling fallback and reconciliation into lifecycle (submitted/partial/filled/cancelled) when WS is disabled or stale.
- [x] Persist lifecycle updates into `reports/orders.jsonl` (submissions/rejections/updates) and `reports/trades.jsonl` (fills), reusing `OrderStore`.
 - [x] Reconcile with runner `open_positions` and per-strategy exposure state; update strategy hold/reject breakdown accordingly.
 - [x] Dashboard: add Order Status panel (latest lifecycle updates, partials, pending, per-strategy rate-limit counters).
 - [x] Configuration flags: `SERVICE_USE_ORDER_WS` (enable/disable), `ORDER_WS_ASSET_LIMIT`, `ORDER_WS_COOLDOWN_SECONDS` (backoff), reuse freshness/fallback fields in `fetch_info`.

## ��ʵ���Ͻ��ף�Go?Live�����Ķ��嵥���Ȳ��޸Ĵ��룩

- ִ�����棨ExecutionEngine��

  - [x] ���� `DRY_RUN` �������أ���ʹ�ṩ˽ԿҲ��ֻ��ģ�⣨�� `config/env.py`/`settings.py` ��ȡ����

  - [x] ��λ��С��λУ׼���� USDC/��ԼҪ����е�λ���㣨���� 6 λС���������� `int(amount)` ֱ�ӽضϣ��������߼����е�һ���������������µ�ǰУ�顣

  - [x] �۸�߽�/���㱣�������ڶ�����λ/����ɽ�����������ƫ����ֵ��������ֵ�ܵ���д��ԭ��

  - [x] �ݵ���ȥ�أ�Ϊͬһ�г��ڶ������ڵ��ظ��źż�ȥ�ؼ���market_id+����+ʱ�䴰������ֹ�ظ��µ����ڱ��س־û�������ͼ�Ա������ָ���



- ���տ��ƣ�RiskEngine��

  - [x] �����ö��룺�� `max_single_order_ratio` �� `settings.trading.max_single_position` ����һ�£���ͨ�����ÿɵ������� `max_total_exposure`���ܳ������ޣ���

  - [ ] ���ڷ�ؿ��أ������տ�����ֵ/��բ���ƣ��־û�����������Ч����

  - [x] Ƶ�����г��޶ÿ��������µ��������г��ֲ����ޡ�������Ȩ��/��λ���ޡ� (��ʵ�֣�ȫ��Ƶ�� `trading.order_frequency`��ÿ������ÿ���ԡ�ÿ�г����� `trading.strategy_order_frequency`�������� services/runner.py�����г��ֲ����� `trading.max_positions_per_market` ��ÿ���Գ������� `STRATEGY_EXPOSURE_CAPS` ��Ч)

  - [x] ����ؾܵ�ԭ��д�붩�� JSONL�����������ԡ���ء�ִ�С���·������ `orders.jsonl` �� reject �¼� metadata �м�¼��`risk_audit.jsonl` ���д浵��ϸ����



- �ֲ������

  - [ ] ��������/����/�ֲ����ݲ㣨���� DB ������ JSON�����ڸ��ٳɱ����ֲ֡���ֵ����ʵ�� PnL��

  - [ ] ���� CLOB �µ���״̬��ѯ������ܵ�/��ʱ/���ֳɽ������ݳɽ�������³�����ֲ֡�

  - [x] �ĵ��� `orders.jsonl`/`trades.jsonl` �ֶμ�ʾ������ `docs/OPERATIONS_GUIDE.md` �� 16 �ڣ���

  - [ ] �ṩ���� OrderStore �ı��ص���/�طŽű����ɰ�ʱ�䷶Χ���г����������



- �����븻��

  - [ ] ȷ�������׶β����� REST �ṩ�� `external_bid/ask` ��ֵ����ǰ���ڱ�ģ���ⲿ�۸��ǵķ��գ���

  - [ ] WebSocket/��ʽ������ã����ڶ���״̬��۸�ˢ�£������Ż� REST ��ѯ���˱ܲ��ԡ�



- �����澯

  - [ ] �ڽ���ѭ��д�� `reports/pipeline_status.json`���� `loop_summary` �� `exec` ָ�ꡢRPC ����������˱�״̬����

  - [ ] ��������岹�䣺��ʵ�� PnL���ֲּ�ֵ�������Թ�����ʾ��USDC/MATIC���� RPC �ӳ١�

  - [x] �ڼ�����չʾ���¶���/�ɽ����գ�Order Lifecycle ��壩������ JSONL д��ʧ�ܼ�����io_errors���ں�����澯��ʾ��С��Ƭչʾ��

  - [ ] �澯��RPC ����ʧ�ܡ�API ����������׼���쳣�����/ȼ�ϷѲ��㡢�쳣���㡢�տ��𴥷��ȡ�



- ��ȫ����Կ

  - [ ] ���ܴӻ���ע�룬�ṩ��ȫ�洢������Windows Credential Manager/�����ļ�������־����������ӡ��Կ/��ַ˽����Ϣ����

  - [ ] ��Կ�� API ƾ֤�ֻ������ĵ�����ʧ��ʱ�Զ��л��� `DRY_RUN` ģʽ��



- ��������ά

  - [ ] ��������ǿ��`scripts/launch_online_stack.ps1` ͬʱ��̨���� `polymarket-launch trade` ���أ��������������ʾ��

  - [ ] �ṩ Windows ����ƻ��� Docker Compose/K8s �嵥�������Զ���������־�ռ���



- ��֤���̣�����ǰ��

  - [ ] Dry?Run����˽Կ���� `polymarket-launch trade`���۲���� `Loop Processed/Approved` ����־��

  - [ ] С����ʵ�ʽ�Ҷȣ���С `max_single_position` �·���һ���޼۵����˶Ե�λ��������ر�·����ͨ�����������޶





























- [x] Design per-strategy exit interfaces (capture strategy-specific state in positions)
- [x] Implement mean_reversion + momentum exit evaluators and integrate with runner
- [x] Add event_driven-specific exit flow (event-driven trailing or hold-to-resolution path)
- [x] Update runner to prioritize strategy-specific exits before fallback logic
- [x] Dry-run verification + telemetry review for strategy-specific exits

## New Priorities (2025-10-14) �� Post-2025-10-13 Analysis

- [x] CRITICAL: Concentration risk clamp
  - [x] Set `trading.max_positions_per_market=1` and restart stack.
  - [x] Add per-market daily-loss kill-switch (spec + implement) with conservative default (1% balance per market/day).
  - [x] Blacklist or cap worst markets from 2025-10-13: `0x1c7280��0987`, `0x0b6aae��5355` (also set `per_market_exposure_caps=10`).

- [x] Exit/time controls
  - [x] Reduce `execution.exit_policy.holding_seconds` to 480.
  - [x] Retune tiered stops: soft 4%, hard 10%, keep `trim_ratio=0.35`; validate via dry-run.
  - [x] Increase `execution.entry_cooldown_seconds` to 900 to suppress rapid re-entries.

- [x] Spread/liquidity gating
  - [x] Tighten `strategy.spread_volume_tiers` top-tier `max_spread_bps` 800��600; set global `max_spread_bps` 1000.

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
- [x] �ձ������� scripts/report_daily_strategy_metrics.py ���� per-strategy ʤ��/����/����/���ã��� event_driven vs others �ۺϣ���
- [x] ��������������� scripts/recommend_event_driven_params.py ���� 24h ���������������飨֧�� --apply д�� strategies.yaml����
- [x] Dashboard: add Daily Strategy Metrics panel (wins/losses/win rate/net PnL/avg hold/NW slip/fees/events).
 - [x] /api/data: include latest daily strategy metrics under pipeline.daily_strategy (reads reports/_daily_strategy_metrics_*.json).

  - [ ] CLOB REST �ָ�ʱ���� CLOB������ Data API ��Ϊ���ඵ�ף�UI/��־��ȷ��ע��Դ�л�
