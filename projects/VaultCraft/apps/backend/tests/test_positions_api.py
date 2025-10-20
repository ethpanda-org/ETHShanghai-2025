from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_positions_get_set(tmp_path, monkeypatch):
    monkeypatch.setenv("POSITIONS_FILE", str(tmp_path / "positions.json"))
    c = TestClient(app)
    vid = "0xapi"
    r1 = c.get(f"/api/v1/positions/{vid}")
    assert r1.status_code == 200
    body = r1.json()
    assert "cash" in body and "positions" in body and "denom" in body

    r2 = c.post(f"/api/v1/positions/{vid}", json={"cash": 1000.0, "positions": {"ETH": 2.0}, "denom": 2000.0})
    assert r2.status_code == 200 and r2.json()["ok"] is True
    r3 = c.get(f"/api/v1/positions/{vid}")
    assert r3.status_code == 200
    prof = r3.json()
    assert prof["cash"] == 1000.0 and prof["positions"]["ETH"] == 2.0 and prof["denom"] == 2000.0

