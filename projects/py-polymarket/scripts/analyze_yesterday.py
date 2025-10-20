import json
from collections import defaultdict, Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path


def parse_iso(dt_str: str) -> datetime:
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        # Fallback: try without microseconds
        try:
            return datetime.strptime(dt_str.split(".")[0], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        except Exception:
            raise


def load_jsonl(path: Path):
    if not path.exists():
        return []
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                # skip bad lines
                continue
    return rows


def analyze_realized_exits(rows, target_date):
    total_pnl = 0.0
    total_pnl_after_fees = 0.0
    total_fees = 0.0
    closed = 0
    wins = 0
    losses = 0
    holding_sum = 0.0
    reason_counts = Counter()
    reason_pnl = defaultdict(float)
    # per-strategy (equal weight allocation across strategies field)
    strat_pnl = defaultdict(float)
    strat_wins = Counter()
    strat_losses = Counter()

    for r in rows:
        ts = r.get("timestamp")
        if not ts:
            continue
        dt = parse_iso(ts)
        if dt.date() != target_date:
            continue
        closed += 1
        pnl = float(r.get("pnl", 0.0))
        pnl_after = float(r.get("pnl_after_fees", pnl))
        fees = float(r.get("fees", 0.0))
        total_pnl += pnl
        total_pnl_after_fees += pnl_after
        total_fees += fees
        holding_sum += float(r.get("holding_seconds", 0.0))
        reason = r.get("reason", "unknown")
        reason_counts[reason] += 1
        reason_pnl[reason] += pnl_after

        strats = r.get("strategies")
        if not strats:
            strats = ["unknown"]
        weight = 1.0 / len(strats)
        if pnl_after > 0:
            for s in strats:
                strat_wins[s] += weight
        elif pnl_after < 0:
            for s in strats:
                strat_losses[s] += weight
        for s in strats:
            strat_pnl[s] += pnl_after * weight

    avg_holding = (holding_sum / closed) if closed else 0.0
    win_rate = (wins / closed) if closed else 0.0  # kept for compatibility, computed below from pnl_after sign

    # recompute wins/losses from pnl_after to ensure consistency
    wins = sum(1 for r in rows if r.get("timestamp") and parse_iso(r["timestamp"]).date() == target_date and float(r.get("pnl_after_fees", r.get("pnl", 0.0))) > 0)
    losses = sum(1 for r in rows if r.get("timestamp") and parse_iso(r["timestamp"]).date() == target_date and float(r.get("pnl_after_fees", r.get("pnl", 0.0))) < 0)
    win_rate = (wins / closed) if closed else 0.0

    return {
        "date": target_date.isoformat(),
        "closed_trades": closed,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate,
        "total_pnl": total_pnl,
        "total_fees": total_fees,
        "total_pnl_after_fees": total_pnl_after_fees,
        "avg_holding_seconds": avg_holding,
        "reasons": {
            "counts": dict(reason_counts),
            "pnl_after_fees": dict(sorted(reason_pnl.items(), key=lambda kv: kv[1], reverse=True)),
        },
        "strategy_attribution": {
            "pnl_after_fees": dict(sorted(strat_pnl.items(), key=lambda kv: kv[1], reverse=True)),
            "wins": {k: float(v) for k, v in strat_wins.items()},
            "losses": {k: float(v) for k, v in strat_losses.items()},
        },
    }


def analyze_slippage(rows, target_date):
    total = 0
    sum_slip = 0.0
    sum_w_slip = 0.0
    sum_w_bps = 0.0
    notional_sum = 0.0
    by_mode = Counter()
    for r in rows:
        ts = r.get("timestamp")
        if not ts:
            continue
        dt = parse_iso(ts)
        if dt.date() != target_date:
            continue
        if r.get("event") not in ("entry", "exit"):
            continue
        sl = float(r.get("slippage", 0.0))
        mid = float(r.get("mid", 0.0)) or None
        notional = float(r.get("notional", 0.0))
        mode = r.get("execution_mode", "unknown")
        total += 1
        sum_slip += sl
        notional_sum += notional
        sum_w_slip += sl * notional
        if mid and mid > 0:
            bps = (sl / mid) * 10000.0
            sum_w_bps += bps * max(notional, 1.0)
        by_mode[mode] += 1
    avg_slip = (sum_slip / total) if total else 0.0
    w_avg_slip = (sum_w_slip / notional_sum) if notional_sum else 0.0
    w_avg_bps = (sum_w_bps / max(notional_sum, 1.0)) if total else 0.0
    return {
        "events": total,
        "avg_slippage": avg_slip,
        "notional_weighted_slippage": w_avg_slip,
        "notional_weighted_slippage_bps": w_avg_bps,
        "execution_mode_counts": dict(by_mode),
    }


def analyze_event_driven(fills, exits, target_date):
    # Event-driven exits
    wins = losses = 0
    pnl_sum = 0.0
    hold_sum = 0.0
    hold_n = 0
    for r in exits:
        ts = r.get("timestamp")
        if not ts:
            continue
        dt = parse_iso(ts)
        if dt.date() != target_date:
            continue
        reason = str(r.get("reason") or "")
        if not (reason.startswith("event_") or reason.startswith("strategy_event_driven:")):
            continue
        pnl = float(r.get("pnl_after_fees", r.get("pnl", 0.0)) or 0.0)
        pnl_sum += pnl
        if pnl > 0:
            wins += 1
        elif pnl < 0:
            losses += 1
        hs = r.get("holding_seconds")
        try:
            if hs is not None:
                hold_sum += float(hs)
                hold_n += 1
        except Exception:
            pass
    # Slippage/fees for event-driven fills
    slip_sum = 0.0
    slip_notional_sum = 0.0
    fees_sum = 0.0
    for f in fills:
        ts = f.get("timestamp")
        if not ts:
            continue
        dt = parse_iso(ts)
        if dt.date() != target_date:
            continue
        if f.get("event") not in ("entry", "exit"):
            continue
        meta = f.get("strategy_metadata") or {}
        arr = meta.get("strategies") or []
        names = [s.get("name") for s in arr if isinstance(s, dict)] if isinstance(arr, list) else []
        if "event_driven" not in names:
            continue
        sl = float(f.get("slippage", 0.0) or 0.0)
        notional = float(f.get("notional", 0.0) or 0.0)
        fees = float(f.get("fees", 0.0) or 0.0)
        slip_sum += sl * (notional if notional else 1.0)
        slip_notional_sum += notional if notional else 1.0
        fees_sum += fees
    total = wins + losses
    return {
        "wins": wins,
        "losses": losses,
        "win_rate": (wins / total) if total else 0.0,
        "avg_holding_seconds": (hold_sum / hold_n) if hold_n else 0.0,
        "slippage": (slip_sum / slip_notional_sum) if slip_notional_sum else 0.0,
        "total_fees": fees_sum,
    }


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Analyze daily trading performance")
    parser.add_argument("--date", help="UTC date YYYY-MM-DD to analyze; defaults to yesterday", default=None)
    args = parser.parse_args()

    reports = Path("reports")
    now_utc = datetime.now(timezone.utc)
    if args.date:
        target_date = datetime.fromisoformat(args.date).date()
    else:
        target_date = (now_utc - timedelta(days=1)).date()

    exits = load_jsonl(reports / "realized_exits.jsonl")
    fills = load_jsonl(reports / "fills.jsonl")

    realized = analyze_realized_exits(exits, target_date)
    slip = analyze_slippage(fills, target_date)
    ev = analyze_event_driven(fills, exits, target_date)

    # Include pipeline day pnl if available
    pipe_path = reports / "pipeline_status.json"
    pipe_day = None
    if pipe_path.exists():
        try:
            pipe = json.loads(pipe_path.read_text(encoding="utf-8"))
            ks = (pipe or {}).get("kill_switch") or {}
            pipe_day = ks.get("day_pnl")
        except Exception:
            pass

    out = {
        "summary_date": target_date.isoformat(),
        "realized": realized,
        "slippage": slip,
        "event_driven": ev,
        "pipeline_day_pnl": pipe_day,
    }

    out_path = reports / f"_analysis_{target_date.isoformat()}.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
