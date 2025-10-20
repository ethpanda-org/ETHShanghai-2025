"""Utility script to probe holding-horizon settings via offline backtests.

The script sweeps a small grid of holding seconds, runs the existing backtest
engine (with synthetic exits when offline), and persists the win-rate / return
frontier to ``reports/backtest_frontier.json``.  This helps prioritise which
holding horizon to use in live trading without re-running large research jobs.
"""

from __future__ import annotations

import argparse
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List, Sequence

from apps.backtest import backtest_with_pnl, append_backtest_ledger

DEFAULT_HORIZONS = (60, 180, 300, 600)
REPORT_PATH = Path("reports") / "backtest_frontier.json"
LEDGER_PATH = Path("reports") / "backtests_ledger.csv"


@dataclass
class HorizonResult:
    holding_seconds: int
    closed_trades: int
    win_rate: float
    total_return: float
    total_pnl: float
    total_pnl_after_fees: float
    total_fees: float
    total_trades: int
    maker_offset_bps: float
    taker_offset_bps: float

    def as_dict(self) -> dict:
        return {
            "holding_seconds": self.holding_seconds,
            "closed_trades": self.closed_trades,
            "win_rate": round(self.win_rate, 6),
            "total_return": round(self.total_return, 6),
            "total_pnl": round(self.total_pnl, 6),
            "total_pnl_after_fees": round(self.total_pnl_after_fees, 6),
            "total_fees": round(self.total_fees, 6),
            "total_trades": self.total_trades,
            "maker_offset_bps": self.maker_offset_bps,
            "taker_offset_bps": self.taker_offset_bps,
        }


def evaluate_horizons(
    horizons: Iterable[int],
    *,
    markets: int = 25,
    limit: int = 100,
    offline: bool = True,
    pricing_model: str | None = None,
    maker_offset_bps: float = 0.0,
    taker_offset_bps: float = 0.0,
) -> List[HorizonResult]:
    """Run the PnL-aware backtest for each horizon and collect metrics."""

    results: List[HorizonResult] = []
    for horizon in horizons:
        logging.info(
            "Backtest: horizon=%ss markets=%s limit=%s offline=%s model=%s maker_offset=%sbps taker_offset=%sbps",
            horizon,
            markets,
            limit,
            offline,
            pricing_model,
            maker_offset_bps,
            taker_offset_bps,
        )
        payload = backtest_with_pnl(
            markets,
            limit,
            offline,
            horizon,
            pricing_model=pricing_model,
            maker_offset_bps=maker_offset_bps,
            taker_offset_bps=taker_offset_bps,
        )
        summary = payload.get("simulation_summary", {})
        metrics = (summary.get("performance_metrics") or {}) if isinstance(summary, dict) else {}
        trades = payload.get("trades") if isinstance(payload, dict) else []
        result = HorizonResult(
            holding_seconds=int(horizon),
            closed_trades=int(metrics.get("closed_trades", 0) or 0),
            win_rate=float(metrics.get("win_rate", 0.0) or 0.0),
            total_return=float(metrics.get("total_return", 0.0) or 0.0),
            total_pnl=float(metrics.get("total_pnl", 0.0) or 0.0),
            total_pnl_after_fees=float(metrics.get("total_pnl_after_fees", 0.0) or 0.0),
            total_fees=float(metrics.get("total_fees", 0.0) or 0.0),
            total_trades=len(trades) if isinstance(trades, list) else 0,
            maker_offset_bps=maker_offset_bps,
            taker_offset_bps=taker_offset_bps,
        )
        results.append(result)
        if isinstance(payload, dict):
            append_backtest_ledger(
                payload.get("trades", []),
                LEDGER_PATH,
                holding_seconds=horizon,
                pricing_model=payload.get("report_metadata", {}).get("pricing_model"),
                maker_offset_bps=maker_offset_bps,
                taker_offset_bps=taker_offset_bps,
            )
    return results


def _dominates(lhs: HorizonResult, rhs: HorizonResult) -> bool:
    """Return True if lhs dominates rhs in both win-rate and total return."""
    return lhs.win_rate >= rhs.win_rate and lhs.total_return >= rhs.total_return and (
        lhs.win_rate > rhs.win_rate or lhs.total_return > rhs.total_return
    )


def pareto_frontier(results: Sequence[HorizonResult]) -> List[HorizonResult]:
    """Compute the Pareto frontier (maximising win_rate and total_return)."""
    frontier: List[HorizonResult] = []
    for candidate in results:
        if any(_dominates(existing, candidate) for existing in results if existing is not candidate):
            continue
        frontier.append(candidate)
    frontier.sort(key=lambda r: (r.win_rate, r.total_return, -r.holding_seconds), reverse=True)
    return frontier


def persist_frontier(
    results: Sequence[HorizonResult],
    maker_offset_bps: float,
    taker_offset_bps: float,
    path: Path = REPORT_PATH,
) -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "maker_offset_bps": maker_offset_bps,
        "taker_offset_bps": taker_offset_bps,
        "results": [res.as_dict() for res in results],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    logging.info("Frontier with %s entries persisted to %s", len(results), path)


def parse_horizons(raw: str | None) -> Sequence[int]:
    if not raw:
        return DEFAULT_HORIZONS
    return [int(part.strip()) for part in raw.split(",") if part.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate holding-second grid and persist win-rate frontier.")
    parser.add_argument("--horizons", help="Comma-separated holding seconds (default: 60,180,300,600)")
    parser.add_argument("--markets", type=int, default=25, help="Number of markets to backtest per horizon")
    parser.add_argument("--limit", type=int, default=100, help="Underlying data fetch limit")
    parser.add_argument("--online", action="store_true", help="Run against live REST/WS instead of offline fixtures")
    parser.add_argument("--pricing-model", choices=["taker", "maker", "maker_limit", "mid"], help="Override pricing model")
    parser.add_argument("--maker-offset-bps", type=float, default=0.0, help="Maker price adjustment in basis points")
    parser.add_argument("--taker-offset-bps", type=float, default=0.0, help="Taker price adjustment in basis points")
    parser.add_argument(
        "--output",
        type=Path,
        default=REPORT_PATH,
        help="Output path (default reports/backtest_frontier.json)",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    horizons = parse_horizons(args.horizons)
    results = evaluate_horizons(
        horizons,
        markets=args.markets,
        limit=args.limit,
        offline=not args.online,
        pricing_model=args.pricing_model,
        maker_offset_bps=abs(float(args.maker_offset_bps or 0.0)),
        taker_offset_bps=abs(float(args.taker_offset_bps or 0.0)),
    )
    frontier = pareto_frontier(results)
    persist_frontier(frontier, maker_offset_bps=abs(float(args.maker_offset_bps or 0.0)), taker_offset_bps=abs(float(args.taker_offset_bps or 0.0)), path=args.output)

    logging.info("All horizon results:\n%s", json.dumps([r.as_dict() for r in results], indent=2))


if __name__ == "__main__":
    main()

