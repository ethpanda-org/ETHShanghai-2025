"""
Analyze event-driven activity over a given UTC date or rolling window.

Outputs a JSON summary including:
- Event-driven execute decisions count by hour
- Event-driven exits by reason with PnL and win-rate
- Top markets and sources (newsapi/twitter/volume_based)
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


def parse_iso(dt: str) -> datetime:
    return datetime.fromisoformat(dt.replace("Z", "+00:00"))


def load_jsonl(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    out: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except Exception:
                continue
    return out


def is_event_exit(rec: Dict[str, Any]) -> bool:
    reason = str(rec.get("reason") or "")
    return reason.startswith("event_") or reason.startswith("strategy_event_driven:")


def analyze(date: Optional[str] = None, hours: Optional[int] = None) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    if date:
        start = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
        end = start + timedelta(days=1)
    else:
        window = int(hours or 24)
        end = now
        start = end - timedelta(hours=window)

    fills = load_jsonl(Path("reports") / "fills.jsonl")
    exits = load_jsonl(Path("reports") / "realized_exits.jsonl")
    decisions = load_jsonl(Path("reports") / "decisions.jsonl")

    # Event-driven executes by hour (decisions)
    exec_by_hour = Counter()
    source_counts = Counter()
    market_counts = Counter()
    for d in decisions:
        if str(d.get("type")) != "execute":
            continue
        ts = d.get("timestamp")
        if not ts:
            continue
        try:
            tdt = parse_iso(ts)
        except Exception:
            continue
        if not (start <= tdt < end):
            continue
        # Inspect strategies metadata if available
        meta = d.get("metadata") or {}
        strats = meta.get("strategies") or []
        names = [s.get("name") for s in strats if isinstance(s, dict)] if isinstance(strats, list) else []
        if "event_driven" not in names and not str(d.get("reason") or "").startswith("event_"):
            continue
        hour_key = tdt.strftime("%Y-%m-%d %H:00")
        exec_by_hour[hour_key] += 1

    # Sources and markets from fills entries
    for f in fills:
        if f.get("event") != "entry":
            continue
        ts = f.get("timestamp")
        if not ts:
            continue
        try:
            tdt = parse_iso(ts)
        except Exception:
            continue
        if not (start <= tdt < end):
            continue
        meta = f.get("strategy_metadata") or {}
        arr = meta.get("strategies") or []
        names = [s.get("name") for s in arr if isinstance(s, dict)] if isinstance(arr, list) else []
        if "event_driven" not in names:
            continue
        market_counts[str(f.get("market_id"))] += 1
        src = str(f.get("sentiment_source") or (meta.get("sentiment_source") if isinstance(meta, dict) else "") or "").lower()
        if not src:
            src = "unknown"
        source_counts[src] += 1

    # Exits: win rate and reasons (+ holding)
    wins = losses = 0
    pnl_sum = 0.0
    by_reason = Counter()
    pnl_by_reason = defaultdict(float)
    hold_sum = 0.0
    hold_samples = 0
    for r in exits:
        ts = r.get("timestamp")
        if not ts:
            continue
        try:
            tdt = parse_iso(ts)
        except Exception:
            continue
        if not (start <= tdt < end):
            continue
        if not is_event_exit(r):
            continue
        pnl = float(r.get("pnl_after_fees", r.get("pnl", 0.0)) or 0.0)
        pnl_sum += pnl
        if pnl > 0:
            wins += 1
        elif pnl < 0:
            losses += 1
        reason = str(r.get("reason") or "event").split(":", 1)[-1]
        by_reason[reason] += 1
        pnl_by_reason[reason] += pnl
        hs = r.get("holding_seconds")
        try:
            if hs is not None:
                hold_sum += float(hs)
                hold_samples += 1
        except Exception:
            pass

    total = wins + losses
    # Slippage/fees for event-driven fills
    slip_sum = 0.0
    slip_notional_sum = 0.0
    fees_sum = 0.0
    events_count = 0
    for f in fills:
        ts = f.get("timestamp")
        if not ts:
            continue
        try:
            tdt = parse_iso(ts)
        except Exception:
            continue
        if not (start <= tdt < end):
            continue
        if f.get("event") not in ("entry", "exit"):
            continue
        # Check if this fill is from event-driven
        meta = f.get("strategy_metadata") or {}
        arr = meta.get("strategies") or []
        names = [s.get("name") for s in arr if isinstance(s, dict)] if isinstance(arr, list) else []
        if "event_driven" not in names:
            continue
        try:
            sl = float(f.get("slippage", 0.0) or 0.0)
        except Exception:
            sl = 0.0
        try:
            notional = float(f.get("notional", 0.0) or 0.0)
        except Exception:
            notional = 0.0
        try:
            fees_val = float(f.get("fees", 0.0) or 0.0)
        except Exception:
            fees_val = 0.0
        slip_sum += sl * (notional if notional else 1.0)
        slip_notional_sum += notional if notional else 1.0
        fees_sum += fees_val
        events_count += 1
    return {
        "window": {
            "start": start.isoformat(),
            "end": end.isoformat(),
        },
        "decisions_per_hour": dict(exec_by_hour),
        "entries_by_source": dict(source_counts),
        "entries_by_market": dict(market_counts),
        "exits": {
            "wins": wins,
            "losses": losses,
            "win_rate": (wins / total) if total else 0.0,
            "pnl_after_fees": pnl_sum,
            "avg_holding_seconds": (hold_sum / hold_samples) if hold_samples else 0.0,
            "reasons": {
                "counts": dict(by_reason),
                "pnl_after_fees": dict(sorted(pnl_by_reason.items(), key=lambda kv: kv[1], reverse=True)),
            },
        },
        "slippage": {
            "events": events_count,
            "notional_weighted_slippage": (slip_sum / slip_notional_sum) if slip_notional_sum else 0.0,
            "total_fees": fees_sum,
        },
    }


def main() -> None:
    import argparse

    ap = argparse.ArgumentParser(description="Analyze event-driven activity")
    ap.add_argument("--date", help="UTC date YYYY-MM-DD (overrides --hours)")
    ap.add_argument("--hours", type=int, default=24, help="Rolling hours (default 24)")
    args = ap.parse_args()

    summary = analyze(date=args.date, hours=args.hours if not args.date else None)
    out_dir = Path("reports")
    out_dir.mkdir(parents=True, exist_ok=True)
    if args.date:
        out_path = out_dir / f"_analysis_event_driven_{args.date}.json"
    else:
        out_path = out_dir / f"_analysis_event_driven_last{int(args.hours)}h.json"
    out_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
