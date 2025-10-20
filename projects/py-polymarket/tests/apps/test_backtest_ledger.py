from pathlib import Path

from apps.backtest import append_backtest_ledger


def test_append_backtest_ledger_creates_header(tmp_path: Path) -> None:
    trades = [
        {
            "market_id": "M1",
            "action": "yes",
            "notional": 50.0,
            "shares": 100.0,
            "entry_price": 0.45,
            "exit_price": 0.5,
            "pnl": 5.0,
            "pnl_after_fees": 4.5,
            "fees": 0.5,
        }
    ]
    ledger = tmp_path / "ledger.csv"
    append_backtest_ledger(
        trades,
        ledger,
        holding_seconds=180,
        pricing_model="taker",
        maker_offset_bps=5.0,
        taker_offset_bps=10.0,
    )
    content = ledger.read_text(encoding="utf-8").strip().splitlines()
    assert content[0].startswith("run_timestamp,holding_seconds")
    assert len(content) == 2
    row = content[1].split(",")
    assert "M1" in row
    assert "taker" in content[1]


def test_append_backtest_ledger_appends_rows(tmp_path: Path) -> None:
    ledger = tmp_path / "ledger.csv"
    trades = [
        {
            "market_id": "M1",
            "action": "yes",
            "notional": 50.0,
            "shares": 100.0,
            "entry_price": 0.45,
            "exit_price": 0.5,
            "pnl": 5.0,
            "pnl_after_fees": 4.5,
            "fees": 0.5,
        }
    ]
    append_backtest_ledger(
        trades,
        ledger,
        holding_seconds=60,
        pricing_model="taker",
        maker_offset_bps=0.0,
        taker_offset_bps=0.0,
    )
    append_backtest_ledger(
        trades,
        ledger,
        holding_seconds=60,
        pricing_model="taker",
        maker_offset_bps=0.0,
        taker_offset_bps=0.0,
    )
    content = ledger.read_text(encoding="utf-8").strip().splitlines()
    assert len(content) == 3
