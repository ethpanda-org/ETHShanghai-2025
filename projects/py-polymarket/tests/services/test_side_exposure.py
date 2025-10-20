from polymarket.services.runner import _check_side_exposure_limit


def test_side_exposure_disabled_when_limit_is_zero():
    positions = {
        "m1": {"side": "yes", "notional": 40.0},
        "m2": {"side": "no", "notional": 25.0},
    }
    order = {"action": "yes", "size": 15.0}

    approved, ctx = _check_side_exposure_limit(order, positions, 0.0)

    assert approved
    assert ctx["disabled"]
    assert ctx["ratio"] > 0.0


def test_side_exposure_rejects_when_ratio_exceeds_limit():
    positions = {
        "m1": {"side": "yes", "notional": 40.0},
        "m2": {"side": "no", "notional": 15.0},
    }
    order = {"action": "yes", "size": 20.0}

    approved, ctx = _check_side_exposure_limit(order, positions, 1.5)

    assert not approved
    assert ctx["ratio"] > ctx["limit"]
    assert ctx["future_yes"] > ctx["future_no"]


def test_side_exposure_allows_orders_within_limit():
    positions = {
        "m1": {"side": "no", "notional": 60.0},
    }
    order = {"action": "yes", "size": 10.0}

    approved, ctx = _check_side_exposure_limit(order, positions, 2.0)

    assert approved
    assert ctx["ratio"] <= ctx["limit"] + 1e-9
