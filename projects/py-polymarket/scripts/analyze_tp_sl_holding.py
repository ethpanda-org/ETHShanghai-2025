"""Analyse tp_sl exits by holding time and entry confidence."""
from __future__ import annotations

import json
from collections import defaultdict, Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any

FILLS_PATH = Path("reports/fills.jsonl")
OUTPUT_PATH = Path("reports/tp_sl_holding_analysis.json")


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def analyse(file_path: Path) -> Dict[str, Any]:
    stacks: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    buckets = {
        "<=120s": {"count": 0, "pnl": 0.0, "confidence": []},
        "<=300s": {"count": 0, "pnl": 0.0, "confidence": []},
        ">300s": {"count": 0, "pnl": 0.0, "confidence": []},
    }
    strategy_counter = Counter()

    with file_path.open(encoding="utf-8", errors="ignore") as fh:
        for raw in fh:
            raw = raw.strip()
            if not raw:
                continue
            try:
                rec = json.loads(raw)
            except Exception:
                continue
            event = rec.get("event")
            if event == "entry":
                market_id = str(rec.get("market_id"))
                timestamp = rec.get("timestamp")
                if not market_id or not timestamp:
                    continue
                try:
                    ts = parse_timestamp(timestamp)
                except Exception:
                    continue
                confidence = None
                meta = rec.get("strategy_metadata") or {}
                if isinstance(meta, dict):
                    confidence = meta.get("confidence")
                    for strat in meta.get("strategies") or []:
                        if isinstance(strat, dict) and strat.get("name"):
                            strategy_counter[str(mutated := strat.get("name"))] += 1
                stacks[market_id].append({
                    "timestamp": ts,
                    "confidence": float(confidence) if confidence is not None else None,
                })
            elif event == "exit" and rec.get("reason") == "tp_sl":
                market_id = str(rec.get("market_id"))
                timestamp = rec.get("timestamp")
                pnl = float(rec.get("pnl_after_fees", rec.get("pnl", 0.0)) or 0.0)
                if not market_id or not timestamp or not stacks.get(market_id):
                    continue
                try:
                    exit_ts = parse_timestamp(timestamp)
                except Exception:
                    continue
                entry = stacks[market_id].pop(0)
                holding_seconds = (exit_ts - entry["timestamp"]).total_seconds()
                if holding_seconds <= 120:
                    bucket = "<=120s"
                elif holding_seconds <= 300:
                    bucket = "<=300s"
                else:
                    bucket = ">300s"
                buckets[bucket]["count"] += 1
                buckets[bucket]["pnl"] += pnl
                if entry["confidence"] is not None:
                    buckets[bucket]["confidence"].append(entry["confidence"])

    summary = {}
    for bucket, stats in buckets.items():
        avg_conf = sum(stats["confidence"]) / len(stats["confidence"]) if stats["confidence"] else None
        summary[bucket] = {
            "trades": stats["count"],
            "pnl": stats["pnl"],
            "avg_confidence": avg_conf,
        }
    summary["strategies"] = strategy_counter.most_common()
    return summary


def main() -> None:
    if not FILLS_PATH.exists():
        raise SystemExit(f"fills file not found: {FILLS_PATH}")
    results = analyse(FILLS_PATH)
    for bucket, data in results.items():
        if bucket == "strategies":
            print(f"strategies: {data[:5]}")
        else:
            conf = data["avg_confidence"]
            conf_str = f"{conf:.2f}" if conf is not None else "n/a"
            print(f"{bucket}: trades={data['trades']} pnl={data['pnl']:.2f} avg_conf={conf_str}")
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(results, indent=2, default=float), encoding="utf-8")


if __name__ == "__main__":
    main()
