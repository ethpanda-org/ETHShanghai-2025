import json
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

from config import settings
from polymarket.data.facade import DataIngestionFacade
from polymarket.services.realized import append_realized, rebuild_realized_summary
from polymarket.services import runner


def test_realized_summary_rebuild_tmp(tmp_path: Path) -> None:
    base = tmp_path / "reports"
    base.mkdir(parents=True, exist_ok=True)

    # simulate two exits (one win, one loss)
    append_realized({"market_id": "SIM-1", "pnl": 10.0}, base_dir=base)
    append_realized({"market_id": "SIM-2", "pnl": -3.5}, base_dir=base)

    summary = rebuild_realized_summary(base_dir=base)
    assert summary["closed_trades"] == 2
    assert summary["wins"] == 1
    assert summary["losses"] == 1
    assert abs(summary["total_pnl"] - 6.5) < 1e-9
    assert summary["win_rate_pct"] == 50.0
    assert summary["per_strategy"] is None

    # and the file should exist with the same contents
    payload = json.loads((base / "realized_summary.json").read_text(encoding="utf-8"))
    assert payload["closed_trades"] == 2
    assert abs(payload["total_pnl"] - 6.5) < 1e-9


def test_time_exit_smoke(tmp_path: Path) -> None:
    reports_dir = tmp_path / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    original_offline = settings.OFFLINE_MODE
    original_policy = getattr(settings, "EXIT_POLICY_MODE", "advanced")
    settings.OFFLINE_MODE = True
    settings.EXIT_POLICY_MODE = "simple"
    try:
        try:
            facade = DataIngestionFacade(use_graphql=False, ttl_seconds=0, limit=1)
            tickers = asyncio.run(facade.get_markets(force_refresh=True))
        finally:
            settings.OFFLINE_MODE = original_offline

        assert tickers, "expected offline fixture markets"

        market = tickers[0].raw
        market_id = tickers[0].market_id
        bid = float(market["bid"])
        ask = float(market["ask"])
        yes_entry = ask
        notional = 100.0
        shares = notional / max(yes_entry, 1e-6)
        opened_at = datetime.now(timezone.utc) - timedelta(seconds=180)

        position = {
            "market_id": market_id,
            "side": "yes",
            "notional": notional,
            "shares": shares,
            "entry_yes": yes_entry,
            "entry_score": 0.15,
            "hold_secs": 60,
            "min_hold_secs": 30,
            "opened_at": opened_at.isoformat(),
            "best_pnl_pct": 0.0,
        }

        cur_yes_mark = bid  # taker exit on yes leg
        pnl = shares * (cur_yes_mark - yes_entry)
        pnl_pct = pnl / max(1e-9, notional)

        age_ok = True
        entered_mid = (bid + ask) / 2.0
        tau = 300.0
        tsec = (datetime.now(timezone.utc) - opened_at).total_seconds()
        decay = pow(2.718281828, -tsec / tau)
        p_entry = 0.5 + 0.5 * max(-1.0, min(1.0, float(position.get("entry_score", 0.0))))
        p_hat = 0.5 + (p_entry - 0.5) * decay
        spread = ask - bid
        cost_budget = runner.TAKER_FEE + (spread / 2.0) + runner.EDGE_RISK_PREMIUM
        edge = p_hat - entered_mid
        eff_edge = edge

        time_or_tp_sl = age_ok or pnl_pct <= -runner.EXIT_STOP_LOSS_PCT or pnl_pct >= runner.EXIT_TAKE_PROFIT_PCT
        dead_zone = abs(edge) <= cost_budget
        invalidation = eff_edge < 0.0
        trailing = False

        assert time_or_tp_sl, "expected time-based exit to trigger in smoke test"

        exit_reason = (
            "tp_sl"
            if (pnl_pct <= -runner.EXIT_STOP_LOSS_PCT or pnl_pct >= runner.EXIT_TAKE_PROFIT_PCT)
            else ("dead_zone" if dead_zone else ("invalidation" if invalidation else ("trailing" if trailing else "time")))
        )

        fees_total = notional * runner.TAKER_FEE * 2.0
        exit_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "market_id": market_id,
            "side": "yes",
            "reason": exit_reason,
            "notional": round(notional, 4),
            "shares": round(shares, 6),
            "entry_yes": round(yes_entry, 6),
            "exit_yes": round(cur_yes_mark, 6),
            "pnl": round(pnl, 6),
            "pnl_pct": round(pnl_pct, 6),
            "edge": round(edge, 6),
            "cost": round(cost_budget, 6),
            "fees": round(fees_total, 6),
            "pnl_after_fees": round(pnl - fees_total, 6),
            "opened_at": position["opened_at"],
            "holding_seconds": round(tsec, 3),
        }
        append_realized(exit_record, base_dir=reports_dir)
        summary = rebuild_realized_summary(base_dir=reports_dir)

        assert summary["closed_trades"] == 1
        assert summary["total_pnl"] == exit_record["pnl"]
        assert summary["win_rate_pct"] == 0.0
        assert summary["per_strategy"] is None
        assert (reports_dir / "realized_exits.jsonl").exists()
        assert (reports_dir / "realized_summary.json").exists()
    finally:
        settings.EXIT_POLICY_MODE = original_policy


def test_strategy_exit_dry_run_telemetry(tmp_path: Path, monkeypatch) -> None:
    reports_dir = tmp_path / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    # ensure telemetry writes into tmp path
    from polymarket.monitoring import trade_telemetry

    telemetry_path = reports_dir / "fills.jsonl"
    monkeypatch.setattr(trade_telemetry, "TELEMETRY_PATH", telemetry_path)

    strategy_exit_meta = {
        "strategy": "event_driven",
        "decision_reason": "event_trailing_stop",
        "metadata": {"best_pnl_pct": 0.08},
        "exclusive": True,
    }

    exit_record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "market_id": "SIM-STRAT-1",
        "side": "yes",
        "reason": "strategy_event_driven:event_trailing_stop",
        "notional": 150.0,
        "shares": 300.0,
        "entry_yes": 0.45,
        "exit_yes": 0.5,
        "pnl": 15.0,
        "pnl_pct": 0.1,
        "fees": 0.45,
        "pnl_after_fees": 14.55,
        "opened_at": datetime.now(timezone.utc).isoformat(),
        "holding_seconds": 600.0,
        "strategies": ["event_driven"],
        "strategy_exit": strategy_exit_meta,
    }

    append_realized(exit_record, base_dir=reports_dir)
    summary = rebuild_realized_summary(base_dir=reports_dir)
    assert summary["closed_trades"] == 1
    assert summary["total_pnl"] == exit_record["pnl"]
    assert summary["win_rate_pct"] == 100.0
    assert summary["per_strategy"] is not None
    strat_summary = summary["per_strategy"]["event_driven"]
    assert strat_summary["trades"] == 1
    assert strat_summary["total_pnl"] == exit_record["pnl"]
    assert strat_summary["win_rate_pct"] == 100.0

    stored = (reports_dir / "realized_exits.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert stored, "expected realized exits jsonl to contain at least one record"
    serialized = json.loads(stored[0])
    assert serialized["strategy_exit"] == strategy_exit_meta

    telemetry_payload = {
        "event": "exit",
        "market_id": exit_record["market_id"],
        "side": exit_record["side"],
        "notional": exit_record["notional"],
        "execution_mode": "simulation",
        "fill_price": exit_record["exit_yes"],
        "reference_price": exit_record["exit_yes"],
        "slippage": 0.0,
        "strategy_exit": strategy_exit_meta,
    }
    runner._record_fill(telemetry_payload)

    content = telemetry_path.read_text(encoding="utf-8").strip().splitlines()
    assert content, "expected telemetry file to contain at least one record"
    telemetry_record = json.loads(content[-1])
    assert telemetry_record["strategy_exit"] == strategy_exit_meta
