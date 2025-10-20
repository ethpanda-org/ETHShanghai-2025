"""Trade telemetry recorder with schema enforcement."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Optional, Sequence

from config import settings

TELEMETRY_PATH: Path = getattr(settings, "TRADE_TELEMETRY_PATH", Path.cwd() / "reports" / "fills.jsonl")
REQUIRED_FIELDS: Sequence[str] = ("event", "market_id", "side", "notional", "execution_mode")


def _coerce_timestamp(value: Optional[str] = None) -> str:
    if value:
        return value
    return datetime.now(timezone.utc).isoformat()


def _normalise_record(record: Dict[str, Any]) -> Dict[str, Any]:
    payload = dict(record)
    payload["timestamp"] = _coerce_timestamp(payload.get("timestamp"))
    payload.setdefault("event", payload.get("type"))
    payload.setdefault("execution_mode", "simulation")
    for field in REQUIRED_FIELDS:
        if field not in payload:
            raise ValueError(f"telemetry record missing required field '{field}'")
    # Round numeric helpers for compactness
    for key in ("notional", "fill_price", "reference_price", "slippage", "fees", "mid", "spread"):
        value = payload.get(key)
        if isinstance(value, (int, float)):
            payload[key] = round(float(value), 6)
    return payload


def record_fill(record: Dict[str, Any]) -> None:
    payload = _normalise_record(record)
    TELEMETRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with TELEMETRY_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload) + "\n")


__all__ = ["record_fill", "TELEMETRY_PATH"]
