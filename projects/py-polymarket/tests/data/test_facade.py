import asyncio

import pytest

from config import settings
from polymarket.data.facade import DataIngestionFacade


@pytest.fixture()
def offline_settings():
    original_offline = settings.OFFLINE_MODE
    original_proxy = settings.PROXY_URL
    settings.OFFLINE_MODE = True
    settings.PROXY_URL = None
    try:
        yield
    finally:
        settings.OFFLINE_MODE = original_offline
        settings.PROXY_URL = original_proxy


def test_data_facade_offline_snapshot(offline_settings):
    async def run():
        facade = DataIngestionFacade(use_graphql=False, ttl_seconds=0)
        markets = await facade.get_markets(force_refresh=True)
        return markets

    markets = asyncio.run(run())
    assert len(markets) >= 2
    first = markets[0]
    assert first.market_id.startswith("SIM-")
    assert 0 <= first.bid <= 1


def test_data_facade_cache_metadata(offline_settings):
    async def run():
        facade = DataIngestionFacade(use_graphql=False, ttl_seconds=60)
        await facade.get_markets(force_refresh=True)
        return facade.cache_metadata()

    meta = asyncio.run(run())
    assert meta is not None
    assert meta["count"] > 0
    assert meta["age_s"] >= 0
    assert meta["ttl"] >= 0


def test_data_facade_order_book_offline(offline_settings):
    async def run():
        facade = DataIngestionFacade(use_graphql=False, ttl_seconds=0)
        return await facade.get_order_book("SIM-1")

    order_book = asyncio.run(run())
    assert "bids" in order_book and "asks" in order_book

def test_rest_failure_falls_back_to_offline(monkeypatch):
    original_offline = settings.OFFLINE_MODE
    settings.OFFLINE_MODE = False

    class FailingProvider:
        async def fetch_markets(self):
            raise RuntimeError("boom")

    try:
        facade = DataIngestionFacade(use_graphql=False, ttl_seconds=0, limit=2)
        facade._rest_provider = FailingProvider()  # type: ignore[assignment]
        facade._graphql_provider = None

        markets = asyncio.run(facade.get_markets(force_refresh=True))
        fetch_info = facade.last_fetch_info()
    finally:
        settings.OFFLINE_MODE = original_offline

    assert markets
    assert all(ticker.market_id.startswith("SIM-") for ticker in markets)
    assert fetch_info.get("fallback") is True
    assert fetch_info.get("reason") in {"rest_exception", "rest_empty_payload"}
