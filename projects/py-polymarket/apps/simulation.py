"""Offline simulation CLI leveraging the new strategy engine."""

import asyncio
import json
import statistics
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

try:  # Python <3.11 compatibility
    from datetime import UTC  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover
    UTC = timezone.utc  # type: ignore[assignment]
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from config import settings  # type: ignore  # noqa: E402
from polymarket.data.facade import DataIngestionFacade  # noqa: E402
from polymarket.strategies import StrategyEngine  # noqa: E402
from polymarket.risk import RiskEngine  # noqa: E402


@dataclass
class SimulationResult:
    market_id: str
    action: str
    size: float
    risk_metadata: Dict[str, Any]
    strategy_metadata: Dict[str, Any]
    timestamp: str = ""
    entry_price: float = 0.0
    exit_price: float = 0.0
    shares: float = 0.0
    pnl: float = 0.0
    holding_seconds: int = 300

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _build_portfolio() -> Dict[str, Any]:
    return {
        "returns": [0.01] * 200,
        "balance": 10_000,
        "positions": [],
    }


def _entry_yes_price(action: str, market: Dict[str, Any]) -> float:
    bid = market.get("bid")
    ask = market.get("ask")
    mid = market.get("mid_price")
    yes_price = market.get("yes_price")
    if action == "yes" and ask is not None:
        return float(ask)
    if action == "no" and bid is not None:
        return float(bid)
    if yes_price is not None:
        return float(yes_price)
    if mid is not None:
        return float(mid)
    return 0.5


def _simulate_exit_yes(entry_yes: float, bias: float, volatility: Optional[float]) -> float:
    vol_component = float(volatility) if isinstance(volatility, (int, float)) else 0.1
    edge_scale = max(0.01, min(vol_component, 0.15))
    adjustment = max(min(bias, 1.0), -1.0) * edge_scale
    exit_yes = entry_yes + adjustment
    return max(0.01, min(0.99, exit_yes))


def _calculate_trade_metrics(action: str, size: float, entry_yes: float, exit_yes: float) -> Dict[str, float]:
    if action == "yes":
        denom = max(entry_yes, 1e-6)
        shares = size / denom
        pnl = (exit_yes - entry_yes) * shares
    else:
        denom = max(1.0 - entry_yes, 1e-6)
        shares = size / denom
        pnl = (entry_yes - exit_yes) * shares
    return {"shares": shares, "pnl": pnl}


def _build_simulation_report(results: List[SimulationResult], start_time: str) -> Dict[str, Any]:
    """Build a complete simulation report compatible with web monitoring."""
    trades = [result.as_dict() for result in results]
    total_trades = len(results)
    total_size = sum(result.size for result in results)
    approved_trades = sum(1 for result in results if result.risk_metadata.get("approved", False))
    total_pnl = sum(result.pnl for result in results)
    wins = sum(1 for result in results if result.pnl > 1e-9)
    losses = sum(1 for result in results if result.pnl < -1e-9)
    current_balance = 10_000.0 + total_pnl
    pnl_series = [result.pnl for result in results]

    strategy_perf: Dict[str, Dict[str, float]] = {}
    for result in results:
        strat_entries = result.strategy_metadata.get("strategies") if isinstance(result.strategy_metadata, dict) else None
        strategy_names = [
            str(entry.get("name"))
            for entry in (strat_entries or [])
            if isinstance(entry, dict) and entry.get("name")
        ]
        if not strategy_names:
            strategy_names = ["unattributed"]
        weight = 1.0 / len(strategy_names)
        for name in strategy_names:
            stats = strategy_perf.setdefault(
                name,
                {
                    "trades": 0.0,
                    "wins": 0.0,
                    "total_size": 0.0,
                    "total_pnl": 0.0,
                },
            )
            stats["trades"] += weight
            stats["total_size"] += result.size * weight
            stats["total_pnl"] += result.pnl * weight
            if result.pnl > 1e-9:
                stats["wins"] += weight

    strategy_performance = {}
    for name, stats in strategy_perf.items():
        trades_count = stats["trades"]
        strategy_performance[name] = {
            "trades": round(trades_count, 4),
            "avg_trade_size": (stats["total_size"] / trades_count) if trades_count else 0.0,
            "total_pnl": stats["total_pnl"],
            "avg_pnl": (stats["total_pnl"] / trades_count) if trades_count else 0.0,
            "win_rate": (stats["wins"] / trades_count) if trades_count else 0.0,
        }

    performance_metrics = {
        "closed_trades": total_trades,
        "open_positions": 0,
        "current_balance": current_balance,
        "total_pnl": total_pnl,
        "win_rate": (wins / total_trades) if total_trades else 0.0,
        "total_return": (total_pnl / 10_000.0) if total_trades else 0.0,
        "total_trades": total_trades,
        "approved_trades": approved_trades,
        "total_size": total_size,
        "approval_rate": (approved_trades / total_trades) if total_trades else 0.0,
        "loss_trades": losses,
        "avg_trade_size": (total_size / total_trades) if total_trades else 0.0,
        "pnl_stddev": (statistics.pstdev(pnl_series) if len(pnl_series) > 1 else 0.0),
    }

    simulation_summary = {
        "start_time": start_time,
        "current_time": datetime.now(UTC).isoformat(),
        "initial_balance": 10_000.0,
        "performance_metrics": performance_metrics,
        "strategy_performance": strategy_performance,
    }

    return {
        "trades": trades,
        "simulation_summary": simulation_summary,
        "report_metadata": {
            "generated_at": datetime.now(UTC).isoformat(),
            "report_type": "simulation",
            "version": "1.1",
        },
    }


async def simulate(markets: int, offline: bool, limit: int) -> List[SimulationResult]:
    original_offline = settings.OFFLINE_MODE
    try:
        settings.OFFLINE_MODE = offline
        facade = DataIngestionFacade(use_graphql=False, ttl_seconds=0, limit=limit)
        try:
            snapshots = await facade.get_markets(force_refresh=True)
        finally:
            # Ensure network resources are released to avoid unclosed session warnings
            try:
                await facade.close()
            except Exception:
                pass
        engine = StrategyEngine(settings.strategies)
        risk = RiskEngine()
        portfolio = _build_portfolio()

        results: List[SimulationResult] = []
        for snapshot in snapshots[:markets]:
            order = engine.generate_order(snapshot.raw)
            if order.get("action") == "hold" or order.get("size", 0) <= 0:
                continue
            metadata = order.get("metadata", {}) or {}
            approved = risk.validate_order(order, portfolio)
            risk_meta = metadata.get("risk", {}) or {}
            risk_meta["approved"] = approved
            entry_yes = _entry_yes_price(order["action"], snapshot.raw)
            combined_score = float(metadata.get("combined_score", 0.0) or 0.0)
            exit_yes = _simulate_exit_yes(entry_yes, combined_score, snapshot.raw.get("volatility"))
            trade_metrics = _calculate_trade_metrics(
                order["action"], float(order["size"]), entry_yes, exit_yes
            )
            results.append(
                SimulationResult(
                    market_id=snapshot.market_id,
                    action=order["action"],
                    size=float(order["size"]),
                    risk_metadata=risk_meta,
                    strategy_metadata=metadata,
                    timestamp=datetime.now(UTC).isoformat(),
                    entry_price=entry_yes,
                    exit_price=exit_yes,
                    shares=trade_metrics["shares"],
                    pnl=trade_metrics["pnl"],
                )
            )
        return results
    finally:
        settings.OFFLINE_MODE = original_offline


def main(argv: Optional[List[str]] = None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Run a lightweight trading simulation")
    parser.add_argument("--markets", type=int, default=5, help="Number of markets to evaluate")
    parser.add_argument("--limit", type=int, default=20, help="Fetch limit passed to the data facade")
    parser.add_argument("--offline", action="store_true", help="Force offline mode (mock data)")
    parser.add_argument("--output", type=Path, help="Optional path to write JSON results")
    parser.add_argument("--legacy-format", action="store_true", help="Use legacy array format instead of web-compatible format")
    args = parser.parse_args(argv)

    start_time = datetime.now(UTC).isoformat()
    results = asyncio.run(simulate(args.markets, args.offline or settings.OFFLINE_MODE, args.limit))
    
    if args.legacy_format:
        # Use the old array format for backward compatibility
        payload = [item.as_dict() for item in results]
    else:
        # Use the new web-compatible format
        payload = _build_simulation_report(results, start_time)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        if args.legacy_format:
            print(f"Wrote {len(results)} orders to {args.output} (legacy format)")
        else:
            print(f"Wrote simulation report with {len(results)} trades to {args.output}")
    else:
        print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
