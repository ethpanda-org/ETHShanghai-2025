import asyncio

from apps.simulation import simulate
from config import settings


def test_simulation_offline_generates_orders():
    original_offline = settings.OFFLINE_MODE
    original_consensus = getattr(settings, "STRATEGY_CONSENSUS_MIN", 2)
    original_strategy_consensus = getattr(getattr(settings, "strategy", object()), "consensus_min", original_consensus)
    try:
        setattr(settings, "STRATEGY_CONSENSUS_MIN", 1)
        if hasattr(settings, "strategy"):
            setattr(settings.strategy, "consensus_min", 1)
        results = asyncio.run(simulate(markets=2, offline=True, limit=5))
    finally:
        settings.OFFLINE_MODE = original_offline
        setattr(settings, "STRATEGY_CONSENSUS_MIN", original_consensus)
        if hasattr(settings, "strategy"):
            setattr(settings.strategy, "consensus_min", original_strategy_consensus)

    assert isinstance(results, list)
    assert results, "expected at least one simulated order"
    for result in results:
        assert result.market_id
        assert result.action in {"yes", "no"}
        assert result.size > 0
        assert result.risk_metadata["approved"] in {True, False}
        assert "strategies" in result.strategy_metadata
