# Optimized TODO (aligned with exit/settlement and fee-aware PnL)

- CRITICAL: Exit/Settlement pipeline (sell + resolution)
  - Add resolution watcher to detect market resolution and winning outcome; realize PnL on resolution and write to `reports/realized_exits.jsonl` and `reports/realized_summary.json`.
  - Externalize exit/cost parameters (done): see `config/runtime.yaml:execution` and `config/settings.py` aliases.
  - Defaults: `min_hold_seconds=45`, `holding_seconds=300`, `take_profit_pct=0.03`, `stop_loss_pct=0.02`, `taker_fee=0.005`.

- Strategy hardening (updated)
  - `config/strategies.yaml` tuned: disable `micro_arbitrage` until real external prices are wired; raise `event_driven.min_confidence` and `volume_threshold`; add `mean_reversion.min_deviation` and `require_non_negative_momentum`; tighten `momentum_scalping`.
  - `StrategyEngine`: require ≥2 strategies agree directionally; raise `_signal_floor` to 0.12.

- Fee/slippage in backtest (updated)
  - `apps/backtest.py` now records `fees`, `pnl_fee`, and aggregates `total_fees` and `total_pnl_after_fees`.

- Next steps
  - Implement `src/polymarket/services/resolution_watcher.py` and wire into the trader loop as a background task.
  - Add a smoke test that forces a time-based exit using offline fixtures to validate the exit pipeline.
  - Consider execution-cost prefilter inside `StrategyEngine` (skip signals with advantage ≤ fees + half-spread + premium).

Refer back to `todolist.md` for the broader roadmap; this file captures the prioritized deltas required to fix “no sell/no resolution PnL” issues.

