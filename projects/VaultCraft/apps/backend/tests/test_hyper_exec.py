from app.hyper_exec import HyperExecClient, Order


def test_build_open_order_payload():
    cli = HyperExecClient()
    o = Order(symbol="ETH", size=1.5, side="buy", reduce_only=False, leverage=5)
    p = cli.build_open_order(o)
    assert p["type"] == "open"
    assert p["symbol"] == "ETH"
    assert p["size"] == 1.5
    assert p["side"] == "buy"
    assert p["reduce_only"] is False
    assert p["leverage"] == 5


def test_build_close_order_partial_and_full():
    cli = HyperExecClient()
    p = cli.build_close_order("ETH", size=0.5)
    assert p == {"type": "close", "symbol": "ETH", "size": 0.5}
    p2 = cli.build_close_order("ETH")
    assert p2 == {"type": "close", "symbol": "ETH"}


def test_nav_from_positions():
    nav = HyperExecClient.pnl_to_nav(
        cash=1000.0,
        positions={"ETH": 0.2, "XAU": -0.1},
        index_prices={"ETH": 3000.0, "XAU": 2500.0},
    )
    # 1000 + 0.2*3000 - 0.1*2500 = 1000 + 600 - 250 = 1350
    assert abs(nav - 1350.0) < 1e-9

