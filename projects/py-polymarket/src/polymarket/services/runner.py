"""Trading service runner orchestrating the main bot loop."""

import asyncio
import csv
import time
import json
import logging
import math
from collections import deque
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Deque, Dict, List, Mapping, Optional, Sequence, Tuple

from config import settings, reload_settings
from polymarket.risk import RiskEngine
from polymarket.strategies.engine import StrategyEngine
from polymarket.strategies.exits import ExitDecision, get_evaluator as get_exit_evaluator
from polymarket.execution import ExecutionEngine, OrderLifecycleTracker, ExecutionReport
from polymarket.execution.fees import get_fee_manager
from polymarket.monitoring import AlertSystem
from polymarket.services.market_service import MarketDataService
from polymarket.services.order_store import OrderStore
from polymarket.utils.database import DatabaseManager
from polymarket.services.realized import append_realized as _append_realized_util, rebuild_realized_summary as _rebuild_realized_summary_util
from polymarket.services.limits import check_daily_kill_switch, per_market_daily_loss_guard
from polymarket.monitoring.trade_telemetry import record_fill as _record_fill
from polymarket.services.resolution_watcher import ResolutionWatcher
from polymarket.services.order_ws import OrderLifecycleStreamer
from polymarket.services.order_rest import OrderRestPoller

logger = logging.getLogger(__name__)

STATUS_PATH = Path("reports") / "pipeline_status.json"
OPEN_POSITIONS_PATH = Path("reports") / "open_positions.json"
REALIZED_EXITS_PATH = Path("reports") / "realized_exits.jsonl"
REALIZED_SUMMARY_PATH = Path("reports") / "realized_summary.json"
DECISIONS_PATH = Path("reports") / "decisions.jsonl"
ORDER_INTENTS_PATH = Path("reports") / "order_intents.json"
STAGE1_COOLDOWNS_PATH = Path("reports") / "stage1_cooldowns.json"
ORDER_INTENTS_LOG_PATH_DEFAULT = Path("reports") / "order_intents.csv"
RISK_AUDIT_PATH = Path("reports") / "risk_audit.jsonl"

# Exit policy and execution cost (sourced from settings)
EXIT_HOLDING_SECONDS = int(getattr(settings, "EXIT_HOLDING_SECONDS", 300))
EXIT_MIN_HOLD_SECONDS = int(getattr(settings, "EXIT_MIN_HOLD_SECONDS", 120))
EXIT_STOP_LOSS_PCT = float(getattr(settings, "EXIT_STOP_LOSS_PCT", 0.05))
EXIT_TAKE_PROFIT_PCT = float(getattr(settings, "EXIT_TAKE_PROFIT_PCT", 0.10))

# Execution cost assumptions (taker): fee + half-spread + risk premium
EDGE_RISK_PREMIUM = float(getattr(settings, "EDGE_RISK_PREMIUM", 0.005))
TIERED_TP_SL_ENABLED = bool(getattr(settings, "TP_SL_TIERED_ENABLED", False))
TIERED_TP_SL_SOFT_STOP_PCT = float(getattr(settings, "TP_SL_SOFT_STOP_PCT", EXIT_STOP_LOSS_PCT))
_tiered_hard_default = float(getattr(settings, "TP_SL_HARD_STOP_PCT", EXIT_STOP_LOSS_PCT))
TIERED_TP_SL_HARD_STOP_PCT = max(EXIT_STOP_LOSS_PCT, _tiered_hard_default)
TIERED_TP_SL_TRIM_RATIO = max(0.0, min(1.0, float(getattr(settings, "TP_SL_TRIM_RATIO", 0.5))))
TIERED_TP_SL_EXTENDED_MIN_HOLD = int(getattr(settings, "TP_SL_EXTENDED_MIN_HOLD_SECONDS", EXIT_MIN_HOLD_SECONDS))
STAGE1_COOLDOWN_SECONDS = max(0, int(getattr(settings, "TP_SL_STAGE1_COOLDOWN_SECONDS", 0)))
PER_MARKET_EXPOSURE_CAPS = getattr(settings, "PER_MARKET_EXPOSURE_CAPS", {}) or {}
TIME_STOP_MIN_SECONDS = max(0, int(getattr(settings.execution, "time_stop_min_seconds", 60)))
TIME_STOP_MAX_SECONDS = max(TIME_STOP_MIN_SECONDS, int(getattr(settings.execution, "time_stop_max_seconds", EXIT_HOLDING_SECONDS)))
BREAK_EVEN_TRIGGER_PCT = max(0.0, float(getattr(settings.execution, "breakeven_trigger_pct", 0.05)))

fee_manager = get_fee_manager()
try:
    SLIPPAGE_MODEL = str(getattr(settings.execution, "slippage_model", "taker")).lower()
except Exception:
    SLIPPAGE_MODEL = "taker"
TAKER_FEE = fee_manager.taker_fee
MAKER_FEE = fee_manager.maker_fee


def _taker_fee() -> float:
    return fee_manager.taker_fee


def _maker_fee() -> float:
    return fee_manager.maker_fee


def _active_fee_rate() -> float:
    return _maker_fee() if SLIPPAGE_MODEL.startswith("maker") else _taker_fee()


def _to_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _resolve_entry_price(action: str, row: Mapping[str, Any]) -> Tuple[Optional[float], Optional[str]]:
    """Return the inferred yes-price for the given action along with the source field."""
    action_side = (action or "").lower()
    bid = _to_float(row.get("bid")) if isinstance(row, Mapping) else None
    ask = _to_float(row.get("ask")) if isinstance(row, Mapping) else None
    mid = _to_float(row.get("mid_price")) if isinstance(row, Mapping) else None
    yes_price = _to_float(row.get("yes_price")) if isinstance(row, Mapping) else None

    if action_side == "yes":
        if ask is not None:
            return ask, "ask"
        if mid is not None:
            return mid, "mid"
        if yes_price is not None:
            return yes_price, "yes_price"
    elif action_side == "no":
        if bid is not None:
            return bid, "bid"
        if mid is not None:
            return mid, "mid"
        if yes_price is not None:
            return 1.0 - yes_price, "yes_complement"
    return None, None


def _entry_price_yes(action: str, row: Mapping[str, Any]) -> float:
    price, _ = _resolve_entry_price(action, row)
    if price is not None:
        return float(price)
    fallback_yes = _to_float(row.get("yes_price")) if isinstance(row, Mapping) else None
    if fallback_yes is not None:
        if str(action).lower() == "no":
            return float(1.0 - fallback_yes)
        return float(fallback_yes)
    return 0.5


def _cfg_get(obj: Any, key: str, default: Any = None) -> Any:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _exit_liquidity_info(action: str, market_row: Mapping[str, Any], price: float) -> Tuple[Optional[float], Optional[float]]:
    if not isinstance(market_row, Mapping):
        return None, None
    action_norm = (action or "").lower()
    field = "liquidity_yes" if action_norm == "yes" else "liquidity_no"
    liquidity_shares = _to_float(market_row.get(field))
    if liquidity_shares is None:
        liquidity_shares = _to_float(market_row.get("order_liquidity"))
    if liquidity_shares is None:
        liquidity_shares = _to_float(market_row.get("liquidity"))
    if liquidity_shares is None:
        return None, None
    price_val = float(price) if isinstance(price, (int, float)) else 0.0
    if price_val <= 0:
        return liquidity_shares, None
    return liquidity_shares, liquidity_shares * price_val


def _plan_liquidity_slices(
    total_notional: float,
    available_notional: Optional[float],
    config: Any,
) -> List[float]:
    if total_notional <= 0:
        return []
    enabled = bool(_cfg_get(config, "enabled", False))
    if not enabled:
        return [total_notional]
    min_liq_notional = float(_cfg_get(config, "min_liquidity_notional", 0.0))
    slice_notional = float(_cfg_get(config, "slice_notional", total_notional))
    min_slice_notional = float(_cfg_get(config, "min_slice_notional", 0.0))
    max_slices = max(1, int(_cfg_get(config, "max_slices", 1)))
    if slice_notional <= 0:
        slice_notional = total_notional
    if available_notional is not None and available_notional > 0:
        if available_notional >= min_liq_notional and total_notional <= available_notional:
            return [total_notional]
    slices: List[float] = []
    remaining = float(total_notional)
    slice_cap = max(slice_notional, min_slice_notional if min_slice_notional > 0 else 0.0)
    while remaining > 1e-9 and len(slices) < max_slices:
        chunk = min(slice_cap, remaining)
        if chunk < 1e-9:
            break
        slices.append(round(chunk, 6))
        remaining -= chunk
    if remaining > 1e-6:
        if slices:
            slices[-1] = round(slices[-1] + remaining, 6)
        else:
            slices.append(round(total_notional, 6))
    if not slices:
        slices.append(round(total_notional, 6))
    return slices


def _order_dedupe_log_path() -> Optional[Path]:
    try:
        persist = bool(getattr(settings, "ORDER_DEDUPE_PERSIST", False))
    except Exception:
        persist = False
    if not persist:
        return None
    try:
        raw_path = getattr(settings, "ORDER_DEDUPE_LOG_PATH", str(ORDER_INTENTS_LOG_PATH_DEFAULT))
    except Exception:
        raw_path = str(ORDER_INTENTS_LOG_PATH_DEFAULT)
    if not raw_path:
        return None
    path = Path(raw_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _execute_liquidity_aware_exit(
    exec_eng: ExecutionEngine,
    order_tracker: OrderLifecycleTracker,
    market_id: str,
    action: str,
    amount: float,
    market_snapshot: Mapping[str, Any],
    price_hint: float,
) -> Tuple[List[ExecutionReport], Dict[str, Any]]:
    cfg = getattr(settings.execution, "liquidity_exit", {})
    liquidity_shares, liquidity_notional = _exit_liquidity_info(action, market_snapshot, price_hint)
    slices = _plan_liquidity_slices(amount, liquidity_notional, cfg)
    reports: List[ExecutionReport] = []
    for slice_amount in slices:
        if slice_amount <= 0:
            continue
        report = exec_eng.execute_trade(
            market_id=market_id,
            action=action,
            amount=slice_amount,
            market_snapshot=market_snapshot,
        )
        order_tracker.register(report)
        reports.append(report)
    metadata = {
        "liquidity_shares": liquidity_shares,
        "liquidity_notional": liquidity_notional,
        "slice_plan": slices,
    }
    return reports, metadata


def _apply_depth_cap(order: Dict[str, Any], market_row: Mapping[str, Any], min_pos: float) -> bool:
    """Clamp order size by available orderbook depth. Returns True if order remains valid."""
    side = str(order.get("action", "")).lower()
    key = "depth_yes_notional" if side == "yes" else "depth_no_notional" if side == "no" else None
    if not key:
        return True
    depth = market_row.get(key)
    try:
        depth_float = float(depth)
    except (TypeError, ValueError):
        depth_float = None
    if depth_float is None or depth_float <= 0:
        return True
    if depth_float < min_pos - 1e-9:
        return False
    size = float(order.get("size", 0.0) or 0.0)
    clamped = min(size, depth_float)
    if clamped < min_pos - 1e-9:
        return False
    if clamped < size - 1e-9:
        order["size"] = round(clamped, 4)
        logger.info("[sizing] clamp by depth cap: available=%.2f -> size=%.4f", depth_float, order["size"])
    return True


def _check_side_exposure_limit(
    order: Mapping[str, Any],
    positions: Mapping[str, Any],
    ratio_limit: float,
) -> Tuple[bool, Dict[str, Any]]:
    """
    Determine whether an order breaches the side exposure ratio constraint.

    Returns (approved, context) where context captures the evaluated ratio,
    limit, and future yes/no notionals for logging/debugging.
    """
    try:
        limit = float(ratio_limit)
    except (TypeError, ValueError):
        limit = 0.0

    try:
        order_size = float(order.get("size", 0.0) or 0.0)
    except Exception:
        order_size = 0.0

    action_side = str(order.get("action", "")).lower()
    yes_total = 0.0
    no_total = 0.0

    iterable = positions.values() if isinstance(positions, Mapping) else positions or []
    for pos in iterable:
        if not isinstance(pos, Mapping):
            continue
        try:
            side = str(pos.get("side", "")).lower()
            notional = float(pos.get("notional", 0.0) or 0.0)
        except Exception:
            continue
        if side == "yes":
            yes_total += notional
        elif side == "no":
            no_total += notional

    future_yes = yes_total + (order_size if action_side == "yes" else 0.0)
    future_no = no_total + (order_size if action_side == "no" else 0.0)

    if action_side == "yes":
        denom = max(future_no, order_size)
        if denom <= 0:
            denom = 1.0
        ratio = future_yes / denom
    elif action_side == "no":
        denom = max(future_yes, order_size)
        if denom <= 0:
            denom = 1.0
        ratio = future_no / denom
    else:
        ratio = 0.0

    context = {
        "action_side": action_side,
        "ratio": float(ratio),
        "future_yes": float(future_yes),
        "future_no": float(future_no),
        "limit": float(limit),
    }

    if limit <= 0 or action_side not in {"yes", "no"}:
        context["disabled"] = True
        return True, context

    approved = ratio <= limit + 1e-9
    return approved, context


def _check_price_guard(
    order: Mapping[str, Any],
    market_row: Mapping[str, Any],
    guard_config: Optional[Mapping[str, Any]] = None,
) -> Tuple[bool, Dict[str, Any]]:
    """Validate that the order price does not deviate excessively from reference prices."""

    def _config_get(container: Any, key: str, default: Any = None) -> Any:
        if isinstance(container, Mapping):
            return container.get(key, default)
        return getattr(container, key, default)

    guard = guard_config
    if guard is None:
        try:
            guard = getattr(settings.execution, "price_guard", None)
        except Exception:
            guard = None

    enabled = bool(_config_get(guard, "enabled", True)) if guard is not None else True
    if not enabled:
        return True, {"disabled": True}

    action_side = str(order.get("action", "")).lower()
    if action_side not in {"yes", "no"}:
        return True, {"skipped": "non_directional"}

    price, price_source = _resolve_entry_price(action_side, market_row)
    if price is None:
        return True, {
            "skipped": "missing_entry_price",
            "action_side": action_side,
            "price_source": price_source,
        }

    top_price = _to_float(market_row.get("ask")) if action_side == "yes" else _to_float(market_row.get("bid"))
    last_trade = _to_float(market_row.get("last_trade_price"))
    if last_trade is None:
        last_trade = _to_float(market_row.get("lastPrice"))
    if last_trade is None:
        last_trade = _to_float(market_row.get("yes_price"))

    max_abs_top = _to_float(_config_get(guard, "max_abs_from_top", None)) if guard is not None else None
    max_abs_last = _to_float(_config_get(guard, "max_abs_from_last", None)) if guard is not None else None
    max_rel_pct_raw = _config_get(guard, "max_rel_pct", None) if guard is not None else None
    try:
        max_rel_pct = float(max_rel_pct_raw) if max_rel_pct_raw is not None else None
    except (TypeError, ValueError):
        max_rel_pct = None

    price_tick = 0.0
    try:
        rules = getattr(settings, "MARKET_RULES", {})
        if isinstance(rules, Mapping):
            price_tick = float(rules.get("price_tick", 0.0) or 0.0)
        else:
            price_tick = float(getattr(rules, "price_tick", 0.0) or 0.0)
    except Exception:
        price_tick = 0.0
    price_tick = max(0.0, price_tick)

    def _relative(dev: float, ref: Optional[float]) -> Optional[float]:
        if ref is None:
            return None
        denom = abs(ref) if abs(ref) > 1e-9 else None
        if denom is None:
            return None
        return dev / denom

    context: Dict[str, Any] = {
        "action_side": action_side,
        "order_price": float(price),
        "price_source": price_source,
        "top_price": top_price,
        "last_trade": last_trade,
        "max_abs_from_top": max_abs_top,
        "max_abs_from_last": max_abs_last,
        "max_rel_pct": max_rel_pct,
    }

    thresholds = []
    if top_price is not None:
        thresholds.append(("top", top_price, max_abs_top))
    if last_trade is not None:
        thresholds.append(("last", last_trade, max_abs_last))

    allowed_min = 0.0
    allowed_max = 1.0
    allowed_initialized = False

    def _commit_allowed_range() -> Tuple[Optional[float], Optional[float]]:
        if not allowed_initialized:
            return None, None
        amin = max(0.0, allowed_min)
        amax = min(1.0, allowed_max)
        if price_tick > 0:
            amin = max(0.0, math.floor(amin / price_tick) * price_tick)
            amax = min(1.0, math.ceil(amax / price_tick) * price_tick)
        context["allowed_range"] = {
            "min": amin,
            "max": amax,
            "tick": price_tick or None,
        }
        return amin, amax

    for ref_name, ref_price, abs_limit in thresholds:
        deviation = abs(price - ref_price)
        rel_dev = _relative(deviation, ref_price)
        context.setdefault("references", {})[ref_name] = {
            "reference_price": ref_price,
            "deviation": deviation,
            "relative_deviation": rel_dev,
        }

        abs_allowed = abs_limit if abs_limit is not None and abs_limit >= 0 else None
        rel_allowed = max_rel_pct if max_rel_pct is not None and max_rel_pct >= 0 else None

        limit_candidates = []
        if abs_allowed is not None:
            limit_candidates.append(abs_allowed)
        if rel_allowed is not None and ref_price is not None:
            limit_candidates.append(rel_allowed * abs(ref_price))

        if limit_candidates:
            effective_limit = min(limit_candidates)
            ref_min = ref_price - effective_limit
            ref_max = ref_price + effective_limit
            context["references"][ref_name]["limit"] = effective_limit
            context["references"][ref_name]["allowed_min"] = ref_min
            context["references"][ref_name]["allowed_max"] = ref_max
            if not allowed_initialized:
                allowed_min, allowed_max = ref_min, ref_max
                allowed_initialized = True
            else:
                allowed_min = max(allowed_min, ref_min)
                allowed_max = min(allowed_max, ref_max)

        if abs_allowed is not None and deviation > abs_allowed + 1e-9:
            context["breach"] = {
                "reference": ref_name,
                "reason": "abs",
                "deviation": deviation,
                "allowed": abs_allowed,
            }
            _commit_allowed_range()
            return False, context
        if rel_allowed is not None and rel_dev is not None and rel_dev > rel_allowed + 1e-9:
            context["breach"] = {
                "reference": ref_name,
                "reason": "rel",
                "deviation": rel_dev,
                "allowed": rel_allowed,
            }
            _commit_allowed_range()
            return False, context

    if allowed_initialized:
        amin, amax = _commit_allowed_range()
        if amin is not None and price < amin - 1e-9:
            context["breach"] = {
                "reference": "range",
                "reason": "below_min",
                "allowed_min": amin,
                "order_price": price,
            }
            return False, context
        if amax is not None and price > amax + 1e-9:
            context["breach"] = {
                "reference": "range",
                "reason": "above_max",
                "allowed_max": amax,
                "order_price": price,
            }
            return False, context

    return True, context


def _intent_key(market_id: Any, action: Any) -> Optional[str]:
    if market_id is None or action is None:
        return None
    market_str = str(market_id).strip()
    side = str(action).strip().lower()
    if not market_str or side not in {"yes", "no"}:
        return None
    return f"{market_str}::{side}"


def _market_key(market_id: Any) -> Optional[str]:
    if market_id is None:
        return None
    market_str = str(market_id).strip()
    if not market_str:
        return None
    return f"{market_str}::any"


def _parse_iso_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def _load_order_intents() -> List[Dict[str, Any]]:
    try:
        payload = json.loads(ORDER_INTENTS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        history = payload.get("history")
        if isinstance(history, list):
            return history
    return []


def _load_stage1_cooldowns() -> Dict[str, str]:
    try:
        payload = json.loads(STAGE1_COOLDOWNS_PATH.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            return {str(k): str(v) for k, v in payload.items()}
    except Exception:
        return {}
    return {}


def _save_stage1_cooldowns(mapping: Mapping[str, str]) -> None:
    try:
        STAGE1_COOLDOWNS_PATH.parent.mkdir(parents=True, exist_ok=True)
        STAGE1_COOLDOWNS_PATH.write_text(json.dumps(mapping, indent=2), encoding="utf-8")
    except Exception:
        logger.debug("Failed to persist stage1 cooldowns", exc_info=True)


def _prune_stage1_cooldowns(mapping: Dict[str, str], now_dt: datetime) -> bool:
    removed = False
    for market_id, expires in list(mapping.items()):
        expiry_dt = _parse_iso_dt(expires)
        if expiry_dt is None or expiry_dt <= now_dt:
            mapping.pop(market_id, None)
            removed = True
    return removed


def _save_order_intents(history: List[Dict[str, Any]]) -> None:
    try:
        ORDER_INTENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        ORDER_INTENTS_PATH.write_text(json.dumps(history, indent=2), encoding="utf-8")
    except Exception:
        logger.debug("Failed to persist order intents", exc_info=True)


def _build_intent_index(history: List[Dict[str, Any]]) -> Dict[str, str]:
    index: Dict[str, str] = {}
    for rec in history:
        key = _intent_key(rec.get("market_id"), rec.get("action"))
        ts = rec.get("timestamp")
        if key and isinstance(ts, str):
            index[key] = ts
        market_key = _market_key(rec.get("market_id"))
        if market_key and isinstance(ts, str):
            prev = index.get(market_key)
            if prev is None or ts >= prev:
                index[market_key] = ts
    return index


def _prune_order_intents(
    history: List[Dict[str, Any]],
    window_seconds: int,
    max_entries: int,
    now_ts: datetime,
) -> Dict[str, str]:
    cutoff: Optional[datetime] = None
    if window_seconds and window_seconds > 0:
        # retain a cushion of recent intents beyond the strict window for auditing
        cutoff = now_ts - timedelta(seconds=max(window_seconds * 2, window_seconds))
    filtered: List[Dict[str, Any]] = []
    for rec in history:
        ts = _parse_iso_dt(rec.get("timestamp"))
        if ts is None:
            continue
        if cutoff and ts < cutoff:
            continue
        filtered.append(rec)
    if max_entries and max_entries > 0 and len(filtered) > max_entries:
        filtered = filtered[-max_entries:]
    history[:] = filtered
    return _build_intent_index(history)


def _record_order_intent(
    history: List[Dict[str, Any]],
    market_id: Any,
    action: Any,
    size: float,
    now_ts: datetime,
    window_seconds: int,
    max_entries: int,
    extra: Optional[Mapping[str, Any]] = None,
) -> Dict[str, str]:
    key = _intent_key(market_id, action)
    if not key:
        return _build_intent_index(history)
    try:
        sz = float(size)
    except Exception:
        sz = 0.0
    record = {
        "market_id": str(market_id),
        "action": str(action).lower(),
        "timestamp": now_ts.isoformat(),
        "size": sz,
    }
    if extra and isinstance(extra, Mapping):
        for k, v in extra.items():
            if k in record:
                continue
            try:
                json.dumps(v)
            except (TypeError, ValueError):
                continue
            record[k] = v
    history.append(record)
    index = _prune_order_intents(history, window_seconds, max_entries, now_ts)
    index[key] = record["timestamp"]
    market_key = _market_key(market_id)
    if market_key:
        index[market_key] = record["timestamp"]
    _save_order_intents(history)
    log_path = _order_dedupe_log_path()
    if log_path is not None:
        try:
            log_path.parent.mkdir(parents=True, exist_ok=True)
            is_new = not log_path.exists()
            with log_path.open("a", encoding="utf-8", newline="") as handle:
                writer = csv.writer(handle)
                if is_new:
                    writer.writerow(["timestamp", "market_id", "action", "size"])
                writer.writerow([record["timestamp"], record["market_id"], record["action"], f"{sz:.6f}"])
        except Exception:
            logger.debug("Failed to append order intent log", exc_info=True)
    return index


def _last_order_intent(
    history: Sequence[Mapping[str, Any]],
    market_id: Any,
    action: Any,
) -> Optional[Mapping[str, Any]]:
    target_mid = str(market_id).strip().lower() if market_id is not None else ""
    target_side = str(action).strip().lower() if action is not None else ""
    if not target_mid or target_side not in {"yes", "no"}:
        return None
    for rec in reversed(history):
        mid = str(rec.get("market_id", "")).strip().lower()
        side = str(rec.get("action", "")).strip().lower()
        if mid == target_mid and side == target_side:
            return rec
    return None


def _get_order_dedupe_config() -> Tuple[int, int]:
    try:
        dedupe_ns = getattr(settings.execution, "order_dedupe", None)
    except Exception:
        dedupe_ns = None
    if dedupe_ns is None:
        return 0, 0
    try:
        window = int(getattr(dedupe_ns, "window_seconds", 0))
    except Exception:
        window = 0
    try:
        max_entries = int(getattr(dedupe_ns, "max_entries", 0))
    except Exception:
        max_entries = 0
    return max(0, window), max(0, max_entries)


def _get_order_dedupe_tolerances() -> Tuple[float, float]:
    try:
        dedupe_ns = getattr(settings.execution, "order_dedupe", None)
    except Exception:
        dedupe_ns = None
    size_tol = 0.0
    ratio_tol = 0.0
    if dedupe_ns is None:
        return size_tol, ratio_tol
    try:
        size_tol = float(getattr(dedupe_ns, "size_tolerance", 0.0) or 0.0)
    except Exception:
        size_tol = 0.0
    try:
        ratio_tol = float(getattr(dedupe_ns, "size_ratio_tolerance", 0.0) or 0.0)
    except Exception:
        ratio_tol = 0.0
    return max(0.0, size_tol), max(0.0, ratio_tol)


def _get_order_frequency_config() -> Tuple[bool, int, int]:
    try:
        freq_cfg = getattr(settings, "TRADING_ORDER_FREQUENCY", None)
    except Exception:
        freq_cfg = None
    if not isinstance(freq_cfg, Mapping):
        try:
            freq_cfg = getattr(settings.trading, "order_frequency", None)
        except Exception:
            freq_cfg = None
    if not isinstance(freq_cfg, Mapping):
        return False, 0, 0
    try:
        enabled = bool(freq_cfg.get("enabled", False))
    except Exception:
        enabled = False
    try:
        max_orders = int(freq_cfg.get("max_orders", 0) or 0)
    except Exception:
        max_orders = 0
    try:
        interval_seconds = int(freq_cfg.get("interval_seconds", 0) or 0)
    except Exception:
        interval_seconds = 0
    return enabled, max(0, max_orders), max(0, interval_seconds)


def _get_strategy_frequency_configs() -> Dict[str, Dict[str, Any]]:
    """Return per-strategy frequency configs.

    Structure:
      {
        name: {
          "max_orders": int,
          "interval_seconds": int,
          "per_market": Optional[{"max_orders": int, "interval_seconds": int}] | True
        }
      }
    """
    cfg_obj: Optional[Mapping[str, Any]] = None
    try:
        cfg_obj = getattr(settings, "TRADING_STRATEGY_ORDER_FREQUENCY", None)
    except Exception:
        cfg_obj = None
    if not isinstance(cfg_obj, Mapping):
        try:
            cfg_obj = getattr(settings.trading, "strategy_order_frequency", None)
        except Exception:
            cfg_obj = None
    if not isinstance(cfg_obj, Mapping):
        return {}
    result: Dict[str, Dict[str, Any]] = {}
    for key, val in cfg_obj.items():
        try:
            name = str(key).strip()
            if not name:
                continue
            if not isinstance(val, Mapping):
                continue
            max_orders = int(val.get("max_orders", 0) or 0)
            interval = int(val.get("interval_seconds", 0) or 0)
            item: Dict[str, Any] = {}
            if max_orders > 0 and interval > 0:
                item.update({"max_orders": max_orders, "interval_seconds": interval})
            per_mkt = val.get("per_market")
            if isinstance(per_mkt, Mapping):
                pm_max = int(per_mkt.get("max_orders", 0) or 0)
                pm_int = int(per_mkt.get("interval_seconds", 0) or 0)
                if pm_max > 0 and pm_int > 0:
                    item["per_market"] = {"max_orders": pm_max, "interval_seconds": pm_int}
            elif per_mkt:
                # truthy: reuse top-level limits
                if max_orders > 0 and interval > 0:
                    item["per_market"] = {"max_orders": max_orders, "interval_seconds": interval}
            # Per-side (yes/no) frequency caps
            per_side = val.get("per_side")
            if isinstance(per_side, Mapping):
                ps_max = int(per_side.get("max_orders", 0) or 0)
                ps_int = int(per_side.get("interval_seconds", 0) or 0)
                if ps_max > 0 and ps_int > 0:
                    item["per_side"] = {"max_orders": ps_max, "interval_seconds": ps_int}
            elif per_side:
                if max_orders > 0 and interval > 0:
                    item["per_side"] = {"max_orders": max_orders, "interval_seconds": interval}
            # Per-market × side caps
            per_market_side = val.get("per_market_side")
            if isinstance(per_market_side, Mapping):
                pms_max = int(per_market_side.get("max_orders", 0) or 0)
                pms_int = int(per_market_side.get("interval_seconds", 0) or 0)
                if pms_max > 0 and pms_int > 0:
                    item["per_market_side"] = {"max_orders": pms_max, "interval_seconds": pms_int}
            elif per_market_side:
                if "per_market" in item:
                    item["per_market_side"] = dict(item["per_market"])
            if item:
                result[name] = item
        except Exception:
            continue
    return result

def evaluate_strategy_exit_decisions(
    position: Dict[str, Any],
    market_row: Dict[str, Any],
    now: datetime,
) -> Dict[str, Any]:
    """
    Evaluate strategy-specific exit decisions for a position.

    Returns a dictionary with keys:
        close: Optional[Dict]  -> prioritized close decision payload
        holds: List[Dict]      -> hold directives still in effect
        decisions: List[Dict]  -> all evaluated decisions
    """
    strategy_states = position.get("strategy_states") or {}
    results: List[Dict[str, Any]] = []
    close_choice: Optional[Dict[str, Any]] = None
    hold_payloads: List[Dict[str, Any]] = []

    for name, container in strategy_states.items():
        evaluator = get_exit_evaluator(name)
        if not evaluator:
            continue
        entry_state = container.get("entry")
        if not isinstance(entry_state, dict):
            entry_state = {}
        try:
            decision = evaluator.evaluate(entry_state, position, market_row)
        except Exception:
            logger.debug("Strategy exit evaluator failed for %s", name, exc_info=True)
            continue
        # persist potential mutations
        container["entry"] = entry_state
        if not decision:
            continue
        payload = {
            "strategy": name,
            "exclusive": bool(container.get("exclusive")),
            "decision": decision,
        }
        results.append(payload)
        if decision.action == "close":
            priority = 2 if payload["exclusive"] else 1
            existing_priority = close_choice.get("priority", -1) if close_choice else -1
            if priority > existing_priority:
                close_choice = dict(payload)
                close_choice["priority"] = priority
        elif decision.action == "hold":
            if _strategy_hold_active(decision, position, now):
                hold_payloads.append(payload)

    return {
        "close": close_choice,
        "holds": hold_payloads,
        "decisions": results,
    }


def _strategy_hold_active(decision: ExitDecision, position: Mapping[str, Any], now: datetime) -> bool:
    """Determine whether a hold directive is still active."""
    metadata = decision.metadata or {}
    # explicit flag to always hold (used for hold_to_resolution)
    if metadata.get("hold_to_resolution"):
        return True
    remaining = metadata.get("remaining_seconds")
    if isinstance(remaining, (int, float)):
        return remaining > 0

    hold_seconds = metadata.get("hold_seconds")
    if isinstance(hold_seconds, (int, float)) and hold_seconds > 0:
        opened_at = position.get("opened_at")
        if opened_at:
            try:
                opened = datetime.fromisoformat(str(opened_at).replace("Z", "+00:00"))
            except Exception:
                opened = None
            if opened:
                elapsed = (now - opened).total_seconds()
                return elapsed < hold_seconds
    hold_until = metadata.get("hold_until")
    if hold_until:
        try:
            if isinstance(hold_until, (int, float)):
                target = datetime.fromtimestamp(float(hold_until), tz=timezone.utc)
            else:
                target = datetime.fromisoformat(str(hold_until).replace("Z", "+00:00"))
            return now < target
        except Exception:
            return False
    # if no metadata provided default to hold for this evaluation
    return True


def get_portfolio_state(db: DatabaseManager) -> Dict:
    """Return a lightweight snapshot of the current portfolio state."""
    return {
        "returns": db.query_returns_history(days=30),
        "balance": db.get_current_balance(),
        "positions": db.get_open_positions(),
    }


async def main_loop(sleep_interval: int = 60) -> None:
    """Main async loop for periodic market processing."""
    market_service = MarketDataService()
    db = DatabaseManager()
    risk = RiskEngine()
    strategy_engine = StrategyEngine(settings.strategies)
    alerts = AlertSystem()
    exec_eng = ExecutionEngine()
    order_tracker = OrderLifecycleTracker()
    res_watcher = ResolutionWatcher(interval_seconds=max(30, sleep_interval))
    order_store = OrderStore()
    order_ws = OrderLifecycleStreamer()
    order_ws_started = False
    order_rest = OrderRestPoller()
    order_rest_started = False
    # Track last processed external trade timestamp to apply delta updates into positions
    last_ext_trades_dt: Optional[datetime] = datetime.now(timezone.utc)
    ext_processed = 0
    ext_opened = 0
    ext_applied = 0
    ext_reduced = 0
    ext_closed = 0
    last_ext_seen_iso: Optional[str] = None
    io_errors: Dict[str, int] = {}
    risk_counts: Dict[str, Any] = {"approved": 0, "rejected": 0, "reasons": {}}
    strategy_risk_counts: Dict[str, Dict[str, int]] = {}

    # determine runtime mode
    try:
        dry_run_flag = getattr(settings, "DRY_RUN", None)
        if dry_run_flag is None:
            dry_run_flag = getattr(settings.trading, "dry_run", False)
        dry_run = bool(dry_run_flag)
    except Exception:
        dry_run = False
    runtime_mode = "offline" if settings.OFFLINE_MODE else ("dry-run" if dry_run else "online")
    logger.info("=== Polymarket system started (%s mode) ===", runtime_mode)

    def _persist_trade_reports(
        reports: Sequence[ExecutionReport],
        *,
        event: str,
        market_id: str,
        side: str,
        strategies: Optional[Sequence[str]] = None,
        reason: Optional[str] = None,
        context: Optional[Mapping[str, Any]] = None,
    ) -> None:
        if not reports:
            return
        try:
            for report_item in reports:
                try:
                    filled_notional = float(report_item.filled_notional or 0.0)
                    filled_shares = float(report_item.filled_shares or 0.0)
                except Exception:
                    continue
                if filled_notional <= 0.0 and filled_shares <= 0.0:
                    continue
                payload: Dict[str, Any] = {
                    "timestamp": getattr(report_item, "timestamp", datetime.now(timezone.utc).isoformat()),
                    "event": event,
                    "order_id": report_item.order_id,
                    "market_id": report_item.market_id or market_id,
                    "side": report_item.action or side,
                    "requested_notional": report_item.requested_notional,
                    "requested_shares": report_item.requested_shares,
                    "filled_notional": filled_notional,
                    "filled_shares": filled_shares,
                    "average_price": report_item.average_price,
                    "fees": report_item.fees,
                    "status": report_item.status,
                    "execution_mode": report_item.execution_mode,
                    "runtime_mode": runtime_mode,
                }
                if strategies:
                    payload["strategies"] = list(strategies)
                if reason:
                    payload["reason"] = reason
                if context:
                    payload["context"] = context
                metadata = getattr(report_item, "metadata", None)
                if metadata:
                    try:
                        payload["execution_metadata"] = dict(metadata)
                    except Exception:
                        payload["execution_metadata"] = metadata
                order_store.append_trade(payload)
                try:
                    db.insert_trade_event(payload)
                except Exception:
                    pass
        except Exception:
            logger.debug("Failed to append trade records", exc_info=True)
            try:
                io_errors["trades"] = int(io_errors.get("trades", 0)) + 1
            except Exception:
                pass

    def _record_reject(
        *,
        reason: str,
        market_id: Optional[str],
        action: Optional[str],
        size: Optional[float],
        metadata: Optional[Mapping[str, Any]] = None,
    ) -> None:
        try:
            payload: Dict[str, Any] = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event": "reject",
                "market_id": market_id,
                "action": action,
                "size": size,
                "reason": reason,
                "runtime_mode": runtime_mode,
            }
            if metadata:
                try:
                    payload["metadata"] = dict(metadata)
                except Exception:
                    payload["metadata"] = metadata
            order_store.append_order(payload)
            try:
                db.insert_order_event(payload)
            except Exception:
                pass
        except Exception:
            logger.debug("Failed to append order rejection", exc_info=True)
            try:
                io_errors["orders"] = int(io_errors.get("orders", 0)) + 1
            except Exception:
                pass

    def _store_preview(limit: int = 3) -> Dict[str, Any]:
        preview: Dict[str, Any] = {"orders": None, "trades": None}
        try:
            recent_orders = list(order_store.iter_orders(limit=limit))
            if recent_orders:
                compact_orders = []
                for rec in recent_orders:
                    compact_orders.append(
                        {
                            "timestamp": rec.get("timestamp"),
                            "market_id": rec.get("market_id"),
                            "action": rec.get("action"),
                            "size": rec.get("size"),
                            "runtime_mode": rec.get("runtime_mode"),
                        }
                    )
                preview["orders"] = compact_orders
        except Exception:
            logger.debug("Failed to build order preview", exc_info=True)
        try:
            recent_trades = list(order_store.iter_trades(limit=limit))
            if recent_trades:
                compact_trades = []
                for rec in recent_trades:
                    compact_trades.append(
                        {
                            "timestamp": rec.get("timestamp"),
                            "order_id": rec.get("order_id"),
                            "market_id": rec.get("market_id"),
                            "side": rec.get("side"),
                            "filled_notional": rec.get("filled_notional"),
                            "filled_shares": rec.get("filled_shares"),
                            "status": rec.get("status"),
                            "execution_mode": rec.get("execution_mode"),
                            "reason": rec.get("reason"),
                        }
                    )
                preview["trades"] = compact_trades
        except Exception:
            logger.debug("Failed to build trade preview", exc_info=True)
        return preview

    # helpers for open positions persistence
    def _load_positions():
        try:
            return json.loads(OPEN_POSITIONS_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _save_positions(positions) -> None:
        try:
            OPEN_POSITIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
            OPEN_POSITIONS_PATH.write_text(json.dumps(positions, indent=2), encoding="utf-8")
        except Exception:
            logger.debug("Failed to write open positions", exc_info=True)
            try:
                io_errors["positions"] = int(io_errors.get("positions", 0)) + 1
            except Exception:
                pass

    def _current_mid(row: dict) -> float:
        bid = row.get("bid")
        ask = row.get("ask")
        mid = row.get("mid_price")
        if bid is not None and ask is not None:
            return (float(bid) + float(ask)) / 2.0
        if mid is not None:
            return float(mid)
        yes = row.get("yes_price")
        return float(yes) if yes is not None else 0.5

    def _mark_yes_for_exit(side: str, row: dict) -> float:
        """Return yes-price mark for exit at taker: yes exits at bid; no exits at ask."""
        bid = row.get("bid")
        ask = row.get("ask")
        mid = _current_mid(row)
        if side == "yes":
            return float(bid) if bid is not None else mid
        return float(ask) if ask is not None else mid

    positions = _load_positions()
    order_intents = _load_order_intents()
    intent_window_seconds, intent_max_entries = _get_order_dedupe_config()
    size_tolerance, size_ratio_tolerance = _get_order_dedupe_tolerances()
    order_intents_index = _prune_order_intents(order_intents, intent_window_seconds, intent_max_entries, datetime.now(timezone.utc))
    stage1_cooldowns = _load_stage1_cooldowns()
    freq_enabled, freq_max_orders, freq_interval = _get_order_frequency_config()
    per_strategy_freq_cfg: Dict[str, Dict[str, int]] = _get_strategy_frequency_configs()
    order_frequency_window: Deque[datetime] = deque()
    strategy_frequency_windows: Dict[str, Deque[datetime]] = {}
    strategy_market_frequency_windows: Dict[Tuple[str, str], Deque[datetime]] = {}
    strategy_side_frequency_windows: Dict[Tuple[str, str], Deque[datetime]] = {}
    strategy_market_side_frequency_windows: Dict[Tuple[str, str, str], Deque[datetime]] = {}

    # realized PnL persistence helpers
    def _append_realized(exit_record: Dict) -> None:
        try:
            _append_realized_util(exit_record)
            try:
                db.insert_realized_exit(exit_record)
            except Exception:
                pass
        except Exception:
            logger.debug("Failed to append realized exit", exc_info=True)

    def _rebuild_realized_summary() -> None:
        try:
            _rebuild_realized_summary_util()
        except Exception:
            logger.debug("Failed to rebuild realized summary (outer)", exc_info=True)

    def _append_decision(rec: Dict) -> None:
        try:
            DECISIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
            with DECISIONS_PATH.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(rec) + "\n")
        except Exception:
            logger.debug("Failed to append decision", exc_info=True)

    last_reload = time.monotonic()
    while True:
        try:
            # Stop-file guard
            try:
                stop_file = Path(str(getattr(settings, "STOP_FILE", "reports/STOP")))
                if stop_file.exists():
                    logger.warning("Stop-file detected at %s; halting main loop", stop_file)
                    break
            except Exception:
                pass

            # Optional live config reload
            try:
                reload_secs = int(getattr(settings, "CONFIG_RELOAD_SECONDS", 0))
            except Exception:
                reload_secs = 0
            if reload_secs > 0 and (time.monotonic() - last_reload) >= reload_secs:
                try:
                    reload_settings()
                    last_reload = time.monotonic()
                    logger.info("Configuration reloaded")
                    intent_window_seconds, intent_max_entries = _get_order_dedupe_config()
                    size_tolerance, size_ratio_tolerance = _get_order_dedupe_tolerances()
                    freq_enabled, freq_max_orders, freq_interval = _get_order_frequency_config()
                    per_strategy_freq_cfg = _get_strategy_frequency_configs()
                    order_intents_index = _prune_order_intents(
                        order_intents,
                        intent_window_seconds,
                        intent_max_entries,
                        datetime.now(timezone.utc),
                    )
                except Exception:
                    logger.debug("Live reload failed", exc_info=True)
            else:
                # Keep intents store tidy even without reloads
                intent_window_seconds, intent_max_entries = _get_order_dedupe_config()
                size_tolerance, size_ratio_tolerance = _get_order_dedupe_tolerances()
                freq_enabled, freq_max_orders, freq_interval = _get_order_frequency_config()
                per_strategy_freq_cfg = _get_strategy_frequency_configs()
                order_intents_index = _prune_order_intents(
                    order_intents,
                    intent_window_seconds,
                    intent_max_entries,
                    datetime.now(timezone.utc),
                )
            if freq_enabled and freq_interval > 0:
                freq_now = datetime.now(timezone.utc)
                while order_frequency_window and (freq_now - order_frequency_window[0]).total_seconds() > freq_interval:
                    order_frequency_window.popleft()
            logger.info("Fetching market data ...")
            t0 = time.monotonic()
            snapshots = await market_service.get_snapshots(
                force_refresh=settings.OFFLINE_MODE
            )
            t_fetch = (time.monotonic() - t0) * 1000.0
            markets = [snap.raw for snap in snapshots]
            logger.info("Fetched %s markets", len(markets))

            if settings.OFFLINE_MODE:
                if not markets:
                    logger.warning("Offline mode: no market data returned")
                break

            if not markets:
                logger.warning("No market data returned")
                alerts.send_alert("No market data returned")
                await asyncio.sleep(sleep_interval)
                continue

            fetch_info = market_service.last_fetch_info()
            # Maintain order lifecycle WS subscriptions and surface status in fetch_info
            try:
                ids = [snap.market_id for snap in snapshots]
                if getattr(settings, "SERVICE_USE_ORDER_WS", False):
                    if not order_ws_started:
                        await order_ws.start(ids)
                        order_ws_started = True
                    else:
                        await order_ws.update_markets(ids)
                # Add current WS status snapshot for monitor/diagnostics
                if isinstance(fetch_info, dict):
                    fetch_info["orders_ws"] = order_ws.get_status()
            except Exception:
                logger.debug("Failed to update/order-ws status", exc_info=True)

            # Decide on REST fallback polling based on WS health
            try:
                ws_state = (fetch_info or {}).get("orders_ws", {}) if isinstance(fetch_info, dict) else {}
                ws_status = str(ws_state.get("status") or "disabled").lower()
                need_rest = bool(getattr(settings, "SERVICE_USE_ORDER_REST_FALLBACK", True)) and ws_status != "healthy"
                if need_rest:
                    if not order_rest_started:
                        await order_rest.start(ids)
                        order_rest_started = True
                    else:
                        await order_rest.update_markets(ids)
                else:
                    if order_rest_started:
                        await order_rest.stop()
                        order_rest_started = False
            except Exception:
                logger.debug("Failed to manage order REST fallback", exc_info=True)
            # Surface REST fallback status for monitor
            try:
                if isinstance(fetch_info, dict):
                    # Prefer structured status from poller
                    try:
                        fetch_info["orders_rest"] = order_rest.get_status()
                    except Exception:
                        fetch_info["orders_rest"] = {
                            "running": bool(order_rest_started),
                            "interval_seconds": int(getattr(settings, "ORDER_REST_POLL_SECONDS", 15)),
                            "limit": int(getattr(settings, "ORDER_REST_POLL_LIMIT", 100)),
                        }
            except Exception:
                pass
            try:
                meta = market_service.cache_metadata()
                if meta:
                    cache_info = {
                        "count": int(meta.get("count", 0)),
                        "age_s": float(meta.get("age_s", 0.0)),
                        "ttl": float(meta.get("ttl", 0.0)),
                    }
                    if meta.get("ws_idle_s") is not None:
                        cache_info["ws_idle_s"] = float(meta["ws_idle_s"])
                    if isinstance(fetch_info, dict):
                        existing_cache = fetch_info.get("cache") or {}
                        existing_cache.update(cache_info)
                        fetch_info["cache"] = existing_cache
            except Exception:
                pass
            # Global flags based on ingest health and validation coverage
            flags = {"fallback_halt": False, "low_validation": False}
            validation_cov = None
            try:
                if isinstance(fetch_info, dict) and fetch_info.get("fallback") and bool(getattr(settings, "STRATEGY_HALT_ON_FALLBACK", False)):
                    flags["fallback_halt"] = True
                vd = fetch_info.get("validation") if isinstance(fetch_info, dict) else None
                total = float((vd or {}).get("total", 0))
                valid = float((vd or {}).get("valid", 0))
                if total > 0:
                    validation_cov = (valid / total) * 100.0
                    min_cov = float(getattr(settings, "STRATEGY_MIN_VALIDATION_COVERAGE", 0.0))
                    if validation_cov < min_cov:
                        flags["low_validation"] = True
            except Exception:
                pass

            # Adaptive sleep recommendation based on ingest health
            try:
                next_sleep = sleep_interval
                if flags.get("fallback_halt") or flags.get("low_validation"):
                    next_sleep = min(300, max(sleep_interval, sleep_interval * 2))
            except Exception:
                next_sleep = sleep_interval
            # Simple health alerts
            try:
                if fetch_info.get("fallback") and not settings.OFFLINE_MODE:
                    logger.warning("Market ingest fallback triggered (%s)", fetch_info.get("reason"))
                    alerts.send_alert("Market ingest fallback triggered", metadata=fetch_info)
                ws_state = (fetch_info or {}).get("ws_status", {}) if isinstance(fetch_info, dict) else {}
                if isinstance(ws_state, dict):
                    failures = int(ws_state.get("failures", 0) or 0)
                    status = str(ws_state.get("status") or "")
                    if failures >= 3 or status in {"stopped", "restarting"}:
                        alerts.send_alert(
                            "WebSocket connectivity degraded",
                            metadata={"failures": failures, "status": status},
                        )
                rest_metrics = (fetch_info or {}).get("rest_metrics", {}) if isinstance(fetch_info, dict) else {}
                if isinstance(rest_metrics, dict):
                    too_slow = False
                    lat = rest_metrics.get("latency_ms") or {}
                    try:
                        avg_ms = float(lat.get("avg", 0.0))
                        too_slow = avg_ms > 2000.0
                    except Exception:
                        pass
                    if int(rest_metrics.get("429s", 0) or 0) > 0 or too_slow:
                        alerts.send_alert(
                            "REST ingest degraded",
                            metadata={"metrics": rest_metrics},
                        )
            except Exception:
                pass

            db.batch_insert(market_service.as_records(snapshots))

            loop_stats = {"processed": 0, "approved": 0, "rejected": 0}
            reject_reasons: Dict[str, int] = {}
            hold_reasons: Dict[str, int] = {}
            strategy_hold_summary: Dict[str, int] = {}
            strategy_reject_summary: Dict[str, int] = {}
            portfolio_state = get_portfolio_state(db)
            pending_exposure_total = 0.0
            strategy_engine.update_runtime_balance(portfolio_state.get("balance"))
            snapshot_map = {s.market_id: s for s in snapshots}
            loop_now = datetime.now(timezone.utc)
            if _prune_stage1_cooldowns(stage1_cooldowns, loop_now):
                _save_stage1_cooldowns(stage1_cooldowns)

            # 0) Resolution handling: realize PnL for resolved markets
            try:
                open_mids = list(positions.keys())
                if open_mids:
                    events = await res_watcher.poll_once(open_mids)
                else:
                    events = []
                to_close_resolved = []
                for ev in events:
                    if not ev.resolved:
                        continue
                    pos = positions.get(ev.market_id)
                    if not pos:
                        continue
                    winning = (ev.winning_outcome or "").lower()
                    if winning not in {"yes", "no"}:
                        # Unknown winner; skip until we can confirm
                        continue
                    side = str(pos.get("side"))
                    entry_yes = float(pos.get("entry_yes", 0.0)) or 0.0
                    shares = float(pos.get("shares", 0.0)) or 0.0
                    notional = float(pos.get("notional", 0.0)) or 0.0
                    exit_yes = 1.0 if winning == "yes" else 0.0
                    if side == "yes":
                        pnl = shares * (exit_yes - entry_yes)
                    else:
                        pnl = shares * (entry_yes - exit_yes)
                    pnl_pct = pnl / max(1e-9, notional)
                    try:
                        fees_total = notional * _active_fee_rate()
                        exit_record = {
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "market_id": ev.market_id,
                            "side": side,
                            "reason": "resolution",
                            "notional": round(notional, 4),
                            "shares": round(shares, 6),
                            "entry_yes": round(entry_yes, 6),
                            "exit_yes": round(exit_yes, 6),
                            "pnl": round(pnl, 6),
                            "pnl_pct": round(pnl_pct, 6),
                            "resolved_winner": winning,
                            "fees": round(fees_total, 6),
                            "pnl_after_fees": round(pnl - fees_total, 6),
                        }
                        _append_realized(exit_record)
                    except Exception:
                        logger.debug("Failed to append resolution exit record", exc_info=True)
                    to_close_resolved.append(ev.market_id)
                for mid in to_close_resolved:
                    positions.pop(mid, None)
                if to_close_resolved:
                    _save_positions(positions)
            except Exception:
                logger.debug("Resolution handling failed", exc_info=True)

            # Evaluate daily kill-switch once per loop
            ks = None
            daily_enabled = True
            reset_hour = 0
            recovery_ratio = 1.0
            try:
                init_bal = float(getattr(settings.trading, "initial_balance", 10_000))
            except Exception:
                init_bal = 10_000.0
            try:
                limit_pct = float(getattr(settings.trading, "daily_loss_limit_pct", 0.0))
            except Exception:
                limit_pct = 0.0
            try:
                limit_usd = float(getattr(settings.trading, "daily_loss_limit_usd", 0.0))
            except Exception:
                limit_usd = 0.0
            try:
                cooldown_minutes = float(getattr(settings.trading, "daily_loss_cooldown_minutes", 0.0))
            except Exception:
                cooldown_minutes = 0.0
            try:
                recovery_ratio = float(getattr(settings.trading, "daily_loss_recovery_ratio", 1.0))
            except Exception:
                recovery_ratio = 1.0
            recovery_ratio = max(0.0, min(1.0, recovery_ratio))
            try:
                daily_enabled = bool(getattr(settings.trading, "daily_loss_enabled", True))
            except Exception:
                daily_enabled = True
            try:
                reset_hour = int(getattr(settings.trading, "daily_loss_reset_hour", 0))
            except Exception:
                reset_hour = 0
            try:
                ks = check_daily_kill_switch(
                    initial_balance=init_bal,
                    limit_pct=limit_pct,
                    limit_usd=limit_usd,
                    cooldown_minutes=cooldown_minutes,
                    enabled=daily_enabled,
                    reset_hour=reset_hour,
                )
            except Exception:
                ks = None

            # Optional per-market daily loss guard (blocks specific markets for the day)
            per_market_blocked: set[str] = set()
            per_market_pnl: dict[str, float] = {}
            per_market_threshold: float = float("inf")
            try:
                pm_enabled = bool(getattr(settings.trading, "per_market_daily_loss_enabled", False))
            except Exception:
                pm_enabled = False
            if pm_enabled:
                try:
                    pm_limit_pct = float(getattr(settings.trading, "per_market_daily_loss_limit_pct", 0.0) or 0.0)
                except Exception:
                    pm_limit_pct = 0.0
                try:
                    pm_limit_usd = float(getattr(settings.trading, "per_market_daily_loss_limit_usd", 0.0) or 0.0)
                except Exception:
                    pm_limit_usd = 0.0
                try:
                    blocked, pnl_map, threshold = per_market_daily_loss_guard(
                        initial_balance=init_bal,
                        limit_pct=pm_limit_pct,
                        limit_usd=pm_limit_usd,
                        enabled=True,
                        reset_hour=reset_hour,
                    )
                    per_market_blocked = set(blocked)
                    per_market_pnl = dict(pnl_map)
                    per_market_threshold = float(threshold)
                except Exception:
                    per_market_blocked = set()

            orders_submitted = 0
            risk_reports: List[Dict[str, Any]] = []
            max_per_loop = int(getattr(settings.trading, "max_orders_per_loop", 10))
            t1 = time.monotonic()
            # risk-level gating helper
            def _risk_rank(level: str) -> int:
                m = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}
                return m.get(str(level).upper(), 3)
            max_rank = _risk_rank(str(getattr(settings, "STRATEGY_MAX_RISK_LEVEL", "HIGH")))

            # Risk rank helper
            def _risk_rank(level: str) -> int:
                m = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}
                return m.get(str(level).upper(), 3)
            max_rank = _risk_rank(str(getattr(settings, "STRATEGY_MAX_RISK_LEVEL", "HIGH")))

            # id lists
            try:
                wl = set(getattr(settings, "STRATEGY_WHITELIST", []) or [])
                bl = set(getattr(settings, "STRATEGY_BLACKLIST", []) or [])
            except Exception:
                wl = set(); bl = set()

            strategy_caps = getattr(settings, "STRATEGY_EXPOSURE_CAPS", {}) or {}
            strategy_exposure: Dict[str, float] = {}
            if strategy_caps:
                try:
                    for pos_data in positions.values():
                        notional_val = float(pos_data.get("notional", 0.0) or 0.0)
                        if notional_val <= 0:
                            continue
                        for strat_name in pos_data.get("strategies") or []:
                            if not strat_name:
                                continue
                            strategy_exposure[str(strat_name)] = strategy_exposure.get(str(strat_name), 0.0) + notional_val
                except Exception:
                    strategy_exposure = {}

            for snapshot in snapshots:
                market_row = snapshot.raw
                # Ensure downstream always receives a valid market_id
                try:
                    if not market_row.get("market_id") or str(market_row.get("market_id")).lower() in {"", "unknown", "none"}:
                        market_row["market_id"] = snapshot.market_id
                except Exception:
                    market_row["market_id"] = snapshot.market_id
                alerts.check_anomalies(market_row)
                cooldown_until = stage1_cooldowns.get(snapshot.market_id)
                if cooldown_until:
                    cooldown_dt = _parse_iso_dt(cooldown_until)
                    if cooldown_dt and cooldown_dt > loop_now:
                        hold_reasons["stage1_cooldown"] = hold_reasons.get("stage1_cooldown", 0) + 1
                        continue

                # whitelist/blacklist gate
                if wl and snapshot.market_id not in wl:
                    reject_reasons["whitelist_gate"] = reject_reasons.get("whitelist_gate", 0) + 1
                    continue
                if bl and snapshot.market_id in bl:
                    reject_reasons["blacklist_gate"] = reject_reasons.get("blacklist_gate", 0) + 1
                    continue
                # risk-level gate
                if _risk_rank(snapshot.risk_level) > max_rank:
                    loop_stats["rejected"] += 1
                    reject_reasons["risk_level_gate"] = reject_reasons.get("risk_level_gate", 0) + 1
                    logger.debug("Skip market %s due to risk level %s > max %s", snapshot.market_id, snapshot.risk_level, getattr(settings, "STRATEGY_MAX_RISK_LEVEL", "HIGH"))
                    continue
                # liquidity gate
                try:
                    min_vol = float(getattr(settings, "STRATEGY_MIN_VOLUME_24H", 0.0))
                except Exception:
                    min_vol = 0.0
                vol = market_row.get("volume_24h") or market_row.get("volume") or 0.0
                try:
                    v = float(vol)
                except Exception:
                    v = 0.0
                if v < min_vol:
                    loop_stats["rejected"] += 1
                    reject_reasons["liquidity_gate"] = reject_reasons.get("liquidity_gate", 0) + 1
                    logger.debug("Skip market %s due to low volume_24h %.2f < %.2f", snapshot.market_id, v, min_vol)
                    continue
                # spread gate
                try:
                    max_bps = int(getattr(settings, "STRATEGY_MAX_SPREAD_BPS", 1500))
                except Exception:
                    max_bps = 1500
                try:
                    tiers = getattr(settings, "STRATEGY_SPREAD_VOLUME_TIERS", []) or []
                except Exception:
                    tiers = []
                dynamic_bps = None
                if tiers:
                    volume_value = market_row.get("volume_24h") or market_row.get("volume")
                    try:
                        volume_float = float(volume_value) if volume_value is not None else None
                    except Exception:
                        volume_float = None
                    if volume_float is not None:
                        for min_volume, tier_bps in tiers:
                            if volume_float >= min_volume:
                                dynamic_bps = tier_bps
                                break
                if dynamic_bps is not None:
                    max_bps = dynamic_bps
                bid = market_row.get("bid"); ask = market_row.get("ask")
                mid = market_row.get("mid_price")
                try:
                    if bid is not None and ask is not None:
                        spread = float(ask) - float(bid)
                        m = (float(ask) + float(bid)) / 2.0
                    else:
                        m = float(mid) if mid is not None else None
                        spread = None
                except Exception:
                    m = None; spread = None
                if spread is not None and m and m > 0:
                    bps = (spread / m) * 10000.0
                    if bps > max_bps:
                        loop_stats["rejected"] += 1
                        reject_reasons["spread_gate"] = reject_reasons.get("spread_gate", 0) + 1
                        logger.debug("Skip market %s due to wide spread %.1f bps > %s", snapshot.market_id, bps, max_bps)
                        continue
                # risk-level gate
                if _risk_rank(snapshot.risk_level) > max_rank:
                    loop_stats["rejected"] += 1
                    reject_reasons["risk_level_gate"] = reject_reasons.get("risk_level_gate", 0) + 1
                    logger.debug("Skip market %s due to risk level %s > max %s", snapshot.market_id, snapshot.risk_level, getattr(settings, "STRATEGY_MAX_RISK_LEVEL", "HIGH"))
                    continue

                # liquidity gate (min volume_24h)
                try:
                    min_vol = float(getattr(settings, "STRATEGY_MIN_VOLUME_24H", 0.0))
                except Exception:
                    min_vol = 0.0
                vol = market_row.get("volume_24h") or market_row.get("volume") or 0.0
                try:
                    v = float(vol)
                except Exception:
                    v = 0.0
                if v < min_vol:
                    loop_stats["rejected"] += 1
                    reject_reasons["liquidity_gate"] = reject_reasons.get("liquidity_gate", 0) + 1
                    logger.debug("Skip market %s due to low volume_24h %.2f < %.2f", snapshot.market_id, v, min_vol)
                    continue

                # spread gate (bps)
                try:
                    max_bps = int(getattr(settings, "STRATEGY_MAX_SPREAD_BPS", 1500))
                except Exception:
                    max_bps = 1500
                try:
                    tiers = getattr(settings, "STRATEGY_SPREAD_VOLUME_TIERS", []) or []
                except Exception:
                    tiers = []
                dynamic_bps = None
                if tiers:
                    volume_value = market_row.get("volume_24h") or market_row.get("volume")
                    try:
                        volume_float = float(volume_value) if volume_value is not None else None
                    except Exception:
                        volume_float = None
                    if volume_float is not None:
                        for min_volume, tier_bps in tiers:
                            if volume_float >= min_volume:
                                dynamic_bps = tier_bps
                                break
                if dynamic_bps is not None:
                    max_bps = dynamic_bps
                bid = market_row.get("bid"); ask = market_row.get("ask")
                mid = market_row.get("mid_price")
                try:
                    if bid is not None and ask is not None:
                        spread = float(ask) - float(bid)
                        m = (float(ask) + float(bid)) / 2.0
                    else:
                        m = float(mid) if mid is not None else None
                        spread = None
                except Exception:
                    m = None; spread = None
                if spread is not None and m and m > 0:
                    bps = (spread / m) * 10000.0
                    if bps > max_bps:
                        loop_stats["rejected"] += 1
                        reject_reasons["spread_gate"] = reject_reasons.get("spread_gate", 0) + 1
                        logger.debug("Skip market %s due to wide spread %.1f bps > %s", snapshot.market_id, bps, max_bps)
                        continue
                order = strategy_engine.generate_order(market_row)
                order_meta = order.get("metadata", {}) or {}
                if order.get("action") == "hold" or order.get("size", 0) <= 0:
                    reason = order_meta.get("reason", "hold")
                    hold_reasons[str(reason)] = hold_reasons.get(str(reason), 0) + 1
                    try:
                        _append_decision({
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "type": "hold",
                            "market_id": snapshot.market_id,
                            "risk_level": snapshot.risk_level,
                            "risk_score": snapshot.risk_score,
                            "reason": reason,
                        })
                    except Exception:
                        pass
                    logger.debug("No actionable signal for market %s (%s)", snapshot.market_id, reason)
                    continue
                # fallback/validation halts
                if flags.get("fallback_halt"):
                    loop_stats["rejected"] += 1
                    reject_reasons["fallback_halt"] = reject_reasons.get("fallback_halt", 0) + 1
                    continue
                if flags.get("low_validation"):
                    loop_stats["rejected"] += 1
                    reject_reasons["low_validation"] = reject_reasons.get("low_validation", 0) + 1
                    continue

                if freq_enabled and freq_max_orders > 0 and freq_interval > 0:
                    freq_now = datetime.now(timezone.utc)
                    while order_frequency_window and (freq_now - order_frequency_window[0]).total_seconds() > freq_interval:
                        order_frequency_window.popleft()
                    if len(order_frequency_window) >= freq_max_orders:
                        loop_stats["rejected"] += 1
                        reject_reasons["order_rate_limit"] = reject_reasons.get("order_rate_limit", 0) + 1
                        logger.info(
                            "Skip order due to frequency cap: %s orders within %ss",
                            freq_max_orders,
                            freq_interval,
                        )
                        continue

                if ks and getattr(ks, "enabled", True) and ks.active:
                    loop_stats["rejected"] += 1
                    reject_reasons["kill_switch"] = reject_reasons.get("kill_switch", 0) + 1
                    try:
                        _append_decision({
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "type": "reject",
                            "market_id": snapshot.market_id,
                            "risk_level": snapshot.risk_level,
                            "risk_score": snapshot.risk_score,
                            "reason": "kill_switch",
                        })
                    except Exception:
                        pass
                    if ks.cooldown_minutes:
                        logger.warning(
                            "Kill-switch active: skip new orders (day_pnl=%.2f, reason=%s, cooldown_remaining=%.2fmin)",
                            ks.day_pnl,
                            ks.reason,
                            ks.cooldown_remaining_minutes,
                        )
                    else:
                        logger.warning("Kill-switch active: skip new orders (day_pnl=%.2f, reason=%s)", ks.day_pnl, ks.reason)
                    continue
                loop_stats["processed"] += 1
                # Optional: strategy-specific gating under ingest fallback
                try:
                    if isinstance(fetch_info, dict) and fetch_info.get("fallback"):
                        skip_list = set(getattr(settings, "STRATEGY_SKIP_ON_FALLBACK", []) or [])
                        if skip_list:
                            meta_strats = []
                            for entry in (order_meta.get("strategies") or []):
                                if isinstance(entry, Mapping) and entry.get("name"):
                                    meta_strats.append(str(entry["name"]))
                            exclusive_name = order_meta.get("exclusive_strategy")
                            if exclusive_name:
                                meta_strats.append(str(exclusive_name))
                            if any(name in skip_list for name in meta_strats):
                                loop_stats["rejected"] += 1
                                reject_reasons["fallback_strategy_skip"] = reject_reasons.get("fallback_strategy_skip", 0) + 1
                                logger.info("Skip order due to fallback strategy skip: %s", meta_strats)
                                try:
                                    _record_reject(
                                        reason="fallback_strategy_skip",
                                        market_id=mid,
                                        action=order.get("action"),
                                        size=order.get("size"),
                                        metadata={"strategies": meta_strats},
                                    )
                                except Exception:
                                    logger.debug("Failed to record fallback skip rejection", exc_info=True)
                                continue
                except Exception:
                    logger.debug("Fallback strategy gating failed", exc_info=True)
                price_ok, price_ctx = _check_price_guard(order, market_row)
                if not price_ok:
                    loop_stats["rejected"] += 1
                    reject_reasons["price_guard"] = reject_reasons.get("price_guard", 0) + 1
                    try:
                        guards_meta = order_meta.setdefault("guards", {})
                        guards_meta["price_guard"] = price_ctx
                    except Exception:
                        pass
                    breach = (price_ctx or {}).get("breach", {}) if price_ctx else {}
                    logger.info(
                        "Skip order due to price guard: side=%s price=%.4f reference=%s deviation=%.4f reason=%s allowed=%s rel_cap=%s",
                        (price_ctx or {}).get("action_side", ""),
                        (price_ctx or {}).get("order_price", 0.0),
                        breach.get("reference"),
                        breach.get("deviation"),
                        breach.get("reason"),
                        breach.get("allowed"),
                        (price_ctx or {}).get("max_rel_pct"),
                    )
                    try:
                        _record_reject(
                            reason="price_guard",
                            market_id=mid,
                            action=order.get("action"),
                            size=order.get("size"),
                            metadata=price_ctx,
                        )
                    except Exception:
                        logger.debug("Failed to record price_guard rejection", exc_info=True)
                    continue

                portfolio = {
                    "returns": list((portfolio_state or {}).get("returns") or []),
                    "balance": (portfolio_state or {}).get("balance"),
                    "positions": list((portfolio_state or {}).get("positions") or []),
                }

                # rescale size using runtime balance (avoid oversizing when balance is small)
                try:
                    initial_balance = float(getattr(settings.trading, "initial_balance", 10_000))
                except Exception:
                    initial_balance = 10_000.0
                runtime_balance = float(portfolio.get("balance", initial_balance))
                scale = max(0.0, runtime_balance / max(1e-9, initial_balance))
                min_pos = float(getattr(settings.trading, "min_position_size", 100))
                # Soft caps derived from risk engine parameters to avoid guaranteed rejections
                cap_liq = runtime_balance * float(getattr(risk, "max_single_order_ratio", 0.1))
                # Estimate 5th percentile VaR from recent returns to cap allowed loss usage
                def _p5(values):
                    if not values:
                        return None
                    vals = sorted([v for v in values if isinstance(v, (int, float))])
                    if not vals:
                        return None
                    k = max(0, min(len(vals) - 1, int(0.05 * (len(vals) - 1))))
                    return float(vals[k])
                var_est = _p5(portfolio.get("returns", []))
                if var_est is None or var_est == 0:
                    var_est = -0.9  # fallback conservative
                allowed_loss = runtime_balance * float(getattr(risk, "max_var_ratio", 0.05))
                cap_var = allowed_loss / max(1e-6, abs(var_est))
                hard_cap = max(min_pos, min(cap_liq, cap_var))
                # Cap the base size by current config's max_single_position (even if engine used a larger default)
                conf_ratio = float(getattr(settings.trading, "max_single_position", 0.01))
                current_limit = initial_balance * conf_ratio
                orig = float(order.get("size", 0.0))
                proposed = min(orig, current_limit) * scale
                new_sz = min(max(min_pos, proposed), hard_cap)
                # apply notional_step rounding (floor)
                try:
                    step = float(getattr(settings.execution, "notional_step", 1.0))
                except Exception:
                    step = 1.0
                if step > 0:
                    from math import floor
                    new_sz = floor(new_sz / step) * step
                    if new_sz < min_pos:
                        new_sz = min_pos
                order["size"] = round(new_sz, 4)
                if ks and getattr(ks, "recovery_mode", False) and recovery_ratio < 1.0:
                    scaled = round(max(min_pos, order["size"] * recovery_ratio), 4)
                    if scaled < order["size"]:
                        logger.info(
                            "Kill-switch recovery mode: scaling order size from %.4f to %.4f (ratio=%.2f)",
                            order["size"],
                            scaled,
                            recovery_ratio,
                        )
                        order["size"] = scaled
                logger.info(
                    "[sizing] runtime_balance=%.2f initial=%.2f scale=%.4f orig=%.4f limit=%.4f proposed=%.4f cap_liq=%.2f cap_var=%.2f(var=%.4f,allow=%.2f) -> new_size=%.4f",
                    runtime_balance, initial_balance, scale, orig, current_limit, proposed, cap_liq, cap_var, var_est, allowed_loss, order["size"],
                )

                logger.info("[sizing] runtime_balance=%.2f initial=%.2f scale=%.4f new_size=%.4f", runtime_balance, initial_balance, scale, order["size"])

                # Optional: degrade size under ingest fallback (per-strategy scaling)
                try:
                    if isinstance(fetch_info, dict) and fetch_info.get("fallback"):
                        scales = getattr(settings, "STRATEGY_SIZE_SCALES_ON_FALLBACK", {}) or {}
                        if isinstance(scales, Mapping):
                            meta_strats = []
                            for entry in (order_meta.get("strategies") or []):
                                if isinstance(entry, Mapping) and entry.get("name"):
                                    meta_strats.append(str(entry["name"]))
                            exclusive_name = order_meta.get("exclusive_strategy")
                            if exclusive_name:
                                meta_strats.append(str(exclusive_name))
                            factors = []
                            for name in meta_strats:
                                try:
                                    f = float(scales.get(name, 1.0))
                                except Exception:
                                    f = 1.0
                                if f > 0 and f < 1.0:
                                    factors.append(f)
                            if factors:
                                factor = max(0.0, min(1.0, min(factors)))
                                prev = float(order.get("size", 0.0) or 0.0)
                                order["size"] = round(prev * factor, 4)
                                logger.info("[sizing] degrade due to fallback: factor=%.3f size %.4f -> %.4f", factor, prev, order["size"])
                except Exception:
                    logger.debug("Fallback size degrade failed", exc_info=True)

                # Extract contributing strategies for caps/frequency guards
                order_strategies: List[str] = []
                for entry in order_meta.get("strategies") or []:
                    if isinstance(entry, dict) and entry.get("name"):
                        name = str(entry["name"])
                        if name not in order_strategies:
                            order_strategies.append(name)
                exclusive_name = order_meta.get("exclusive_strategy")
                if exclusive_name and str(exclusive_name) not in order_strategies:
                    order_strategies.append(str(exclusive_name))
                # Enforce per-strategy and per-market rate limits (if configured)
                if order_strategies and per_strategy_freq_cfg:
                    now_ts = datetime.now(timezone.utc)
                    blocked_meta: Optional[Dict[str, Any]] = None
                    side_val = str(order.get("action") or "").lower() or None
                    for strat_name in order_strategies:
                        cfg = per_strategy_freq_cfg.get(strat_name)
                        if not cfg:
                            continue
                        # Strategy-level window
                        max_orders_cfg = int(cfg.get("max_orders", 0) or 0)
                        interval_cfg = int(cfg.get("interval_seconds", 0) or 0)
                        if max_orders_cfg > 0 and interval_cfg > 0:
                            win = strategy_frequency_windows.setdefault(strat_name, deque())
                            while win and (now_ts - win[0]).total_seconds() > interval_cfg:
                                win.popleft()
                            if len(win) >= max_orders_cfg:
                                blocked_meta = {
                                    "strategy": strat_name,
                                    "scope": "global",
                                    "max_orders": max_orders_cfg,
                                    "interval_seconds": interval_cfg,
                                    "current_window": len(win),
                                }
                                break
                        # Per-side window if configured
                        ps = cfg.get("per_side") if isinstance(cfg, Mapping) else None
                        if ps and side_val:
                            ps_max = int(ps.get("max_orders", 0) or 0)
                            ps_int = int(ps.get("interval_seconds", 0) or 0)
                            if ps_max > 0 and ps_int > 0:
                                skey = (strat_name, side_val)
                                swin = strategy_side_frequency_windows.setdefault(skey, deque())
                                while swin and (now_ts - swin[0]).total_seconds() > ps_int:
                                    swin.popleft()
                                if len(swin) >= ps_max:
                                    blocked_meta = {
                                        "strategy": strat_name,
                                        "scope": "per_side",
                                        "side": side_val,
                                        "max_orders": ps_max,
                                        "interval_seconds": ps_int,
                                        "current_window": len(swin),
                                    }
                                    break
                        # Per-market window if configured
                        pm = cfg.get("per_market") if isinstance(cfg, Mapping) else None
                        if pm and mid:
                            pm_max = int(pm.get("max_orders", 0) or 0)
                            pm_int = int(pm.get("interval_seconds", 0) or 0)
                            if pm_max > 0 and pm_int > 0:
                                key = (strat_name, mid)
                                mwin = strategy_market_frequency_windows.setdefault(key, deque())
                                while mwin and (now_ts - mwin[0]).total_seconds() > pm_int:
                                    mwin.popleft()
                                if len(mwin) >= pm_max:
                                    blocked_meta = {
                                        "strategy": strat_name,
                                        "scope": "per_market",
                                        "market_id": mid,
                                        "max_orders": pm_max,
                                        "interval_seconds": pm_int,
                                        "current_window": len(mwin),
                                    }
                                    break
                        # Per-market × side window if configured
                        pms = cfg.get("per_market_side") if isinstance(cfg, Mapping) else None
                        if pms and mid and side_val:
                            pms_max = int(pms.get("max_orders", 0) or 0)
                            pms_int = int(pms.get("interval_seconds", 0) or 0)
                            if pms_max > 0 and pms_int > 0:
                                mkey = (strat_name, mid, side_val)
                                mswin = strategy_market_side_frequency_windows.setdefault(mkey, deque())
                                while mswin and (now_ts - mswin[0]).total_seconds() > pms_int:
                                    mswin.popleft()
                                if len(mswin) >= pms_max:
                                    blocked_meta = {
                                        "strategy": strat_name,
                                        "scope": "per_market_side",
                                        "market_id": mid,
                                        "side": side_val,
                                        "max_orders": pms_max,
                                        "interval_seconds": pms_int,
                                        "current_window": len(mswin),
                                    }
                                    break
                    if blocked_meta is not None:
                        loop_stats["rejected"] += 1
                        reject_reasons["strategy_rate_limit"] = reject_reasons.get("strategy_rate_limit", 0) + 1
                        logger.info("Skip order due to per-strategy frequency cap: %s", blocked_meta)
                        try:
                            _record_reject(
                                reason="strategy_rate_limit",
                                market_id=mid,
                                action=order.get("action"),
                                size=order.get("size"),
                                metadata=blocked_meta,
                            )
                        except Exception:
                            logger.debug("Failed to record strategy_rate_limit rejection", exc_info=True)
                        continue
                if order_strategies and strategy_caps:
                        min_available = float(order.get("size", 0.0) or 0.0)
                        limiting_strategy: Optional[str] = None
                        skip_due_cap = False
                        for strat_name in order_strategies:
                            cap_val = strategy_caps.get(strat_name)
                            if cap_val is None:
                                continue
                            try:
                                cap_limit = float(cap_val)
                            except Exception:
                                continue
                            current_notional = float(strategy_exposure.get(strat_name, 0.0))
                            remaining_cap = cap_limit - current_notional
                            if remaining_cap <= 1e-9:
                                loop_stats["rejected"] += 1
                                reject_reasons["strategy_cap"] = reject_reasons.get("strategy_cap", 0) + 1
                                strategy_reject_summary[strat_name] = strategy_reject_summary.get(strat_name, 0) + 1
                                logger.info("Skip order due to strategy cap: %s remaining=%.2f", strat_name, remaining_cap)
                                skip_due_cap = True
                                break
                            if remaining_cap < min_available:
                                min_available = remaining_cap
                                limiting_strategy = strat_name
                        if skip_due_cap:
                            continue
                        if min_available < min_pos:
                            loop_stats["rejected"] += 1
                            reject_reasons["strategy_cap"] = reject_reasons.get("strategy_cap", 0) + 1
                            if limiting_strategy:
                                strategy_reject_summary[limiting_strategy] = strategy_reject_summary.get(limiting_strategy, 0) + 1
                            logger.info("Skip order due to strategy caps leaving available %.2f < min_pos %.2f", min_available, min_pos)
                            continue
                        if min_available < order["size"]:
                            order["size"] = round(min_available, 4)
                            logger.info("[sizing] clamp by strategy cap: remaining=%.2f -> size=%.4f", min_available, order["size"])
                if not _apply_depth_cap(order, market_row, min_pos):
                    loop_stats["rejected"] += 1
                    reject_reasons["depth_cap"] = reject_reasons.get("depth_cap", 0) + 1
                    logger.info("Skip order due to depth cap: available size below min_pos")
                    continue
                # fix/validate market id
                mid = str(order.get("market_id") or "").strip()
                if not mid or mid.lower() == "unknown":
                    mid = snapshot.market_id
                    order["market_id"] = mid
                order_meta.setdefault("market_id", mid)
                token_id = market_row.get("token_id")
                if token_id is not None:
                    order_meta.setdefault("token_id", token_id)
                if not mid:
                    loop_stats["rejected"] += 1
                    reject_reasons["missing_market_id"] = reject_reasons.get("missing_market_id", 0) + 1
                    logger.warning("Skip order with missing market_id (snapshot=%s)", snapshot.market_id)
                    try:
                        _record_reject(
                            reason="missing_market_id",
                            market_id=None,
                            action=order.get("action"),
                            size=order.get("size"),
                            metadata={"snapshot_market_id": snapshot.market_id},
                        )
                    except Exception:
                        logger.debug("Failed to record missing_market_id rejection", exc_info=True)
                    continue
                logger.info(
                    "[strategy] market %s -> order %s (risk %s, score %.2f)",
                    mid,
                    order,
                    snapshot.risk_level,
                    snapshot.risk_score,
                )

                if intent_window_seconds > 0:
                    intent_key = _intent_key(mid, order.get("action"))
                    last_intent = order_intents_index.get(intent_key) if intent_key else None
                    market_intent_key = _market_key(mid)
                    last_market_intent = order_intents_index.get(market_intent_key) if market_intent_key else None
                    last_dt = _parse_iso_dt(last_intent) if last_intent else None
                    last_market_dt = _parse_iso_dt(last_market_intent) if last_market_intent else None
                    last_intent_rec = _last_order_intent(order_intents, mid, order.get("action"))
                    if last_dt is not None:
                        elapsed = (datetime.now(timezone.utc) - last_dt).total_seconds()
                    else:
                        elapsed = None
                    if last_market_dt is not None:
                        market_elapsed = (datetime.now(timezone.utc) - last_market_dt).total_seconds()
                    else:
                        market_elapsed = None
                    should_block = False
                    dedupe_meta: Dict[str, Any] = {
                        "window_seconds": intent_window_seconds,
                    }
                    if elapsed is not None and elapsed < intent_window_seconds:
                        dedupe_meta["side_elapsed"] = elapsed
                        dedupe_meta["side_last_intent"] = last_intent
                        should_block = True
                    if market_elapsed is not None and market_elapsed < intent_window_seconds:
                        dedupe_meta["market_elapsed"] = market_elapsed
                        dedupe_meta["market_last_intent"] = last_market_intent
                        should_block = True
                    if (
                        not should_block
                        and last_dt is not None
                        and elapsed is not None
                        and elapsed < intent_window_seconds
                        and last_intent_rec is not None
                    ):
                        try:
                            last_size = float(last_intent_rec.get("size", 0.0) or 0.0)
                        except Exception:
                            last_size = 0.0
                        current_size = float(order.get("size", 0.0) or 0.0)
                        size_diff = abs(current_size - last_size)
                        size_ratio = size_diff / max(current_size, last_size, 1e-9)
                        size_block = False
                        if size_tolerance > 0 and size_diff <= size_tolerance + 1e-9:
                            size_block = True
                        if size_ratio_tolerance > 0 and size_ratio <= size_ratio_tolerance + 1e-9:
                            size_block = True
                        if size_block:
                            dedupe_meta["size_diff"] = size_diff
                            dedupe_meta["size_ratio"] = size_ratio
                            dedupe_meta["last_size"] = last_size
                            should_block = True
                    if should_block:
                        loop_stats["rejected"] += 1
                        reject_reasons["order_dedupe"] = reject_reasons.get("order_dedupe", 0) + 1
                        try:
                            guards_meta = order_meta.setdefault("guards", {})
                            guards_meta["order_dedupe"] = dedupe_meta
                        except Exception:
                            pass
                        logger.info(
                            "Skip order due to recent intent: market=%s side=%s meta=%s",
                            mid,
                            order.get("action"),
                            dedupe_meta,
                        )
                        try:
                            _record_reject(
                                reason="order_dedupe",
                                market_id=mid,
                                action=order.get("action"),
                                size=order.get("size"),
                                metadata=dedupe_meta,
                            )
                        except Exception:
                            logger.debug("Failed to record order_dedupe rejection", exc_info=True)
                        continue

                # per-market cooldown and positions cap
                try:
                    cooldown_s = int(getattr(settings, "ENTRY_COOLDOWN_SECONDS", 120))
                except Exception:
                    cooldown_s = 120
                pos = positions.get(mid)
                if pos:
                    try:
                        opened_at = datetime.fromisoformat(pos.get("opened_at").replace("Z", "+00:00"))
                        if (datetime.now(timezone.utc) - opened_at) < timedelta(seconds=cooldown_s):
                            loop_stats["rejected"] += 1
                            reject_reasons["cooldown"] = reject_reasons.get("cooldown", 0) + 1
                            logger.info("Skip re-entry due to cooldown: %s", mid)
                            try:
                                _record_reject(
                                    reason="cooldown",
                                    market_id=mid,
                                    action=order.get("action"),
                                    size=order.get("size"),
                                    metadata={"cooldown_seconds": cooldown_s},
                                )
                            except Exception:
                                logger.debug("Failed to record cooldown rejection", exc_info=True)
                            continue
                    except Exception:
                        pass
                try:
                    max_per_market = int(getattr(settings.trading, "max_positions_per_market", 1))
                except Exception:
                    max_per_market = 1
                exposure_cap = None
                try:
                    exposure_cap = float(PER_MARKET_EXPOSURE_CAPS.get(mid)) if mid in PER_MARKET_EXPOSURE_CAPS else None
                except Exception:
                    exposure_cap = None
                if max_per_market > 0 and pos:
                    loop_stats["rejected"] += 1
                    reject_reasons["per_market_cap"] = reject_reasons.get("per_market_cap", 0) + 1
                    logger.info("Skip order due to per-market cap: already has position")
                    continue
                if exposure_cap is not None:
                    if exposure_cap <= 0:
                        loop_stats["rejected"] += 1
                        reject_reasons["per_market_block"] = reject_reasons.get("per_market_block", 0) + 1
                        for strat_name in order_strategies or []:
                            strategy_reject_summary[strat_name] = strategy_reject_summary.get(strat_name, 0) + 1
                        logger.info("Skip order due to exposure block for market %s", mid)
                        continue
                    existing_notional = float(pos.get("notional", 0.0)) if pos else 0.0
                    if existing_notional >= exposure_cap:
                        loop_stats["rejected"] += 1
                        reject_reasons["per_market_exposure"] = reject_reasons.get("per_market_exposure", 0) + 1
                        for strat_name in order_strategies or []:
                            strategy_reject_summary[strat_name] = strategy_reject_summary.get(strat_name, 0) + 1
                        logger.info("Skip order due to exposure cap: %.2f >= %.2f", existing_notional, exposure_cap)
                        continue

                # enforce total exposure cap and max open positions before risk engine
                try:
                    max_total_expo = float(getattr(settings.trading, "max_total_exposure", 0.35))
                except Exception:
                    max_total_expo = 0.35
                try:
                    max_open = int(getattr(settings.trading, "max_open_positions", 50))
                except Exception:
                    max_open = 50
                if len(positions) >= max_open:
                    loop_stats["rejected"] += 1
                    reject_reasons["max_open_positions"] = reject_reasons.get("max_open_positions", 0) + 1
                    logger.info("Skip order due to max_open_positions: %s >= %s", len(positions), max_open)
                    try:
                        _record_reject(
                            reason="max_open_positions",
                            market_id=mid,
                            action=order.get("action"),
                            size=order.get("size"),
                            metadata={"current": len(positions), "limit": max_open},
                        )
                    except Exception:
                        logger.debug("Failed to record max_open_positions rejection", exc_info=True)
                    continue
                current_expo = 0.0
                try:
                    for p in positions.values():
                        current_expo += float(p.get("notional", 0.0) or 0.0)
                except Exception:
                    current_expo = 0.0
                allowed_total = runtime_balance * max_total_expo
                remaining = max(0.0, allowed_total - current_expo - pending_exposure_total)
                if order["size"] > remaining:
                    if remaining < min_pos:
                        loop_stats["rejected"] += 1
                        reject_reasons["exposure_cap"] = reject_reasons.get("exposure_cap", 0) + 1
                        logger.info("Skip order due to total exposure cap: remaining=%.2f < min_pos=%.2f", remaining, min_pos)
                        try:
                            _record_reject(
                                reason="exposure_cap",
                                market_id=mid,
                                action=order.get("action"),
                                size=order.get("size"),
                                metadata={"remaining": remaining, "min_pos": min_pos, "allowed_total": allowed_total},
                            )
                        except Exception:
                            logger.debug("Failed to record exposure_cap rejection", exc_info=True)
                        continue
                    order["size"] = round(remaining, 4)
                    logger.info("[sizing] clamp by exposure cap: remaining=%.2f -> size=%.4f", remaining, order["size"]) 

                try:
                    side_ratio_limit = getattr(settings.trading, "max_side_exposure_ratio", 0.0)
                except Exception:
                    side_ratio_limit = 0.0
                side_ok, side_ctx = _check_side_exposure_limit(order, positions, side_ratio_limit)
                if not side_ok:
                    loop_stats["rejected"] += 1
                    reject_reasons["side_balance"] = reject_reasons.get("side_balance", 0) + 1
                    logger.info(
                        "Skip order due to side exposure limit: side=%s ratio=%.3f limit=%.3f (yes=%.2f, no=%.2f)",
                        side_ctx.get("action_side", ""),
                        side_ctx.get("ratio", 0.0),
                        side_ctx.get("limit", 0.0),
                        side_ctx.get("future_yes", 0.0),
                        side_ctx.get("future_no", 0.0),
                    )
                    try:
                        _record_reject(
                            reason="side_balance",
                            market_id=mid,
                            action=order.get("action"),
                            size=order.get("size"),
                            metadata=side_ctx,
                        )
                    except Exception:
                        logger.debug("Failed to record side_balance rejection", exc_info=True)
                    continue

                risk_ok = risk.validate_order(order, portfolio)
                risk_meta = order.get("metadata", {}).get("risk", {})
                if risk_meta:
                    try:
                        risk_reports.append(dict(risk_meta))
                    except Exception:
                        risk_reports.append(risk_meta)
                # Tally risk outcomes
                try:
                    if risk_ok:
                        risk_counts["approved"] = int(risk_counts.get("approved", 0)) + 1
                    else:
                        risk_counts["rejected"] = int(risk_counts.get("rejected", 0)) + 1
                    rejs = risk_meta.get("rejections") if isinstance(risk_meta, dict) else None
                    if isinstance(rejs, (list, tuple)):
                        for name in rejs:
                            key = str(name)
                            reasons = risk_counts.setdefault("reasons", {})
                            reasons[key] = int(reasons.get(key, 0)) + 1
                except Exception:
                    pass
                # Persist risk audit regardless of approval
                try:
                    audit = {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "market_id": mid,
                        "action": order.get("action"),
                        "size": order.get("size"),
                        "approved": bool(risk_ok),
                        "risk": risk_meta,
                        "strategies": list(order_strategies or []),
                    }
                    RISK_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
                    with RISK_AUDIT_PATH.open("a", encoding="utf-8") as fh:
                        fh.write(json.dumps(audit) + "\n")
                except Exception:
                    logger.debug("Failed to append risk audit", exc_info=True)
                    try:
                        io_errors["risk_audit"] = int(io_errors.get("risk_audit", 0)) + 1
                    except Exception:
                        pass
                if not risk_ok:
                    loop_stats["rejected"] += 1
                    reject_reasons["risk_reject"] = reject_reasons.get("risk_reject", 0) + 1
                    alerts.send_alert("Order rejected by risk controls", metadata=risk_meta)
                    # Per‑strategy risk rejection计数
                    try:
                        for strat_name in (order_strategies or []):
                            bucket = strategy_risk_counts.setdefault(str(strat_name), {"approved": 0, "rejected": 0})
                            bucket["rejected"] = bucket.get("rejected", 0) + 1
                            strategy_reject_summary[str(strat_name)] = strategy_reject_summary.get(str(strat_name), 0) + 1
                    except Exception:
                        pass
                    try:
                        _record_reject(
                            reason="risk_reject",
                            market_id=mid,
                            action=order.get("action"),
                            size=order.get("size"),
                            metadata=risk_meta,
                        )
                    except Exception:
                        logger.debug("Failed to record risk_reject rejection", exc_info=True)
                    continue
                # Per-market guard: block markets that exceeded daily loss threshold
                if per_market_blocked and mid in per_market_blocked:
                    loop_stats["rejected"] += 1
                    reject_reasons["per_market_kill_switch"] = reject_reasons.get("per_market_kill_switch", 0) + 1
                    try:
                        _append_decision({
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "type": "reject",
                            "market_id": snapshot.market_id,
                            "risk_level": snapshot.risk_level,
                            "risk_score": snapshot.risk_score,
                            "reason": "per_market_kill_switch",
                        })
                    except Exception:
                        pass
                    try:
                        _record_reject(
                            reason="per_market_kill_switch",
                            market_id=mid,
                            action=order.get("action"),
                            size=order.get("size"),
                            metadata={
                                "day_pnl": per_market_pnl.get(mid),
                                "threshold": per_market_threshold,
                            },
                        )
                    except Exception:
                        logger.debug("Failed to record per_market_kill_switch rejection", exc_info=True)
                    continue
                else:
                    # Per‑strategy risk通过计数
                    try:
                        for strat_name in (order_strategies or []):
                            bucket = strategy_risk_counts.setdefault(str(strat_name), {"approved": 0, "rejected": 0})
                            bucket["approved"] = bucket.get("approved", 0) + 1
                    except Exception:
                        pass

                # cooldown: prevent rapid re-entry in same market
                cooldown_s = int(getattr(settings, "ENTRY_COOLDOWN_SECONDS", 120))
                pos = positions.get(mid)
                if pos:
                    try:
                        opened_at = datetime.fromisoformat(pos.get("opened_at").replace("Z", "+00:00"))
                        if (datetime.now(timezone.utc) - opened_at) < timedelta(seconds=cooldown_s):
                            loop_stats["rejected"] += 1
                            logger.info("Skip re-entry due to cooldown: %s", mid)
                            try:
                                _record_reject(
                                    reason="cooldown",
                                    market_id=mid,
                                    action=order.get("action"),
                                    size=order.get("size"),
                                    metadata={"cooldown_seconds": cooldown_s},
                                )
                            except Exception:
                                logger.debug("Failed to record cooldown rejection", exc_info=True)
                            continue
                    except Exception:
                        pass
                # enforce per-market positions cap
                try:
                    max_per_market = int(getattr(settings.trading, "max_positions_per_market", 1))
                except Exception:
                    max_per_market = 1
                if max_per_market > 0:
                    existing = 1 if pos else 0
                    if existing >= max_per_market:
                        loop_stats["rejected"] += 1
                        logger.info("Skip order due to per-market cap: %s existing >= %s", existing, max_per_market)
                        try:
                            _record_reject(
                                reason="per_market_cap",
                                market_id=mid,
                                action=order.get("action"),
                                size=order.get("size"),
                                metadata={"existing": existing, "limit": max_per_market},
                            )
                        except Exception:
                            logger.debug("Failed to record per_market_cap rejection", exc_info=True)
                        continue
                if exposure_cap is not None and exposure_cap > 0:
                    existing_notional = float(pos.get("notional", 0.0)) if pos else 0.0
                    notional = float(order.get("size", 0.0) or 0.0)
                    if existing_notional + notional > exposure_cap + 1e-6:
                        loop_stats["rejected"] += 1
                        reject_reasons["per_market_exposure"] = reject_reasons.get("per_market_exposure", 0) + 1
                        for strat_name in order_strategies or []:
                            strategy_reject_summary[strat_name] = strategy_reject_summary.get(strat_name, 0) + 1
                        logger.info(
                            "Skip order due to exposure cap: existing %.2f + new %.2f > cap %.2f",
                            existing_notional,
                            notional,
                            exposure_cap,
                        )
                        continue

                if orders_submitted >= max_per_loop:
                    loop_stats["rejected"] += 1
                    reject_reasons["loop_cap"] = reject_reasons.get("loop_cap", 0) + 1
                    logger.info("Skip order due to max_orders_per_loop: %s reached", max_per_loop)
                    try:
                        _record_reject(
                            reason="loop_cap",
                            market_id=mid,
                            action=order.get("action"),
                            size=order.get("size"),
                            metadata={"max_orders_per_loop": max_per_loop},
                        )
                    except Exception:
                        logger.debug("Failed to record loop_cap rejection", exc_info=True)
                    continue

                notional = float(order.get("size", 0.0) or 0.0)
                pending_exposure_total += max(0.0, notional)
                order_submission_time = datetime.now(timezone.utc)
                try:
                    order_store.append_order(
                        {
                            "timestamp": order_submission_time.isoformat(),
                            "market_id": mid,
                            "action": order.get("action"),
                            "size": order.get("size"),
                            "strategies": order_meta.get("strategies"),
                            "metadata": order_meta,
                            "runtime_mode": runtime_mode,
                        }
                    )
                except Exception:
                    logger.debug("Failed to append order submission", exc_info=True)
                # Bump per-strategy windows upon approval
                if order_strategies and per_strategy_freq_cfg:
                    now_ts2 = datetime.now(timezone.utc)
                    side_val2 = str(order.get("action") or "").lower() or None
                    for strat_name in order_strategies:
                        cfg = per_strategy_freq_cfg.get(strat_name)
                        if not cfg:
                            continue
                        interval = int(cfg.get("interval_seconds", 0) or 0)
                        max_orders = int(cfg.get("max_orders", 0) or 0)
                        if interval <= 0 or max_orders <= 0:
                            continue
                        window = strategy_frequency_windows.setdefault(strat_name, deque())
                        while window and (now_ts2 - window[0]).total_seconds() > interval:
                            window.popleft()
                        window.append(now_ts2)
                        ps = cfg.get("per_side") if isinstance(cfg, Mapping) else None
                        if ps and side_val2:
                            ps_int = int(ps.get("interval_seconds", 0) or 0)
                            ps_max = int(ps.get("max_orders", 0) or 0)
                            if ps_int > 0 and ps_max > 0:
                                skey = (strat_name, side_val2)
                                swin = strategy_side_frequency_windows.setdefault(skey, deque())
                                while swin and (now_ts2 - swin[0]).total_seconds() > ps_int:
                                    swin.popleft()
                                swin.append(now_ts2)
                        pm = cfg.get("per_market") if isinstance(cfg, Mapping) else None
                        if pm and mid:
                            pm_int = int(pm.get("interval_seconds", 0) or 0)
                            pm_max = int(pm.get("max_orders", 0) or 0)
                            if pm_int > 0 and pm_max > 0:
                                key = (strat_name, mid)
                                mwin = strategy_market_frequency_windows.setdefault(key, deque())
                                while mwin and (now_ts2 - mwin[0]).total_seconds() > pm_int:
                                    mwin.popleft()
                                mwin.append(now_ts2)
                        pms = cfg.get("per_market_side") if isinstance(cfg, Mapping) else None
                        if pms and mid and side_val2:
                            pms_int = int(pms.get("interval_seconds", 0) or 0)
                            pms_max = int(pms.get("max_orders", 0) or 0)
                            if pms_int > 0 and pms_max > 0:
                                mkey = (strat_name, mid, side_val2)
                                mswin = strategy_market_side_frequency_windows.setdefault(mkey, deque())
                                while mswin and (now_ts2 - mswin[0]).total_seconds() > pms_int:
                                    mswin.popleft()
                                mswin.append(now_ts2)
                loop_stats["approved"] += 1
                report = exec_eng.execute_trade(
                    market_id=order["market_id"],
                    action=order["action"],
                    amount=order["size"],
                    market_snapshot=market_row,
                )
                order_state = order_tracker.register(report)
                logger.info(
                    "[exec] order_id=%s status=%s filled=%.4f/%.4f",
                    report.order_id,
                    report.status,
                    report.filled_notional,
                    report.requested_notional,
                )
                try:
                    _append_decision({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "type": "approve",
                        "market_id": order["market_id"],
                        "risk_level": snapshot.risk_level,
                        "risk_score": snapshot.risk_score,
                        "action": order["action"],
                        "size": order["size"],
                        "order_id": report.order_id,
                        "status": report.status,
                    })
                except Exception:
                    pass
                orders_submitted += 1
                if intent_window_seconds > 0 or intent_max_entries > 0:
                    extra_intent_info: Dict[str, Any] = {}
                    if order_strategies:
                        extra_intent_info["strategies"] = order_strategies
                    order_intents_index = _record_order_intent(
                        order_intents,
                        mid,
                        order["action"],
                        order["size"],
                        datetime.now(timezone.utc),
                        intent_window_seconds,
                        intent_max_entries,
                        extra=extra_intent_info or None,
                    )

                # record open position for exit management
                try:
                    side = order["action"]
                    entry_yes = _entry_price_yes(side, market_row)
                    requested_notional = float(order["size"])  # sized in quote currency
                    denom = entry_yes if side == "yes" else max(1e-9, 1.0 - entry_yes)
                    requested_shares = requested_notional / denom
                    filled_notional = float(report.filled_notional or 0.0)
                    filled_shares = float(report.filled_shares or 0.0)
                    if filled_notional <= 0 or filled_shares <= 0:
                        logger.info(
                            "Order %s pending fill for %s (remaining %.4f)",
                            report.order_id,
                            mid,
                            report.remaining_notional,
                        )
                        continue
                    entry_score = float(order_meta.get("combined_score", 0.0))
                    # dynamic holding seconds by risk level
                    try:
                        hold_map = getattr(settings, "STRATEGY_HOLD_SECONDS_BY_RISK", {}) or {}
                        risk_key = str(snapshot.risk_level).upper()
                        dynamic_hold = int(hold_map.get(risk_key, EXIT_HOLDING_SECONDS)) if isinstance(hold_map, dict) else EXIT_HOLDING_SECONDS
                        dynamic_hold = min(TIME_STOP_MAX_SECONDS, max(dynamic_hold, TIME_STOP_MIN_SECONDS))
                        dynamic_min_hold = max(TIME_STOP_MIN_SECONDS, int(dynamic_hold // 2))
                    except Exception:
                        dynamic_hold = min(TIME_STOP_MAX_SECONDS, max(EXIT_HOLDING_SECONDS, TIME_STOP_MIN_SECONDS))
                        dynamic_min_hold = max(TIME_STOP_MIN_SECONDS, EXIT_MIN_HOLD_SECONDS)
                    strategy_meta = order_meta
                    strategy_names = []
                    strategy_states: Dict[str, Dict[str, Any]] = {}
                    for entry in strategy_meta.get("strategies") or []:
                        if isinstance(entry, dict) and entry.get("name"):
                            name = entry["name"]
                            strategy_names.append(name)
                            evaluator = get_exit_evaluator(name)
                            state: Dict[str, Any] = {}
                            if evaluator:
                                try:
                                    evaluator.capture_entry(state, entry)
                                except Exception:
                                    state = {}
                            metadata = entry.get("metadata") or {}
                            # Provide default passthrough of metadata for downstream logic
                            if not state:
                                state = dict(metadata)
                            strategy_states[name] = {
                                "entry": state,
                                "exclusive": bool(entry.get("exclusive")),
                            }

                    positions[mid] = {
                        "market_id": mid,
                        "side": side,
                        "notional": round(filled_notional, 6),
                        "shares": round(filled_shares, 6),
                        "original_notional": round(requested_notional, 4),
                        "original_shares": round(requested_shares, 6),
                        "entry_yes": round(entry_yes, 6),
                        "entry_score": entry_score,
                        "entry_risk_level": snapshot.risk_level,
                        "hold_secs": dynamic_hold,
                        "min_hold_secs": dynamic_min_hold,
                        "opened_at": datetime.now(timezone.utc).isoformat(),
                        "best_pnl_pct": 0.0,
                        "tp_sl_stage": 0,
                        "trim_ratio": TIERED_TP_SL_TRIM_RATIO,
                        "strategies": strategy_names,
                        "strategy_states": strategy_states,
                        "open_orders": (
                            []
                            if order_state.status == "filled"
                            else [
                                {
                                    "order_id": report.order_id,
                                    "remaining_notional": round(order_state.remaining_notional, 6),
                                    "remaining_shares": round(order_state.remaining_shares, 6),
                                    "status": order_state.status,
                                }
                            ]
                        ),
                    }
                    try:
                        db.upsert_position(positions[mid])
                    except Exception:
                        pass
                    _persist_trade_reports(
                        [report],
                        event="entry_fill",
                        market_id=mid,
                        side=side,
                        strategies=strategy_names,
                        context={
                            "entry_yes": round(entry_yes, 6),
                            "filled_notional": round(filled_notional, 6),
                            "filled_shares": round(filled_shares, 6),
                            "requested_notional": round(requested_notional, 4),
                        },
                    )
                    if strategy_caps and strategy_names and filled_notional > 0:
                        for strat_name in strategy_names:
                            strategy_exposure[strat_name] = strategy_exposure.get(strat_name, 0.0) + filled_notional
                    # telemetry for entry
                    try:
                        entry_mid = _current_mid(market_row)
                        if entry_mid is None:
                            entry_mid = market_row.get("mid_price") or market_row.get("yes_price") or entry_yes
                        bid = market_row.get("bid"); ask = market_row.get("ask")
                        spread = (float(ask) - float(bid)) if (bid is not None and ask is not None) else None
                        entry_mid = float(entry_mid)
                        if spread is None and bid is not None:
                            try:
                                spread = float(ask) - float(bid) if ask is not None else 0.0
                            except (TypeError, ValueError):
                                spread = 0.0
                        if spread is None:
                            spread = 0.0
                        slippage = (entry_yes - entry_mid) if side == "yes" else (entry_mid - entry_yes)
                        fees_est = float(order_state.fees_total or report.fees or 0.0)
                        execution_mode = getattr(exec_eng, "execution_mode", "simulation")
                        _record_fill(
                            {
                                "event": "entry",
                                "market_id": mid,
                                "side": side,
                                "notional": round(filled_notional, 6),
                                "size": round(filled_notional, 6),
                                "entry_yes": round(entry_yes, 6),
                                "fill_price": report.average_price or entry_yes,
                                "reference_price": entry_mid,
                                "slippage": slippage,
                                "mid": entry_mid,
                                "spread": round(float(spread), 6) if isinstance(spread, (int, float)) else None,
                                "shares": round(filled_shares, 6),
                                "fees": round(fees_est, 6),
                                "execution_mode": execution_mode,
                                "strategy_metadata": order.get("metadata"),
                                "order_id": report.order_id,
                            }
                        )
                    except Exception:
                        logger.debug("Failed to record entry telemetry", exc_info=True)
                except Exception:
                    logger.debug("Failed to record open position", exc_info=True)

            # evaluate exits on current snapshots
            now = datetime.now(timezone.utc)
            to_close = []
            for mid, pos in list(positions.items()):
                snap = snapshot_map.get(mid)
                if not snap:
                    continue
                try:
                    side = str(pos.get("side"))
                    entry_yes = float(pos.get("entry_yes", 0.0)) or 0.0
                    shares = float(pos.get("shares", 0.0)) or 0.0
                    notional = float(pos.get("notional", 0.0)) or 0.0
                    # mark-to-market (taker) on yes price
                    cur_yes_mark = _mark_yes_for_exit(side, snap.raw)
                    # share-based pnl
                    if side == "yes":
                        pnl = shares * (cur_yes_mark - entry_yes)
                    else:
                        pnl = shares * (entry_yes - cur_yes_mark)
                    pnl_pct = pnl / max(1e-9, notional)
                    opened_at: Optional[datetime] = None
                    try:
                        opened_at = datetime.fromisoformat(pos.get("opened_at").replace("Z", "+00:00"))
                        eff_hold = int(pos.get("hold_secs", EXIT_HOLDING_SECONDS))
                        eff_min_hold = int(pos.get("min_hold_secs", EXIT_MIN_HOLD_SECONDS))
                        eff_hold = min(TIME_STOP_MAX_SECONDS, max(eff_hold, TIME_STOP_MIN_SECONDS))
                        eff_min_hold = min(eff_hold, max(TIME_STOP_MIN_SECONDS, eff_min_hold))
                        age_ok = (now - opened_at) >= timedelta(seconds=eff_hold)
                        age_min = (now - opened_at) >= timedelta(seconds=eff_min_hold)
                    except Exception:
                        age_ok = True
                        age_min = True

                    # track peak for trailing
                    best = float(pos.get("best_pnl_pct", 0.0))
                    if pnl_pct > best:
                        pos["best_pnl_pct"] = pnl_pct
                        best = pnl_pct
                    breakeven_triggered = best >= BREAK_EVEN_TRIGGER_PCT

                    # edge-based exit: derive current p-hat via exponential decay toward 0.5
                    try:
                        entry_score = float(pos.get("entry_score", 0.0))
                    except Exception:
                        entry_score = 0.0
                    p_entry = 0.5 + 0.5 * max(-1.0, min(1.0, entry_score))
                    tau = 300.0
                    # approximate seconds since open
                    try:
                        tsec = max(0.0, (now - opened_at).total_seconds())
                    except Exception:
                        tsec = EXIT_MIN_HOLD_SECONDS
                    decay = pow(2.718281828, -tsec / tau)
                    p_hat = 0.5 + (p_entry - 0.5) * decay
                    cur_mid = _current_mid(snap.raw)
                    # execution cost budget
                    bid = snap.raw.get("bid")
                    ask = snap.raw.get("ask")
                    spread = (float(ask) - float(bid)) if (bid is not None and ask is not None) else 0.02
                    fee_rate = _active_fee_rate()
                    cost_budget = fee_rate + (spread / 2.0) + EDGE_RISK_PREMIUM
                    edge = p_hat - cur_mid
                    # Flip sign for 'no' to reflect edge on held direction
                    eff_edge = edge if side == "yes" else -edge

                    tiered_active = TIERED_TP_SL_ENABLED and shares > 0.0
                    stage = int(pos.get("tp_sl_stage", 0)) if tiered_active else 0
                    try:
                        trim_ratio = float(pos.get("trim_ratio", TIERED_TP_SL_TRIM_RATIO)) if tiered_active else 0.0
                    except Exception:
                        trim_ratio = TIERED_TP_SL_TRIM_RATIO
                    trim_ratio = max(0.0, min(1.0, trim_ratio))

                    strategy_exit_view = evaluate_strategy_exit_decisions(pos, snap.raw, now)
                    strategy_close_payload = strategy_exit_view.get("close")
                    strategy_hold_payloads = strategy_exit_view.get("holds", [])
                    if strategy_hold_payloads and not strategy_close_payload:
                        for payload in strategy_hold_payloads:
                            decision = payload.get("decision")
                            reason = getattr(decision, "reason", "hold")
                            strat_name = str(payload.get("strategy") or "unknown")
                            key = f"strategy_hold:{strat_name}:{reason}"
                            hold_reasons[key] = hold_reasons.get(key, 0) + 1
                            strategy_hold_summary[strat_name] = strategy_hold_summary.get(strat_name, 0) + 1
                        continue
                    strategy_exit_forced = bool(strategy_close_payload)

                    if tiered_active and stage < 1 and trim_ratio > 0.0 and trim_ratio < 1.0 and not strategy_exit_forced:
                        if pnl_pct <= -TIERED_TP_SL_SOFT_STOP_PCT:
                            exit_notional = notional * trim_ratio
                            exit_shares = shares * trim_ratio
                            if exit_notional > 0.0 and exit_shares > 0.0:
                                exit_action = "no" if side == "yes" else "yes"
                                exit_reports, exit_meta = _execute_liquidity_aware_exit(
                                    exec_eng,
                                    order_tracker,
                                    mid,
                                    exit_action,
                                    exit_notional,
                                    snap.raw,
                                    cur_yes_mark,
                                )
                                filled_exit_notional = sum(max(0.0, float(r.filled_notional or 0.0)) for r in exit_reports)
                                if filled_exit_notional <= 0.0:
                                    pending_ids = ", ".join(str(r.order_id) for r in exit_reports if getattr(r, "order_id", None)) or "n/a"
                                    remaining_total = sum(max(0.0, getattr(r, "remaining_notional", 0.0)) for r in exit_reports)
                                    logger.info(
                                        "Partial exit orders pending fill for %s (orders=%s remaining %.4f)",
                                        mid,
                                        pending_ids,
                                        remaining_total,
                                    )
                                    continue
                                fill_ratio = (
                                    min(1.0, filled_exit_notional / exit_notional)
                                    if exit_notional > 0.0
                                    else 1.0
                                )
                                exit_shares_filled = exit_shares * fill_ratio
                                slices_count = len(exit_reports)
                                logger.info(
                                    "[exit] %s reason=%s side=%s notional=%.2f/%.2f shares=%.4f entry_yes=%.4f cur_yes=%.4f pnl%%=%.2f%% slices=%s",
                                    mid,
                                    "tp_sl_stage1",
                                    side,
                                    filled_exit_notional,
                                    exit_notional,
                                    exit_shares_filled,
                                    entry_yes,
                                    cur_yes_mark,
                                    pnl_pct * 100.0,
                                    slices_count,
                                )
                                pnl_stage = exit_shares_filled * (
                                    (cur_yes_mark - entry_yes) if side == "yes" else (entry_yes - cur_yes_mark)
                                )
                                pnl_pct_stage = pnl_stage / max(1e-9, filled_exit_notional)
                                fees_total = sum(
                                    float(r.fees or (max(0.0, r.filled_notional or 0.0) * _active_fee_rate()))
                                    for r in exit_reports
                                )
                                exit_record = {
                                    "timestamp": now.isoformat(),
                                    "market_id": mid,
                                    "side": side,
                                    "reason": "tp_sl_stage1",
                                    "notional": round(filled_exit_notional, 4),
                                    "shares": round(exit_shares_filled, 6),
                                    "entry_yes": round(entry_yes, 6),
                                    "exit_yes": round(cur_yes_mark, 6),
                                    "pnl": round(pnl_stage, 6),
                                    "pnl_pct": round(pnl_pct_stage, 6),
                                    "fees": round(fees_total, 6),
                                    "pnl_after_fees": round(pnl_stage - fees_total, 6),
                                    "opened_at": pos.get("opened_at"),
                                    "holding_seconds": round((now - opened_at).total_seconds(), 3) if 'opened_at' in pos else None,
                                    "strategies": pos.get("strategies"),
                                    "liquidity_slices": slices_count,
                                    "slice_plan": exit_meta.get("slice_plan"),
                                }
                                _append_realized(exit_record)
                                _persist_trade_reports(
                                    exit_reports,
                                    event="exit_trim",
                                    market_id=mid,
                                    side=exit_action,
                                    strategies=pos.get("strategies"),
                                    reason="tp_sl_stage1",
                                    context={
                                        "position_side": side,
                                        "slice_plan": exit_meta.get("slice_plan"),
                                        "pnl": round(pnl_stage, 6),
                                        "pnl_pct": round(pnl_pct_stage, 6),
                                    },
                                )
                                try:
                                    exit_mid = _current_mid(snap.raw)
                                    if exit_mid is None:
                                        exit_mid = snap.raw.get("mid_price") or snap.raw.get("yes_price") or cur_yes_mark
                                    exit_mid = float(exit_mid)
                                    bid = snap.raw.get("bid"); ask = snap.raw.get("ask")
                                    spread = (float(ask) - float(bid)) if (bid is not None and ask is not None) else None
                                    if spread is None and bid is not None:
                                        try:
                                            spread = float(ask) - float(bid) if ask is not None else 0.0
                                        except (TypeError, ValueError):
                                            spread = 0.0
                                    if spread is None:
                                        spread = 0.0
                                    slippage = cur_yes_mark - exit_mid if side == "yes" else exit_mid - cur_yes_mark
                                    execution_mode = getattr(exec_eng, "execution_mode", "simulation")
                                    telemetry_payload = {
                                        "event": "exit",
                                        "market_id": mid,
                                        "side": side,
                                        "notional": round(filled_exit_notional, 6),
                                        "size": round(filled_exit_notional, 6),
                                        "exit_yes": round(cur_yes_mark, 6),
                                        "fill_price": cur_yes_mark,
                                        "reference_price": exit_mid,
                                        "slippage": slippage,
                                        "mid": exit_mid,
                                        "spread": round(float(spread), 6) if isinstance(spread, (int, float)) else None,
                                        "shares": round(exit_shares_filled, 6),
                                        "reason": "tp_sl_stage1",
                                        "fees": round(fees_total, 6),
                                        "execution_mode": execution_mode,
                                        "pnl": round(pnl_stage, 6),
                                        "pnl_pct": round(pnl_pct_stage, 6),
                                        "pnl_after_fees": exit_record.get("pnl_after_fees"),
                                        "strategies": pos.get("strategies"),
                                        "liquidity_slices": slices_count,
                                    }
                                    _record_fill(telemetry_payload)
                                except Exception:
                                    logger.debug("Failed to record partial exit fill", exc_info=True)

                                pos["notional"] = round(max(0.0, notional - filled_exit_notional), 6)
                                pos["shares"] = round(max(0.0, shares - exit_shares_filled), 6)
                                pos["tp_sl_stage"] = 1
                                pos["min_hold_secs"] = max(
                                    int(pos.get("min_hold_secs", EXIT_MIN_HOLD_SECONDS)), TIERED_TP_SL_EXTENDED_MIN_HOLD
                                )
                                pos["best_pnl_pct"] = min(pos.get("best_pnl_pct", 0.0), pnl_pct)
                                if STAGE1_COOLDOWN_SECONDS > 0:
                                    expiry = now + timedelta(seconds=STAGE1_COOLDOWN_SECONDS)
                                    stage1_cooldowns[mid] = expiry.isoformat()
                                    _save_stage1_cooldowns(stage1_cooldowns)
                                if pos["notional"] <= 1e-6 or pos["shares"] <= 1e-6:
                                    to_close.append(mid)
                                else:
                                    pos.setdefault("partial_exit", []).append(
                                        {
                                            "order_ids": [r.order_id for r in exit_reports],
                                            "filled_notional": round(filled_exit_notional, 6),
                                            "filled_shares": round(exit_shares_filled, 6),
                                            "exit_reason": "tp_sl_stage1",
                                            "slices": slices_count,
                                        }
                                    )
                                continue
                    stop_loss_threshold = EXIT_STOP_LOSS_PCT
                    if tiered_active and stage >= 1:
                        stop_loss_threshold = max(stop_loss_threshold, TIERED_TP_SL_HARD_STOP_PCT)

                    breakeven_stop = breakeven_triggered and age_min and pnl_pct <= 0.0
                    time_or_tp_sl = age_ok or pnl_pct <= -stop_loss_threshold or pnl_pct >= EXIT_TAKE_PROFIT_PCT or breakeven_stop
                    dead_zone = age_min and abs(edge) <= cost_budget
                    invalidation = age_min and (
                        (side == "yes" and edge < 0.0) or (side == "no" and edge > 0.0)
                    )
                    trailing = (pnl_pct >= 0.03) and ((best - pnl_pct) >= 0.02)

                    policy_simple = str(getattr(settings, "EXIT_POLICY_MODE", "advanced")).lower() == "simple"
                    strategy_exit_meta: Optional[Dict[str, Any]] = None
                    exit_reason: Optional[str] = None
                    should_exit = strategy_exit_forced
                    if strategy_close_payload:
                        decision = strategy_close_payload.get("decision")
                        strat_name = strategy_close_payload.get("strategy")
                        reason_label = getattr(decision, "reason", None) or "strategy_exit"
                        exit_reason = f"strategy_{strat_name}:{reason_label}"
                        strategy_exit_meta = {
                            "strategy": strat_name,
                            "decision_reason": getattr(decision, "reason", None),
                            "metadata": getattr(decision, "metadata", None),
                            "exclusive": strategy_close_payload.get("exclusive"),
                        }

                    if not should_exit and ((time_or_tp_sl) or (not policy_simple and (dead_zone or invalidation or trailing))):
                        should_exit = True
                        if pnl_pct <= -stop_loss_threshold:
                            exit_reason = "tp_sl_stage2" if (tiered_active and stage >= 1) else "tp_sl"
                        elif pnl_pct >= EXIT_TAKE_PROFIT_PCT:
                            exit_reason = "tp_sl"
                        elif breakeven_stop:
                            exit_reason = "breakeven"
                        elif dead_zone:
                            exit_reason = "dead_zone"
                        elif invalidation:
                            exit_reason = "invalidation"
                        elif trailing:
                            exit_reason = "trailing"
                        else:
                            exit_reason = "time"

                    if not should_exit:
                        continue

                    exit_action = "no" if side == "yes" else "yes"
                    try:
                        exit_reports, exit_meta = _execute_liquidity_aware_exit(
                            exec_eng,
                            order_tracker,
                            mid,
                            exit_action,
                            notional,
                            snap.raw,
                            cur_yes_mark,
                        )
                    except Exception:
                        logger.debug("Failed to execute liquidity-aware exit for %s", mid, exc_info=True)
                        continue
                    if not exit_reports:
                        logger.info("No exit orders generated for %s", mid)
                        continue

                    filled_exit_notional = sum(max(0.0, float(r.filled_notional or 0.0)) for r in exit_reports)
                    if filled_exit_notional <= 0.0:
                        pending_ids = ", ".join(
                            str(r.order_id) for r in exit_reports if getattr(r, "order_id", None)
                        ) or "n/a"
                        remaining_total = sum(max(0.0, getattr(r, "remaining_notional", 0.0)) for r in exit_reports)
                        logger.info(
                            "Exit orders pending fill for %s (orders=%s remaining %.4f)",
                            mid,
                            pending_ids,
                            remaining_total,
                        )
                        continue

                    fill_ratio_final = min(1.0, filled_exit_notional / notional) if notional > 0.0 else 1.0
                    exit_shares_filled = shares * fill_ratio_final
                    if (not exit_reason) or not exit_reason.startswith("strategy_"):
                        if pnl_pct <= -stop_loss_threshold:
                            exit_reason = "tp_sl_stage2" if (tiered_active and stage >= 1) else "tp_sl"
                        elif pnl_pct >= EXIT_TAKE_PROFIT_PCT:
                            exit_reason = "tp_sl"
                        elif dead_zone:
                            exit_reason = "dead_zone"
                        elif invalidation:
                            exit_reason = "invalidation"
                        elif trailing:
                            exit_reason = "trailing"
                        else:
                            exit_reason = "time"

                    to_close_flag = filled_exit_notional + 1e-6 >= notional
                    fees_exit = sum(
                        float(r.fees or (max(0.0, r.filled_notional or 0.0) * _active_fee_rate()))
                        for r in exit_reports
                    )
                    pnl_realized = exit_shares_filled * (
                        (cur_yes_mark - entry_yes) if side == "yes" else (entry_yes - cur_yes_mark)
                    )
                    pnl_pct_realized = pnl_realized / max(1e-9, filled_exit_notional)
                    slices_count = len(exit_reports)
                    holding_seconds_val: Optional[float] = None
                    if opened_at is not None:
                        try:
                            holding_seconds_val = round((now - opened_at).total_seconds(), 3)
                        except Exception:
                            holding_seconds_val = None
                    _persist_trade_reports(
                        exit_reports,
                        event="exit_fill",
                        market_id=mid,
                        side=exit_action,
                        strategies=pos.get("strategies"),
                        reason=exit_reason,
                        context={
                            "position_side": side,
                            "holding_seconds": holding_seconds_val,
                            "pnl": round(pnl_realized, 6),
                            "pnl_pct": round(pnl_pct_realized, 6),
                            "slice_plan": (exit_meta or {}).get("slice_plan"),
                        },
                    )
                    exit_record = {
                        "timestamp": now.isoformat(),
                        "market_id": mid,
                        "side": side,
                        "reason": exit_reason,
                        "notional": round(filled_exit_notional, 4),
                        "shares": round(exit_shares_filled, 6),
                        "entry_yes": round(entry_yes, 6),
                        "exit_yes": round(cur_yes_mark, 6),
                        "pnl": round(pnl_realized, 6),
                        "pnl_pct": round(pnl_pct_realized, 6),
                        "fees": round(fees_exit, 6),
                        "pnl_after_fees": round(pnl_realized - fees_exit, 6),
                        "opened_at": pos.get("opened_at"),
                        "holding_seconds": holding_seconds_val,
                        "strategies": pos.get("strategies"),
                        "liquidity_slices": slices_count,
                        "slice_plan": (exit_meta or {}).get("slice_plan"),
                    }
                    if strategy_exit_meta:
                        exit_record["strategy_exit"] = strategy_exit_meta
                    try:
                        _append_realized(exit_record)
                    except Exception:
                        logger.debug("Failed to append realized exit", exc_info=True)

                    exit_mid = cur_yes_mark
                    spread = 0.0
                    exit_mid_candidate = _current_mid(snap.raw)
                    if exit_mid_candidate is not None:
                        try:
                            exit_mid = float(exit_mid_candidate)
                        except (TypeError, ValueError):
                            pass
                    else:
                        fallback_mid = snap.raw.get("mid_price") or snap.raw.get("yes_price")
                        try:
                            if fallback_mid is not None:
                                exit_mid = float(fallback_mid)
                        except (TypeError, ValueError):
                            pass
                    bid = snap.raw.get("bid")
                    ask = snap.raw.get("ask")
                    try:
                        if bid is not None and ask is not None:
                            spread = float(ask) - float(bid)
                    except (TypeError, ValueError):
                        spread = 0.0
                    telemetry_payload = {
                        "event": "exit",
                        "market_id": mid,
                        "side": side,
                        "notional": round(filled_exit_notional, 6),
                        "size": round(filled_exit_notional, 6),
                        "exit_yes": round(cur_yes_mark, 6),
                        "fill_price": cur_yes_mark,
                        "reference_price": exit_mid,
                        "slippage": cur_yes_mark - exit_mid if side == "yes" else exit_mid - cur_yes_mark,
                        "mid": exit_mid,
                        "spread": round(float(spread), 6) if isinstance(spread, (int, float)) else None,
                        "shares": round(exit_shares_filled, 6),
                        "reason": exit_reason,
                        "fees": round(fees_exit, 6),
                        "execution_mode": getattr(exec_eng, "execution_mode", "simulation"),
                        "pnl": round(pnl_realized, 6),
                        "pnl_pct": round(pnl_pct_realized, 6),
                        "pnl_after_fees": exit_record.get("pnl_after_fees"),
                        "strategies": pos.get("strategies"),
                        "liquidity_slices": slices_count,
                    }
                    if strategy_exit_meta:
                        telemetry_payload["strategy_exit"] = strategy_exit_meta
                    try:
                        _record_fill(telemetry_payload)
                    except Exception:
                        logger.debug("Failed to record exit telemetry", exc_info=True)

                    if to_close_flag:
                        to_close.append(mid)
                    else:
                        pos["notional"] = round(max(0.0, notional - filled_exit_notional), 6)
                        pos["shares"] = round(max(0.0, shares - exit_shares_filled), 6)
                        pos.setdefault("partial_exit", []).append(
                            {
                                "order_ids": [r.order_id for r in exit_reports],
                                "filled_notional": round(filled_exit_notional, 6),
                                "filled_shares": round(exit_shares_filled, 6),
                                "exit_reason": exit_reason,
                                "slices": slices_count,
                            }
                        )
                    if tiered_active and exit_reason.startswith("tp_sl"):
                        pos["tp_sl_stage"] = max(stage, 2)
                    logger.info(
                        "[exit] %s reason=%s side=%s notional=%.2f shares=%.4f entry_yes=%.4f cur_yes=%.4f pnl%%=%.2f%% edge=%.3f cost=%.3f slices=%s",
                        mid,
                        exit_reason,
                        side,
                        filled_exit_notional,
                        exit_shares_filled,
                        entry_yes,
                        cur_yes_mark,
                        pnl_pct * 100.0,
                        edge,
                        cost_budget,
                        slices_count,
                    )
                    continue
                except Exception:
                    logger.debug("Failed to process exit evaluation for %s", mid, exc_info=True)
                    continue
            for mid in to_close:
                positions.pop(mid, None)
            _save_positions(positions)

            logger.info(
                "Loop summary: processed=%s approved=%s rejected=%s fallback=%s reason=%s",
                loop_stats["processed"],
                loop_stats["approved"],
                loop_stats["rejected"],
                fetch_info.get("fallback"),
                fetch_info.get("reason"),
            )
            if hold_reasons:
                logger.info("Hold reasons: %s", hold_reasons)
            if reject_reasons:
                logger.info("Reject reasons: %s", reject_reasons)

            # exposure snapshot for status
            try:
                initial_balance = float(getattr(settings.trading, "initial_balance", 10_000))
            except Exception:
                initial_balance = 10_000.0
            try:
                portfolio_bal = float(get_portfolio_state(db).get("balance", initial_balance))
            except Exception:
                portfolio_bal = initial_balance
            try:
                max_total_expo = float(getattr(settings.trading, "max_total_exposure", 0.35))
            except Exception:
                max_total_expo = 0.35
            current_expo = 0.0
            try:
                for p in positions.values():
                    current_expo += float(p.get("notional", 0.0) or 0.0)
            except Exception:
                current_expo = 0.0
            allowed_total = portfolio_bal * max_total_expo
            remaining_expo = max(0.0, allowed_total - current_expo)

            strategy_exposure_state: Dict[str, float] = {}
            try:
                for pos_data in positions.values():
                    notional_val = float(pos_data.get("notional", 0.0) or 0.0)
                    if notional_val <= 0:
                        continue
                    for strat_name in pos_data.get("strategies") or []:
                        if not strat_name:
                            continue
                        key = str(strat_name)
                        strategy_exposure_state[key] = strategy_exposure_state.get(key, 0.0) + notional_val
            except Exception:
                strategy_exposure_state = {}

            fee_snapshot = fee_manager.snapshot()
            strategy_readiness: Dict[str, Any] = {}
            try:
                validation_info = fetch_info.get("validation") if isinstance(fetch_info, dict) else None
            except Exception:
                validation_info = None
            if isinstance(validation_info, dict):
                coverage = validation_info.get("coverage")
                total_markets = validation_info.get("total")
                if isinstance(coverage, dict):
                    for name, stats in coverage.items():
                        stats = stats or {}
                        try:
                            ready_markets = int(stats.get("ready_markets", 0) or 0)
                        except Exception:
                            ready_markets = 0
                        try:
                            coverage_pct = float(stats.get("coverage_percentage", 0.0) or 0.0)
                        except Exception:
                            coverage_pct = 0.0
                        if coverage_pct >= 95.0:
                            readiness_state = "ready"
                        elif coverage_pct >= 70.0:
                            readiness_state = "watch"
                        else:
                            readiness_state = "degraded"
                        strategy_readiness[str(name)] = {
                            "ready_markets": ready_markets,
                            "coverage_pct": round(coverage_pct, 2),
                            "status": readiness_state,
                        }
                if total_markets is not None:
                    try:
                        strategy_readiness.setdefault("_meta", {})["total_markets"] = int(total_markets)
                    except Exception:
                        pass
            loop_ms = (time.monotonic() - t1) * 1000.0
            status_payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "loop_summary": loop_stats,
                "fetch_info": fetch_info,
                "open_positions": len(positions),
                "exposure": {
                    "current": round(current_expo, 6),
                    "allowed": round(allowed_total, 6),
                    "remaining": round(remaining_expo, 6),
                    "balance": round(portfolio_bal, 6),
                },
                "external_fills": {
                    "processed": int(ext_processed),
                    "opened": int(ext_opened),
                    "applied_same_side": int(ext_applied),
                    "reduced_opposite": int(ext_reduced),
                    "closed": int(ext_closed),
                    "last_seen": last_ext_seen_iso,
                },
                "io_errors": {
                    "orders": int(io_errors.get("orders", 0)),
                    "trades": int(io_errors.get("trades", 0)),
                    "status": int(io_errors.get("status", 0)),
                    "positions": int(io_errors.get("positions", 0)),
                },
                "risk_audit": {
                    "approved": int(risk_counts.get("approved", 0)),
                    "rejected": int(risk_counts.get("rejected", 0)),
                    "reasons": risk_counts.get("reasons", {}),
                },
                "strategy_risk": strategy_risk_counts or {},
                "reject_reasons": reject_reasons,
                "hold_reasons": hold_reasons,
                "timings": {"fetch_ms": round(t_fetch, 2), "loop_ms": round(loop_ms, 2)},
                "next_sleep_seconds": next_sleep,
                "flags": flags,
                "validation_coverage_pct": round(validation_cov, 2) if validation_cov is not None else None,
                "mode": runtime_mode,
                "slippage_model": getattr(settings.execution, "slippage_model", "taker"),
                "exit_policy_mode": getattr(settings, "EXIT_POLICY_MODE", "advanced"),
                "fees": {
                    "taker": round(fee_snapshot.taker_fee, 6),
                    "maker": round(fee_snapshot.maker_fee, 6),
                    "source": fee_snapshot.source,
                },
                "strategy_readiness": strategy_readiness or None,
                "strategy_config": {
                    "signal_floor": getattr(settings, "STRATEGY_SIGNAL_FLOOR", None),
                    "consensus_min": getattr(settings, "STRATEGY_CONSENSUS_MIN", None),
                    "max_risk_level": getattr(settings, "STRATEGY_MAX_RISK_LEVEL", None),
                    "min_volume_24h": getattr(settings, "STRATEGY_MIN_VOLUME_24H", None),
                    "max_spread_bps": getattr(settings, "STRATEGY_MAX_SPREAD_BPS", None),
                    "max_orders_per_loop": getattr(settings.trading, "max_orders_per_loop", None),
                    "max_open_positions": getattr(settings.trading, "max_open_positions", None),
                    "config_reload_seconds": getattr(settings, "CONFIG_RELOAD_SECONDS", None),
                },
            }
            # Attach kill-switch status for UI
            try:
                if ks is not None:
                    status_payload["kill_switch"] = {
                        "active": bool(getattr(ks, "active", False)),
                        "reason": getattr(ks, "reason", None),
                        "day_pnl": float(getattr(ks, "day_pnl", 0.0) or 0.0),
                        "limit_pct": float(getattr(ks, "limit_pct", 0.0) or 0.0),
                        "limit_usd": float(getattr(ks, "limit_usd", 0.0) or 0.0),
                        "triggered_at": getattr(ks, "triggered_at", None),
                        "cooldown_minutes": float(getattr(ks, "cooldown_minutes", 0.0) or 0.0),
                        "cooldown_remaining_minutes": float(getattr(ks, "cooldown_remaining_minutes", 0.0) or 0.0),
                        "recovery_mode": bool(getattr(ks, "recovery_mode", False)),
                    }
                if per_market_blocked:
                    status_payload.setdefault("kill_switch", {})["market_guards"] = {
                        "blocked_count": len(per_market_blocked),
                        "threshold": per_market_threshold if per_market_threshold != float("inf") else None,
                    }
            except Exception:
                pass
            execution_summary = order_tracker.summary(limit=5)
            status_payload["execution"] = execution_summary

            if strategy_hold_summary:
                status_payload["strategy_hold_counts"] = {
                    name: int(count) for name, count in strategy_hold_summary.items()
                }
            if strategy_reject_summary:
                status_payload["strategy_reject_counts"] = {
                    name: int(count) for name, count in strategy_reject_summary.items()
                }
            try:
                store_snapshot = _store_preview(limit=3)
                if any(store_snapshot.values()):
                    status_payload["order_store"] = store_snapshot
            except Exception:
                logger.debug("Failed to snapshot order store", exc_info=True)

            rest_metrics = {}
            try:
                rest_metrics = dict((fetch_info or {}).get("rest_metrics") or {})
            except Exception:
                rest_metrics = {}
            if rest_metrics:
                status_payload["rpc_metrics"] = {
                    "rest": rest_metrics,
                    "requests": rest_metrics.get("requests"),
                    "errors_429": rest_metrics.get("429s"),
                    "inflight_peak": rest_metrics.get("inflight_peak"),
                    "current_inflight": rest_metrics.get("current_inflight"),
                }
            sentiment_metrics = {}
            try:
                sentiment_metrics = dict((fetch_info or {}).get("sentiment") or {})
            except Exception:
                sentiment_metrics = {}
            if sentiment_metrics:
                status_payload["sentiment"] = sentiment_metrics
            if risk_reports:
                status_payload["risk_last"] = risk_reports[-1]
            if strategy_caps:
                status_payload["strategy_exposure"] = {
                    "current": {name: round(value, 6) for name, value in strategy_exposure_state.items()},
                    "caps": {name: float(cap) for name, cap in strategy_caps.items()},
                }
            # augment pipeline status with realized summary if present (best-effort)
            try:
                if REALIZED_SUMMARY_PATH.exists():
                    status_payload["realized"] = json.loads(REALIZED_SUMMARY_PATH.read_text(encoding="utf-8"))
            except Exception:
                logger.debug("Failed to embed realized summary in pipeline status", exc_info=True)
            if ks:
                status_payload["kill_switch"] = {
                    "active": ks.active,
                    "reason": ks.reason,
                    "day_pnl": ks.day_pnl,
                    "limit_pct": ks.limit_pct,
                    "limit_usd": ks.limit_usd,
                    "triggered_at": ks.triggered_at,
                    "cooldown_minutes": ks.cooldown_minutes,
                    "cooldown_remaining_minutes": ks.cooldown_remaining_minutes,
                    "recovery_mode": ks.recovery_mode,
                    "enabled": getattr(ks, "enabled", daily_enabled),
                    "reset_hour": reset_hour,
                }
            if freq_enabled and freq_interval > 0:
                status_payload["order_frequency"] = {
                    "enabled": freq_enabled,
                    "interval_seconds": freq_interval,
                    "max_orders": freq_max_orders,
                    "current_window": len(order_frequency_window),
                }
            if per_strategy_freq_cfg:
                strat_freq_status: Dict[str, Dict[str, Any]] = {}
                for name, cfg in per_strategy_freq_cfg.items():
                    window = strategy_frequency_windows.get(name) or deque()
                    # do not mutate state, make a copy to count
                    count = len(window)
                    strat_freq_status[name] = {
                        "interval_seconds": int(cfg.get("interval_seconds", 0) or 0),
                        "max_orders": int(cfg.get("max_orders", 0) or 0),
                        "current_window": count,
                    }
                status_payload["strategy_order_frequency"] = strat_freq_status
                # Compact per-market tracking summary (counts by strategy)
                if strategy_market_frequency_windows:
                    strat_market_counts: Dict[str, int] = {}
                    for sname, _mid in strategy_market_frequency_windows.keys():
                        strat_market_counts[sname] = strat_market_counts.get(sname, 0) + 1
                    status_payload["strategy_market_order_frequency"] = strat_market_counts
                # Compact per-side and per-market-side tracking summaries
                if strategy_side_frequency_windows:
                    strat_side_counts: Dict[str, int] = {}
                    for sname, _side in strategy_side_frequency_windows.keys():
                        strat_side_counts[sname] = strat_side_counts.get(sname, 0) + 1
                    status_payload["strategy_side_order_frequency"] = strat_side_counts
                if strategy_market_side_frequency_windows:
                    strat_mkt_side_counts: Dict[str, int] = {}
                    for sname, _mid, _side in strategy_market_side_frequency_windows.keys():
                        strat_mkt_side_counts[sname] = strat_mkt_side_counts.get(sname, 0) + 1
                    status_payload["strategy_market_side_order_frequency"] = strat_mkt_side_counts
            try:
                order_tracker.prune_completed(keep_latest=True)
            except Exception:
                logger.debug("Failed to prune completed orders", exc_info=True)
            try:
                STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
                STATUS_PATH.write_text(json.dumps(status_payload, indent=2), encoding="utf-8")
            except Exception:
                logger.debug("Failed to write pipeline status", exc_info=True)
                try:
                    io_errors["status"] = int(io_errors.get("status", 0)) + 1
                except Exception:
                    pass

            # Post-write threshold alerts (based on latest payload)
            try:
                ioe = status_payload.get("io_errors", {}) or {}
                io_sum = int(ioe.get("orders", 0)) + int(ioe.get("trades", 0)) + int(ioe.get("status", 0)) + int(ioe.get("positions", 0))
                if io_sum > last_io_sum:
                    alerts.send_alert("I/O write errors increasing", metadata={"delta": io_sum - last_io_sum, "total": io_sum})
                    last_io_sum = io_sum
                fetch = status_payload.get("fetch_info") or {}
                rest = fetch.get("orders_rest") or {}
                rest_errs = int(rest.get("errors", 0) or 0)
                if rest_errs > last_rest_errors and rest_errs >= 5:
                    alerts.send_alert("Order REST polling errors accumulating", metadata={"errors": rest_errs})
                    last_rest_errors = rest_errs
                if fetch.get("fallback") and not settings.OFFLINE_MODE:
                    if fallback_start is None:
                        fallback_start = datetime.now(timezone.utc)
                    else:
                        elapsed = (datetime.now(timezone.utc) - fallback_start).total_seconds()
                        if elapsed >= 300:
                            alerts.send_alert("Fallback active over 5 minutes", metadata={"elapsed_seconds": int(elapsed)})
                            fallback_start = datetime.now(timezone.utc)
                else:
                    fallback_start = None
            except Exception:
                logger.debug("threshold alerts eval failed", exc_info=True)

            # Periodically rebuild realized summary from JSONL (idempotent)
            try:
                _rebuild_realized_summary()
            except Exception:
                logger.debug("Failed to rebuild realized summary", exc_info=True)

            await asyncio.sleep(next_sleep)

        except Exception as exc:  # pragma: no cover - safety net
            alerts.send_alert(f"Main loop error: {exc}")
            await asyncio.sleep(60)
    # Apply external fills (WS/REST JSONL) into open positions before decisioning
    try:
        max_seen: Optional[datetime] = None
        def _parse_ts(v: Any) -> Optional[datetime]:
            if v is None:
                return None
            if isinstance(v, datetime):
                return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
            try:
                if isinstance(v, (int, float)):
                    return datetime.fromtimestamp(float(v), tz=timezone.utc)
                s = str(v)
                if s.endswith("Z"):
                    s = s.replace("Z", "+00:00")
                return datetime.fromisoformat(s)
            except Exception:
                return None
        since_dt = last_ext_trades_dt
        new_trades = list(order_store.iter_trades(since=since_dt)) if since_dt else list(order_store.iter_trades())
        for rec in new_trades:
            ts = _parse_ts(rec.get("timestamp"))
            if ts and (max_seen is None or ts > max_seen):
                max_seen = ts
                last_ext_seen_iso = ts.isoformat()
            mode = str(rec.get("execution_mode") or "").lower()
            if mode not in {"order_ws", "order_rest"}:
                continue
            mid = rec.get("market_id")
            side = rec.get("action") or rec.get("side")
            if not mid or not side:
                continue
            try:
                price = float(rec.get("average_price") or rec.get("price"))
            except Exception:
                price = None
            shares = rec.get("filled_shares")
            notional = rec.get("notional")
            try:
                shares_val = float(shares) if shares is not None else None
            except Exception:
                shares_val = None
            try:
                notional_val = float(notional) if notional is not None else None
            except Exception:
                notional_val = None
            if (notional_val is None or notional_val <= 0) and (shares_val is not None and price is not None):
                notional_val = shares_val * float(price)
            if (shares_val is None or shares_val <= 0) and (notional_val is not None and price is not None and float(price) > 0):
                shares_val = notional_val / float(price)
            if notional_val is None or notional_val <= 0 or shares_val is None or shares_val <= 0:
                continue
            ext_processed += 1
            pos = positions.get(mid)
            if pos and str(pos.get("side")).lower() != str(side).lower():
                # Opposite-side external fill; reduce existing position proportionally by notional
                try:
                    pos_notional = float(pos.get("notional", 0.0) or 0.0)
                    pos_shares = float(pos.get("shares", 0.0) or 0.0)
                except Exception:
                    pos_notional = 0.0; pos_shares = 0.0
                if pos_notional <= 0 or pos_shares <= 0:
                    continue
                reduce_notional = min(pos_notional, float(notional_val))
                reduce_ratio = reduce_notional / max(pos_notional, 1e-9)
                reduce_shares = pos_shares * reduce_ratio
                # Realized PnL estimation using exit price if available
                try:
                    entry_yes = float(pos.get("entry_yes"))
                except Exception:
                    entry_yes = None
                try:
                    exit_yes = float(price) if price is not None else None
                except Exception:
                    exit_yes = None
                side_pos = str(pos.get("side")).lower()
                pos["notional"] = round(max(0.0, pos_notional - reduce_notional), 6)
                pos["shares"] = round(max(0.0, pos_shares - reduce_shares), 6)
                ext_reduced += 1
                # Append realized record if we can evaluate a mark
                try:
                    if entry_yes is not None and exit_yes is not None and reduce_shares > 0:
                        pnl_realized = reduce_shares * ((exit_yes - entry_yes) if side_pos == "yes" else (entry_yes - exit_yes))
                        fees_exit = reduce_notional * _active_fee_rate()
                        exit_record = {
                            "timestamp": (ts or datetime.now(timezone.utc)).isoformat() if ts else datetime.now(timezone.utc).isoformat(),
                            "market_id": mid,
                            "side": side_pos,
                            "reason": "external_opposite_fill",
                            "notional": round(reduce_notional, 6),
                            "shares": round(reduce_shares, 6),
                            "entry_yes": round(entry_yes, 6),
                            "exit_yes": round(exit_yes, 6),
                            "pnl": round(pnl_realized, 6),
                            "pnl_pct": round(pnl_realized / max(1e-9, reduce_notional), 6),
                            "fees": round(fees_exit, 6),
                            "pnl_after_fees": round(pnl_realized - fees_exit, 6),
                            "opened_at": pos.get("opened_at"),
                            "holding_seconds": None,
                            "strategies": pos.get("strategies"),
                        }
                        _append_realized(exit_record)
                        # Telemetry
                        try:
                            _record_fill({
                                "event": "exit",
                                "market_id": mid,
                                "side": side_pos,
                                "notional": round(reduce_notional, 6),
                                "fill_price": exit_yes,
                                "reference_price": exit_yes,
                                "slippage": 0.0,
                                "fees": round(fees_exit, 6),
                                "shares": round(reduce_shares, 6),
                                "execution_mode": mode,
                            })
                        except Exception:
                            pass
                except Exception:
                    logger.debug("Failed to record realized PnL for external opposite fill", exc_info=True)
                # Close if position effectively zero
                if pos["notional"] <= 1e-6 or pos["shares"] <= 1e-6:
                    positions.pop(mid, None)
                    ext_closed += 1
                _save_positions(positions)
                continue
            if not pos:
                # Seed a minimal position from external fill
                positions[mid] = {
                    "market_id": mid,
                    "side": str(side).lower(),
                    "notional": round(float(notional_val), 6),
                    "shares": round(float(shares_val), 6),
                    "original_notional": round(float(notional_val), 6),
                    "original_shares": round(float(shares_val), 6),
                    "entry_yes": (float(price) if price is not None else 0.5),
                    "entry_score": 0.0,
                    "entry_risk_level": "UNKNOWN",
                    "hold_secs": getattr(settings, "EXIT_HOLDING_SECONDS", 300),
                    "min_hold_secs": getattr(settings, "EXIT_MIN_HOLD_SECONDS", 120),
                    "opened_at": (ts or datetime.now(timezone.utc)).isoformat() if ts else datetime.now(timezone.utc).isoformat(),
                    "best_pnl_pct": 0.0,
                    "tp_sl_stage": 0,
                    "trim_ratio": TIERED_TP_SL_TRIM_RATIO,
                    "strategies": [],
                    "strategy_states": {},
                    "open_orders": [],
                }
                ext_opened += 1
            else:
                pos["notional"] = round(float(pos.get("notional", 0.0)) + float(notional_val), 6)
                pos["shares"] = round(float(pos.get("shares", 0.0)) + float(shares_val), 6)
                ext_applied += 1
            _save_positions(positions)
            try:
                db.upsert_position(positions.get(mid) or {})
            except Exception:
                pass
        if max_seen is not None:
            try:
                last_ext_trades_dt = max_seen + timedelta(milliseconds=1)
            except Exception:
                last_ext_trades_dt = max_seen
    except Exception:
        logger.debug("Failed to integrate external trades into positions", exc_info=True)
