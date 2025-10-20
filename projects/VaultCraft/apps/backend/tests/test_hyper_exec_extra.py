from __future__ import annotations

import pytest

from app.hyper_exec import HyperExecClient, Order


def test_leverage_validation():
    cli = HyperExecClient(min_leverage=2.0, max_leverage=10.0)
    with pytest.raises(ValueError):
        cli.build_open_order(Order(symbol="ETH", size=1, side="buy", leverage=1.0))
    with pytest.raises(ValueError):
        cli.build_open_order(Order(symbol="ETH", size=1, side="buy", leverage=11.0))
    ok = cli.build_open_order(Order(symbol="ETH", size=1, side="buy", leverage=5.0))
    assert ok["leverage"] == 5.0


def test_build_reduce_only():
    cli = HyperExecClient()
    p = cli.build_reduce_only(symbol="BTC", size=0.25, side="sell")
    assert p["type"] == "open"
    assert p["symbol"] == "BTC"
    assert p["reduce_only"] is True

