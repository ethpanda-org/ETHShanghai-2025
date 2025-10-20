"""Trading limit helpers (e.g., daily kill-switch).

This module provides functions to evaluate runtime limits using persisted
artifacts (e.g., realized_exits.jsonl) so they can be unit-tested easily.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class KillSwitchResult:
    active: bool
    reason: Optional[str]
    day_pnl: float
    limit_pct: float
    limit_usd: float
    triggered_at: Optional[str] = None
    cooldown_minutes: float = 0.0
    cooldown_remaining_minutes: float = 0.0
    recovery_mode: bool = False
    enabled: bool = True


def _parse_timestamp(ts: str) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return None


def _shifted_date(dt: datetime, reset_hour: int) -> str:
    if reset_hour:
        dt = dt - timedelta(hours=reset_hour)
    return dt.date().isoformat()


def check_daily_kill_switch(
    *,
    initial_balance: float,
    limit_pct: float,
    limit_usd: float = 0.0,
    cooldown_minutes: float = 0.0,
    base_dir: Path | None = None,
    now: datetime | None = None,
    enabled: bool = True,
    reset_hour: int = 0,
) -> KillSwitchResult:
    """Return whether daily realized loss exceeds configured limits.

    - limit_pct: fraction of initial_balance; e.g., 0.02 => 2% max daily loss
    - limit_usd: absolute USD loss cap; 0 disables absolute cap
    """
    base = base_dir or Path("reports")
    exits_path = base / "realized_exits.jsonl"
    state_path = base / "kill_switch_state.json"

    now = now or datetime.now(timezone.utc)
    reset_hour = int(reset_hour or 0)
    today = _shifted_date(now, reset_hour)
    cooldown_minutes = max(0.0, float(cooldown_minutes or 0.0))
    if not enabled:
        return KillSwitchResult(
            active=False,
            reason=None,
            day_pnl=0.0,
            limit_pct=limit_pct,
            limit_usd=limit_usd,
            triggered_at=None,
            cooldown_minutes=cooldown_minutes,
            cooldown_remaining_minutes=0.0,
            recovery_mode=False,
            enabled=False,
        )
    day_pnl = 0.0
    if exits_path.exists():
        for line in exits_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            ts = rec.get("timestamp")
            if not ts:
                continue
            dt = _parse_timestamp(ts)
            if not dt or _shifted_date(dt, reset_hour) != today:
                continue
            try:
                day_pnl += float(rec.get("pnl_after_fees", rec.get("pnl", 0.0)))
            except Exception:
                continue

    # thresholds
    pct_cap = -abs(initial_balance * float(limit_pct)) if limit_pct else float("inf")
    usd_cap = -abs(float(limit_usd)) if limit_usd else float("inf")
    threshold = min(pct_cap, usd_cap)
    limits_disabled = pct_cap == float("inf") and usd_cap == float("inf")

    cooldown_remaining = 0.0
    triggered_at: Optional[str] = None
    recovery_mode = False

    def _load_state() -> Dict[str, Any]:
        if not state_path.exists():
            return {}
        try:
            return json.loads(state_path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _save_state(payload: Dict[str, Any]) -> None:
        try:
            state_path.parent.mkdir(parents=True, exist_ok=True)
            state_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except Exception:
            pass

    state = _load_state()
    if state:
        triggered = state.get("triggered_at")
        trig_dt = _parse_timestamp(triggered) if triggered else None
        if trig_dt and _shifted_date(trig_dt, reset_hour) == today:
            triggered_at = trig_dt.isoformat()
        else:
            triggered_at = None
    if not limits_disabled and day_pnl <= threshold:
        if not triggered_at:
            triggered_at = now.isoformat()
        reason = None
        active = True
        if day_pnl <= pct_cap and pct_cap != float("inf"):
            reason = "pct_limit"
        if day_pnl <= usd_cap and usd_cap != float("inf"):
            reason = "usd_limit" if reason is None else f"{reason}/usd_limit"
        if cooldown_minutes > 0:
            try:
                trig_dt = datetime.fromisoformat(triggered_at.replace("Z", "+00:00"))
            except Exception:
                trig_dt = now
            elapsed = now - trig_dt
            remaining = max(0.0, cooldown_minutes * 60.0 - elapsed.total_seconds())
            cooldown_remaining = round(remaining / 60.0, 4)
            if remaining <= 0:
                active = False
                recovery_mode = True
                reason = None
        state_payload = {
            "triggered_at": triggered_at,
            "latest_day_pnl": day_pnl,
            "cooldown_minutes": cooldown_minutes,
            "reset_hour": reset_hour,
        }
        _save_state(state_payload)
        return KillSwitchResult(
            active=active,
            reason=reason,
            day_pnl=day_pnl,
            limit_pct=limit_pct,
            limit_usd=limit_usd,
            triggered_at=triggered_at,
            cooldown_minutes=cooldown_minutes,
            cooldown_remaining_minutes=cooldown_remaining if active else 0.0,
            recovery_mode=recovery_mode,
            enabled=True,
        )

    # no longer breaching thresholds -> remove state
    if not limits_disabled:
        try:
            if state_path.exists():
                state_path.unlink()
        except Exception:
            pass
    return KillSwitchResult(
        active=False,
        reason=None,
        day_pnl=day_pnl,
        limit_pct=limit_pct,
        limit_usd=limit_usd,
        triggered_at=None,
        cooldown_minutes=cooldown_minutes,
        cooldown_remaining_minutes=0.0,
        recovery_mode=False,
        enabled=True,
    )


from typing import Set, Tuple


def per_market_daily_loss_guard(
    *,
    initial_balance: float,
    limit_pct: float = 0.0,
    limit_usd: float = 0.0,
    base_dir: Path | None = None,
    now: datetime | None = None,
    enabled: bool = True,
    reset_hour: int = 0,
) -> Tuple[Set[str], Dict[str, float], float]:
    """Return blocked markets for the current UTC day based on realized loss.

    - Groups `reports/realized_exits.jsonl` by `market_id` for the shifted day (respecting `reset_hour`).
    - Blocks markets whose day PnL after fees is below the threshold, where threshold is the
      tighter of percentage and absolute caps (negative values), similar to the global kill-switch.

    Returns (blocked_market_ids, pnl_by_market, threshold_value).
    """
    blocked: Set[str] = set()
    pnl_by_market: Dict[str, float] = {}
    if not enabled:
        return blocked, pnl_by_market, float("inf")
    base = base_dir or Path("reports")
    exits_path = base / "realized_exits.jsonl"
    now = now or datetime.now(timezone.utc)
    today = _shifted_date(now, int(reset_hour or 0))
    if exits_path.exists():
        try:
            for line in exits_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                ts = rec.get("timestamp")
                dt = _parse_timestamp(ts) if ts else None
                if not dt or _shifted_date(dt, int(reset_hour or 0)) != today:
                    continue
                mid = str(rec.get("market_id") or "")
                if not mid:
                    continue
                try:
                    pnl = float(rec.get("pnl_after_fees", rec.get("pnl", 0.0)))
                except Exception:
                    pnl = 0.0
                pnl_by_market[mid] = pnl_by_market.get(mid, 0.0) + pnl
        except Exception:
            # On IO/parse failure, fail open (no additional blocking)
            return set(), {}, float("inf")
    pct_cap = -abs(initial_balance * float(limit_pct)) if limit_pct else float("inf")
    usd_cap = -abs(float(limit_usd)) if limit_usd else float("inf")
    threshold = min(pct_cap, usd_cap)
    if threshold == float("inf"):
        return set(), pnl_by_market, threshold
    for mid, pnl in pnl_by_market.items():
        if pnl <= threshold:
            blocked.add(mid)
    return blocked, pnl_by_market, threshold


__all__ = [
    "check_daily_kill_switch",
    "KillSwitchResult",
    "per_market_daily_loss_guard",
]
