from __future__ import annotations

import json
from fastapi.testclient import TestClient

from app.positions import get_profile, set_profile
from app.main import app


def test_positions_read_write(tmp_path, monkeypatch):
    store = tmp_path / "positions.json"
    monkeypatch.setenv("POSITIONS_FILE", str(store))
    vid = "0xabc"
    set_profile(vid, {"cash": 1000, "positions": {"BTC": 0.1, "ETH": -0.2}, "denom": 1000})
    prof = get_profile(vid)
    assert prof["cash"] == 1000
    assert prof["positions"] == {"BTC": 0.1, "ETH": -0.2}
    assert prof["denom"] == 1000


def test_nav_uses_positions(tmp_path, monkeypatch):
    store = tmp_path / "positions.json"
    monkeypatch.setenv("POSITIONS_FILE", str(store))
    vid = "0xnav"
    set_profile(vid, {"cash": 1000.0, "positions": {"BTC": 1.0}, "denom": 1000.0})
    # Monkeypatch price provider by targeting PriceRouter in app scope
    from app import main as main_mod

    def fake_prices(self, symbols):
        return {s: 1000.0 for s in symbols}

    monkeypatch.setattr(main_mod.PriceRouter, "get_index_prices", fake_prices)
    c = TestClient(app)
    r = c.get(f"/api/v1/nav/{vid}", params={"window": 3})
    assert r.status_code == 200
    nav = r.json()["nav"]
    # cash 1000 + 1*1000 price = 2000, denom 1000 -> unit nav = 2.0
    assert all(abs(x - 2.0) < 1e-9 for x in nav)

