import json
from pathlib import Path
from typing import Any, Dict

import sys
from pathlib import Path as _P

root = _P(__file__).resolve().parents[1]
src = root / "src"
for p in (str(root), str(src)):
    if p not in sys.path:
        sys.path.insert(0, p)

from config import settings, reload_settings  # type: ignore
from apps.backtest import backtest_with_pnl  # type: ignore


def _apply_strategy_overrides(sig_floor: float, consensus_min: int) -> None:
    try:
        setattr(settings, "STRATEGY_SIGNAL_FLOOR", float(sig_floor))
        settings.strategy.signal_floor = float(sig_floor)
    except Exception:
        pass
    try:
        setattr(settings, "STRATEGY_CONSENSUS_MIN", int(consensus_min))
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


def main() -> None:
    import argparse
    
    parser = argparse.ArgumentParser(description="Run online A/B backtest and summarize results")
    parser.add_argument("--markets", type=int, default=50)
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--holding-seconds", type=int, default=300)
    parser.add_argument("--output", type=Path, default=Path("reports/ab_online_result.json"))
    args = parser.parse_args()

    # Ensure online mode
    original_offline = settings.OFFLINE_MODE
    settings.OFFLINE_MODE = False
    # For A/B speed and to avoid transient WS client sessions, force REST-only during this run
    import os
    os.environ["SERVICE_USE_WS"] = "false"

    try:
        # Baseline (pre-change thresholds)
        _apply_strategy_overrides(0.20, 2)
        base = backtest_with_pnl(
            markets=args.markets,
            limit=args.limit,
            offline=False,
            holding_seconds=args.holding_seconds,
        )

        # Current (as-is in settings)
        reload_settings()
        settings.OFFLINE_MODE = False
        os.environ["SERVICE_USE_WS"] = "false"
        cur = backtest_with_pnl(
            markets=args.markets,
            limit=args.limit,
            offline=False,
            holding_seconds=args.holding_seconds,
        )
    finally:
        settings.OFFLINE_MODE = original_offline

    payload = {
        "baseline": {"overrides": {"signal_floor": 0.20, "consensus_min": 2}, "summary": _summarize(base)},
        "current": {
            "overrides": {
                "signal_floor": float(getattr(settings, "STRATEGY_SIGNAL_FLOOR", 0.0)),
                "consensus_min": int(getattr(settings, "STRATEGY_CONSENSUS_MIN", 0)),
            },
            "summary": _summarize(cur),
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
