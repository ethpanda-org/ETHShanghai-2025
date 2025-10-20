from __future__ import annotations

from app.price_provider import PriceRouter, SDKPriceProvider, RestPriceProvider
from app.price_provider import CachedPriceRouter


def test_router_prefers_sdk_when_enabled(monkeypatch):
    # Force settings via monkeypatch of SDKPriceProvider.available and method
    monkeypatch.setenv("ENABLE_HYPER_SDK", "1")

    class FakeSDK(SDKPriceProvider):
        @staticmethod
        def available() -> bool:  # type: ignore[override]
            return True

        def get_index_prices(self, symbols):  # type: ignore[override]
            return {s: 111.0 for s in symbols}

    # Inject fake into router instance
    router = PriceRouter()
    router.sdk = FakeSDK()
    prices = router.get_index_prices(["BTC", "ETH"])
    assert prices == {"BTC": 111.0, "ETH": 111.0}


def test_router_falls_back_to_rest(monkeypatch):
    monkeypatch.setenv("ENABLE_HYPER_SDK", "1")

    class FailSDK(SDKPriceProvider):
        @staticmethod
        def available() -> bool:  # type: ignore[override]
            return True

        def get_index_prices(self, symbols):  # type: ignore[override]
            raise RuntimeError("sdk failure")

    class FakeRest(RestPriceProvider):
        def get_index_prices(self, symbols):  # type: ignore[override]
            return {s: 222.0 for s in symbols}

    router = PriceRouter()
    router.sdk = FailSDK()
    router.rest = FakeRest(api_base="https://example.invalid")
    prices = router.get_index_prices(["BTC", "ETH"])
    assert prices == {"BTC": 222.0, "ETH": 222.0}


def test_cached_router_uses_last_good_on_failure(monkeypatch):
    calls = {"n": 0}

    class FlakyRouter(PriceRouter):
        def get_index_prices(self, symbols):  # type: ignore[override]
            calls["n"] += 1
            if calls["n"] == 1:
                return {s: 111.0 for s in symbols}
            raise RuntimeError("network down")

    cr = CachedPriceRouter(router=FlakyRouter(), ttl_seconds=0.01)
    ok = cr.get_index_prices(["BTC"])  # primes cache and last_good
    assert ok == {"BTC": 111.0}
    bad = cr.get_index_prices(["BTC"])  # should return last_good instead of raising
    assert bad == {"BTC": 111.0}
