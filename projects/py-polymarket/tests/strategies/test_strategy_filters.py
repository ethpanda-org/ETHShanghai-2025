from polymarket.strategies.simple import (
    MeanReversionStrategy,
    MicroArbitrageStrategy,
    MomentumStrategy,
)


def test_mean_reversion_blocks_negative_momentum_on_long():
    strategy = MeanReversionStrategy(
        min_confidence=0.1,
        sensitivity=0.1,
        min_deviation=0.02,
        require_non_negative_momentum=True,
    )
    market = {
        "bid": 0.40,
        "ask": 0.50,
        "price_change_1h": -0.01,
    }
    assert strategy.evaluate(market) is None


def test_mean_reversion_allows_short_with_positive_momentum():
    strategy = MeanReversionStrategy(
        min_confidence=0.1,
        sensitivity=0.1,
        min_deviation=0.02,
        require_non_negative_momentum=True,
    )
    market = {
        "bid": 0.60,
        "ask": 0.70,
        "price_change_1h": 0.01,
    }
    decision = strategy.evaluate(market)
    assert decision is not None
    assert decision.bias < 0  # prefers "no"


def test_micro_arbitrage_requires_liquidity():
    strategy = MicroArbitrageStrategy(
        min_confidence=0.0,
        min_local_liquidity=2000.0,
        min_net_edge=0.005,
        min_spread=0.03,
    )
    base_market = {
        "external_real": True,
        "bid": 0.45,
        "ask": 0.48,
        "external_bid": 0.53,
        "external_ask": 0.56,
    }
    lacking_liquidity = dict(base_market, order_liquidity=500.0)
    assert strategy.evaluate(lacking_liquidity) is None

    liquid_market = dict(base_market, order_liquidity=5000.0)
    decision = strategy.evaluate(liquid_market)
    assert decision is not None


def test_micro_arbitrage_internal_reference_signal():
    strategy = MicroArbitrageStrategy(
        min_confidence=0.1,
        min_local_liquidity=0.0,
        internal_edge_threshold=0.01,
        allow_external_fallback=False,
    )
    market = {
        "bid": 0.40,
        "ask": 0.42,
        "order_liquidity": 5000.0,
        "yes_price": 0.41,
        "internal_micro_refs": [
            {
                "market_id": "ref_market",
                "yes_price": 0.47,
                "volume_24h": 50000.0,
            }
        ],
    }
    decision = strategy.evaluate(market)
    assert decision is not None
    assert decision.metadata.get("mode") == "internal"


def test_micro_arbitrage_uses_net_edge_formula():
    strategy = MicroArbitrageStrategy(
        min_confidence=0.0,
        min_local_liquidity=1000.0,
        min_net_edge=0.01,
        min_spread=0.05,
    )
    market = {
        "external_real": True,
        "bid": 0.40,
        "ask": 0.44,
        "external_bid": 0.50,
        "external_ask": 0.54,
        "order_liquidity": 5000.0,
    }
    decision = strategy.evaluate(market)
    assert decision is not None
    assert decision.bias > 0  # longs yes because external bid is richer


def test_momentum_conflict_with_mean_reversion_requires_high_confidence():
    strategy = MomentumStrategy(
        min_confidence=0.0,
        threshold=0.005,
        require_consistency_1h=False,
    )
    conflict_market = {
        "price_change_24h": -0.006,
        "volatility": 0.08,
        "bid": 0.30,
        "ask": 0.40,
    }
    # mean reversion favors long (mid < 0.5), momentum favors short but confidence is low
    assert strategy.evaluate(conflict_market) is None

    aligned_market = dict(conflict_market, volatility=0.005, price_change_24h=-0.02)
    decision = strategy.evaluate(aligned_market)
    assert decision is not None
