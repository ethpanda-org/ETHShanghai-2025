"""Lightweight persistence helpers for orders and trade fills."""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, Iterator, Mapping, MutableMapping, Optional, Sequence


class OrderStore:
    """Append-only JSONL recorders for orders and trade fills with simple readers."""

    def __init__(
        self,
        *,
        orders_path: Optional[Path] = None,
        trades_path: Optional[Path] = None,
    ) -> None:
        self._orders_path = orders_path or Path("reports") / "orders.jsonl"
        self._trades_path = trades_path or Path("reports") / "trades.jsonl"
        self._orders_path.parent.mkdir(parents=True, exist_ok=True)
        self._trades_path.parent.mkdir(parents=True, exist_ok=True)

    def append_order(self, record: Mapping[str, object]) -> None:
        """Persist order submission metadata."""
        self._append_jsonl(self._orders_path, record)

    def append_trade(self, record: Mapping[str, object]) -> None:
        """Persist execution fill metadata."""
        self._append_jsonl(self._trades_path, record)

    def iter_orders(
        self,
        *,
        limit: Optional[int] = None,
        since: Optional[datetime] = None,
    ) -> Iterator[Dict[str, Any]]:
        """Yield order records, optionally filtered by timestamp or limited in count."""
        yield from self._iter_jsonl(self._orders_path, limit=limit, since=since)

    def iter_trades(
        self,
        *,
        limit: Optional[int] = None,
        since: Optional[datetime] = None,
    ) -> Iterator[Dict[str, Any]]:
        """Yield trade records, optionally filtered by timestamp or limited in count."""
        yield from self._iter_jsonl(self._trades_path, limit=limit, since=since)

    def load_orders(
        self,
        *,
        limit: Optional[int] = None,
        since: Optional[datetime] = None,
    ) -> Sequence[Dict[str, Any]]:
        """Return order records as a list."""
        return list(self.iter_orders(limit=limit, since=since))

    def load_trades(
        self,
        *,
        limit: Optional[int] = None,
        since: Optional[datetime] = None,
    ) -> Sequence[Dict[str, Any]]:
        """Return trade records as a list."""
        return list(self.iter_trades(limit=limit, since=since))

    @staticmethod
    def _append_jsonl(path: Path, record: Mapping[str, object]) -> None:
        payload: MutableMapping[str, object] = dict(record)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False, default=OrderStore._json_default) + "\n")

    @classmethod
    def _iter_jsonl(
        cls,
        path: Path,
        *,
        limit: Optional[int],
        since: Optional[datetime],
    ) -> Iterator[Dict[str, Any]]:
        if not path.exists():
            return []
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except Exception:
            return []
        records: list[Dict[str, Any]] = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                parsed = json.loads(line)
            except Exception:
                continue
            if isinstance(parsed, dict):
                records.append(parsed)
        since_dt = cls._coerce_datetime(since)
        if since_dt is not None:
            filtered: list[Dict[str, Any]] = []
            for rec in records:
                rec_ts = cls._record_timestamp(rec)
                if rec_ts is None or rec_ts >= since_dt:
                    filtered.append(rec)
            records = filtered
        if limit is not None and limit > 0 and len(records) > limit:
            records = records[-limit:]
        for rec in records:
            yield rec

    @classmethod
    def _record_timestamp(cls, record: Mapping[str, Any]) -> Optional[datetime]:
        if not isinstance(record, Mapping):
            return None
        for key in ("timestamp", "created_at", "updated_at", "time"):
            value = record.get(key)
            dt = cls._coerce_datetime(value)
            if dt is not None:
                return dt
        return None

    @classmethod
    def _coerce_datetime(cls, value: Any) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return cls._normalise_dt(value)
        if isinstance(value, date) and not isinstance(value, datetime):
            return cls._normalise_dt(datetime.combine(value, datetime.min.time()))
        if isinstance(value, (int, float)):
            try:
                return datetime.fromtimestamp(float(value), tz=timezone.utc)
            except Exception:
                return None
        if isinstance(value, str):
            cleaned = value.strip()
            if not cleaned:
                return None
            try:
                if cleaned.endswith("Z"):
                    parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
                else:
                    parsed = datetime.fromisoformat(cleaned)
            except Exception:
                return None
            return cls._normalise_dt(parsed)
        return None

    @staticmethod
    def _normalise_dt(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _json_default(value: Any) -> Any:
        if isinstance(value, datetime):
            return OrderStore._normalise_dt(value).isoformat()
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, Path):
            return str(value)
        return str(value)


__all__ = ["OrderStore"]
