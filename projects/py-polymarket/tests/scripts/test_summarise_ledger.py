from pathlib import Path

from scripts.summarise_ledger import summarise


def test_summarise_group_by_strategy(tmp_path: Path) -> None:
    ledger = tmp_path / "ledger.csv"
    ledger.write_text(
        "run_timestamp,holding_seconds,pricing_model,maker_offset_bps,taker_offset_bps,market_id,action,notional,shares,entry_price,exit_price,pnl,pnl_after_fees,fees,win,strategies\n"
        "1,60,taker,0,0,m1,yes,50,100,0.45,0.5,5,4,1,1,mean_reversion\n"
        "2,60,taker,0,0,m2,no,40,90,0.55,0.5,-5,-6,1,0,momentum_scalping\n"
        "3,180,taker,0,0,m3,yes,60,110,0.42,0.46,6,5,1,1,mean_reversion\n",
        encoding="utf-8",
    )
    rows = []
    with ledger.open("r", encoding="utf-8") as fh:
        next(fh)  # skip header
        for line in fh:
            parts = line.strip().split(",")
            rows.append({
                "holding_seconds": parts[1],
                "pnl": parts[11],
                "pnl_after_fees": parts[12],
                "fees": parts[13],
                "win": parts[14],
                "strategies": parts[15],
            })
    summary = summarise(rows, group_by_strategy=True)
    by_key = {(row["holding_seconds"], row["strategy"]): row for row in summary}
    assert by_key[(60, "mean_reversion")]["win_rate"] == 1.0
    assert by_key[(60, "momentum_scalping")]["win_rate"] == 0.0
    assert by_key[(180, "mean_reversion")]["trades"] == 1


def test_summarise_without_strategy(tmp_path: Path) -> None:
    rows = [
        {
            "holding_seconds": "60",
            "pnl": "5",
            "pnl_after_fees": "4",
            "fees": "1",
            "win": "1",
            "strategies": "mean_reversion",
        },
        {
            "holding_seconds": "60",
            "pnl": "-2",
            "pnl_after_fees": "-3",
            "fees": "1",
            "win": "0",
            "strategies": "",
        },
    ]
    summary = summarise(rows, group_by_strategy=False)
    assert len(summary) == 1
    row = summary[0]
    assert row["trades"] == 2
    assert row["win_rate"] == 0.5
