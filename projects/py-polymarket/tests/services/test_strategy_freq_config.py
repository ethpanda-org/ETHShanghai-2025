from types import SimpleNamespace

from polymarket.services import runner


def test_strategy_frequency_config_parsing_simple(monkeypatch):
    cfg = {
        "micro_arbitrage": {"max_orders": 3, "interval_seconds": 60, "per_market": True},
    }
    # Patch top-level setting to avoid needing a full trading namespace
    monkeypatch.setattr(runner, "settings", SimpleNamespace(TRADING_STRATEGY_ORDER_FREQUENCY=cfg), raising=False)
    out = runner._get_strategy_frequency_configs()
    assert "micro_arbitrage" in out
    mic = out["micro_arbitrage"]
    assert mic["max_orders"] == 3 and mic["interval_seconds"] == 60
    assert isinstance(mic.get("per_market"), dict)
    assert mic["per_market"]["max_orders"] == 3
    assert mic["per_market"]["interval_seconds"] == 60


def test_strategy_frequency_config_parsing_nested(monkeypatch):
    cfg = {
        "mean_reversion": {
            "max_orders": 2,
            "interval_seconds": 30,
            "per_market": {"max_orders": 1, "interval_seconds": 15},
        }
    }
    monkeypatch.setattr(runner, "settings", SimpleNamespace(TRADING_STRATEGY_ORDER_FREQUENCY=cfg), raising=False)
    out = runner._get_strategy_frequency_configs()
    assert "mean_reversion" in out
    mr = out["mean_reversion"]
    assert mr["max_orders"] == 2 and mr["interval_seconds"] == 30
    assert isinstance(mr.get("per_market"), dict)
    assert mr["per_market"]["max_orders"] == 1
    assert mr["per_market"]["interval_seconds"] == 15
