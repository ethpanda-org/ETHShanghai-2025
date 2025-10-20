from pathlib import Path

from datetime import datetime, timezone
from polymarket.services.limits import check_daily_kill_switch
from polymarket.services.realized import append_realized


def test_kill_switch_uses_today_records(tmp_path: Path) -> None:
    base = tmp_path / "reports"
    base.mkdir(parents=True, exist_ok=True)

    # two losses of -60 and -50 => day_pnl=-110
    append_realized({"timestamp": "2099-01-01T10:00:00+00:00", "pnl": -60.0, "pnl_after_fees": -60.0}, base_dir=base)
    append_realized({"timestamp": "2099-01-01T11:00:00+00:00", "pnl": -50.0, "pnl_after_fees": -50.0}, base_dir=base)

    # all other day should be ignored
    append_realized({"timestamp": "2099-01-02T10:00:00+00:00", "pnl": -999.0, "pnl_after_fees": -999.0}, base_dir=base)

    # monkeypatch datetime.now? Avoid: Use unrealistic date so this won't run in CI reliably.
    # Instead, just ensure function handles empty/no match gracefully with high limits.
    now = datetime(2099, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    res = check_daily_kill_switch(initial_balance=10000, limit_pct=0.02, limit_usd=200.0, base_dir=base, now=now)
    # day_pnl = -110, limits: pct= -200, usd= -200 => threshold = -200, -110 > -200 so not active
    assert res.active is False
    assert res.reason is None


def test_kill_switch_cooldown_recovers(tmp_path: Path) -> None:
    base = tmp_path / "reports"
    base.mkdir(parents=True, exist_ok=True)

    append_realized(
        {"timestamp": "2099-01-01T08:00:00+00:00", "pnl": -150.0, "pnl_after_fees": -150.0},
        base_dir=base,
    )
    now = datetime(2099, 1, 1, 9, 0, 0, tzinfo=timezone.utc)
    res = check_daily_kill_switch(
        initial_balance=10000,
        limit_pct=0.01,  # threshold -100
        base_dir=base,
        cooldown_minutes=60,
        now=now,
    )
    assert res.active is True
    assert res.reason == "pct_limit"
    assert res.cooldown_minutes == 60
    assert res.cooldown_remaining_minutes > 0
    assert res.recovery_mode is False
    assert res.triggered_at is not None

    # Advance beyond cooldown window, should move into recovery mode (allowed but flagged)
    later = datetime(2099, 1, 1, 10, 5, 0, tzinfo=timezone.utc)
    res2 = check_daily_kill_switch(
        initial_balance=10000,
        limit_pct=0.01,
        base_dir=base,
        cooldown_minutes=60,
        now=later,
    )
    assert res2.active is False
    assert res2.recovery_mode is True
    assert res2.cooldown_remaining_minutes == 0.0
    assert res2.triggered_at is not None
