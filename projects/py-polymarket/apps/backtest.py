"""Command-line entry point for running strategy backtests with optional PnL.

This augments the basic one-shot simulator by optionally waiting for a holding
horizon and computing mark-to-market PnL for each generated order. When a
second snapshot is not available (e.g., offline mode), a conservative synthetic
exit price is derived from available change fields.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from apps.simulation import SimulationResult, simulate
from config import settings
from config import settings
from polymarket.data.facade import DataIngestionFacade


def run_backtest(markets: int, offline: bool, limit: int) -> List[SimulationResult]:
    """Execute the async simulator and return raw results."""

    return asyncio.run(simulate(markets=markets, offline=offline, limit=limit))


def _apply_offset(price: Optional[float], offset_bps: float, direction: int) -> Optional[float]:
    if price is None or offset_bps <= 0:
        return price
    try:
        px = float(price)
    except (TypeError, ValueError):
        return price
    delta = px * (offset_bps / 10_000.0)
    adjusted = px + (delta * direction)
    return max(0.0, min(1.0, adjusted))


def _entry_price(
    action: str,
    snapshot: Dict[str, Any],
    *,
    model: Optional[str] = None,
    maker_offset_bps: float = 0.0,
    taker_offset_bps: float = 0.0,
) -> Optional[float]:
    bid = snapshot.get("bid")
    ask = snapshot.get("ask")
    yes = snapshot.get("yes_price")
    mid = snapshot.get("mid_price")
    active_model = str(model or getattr(settings.execution, "slippage_model", "taker")).lower()
    if active_model == "mid":
        px = float(mid if mid is not None else (yes if yes is not None else 0.5))
        return px
    if active_model in {"maker", "maker_limit"}:
        if action == "yes":
            px = float(bid if bid is not None else (mid if mid is not None else (yes or 0.5)))
            return _apply_offset(px, maker_offset_bps, -1)
        if action == "no":
            px = float(ask if ask is not None else (mid if mid is not None else (1 - (yes or 0.5))))
            return _apply_offset(px, maker_offset_bps, 1)
    # default: taker
    if action == "yes":
        px = float(ask if ask is not None else (mid if mid is not None else yes or 0.5))
        return _apply_offset(px, taker_offset_bps, 1)
    if action == "no":
        px = float(bid if bid is not None else (mid if mid is not None else (1 - (yes or 0.5))))
        return _apply_offset(px, taker_offset_bps, -1)
    return None


def _exit_price_from_snapshot(
    action: str,
    snapshot: Dict[str, Any],
    *,
    model: Optional[str] = None,
    maker_offset_bps: float = 0.0,
    taker_offset_bps: float = 0.0,
) -> Optional[float]:
    bid = snapshot.get("bid")
    ask = snapshot.get("ask")
    yes = snapshot.get("yes_price")
    mid = snapshot.get("mid_price")
    active_model = str(model or getattr(settings.execution, "slippage_model", "taker")).lower()
    if active_model == "mid":
        px = float(mid if mid is not None else (yes if yes is not None else 0.5))
        return px
    if active_model in {"maker", "maker_limit"}:
        if action == "yes":
            px = float(ask if ask is not None else (mid if mid is not None else (yes or 0.5)))
            return _apply_offset(px, maker_offset_bps, 1)
        if action == "no":
            px = float(bid if bid is not None else (mid if mid is not None else (1 - (yes or 0.5))))
            return _apply_offset(px, maker_offset_bps, -1)
    # Taker: opposite side
    if action == "yes":
        px = float(bid if bid is not None else (mid if mid is not None else yes or 0.5))
        return _apply_offset(px, taker_offset_bps, -1)
    if action == "no":
        px = float(ask if ask is not None else (mid if mid is not None else (1 - (yes or 0.5))))
        return _apply_offset(px, taker_offset_bps, 1)
    return None


def _synthetic_exit(entry: float, snapshot: Dict[str, Any], holding_seconds: int, action: str) -> float:
    """Derive a synthetic exit using available change hints.

    Uses `price_change_24h` first, then `momentum` as a fallback. Scales by
    holding_seconds/86400 and clamps to [0,1].
    """
    change = snapshot.get("price_change_24h")
    if change is None:
        change = snapshot.get("momentum")
    try:
        change = float(change)
    except (TypeError, ValueError):
        change = 0.0
    scale = max(0.0, min(1.0, float(holding_seconds) / 86400.0))
    # If action is "no" (short yes), invert sign for intuitive PnL direction
    drift = change * scale
    implied = entry * (1.0 + drift)
    implied = max(0.0, min(1.0, implied))
    return float(implied)


def _shares_from_notional(action: str, notional: float, entry_price: float) -> float:
    if entry_price <= 0:
        return 0.0
    if action == "yes":
        denom = entry_price
    else:
        denom = max(1.0 - entry_price, 1e-9)
    return float(notional) / max(denom, 1e-9)


def _compute_pnl(
    action: str,
    notional: float,
    entry: float,
    exit_: float,
    *,
    fee_model: Optional[str] = None,
) -> Dict[str, float]:
    shares = _shares_from_notional(action, notional, entry)
    if action == "yes":
        diff = exit_ - entry
    elif action == "no":
        diff = entry - exit_
    else:
        diff = 0.0
    pnl = shares * diff
    notional_base = float(notional)
    pnl_pct = pnl / max(1e-9, notional_base)
    model = str(fee_model or getattr(settings.execution, "slippage_model", "taker")).lower()
    if model in {"maker", "maker_limit"}:
        fee_rate = float(getattr(settings, "MAKER_FEE", 0.0))
    elif model == "mid":
        fee_rate = float(getattr(settings, "TAKER_FEE", 0.005))
    else:
        fee_rate = float(getattr(settings, "TAKER_FEE", 0.005))
    fees = notional_base * fee_rate * 2.0
    pnl_fee = pnl - fees
    return {
        "shares": shares,
        "pnl": pnl,
        "pnl_pct": pnl_pct,
        "fees": fees,
        "pnl_after_fees": pnl_fee,
    }


def backtest_with_pnl(
    markets: int,
    limit: int,
    offline: bool,
    holding_seconds: int,
    *,
    pricing_model: Optional[str] = None,
    maker_offset_bps: float = 0.0,
    taker_offset_bps: float = 0.0,
) -> Dict[str, Any]:
    """Run backtest and compute entry/exit/PnL per trade with a holding horizon."""

    # 1) Generate orders on the first snapshot
    results = run_backtest(markets=markets, offline=offline, limit=limit)
    orders: List[Dict[str, Any]] = [r.as_dict() for r in results]

    # Early return if no orders
    if not orders:
        active_model = pricing_model or getattr(settings.execution, "slippage_model", "taker")
        return {
            "trades": [],
            "simulation_summary": {
                "start_time": None,
                "current_time": None,
                "initial_balance": 10000.0,
                "performance_metrics": {
                    "closed_trades": 0,
                    "open_positions": 0,
                    "current_balance": 10000.0,
                    "total_pnl": 0.0,
                    "total_fees": 0.0,
                    "total_pnl_after_fees": 0.0,
                    "win_rate": 0.0,
                    "total_return": 0.0,
                },
            },
            "report_metadata": {
                "generated_at": None,
                "report_type": "backtest_pnl",
                "version": "1.1",
                "pricing_model": active_model,
                "maker_offset_bps": maker_offset_bps,
                "taker_offset_bps": taker_offset_bps,
            },
        }

    # Build a map of market_id -> raw snapshot for entry prices
    # Force the facade into the requested offline/online mode
    original_offline = settings.OFFLINE_MODE
    try:
        settings.OFFLINE_MODE = offline
        facade = DataIngestionFacade(use_graphql=False, ttl_seconds=0, limit=limit)
        first_snapshots = asyncio.run(facade.get_markets(force_refresh=False))
        first_map: Dict[str, Dict[str, Any]] = {s.market_id: s.raw for s in first_snapshots}

        # 2) Holding horizon and second snapshot
        if offline:
            # In offline mode, skip fetching a second snapshot to force synthetic exits
            second_map: Dict[str, Dict[str, Any]] = {}
        else:
            if holding_seconds > 0:
                time.sleep(holding_seconds)
            second_snapshots = asyncio.run(facade.get_markets(force_refresh=True))
            second_map = {s.market_id: s.raw for s in second_snapshots}
    finally:
        settings.OFFLINE_MODE = original_offline

    closed = 0
    total_pnl = 0.0
    total_fees = 0.0
    total_pnl_after_fees = 0.0
    win = 0
    enriched_trades: List[Dict[str, Any]] = []
    strategy_agg: Dict[str, Dict[str, float]] = {}

    for order in orders:
        mid = order.get("market_id")
        action = str(order.get("action"))
        size = float(order.get("size", 0.0))
        snap0 = first_map.get(mid, {})
        entry = _entry_price(
            action,
            snap0,
            model=pricing_model,
            maker_offset_bps=maker_offset_bps,
            taker_offset_bps=taker_offset_bps,
        )
        exit_snap = second_map.get(mid)
        if exit_snap is not None:
            exit_price = _exit_price_from_snapshot(
                action,
                exit_snap,
                model=pricing_model,
                maker_offset_bps=maker_offset_bps,
                taker_offset_bps=taker_offset_bps,
            )
        else:
            exit_price = _synthetic_exit(entry or 0.5, snap0, holding_seconds, action)

        pnl_info = _compute_pnl(
            action,
            size,
            float(entry or 0.0),
            float(exit_price or 0.0),
            fee_model=pricing_model,
        )
        is_closed = exit_price is not None
        closed += 1 if is_closed else 0
        total_pnl += pnl_info["pnl"]
        total_fees += pnl_info.get("fees", 0.0)
        total_pnl_after_fees += pnl_info.get("pnl_after_fees", pnl_info["pnl"] - pnl_info.get("fees", 0.0))
        if pnl_info["pnl_after_fees"] > 0:
            win += 1

        enriched = dict(order)
        enriched["entry_price"] = entry
        enriched["exit_price"] = exit_price
        enriched["shares"] = pnl_info.get("shares")
        enriched["fees"] = pnl_info.get("fees")
        enriched["pnl_after_fees"] = pnl_info.get("pnl_after_fees")
        enriched.update(pnl_info)
        enriched_trades.append(enriched)

        # Aggregate by strategies
        meta = (order.get("strategy_metadata") or {})
        for s in (meta.get("strategies") or []):
            name = s.get("name")
            if not name:
                continue
            agg = strategy_agg.setdefault(name, {"trades": 0, "pnl": 0.0})
            agg["trades"] += 1
            agg["pnl"] += pnl_info["pnl_after_fees"]

    # 3) Build report
    metrics = {
        "closed_trades": closed,
        "open_positions": max(0, len(enriched_trades) - closed),
        "current_balance": 10000.0 + total_pnl_after_fees,
        "total_pnl": total_pnl,
        "total_fees": total_fees,
        "total_pnl_after_fees": total_pnl_after_fees,
        "win_rate": (win / max(1, closed)) if closed else 0.0,
        "total_return": total_pnl_after_fees / 10000.0,
    }
    summary = {
        "start_time": None,
        "current_time": None,
        "initial_balance": 10000.0,
        "performance_metrics": metrics,
        "strategy_performance": strategy_agg,
    }
    return {
        "trades": enriched_trades,
        "simulation_summary": summary,
        "report_metadata": {
            "generated_at": time.time(),
            "report_type": "backtest_pnl",
            "version": "1.1",
            "pricing_model": (pricing_model or getattr(settings.execution, "slippage_model", "taker")),
            "maker_offset_bps": maker_offset_bps,
            "taker_offset_bps": taker_offset_bps,
        },
    }


def append_backtest_ledger(
    trades: Iterable[Dict[str, Any]],
    ledger_path: Path,
    *,
    holding_seconds: int,
    pricing_model: Optional[str],
    maker_offset_bps: float,
    taker_offset_bps: float,
) -> None:
    """Append per-trade records to a CSV ledger."""

    trades = list(trades)
    if not trades:
        return

    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "run_timestamp",
        "holding_seconds",
        "pricing_model",
        "maker_offset_bps",
        "taker_offset_bps",
        "market_id",
        "action",
        "notional",
        "shares",
        "entry_price",
        "exit_price",
        "pnl",
        "pnl_after_fees",
        "fees",
        "win",
        "strategies",
    ]
    write_header = not ledger_path.exists()
    now_ts = time.time()

    with ledger_path.open("a", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()
        for trade in trades:
            strategy_meta = (trade.get("strategy_metadata") or {})
            strategies = []
            for entry in strategy_meta.get("strategies") or []:
                name = entry.get("name") if isinstance(entry, dict) else entry
                if name:
                    strategies.append(str(name))
            strategies_str = ",".join(sorted(set(strategies)))
            pnl_after = float(trade.get("pnl_after_fees", trade.get("pnl", 0.0)) or 0.0)
            row = {
                "run_timestamp": round(now_ts, 3),
                "holding_seconds": holding_seconds,
                "pricing_model": pricing_model or "",
                "maker_offset_bps": maker_offset_bps,
                "taker_offset_bps": taker_offset_bps,
                "market_id": trade.get("market_id"),
                "action": trade.get("action"),
                "notional": trade.get("notional", trade.get("size")),
                "shares": trade.get("shares"),
                "entry_price": trade.get("entry_price"),
                "exit_price": trade.get("exit_price"),
                "pnl": trade.get("pnl"),
                "pnl_after_fees": pnl_after,
                "fees": trade.get("fees"),
                "win": 1 if pnl_after > 0 else 0,
                "strategies": strategies_str,
            }
            writer.writerow(row)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a backtest and optionally compute PnL over a holding horizon")
    parser.add_argument("--markets", type=int, default=10, help="Number of markets to include")
    parser.add_argument("--limit", type=int, default=50, help="Underlying data fetch limit")
    parser.add_argument("--offline", action="store_true", help="Force the data facade to use bundled offline fixtures")
    parser.add_argument("--holding-seconds", type=int, default=0, help="Holding horizon in seconds before exit pricing (online mode recommended)")
    parser.add_argument(
        "--pricing-model",
        choices=["taker", "maker", "maker_limit", "mid"],
        help="Override pricing model for entry/exit marks (defaults to settings.execution.slippage_model)",
    )
    parser.add_argument(
        "--maker-offset-bps",
        type=float,
        default=0.0,
        help="Basis-point adjustment applied when using maker/maker_limit model (negative for better fills, positive for conservative)",
    )
    parser.add_argument(
        "--taker-offset-bps",
        type=float,
        default=0.0,
        help="Basis-point slippage applied to taker entry/exit prices",
    )
    parser.add_argument("--output", type=Path, help="Optional JSON file to persist the results (with PnL if enabled)")
    parser.add_argument(
        "--csv-ledger",
        type=Path,
        help="Append per-trade results to this CSV ledger (created if missing)",
    )

    args = parser.parse_args()

    if args.holding_seconds > 0 or not args.offline:
        pricing_model = args.pricing_model
        if pricing_model == "maker":
            pricing_model = "maker_limit"
        payload = backtest_with_pnl(
            args.markets,
            args.limit,
            args.offline,
            args.holding_seconds,
            pricing_model=pricing_model,
            maker_offset_bps=abs(float(args.maker_offset_bps or 0.0)),
            taker_offset_bps=abs(float(args.taker_offset_bps or 0.0)),
        )
    else:
        # Legacy behaviour — no PnL
        results = run_backtest(args.markets, args.offline, args.limit)
        payload = [r.as_dict() for r in results]

    text = json.dumps(payload, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
        if isinstance(payload, dict):
            count = len(payload.get("trades", []))
        else:
            count = len(payload)
        print(f"Backtest complete: wrote {count} orders to {args.output}")
    else:
        print(text)

    if args.csv_ledger and isinstance(payload, dict):
        metadata = payload.get("report_metadata", {}) if isinstance(payload, dict) else {}
        append_backtest_ledger(
            payload.get("trades", []),
            args.csv_ledger,
            holding_seconds=args.holding_seconds,
            pricing_model=metadata.get("pricing_model"),
            maker_offset_bps=float(metadata.get("maker_offset_bps", 0.0) or 0.0),
            taker_offset_bps=float(metadata.get("taker_offset_bps", 0.0) or 0.0),
        )
        print(f"Ledger updated: {args.csv_ledger}")


if __name__ == "__main__":
    main()
