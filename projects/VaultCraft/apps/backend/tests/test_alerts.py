from __future__ import annotations

from typing import Any, Dict, List, Tuple

import pytest

from app import alerts, events


def test_alert_manager_nav_drawdown(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ALERT_WEBHOOK_URL", "http://example.com")
    monkeypatch.setenv("ALERT_COOLDOWN_SEC", "0")
    monkeypatch.setenv("ALERT_NAV_DRAWDOWN_PCT", "0.05")

    calls: List[Tuple[str, Dict[str, Any]]] = []

    def fake_get(url: str, params: Dict[str, Any] | None = None, timeout: float | None = None) -> None:
        calls.append((url, params or {}))

    monkeypatch.setattr(alerts.httpx, "get", fake_get)
    mgr = alerts.AlertManager()

    mgr.on_nav("vault", 1.0)  # establish high watermark
    mgr.on_nav("vault", 0.96)  # <5% drop, no alert
    assert calls == []

    mgr.on_nav("vault", 0.9)  # 10% drop, should alert
    assert len(calls) == 1
    assert calls[0][0] == "http://example.com"
    assert "message" in calls[0][1]

    mgr.on_nav("vault", 0.85)
    assert len(calls) == 2


def test_event_store_triggers_alert(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ALERT_WEBHOOK_URL", "http://example.com")
    monkeypatch.setenv("ALERT_COOLDOWN_SEC", "0")

    calls: List[Tuple[str, Dict[str, Any]]] = []

    def fake_get(url: str, params: Dict[str, Any] | None = None, timeout: float | None = None) -> None:
        calls.append((url, params or {}))

    monkeypatch.setattr(alerts.httpx, "get", fake_get)
    mgr = alerts.AlertManager()
    monkeypatch.setattr(events, "alert_manager", mgr)

    store = events.EventStore()
    store.add("vault1", {"type": "exec_open", "status": "ok"})
    assert calls == []  # no alert for ok status

    store.add("vault1", {"type": "exec_open", "status": "error", "error": "failed to execute"})
    assert len(calls) == 1
    assert calls[0][0] == "http://example.com"
