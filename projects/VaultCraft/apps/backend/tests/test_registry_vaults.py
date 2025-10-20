from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_vaults_from_positions_and_detail(tmp_path, monkeypatch):
    # Prepare positions with a deterministic profile
    store = tmp_path / "positions.json"
    monkeypatch.setenv("POSITIONS_FILE", str(store))
    from app.positions import set_profile
    vid = "0xfeed"
    set_profile(vid, {"cash": 1000.0, "positions": {"ETH": 1.0}, "denom": 1000.0})

    # Fix prices
    from app import main as main_mod

    def fake_prices(self, symbols):
        return {s: 2000.0 for s in symbols}

    # Reset caches to avoid interference from previous tests
    try:
        main_mod._price_provider.cache.clear()
        main_mod._price_provider.last_good.clear()
    except Exception:
        pass
    monkeypatch.setattr(type(main_mod._price_provider), "get_index_prices", fake_prices)

    c = TestClient(app)
    r = c.get("/api/v1/vaults")
    assert r.status_code == 200
    vaults = r.json()["vaults"]
    assert any(v["id"] == vid for v in vaults)

    r2 = c.get(f"/api/v1/vaults/{vid}")
    assert r2.status_code == 200
    body = r2.json()
    # cash 1000 + 1*2000 = 3000 → unitNav 3.0, aum 3000, denom 1000
    assert abs(body["unitNav"] - 3.0) < 1e-9
    assert body["aum"] == 3000
    assert body["totalShares"] == 1000
