from datetime import datetime, timedelta, timezone

from polymarket.strategies.mean_reversion import PredictionMarketMeanReversion


def _seed_history(strategy: PredictionMarketMeanReversion, market_id: str, prices) -> None:
    now = datetime.now(timezone.utc)
    for idx, price in enumerate(prices):
        timestamp = now - timedelta(minutes=len(prices) - idx)
        strategy.update_market_data(market_id, price, volume=100.0, timestamp=timestamp)


def test_mean_reversion_resolved_market_purges_state() -> None:
    strat = PredictionMarketMeanReversion(lookback_period=10, reversion_confidence_threshold=0.0)
    strat.min_volatility = 1e-4
    prices = [0.4 + 0.01 * i for i in range(12)]
    _seed_history(strat, "TEST-RESOLVE", prices)
    assert "TEST-RESOLVE" in strat.price_history

    signal = strat.generate_signal("TEST-RESOLVE", 0.55, {"resolved": True})
    assert signal is None
    assert "TEST-RESOLVE" not in strat.price_history
    assert "TEST-RESOLVE" not in strat._metrics_cache


def test_mean_reversion_metrics_cache_reused() -> None:
    strat = PredictionMarketMeanReversion(lookback_period=10, reversion_confidence_threshold=0.0)
    strat.min_volatility = 1e-4
    prices = [0.1 + 0.05 * i for i in range(20)]
    _seed_history(strat, "TEST-CACHE", prices)

    market_data = {"active": True, "volatility": 0.2}
    latest_ts = strat.price_history["TEST-CACHE"][-1][0]
    metrics = strat._calculate_metrics("TEST-CACHE", 0.85, market_data)
    assert metrics is not None
    strat._metrics_cache["TEST-CACHE"] = {"timestamp": latest_ts, "metrics": metrics}

    call_counter = {"count": 0}
    original_calc = strat._calculate_metrics

    def wrapped_calc(*args, **kwargs):
        call_counter["count"] += 1
        return original_calc(*args, **kwargs)

    strat._calculate_metrics = wrapped_calc
    first = strat.generate_signal("TEST-CACHE", 0.85, market_data)
    second = strat.generate_signal("TEST-CACHE", 0.85, market_data)

    assert strat._metrics_cache["TEST-CACHE"]["metrics"] is metrics
    assert call_counter["count"] == 0

