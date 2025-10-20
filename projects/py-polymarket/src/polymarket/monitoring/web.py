"""Lightweight HTTP server that exposes trading telemetry."""

from __future__ import annotations

import json
import logging
import threading
import webbrowser
import csv
from collections import defaultdict
from datetime import datetime, timezone
from glob import glob
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from config import settings

logger = logging.getLogger(__name__)


def _safe_read_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        logger.debug("failed to parse json %s", path, exc_info=True)
        return None


def _latest_report(report_dir: Path) -> Optional[Path]:
    files = sorted(
        report_dir.glob("*simulation_report_*.json"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    return files[0] if files else None


def _load_pipeline_status(report_dir: Path) -> Dict[str, Any]:
    status = _safe_read_json(report_dir / "pipeline_status.json")
    return status or {}


def _load_exit_analytics(report_dir: Path) -> Dict[str, Any]:
    data = _safe_read_json(report_dir / "exit_analytics.json")
    if not isinstance(data, dict):
        return {}
    return data


def _load_event_driven_analysis(report_dir: Path) -> Dict[str, Any]:
    """Load event-driven analysis summary if available.

    Prefers rolling last-24h file; otherwise uses the newest
    _analysis_event_driven_*.json by modification time.
    """
    try:
        last24 = report_dir / "_analysis_event_driven_last24h.json"
        if last24.exists():
            data = _safe_read_json(last24)
            return data or {}
        # Fallback: pick the latest dated file
        matches = sorted(
            (Path(p) for p in glob(str(report_dir / "_analysis_event_driven_*.json"))),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if matches:
            data = _safe_read_json(matches[0])
            return data or {}
    except Exception:
        logger.debug("failed to load event-driven analysis summary", exc_info=True)
    return {}


def _load_daily_strategy_metrics(report_dir: Path) -> Dict[str, Any]:
    """Load the latest daily per-strategy metrics if available."""
    try:
        matches = sorted(
            (Path(p) for p in glob(str(report_dir / "_daily_strategy_metrics_*.json"))),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if matches:
            data = _safe_read_json(matches[0])
            return data or {}
    except Exception:
        logger.debug("failed to load daily strategy metrics", exc_info=True)
    return {}

def _load_ledger_summary(report_dir: Path) -> List[Dict[str, Any]]:
    """Aggregate backtest ledger rows if available."""

    path = report_dir / "backtests_ledger.csv"
    if not path.exists():
        return []
    try:
        rows = list(csv.DictReader(path.open("r", encoding="utf-8")))
    except Exception:
        logger.debug("failed to read backtests_ledger.csv", exc_info=True)
        return []

    summary: Dict[int, Dict[str, float]] = {}
    for row in rows:
        try:
            holding = int(float(row.get("holding_seconds", 0) or 0))
            pnl = float(row.get("pnl", 0.0) or 0.0)
            pnl_after = float(row.get("pnl_after_fees", row.get("pnl", 0.0)) or 0.0)
            fees = float(row.get("fees", 0.0) or 0.0)
            win = int(row.get("win", 0) or 0)
        except (TypeError, ValueError):
            continue
        bucket = summary.setdefault(
            holding,
            {"trades": 0, "wins": 0, "pnl": 0.0, "pnl_after": 0.0, "fees": 0.0},
        )
        bucket["trades"] += 1
        bucket["wins"] += win
        bucket["pnl"] += pnl
        bucket["pnl_after"] += pnl_after
        bucket["fees"] += fees

    results: List[Dict[str, Any]] = []
    for holding, stats in summary.items():
        trades = stats["trades"]
        if trades <= 0:
            continue
        win_rate = stats["wins"] / trades if trades else 0.0
        avg_pnl = stats["pnl_after"] / trades if trades else 0.0
        results.append(
            {
                "holding_seconds": holding,
                "trades": trades,
                "win_rate": win_rate,
                "total_pnl": stats["pnl"],
                "total_pnl_after_fees": stats["pnl_after"],
                "total_fees": stats["fees"],
                "avg_pnl_after_fees": avg_pnl,
            }
        )
    results.sort(key=lambda row: row["holding_seconds"])
    return results


def _load_frontier_summary(report_dir: Path) -> List[Dict[str, Any]]:
    """Load backtest frontier summary if available."""

    path = report_dir / "backtest_frontier.json"
    try:
        payload = _safe_read_json(path)
    except Exception:
        payload = None
    if not isinstance(payload, dict):
        return []
    entries = payload.get("results")
    if not isinstance(entries, list):
        return []

    grouped: Dict[tuple, Dict[str, Any]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        try:
            maker = float(entry.get("maker_offset_bps", 0.0) or 0.0)
            taker = float(entry.get("taker_offset_bps", 0.0) or 0.0)
            win_rate = float(entry.get("win_rate", 0.0) or 0.0)
            total_return = float(entry.get("total_return", 0.0) or 0.0)
            horizon = int(entry.get("holding_seconds", 0) or 0)
        except (TypeError, ValueError):
            continue
        key = (maker, taker)
        bucket = grouped.setdefault(
            key,
            {
                "entries": 0,
                "best_win_rate": 0.0,
                "best_total_return": 0.0,
                "best_holding_seconds": None,
            },
        )
        bucket["entries"] += 1
        if win_rate > bucket["best_win_rate"] or (
            win_rate == bucket["best_win_rate"] and total_return > bucket["best_total_return"]
        ):
            bucket["best_win_rate"] = win_rate
            bucket["best_total_return"] = total_return
            bucket["best_holding_seconds"] = horizon

    summary: List[Dict[str, Any]] = []
    for (maker, taker), stats in grouped.items():
        summary.append(
            {
                "maker_offset_bps": maker,
                "taker_offset_bps": taker,
                "entries": int(stats["entries"]),
                "best_win_rate": stats["best_win_rate"],
                "best_total_return": stats["best_total_return"],
                "best_holding_seconds": stats["best_holding_seconds"],
            }
        )
    summary.sort(key=lambda row: (row["best_win_rate"], row["best_total_return"]), reverse=True)
    return summary


def _aggregate_strategy_breakdown(trades: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    counts: defaultdict[str, int] = defaultdict(int)
    confidences: defaultdict[str, List[float]] = defaultdict(list)
    for trade in trades:
        meta = trade.get("strategy_metadata") or {}
        for strat in meta.get("strategies") or []:
            name = (strat or {}).get("name")
            if not name:
                continue
            counts[name] += 1
            confidence = strat.get("confidence")
            if isinstance(confidence, (int, float)):
                confidences[name].append(float(confidence))
    breakdown: List[Dict[str, Any]] = []
    for name, count in counts.items():
        values = confidences.get(name, [])
        avg = sum(values) / len(values) if values else None
        breakdown.append({"name": name, "count": count, "avg_confidence": avg})
    breakdown.sort(key=lambda item: item["count"], reverse=True)
    return breakdown


def _recent_trades_from_report(trades: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    recent = trades[-5:]
    out: List[Dict[str, Any]] = []
    for trade in recent:
        meta = trade.get("strategy_metadata") or {}
        out.append(
            {
                "market_id": trade.get("market_id"),
                "action": trade.get("action"),
                "size": trade.get("size"),
                "confidence": meta.get("confidence"),
                "score": meta.get("combined_score"),
                "timestamp": trade.get("timestamp"),
                "strategies": [
                    strat.get("name")
                    for strat in meta.get("strategies") or []
                    if isinstance(strat, dict) and strat.get("name")
                ],
            }
        )
    return out


def _recent_realized_trades(report_dir: Path, limit: int = 5) -> List[Dict[str, Any]]:
    path = report_dir / "realized_exits.jsonl"
    if not path.exists():
        return []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        logger.debug("failed to read realized_exits.jsonl", exc_info=True)
        return []

    recent: List[Dict[str, Any]] = []
    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except Exception:
            continue
        strategies_raw = payload.get("strategies") or []
        if isinstance(strategies_raw, list):
            strategies = [
                strat if isinstance(strat, str) else str(strat)
                for strat in strategies_raw
                if strat
            ]
        else:
            strategies = []
        recent.append(
            {
                "market_id": payload.get("market_id"),
                "action": payload.get("side"),
                "size": payload.get("notional"),
                "confidence": None,
                "score": payload.get("pnl_after_fees", payload.get("pnl")),
                "timestamp": payload.get("timestamp"),
                "strategies": strategies,
            }
        )
        if len(recent) >= limit:
            break
    recent.reverse()
    return recent


def _load_trade_telemetry(report_dir: Path) -> Dict[str, Any]:
    telemetry: Dict[str, Any] = {
        "entries": 0,
        "exits": 0,
        "avg_notional": None,
        "avg_entry_slip_bps": None,
        "avg_exit_slip_bps": None,
        "execution_modes": {},
        "total_fees": 0.0,
        "strategy_pnl": [],
        "micro_arbitrage": {"internal": 0, "external": 0, "other": 0, "total": 0},
    }
    configured_path = getattr(settings, "TRADE_TELEMETRY_PATH", None)
    telemetry_path = Path(configured_path) if configured_path else Path("fills.jsonl")
    if not telemetry_path.is_absolute():
        telemetry_path = report_dir / telemetry_path
    if not telemetry_path.exists():
        return telemetry
    try:
        total_notional = 0.0
        entry_weighted_slip = 0.0
        exit_weighted_slip = 0.0
        entry_notional = 0.0
        exit_notional = 0.0
        entries = 0
        exits = 0
        total_fees = 0.0
        strategy_stats: Dict[str, Dict[str, float]] = {}
        micro_counts: Dict[str, int] = {"internal": 0, "external": 0, "other": 0}
        for line in telemetry_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                fill = json.loads(line)
            except Exception:
                continue
            notional = float(fill.get("notional", 0.0) or 0.0)
            total_notional += notional
            event = str(fill.get("event") or fill.get("type") or "").lower()
            if not event:
                continue
            exec_mode = str(fill.get("execution_mode", "simulation")).lower()
            telemetry["execution_modes"][exec_mode] = telemetry["execution_modes"].get(exec_mode, 0) + 1
            fees = float(fill.get("fees", 0.0) or 0.0)
            total_fees += fees
            if event == "entry":
                entries += 1
                entry_notional += notional
                slippage = fill.get("slippage")
                if slippage is None:
                    mid = float(fill.get("reference_price", fill.get("mid", 0.0)) or 0.0)
                    price = float(fill.get("fill_price", fill.get("entry_yes", 0.0)) or 0.0)
                    slippage = price - mid
                entry_weighted_slip += abs(float(slippage or 0.0)) * 10000.0 * max(notional, 1e-9)
                strategies_meta = fill.get("strategy_metadata")
                modes_seen = set()
                if isinstance(strategies_meta, dict):
                    contributions = strategies_meta.get("strategies")
                    if isinstance(contributions, list):
                        for contrib in contributions:
                            if not isinstance(contrib, dict):
                                continue
                            if str(contrib.get("name")) != "micro_arbitrage":
                                continue
                            mode = str((contrib.get("metadata") or {}).get("mode") or "other").lower()
                            if mode not in ("internal", "external"):
                                mode = "other"
                            modes_seen.add(mode)
                for mode in modes_seen:
                    micro_counts[mode] = micro_counts.get(mode, 0) + 1
            elif event == "exit":
                exits += 1
                exit_notional += notional
                slippage = fill.get("slippage")
                if slippage is None:
                    mid = float(fill.get("reference_price", fill.get("mid", 0.0)) or 0.0)
                    price = float(fill.get("fill_price", fill.get("exit_yes", 0.0)) or 0.0)
                    slippage = price - mid
                exit_weighted_slip += abs(float(slippage or 0.0)) * 10000.0 * max(notional, 1e-9)
                pnl = float(fill.get("pnl", 0.0) or 0.0)
                pnl_after = float(fill.get("pnl_after_fees", pnl) or 0.0)
                strategies = fill.get("strategies")
                strat_names = [str(name) for name in strategies if name] if isinstance(strategies, list) else []
                if not strat_names:
                    strat_names = ["unattributed"]
                share = 1.0 / len(strat_names) if strat_names else 1.0
                for name in strat_names:
                    stats = strategy_stats.setdefault(
                        name,
                        {"weight": 0.0, "wins": 0.0, "losses": 0.0, "pnl": 0.0, "pnl_after": 0.0},
                    )
                    stats["weight"] += share
                    stats["pnl"] += pnl * share
                    stats["pnl_after"] += pnl_after * share
                    if pnl_after > 0:
                        stats["wins"] += share
                    elif pnl_after < 0:
                        stats["losses"] += share
        telemetry["entries"] = entries
        telemetry["exits"] = exits
        total_events = entries + exits
        if total_events:
            telemetry["avg_notional"] = total_notional / total_events
        if entry_notional:
            telemetry["avg_entry_slip_bps"] = entry_weighted_slip / entry_notional
        if exit_notional:
            telemetry["avg_exit_slip_bps"] = exit_weighted_slip / exit_notional
        telemetry["total_fees"] = round(total_fees, 6)
        telemetry["micro_arbitrage"] = {
            "internal": int(micro_counts.get("internal", 0)),
            "external": int(micro_counts.get("external", 0)),
            "other": int(micro_counts.get("other", 0)),
            "total": int(sum(micro_counts.values())),
        }
        strategy_breakdown: List[Dict[str, Any]] = []
        for name, stats in strategy_stats.items():
            weight = stats.get("weight", 0.0) or 0.0
            pnl_after = stats.get("pnl_after", 0.0) or 0.0
            pnl_gross = stats.get("pnl", 0.0) or 0.0
            avg_after = (pnl_after / weight) if weight else None
            total_outcomes = stats.get("wins", 0.0) + stats.get("losses", 0.0)
            win_rate = (stats["wins"] / total_outcomes) if total_outcomes else None
            strategy_breakdown.append(
                {
                    "name": name,
                    "trades": weight,
                    "wins": stats.get("wins", 0.0),
                    "losses": stats.get("losses", 0.0),
                    "win_rate": win_rate,
                    "pnl": pnl_gross,
                    "pnl_after": pnl_after,
                    "avg_pnl_after": avg_after,
                }
            )
        strategy_breakdown.sort(key=lambda row: row.get("pnl_after", 0.0))
        telemetry["strategy_pnl"] = strategy_breakdown
    except Exception:
        logger.debug("failed to summarise fills telemetry", exc_info=True)
    return telemetry


def _load_order_events(report_dir: Path, limit: int = 10) -> Dict[str, Any]:
    orders_path = report_dir / "orders.jsonl"
    trades_path = report_dir / "trades.jsonl"
    recent: List[Dict[str, Any]] = []
    rejects: Dict[str, int] = {}
    approvals = 0
    cancels = 0
    partials_from_orders = 0
    rate_limit_hotspots: Dict[str, int] = {}
    if orders_path.exists():
        try:
            lines = orders_path.read_text(encoding="utf-8").splitlines()
        except Exception:
            lines = []
        for line in reversed(lines):
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            event = str(rec.get("event") or "").lower()
            reason = rec.get("reason")
            if event == "reject" or reason:
                key = str(reason or event or "unknown")
                rejects[key] = rejects.get(key, 0) + 1
                # Track per-marketÃ—side hotspots for strategy_rate_limit
                if (reason or event) == "strategy_rate_limit":
                    mkt = str(rec.get("market_id") or "-")
                    side = str(rec.get("action") or rec.get("side") or "-")
                    hotspot_key = f"{mkt}|{side}"
                    rate_limit_hotspots[hotspot_key] = rate_limit_hotspots.get(hotspot_key, 0) + 1
            elif event == "cancel":
                cancels += 1
            elif event == "partial":
                partials_from_orders += 1
            else:
                approvals += 1
            recent.append(
                {
                    "timestamp": rec.get("timestamp"),
                    "market_id": rec.get("market_id"),
                    "action": rec.get("action"),
                    "size": rec.get("size"),
                    "event": event or "submit",
                    "reason": reason,
                }
            )
            if len(recent) >= limit:
                break
    fills_total = 0
    partials_from_trades = 0
    fills_closed = 0
    if trades_path.exists():
        try:
            lines = trades_path.read_text(encoding="utf-8").splitlines()
        except Exception:
            lines = []
        for line in lines:
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            status = str(rec.get("status") or "").lower()
            if status:
                fills_total += 1
                if status == "partial":
                    partials_from_trades += 1
                if status == "filled":
                    fills_closed += 1
    recent.reverse()
    # Approximate pending: submissions minus (closed fills + cancels + rejects)
    pending = max(0, approvals - (fills_closed + cancels + sum(rejects.values())))
    partials = partials_from_orders + partials_from_trades
    # Top N hotspots sorted by count desc
    top_hotspots: List[Dict[str, Any]] = []
    try:
        ordered = sorted(rate_limit_hotspots.items(), key=lambda kv: kv[1], reverse=True)
        for key, count in ordered[:10]:
            try:
                mkt, side = key.split("|", 1)
            except ValueError:
                mkt, side = key, "-"
            top_hotspots.append({"market_id": mkt, "side": side, "count": count})
    except Exception:
        pass

    return {
        "recent": recent,
        "rejects": rejects,
        "approvals": approvals,
        "fills": fills_total,
        "partials": partials,
        "pending": pending,
        "rate_limit_hotspots": top_hotspots,
    }


def _load_external_fill_trend(report_dir: Path, window_minutes: int = 15) -> List[Dict[str, Any]]:
    """Return per-minute counts of external fills (WS/REST) over a recent window."""
    path = report_dir / "trades.jsonl"
    if not path.exists():
        return []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return []
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    start = now - timedelta(minutes=max(1, int(window_minutes)))
    buckets: Dict[str, int] = {}
    for line in lines[-5000:]:  # soft cap to keep parsing light
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except Exception:
            continue
        mode = str(rec.get("execution_mode") or "").lower()
        if mode not in {"order_ws", "order_rest"}:
            continue
        ts = rec.get("timestamp")
        if not ts:
            continue
        try:
            if isinstance(ts, (int, float)):
                dt = datetime.fromtimestamp(float(ts), tz=timezone.utc)
            else:
                txt = str(ts).replace("Z", "+00:00")
                dt = datetime.fromisoformat(txt)
        except Exception:
            continue
        if dt < start:
            continue
        key = dt.replace(second=0, microsecond=0).isoformat()
        buckets[key] = buckets.get(key, 0) + 1
    # Build contiguous series in ascending time
    series: List[Dict[str, Any]] = []
    tick = start.replace(second=0, microsecond=0)
    while tick <= now:
        key = tick.isoformat()
        series.append({"t": key, "count": int(buckets.get(key, 0))})
        tick += timedelta(minutes=1)
    return series


def _load_simulation_payload(report_dir: Path, report_path: Path) -> Dict[str, Any]:
    try:
        payload = json.loads(report_path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.exception("failed to load simulation report %s", report_path)
        return {"status": "error", "message": str(exc)}

    trades = payload.get("trades") or []
    summary = payload.get("simulation_summary") or {}
    metrics = summary.get("performance_metrics") or {}
    meta = payload.get("report_metadata") or {}
    pipeline = _load_pipeline_status(report_dir)
    realized_summary = _safe_read_json(report_dir / "realized_summary.json") or {}
    frontier_summary = _load_frontier_summary(report_dir)
    ledger_summary = _load_ledger_summary(report_dir)
    fetch_info = (pipeline.get("fetch_info") if isinstance(pipeline, dict) else {}) or {}

    telemetry = _load_trade_telemetry(report_dir)

    return {
        "status": "success",
        "timestamp": datetime.now(UTC).isoformat(),
        "filename": report_path.name,
        "report_generated_at": meta.get("generated_at"),
        "total_trades": len(trades),
        "closed_trades": metrics.get("closed_trades", 0),
        "open_positions": metrics.get("open_positions", 0),
        "current_balance": metrics.get("current_balance", 0.0),
        "total_pnl": metrics.get("total_pnl", 0.0),
        "win_rate": metrics.get("win_rate", 0.0),
        "total_return": metrics.get("total_return", 0.0),
        "start_time": summary.get("start_time"),
        "strategy_performance": metrics.get("strategy_performance", {}),
        "recent_trades": _recent_trades_from_report(trades),
        "strategy_breakdown": _aggregate_strategy_breakdown(trades),
        "pipeline": pipeline,
        "realized": realized_summary,
        "telemetry": telemetry,
        "fallback": bool(fetch_info.get("fallback")),
        "fallback_reason": fetch_info.get("reason"),
        "frontier": frontier_summary,
        "ledger_summary": ledger_summary,
    }


def _build_pipeline_payload(report_dir: Path) -> Dict[str, Any]:
    pipeline = _load_pipeline_status(report_dir)
    if not pipeline:
        return {"status": "no_data", "message": "Waiting for trading system"}

    realized_summary = _safe_read_json(report_dir / "realized_summary.json") or {}
    fetch_info = pipeline.get("fetch_info") or {}
    loop_summary = pipeline.get("loop_summary") or {}
    exposure = pipeline.get("exposure") or {}
    frontier_summary = _load_frontier_summary(report_dir)

    closed_trades = int(realized_summary.get("closed_trades", 0) or 0)
    wins = int(realized_summary.get("wins", 0) or 0)
    total_pnl = float(realized_summary.get("total_pnl_after_fees", realized_summary.get("total_pnl", 0.0)) or 0.0)
    balance = float(exposure.get("balance", 0.0) or 0.0)
    win_rate_pct = realized_summary.get("win_rate_pct")
    if isinstance(win_rate_pct, (int, float)):
        win_rate = float(win_rate_pct) / 100.0
    else:
        win_rate = (wins / closed_trades) if closed_trades else 0.0
    total_return = (total_pnl / balance) if balance else 0.0

    telemetry = _load_trade_telemetry(report_dir)
    exit_analytics = _load_exit_analytics(report_dir)
    event_driven_summary = _load_event_driven_analysis(report_dir)
    daily_strategy = _load_daily_strategy_metrics(report_dir)
    ledger_summary = _load_ledger_summary(report_dir)

    # Extract concise sentiment telemetry summary (source mix + freshness)
    sentiment = dict(fetch_info.get("sentiment") or {}) if isinstance(fetch_info, dict) else {}
    sentiment_summary = {}
    try:
        if sentiment:
            sentiment_summary = {
                "live_sources_available": bool(sentiment.get("has_live_sources")) or bool(sentiment.get("live_sources_available")),
                "cache_hits": int(sentiment.get("cache_hits", 0) or 0),
                "live_requests": int(sentiment.get("live_requests", 0) or 0),
                "live_hits": int(sentiment.get("live_hits", 0) or 0),
                "live_misses": int(sentiment.get("live_misses", 0) or 0),
                "fallback_used": int(sentiment.get("fallback_used", 0) or 0),
                "offline_blocks": int(sentiment.get("offline_blocks", 0) or 0),
                "last_fallback_reason": sentiment.get("last_fallback_reason"),
                "fallback_reasons": sentiment.get("fallback_reasons") or {},
                "last_live_source": sentiment.get("last_live_source"),
                "last_live_at": sentiment.get("last_live_at_iso") or sentiment.get("last_live_at"),
            }
    except Exception:
        sentiment_summary = {}

    return {
        "status": "success",
        "timestamp": datetime.now(UTC).isoformat(),
        "filename": "pipeline_status.json",
        "report_generated_at": pipeline.get("timestamp"),
        "total_trades": int(loop_summary.get("processed", 0) or 0),
        "closed_trades": closed_trades,
        "open_positions": pipeline.get("open_positions", 0) or 0,
        "current_balance": balance,
        "total_pnl": total_pnl,
        "win_rate": win_rate,
        "total_return": total_return,
        "start_time": pipeline.get("timestamp"),
        "strategy_performance": {},
        "recent_trades": _recent_realized_trades(report_dir),
        "strategy_breakdown": [],
        "pipeline": pipeline,
        "realized": realized_summary,
        "telemetry": telemetry,
        "exit_analytics": exit_analytics,
        "event_driven": {
            "wins": int((((event_driven_summary.get("exits") or {}).get("wins") or 0))),
            "losses": int((((event_driven_summary.get("exits") or {}).get("losses") or 0))),
            "win_rate": float((((event_driven_summary.get("exits") or {}).get("win_rate") or 0.0))),
            "avg_holding_seconds": float((((event_driven_summary.get("exits") or {}).get("avg_holding_seconds") or 0.0))),
            "slippage": float(((event_driven_summary.get("slippage") or {}).get("notional_weighted_slippage") or 0.0)),
            "total_fees": float(((event_driven_summary.get("slippage") or {}).get("total_fees") or 0.0)),
            "sources": dict(event_driven_summary.get("entries_by_source") or {}),
        },
        "daily_strategy": daily_strategy,
        "execution": pipeline.get("execution"),
        "sentiment": sentiment_summary,
        "frontier": frontier_summary,
        "ledger_summary": ledger_summary,
        "fallback": bool(fetch_info.get("fallback")),
        "fallback_reason": fetch_info.get("reason"),
        "external_fills_trend": _load_external_fill_trend(report_dir),
        "orders": _load_order_events(report_dir),
    }


def _load_payload(report_dir: Path) -> Dict[str, Any]:
    pipeline_payload = _build_pipeline_payload(report_dir)
    pipeline = pipeline_payload.get("pipeline") or {}
    loop_summary = pipeline.get("loop_summary") or {}
    if loop_summary.get("processed") or loop_summary.get("approved"):
        return pipeline_payload

    report_path = _latest_report(report_dir)
    if report_path:
        payload = _load_simulation_payload(report_dir, report_path)
        if payload.get("status") == "success":
            if pipeline:
                payload["pipeline"] = pipeline
                payload["realized"] = pipeline_payload.get("realized")
                payload["telemetry"] = pipeline_payload.get("telemetry")
                payload["exit_analytics"] = pipeline_payload.get("exit_analytics")
                payload["frontier"] = pipeline_payload.get("frontier")
                payload["ledger_summary"] = pipeline_payload.get("ledger_summary")
            return payload

    return pipeline_payload


def _render_homepage() -> str:
    return """<!doctype html>
<html lang='en'>
  <head>
    <meta charset='utf-8'/>
    <meta name='viewport' content='width=device-width, initial-scale=1'/>
    <title>Polymarket Trading Monitor</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; margin: 0; padding: 0; background: #f5f6fa; color: #111827; }
      header { background: #4338ca; color: white; padding: 24px 16px; }
      header h1 { margin: 0 0 6px 0; font-size: 24px; }
      main { max-width: 1080px; margin: 24px auto; padding: 0 20px; }
      section { background: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(15, 23, 42, .08); }
      section h2 { margin: 0 0 10px 0; font-size: 18px; }
      section h3 { margin: 10px 0 6px; font-size: 15px; color: #312e81; }
      .metrics { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
      .metric { background: #eef2ff; border-radius: 10px; padding: 12px; text-align: center; }
      .metric strong { color: #312e81; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; display: block; }
      .metric span { display: block; margin-top: 4px; font-size: 20px; font-weight: 600; color: #111827; }
      .status { padding: 12px; border-radius: 8px; font-weight: 600; }
      .status-ok { background: #dcfce7; color: #166534; border: 1px solid #22c55e; }
      .status-warn { background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; }
      .status-info { background: #e0e7ff; color: #1e3a8a; border: 1px solid #6366f1; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
      th { background: #eef2ff; color: #312e81; }
      .muted { color: #6b7280; font-size: 13px; }
      .reason-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 12px; }
      .reason-list { list-style: none; margin: 0; padding: 0; }
      .reason-list li { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
      .reason-list li:last-child { border-bottom: none; }
      .reason-label { color: #374151; }
      .reason-value { font-weight: 600; color: #111827; }
    </style>
  </head>
  <body>
    <header>
      <h1>Polymarket Trading Monitor</h1>
      <p class='muted'>Live snapshot of data ingest, strategy execution, and risk posture.</p>
    </header>
    <main>
      <section>
        <div id='status' class='status status-info'>Loading latest results...</div>
        <p class='muted'>Report file: <span id='report_file'>-</span> &nbsp;|&nbsp;
           Report generated: <span id='report_generated'>-</span> &nbsp;|&nbsp;
           Dashboard refreshed: <span id='last_updated'>-</span></p>
        <div class='metrics'>
          <div class='metric'><strong>Total Trades</strong><span id='total_trades'>-</span></div>
          <div class='metric'><strong>Open Positions</strong><span id='open_positions'>-</span></div>
          <div class='metric'><strong>Balance</strong><span id='current_balance'>-</span></div>
          <div class='metric'><strong>Total PnL</strong><span id='total_pnl'>-</span></div>
          <div class='metric'><strong>Win Rate</strong><span id='win_rate'>-</span></div>
          <div class='metric'><strong>Total Return</strong><span id='total_return'>-</span></div>
        </div>
      </section>
      <section>
        <h2>Realized Summary</h2>
        <div class='metrics'>
          <div class='metric'><strong>Closed Trades</strong><span id='real_closed'>-</span></div>
          <div class='metric'><strong>Wins</strong><span id='real_wins'>-</span></div>
          <div class='metric'><strong>Losses</strong><span id='real_losses'>-</span></div>
          <div class='metric'><strong>Win Rate</strong><span id='real_win_rate'>-</span></div>
          <div class='metric'><strong>Realized PnL (net)</strong><span id='real_pnl'>-</span></div>
          <div class='metric'><strong>Gross PnL</strong><span id='real_pnl_gross'>-</span></div>
          <div class='metric'><strong>Updated</strong><span id='real_updated'>-</span></div>
          <div class='metric'><strong>Avg PnL (net)</strong><span id='real_avg_pnl'>-</span></div>
          <div class='metric'><strong>Avg Hold (s)</strong><span id='real_avg_hold'>-</span></div>
        </div>
        <div class='card'>
          <h3>Exit Reasons</h3>
          <div id='real_reason_breakdown' class='reason-list'></div>
        </div>
        <div class='card'>
          <h3>Per-Strategy PnL</h3>
          <table>
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Trades</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Win Rate</th>
                <th>Net PnL</th>
                <th>Avg Hold (s)</th>
              </tr>
            </thead>
            <tbody id='real_strategy_rows'><tr><td colspan='7'>No realized trades yet</td></tr></tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Sentiment Telemetry</h2>
        <div class='metrics'>
          <div class='metric'><strong>Live Sources</strong><span id='sent_live_avail'>-</span></div>
          <div class='metric'><strong>Cache Hits</strong><span id='sent_cache_hits'>-</span></div>
          <div class='metric'><strong>Live Requests</strong><span id='sent_live_req'>-</span></div>
          <div class='metric'><strong>Live Hits</strong><span id='sent_live_hits'>-</span></div>
          <div class='metric'><strong>Live Misses</strong><span id='sent_live_miss'>-</span></div>
          <div class='metric'><strong>Fallback Used</strong><span id='sent_fallback_used'>-</span></div>
          <div class='metric'><strong>Offline Blocks</strong><span id='sent_offline_blocks'>-</span></div>
          <div class='metric'><strong>Last Source</strong><span id='sent_last_source'>-</span></div>
          <div class='metric'><strong>Last Live At</strong><span id='sent_last_live_at'>-</span></div>
        </div>
        <p class='muted'>Fallback reasons: <span id='sent_reasons'>-</span></p>
      </section>
      <section>
        <h2>Event-Driven Exits (last 24h vs prior)</h2>
        <div class='metrics'>
          <div class='metric'><strong>Wins</strong><span id='ev_wins'>-</span></div>
          <div class='metric'><strong>Losses</strong><span id='ev_losses'>-</span></div>
          <div class='metric'><strong>Win Rate</strong><span id='ev_win_rate'>-</span></div>
          <div class='metric'><strong>Avg Hold (s)</strong><span id='ev_avg_hold'>-</span></div>
          <div class='metric'><strong>Slip (NW)</strong><span id='ev_slip'>-</span></div>
          <div class='metric'><strong>Total Fees</strong><span id='ev_fees'>-</span></div>
        </div>
        <h3>Sources (last 24h)</h3>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Entries</th>
            </tr>
          </thead>
          <tbody id='event_source_rows'><tr><td colspan='2'>No event-driven entries yet</td></tr></tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th>Reason</th>
              <th>Current Count</th>
              <th>Previous Count</th>
            </tr>
          </thead>
          <tbody id='event_exit_rows'><tr><td colspan='3'>No event-driven exits yet</td></tr></tbody>
        </table>
      </section>
      <section>
        <h2>Strategy Rate Limits</h2>
        <p class='muted'>Rolling windows of per-strategy approvals (global / per-market / per-side)</p>
        <div class='metrics'>
          <div class='metric'><strong>Tracked Strategies</strong><span id='freq_strat_count'>-</span></div>
          <div class='metric'><strong>Tracked Markets</strong><span id='freq_strat_market_count'>-</span></div>
          <div class='metric'><strong>Tracked Sides</strong><span id='freq_strat_side_count'>-</span></div>
          <div class='metric'><strong>Tracked MarketÃ—Side</strong><span id='freq_strat_mkt_side_count'>-</span></div>
        </div>
        <table>
          <thead><tr><th>Strategy</th><th>Window</th><th>Max</th><th>Current</th></tr></thead>
          <tbody id='freq_rows'><tr><td colspan='4'>No frequency data yet</td></tr></tbody>
        </table>
        <h3>Top Rate-Limit Hotspots</h3>
        <table>
          <thead><tr><th>Market</th><th>Side</th><th>Count</th></tr></thead>
          <tbody id='freq_hotspots'><tr><td colspan='3'>No rate-limit hotspots yet</td></tr></tbody>
        </table>
      </section>

      <section>
        <h2>Risk Audit</h2>
        <div class='metrics'>
          <div class='metric'><strong>Approved</strong><span id='risk_approved'>-</span></div>
          <div class='metric'><strong>Rejected</strong><span id='risk_rejected'>-</span></div>
        </div>
        <h3>Top Rejections</h3>
        <table>
          <thead><tr><th>Reason</th><th>Count</th></tr></thead>
          <tbody id='risk_reasons'><tr><td colspan='2'>No risk rejections yet</td></tr></tbody>
        </table>
        <h3>Perâ€‘Strategy Risk</h3>
        <table>
          <thead><tr><th>Strategy</th><th>Approved</th><th>Rejected</th></tr></thead>
          <tbody id='risk_strategy'><tr><td colspan='3'>No strategy risk stats yet</td></tr></tbody>
        </table>
      </section>

      <section>
        <h2>Order Lifecycle</h2>
        <div class='metrics'>
          <div class='metric'><strong>Approvals</strong><span id='orders_approvals'>-</span></div>
          <div class='metric'><strong>Rejects</strong><span id='orders_rejects'>-</span></div>
          <div class='metric'><strong>Fills</strong><span id='orders_fills'>-</span></div>
          <div class='metric'><strong>Partials</strong><span id='orders_partials'>-</span></div>
          <div class='metric'><strong>Pending</strong><span id='orders_pending'>-</span></div>
          <div class='metric'><strong>WS Status</strong><span id='orders_ws_status'>-</span></div>
          <div class='metric'><strong>REST Poll</strong><span id='orders_rest_status'>-</span></div>
          <div class='metric'><strong>Ext Opened</strong><span id='ext_opened'>-</span></div>
          <div class='metric'><strong>Ext Applied</strong><span id='ext_applied'>-</span></div>
          <div class='metric'><strong>Ext Reduced</strong><span id='ext_reduced'>-</span></div>
          <div class='metric'><strong>Ext Closed</strong><span id='ext_closed'>-</span></div>
          <div class='metric'><strong>Ext Last</strong><span id='ext_last'>-</span></div>
          <div class='metric'><strong>Ext Trend</strong><span id='ext_trend'>-</span></div>
          <div class='metric'><strong>IO Orders Err</strong><span id='io_orders_err'>-</span></div>
          <div class='metric'><strong>IO Trades Err</strong><span id='io_trades_err'>-</span></div>
        </div>
        <p class='muted'>Trend window: <select id='ext_window'><option value='5'>5m</option><option value='15' selected>15m</option><option value='60'>60m</option></select></p>
        <h3>Recent Order Updates</h3>
        <table>
          <thead><tr><th>Time</th><th>Market</th><th>Side</th><th>Size</th><th>Event</th><th>Reason</th></tr></thead>
          <tbody id='orders_rows'><tr><td colspan='6'>No recent orders</td></tr></tbody>
        </table>
      </section>
      <section>
        <h2>Backtest Frontier</h2>
        <p class='muted'>Best win-rate / return combinations per maker/taker offset.</p>
        <table>
          <thead>
            <tr>
              <th>Maker Offset (bps)</th>
              <th>Taker Offset (bps)</th>
              <th>Entries</th>
              <th>Best Win Rate</th>
              <th>Best Total Return</th>
              <th>Best Holding (s)</th>
            </tr>
          </thead>
          <tbody id='frontier_rows'><tr><td colspan='6'>No frontier data yet</td></tr></tbody>
        </table>
      </section>
      <section>
        <h2>Ledger Summary</h2>
        <p class='muted'>Aggregated results from backtests_ledger.csv</p>
        <table>
          <thead>
            <tr>
              <th>Holding (s)</th>
              <th>Trades</th>
              <th>Win Rate</th>
              <th>Net PnL</th>
              <th>Avg PnL (net)</th>
            </tr>
          </thead>
          <tbody id='ledger_rows'><tr><td colspan='5'>No ledger data yet</td></tr></tbody>
        </table>
      </section>
      <section>
        <h2>Execution Telemetry</h2>
        <div class='metrics'>
          <div class='metric'><strong>Entries</strong><span id='telemetry_entries'>-</span></div>
          <div class='metric'><strong>Exits</strong><span id='telemetry_exits'>-</span></div>
          <div class='metric'><strong>Avg Notional</strong><span id='telemetry_notional'>-</span></div>
          <div class='metric'><strong>Entry Slip (bps)</strong><span id='telemetry_entry_slip'>-</span></div>
          <div class='metric'><strong>Exit Slip (bps)</strong><span id='telemetry_exit_slip'>-</span></div>
          <div class='metric'><strong>Total Fees</strong><span id='telemetry_fees'>-</span></div>
          <div class='metric'><strong>Micro-Arb (internal)</strong><span id='telemetry_micro_internal'>-</span></div>
          <div class='metric'><strong>Micro-Arb (external)</strong><span id='telemetry_micro_external'>-</span></div>
        </div>
        <p class='muted'>Execution modes: <span id='telemetry_modes'>-</span></p>
        <div class='reason-grid'>
          <div>
            <h3>Strategy Holds</h3>
            <ul id='strategy_hold_counts' class='reason-list'><li class='muted'>No strategy holds</li></ul>
          </div>
          <div>
            <h3>Strategy Rejects</h3>
            <ul id='strategy_reject_counts' class='reason-list'><li class='muted'>No strategy rejects</li></ul>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Trades*</th>
              <th>Wins*</th>
              <th>Losses*</th>
              <th>Win Rate</th>
              <th>Net PnL</th>
              <th>Avg Net PnL</th>
            </tr>
          </thead>
          <tbody id='telemetry_strategy_rows'><tr><td colspan='7'>No exit fills yet</td></tr></tbody>
        </table>
        <p class='muted footnote'>*Weighted by shared contributions when multiple strategies participate.</p>
      </section>
      <section>
        <h2>Execution Loop</h2>
        <div class='metrics'>
          <div class='metric'><strong>Processed</strong><span id='loop_processed'>-</span></div>
          <div class='metric'><strong>Approved</strong><span id='loop_approved'>-</span></div>
          <div class='metric'><strong>Rejected</strong><span id='loop_rejected'>-</span></div>
          <div class='metric'><strong>On Hold</strong><span id='loop_hold'>-</span></div>
          <div class='metric'><strong>Next Sleep (s)</strong><span id='loop_sleep'>-</span></div>
        </div>
        <p class='muted'>Fallback state: <span id='fallback_state'>-</span> &nbsp;|&nbsp; Validation coverage: <span id='validation_coverage'>-</span></p>
        <div class='metrics'>
          <div class='metric'><strong>Current Source</strong><span id='ingest_source'>-</span></div>
          <div class='metric'><strong>WS Age (s)</strong><span id='ws_age'>-</span></div>
          <div class='metric'><strong>REST Age (s)</strong><span id='rest_age'>-</span></div>
          <div class='metric'><strong>WS Cooldown (s)</strong><span id='ws_cooldown'>-</span></div>
        </div>
        <div class='reason-grid'>
          <div>
            <h3>Hold Reasons</h3>
            <ul id='hold_reasons' class='reason-list'><li class='muted'>No holds recorded</li></ul>
          </div>
          <div>
            <h3>Reject Reasons</h3>
            <ul id='reject_reasons' class='reason-list'><li class='muted'>No rejects recorded</li></ul>
          </div>
        </div>
      </section>
      <section>
        <h2>Ingest Metrics</h2>
        <div class='metrics'>
          <div class='metric'><strong>REST Requests</strong><span id='rest_requests'>-</span></div>
          <div class='metric'><strong>429s</strong><span id='rest_429s'>-</span></div>
          <div class='metric'><strong>Inflight Peak</strong><span id='rest_inflight_peak'>-</span></div>
          <div class='metric'><strong>Avg Latency (ms)</strong><span id='rest_latency_avg'>-</span></div>
        </div>
      </section>
      <section>
        <h2>Exit Analytics</h2>
        <p class='muted' id='exit_alert'>Exit analytics data not available yet.</p>
        <div class='metrics'>
          <div class='metric'><strong>Current Trades</strong><span id='exit_current_trades'>-</span></div>
          <div class='metric'><strong>Current PnL</strong><span id='exit_current_pnl'>-</span></div>
          <div class='metric'><strong>Current tp/sl Share</strong><span id='exit_current_tp_sl'>-</span></div>
          <div class='metric'><strong>Previous Trades</strong><span id='exit_previous_trades'>-</span></div>
          <div class='metric'><strong>Previous PnL</strong><span id='exit_previous_pnl'>-</span></div>
          <div class='metric'><strong>Previous tp/sl Share</strong><span id='exit_previous_tp_sl'>-</span></div>
        </div>
        <div class='reason-grid'>
          <div>
            <h3>Worst Markets (current)</h3>
            <ul id='exit_current_worst' class='reason-list'><li class='muted'>No data</li></ul>
          </div>
          <div>
            <h3>Worst Markets (previous)</h3>
            <ul id='exit_previous_worst' class='reason-list'><li class='muted'>No data</li></ul>
          </div>
        </div>
      </section>
      <section>
        <h2>Recent Trades</h2>
        <table>
          <thead><tr><th>Market</th><th>Action</th><th>Size</th><th>Confidence</th><th>Score</th><th>Timestamp</th><th>Strategies</th></tr></thead>
          <tbody id='recent_trades'><tr><td colspan='7'>No trades yet</td></tr></tbody>
        </table>
      </section>
      <section>
        <h2>Daily Strategy Metrics</h2>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Win Rate</th>
              <th>Net PnL</th>
              <th>Avg Hold (s)</th>
              <th>NW Slippage</th>
              <th>Fees</th>
              <th>Events</th>
            </tr>
          </thead>
          <tbody id='daily_strategy_rows'><tr><td colspan='9'>No daily metrics yet</td></tr></tbody>
        </table>
      </section>
    </main>
    <script>
      function fmtNumber(x){ if(x==null||isNaN(x)) return '-'; return Number(x).toLocaleString(); }
      function fmtCurrency(x){ if(x==null||isNaN(x)) return '-'; return '$' + Number(x).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
      function fmtPercent(x){ if(x==null||isNaN(x)) return '-'; return (Number(x)*100).toFixed(2) + '%'; }
      function fmtPercentValue(x){ if(x==null||isNaN(x)) return '-'; return Number(x).toFixed(1) + '%'; }
      function fmtSeconds(x){ if(x==null||isNaN(x)) return '-'; return Number(x).toFixed(1) + ' s'; }
      function fmtTime(t){ if(!t) return '-'; const d=new Date(t); return isNaN(d.getTime())? String(t) : d.toLocaleString(); }
      function fmtEpoch(sec){ if(sec==null) return '-'; const d=new Date(Number(sec)*1000); return isNaN(d.getTime())? '-' : d.toLocaleTimeString(); }
      function nz(value, fallback){ return (value === undefined || value === null) ? fallback : value; }
      // Tiny sparkline generator using unicode blocks (global fallback)
      if (typeof window.spark !== 'function') {
        window.spark = function(arr){
          if(!Array.isArray(arr) || !arr.length){ return '-'; }
          const bars = 'â–â–‚â–ƒâ–„â–…â–†â–‡â–ˆ';
          let min = Infinity, max = -Infinity;
          for(const v of arr){
            const x = Number(v||0);
            if(!Number.isFinite(x)) continue;
            if(x < min) min = x; if(x > max) max = x;
          }
          if(!isFinite(min) || !isFinite(max)){ return '-'; }
          const span = (max - min) || 1;
          let out = '';
          for(const v of arr){
            const x = Number(v||0);
            const idx = Math.max(0, Math.min(7, Math.floor(((x - min) / span) * 7)));
            out += bars[idx];
          }
          return out;
        }
      }
      const missing = new Set();
      function byId(id){
        const el=document.getElementById(id);
        if(!el && !missing.has(id)){
          console.warn('monitor: missing element #' + id);
          missing.add(id);
        }
        return el;
      }
      function setText(id, value, formatter){
        const el=byId(id);
        if(!el) return;
        let text = formatter ? formatter(value) : value;
        if(text === undefined || text === null || text === ''){
          text = '-';
        }
        el.textContent = text;
      }
      function renderReasonList(id, data, emptyText){
        const el=byId(id);
        if(!el) return;
        el.innerHTML='';
        const entries=[];
        if(data && typeof data === 'object'){
          Object.entries(data).forEach(([reason,count]) => {
            const value = Number(count || 0);
            if(Number.isFinite(value) && value > 0){
              entries.push({reason, count:value});
            }
          });
        }
        entries.sort((a,b) => b.count - a.count);
        if(!entries.length){
          const li=document.createElement('li');
          li.className='muted';
          li.textContent=emptyText;
          el.appendChild(li);
          return;
        }
        entries.forEach(item => {
          const li=document.createElement('li');
          const name=document.createElement('span');
          name.className='reason-label';
          name.textContent=item.reason;
          const value=document.createElement('span');
          value.className='reason-value';
          value.textContent=fmtNumber(item.count);
          li.appendChild(name);
          li.appendChild(value);
          el.appendChild(li);
        });
      }
      function renderWorstList(id, items){
        const el=byId(id);
        if(!el) return;
        el.innerHTML='';
        if(!items || !items.length){
          const li=document.createElement('li');
          li.className='muted';
          li.textContent='No data';
          el.appendChild(li);
          return;
        }
        items.slice(0,5).forEach(function(row){
          const market = row[0];
          const pnl = Number(row[1] || 0);
          const count = Number(row[2] || 0);
          const li=document.createElement('li');
          const name=document.createElement('span');
          name.className='reason-label';
          name.textContent=market;
          const value=document.createElement('span');
          value.className='reason-value';
          value.textContent=fmtCurrency(pnl) + ' (' + fmtNumber(count) + ')';
          li.appendChild(name);
          li.appendChild(value);
          el.appendChild(li);
        });
      }
      function renderStrategyTable(id, data){
        const el=byId(id);
        if(!el) return;
        el.innerHTML='';
        const rows=[];
        if(data && typeof data === 'object'){
          Object.entries(data).forEach(([name, stats]) => {
            if(!stats) return;
            rows.push({
              name,
              trades: Number(stats.trades || 0),
              wins: Number(stats.wins || 0),
              losses: Number(stats.losses || 0),
              win_rate_pct: stats.win_rate_pct,
              net_pnl: nz(stats.total_pnl_after_fees, stats.total_pnl),
              avg_hold: stats.avg_holding_seconds
            });
          });
        }
        rows.sort((a,b) => b.trades - a.trades);
        if(!rows.length){
          el.innerHTML = '<tr><td colspan="7">No realized trades yet</td></tr>';
          return;
        }
        rows.forEach(item => {
          const tr=document.createElement('tr');
          const winRate = (item.win_rate_pct==null) ? '-' : fmtPercentValue(item.win_rate_pct);
          tr.innerHTML =
            '<td>'+ item.name +'</td>'+
            '<td>'+ fmtNumber(item.trades) +'</td>'+
            '<td>'+ fmtNumber(item.wins) +'</td>'+
            '<td>'+ fmtNumber(item.losses) +'</td>'+
            '<td>'+ winRate +'</td>'+
            '<td>'+ fmtCurrency(nz(item.net_pnl, 0)) +'</td>'+
            '<td>'+ fmtSeconds(item.avg_hold) +'</td>';
          el.appendChild(tr);
        });
      }
      function renderFrontierTable(id, data){
        const el=byId(id);
        if(!el) return;
        el.innerHTML='';
        if(!data || !data.length){
          el.innerHTML = '<tr><td colspan="6">No frontier data yet</td></tr>';
          return;
        }
        data.forEach(item => {
          const tr=document.createElement('tr');
          tr.innerHTML =
            '<td>'+ fmtNumber(item.maker_offset_bps) +'</td>'+
            '<td>'+ fmtNumber(item.taker_offset_bps) +'</td>'+
            '<td>'+ fmtNumber(item.entries) +'</td>'+
            '<td>'+ fmtPercent(item.best_win_rate) +'</td>'+
            '<td>'+ fmtPercent(item.best_total_return) +'</td>'+
            '<td>'+ fmtNumber(item.best_holding_seconds) +'</td>';
          el.appendChild(tr);
        });
      }
      function renderHotspots(id, rows){
        const el=byId(id);
        if(!el) return;
        el.innerHTML='';
        if(!rows || !rows.length){ el.innerHTML = '<tr><td colspan="3">No rate-limit hotspots yet</td></tr>'; return; }
        rows.forEach(item => {
          const tr=document.createElement('tr');
          tr.innerHTML =
            '<td>'+ (item.market_id||'-') +'</td>'+
            '<td>'+ (item.side||'-') +'</td>'+
            '<td>'+ fmtNumber(item.count) +'</td>';
          el.appendChild(tr);
        });
      }
      function renderRiskReasons(id, data){
        const el=byId(id);
        if(!el) return;
        el.innerHTML='';
        const rows = [];
        if(data && typeof data === 'object'){
          Object.entries(data).forEach(([name, cnt]) => { rows.push({name, count:Number(cnt||0)}); });
        }
        rows.sort((a,b)=> b.count - a.count);
        if(!rows.length){ el.innerHTML = '<tr><td colspan="2">No risk rejections yet</td></tr>'; return; }
        rows.forEach(r => {
          const tr=document.createElement('tr');
          tr.innerHTML = '<td>'+ r.name +'</td><td>'+ fmtNumber(r.count) +'</td>';
          el.appendChild(tr);
        });
      }
      function renderStrategyRisk(id, data){
        const el=byId(id); if(!el) return; el.innerHTML='';
        const rows=[]; if(data && typeof data==='object'){
          Object.entries(data).forEach(([name, obj])=>{
            rows.push({name, approved:Number((obj&&obj.approved)||0), rejected:Number((obj&&obj.rejected)||0)});
          });
        }
        rows.sort((a,b)=> (b.rejected - a.rejected) || (b.approved - a.approved));
        if(!rows.length){ el.innerHTML='<tr><td colspan="3">No strategy risk stats yet</td></tr>'; return; }
        rows.forEach(r=>{
          const tr=document.createElement('tr');
          tr.innerHTML = '<td>'+ r.name +'</td><td>'+ fmtNumber(r.approved) +'</td><td>'+ fmtNumber(r.rejected) +'</td>';
          el.appendChild(tr);
        });
      }
      function renderOrderRows(id, rows){
        const el=byId(id);
        if(!el) return;
        el.innerHTML='';
        if(!rows || !rows.length){ el.innerHTML = '<tr><td colspan="6">No recent orders</td></tr>'; return; }
        rows.forEach(r => {
          const tr=document.createElement('tr');
          tr.innerHTML =
            '<td>'+ fmtTime(r.timestamp) +'</td>'+
            '<td>'+ (r.market_id||'-') +'</td>'+
            '<td>'+ (r.action||'-') +'</td>'+
            '<td>'+ fmtNumber(r.size) +'</td>'+
            '<td>'+ (r.event||'-') +'</td>'+
            '<td>'+ (r.reason||'') +'</td>';
          el.appendChild(tr);
        });
      }
      function renderLedgerTable(id, data){
        const el=byId(id);
        if(!el) return;
        el.innerHTML='';
        if(!data || !data.length){
          el.innerHTML = '<tr><td colspan="5">No ledger data yet</td></tr>';
          return;
        }
        data.forEach(item => {
          const tr=document.createElement('tr');
          tr.innerHTML =
            '<td>'+ fmtNumber(item.holding_seconds) +'</td>'+
            '<td>'+ fmtNumber(item.trades) +'</td>'+
            '<td>'+ fmtPercent(item.win_rate) +'</td>'+
            '<td>'+ fmtCurrency(item.total_pnl_after_fees !== undefined ? item.total_pnl_after_fees : item.total_pnl) +'</td>'+
            '<td>'+ fmtCurrency(item.avg_pnl_after_fees) +'</td>';
          el.appendChild(tr);
        });
      }
      function renderTelemetryStrategyTable(id, data){
        const el = byId(id);
        if(!el) return;
        el.innerHTML = '';
        if(!data || !data.length){
          el.innerHTML = '<tr><td colspan="7">No exit fills yet</td></tr>';
          return;
        }
        data.forEach(item => {
          const winRate = item.win_rate == null ? '-' : fmtPercent(item.win_rate);
          const row = document.createElement('tr');
          row.innerHTML =
            '<td>'+ item.name +'</td>'+
            '<td>'+ fmtNumber(item.trades) +'</td>'+
            '<td>'+ fmtNumber(item.wins) +'</td>'+
            '<td>'+ fmtNumber(item.losses) +'</td>'+
            '<td>'+ winRate +'</td>'+
            '<td>'+ fmtCurrency(item.pnl_after !== undefined ? item.pnl_after : item.pnl) +'</td>'+
            '<td>'+ fmtCurrency(item.avg_pnl_after) +'</td>';
          el.appendChild(row);
        });
      }

      function setBanner(p){
        const el=byId('status');
        if(!el) return;
        if(!p || p.status !== 'success'){
          el.className='status status-info';
          el.textContent=(p&&p.message)||'Waiting for trading system';
          return;
        }
        const info=(p.pipeline && p.pipeline.fetch_info) || {};
        const ows = info.orders_ws || {};
        const owsStatus = (ows.status||'disabled').toLowerCase();
        const cd = ows.cooldown_remaining_seconds;
        const lastOk = ows.last_success_epoch ? (' last ' + fmtEpoch(ows.last_success_epoch)) : '';
        const owsTail = (owsStatus==='healthy') ? ('Order WS healthy' + lastOk) : ('Order WS '+owsStatus+(cd?(' ('+cd+'s)'):'')+ lastOk);
        const ioe = (p.pipeline && p.pipeline.io_errors) || {};
        const ioSum = Number(ioe.orders||0)+Number(ioe.trades||0)+Number(ioe.status||0)+Number(ioe.positions||0);
        const ioNote = ioSum>0 ? (' Â· IO degraded ('+ioSum+')') : '';
        const orc = info.orders_rest || {};
        const restErrs = Number(orc.errors||0);
        const wsDegraded = (owsStatus!=='healthy' && owsStatus!=='disabled');
        const isFallback = !!info.fallback;
        const shouldWarn = isFallback || wsDegraded || restErrs>0 || ioSum>0;
        el.className = shouldWarn ? 'status status-warn' : 'status status-ok';
        let base = shouldWarn ? (isFallback ? ('Fallback mode ('+(info.reason||'unknown')+')') : 'Live data ingest') : 'Live data ingest healthy';
        const src = (info && info.current_source) || '';
        if(!isFallback && (src==='rest_public')){ base = 'Live data ingest'; }
        el.textContent = base + ' â€?' + owsTail + (restErrs>0?(' Â· REST errors '+restErrs):'') + ioNote;
      }

      // Safer banner rendering to avoid encoding glitches on some Windows setups
      function setBannerFixed(p){
        const el=byId('status');
        if(!el) return;
        if(!p || p.status !== 'success'){
          el.className='status status-info';
          el.textContent=(p&&p.message)||'Waiting for trading system';
          return;
        }
        const info=(p.pipeline && p.pipeline.fetch_info) || {};
        const ows = info.orders_ws || {};
        const owsStatus = (ows.status||'disabled').toLowerCase();
        const cd = ows.cooldown_remaining_seconds;
        const lastOk = ows.last_success_epoch ? (' last ' + fmtEpoch(ows.last_success_epoch)) : '';
        const owsTail = (owsStatus==='healthy') ? ('Order WS healthy' + lastOk) : ('Order WS '+owsStatus+(cd?(' ('+cd+'s)'):'')+ lastOk);
        const ioe = (p.pipeline && p.pipeline.io_errors) || {};
        const ioSum = Number(ioe.orders||0)+Number(ioe.trades||0)+Number(ioe.status||0)+Number(ioe.positions||0);
        const ioNote = ioSum>0 ? (' ¡¤ IO degraded ('+ioSum+')') : '';
        const orc = info.orders_rest || {};
        const restErrs = Number(orc.errors||0);
        const wsDegraded = (owsStatus!=='healthy' && owsStatus!=='disabled');
        const isFallback = !!info.fallback;
        const shouldWarn = isFallback || wsDegraded || restErrs>0 || ioSum>0;
        el.className = shouldWarn ? 'status status-warn' : 'status status-ok';
        const base = shouldWarn ? (isFallback ? ('Fallback mode ('+(info.reason||'unknown')+')') : 'Live data ingest') : 'Live data ingest healthy';
        // Use ASCII separator to avoid mojibake
        el.textContent = base + ' | ' + owsTail + (restErrs>0?(' ¡¤ REST errors '+restErrs):'') + ioNote;
      }

      function updateView(p){
        setBannerFixed(p);
        if(!p || p.status !== 'success') return;
        setText('report_file', p.filename || '-');
        setText('report_generated', p.report_generated_at, fmtTime);
        setText('last_updated', p.timestamp, fmtTime);
        setText('total_trades', nz(p.total_trades, 0), fmtNumber);
        setText('open_positions', nz(p.open_positions, 0), fmtNumber);
        setText('current_balance', nz(p.current_balance, 0), fmtCurrency);
        setText('total_pnl', nz(p.total_pnl, 0), fmtCurrency);
        setText('win_rate', nz(p.win_rate, 0), fmtPercent);
        setText('total_return', nz(p.total_return, 0), fmtPercent);
        const rz=p.realized||{};
        setText('real_closed', nz(rz.closed_trades, 0), fmtNumber);
        setText('real_wins', nz(rz.wins, 0), fmtNumber);
        setText('real_losses', nz(rz.losses, 0), fmtNumber);
        setText('real_win_rate', nz(rz.win_rate_pct, null), fmtPercentValue);
        const pnlNet = nz(rz.total_pnl_after_fees, rz.total_pnl);
        setText('real_pnl', nz(pnlNet, 0), fmtCurrency);
        setText('real_pnl_gross', nz(rz.total_pnl, 0), fmtCurrency);
        setText('real_updated', rz.last_updated, fmtTime);
        setText('real_avg_pnl', nz(rz.avg_pnl_after_fees, 0), fmtCurrency);
        setText('real_avg_hold', nz(rz.avg_holding_seconds, null), fmtSeconds);
        renderReasonList('real_reason_breakdown', rz.reasons || {}, 'No realized trades yet');
        renderStrategyTable('real_strategy_rows', rz.per_strategy || {});
        renderFrontierTable('frontier_rows', p.frontier || []);
        const orders = p.orders || {};
        const rejects = orders.rejects || {};
        const rejectSum = Object.values(rejects).reduce((a,b)=>a+Number(b||0),0);
        setText('orders_approvals', nz(orders.approvals, 0), fmtNumber);
        setText('orders_rejects', rejectSum, fmtNumber);
        setText('orders_fills', nz(orders.fills, 0), fmtNumber);
        setText('orders_partials', nz(orders.partials, 0), fmtNumber);
        setText('orders_pending', nz(orders.pending, 0), fmtNumber);
        renderOrderRows('orders_rows', orders.recent || []);
        // Order feed status mini-cards
        const fi = (p.pipeline && p.pipeline.fetch_info) || {};
        const ows = fi.orders_ws || {};
        const owsMiniTxt = (ows.status||'-') + (ows.cooldown_remaining_seconds?(' ('+ows.cooldown_remaining_seconds+'s)'):'') + (ows.last_success_epoch?(' Â· last '+fmtEpoch(ows.last_success_epoch)):'') + (ows.last_error_epoch?(' Â· last err '+fmtEpoch(ows.last_error_epoch)):'');
        setText('orders_ws_status', owsMiniTxt);
        const wsEl = byId('orders_ws_status'); if(wsEl){ wsEl.title = ows.last_error ? String(ows.last_error) : ''; }
        const orc = fi.orders_rest || {};
        const restTxt = (orc.running ? ('On ('+ (orc.interval_seconds||'-') +'s)') : 'Off') + (orc.errors?(' Â· err '+orc.errors):'') + (orc.last_success_epoch?(' Â· last '+fmtEpoch(orc.last_success_epoch)):'') + (orc.last_error_epoch?(' Â· last err '+fmtEpoch(orc.last_error_epoch)):'');
        setText('orders_rest_status', restTxt);
        const restEl = byId('orders_rest_status'); if(restEl){ restEl.title = orc.last_error ? String(orc.last_error) : ''; }
        const telemetry=p.telemetry||{};
        setText('telemetry_entries', nz(telemetry.entries, 0), fmtNumber);
        setText('telemetry_exits', nz(telemetry.exits, 0), fmtNumber);
        setText('telemetry_notional', telemetry.avg_notional, fmtCurrency);
        setText('telemetry_entry_slip', telemetry.avg_entry_slip_bps, fmtNumber);
        setText('telemetry_exit_slip', telemetry.avg_exit_slip_bps, fmtNumber);
        setText('telemetry_fees', telemetry.total_fees, fmtCurrency);
        const modes = telemetry.execution_modes || {};
        const modeParts = Object.keys(modes).sort().map(name => name + ': ' + modes[name]);
        setText('telemetry_modes', modeParts.length ? modeParts.join(', ') : '-');
        const micro = telemetry.micro_arbitrage || {};
        setText('telemetry_micro_internal', nz(micro.internal, 0), fmtNumber);
        setText('telemetry_micro_external', nz(micro.external, 0), fmtNumber);
        renderTelemetryStrategyTable('telemetry_strategy_rows', telemetry.strategy_pnl || []);
        const pipeline=p.pipeline||{};
        const loop=pipeline.loop_summary||{};
        const holdReasons=pipeline.hold_reasons||{};
        const rejectReasons=pipeline.reject_reasons||{};
        const holdTotal=Object.values(holdReasons).reduce((acc,val)=>acc+Number(val||0),0);
        setText('loop_processed', nz(loop.processed, 0), fmtNumber);
        setText('loop_approved', nz(loop.approved, 0), fmtNumber);
        setText('loop_rejected', nz(loop.rejected, 0), fmtNumber);
        setText('loop_hold', holdTotal, fmtNumber);
        setText('loop_sleep', pipeline.next_sleep_seconds, fmtNumber);
        const fetchInfo=pipeline.fetch_info||{};
        let fallbackLabel=fetchInfo.fallback ? 'Fallback ('+(fetchInfo.reason||'unknown')+')' : 'Live ingest';
        if(!fetchInfo.fallback && fetchInfo.current_source==='rest_public'){ fallbackLabel = 'Live ingest'; }
        setText('fallback_state', fallbackLabel);
        // Sentiment telemetry
        const sent = (p.pipeline && p.pipeline.sentiment) || {};
        setText('sent_live_avail', sent.live_sources_available ? 'Yes' : 'No');
        setText('sent_cache_hits', nz(sent.cache_hits, 0), fmtNumber);
        setText('sent_live_req', nz(sent.live_requests, 0), fmtNumber);
        setText('sent_live_hits', nz(sent.live_hits, 0), fmtNumber);
        setText('sent_live_miss', nz(sent.live_misses, 0), fmtNumber);
        setText('sent_fallback_used', nz(sent.fallback_used, 0), fmtNumber);
        setText('sent_offline_blocks', nz(sent.offline_blocks, 0), fmtNumber);
        setText('sent_last_source', sent.last_live_source || '-');
        setText('sent_last_live_at', sent.last_live_at || '-');
        try {
          const fr = sent.fallback_reasons || {};
          const parts = Object.keys(fr).sort((a,b)=>fr[b]-fr[a]).map(k => k+': '+fr[k]);
          setText('sent_reasons', parts.length ? parts.join(', ') : '-');
        } catch (e) {
          setText('sent_reasons', '-');
        }
        const coverage = nz(pipeline.validation_coverage_pct, fetchInfo.validation && fetchInfo.validation.coverage_pct);
        setText('validation_coverage', coverage, fmtPercentValue);
        renderReasonList('hold_reasons', holdReasons, 'No holds recorded');
        renderReasonList('reject_reasons', rejectReasons, 'No rejects recorded');
        const freqOrders = p.orders || {};
        renderHotspots('freq_hotspots', freqOrders.rate_limit_hotspots || []);
        // Risk audit summary
        const ra = (p.pipeline && p.pipeline.risk_audit) || {};
        setText('risk_approved', nz(ra.approved, 0), fmtNumber);
        setText('risk_rejected', nz(ra.rejected, 0), fmtNumber);
        renderRiskReasons('risk_reasons', ra.reasons || {});
        renderStrategyRisk('risk_strategy', (p.pipeline && p.pipeline.strategy_risk) || {});
        // External fills metrics
        const ext = (p.pipeline && p.pipeline.external_fills) || {};
        setText('ext_opened', nz(ext.opened, 0), fmtNumber);
        setText('ext_applied', nz(ext.applied_same_side, 0), fmtNumber);
        setText('ext_reduced', nz(ext.reduced_opposite, 0), fmtNumber);
        setText('ext_closed', nz(ext.closed, 0), fmtNumber);
        setText('ext_last', ext.last_seen, fmtTime);
        const tr = (p.pipeline && p.pipeline.external_fills_trend) || [];
        const counts = Array.isArray(tr) ? tr.map(x => Number((x && x.count) || 0)) : [];
        const trendEl = byId('ext_trend'); if(trendEl){ trendEl.textContent = spark(counts); }
        // IO error counters
        const ioe = (p.pipeline && p.pipeline.io_errors) || {};
        setText('io_orders_err', nz(ioe.orders, 0), fmtNumber);
        setText('io_trades_err', nz(ioe.trades, 0), fmtNumber);
        renderReasonList('strategy_hold_counts', pipeline.strategy_hold_counts || {}, 'No strategy holds');
        renderReasonList('strategy_reject_counts', pipeline.strategy_reject_counts || {}, 'No strategy rejects');
        const freq = pipeline.strategy_order_frequency || {};
        const freqMkt = pipeline.strategy_market_order_frequency || {};
        const freqSide = pipeline.strategy_side_order_frequency || {};
        const freqMktSide = pipeline.strategy_market_side_order_frequency || {};
        setText('freq_strat_count', Object.keys(freq).length, fmtNumber);
        setText('freq_strat_market_count', Object.keys(freqMkt).length, fmtNumber);
        setText('freq_strat_side_count', Object.keys(freqSide).length, fmtNumber);
        setText('freq_strat_mkt_side_count', Object.keys(freqMktSide).length, fmtNumber);
        // Ingest metrics mini-cards
        const rest = (fetchInfo.rest_metrics||{});
        const lat = (rest.latency_ms||{});
        setText('rest_requests', nz(rest.requests, 0), fmtNumber);
        setText('rest_429s', nz(rest['429s'], 0), fmtNumber);
        setText('rest_inflight_peak', nz(rest.inflight_peak, 0), fmtNumber);
        setText('rest_latency_avg', nz(lat.avg, null), fmtNumber);
        const freqTb = byId('freq_rows');
        if(freqTb){
          const rows = Object.entries(freq).map(([name, cfg]) => {
            const cur = Number(nz(cfg.current_window, 0));
            const max = Number(nz(cfg.max_orders, 0));
            const win = Number(nz(cfg.interval_seconds, 0));
            return {name, cur, max, win};
          });
          rows.sort((a,b)=>b.cur-a.cur);
          if(!rows.length){ freqTb.innerHTML = '<tr><td colspan="4">No frequency data yet</td></tr>'; }
          else {
            freqTb.innerHTML='';
            rows.forEach(r => {
              const tr=document.createElement('tr');
              tr.innerHTML = '<td>'+r.name+'</td>'+
                             '<td>'+fmtSeconds(r.win)+'</td>'+
                             '<td>'+fmtNumber(r.max)+'</td>'+
                             '<td>'+fmtNumber(r.cur)+'</td>';
              freqTb.appendChild(tr);
            });
          }
        }
        setText('ingest_source', nz(pipeline.current_source, fetchInfo.current_source));
        const sources = (fetchInfo.sources||{});
        setText('ws_age', sources.ws_age_seconds, fmtSeconds);
        setText('rest_age', sources.rest_age_seconds, fmtSeconds);
        setText('ws_cooldown', pipeline.ws_cooldown_remaining_seconds, fmtSeconds);
        const tb=byId('recent_trades');
        if(tb){
          tb.innerHTML='';
          (p.recent_trades || []).forEach(function(tr){
            const row=document.createElement('tr');
            row.innerHTML = '<td>'+ (tr.market_id||'-') +'</td>' +
                            '<td>'+ (tr.action||'-') +'</td>' +
                            '<td>'+ fmtNumber(nz(tr.size,0)) +'</td>' +
                            '<td>'+ (tr.confidence==null?'-':fmtPercent(tr.confidence)) +'</td>' +
                            '<td>'+ (tr.score==null?'-':fmtNumber(tr.score)) +'</td>' +
                            '<td>'+ fmtTime(tr.timestamp) +'</td>' +
                            '<td>'+ (tr.strategies && tr.strategies.length ? tr.strategies.join(', ') : '-') +'</td>';
            tb.appendChild(row);
          });
          if(!p.recent_trades || !p.recent_trades.length){
            tb.innerHTML = '<tr><td colspan="7">No trades recorded yet</td></tr>';
          }
        }
        // Daily strategy metrics table
        try {
          const d = (p.pipeline && p.pipeline.daily_strategy) || {};
          const per = d.per_strategy || {};
          const tb2 = byId('daily_strategy_rows');
          if(tb2){
            const rows = Object.keys(per).sort().map(function(name){ const m = per[name] || {}; return {
              name,
              wins: nz(m.wins, 0),
              losses: nz(m.losses, 0),
              win_rate: nz(m.win_rate, 0),
              pnl: nz(m.pnl_after_fees, 0),
              hold: nz(m.avg_holding_seconds, 0),
              slip: nz(m.slippage_notional_weighted, 0),
              fees: nz(m.total_fees, 0),
              events: nz(m.events, 0),
            }; });
            tb2.innerHTML='';
            if(!rows.length){ tb2.innerHTML = "<tr><td colspan='9'>No daily metrics yet</td></tr>"; }
            else {
              rows.forEach(function(r){
                const tr = document.createElement('tr');
                tr.innerHTML = '<td>'+r.name+'</td>'+
                               '<td>'+fmtNumber(r.wins)+'</td>'+
                               '<td>'+fmtNumber(r.losses)+'</td>'+
                               '<td>'+fmtPercent(r.win_rate)+'</td>'+
                               '<td>'+fmtCurrency(r.pnl)+'</td>'+
                               '<td>'+fmtSeconds(r.hold)+'</td>'+
                               '<td>'+fmtNumber(r.slip)+'</td>'+
                               '<td>'+fmtCurrency(r.fees)+'</td>'+
                               '<td>'+fmtNumber(r.events)+'</td>';
                tb2.appendChild(tr);
              });
            }
          }
        } catch (e) { /* ignore */ }
        const analytics=p.exit_analytics||{};
        const results=analytics.results||{};
        const current=results.current||{};
        const previous=results.previous||{};
        const threshold=analytics.threshold!=null? analytics.threshold : 0.7;
        setText('exit_current_trades', current.total_trades, fmtNumber);
        setText('exit_current_pnl', current.total_pnl, fmtCurrency);
        setText('exit_current_tp_sl', current.tp_sl_share, fmtPercent);
        setText('exit_previous_trades', previous.total_trades, fmtNumber);
        setText('exit_previous_pnl', previous.total_pnl, fmtCurrency);
        setText('exit_previous_tp_sl', previous.tp_sl_share, fmtPercent);
        renderWorstList('exit_current_worst', current.worst_markets||[]);
        renderWorstList('exit_previous_worst', previous.worst_markets||[]);
        // Event-driven exit reasons table (counts only)
        try {
          const curList = current.reason_counts || [];
          const prevList = previous.reason_counts || [];
          const prevMap = {};
          prevList.forEach(function(it){ if(Array.isArray(it) && it.length>=2){ prevMap[String(it[0])] = Number(it[1]||0); } });
          const evRows = (curList||[]).filter(function(it){ return Array.isArray(it) && String(it[0]||'').startsWith('event_'); });
          const tb = byId('event_exit_rows');
          if(tb){
            tb.innerHTML='';
            if(!evRows.length){ tb.innerHTML="<tr><td colspan='3'>No event-driven exits yet</td></tr>"; }
            else {
              evRows.forEach(function(it){
                const name = String(it[0]);
                const cur = Number(it[1]||0);
                const prev = Number(prevMap[name]||0);
                const tr = document.createElement('tr');
                tr.innerHTML = '<td>'+name+'</td><td>'+fmtNumber(cur)+'</td><td>'+fmtNumber(prev)+'</td>';
                tb.appendChild(tr);
              });
            }
          }
        } catch (e) { /* ignore */ }
        // Event-driven summary metrics
        const ev = p.event_driven || {};
        setText('ev_wins', nz(ev.wins, 0), fmtNumber);
        setText('ev_losses', nz(ev.losses, 0), fmtNumber);
        setText('ev_win_rate', ev.win_rate, fmtPercent);
        setText('ev_avg_hold', ev.avg_holding_seconds, fmtSeconds);
        setText('ev_slip', ev.slippage, fmtNumber);
        setText('ev_fees', ev.total_fees, fmtCurrency);
        // Event-driven source table
        try {
          const srcs = ev.sources || {};
          const tb = byId('event_source_rows');
          if(tb){
            const entries = Object.entries(srcs).sort((a,b)=>b[1]-a[1]);
            tb.innerHTML='';
            if(!entries.length){ tb.innerHTML="<tr><td colspan='2'>No event-driven entries yet</td></tr>"; }
            else {
              entries.forEach(function([name, count]){
                const tr=document.createElement('tr');
                tr.innerHTML='<td>'+name+'</td><td>'+fmtNumber(count)+'</td>';
                tb.appendChild(tr);
              });
            }
          }
        } catch (e) { /* ignore */ }
        const alertEl=byId('exit_alert');
        if(alertEl){
          const alertFlags=analytics.tp_sl_alert||{};
          const currentAlert=!!alertFlags.current;
          if(!current.total_trades && !previous.total_trades){
            alertEl.className='muted';
            alertEl.textContent='Exit analytics data not available yet.';
          } else if(currentAlert){
            alertEl.className='status status-warn';
            alertEl.textContent='Alert: Current tp/sl share ' + fmtPercent(current.tp_sl_share) + ' exceeds threshold ' + fmtPercent(threshold);
          } else {
            alertEl.className='status status-ok';
            alertEl.textContent='Current tp/sl share ' + fmtPercent(current.tp_sl_share) + ' (threshold ' + fmtPercent(threshold) + ')';
          }
        }
      }

      function refresh(){
        const winSel = byId('ext_window');
        const w = winSel ? Number(winSel.value||15) : 15;
        fetch('/api/data?ext_window='+encodeURIComponent(w)).then(r => r.json()).then(updateView).catch(err => {
          console.error(err);
          setBanner({status:'error', message:String(err)});
        });
      }
      function start(){
        refresh();
        setInterval(refresh, 5000);
      }
      if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', start);
      } else {
        start();
      }
    </script>
  </body>
</html>
"""


def build_handler(report_dir: Path):
    class MonitorHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # pragma: no cover - thin wrapper
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            path = parsed.path
            qs = parse_qs(parsed.query or "")
            if path == "/":
                body = _render_homepage().encode("utf-8")
                self.send_response(200)
                # Prevent caching so UI always pulls the latest script/markup
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
                self.send_header("Pragma", "no-cache")
                self.send_header("Content-Type", "text/html; charset=utf-8")
                # Security hardening and to silence common browser warnings
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("X-Frame-Options", "DENY")
                self.send_header("Referrer-Policy", "no-referrer")
                self.send_header(
                    "Content-Security-Policy",
                    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
                )
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if path == "/api/data":
                # Optional ext trend window override
                try:
                    ext_window = None
                    if "ext_window" in qs:
                        vals = qs.get("ext_window") or []
                        if vals:
                            ext_window = int(vals[0])
                except Exception:
                    ext_window = None
                payload = _load_payload(report_dir)
                # Inject external trend with custom window if requested
                try:
                    if ext_window is not None and isinstance(payload, dict):
                        trend = _load_external_fill_trend(report_dir, window_minutes=max(1, int(ext_window)))
                        payload["external_fills_trend"] = trend
                except Exception:
                    pass
                body = json.dumps(payload).encode("utf-8")
                self.send_response(200)
                # Avoid caching JSON so the UI always sees fresh data
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
                self.send_header("Pragma", "no-cache")
                self.send_header("Content-Type", "application/json")
                self.send_header("X-Content-Type-Options", "nosniff")
                # Narrow CSP for data endpoint
                self.send_header("Content-Security-Policy", "default-src 'none'")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(body)
                return
            self.send_error(404, "Not Found")

        def log_message(self, format: str, *args: Any) -> None:  # pragma: no cover
            logger.debug("monitor web: " + format, *args)

    return MonitorHandler


class WebMonitor:
    """Helper to launch the monitoring HTTP server."""

    def __init__(self, port: int = 8888, report_dir: Optional[Path] = None, auto_open: bool = True) -> None:
        self.port = port
        default_dir = Path.cwd() / "reports"
        self.report_dir = report_dir if report_dir is not None else (default_dir if default_dir.exists() else Path.cwd())
        self.auto_open = auto_open
        self._server: Optional[HTTPServer] = None
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        handler = build_handler(self.report_dir)
        self._server = HTTPServer(("0.0.0.0", self.port), handler)
        logger.info("Monitoring dashboard available at http://localhost:%s", self.port)
        if self.auto_open:
            try:
                webbrowser.open(f"http://localhost:{self.port}")
            except Exception:
                logger.debug("failed to auto-open browser", exc_info=True)
        try:
            self._server.serve_forever()
        except KeyboardInterrupt:  # pragma: no cover
            logger.info("Stopping monitoring dashboard")
            self.stop()

    def start_background(self) -> None:
        handler = build_handler(self.report_dir)
        self._server = HTTPServer(("0.0.0.0", self.port), handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        logger.info("Monitoring dashboard running in background on port %s", self.port)
        if self.auto_open:
            try:
                webbrowser.open(f"http://localhost:{self.port}")
            except Exception:
                logger.debug("failed to auto-open browser", exc_info=True)

    def stop(self) -> None:
        if self._server:
            self._server.shutdown()
            self._server.server_close()
            self._server = None
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
            self._thread = None

    def is_running(self) -> bool:
        return bool(self._server)


__all__ = ["WebMonitor"]

try:  # Python 3.11+ exposes UTC constant
    from datetime import UTC  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover - backward compatibility
    UTC = timezone.utc  # type: ignore[assignment]







