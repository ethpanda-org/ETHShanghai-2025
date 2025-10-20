"""Aggregate archived backtest outputs and compute diversification metrics."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Mapping

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from polymarket.analysis.backtest_summary import (  # noqa: E402
    aggregate_backtest_metrics,
    load_backtest_trades,
)


def _discover_inputs(reports_dir: Path, pattern: str) -> List[Path]:
    return sorted(
        path for path in reports_dir.glob(pattern) if path.is_file()
    )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reports-dir",
        type=Path,
        default=Path("reports"),
        help="Directory containing backtest exports (default: %(default)s).",
    )
    parser.add_argument(
        "--inputs",
        nargs="*",
        type=Path,
        help="Explicit list of backtest JSON files to analyse.",
    )
    parser.add_argument(
        "--pattern",
        type=str,
        default="backtest_pnl*.json",
        help="Glob pattern used to discover backtest JSON files.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("reports/backtest_diversification_summary.json"),
        help="Path to write the diversification summary.",
    )
    parser.add_argument(
        "--summary-output",
        type=Path,
        default=Path("reports/backtest_summary.json"),
        help="Path to write a flattened per-strategy summary.",
    )
    return parser.parse_args()


def _collect_inputs(args: argparse.Namespace) -> List[Path]:
    if args.inputs:
        return [path for path in args.inputs if path.exists()]
    reports_dir: Path = args.reports_dir
    if not reports_dir.exists():
        return []
    return _discover_inputs(reports_dir, args.pattern)


def run() -> tuple[Path, Path]:
    args = _parse_args()
    inputs = _collect_inputs(args)
    if not inputs:
        raise FileNotFoundError(
            f"No backtest archives found using pattern '{args.pattern}' in {args.reports_dir}"
        )

    trades = load_backtest_trades(inputs)
    summary = aggregate_backtest_metrics(trades)
    summary["source_files"] = [str(path) for path in inputs]
    summary["reports_directory"] = str(args.reports_dir.resolve())

    output_path: Path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    summary_output: Path = args.summary_output
    simple = _build_simple_summary(summary)
    summary_output.parent.mkdir(parents=True, exist_ok=True)
    summary_output.write_text(json.dumps(simple, indent=2), encoding="utf-8")
    return output_path, summary_output


def _build_simple_summary(raw: Mapping[str, object]) -> Dict[str, object]:
    generated_at = datetime.now(timezone.utc).isoformat()
    strategy_stats = raw.get("strategy_stats") or {}
    if isinstance(strategy_stats, Mapping):
        items = list(strategy_stats.items())
    else:
        items = []
    strategies = []
    for name, stats in sorted(
        items,
        key=lambda item: float(abs((item[1] or {}).get("total_pnl", 0.0))),
        reverse=True,
    ):
        if not isinstance(stats, Mapping):
            continue
        strategies.append(
            {
                "strategy": name,
                "trades": int(stats.get("trades", 0) or 0),
                "win_rate": float(stats.get("win_rate", 0.0) or 0.0),
                "total_pnl": float(stats.get("total_pnl", 0.0) or 0.0),
                "avg_pnl": float(stats.get("avg_pnl", 0.0) or 0.0),
                "pnl_volatility": float(stats.get("pnl_volatility", 0.0) or 0.0),
                "contribution_share": float(stats.get("contribution_share", 0.0) or 0.0),
            }
        )

    return {
        "generated_at": generated_at,
        "total_trades": raw.get("total_trades"),
        "total_pnl": raw.get("total_pnl"),
        "win_rate": raw.get("win_rate"),
        "volatility": raw.get("volatility"),
        "strategies": strategies,
        "source_files": raw.get("source_files"),
        "reports_directory": raw.get("reports_directory"),
    }


if __name__ == "__main__":
    diversification_path, summary_path = run()
    print(f"Wrote diversification summary to {diversification_path}")
    print(f"Wrote per-strategy summary to {summary_path}")
