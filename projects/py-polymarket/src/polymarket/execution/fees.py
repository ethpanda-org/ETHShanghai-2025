"""Fee schedule management for Polymarket venues."""

from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass, field
from typing import Optional

import requests

from config import settings

logger = logging.getLogger(__name__)


@dataclass
class FeeSchedule:
    """Simple fee schedule representation."""

    maker_fee: float
    taker_fee: float
    source: str = "config"
    refreshed_at: float = field(default_factory=time.time)


class FeeManager:
    """Keep an up-to-date fee schedule with optional live refresh."""

    def __init__(self, *, refresh_seconds: Optional[int] = None) -> None:
        self._maker_fee = float(getattr(settings, "MAKER_FEE", 0.0))
        self._taker_fee = float(getattr(settings, "TAKER_FEE", 0.005))
        self._source = "config"
        self._last_refresh = 0.0
        try:
            default_ttl = int(os.getenv("FEE_SCHEDULE_REFRESH_SECONDS", "600"))
        except ValueError:
            default_ttl = 600
        self._refresh_seconds = refresh_seconds if refresh_seconds is not None else max(60, default_ttl)
        self._lock = threading.Lock()

    def _should_refresh(self) -> bool:
        return (time.monotonic() - self._last_refresh) >= self._refresh_seconds

    def refresh(self, *, force: bool = False) -> None:
        with self._lock:
            if not force and not self._should_refresh():
                return
            try:
                schedule = self._fetch_live_schedule()
            except Exception:
                logger.debug("Live fee schedule fetch failed", exc_info=True)
                self._last_refresh = time.monotonic()
                return
            if schedule is None:
                self._last_refresh = time.monotonic()
                return
            maker = schedule.get("maker_fee")
            taker = schedule.get("taker_fee")
            try:
                if maker is not None:
                    self._maker_fee = max(0.0, float(maker))
                if taker is not None:
                    self._taker_fee = max(0.0, float(taker))
                    self._source = schedule.get("source", "live")
                    self._last_refresh = time.monotonic()
                    logger.info(
                        "Fee schedule refreshed from %s (maker=%.4f taker=%.4f)",
                        self._source,
                        self._maker_fee,
                        self._taker_fee,
                    )
            except (TypeError, ValueError):
                logger.debug("Invalid fee data from schedule: %s", schedule)
                self._last_refresh = time.monotonic()

    def _fetch_live_schedule(self) -> Optional[dict]:
        base_url = settings.CLOB_REST_URL.rstrip("/")
        endpoint = f"{base_url}/fees"
        try:
            resp = requests.get(endpoint, timeout=3.0)
        except Exception as exc:
            logger.debug("Fee schedule request to %s failed: %s", endpoint, exc)
            return None
        if resp.status_code != 200:
            logger.debug("Fee schedule request returned %s", resp.status_code)
            return None
        try:
            data = resp.json()
        except ValueError:
            logger.debug("Fee schedule response is not JSON")
            return None
        maker = (
            data.get("makerFee")
            or data.get("maker_fee")
            or data.get("maker")
        )
        taker = (
            data.get("takerFee")
            or data.get("taker_fee")
            or data.get("taker")
        )
        if maker is None and taker is None:
            return None
        return {"maker_fee": maker, "taker_fee": taker, "source": "live"}

    @property
    def maker_fee(self) -> float:
        self.refresh()
        return self._maker_fee

    @property
    def taker_fee(self) -> float:
        self.refresh()
        return self._taker_fee

    def snapshot(self) -> FeeSchedule:
        return FeeSchedule(
            maker_fee=self.maker_fee,
            taker_fee=self.taker_fee,
            source=self._source,
            refreshed_at=self._last_refresh,
        )


_FEE_MANAGER: Optional[FeeManager] = None


def get_fee_manager() -> FeeManager:
    global _FEE_MANAGER
    if _FEE_MANAGER is None:
        _FEE_MANAGER = FeeManager()
    return _FEE_MANAGER


__all__ = ["FeeManager", "FeeSchedule", "get_fee_manager"]
