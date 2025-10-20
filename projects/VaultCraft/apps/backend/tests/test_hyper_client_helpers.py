from __future__ import annotations

from app.hyper_client import HyperHTTP


def test_get_index_prices_with_monkeypatch(monkeypatch):
    http = HyperHTTP(api_base="https://example.invalid")

    def fake_get(self, path, params=None):
        assert path in ("indexPrices", "info")
        syms = (params or {}).get("symbols", "").split(",")
        return {"prices": {s: 1000.0 + i for i, s in enumerate(syms) if s}}

    monkeypatch.setattr(HyperHTTP, "get", fake_get)
    prices = http.get_index_prices(["BTC", "ETH"])
    assert prices == {"BTC": 1000.0, "ETH": 1001.0}


def test_get_markets_with_monkeypatch(monkeypatch):
    http = HyperHTTP(api_base="https://example.invalid")

    def fake_get(self, path, params=None):
        assert path == "info"
        return {"symbols": ["BTC", "ETH"]}

    monkeypatch.setattr(HyperHTTP, "get", fake_get)
    data = http.get_markets()
    assert data["symbols"] == ["BTC", "ETH"]
