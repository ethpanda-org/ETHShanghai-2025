"""Utilities for realized PnL persistence and summarization.

These helpers centralize JSONL append and summary rebuild so they can be
reused by the trading loop and tests/tools.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional


def append_realized(exit_record: Dict, *, base_dir: Path | None = None) -> None:
    base = base_dir or Path("reports")
    exits_path = base / "realized_exits.jsonl"
    exits_path.parent.mkdir(parents=True, exist_ok=True)
    with exits_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(exit_record) + "\n")


def rebuild_realized_summary(*, base_dir: Path | None = None) -> Dict:
    base = base_dir or Path("reports")
    exits_path = base / "realized_exits.jsonl"
    summary_path = base / "realized_summary.json"

    closed = 0
    total_pnl = 0.0
    total_fees = 0.0
    total_pnl_after_fees = 0.0
    reason_counts: Dict[str, int] = {}
    hold_sum = 0.0
    hold_count = 0
    wins = 0
    losses = 0
    strategy_stats: Dict[str, Dict[str, float]] = {}

    def _strategy_bucket(name: str) -> Dict[str, float]:
        bucket = strategy_stats.get(name)
        if bucket is None:
            bucket = {
                "trades": 0,
                "wins": 0,
                "losses": 0,
                "total_pnl": 0.0,
                "total_pnl_after_fees": 0.0,
                "total_fees": 0.0,
                "hold_sum": 0.0,
                "hold_count": 0,
            }
            strategy_stats[name] = bucket
        return bucket

    if exits_path.exists():
        for line in exits_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            closed += 1
            pnl = float(rec.get("pnl", 0.0))
            fees = float(rec.get("fees", 0.0))
            pnl_after_fees = float(rec.get("pnl_after_fees", pnl - fees))
            total_pnl += pnl
            total_fees += fees
            total_pnl_after_fees += pnl_after_fees
            reason = str(rec.get("reason") or "").lower()
            if reason:
                reason_counts[reason] = reason_counts.get(reason, 0) + 1
            # accumulate holdings
            hs = rec.get("holding_seconds")
            if isinstance(hs, (int, float)):
                hold_sum += float(hs)
                hold_count += 1
            if pnl > 0:
                wins += 1
            elif pnl < 0:
                losses += 1

            strategies = rec.get("strategies")
            if isinstance(strategies, list):
                for strat in strategies:
                    if not strat:
                        continue
                    bucket = _strategy_bucket(str(strat))
                    bucket["trades"] += 1
                    bucket["total_pnl"] += pnl
                    bucket["total_pnl_after_fees"] += pnl_after_fees
                    bucket["total_fees"] += fees
                    if pnl > 0:
                        bucket["wins"] += 1
                    elif pnl < 0:
                        bucket["losses"] += 1
                    if isinstance(hs, (int, float)):
                        bucket["hold_sum"] += float(hs)
                        bucket["hold_count"] += 1

    avg_after = (total_pnl_after_fees / closed) if closed else 0.0
    try:
        avg_hold = (hold_sum / hold_count) if hold_count else 0.0
    except Exception:
        avg_hold = 0.0

    win_rate_pct = None
    win_loss_total = wins + losses
    if win_loss_total > 0:
        win_rate_pct = round((wins / win_loss_total) * 100.0, 3)

    per_strategy = {}
    for name, stats in strategy_stats.items():
        trades = stats["trades"]
        hold_count = stats["hold_count"]
        strat_win_loss_total = stats["wins"] + stats["losses"]
        strat_win_rate = None
        if strat_win_loss_total > 0:
            strat_win_rate = round((stats["wins"] / strat_win_loss_total) * 100.0, 3)
        per_strategy[name] = {
            "trades": int(trades),
            "wins": int(stats["wins"]),
            "losses": int(stats["losses"]),
            "total_pnl": round(stats["total_pnl"], 6),
            "total_pnl_after_fees": round(stats["total_pnl_after_fees"], 6),
            "total_fees": round(stats["total_fees"], 6),
            "avg_pnl_after_fees": round(stats["total_pnl_after_fees"] / trades, 6) if trades else 0.0,
            "avg_holding_seconds": round(stats["hold_sum"] / hold_count, 3) if hold_count else 0.0,
            "win_rate_pct": strat_win_rate,
        }

    payload = {
        "closed_trades": closed,
        "total_pnl": round(total_pnl, 6),
        "wins": wins,
        "losses": losses,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "total_fees": round(total_fees, 6),
        "total_pnl_after_fees": round(total_pnl_after_fees, 6),
        "reasons": reason_counts,
        "avg_pnl_after_fees": round(avg_after, 6),
        "avg_holding_seconds": round(avg_hold, 3),
        "win_rate_pct": win_rate_pct,
        "per_strategy": per_strategy or None,
    }
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


__all__ = ["append_realized", "rebuild_realized_summary"]
