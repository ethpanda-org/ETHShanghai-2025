import json
from pathlib import Path

import pytest

from polymarket.monitoring import trade_telemetry


def test_record_fill_writes_expected_schema(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    telemetry_path = tmp_path / "fills.jsonl"
    monkeypatch.setattr(trade_telemetry, "TELEMETRY_PATH", telemetry_path)
    record = {
        "event": "entry",
        "market_id": "M-1",
        "side": "yes",
        "notional": 123.456789,
        "fill_price": 0.52,
        "reference_price": 0.5,
        "slippage": 0.02,
        "fees": 0.12,
        "execution_mode": "simulation",
    }
    trade_telemetry.record_fill(record)
    contents = telemetry_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(contents) == 1
    payload = json.loads(contents[0])
    for field in ["event", "market_id", "side", "notional", "execution_mode", "timestamp"]:
        assert field in payload
    assert payload["event"] == "entry"
    assert payload["notional"] == round(record["notional"], 6)
    assert payload["slippage"] == round(record["slippage"], 6)


def test_record_fill_requires_core_fields(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(trade_telemetry, "TELEMETRY_PATH", tmp_path / "fills.jsonl")
    with pytest.raises(ValueError):
        trade_telemetry.record_fill({"market_id": "X"})
