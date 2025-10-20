import pytest

from polymarket.risk import RiskEngine


@pytest.fixture()
def sample_portfolio() -> dict:
    return {"returns": [0.01] * 100, "balance": 10_000, "positions": []}


def test_rejects_large_order(sample_portfolio: dict) -> None:
    risk = RiskEngine(max_var_ratio=0.01, max_single_order_ratio=0.02)
    order = {
        "market_id": "MKT",
        "action": "yes",
        "size": 10_000,
        "metadata": {"volatility": 0.5},
    }
    assert not risk.validate_order(order, sample_portfolio)
    risk_meta = order["metadata"]["risk"]
    assert risk_meta["approved"] is False
    assert "rejections" in risk_meta


def test_accepts_reasonable_order(sample_portfolio: dict) -> None:
    risk = RiskEngine(max_var_ratio=0.05, max_single_order_ratio=0.1)
    order = {
        "market_id": "MKT",
        "action": "yes",
        "size": 500,
        "metadata": {"volatility": 0.05},
    }
    assert risk.validate_order(order, sample_portfolio)
    assert order["metadata"]["risk"]["approved"] is True


def test_flags_var_based_rejection(sample_portfolio: dict) -> None:
    risk = RiskEngine(max_var_ratio=0.01, max_single_order_ratio=0.5)
    order = {
        "market_id": "MKT",
        "action": "yes",
        "size": 500,
    }
    volatile_portfolio = {"returns": [-0.2] * 50 + [0.01] * 150, "balance": 1_000, "positions": []}
    assert not risk.validate_order(order, volatile_portfolio)
    rejections = order["metadata"]["risk"].get("rejections", [])
    assert "var" in rejections


def test_flags_liquidity_rejection(sample_portfolio: dict) -> None:
    risk = RiskEngine(max_var_ratio=0.5, max_single_order_ratio=0.05)
    order = {
        "market_id": "MKT",
        "action": "yes",
        "size": 10_000,
        "metadata": {"volatility": 0.01},
    }
    assert not risk.validate_order(order, sample_portfolio)
    rejections = order["metadata"]["risk"].get("rejections", [])
    assert "liquidity" in rejections
