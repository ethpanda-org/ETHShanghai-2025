from polymarket.services.runner import _check_price_guard


def test_price_guard_disabled_passes():
    order = {"action": "yes", "size": 10.0}
    market = {"ask": 0.55, "bid": 0.45, "last_trade_price": 0.5}

    approved, context = _check_price_guard(order, market, {"enabled": False})

    assert approved
    assert context["disabled"]


def test_price_guard_within_limits():
    order = {"action": "yes"}
    market = {"ask": 0.52, "bid": 0.48, "last_trade_price": 0.5}
    guard = {"enabled": True, "max_abs_from_top": 0.05, "max_abs_from_last": 0.05, "max_rel_pct": 0.5}

    approved, context = _check_price_guard(order, market, guard)

    assert approved
    refs = context.get("references", {})
    assert refs["top"]["deviation"] == 0.0


def test_price_guard_rejects_on_absolute_breach():
    order = {"action": "yes"}
    market = {"ask": 0.6, "bid": 0.4, "last_trade_price": 0.55}
    guard = {"enabled": True, "max_abs_from_top": 0.02, "max_abs_from_last": 0.01}

    approved, context = _check_price_guard(order, market, guard)

    assert not approved
    assert context["breach"]["reference"] == "last"
    assert context["breach"]["reason"] == "abs"


def test_price_guard_rejects_on_relative_breach():
    order = {"action": "no"}
    market = {"bid": 0.9, "ask": 0.95, "last_trade_price": 0.5}
    guard = {"enabled": True, "max_abs_from_top": 0.2, "max_abs_from_last": 0.5, "max_rel_pct": 0.02}

    approved, context = _check_price_guard(order, market, guard)

    assert not approved
    assert context["breach"]["reason"] == "rel"
