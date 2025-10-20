"""One-shot exit evaluator for offline tests and tooling.

This mirrors the exit evaluation inside runner but avoids side effects.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Mapping, Tuple

from config import settings
from polymarket.execution.fees import get_fee_manager


def _current_mid(row: Mapping[str, Any]) -> float:
    bid = row.get("bid")
    ask = row.get("ask")
    mid = row.get("mid_price")
    if bid is not None and ask is not None:
        return (float(bid) + float(ask)) / 2.0
    if mid is not None:
        return float(mid)
    yes = row.get("yes_price")
    return float(yes) if yes is not None else 0.5


def _mark_yes_for_exit(side: str, row: Mapping[str, Any]) -> float:
    bid = row.get("bid")
    ask = row.get("ask")
    mid = _current_mid(row)
    if side == "yes":
        return float(bid) if bid is not None else mid
    return float(ask) if ask is not None else mid


def evaluate_exits_once(
    positions: Dict[str, Dict[str, Any]],
    snapshot_map: Dict[str, Any],
    *,
    now: datetime | None = None,
) -> Tuple[List[str], List[Dict[str, Any]]]:
    now = now or datetime.now(timezone.utc)
    EXIT_HOLDING_SECONDS = int(getattr(settings, "EXIT_HOLDING_SECONDS", 300))
    EXIT_MIN_HOLD_SECONDS = int(getattr(settings, "EXIT_MIN_HOLD_SECONDS", 120))
    EXIT_STOP_LOSS_PCT = float(getattr(settings, "EXIT_STOP_LOSS_PCT", 0.05))
    EXIT_TAKE_PROFIT_PCT = float(getattr(settings, "EXIT_TAKE_PROFIT_PCT", 0.10))
    EDGE_RISK_PREMIUM = float(getattr(settings, "EDGE_RISK_PREMIUM", 0.005))
    fee_manager = get_fee_manager()
    fee_rate = fee_manager.taker_fee

    to_close: List[str] = []
    exit_records: List[Dict[str, Any]] = []

    for mid, pos in list(positions.items()):
        snap = snapshot_map.get(mid)
        if not snap:
            continue
        try:
            row = snap.raw if hasattr(snap, "raw") else (snap if isinstance(snap, dict) else {})
            side = str(pos.get("side"))
            entry_yes = float(pos.get("entry_yes", 0.0)) or 0.0
            shares = float(pos.get("shares", 0.0)) or 0.0
            notional = float(pos.get("notional", 0.0)) or 0.0
            cur_yes_mark = _mark_yes_for_exit(side, row)
            pnl = shares * ((cur_yes_mark - entry_yes) if side == "yes" else (entry_yes - cur_yes_mark))
            pnl_pct = pnl / max(1e-9, notional)

            try:
                opened_at = datetime.fromisoformat(str(pos.get("opened_at")).replace("Z", "+00:00"))
                age_ok = (now - opened_at) >= timedelta(seconds=EXIT_HOLDING_SECONDS)
                age_min = (now - opened_at) >= timedelta(seconds=EXIT_MIN_HOLD_SECONDS)
            except Exception:
                age_ok = True
                age_min = True

            # simple cost model
            bid = row.get("bid")
            ask = row.get("ask")
            spread = (float(ask) - float(bid)) if (bid is not None and ask is not None) else 0.02
            cost_budget = fee_rate + (spread / 2.0) + EDGE_RISK_PREMIUM

            time_or_tp_sl = age_ok or pnl_pct <= -EXIT_STOP_LOSS_PCT or pnl_pct >= EXIT_TAKE_PROFIT_PCT
            # no edge-based invalidation here; keep it simple for offline test

            if time_or_tp_sl:
                to_close.append(mid)
                fees_total = notional * fee_rate
                exit_records.append(
                    {
                        "timestamp": now.isoformat(),
                        "market_id": mid,
                        "side": side,
                        "reason": "tp_sl" if (pnl_pct <= -EXIT_STOP_LOSS_PCT or pnl_pct >= EXIT_TAKE_PROFIT_PCT) else "time",
                        "notional": round(notional, 4),
                        "shares": round(shares, 6),
                        "entry_yes": round(entry_yes, 6),
                        "exit_yes": round(cur_yes_mark, 6),
                        "pnl": round(pnl, 6),
                        "pnl_pct": round(pnl_pct, 6),
                        "cost": round(cost_budget, 6),
                        "fees": round(fees_total, 6),
                        "pnl_after_fees": round(pnl - fees_total, 6),
                    }
                )
        except Exception:
            continue

    return to_close, exit_records


__all__ = ["evaluate_exits_once"]
