import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Tuple

# Ensure package imports resolve when running from repository root
import sys
from pathlib import Path as _P
root = _P(__file__).resolve().parents[1]
src = root / "src"
for p in (str(root), str(src)):
    if p not in sys.path:
        sys.path.insert(0, p)

from config import settings, reload_settings  # type: ignore
from apps.backtest import backtest_with_pnl  # type: ignore


def _snapshot_strategy_keys() -> Dict[str, Any]:
    return {
        "STRATEGY_SIGNAL_FLOOR": getattr(settings, "STRATEGY_SIGNAL_FLOOR", 0.12),
        "STRATEGY_CONSENSUS_MIN": getattr(settings, "STRATEGY_CONSENSUS_MIN", 2),
    }


def _apply_strategy_overrides(sig_floor: float, consensus_min: int) -> None:
    try:
        setattr(settings, "STRATEGY_SIGNAL_FLOOR", float(sig_floor))
    except Exception:
        pass
    try:
        setattr(settings, "STRATEGY_CONSENSUS_MIN", int(consensus_min))
    except Exception:
        pass
    # Also update nested namespace for completeness
    try:
        settings.strategy.signal_floor = float(sig_floor)
        settings.strategy.consensus_min = int(consensus_min)
    except Exception:
        pass


def _summarize(result: Dict[str, Any]) -> Dict[str, Any]:
    sim = result.get("simulation_summary", {})
    perf = sim.get("performance_metrics", {})
    strat = sim.get("strategy_performance", {})
    return {
        "closed_trades": perf.get("closed_trades", 0),
        "win_rate": perf.get("win_rate", 0.0),
        "total_pnl": perf.get("total_pnl", 0.0),
        "approval_rate": perf.get("approval_rate", 0.0),
        "strategy_performance": strat,
    }


def run_ab(markets: int = 20, limit: int = 50, holding_seconds: int = 300) -> Dict[str, Any]:
    # Force offline for consistency
    original_offline = settings.OFFLINE_MODE
    settings.OFFLINE_MODE = True
    try:
        # Baseline overrides
        current = _snapshot_strategy_keys()
        baseline = {"STRATEGY_SIGNAL_FLOOR": 0.20, "STRATEGY_CONSENSUS_MIN": 2}
        _apply_strategy_overrides(baseline["STRATEGY_SIGNAL_FLOOR"], baseline["STRATEGY_CONSENSUS_MIN"])
        base_result = backtest_with_pnl(markets=markets, limit=limit, offline=True, holding_seconds=holding_seconds)
        # Restore current runtime from disk to avoid stale alias values
        reload_settings()
        settings.OFFLINE_MODE = True
        # Current (as-is)
        cur_result = backtest_with_pnl(markets=markets, limit=limit, offline=True, holding_seconds=holding_seconds)
    finally:
        settings.OFFLINE_MODE = original_offline

    return {
        "baseline": {
            "overrides": baseline,
            "summary": _summarize(base_result),
        },
        "current": {
            "overrides": {"STRATEGY_SIGNAL_FLOOR": float(getattr(settings, "STRATEGY_SIGNAL_FLOOR", 0.0)), "STRATEGY_CONSENSUS_MIN": int(getattr(settings, "STRATEGY_CONSENSUS_MIN", 0))},
            "summary": _summarize(cur_result),
        },
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Run offline A/B backtest and summarize results")
    parser.add_argument("--markets", type=int, default=20)
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--holding-seconds", type=int, default=300)
    parser.add_argument("--output", type=Path, default=Path("reports/ab_offline_result.json"))
    args = parser.parse_args()

    payload = run_ab(markets=args.markets, limit=args.limit, holding_seconds=args.holding_seconds)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
