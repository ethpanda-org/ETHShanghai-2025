from polymarket.services.runner import _apply_depth_cap


def test_apply_depth_cap_clamps_to_depth():
    order = {"action": "yes", "size": 12.0}
    market = {"depth_yes_notional": 8.5}
    assert _apply_depth_cap(order, market, min_pos=5.0)
    assert order["size"] == 8.5


def test_apply_depth_cap_rejects_when_depth_too_small():
    order = {"action": "no", "size": 6.0}
    market = {"depth_no_notional": 3.0}
    assert not _apply_depth_cap(order, market, min_pos=5.0)
