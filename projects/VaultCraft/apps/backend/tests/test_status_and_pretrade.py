from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_status_endpoint(monkeypatch):
    c = TestClient(app)
    r = c.get("/api/v1/status")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True and "flags" in body and "network" in body


def test_pretrade(monkeypatch):
    c = TestClient(app)
    # Allowed by default settings: ETH
    r1 = c.get("/api/v1/pretrade", params={"symbol": "ETH", "size": 1.0, "side": "buy"})
    assert r1.status_code == 200 and r1.json()["ok"] is True
    # Invalid size
    r2 = c.get("/api/v1/pretrade", params={"symbol": "ETH", "size": 0.0, "side": "buy"})
    assert r2.status_code == 200 and r2.json()["ok"] is False

