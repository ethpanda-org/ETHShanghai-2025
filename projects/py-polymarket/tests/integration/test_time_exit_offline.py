from datetime import datetime, timedelta, timezone

from pathlib import Path
from polymarket.services.exits import evaluate_exits_once
from polymarket.services.realized import append_realized, rebuild_realized_summary


class DummySnap:
    def __init__(self, raw):
        self.raw = raw


def test_time_exit_offline_triggers_close(tmp_path: Path):
    now = datetime.now(timezone.utc)
    positions = {
        "SIM-1": {
            "market_id": "SIM-1",
            "side": "yes",
            "notional": 100.0,
            "shares": 200.0,        # entry_yes=0.5
            "entry_yes": 0.5,
            "opened_at": (now - timedelta(seconds=100000)).isoformat(),
        }
    }
    snapshot_map = {
        "SIM-1": DummySnap({"bid": 0.49, "ask": 0.51, "mid_price": 0.5})
    }

    to_close, exit_records = evaluate_exits_once(positions, snapshot_map, now=now)
    assert "SIM-1" in to_close
    assert exit_records and exit_records[0]["market_id"] == "SIM-1"

    # write exits to a temp reports dir and rebuild summary
    base = tmp_path / "reports"
    base.mkdir(parents=True, exist_ok=True)
    for rec in exit_records:
        append_realized(rec, base_dir=base)
    summary = rebuild_realized_summary(base_dir=base)
    assert summary["closed_trades"] >= 1
    assert "total_pnl_after_fees" in summary
