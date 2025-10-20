"""Utility to summarise backtest frontier results for quick inspection.

Reads reports/backtest_frontier.json (produced by backtest_holding_grid.py)
and prints aggregated stats grouped by pricing offsets.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List

DEFAULT_PATH = Path("reports") / "backtest_frontier.json"


def load_frontier(path: Path) -> Dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Frontier file must be a JSON object")
    return data


def summarise_frontier(entries: Iterable[Dict]) -> List[Dict[str, float]]:
    grouped: Dict[tuple, Dict[str, float]] = defaultdict(lambda: {
        "count": 0,
        "best_win_rate": 0.0,
        "best_return": 0.0,
        "best_horizon": None,
    })
    for entry in entries:
        try:
            win_rate = float(entry.get("win_rate", 0.0))
            total_return = float(entry.get("total_return", 0.0))
            horizon = int(entry.get("holding_seconds", 0))
            maker = float(entry.get("maker_offset_bps", 0.0))
            taker = float(entry.get("taker_offset_bps", 0.0))
        except (TypeError, ValueError):
            continue
        key = (maker, taker)
        bucket = grouped[key]
        bucket["count"] += 1
        if win_rate > bucket["best_win_rate"] or (
            win_rate == bucket["best_win_rate"] and total_return > bucket["best_return"]
        ):
            bucket["best_win_rate"] = win_rate
            bucket["best_return"] = total_return
            bucket["best_horizon"] = horizon
    results = []
    for (maker, taker), stats in grouped.items():
        results.append(
            {
                "maker_offset_bps": maker,
                "taker_offset_bps": taker,
                "entries": int(stats["count"]),
                "best_win_rate": round(stats["best_win_rate"], 6),
                "best_total_return": round(stats["best_return"], 6),
                "best_holding_seconds": stats["best_horizon"],
            }
        )
    results.sort(key=lambda row: (row["best_win_rate"], row["best_total_return"]))
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarise backtest frontier file")
    parser.add_argument("--path", type=Path, default=DEFAULT_PATH, help="Path to backtest_frontier.json")
    args = parser.parse_args()

    frontier = load_frontier(args.path)
    entries = frontier.get("results") or []
    summary = summarise_frontier(entries)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
