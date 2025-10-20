from __future__ import annotations

from app.user_listener import _extract_fills, process_user_event, last_ws_event
from app.events import store as event_store
from app.listener_registry import register as register_listener_vault, clear as clear_listener_vaults


def test_extract_fills_various_shapes():
    cases = [
        {"fills": [{"name": "ETH", "dir": True, "sz": 0.1}]},
        {"fills": [{"symbol": "BTC", "is_buy": False, "size": 0.2}]},
        {"name": "ETH", "side": "buy", "qty": 0.3},
    ]
    outs = [_extract_fills(c) for c in cases]
    flat = [x for arr in outs for x in arr]
    # Should have ETH buy 0.1, BTC sell 0.2, ETH buy 0.3
    assert ("ETH", "buy", 0.1) in flat
    assert any(t[0] == "BTC" and t[1] == "sell" and abs(t[2] - 0.2) < 1e-9 for t in flat)
    assert ("ETH", "buy", 0.3) in flat


def test_process_user_event_applies(monkeypatch, tmp_path):
    monkeypatch.setenv("POSITIONS_FILE", str(tmp_path / "positions.json"))
    vid = "0xUL"
    clear_listener_vaults()
    register_listener_vault(vid)
    event_store._events.clear()
    evt = {"fills": [{"name": "ETH", "dir": True, "sz": 1.0}]}
    process_user_event(vid, evt)
    events = event_store.list(vid)
    assert any(e.get("type") == "fill" and e.get("source") == "ws" for e in events)


def test_process_user_event_logs_ws_source(monkeypatch, tmp_path):
    monkeypatch.setenv("POSITIONS_FILE", str(tmp_path / "positions.json"))
    vid = "0xLISTENER"
    clear_listener_vaults()
    register_listener_vault(vid)
    event_store._events.clear()
    evt = {"fills": [{"name": "BTC", "side": "sell", "sz": 0.5}]}
    process_user_event(vid, evt)
    events = event_store.list(vid)
    assert any(e.get("type") == "fill" and e.get("source") == "ws" for e in events)
    ts = last_ws_event(vid)
    assert isinstance(ts, float) and ts > 0.0
