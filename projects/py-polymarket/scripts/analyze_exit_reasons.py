"""Daily exit analytics for Polymarket fills.

This utility reads ``reports/fills.jsonl`` and produces a comparison between the
most recent 24 hour window and the preceding 24 hour period. It computes:

- trade counts and total PnL after fees
- exit reason distribution (top 5)
- worst per-market performance (top 10 losers per bucket)
- tp_sl share and whether it breaches a configured threshold (default 70%)

Results are both printed to stdout and written to ``reports/exit_analytics.json``
so the monitoring stack or notebooks can ingest them later.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple

FILLS_PATH = Path("reports/fills.jsonl")
OUTPUT_PATH = Path("reports/exit_analytics.json")


def _iter_fills(path: Path) -> Iterable[Dict[str, Any]]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except Exception:
                continue
            yield record


def _parse_timestamp(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value)
    try:
        # Accept both naive UTC and isoformat with timezone designator
        return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def analyze_fills(
    fills: Iterable[Dict[str, Any]],
    *,
    now: datetime,
    window_hours: int,
) -> Dict[str, Any]:
    recent_start = now - timedelta(hours=window_hours)
    prior_start = now - timedelta(hours=window_hours * 2)

    buckets = {
        "current": {
            "start": recent_start,
            "end": now,
            "totals": defaultdict(float),
            "counts": Counter(),
            "reasons": Counter(),
        },
        "previous": {
            "start": prior_start,
            "end": recent_start,
            "totals": defaultdict(float),
            "counts": Counter(),
            "reasons": Counter(),
        },
    }

    for record in fills:
        dt = _parse_timestamp(record.get("timestamp"))
        if dt is None:
            continue
        bucket_key: str | None
        if buckets["current"]["start"] <= dt <= buckets["current"]["end"]:
            bucket_key = "current"
        elif buckets["previous"]["start"] <= dt < buckets["previous"]["end"]:
            bucket_key = "previous"
        else:
            bucket_key = None
        if bucket_key is None:
            continue
        bucket = buckets[bucket_key]
        market_id = str(record.get("market_id") or "unknown")
        pnl = float(record.get("pnl_after_fees", record.get("pnl", 0.0)) or 0.0)
        bucket["totals"][market_id] += pnl
        bucket["counts"][market_id] += 1
        reason = record.get("reason")
        if reason:
            bucket["reasons"][str(reason)] += 1

    def summarise(bucket: Dict[str, Any]) -> Dict[str, Any]:
        totals: Dict[str, float] = bucket["totals"]
        counts: Counter = bucket["counts"]
        reasons: Counter = bucket["reasons"]

        total_trades = sum(counts.values())
        total_pnl = sum(totals.values())

        def top_losses(items: Iterable[Tuple[str, float]], limit: int = 10) -> Iterable[Tuple[str, float, int]]:
            return [
                (mid, round(pnl, 4), counts[mid])
                for mid, pnl in sorted(items, key=lambda kv: kv[1])[:limit]
            ]

        reason_list = reasons.most_common(5)
        tp_sl_count = next((count for reason, count in reason_list if reason == "tp_sl"), 0)
        tp_sl_share = (tp_sl_count / total_trades) if total_trades else 0.0

        return {
            "start": bucket["start"].isoformat(),
            "end": bucket["end"].isoformat(),
            "total_trades": total_trades,
            "total_pnl": round(total_pnl, 6),
            "reason_counts": reason_list,
            "tp_sl_share": round(tp_sl_share, 4),
            "worst_markets": top_losses(totals.items(), limit=10),
        }

    return {key: summarise(value) for key, value in buckets.items()}


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyse exit reasons over the last 24 hours vs the prior period.")
    parser.add_argument("--window-hours", type=int, default=24, help="Analysis window length in hours (default: 24).")
    parser.add_argument("--threshold", type=float, default=0.70, help="Alert when tp_sl share exceeds this fraction (default: 0.70).")
    parser.add_argument(
        "--fills",
        type=Path,
        default=FILLS_PATH,
        help="Path to fills JSONL file (default: reports/fills.jsonl).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help="Where to write JSON summary (default: reports/exit_analytics.json).",
    )
    args = parser.parse_args()

    now = datetime.now(timezone.utc)
    fills = list(_iter_fills(args.fills))
    results = analyze_fills(fills, now=now, window_hours=args.window_hours)

    alert_flags = {}
    for bucket_name, data in results.items():
        share = data.get("tp_sl_share", 0.0)
        alert_flags[bucket_name] = share >= args.threshold
        print(
            f"[{bucket_name}] trades={data['total_trades']} pnl={data['total_pnl']:.2f} "
            f"tp_sl_share={share:.2%} alert={'YES' if alert_flags[bucket_name] else 'no'}"
        )
        print(f"  top reasons: {data['reason_counts']}")
        print(f"  worst markets: {data['worst_markets']}")

    payload = {
        "generated_at": now.isoformat(),
        "window_hours": args.window_hours,
        "threshold": args.threshold,
        "results": results,
        "tp_sl_alert": alert_flags,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
