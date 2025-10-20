from datetime import datetime, timedelta, timezone

import pytest

from polymarket.services import runner


def test_intent_key_requires_market_and_direction():
    assert runner._intent_key("market", "YES") == "market::yes"
    assert runner._intent_key("market", "No") == "market::no"
    assert runner._intent_key("", "yes") is None
    assert runner._intent_key("market", "hold") is None


def test_record_order_intent_prunes_old_entries(tmp_path, monkeypatch):
    temp_path = tmp_path / "order_intents.json"
    monkeypatch.setattr(runner, "ORDER_INTENTS_PATH", temp_path)

    old_ts = (datetime.now(timezone.utc) - timedelta(seconds=1800)).isoformat()
    history = [{"market_id": "m1", "action": "yes", "timestamp": old_ts, "size": 5.0}]

    index = runner._prune_order_intents(history, window_seconds=600, max_entries=10, now_ts=datetime.now(timezone.utc))
    assert history == []
    assert index == {}

    index = runner._record_order_intent(
        history,
        "m1",
        "yes",
        12.5,
        datetime.now(timezone.utc),
        window_seconds=600,
        max_entries=10,
    )
    key = runner._intent_key("m1", "yes")
    assert key in index
    market_key = runner._market_key("m1")
    assert market_key in index
    assert len(history) == 1
    assert temp_path.exists()


def test_prune_order_intents_respects_max_entries(tmp_path, monkeypatch):
    temp_path = tmp_path / "order_intents.json"
    monkeypatch.setattr(runner, "ORDER_INTENTS_PATH", temp_path)

    now = datetime.now(timezone.utc)
    history = []
    for idx in range(12):
        runner._record_order_intent(
            history,
            f"m{idx % 3}",
            "yes" if idx % 2 == 0 else "no",
            1.0 + idx,
            now + timedelta(seconds=idx * 30),
            window_seconds=0,
            max_entries=5,
        )

    assert len(history) == 5
    assert temp_path.exists()


def test_market_any_key_tracks_latest_timestamp(tmp_path, monkeypatch):
    temp_path = tmp_path / "order_intents.json"
    monkeypatch.setattr(runner, "ORDER_INTENTS_PATH", temp_path)

    history = []
    now = datetime.now(timezone.utc)
    idx = runner._record_order_intent(
        history,
        "m-market",
        "yes",
        5.0,
        now - timedelta(seconds=10),
        window_seconds=600,
        max_entries=10,
    )
    assert idx[runner._market_key("m-market")] is not None
    idx = runner._record_order_intent(
        history,
        "m-market",
        "no",
        5.0,
        now,
        window_seconds=600,
        max_entries=10,
    )
    assert idx[runner._market_key("m-market")] == history[-1]["timestamp"]
