#!/usr/bin/env python3
"""Replay/inspect OrderStore JSONL (orders/trades) with filters.

Usage examples:
  python scripts/replay_order_store.py --orders --since "2025-10-13T00:00:00Z" --market SIM-1 --limit 20
  python scripts/replay_order_store.py --trades --last-minutes 30 --side yes --stats
  python scripts/replay_order_store.py --orders --trades --since "2025-10-13T08:00:00Z" --until "2025-10-13T10:00:00Z"
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Optional, Tuple
import csv

from polymarket.services.order_store import OrderStore


def _parse_time(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    text = value.strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except Exception:
        return None


def _since_until(args: argparse.Namespace) -> Tuple[Optional[datetime], Optional[datetime]]:
    since = _parse_time(args.since)
    until = _parse_time(args.until)
    if args.last_minutes:
        try:
            minutes = int(args.last_minutes)
            until = datetime.now(timezone.utc)
            since = until - timedelta(minutes=max(1, minutes))
        except Exception:
            pass
    return since, until


def _filter_records(records: Iterable[Dict[str, Any]], *, args: argparse.Namespace) -> Iterator[Dict[str, Any]]:
    markets = set([m.strip() for m in (args.market or []) if m and str(m).strip()])
    side = str(args.side).lower() if args.side else None
    since, until = _since_until(args)
    for rec in records:
        if markets:
            mid = str(rec.get("market_id") or "")
            if mid not in markets:
                continue
        if side:
            s = str(rec.get("action") or rec.get("side") or "").lower()
            if s != side:
                continue
        if since or until:
            ts = rec.get("timestamp")
            dt = None
            if isinstance(ts, (int, float)):
                try:
                    dt = datetime.fromtimestamp(float(ts), tz=timezone.utc)
                except Exception:
                    dt = None
            elif isinstance(ts, str):
                try:
                    txt = ts.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(txt)
                except Exception:
                    dt = None
            elif isinstance(ts, datetime):
                dt = ts
            if since and (dt is None or dt < since):
                continue
            if until and (dt is None or dt > until):
                continue
        yield rec


def _stats(records: Iterable[Dict[str, Any]], *, kind: str) -> Dict[str, Any]:
    total = 0
    by_event: Dict[str, int] = {}
    by_reason: Dict[str, int] = {}
    for rec in records:
        total += 1
        if kind == "orders":
            ev = str(rec.get("event") or "submit").lower()
            by_event[ev] = by_event.get(ev, 0) + 1
            if ev == "reject" or rec.get("reason"):
                key = str(rec.get("reason") or ev)
                by_reason[key] = by_reason.get(key, 0) + 1
        else:
            st = str(rec.get("status") or "").lower()
            by_event[st] = by_event.get(st, 0) + 1
    out: Dict[str, Any] = {"kind": kind, "total": total, "by_event": by_event}
    if by_reason:
        out["by_reason"] = by_reason
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay/inspect OrderStore JSONL with filters")
    parser.add_argument("--orders", action="store_true", help="Include orders.jsonl")
    parser.add_argument("--trades", action="store_true", help="Include trades.jsonl")
    parser.add_argument("--since", help="ISO8601 start time (e.g., 2025-10-13T08:00:00Z)")
    parser.add_argument("--until", help="ISO8601 end time")
    parser.add_argument("--last-minutes", type=int, help="Window in minutes (overrides since/until)")
    parser.add_argument("--market", action="append", help="Filter by market_id (repeatable)")
    parser.add_argument("--side", choices=["yes", "no"], help="Filter by side")
    parser.add_argument("--limit", type=int, default=50, help="Max records per stream to print")
    parser.add_argument("--stats", action="store_true", help="Print aggregate counts instead of full records")
    parser.add_argument("--csv", help="Optional CSV output path; when both streams selected, suffix _orders/_trades is added")
    args = parser.parse_args()

    store = OrderStore()
    streams: List[str] = []
    if args.orders:
        streams.append("orders")
    if args.trades:
        streams.append("trades")
    if not streams:
        streams = ["orders", "trades"]

    output: Dict[str, Any] = {"streams": streams, "results": {}}
    for kind in streams:
        if kind == "orders":
            records = store.iter_orders()
        else:
            records = store.iter_trades()
        filtered = list(_filter_records(records, args=args))
        if args.stats:
            output["results"][kind] = _stats(filtered, kind=kind)
        else:
            # Tail print
            tail = filtered[-args.limit :] if args.limit and len(filtered) > args.limit else filtered
            output["results"][kind] = tail

    # Optional CSV export
    if args.csv:
        out_base = Path(args.csv)
        targets: List[Tuple[str, Path]] = []
        if len(streams) == 1:
            targets.append((streams[0], out_base))
        else:
            targets.append(("orders", out_base.with_name(out_base.stem + "_orders" + out_base.suffix)))
            targets.append(("trades", out_base.with_name(out_base.stem + "_trades" + out_base.suffix)))
        for kind, path in targets:
            rows = output["results"].get(kind)
            if not rows or args.stats:
                # For stats mode or empty rows, dump JSON instead
                path.write_text(json.dumps(rows, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
                continue
            # Collect fieldnames union
            fieldnames: List[str] = []
            for rec in rows:
                if isinstance(rec, dict):
                    for k in rec.keys():
                        if k not in fieldnames:
                            fieldnames.append(k)
            with path.open("w", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=fieldnames)
                writer.writeheader()
                for rec in rows:
                    writer.writerow(rec)

    # Always print JSON to stdout for interactive inspection
    print(json.dumps(output, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
