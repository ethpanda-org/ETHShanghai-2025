"""
Compute per-strategy daily metrics (UTC) from fills and realized exits.

Outputs a JSON summary including, for each strategy:
- wins, losses, win_rate
- pnl_after_fees
- avg_holding_seconds (from realized exits)
- notional-weighted slippage and total fees (from fills entries/exits)

Also emits an aggregate view for `event_driven` and `others` to ease comparison.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple


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


def strat_weights_from_contrib(contrib: Any) -> Tuple[List[str], Dict[str, float]]:
    names: List[str] = []
    weights: Dict[str, float] = {}
    if isinstance(contrib, list) and contrib and isinstance(contrib[0], dict):
        for entry in contrib:
            name = entry.get("name")
            if not name:
                continue
            names.append(str(name))
            conf = entry.get("confidence")
            sz = entry.get("size_hint")
            try:
                w = float(conf if conf is not None else 1.0) * float(sz if sz is not None else 1.0)
            except Exception:
                w = 1.0
            weights[str(name)] = max(0.0, w)
    return names, weights


def analyze(date: str) -> Dict[str, Any]:
    target_date = datetime.fromisoformat(date).date()
    fills = load_jsonl(Path("reports") / "fills.jsonl")
    exits = load_jsonl(Path("reports") / "realized_exits.jsonl")

    # Per-strategy realized (wins/losses/pnl/avg hold)
    realized: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in exits:
        ts = r.get("timestamp")
        if not ts:
            continue
        try:
            dt = parse_iso(ts)
        except Exception:
            continue
        if dt.date() != target_date:
            continue
        pnl = float(r.get("pnl_after_fees", r.get("pnl", 0.0)) or 0.0)
        hold = r.get("holding_seconds")
        # strategies may be a flat list (names) or detailed entries from entry metadata
        strats = r.get("strategies")
        names: List[str] = []
        weights: Dict[str, float] = {}
        if isinstance(strats, list) and strats and isinstance(strats[0], dict):
            names, weights = strat_weights_from_contrib(strats)
        else:
            if isinstance(strats, list):
                names = [str(s) for s in strats]
            elif isinstance(strats, str):
                names = [strats]
        if not names:
            names = ["unattributed"]
            weights = {"unattributed": 1.0}
        total_w = sum(weights.values()) or float(len(names)) or 1.0
        for s in names:
            w = (weights.get(s, 1.0) / total_w) if weights else (1.0 / float(len(names)))
            realized[s]["samples"] += w
            realized[s]["pnl_after_fees"] += pnl * w
            if pnl > 0:
                realized[s]["wins"] += w
            elif pnl < 0:
                realized[s]["losses"] += w
            if isinstance(hold, (int, float)):
                realized[s]["hold_sum"] += float(hold) * w

    for s, m in realized.items():
        denom = m.get("wins", 0.0) + m.get("losses", 0.0)
        m["win_rate"] = (m["wins"] / denom) if denom else 0.0
        samples = m.get("samples", 0.0) or 0.0
        m["avg_holding_seconds"] = (m.get("hold_sum", 0.0) / samples) if samples else 0.0

    # Per-strategy slippage and fees from fills
    slip: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for f in fills:
        ts = f.get("timestamp")
        if not ts:
            continue
        try:
            dt = parse_iso(ts)
        except Exception:
            continue
        if dt.date() != target_date:
            continue
        if f.get("event") not in ("entry", "exit"):
            continue
        scm = f.get("strategy_metadata") or {}
        names, weights = strat_weights_from_contrib(scm.get("strategies"))
        if not names:
            continue
        total_w = sum(weights.values()) or float(len(names)) or 1.0
        try:
            sl = float(f.get("slippage", 0.0) or 0.0)
        except Exception:
            sl = 0.0
        try:
            notional = float(f.get("notional", 0.0) or 0.0)
        except Exception:
            notional = 0.0
        try:
            fees = float(f.get("fees", 0.0) or 0.0)
        except Exception:
            fees = 0.0
        for s in names:
            w = (weights.get(s, 1.0) / total_w)
            slip[s]["slip_w_sum"] += sl * (notional if notional else 1.0) * w
            slip[s]["notional_sum"] += (notional if notional else 1.0) * w
            slip[s]["fees_sum"] += fees * w
            slip[s]["events"] += 1 * w

    summary: Dict[str, Any] = {}
    all_strats = set(realized.keys()) | set(slip.keys())
    for s in sorted(all_strats):
        m = realized.get(s, {})
        sl = slip.get(s, {})
        nw_slip = (sl.get("slip_w_sum", 0.0) / sl.get("notional_sum", 1.0)) if sl else 0.0
        summary[s] = {
            "wins": round(float(m.get("wins", 0.0)), 4),
            "losses": round(float(m.get("losses", 0.0)), 4),
            "win_rate": round(float(m.get("win_rate", 0.0)), 6),
            "pnl_after_fees": round(float(m.get("pnl_after_fees", 0.0)), 6),
            "avg_holding_seconds": round(float(m.get("avg_holding_seconds", 0.0)), 3),
            "slippage_notional_weighted": round(float(nw_slip), 6),
            "total_fees": round(float(sl.get("fees_sum", 0.0)), 6),
            "events": round(float(sl.get("events", 0.0)), 3),
        }

    # Aggregate event_driven vs others
    def agg(names: Iterable[str]) -> Dict[str, float]:
        out: Dict[str, float] = defaultdict(float)
        for s in names:
            m = summary.get(s, {})
            out["wins"] += float(m.get("wins", 0.0))
            out["losses"] += float(m.get("losses", 0.0))
            out["pnl_after_fees"] += float(m.get("pnl_after_fees", 0.0))
            out["avg_holding_seconds_sum"] += float(m.get("avg_holding_seconds", 0.0))
            out["slip_sum"] += float(m.get("slippage_notional_weighted", 0.0))
            out["fees_sum"] += float(m.get("total_fees", 0.0))
            out["events"] += float(m.get("events", 0.0))
        denom = out.get("wins", 0.0) + out.get("losses", 0.0)
        out["win_rate"] = (out.get("wins", 0.0) / denom) if denom else 0.0
        return out

    ev_names = [s for s in summary.keys() if s == "event_driven"]
    other_names = [s for s in summary.keys() if s != "event_driven"]
    aggregate = {
        "event_driven": agg(ev_names),
        "others": agg(other_names),
    }

    return {"date": date, "per_strategy": summary, "aggregate": aggregate}


def main() -> None:
    import argparse

    ap = argparse.ArgumentParser(description="Daily per-strategy metrics (UTC date)")
    ap.add_argument("--date", required=True, help="UTC date YYYY-MM-DD")
    args = ap.parse_args()

    out = analyze(args.date)
    out_dir = Path("reports")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"_daily_strategy_metrics_{args.date}.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

