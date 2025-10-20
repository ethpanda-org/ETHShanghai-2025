from __future__ import annotations

from typing import Any, Dict
import time

import httpx

from .settings import Settings


class AlertManager:
    def __init__(self) -> None:
        self._nav_highs: Dict[str, float] = {}
        self._last_sent: Dict[str, float] = {}

    def _settings(self) -> Settings:
        return Settings()

    def _cooldown_permits(self, key: str, cooldown: float) -> bool:
        now = time.time()
        last = self._last_sent.get(key)
        if last is not None and now - last < cooldown:
            return False
        self._last_sent[key] = now
        return True

    def _send(self, message: str, context: Dict[str, Any] | None = None) -> None:
        settings = self._settings()
        url = settings.ALERT_WEBHOOK_URL
        if not url:
            return
        payload = message
        if context:
            extra = ", ".join(f"{k}={v}" for k, v in context.items())
            if extra:
                payload = f"{message} | {extra}"
        try:
            httpx.get(url, params={"message": payload}, timeout=5.0)
        except Exception:
            pass

    def on_nav(self, vault: str, nav: float) -> None:
        settings = self._settings()
        if not settings.ALERT_WEBHOOK_URL:
            return
        high = self._nav_highs.get(vault)
        if high is None or nav > high:
            self._nav_highs[vault] = nav
            return
        if high <= 0:
            return
        drawdown = (high - nav) / high
        if drawdown < settings.ALERT_NAV_DRAWDOWN_PCT:
            return
        cooldown = float(settings.ALERT_COOLDOWN_SEC or 0.0)
        key = f"{vault}:nav"
        if not self._cooldown_permits(key, cooldown):
            return
        pct = round(drawdown * 100, 2)
        self._send(
            f"[VaultCraft] Vault {vault} NAV drawdown {pct:.2f}%",
            {"nav": f"{nav:.4f}", "peak": f"{high:.4f}"},
        )
        self._nav_highs[vault] = nav

    def on_event(self, vault: str, event: Dict[str, Any]) -> None:
        settings = self._settings()
        if not settings.ALERT_WEBHOOK_URL:
            return
        status = str(event.get("status", "")).lower()
        if status not in {"error", "rejected"}:
            return
        event_type = str(event.get("type", "event"))
        cooldown = float(settings.ALERT_COOLDOWN_SEC or 0.0)
        key = f"{vault}:{event_type}:{status}"
        if not self._cooldown_permits(key, cooldown):
            return
        detail = event.get("error") or event.get("payload")
        context: Dict[str, Any] = {"type": event_type, "status": status}
        if detail is not None:
            context["detail"] = detail
        self._send(f"[VaultCraft] {event_type} {status}", context)


manager = AlertManager()

