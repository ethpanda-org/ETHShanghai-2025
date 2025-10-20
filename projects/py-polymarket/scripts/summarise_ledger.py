"""Summarise backtest ledger CSV into aggregate stats.

The ledger is produced by ``apps/backtest.py --csv-ledger``.  This helper
groups rows by holding horizon and (optionally) strategy, printing
JSON-formatted aggregates for quick inspection.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

DEFAULT_LEDGER = Path("reports") / "backtests_ledger.csv"


def _load_rows(path: Path) -> Iterable[Dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        return list(reader)


def summarise(rows: Iterable[Dict[str, str]], group_by_strategy: bool = False) -> List[Dict[str, float]]:
    """Aggregate ledger rows by holding_seconds (and strategy if requested)."""

    summary_map: Dict[Tuple, Dict[str, float]] = defaultdict(lambda: {
        "trades": 0,
        "wins": 0,
        "pnl": 0.0,
        "pnl_after_fees": 0.0,
        "fees": 0.0,
    })
    for row in rows:
        try:
            holding = int(float(row.get("holding_seconds", 0) or 0))
            win = int(row.get("win", 0) or 0)
            pnl = float(row.get("pnl", 0.0) or 0.0)
            pnl_after = float(row.get("pnl_after_fees", row.get("pnl", 0.0)) or 0.0)
            fees = float(row.get("fees", 0.0) or 0.0)
        except (TypeError, ValueError):
            continue
        strategies = row.get("strategies") or ""
        if group_by_strategy and strategies:
            keys = [s.strip() for s in strategies.split(",") if s.strip()]
            if not keys:
                keys = ["(unknown)"]
        else:
            keys = ["*"]
        for key in keys:
            summary = summary_map[(holding, key if group_by_strategy else "*")]
            summary["trades"] += 1
            summary["wins"] += win
            summary["pnl"] += pnl
            summary["pnl_after_fees"] += pnl_after
            summary["fees"] += fees

    payload: List[Dict[str, float]] = []
    for (holding, strat), stats in summary_map.items():
        if stats["trades"] == 0:
            continue
        win_rate = stats["wins"] / stats["trades"]
        avg_pnl = stats["pnl_after_fees"] / stats["trades"]
        payload.append(
            {
                "holding_seconds": holding,
                "strategy": strat if group_by_strategy else None,
                "trades": int(stats["trades"]),
                "win_rate": round(win_rate, 6),
                "total_pnl": round(stats["pnl"], 6),
                "total_pnl_after_fees": round(stats["pnl_after_fees"], 6),
                "total_fees": round(stats["fees"], 6),
                "avg_pnl_after_fees": round(avg_pnl, 6),
            }
        )
    payload.sort(key=lambda row: (row["holding_seconds"], row.get("strategy") or ""))
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarise backtest ledger CSV")
    parser.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER, help="Ledger CSV path")
    parser.add_argument("--group-by-strategy", action="store_true", help="Break out stats per strategy tag")
    args = parser.parse_args()

    rows = _load_rows(args.ledger)
    summary = summarise(rows, group_by_strategy=args.group_by_strategy)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
