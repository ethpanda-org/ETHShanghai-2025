import math

from config import settings  # type: ignore
from apps.backtest import (
    _compute_pnl,
    _entry_price,
    _exit_price_from_snapshot,
)


def test_slippage_models_entry_exit():
    snapshot = {"bid": 0.4, "ask": 0.6, "mid_price": 0.5, "yes_price": 0.5}
    original_model = getattr(settings.execution, "slippage_model", "taker")
    try:
        # taker
        settings.execution.slippage_model = "taker"
        assert math.isclose(_entry_price("yes", snapshot), 0.6)
        assert math.isclose(_exit_price_from_snapshot("yes", snapshot), 0.4)

        # mid
        settings.execution.slippage_model = "mid"
        assert math.isclose(_entry_price("yes", snapshot), 0.5)
        assert math.isclose(_exit_price_from_snapshot("yes", snapshot), 0.5)

        # maker_limit
        settings.execution.slippage_model = "maker_limit"
        assert math.isclose(_entry_price("yes", snapshot), 0.4)
        assert math.isclose(_exit_price_from_snapshot("yes", snapshot), 0.6)
    finally:
        settings.execution.slippage_model = original_model


def test_entry_price_with_offsets():
    snapshot = {"bid": 0.4, "ask": 0.6, "mid_price": 0.5, "yes_price": 0.5}
    yes_taker = _entry_price("yes", snapshot, model="taker", taker_offset_bps=50)
    # 0.6 + 0.6 * 0.005 = 0.603
    assert math.isclose(yes_taker, 0.603, rel_tol=1e-6)
    no_maker = _entry_price("no", snapshot, model="maker_limit", maker_offset_bps=25)
    # maker sell expects ask + offset -> 0.6 + 0.6*0.0025 = 0.6015
    assert math.isclose(no_maker, 0.6015, rel_tol=1e-6)


def test_share_based_pnl_computation():
    info = _compute_pnl("yes", 120.0, 0.6, 0.72, fee_model="taker")
    expected_shares = 120.0 / 0.6
    expected_pnl = expected_shares * (0.72 - 0.6)
    expected_fees = 120.0 * float(getattr(settings, "TAKER_FEE", 0.005)) * 2.0
    assert math.isclose(info["shares"], expected_shares, rel_tol=1e-9)
    assert math.isclose(info["pnl"], expected_pnl, rel_tol=1e-9)
    assert math.isclose(info["fees"], expected_fees, rel_tol=1e-9)
    assert math.isclose(info["pnl_after_fees"], expected_pnl - expected_fees, rel_tol=1e-9)
