from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.price_provider import PriceRouter
from app.hyper_client import HyperHTTP


def test_markets_pairs_from_deployments(monkeypatch, tmp_path, capsys):
    # monkeypatch deployments file path by changing CWD temporarily via monkeypatch.chdir
    d = tmp_path / "deployments"
    d.mkdir()
    (d / "hyper-testnet.json").write_text('{"config":{"pairs":[{"symbol":"BTC","leverage":3}]}}')
    monkeypatch.chdir(tmp_path)
    c = TestClient(app)
    r = c.get("/api/v1/markets")
    assert r.status_code == 200
    assert r.json()["pairs"] == [{"symbol":"BTC","leverage":3}]


def test_price_endpoint_with_monkeypatched_client(monkeypatch):
    def fake_get_index_prices(self, symbols):
        return {s: 123.0 for s in symbols}

    monkeypatch.setattr(HyperHTTP, "get_index_prices", fake_get_index_prices)
    c = TestClient(app)
    r = c.get("/api/v1/price", params={"symbols": "BTC,ETH"})
    assert r.status_code == 200
    assert r.json()["prices"] == {"BTC": 123.0, "ETH": 123.0}


def test_vaults_and_vault_detail(monkeypatch):
    # Make NAV deterministic by fixing router prices
    def fake_prices(self, symbols):
        return {s: 1000.0 for s in symbols}
    monkeypatch.setattr(PriceRouter, "get_index_prices", fake_prices)
    c = TestClient(app)
    r = c.get("/api/v1/vaults")
    assert r.status_code == 200
    vaults = r.json()["vaults"]
    assert isinstance(vaults, list) and len(vaults) >= 1

    vid = vaults[0]["id"]
    r2 = c.get(f"/api/v1/vaults/{vid}")
    assert r2.status_code == 200
    body = r2.json()
    assert body["id"] == vid and "metrics" in body and "unitNav" in body
