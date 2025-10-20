from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.events import store as event_store
from app.positions import get_profile


def test_exec_open_dry_run(tmp_path, monkeypatch):
    # Isolate positions store
    store = tmp_path / "positions.json"
    monkeypatch.setenv("POSITIONS_FILE", str(store))
    monkeypatch.setenv("ENABLE_LIVE_EXEC", "0")
    c = TestClient(app)
    # direct call, validation will use defaults (ETH allowed, large limits)
    r = c.post("/api/v1/exec/open", params={"symbol": "ETH", "size": 1.0, "side": "buy", "reduce_only": True, "leverage": 5, "vault": "0xv"})
    assert r.status_code == 200
    body = r.json()
    assert body["dry_run"] is True and body["payload"]["type"] == "open"
    ev = event_store.list("0xv")
    assert any(e.get("type") == "exec_open" and e.get("status") == "dry_run" for e in ev)
    # positions updated and snapshot recorded
    prof = get_profile("0xv")
    assert abs(prof["positions"].get("ETH", 0.0) - 1.0) < 1e-9


def test_exec_close_dry_run(tmp_path, monkeypatch):
    store = tmp_path / "positions.json"
    monkeypatch.setenv("POSITIONS_FILE", str(store))
    monkeypatch.setenv("ENABLE_LIVE_EXEC", "0")
    c = TestClient(app)
    # seed an open first
    c.post("/api/v1/exec/open", params={"symbol": "ETH", "size": 1.0, "side": "buy", "vault": "0xv"})
    r = c.post("/api/v1/exec/close", params={"symbol": "ETH", "size": 0.5, "vault": "0xv"})
    assert r.status_code == 200
    body = r.json()
    assert body["dry_run"] is True and body["payload"]["type"] == "close"
    ev = event_store.list("0xv")
    assert any(e.get("type") == "exec_close" and e.get("status") == "dry_run" for e in ev)
    prof = get_profile("0xv")
    # After close of 0.5 from 1.0 → 0.5
    assert abs(prof["positions"].get("ETH", 0.0) - 0.5) < 1e-9
