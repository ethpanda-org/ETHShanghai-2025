import pytest

from polymarket.strategies import StrategyEngine
from polymarket.strategies.simple import MicroArbitrageStrategy


@pytest.fixture()
def engine() -> StrategyEngine:
    return StrategyEngine(
        {
            "mean_reversion": {
                "enabled": True,
                "weight": 0.5,
                "params": {"min_confidence": 0.2, "mid_target": 0.5, "sensitivity": 0.15},
            },
            "momentum_scalping": {
                "enabled": True,
                "weight": 0.5,
                "params": {"min_confidence": 0.2, "threshold": 0.01},
            },
        }
    )


def _order_for(engine: StrategyEngine, data: dict) -> dict:
    payload = {"market_id": "T1", **data}
    return engine.generate_order(payload)


def test_combined_strategy_generates_trade(engine: StrategyEngine) -> None:
    order = _order_for(
        engine,
        {
            "bid": 0.42,
            "ask": 0.48,
            "price_change_24h": 0.07,
            "volatility": 0.12,
        },
    )
    assert order["action"] in {"yes", "no"}
    assert order["size"] > 0
    meta = order.get("metadata", {})
    strategies = meta.get("strategies", [])
    assert strategies, "expected strategy contributions in metadata"
    assert meta.get("decision") == "execute"


def test_weak_signal_results_in_hold(engine: StrategyEngine) -> None:
    order = _order_for(
        engine,
        {
            "bid": 0.49,
            "ask": 0.51,
            "price_change_24h": 0.0,
        },
    )
    assert order["action"] == "hold"
    assert order["size"] == 0
    meta = order.get("metadata", {})
    assert meta.get("decision") == "hold"
    assert meta.get("reason") in {"weak_signal", "no_signal"}


def test_insufficient_consensus_requires_multiple_strategies(engine: StrategyEngine) -> None:
    order = _order_for(
        engine,
        {
            "bid": 0.40,
            "ask": 0.50,
            "price_change_24h": 0.0,
            "volatility": 0.10,
        },
    )
    assert order["action"] == "hold"
    meta = order.get("metadata", {})
    assert meta.get("decision") == "hold"
    assert meta.get("reason") in {"insufficient_consensus", "insufficient_edge", "weak_signal"}
    contribs = meta.get("strategies") or []
    assert len(contribs) == 1, "expected single strategy contribution when consensus fails"
    assert contribs[0].get("name") in {"mean_reversion", "momentum_scalping"}


def test_micro_arbitrage_respects_external_spread_cap() -> None:
    strat = MicroArbitrageStrategy(
        min_confidence=0.3,
        min_spread=0.05,
        taker_fee=0.003,
        min_net_edge=0.005,
        external_spread_max=0.05,
        min_local_liquidity=50.0,
        external_fee=0.001,
    )
    market = {
        "external_bid": 0.58,
        "external_ask": 0.66,
        "bid": 0.46,
        "ask": 0.50,
        "external_real": True,
        "liquidity_yes": 100.0,
    }
    assert strat.evaluate(market) is None, "expected strategy to skip when external spread too wide"
    market["external_ask"] = 0.62
    decision = strat.evaluate(market)
    assert decision is not None
    assert decision.confidence >= strat.min_confidence


def test_micro_arbitrage_requires_liquidity() -> None:
    strat = MicroArbitrageStrategy(
        min_confidence=0.3,
        min_spread=0.02,
        taker_fee=0.003,
        min_net_edge=0.003,
        external_spread_max=0.05,
        min_local_liquidity=200.0,
        external_fee=0.001,
    )
    market = {
        "external_bid": 0.55,
        "external_ask": 0.565,
        "bid": 0.52,
        "ask": 0.53,
        "external_real": True,
        "liquidity_yes": 50.0,
    }
    assert strat.evaluate(market) is None, "expected insufficient local liquidity to block signal"
    market["liquidity_yes"] = 500.0
    decision = strat.evaluate(market)
    assert decision is not None
    assert decision.metadata.get("local_liquidity") == 500.0


def test_event_driven_recency_decay() -> None:
    from polymarket.strategies.simple import EventDrivenStrategy

    strat = EventDrivenStrategy(
        min_confidence=0.1,
        volume_threshold=1000.0,
        max_age_seconds=600,
        decay_half_life_seconds=300,
    )
    base_market = {
        "bid": 0.45,
        "ask": 0.55,
        "volume_24h": 5000.0,
        "news_sentiment": 0.6,
        "sentiment_source": "news",
        "sentiment_updated_at": 60.0,
        "liquidity_yes": 500.0,
    }
    fresh = strat.evaluate(base_market)
    assert fresh is not None
    assert fresh.metadata["age_seconds"] == 60.0
    old_market = dict(base_market)
    old_market["sentiment_updated_at"] = 1200.0
    assert strat.evaluate(old_market) is None


def test_momentum_strategy_volatility_normalisation() -> None:
    from polymarket.strategies.simple import MomentumStrategy

    strat = MomentumStrategy(min_confidence=0.0, threshold=0.02)
    base_market = {
        "bid": 0.45,
        "ask": 0.55,
        "price_change_24h": 0.06,
        "volume_24h": 20_000,
        "liquidity_yes": 5_000,
        "liquidity_no": 5_000,
    }
    low_vol = strat.evaluate(base_market)
    assert low_vol is not None
    high_vol_market = dict(base_market)
    high_vol_market["volatility"] = 0.5
    high_vol = strat.evaluate(high_vol_market)
    assert high_vol is not None
    assert abs(high_vol.metadata["normalized_momentum"]) < abs(low_vol.metadata["normalized_momentum"])
