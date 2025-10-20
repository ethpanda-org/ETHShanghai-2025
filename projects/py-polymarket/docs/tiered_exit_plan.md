# Tiered `tp_sl` Exit Plan (Draft)
## Current Pain Points
- `tp_sl` exits still dominate (>40% share) despite updated stop thresholds.
- Short holding times (<120s) account for ~6.5k exits with net PnL �� -2.9k USDC; confidence ��1.0 indicates the entry engine is strongly convicted.
- Need a staged approach to avoid full liquidation when initial drawdown is shallow.
## Proposed Workflow
1. **Stage 1 (soft stop)**
   - Trigger when drawdown reaches configurable `soft_stop_pct` (default 3%).
   - Trim 50% position size, log exit reason `tp_sl_stage1`, store remaining shares/cost basis.
2. **Stage 2 (hard stop)**
   - Remaining position adopts widened stop (`hard_stop_pct`, default 8%) + optional trailing buffer.
   - If hit, exit remainder with `tp_sl_stage2` reason.
3. **Stage 3 (extended timeout)**
   - If position exceeds `extended_min_hold_seconds` without recovery, exit with `time_stage2` reason.
## Implementation Steps
- Add config under `execution.exit_policy`: `tiered_tp_sl.enabled`, `soft_stop_pct`, `hard_stop_pct`, `trim_ratio`, `extended_min_hold_seconds`.
- Extend runner exit management:
  - Track partial exits in open positions (new fields: `remaining_shares`, `stage` flags).
  - Emit fills with distinct reasons and ensure telemetry captures partial vs final exits.
- Update monitoring / analytics:
  - Modify dashboard to display stage counts.
  - Enhance `analyze_exit_reasons.py` to aggregate new reasons.
- Testing:
  - Unit tests to ensure partial exit math is correct.
  - Dry-run scenario verifying stage transitions and logging.
## Open Questions
- How to handle strategy blacklists when stage1 exit occurs? (e.g., should we immediately blacklist markets with repeated stage1 hits?)
- Should Stage 1 reinstate entry if market recovers, or rely on standard re-entry logic?
- Interaction with recovery-mode sizing: trim ratio might need adjustment when in recovery mode.

## A/B Snapshot (2025-10-09)
- Pre-tiered window: 5,482 exits, PnL ≈ -2,565.68 USDC, tp_sl share 93.6%.
- Post-tiered window: 12,426 exits, PnL ≈ -5,820.40 USDC, tp_sl share 85.7%.
- Early results show reduced tp_sl share but losses persist; monitor longer horizon.



## Stage metrics (latest sample)
- Stage 1 triggers: 0
- Stage 2 exits recorded: 15,925 (tp_sl / tp_sl_stage2)
- No tp_sl_stage1 events observed yet; soft stop may still be too wide or markets hitting immediate hard stop.
