from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_events_pagination_and_filter(monkeypatch):
    c = TestClient(app)
    vid = "0xevt"
    # generate events via exec endpoints (dry-run)
    c.post("/api/v1/exec/open", params={"vault": vid, "symbol": "ETH", "size": 0.1, "side": "buy"})
    c.post("/api/v1/exec/close", params={"vault": vid, "symbol": "ETH", "size": 0.1})
    r1 = c.get(f"/api/v1/events/{vid}")
    assert r1.status_code == 200
    all_events = r1.json()["events"]
    assert len(all_events) >= 2
    # filter by type
    r2 = c.get(f"/api/v1/events/{vid}", params={"types": "exec_open"})
    only_open = r2.json()["events"]
    assert all(e["type"] == "exec_open" for e in only_open)
    # limit
    r3 = c.get(f"/api/v1/events/{vid}", params={"limit": 1})
    assert len(r3.json()["events"]) == 1


def test_nav_series_since(monkeypatch):
    c = TestClient(app)
    vid = "0xnavs"
    # write three snapshots with manual nav
    c.post(f"/api/v1/nav/snapshot/{vid}", params={"nav": 1.0, "ts": 100.0})
    c.post(f"/api/v1/nav/snapshot/{vid}", params={"nav": 1.1, "ts": 200.0})
    c.post(f"/api/v1/nav/snapshot/{vid}", params={"nav": 1.2, "ts": 300.0})
    r = c.get(f"/api/v1/nav_series/{vid}", params={"since": 150})
    series = r.json()["series"]
    assert [round(p["nav"], 2) for p in series] == [1.1, 1.2]

