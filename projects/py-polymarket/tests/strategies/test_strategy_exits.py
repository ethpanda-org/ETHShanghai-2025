from datetime import datetime, timedelta, timezone

from polymarket.services.runner import evaluate_strategy_exit_decisions
from polymarket.strategies.exits import get_evaluator


def _base_position(side: str = "yes") -> dict:
    now = datetime.now(timezone.utc)
    return {
        "side": side,
        "entry_yes": 0.5,
        "shares": 100.0,
        "notional": 50.0,
        "opened_at": (now - timedelta(minutes=10)).isoformat(),
        "best_pnl_pct": 0.0,
        "strategy_states": {},
    }


def test_strategy_exit_mean_reversion_close_triggers() -> None:
    now = datetime.now(timezone.utc)
    position = _base_position()
    state = {}
    contribution = {
        "name": "mean_reversion",
        "bias": 0.5,
        "metadata": {"mid_price": 0.6, "deviation": 0.1},
    }
    get_evaluator("mean_reversion").capture_entry(state, contribution)
    position["strategy_states"]["mean_reversion"] = {"entry": state, "exclusive": False}
    position["entry_yes"] = 0.6
    position["notional"] = 120.0
    position["shares"] = position["notional"] / position["entry_yes"]
    market_row = {"bid": 0.49, "ask": 0.51, "mid_price": 0.5}

    result = evaluate_strategy_exit_decisions(position, market_row, now)

    close = result["close"]
    assert close is not None
    assert close["strategy"] == "mean_reversion"
    assert close["decision"].reason == "mean_reversion_target"


def test_strategy_exit_event_driven_hold_window() -> None:
    now = datetime.now(timezone.utc)
    position = _base_position()
    position["opened_at"] = (now - timedelta(seconds=120)).isoformat()
    state = {}
    contribution = {
        "name": "event_driven",
        "bias": 0.8,
        "metadata": {
            "sentiment": 0.7,
            "volume": 20000.0,
            "spike": 0.9,
            "hold_seconds": 600,
        },
    }
    get_evaluator("event_driven").capture_entry(state, contribution)
    position["strategy_states"]["event_driven"] = {"entry": state, "exclusive": True}
    market_row = {
        "bid": 0.48,
        "ask": 0.52,
        "mid_price": 0.5,
        "volume_24h": 25000.0,
        "news_sentiment": 0.55,
    }

    result = evaluate_strategy_exit_decisions(position, market_row, now)

    assert result["close"] is None
    assert result["holds"], "expected event-driven evaluator to issue a hold directive"
    hold = result["holds"][0]["decision"]
    assert hold.action == "hold"
    assert hold.reason in {"event_hold_window", "event_hold_to_resolution"}


def test_strategy_exit_event_driven_trailing_stop() -> None:
    now = datetime.now(timezone.utc)
    position = _base_position()
    position["entry_yes"] = 0.45
    position["notional"] = 100.0
    position["shares"] = position["notional"] / position["entry_yes"]
    position["best_pnl_pct"] = 0.06
    position["opened_at"] = (now - timedelta(minutes=40)).isoformat()

    state = {}
    contribution = {
        "name": "event_driven",
        "bias": 0.9,
        "metadata": {
            "sentiment": 0.8,
            "volume": 50000.0,
            "spike": 0.8,
            "trailing_trigger_pct": 0.04,
            "trailing_decay_pct": 0.02,
        },
    }
    evaluator = get_evaluator("event_driven")
    evaluator.capture_entry(state, contribution)
    state["best_pnl_pct"] = 0.06
    position["strategy_states"] = {"event_driven": {"entry": state, "exclusive": True}}

    market_row = {
        "bid": 0.458,
        "ask": 0.468,
        "mid_price": 0.463,
        "volume_24h": 52000.0,
        "news_sentiment": 0.6,
    }

    result = evaluate_strategy_exit_decisions(position, market_row, now)

    close = result["close"]
    assert close is not None
    assert close["strategy"] == "event_driven"
    assert close["decision"].reason == "event_trailing_stop"


def test_strategy_exit_micro_arbitrage_external_edge_cost() -> None:
    now = datetime.now(timezone.utc)
    position = _base_position(side="yes")
    state = {}
    # Simulate an external micro-arb entry
    contribution = {
        "name": "micro_arbitrage",
        "bias": 0.8,
        "metadata": {
            "mode": "external",
            "taker_fee": 0.002,
        },
    }
    evaluator = get_evaluator("micro_arbitrage")
    evaluator.capture_entry(state, contribution)
    position["strategy_states"]["micro_arbitrage"] = {"entry": state, "exclusive": True}
    # Current market where edge <= cost
    market_row = {
        "bid": 0.40,
        "ask": 0.45,
        "external_bid": 0.446,  # 0.446 - 0.45 - 0.002 = -0.006
        "external_ask": 0.47,
    }
    result = evaluate_strategy_exit_decisions(position, market_row, now)
    close = result["close"]
    assert close is not None
    assert close["strategy"] == "micro_arbitrage"
    assert close["decision"].reason == "micro_arbitrage_external_edge_cost"
