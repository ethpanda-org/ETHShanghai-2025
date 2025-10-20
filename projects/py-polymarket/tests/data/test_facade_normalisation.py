from polymarket.data.facade import DataIngestionFacade
from polymarket.services.market_service import MarketSnapshot


def test_price_change_normalisation(monkeypatch):
    facade = DataIngestionFacade(use_graphql=False, ttl_seconds=0, limit=1)

    def fake_get_markets(*args, **kwargs):
        market = {
            "market_id": "TEST",
            "bid": 0.4,
            "ask": 0.6,
            "price_change_24h": 12.0,
            "price_change_1h": -250.0,
            "momentum": 600.0,
        }
        ticker = facade._to_ticker(market)
        return [ticker]

    monkeypatch.setattr(facade, "get_markets", fake_get_markets)
    snapshots = facade.get_markets()
    snap = snapshots[0]
    assert abs(snap.raw["price_change_24h"]) <= 1.0
    assert abs(snap.raw["price_change_1h"]) <= 1.0
    assert abs(snap.raw["momentum"]) <= 1.0


def test_orderbook_depth_notional():
    facade = DataIngestionFacade(use_graphql=False, ttl_seconds=0, limit=1)
    market = {
        "market_id": "DEPTH",
        "bid": 0.5,
        "ask": 0.6,
        "orderbook": {
            "asks": [
                {"price": 0.6, "size": 10},
                {"price": 0.62, "size": 5},
            ],
            "bids": [
                {"price": 0.5, "size": 8},
                {"price": 0.48, "size": 4},
            ],
        },
    }
    ticker = facade._to_ticker(market)
    raw = ticker.raw
    assert abs(raw.get("depth_yes_notional") - (0.6 * 10 + 0.62 * 5)) < 1e-6
    assert abs(raw.get("depth_no_notional") - (0.5 * 8 + 0.48 * 4)) < 1e-6
