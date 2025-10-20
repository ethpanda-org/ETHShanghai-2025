import json
from collections import defaultdict, Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


def parse_iso(dt_str: str) -> datetime:
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        try:
            return datetime.strptime(dt_str.split(".")[0], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        except Exception:
            raise


def load_jsonl(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                # skip malformed lines
                continue
    return rows


def strategies_from_entry(rec: Dict[str, Any]) -> List[str]:
    # prefer detailed strategy_metadata if present
    meta = rec.get("strategy_metadata") or {}
    if isinstance(meta, dict):
        arr = meta.get("strategies")
        if isinstance(arr, list):
            names = []
            for item in arr:
                name = None
                if isinstance(item, dict):
                    name = item.get("name") or item.get("strategy")
                elif isinstance(item, str):
                    name = item
                if name:
                    names.append(str(name))
            if names:
                return names
    # fallback: flat strategies field
    flat = rec.get("strategies")
    if isinstance(flat, list):
        return [str(x) for x in flat if isinstance(x, (str, int))]
    if isinstance(flat, str):
        return [flat]
    return []


def analyze_strategy_markets(
    fills: List[Dict[str, Any]], target_date
) -> Dict[str, Any]:
    per_strategy_markets: Dict[str, Set[str]] = defaultdict(set)
    per_strategy_market_counts: Dict[str, Counter] = defaultdict(Counter)

    for r in fills:
        ts = r.get("timestamp")
        if not ts:
            continue
        try:
            dt = parse_iso(ts)
        except Exception:
            continue
        if dt.date() != target_date:
            continue
        if r.get("event") != "entry":
            continue
        mid = str(r.get("market_id"))
        if not mid:
            continue
        # Weighted by confidence*size_hint if available
        scm = r.get("strategy_metadata") or {}
        contrib = scm.get("strategies") if isinstance(scm, dict) else None
        weights = {}
        names: List[str] = []
        if isinstance(contrib, list) and contrib:
            for entry in contrib:
                if not isinstance(entry, dict):
                    continue
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
        if not names:
            names = strategies_from_entry(r) or ["unattributed"]
            for s in names:
                weights[s] = 1.0
        norm = sum(weights.values()) or 1.0
        for s in names:
            w = weights.get(s, 0.0) / norm
            per_strategy_markets[s].add(mid)
            per_strategy_market_counts[s][mid] += w

    out: Dict[str, Any] = {}
    for s, markets in per_strategy_markets.items():
        counts = per_strategy_market_counts[s]
        top_markets = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
        out[s] = {
            "unique_markets": sorted(list(markets)),
            "entry_count": int(sum(counts.values())),
            "entry_count_by_market": {k: int(v) for k, v in top_markets},
        }
    return out


def analyze_strategy_winrates(
    realized: List[Dict[str, Any]], target_date
) -> Dict[str, Any]:
    wins: Dict[str, float] = defaultdict(float)
    losses: Dict[str, float] = defaultdict(float)
    totals: Dict[str, float] = defaultdict(float)

    for r in realized:
        ts = r.get("timestamp")
        if not ts:
            continue
        try:
            dt = parse_iso(ts)
        except Exception:
            continue
        if dt.date() != target_date:
            continue
        pnl_after = r.get("pnl_after_fees", r.get("pnl"))
        try:
            pnl_after_f = float(pnl_after)
        except Exception:
            continue
        # Weighted by entry contribution if available
        strats = r.get("strategies")
        names: List[str] = []
        weights: Dict[str, float] = {}
        if isinstance(strats, list) and strats and isinstance(strats[0], dict):
            for entry in strats:
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
        else:
            if not strats:
                names = ["unattributed"]
            elif isinstance(strats, str):
                names = [strats]
            else:
                names = [str(s) for s in (strats or [])]
            for s in names:
                weights[s] = 1.0
        norm = sum(weights.values()) or 1.0
        for s in names:
            w = weights.get(s, 0.0) / norm
            totals[s] += w
            if pnl_after_f > 0:
                wins[s] += w
            elif pnl_after_f < 0:
                losses[s] += w

    result: Dict[str, Any] = {}
    for s in sorted(totals.keys()):
        total = totals[s]
        w = wins.get(s, 0.0)
        l = losses.get(s, 0.0)
        denom = w + l if (w + l) > 0 else total
        win_rate = (w / denom) if denom > 0 else 0.0
        result[s] = {
            "wins": float(round(w, 4)),
            "losses": float(round(l, 4)),
            "samples": float(round(denom, 4)),
            "win_rate": float(round(win_rate, 6)),
        }
    return result


def analyze_exit_strategy_breakdown(
    realized: List[Dict[str, Any]], target_date
) -> Dict[str, Any]:
    stats: Dict[str, Dict[str, float]] = {}
    for r in realized:
        ts = r.get("timestamp")
        if not ts:
            continue
        try:
            dt = parse_iso(ts)
        except Exception:
            continue
        if dt.date() != target_date:
            continue
        reason = str(r.get("reason") or "")
        strat = None
        if reason.startswith("strategy_"):
            try:
                body = reason.split(":", 1)[0]
                strat = body.split("_", 1)[1]
            except Exception:
                strat = None
        if not strat:
            continue
        pnl = 0.0
        try:
            pnl = float(r.get("pnl_after_fees", r.get("pnl", 0.0)) or 0.0)
        except Exception:
            pnl = 0.0
        bucket = stats.setdefault(strat, {"wins": 0.0, "losses": 0.0, "samples": 0.0, "pnl": 0.0})
        if pnl > 0:
            bucket["wins"] += 1.0
        elif pnl < 0:
            bucket["losses"] += 1.0
        bucket["samples"] += 1.0
        bucket["pnl"] += pnl
    # finalize win rates
    out: Dict[str, Any] = {}
    for name, b in stats.items():
        s = b.get("samples", 0.0) or 0.0
        w = b.get("wins", 0.0) or 0.0
        out[name] = {
            "wins": float(w),
            "losses": float(b.get("losses", 0.0) or 0.0),
            "samples": float(s),
            "win_rate": float((w / s) if s else 0.0),
            "pnl_after_fees": float(b.get("pnl", 0.0) or 0.0),
        }
    return out


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Per-strategy markets and win rates for a given UTC date")
    parser.add_argument("--date", help="UTC date YYYY-MM-DD; default = yesterday UTC", default=None)
    args = parser.parse_args()

    now_utc = datetime.now(timezone.utc)
    if args.date:
        target_date = datetime.fromisoformat(args.date).date()
    else:
        target_date = (now_utc - timedelta(days=1)).date()

    reports = Path("reports")
    fills = load_jsonl(reports / "fills.jsonl")
    realized = load_jsonl(reports / "realized_exits.jsonl")

    strategy_markets = analyze_strategy_markets(fills, target_date)
    strategy_winrates = analyze_strategy_winrates(realized, target_date)
    exit_strategy = analyze_exit_strategy_breakdown(realized, target_date)

    # Merge summaries by strategy
    summary: Dict[str, Any] = {}
    strat_keys = set(strategy_markets.keys()) | set(strategy_winrates.keys())
    for s in sorted(strat_keys):
        summary[s] = {
            **strategy_markets.get(s, {}),
            **{"performance": strategy_winrates.get(s, {"wins": 0.0, "losses": 0.0, "samples": 0.0, "win_rate": 0.0})},
        }

    out = {
        "date": target_date.isoformat(),
        "strategies": summary,
        "exit_strategy_breakdown": exit_strategy,
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
