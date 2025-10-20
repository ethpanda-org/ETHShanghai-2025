from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.exec_service import ExecService
from app.hyper_exec import Order
from app.positions import get_profile
from app.events import store as event_store


class FakeDriver:
    def open(self, order: Order):
        return {"status": "accepted", "symbol": order.symbol, "size": order.size, "side": order.side}

    def close(self, symbol: str, size: float | None = None):
        return {"status": "accepted", "symbol": symbol, "size": size}


def test_live_exec_simulated_applies_positions_and_events(tmp_path, monkeypatch):
    # Isolate positions file
    monkeypatch.setenv("POSITIONS_FILE", str(tmp_path / "positions.json"))
    # Enable live exec path
    monkeypatch.setenv("ENABLE_LIVE_EXEC", "1")

    svc = ExecService(driver=FakeDriver())
    r1 = svc.open("0xV", Order(symbol="ETH", size=1.0, side="buy"))
    assert r1["ok"] is True
    prof = get_profile("0xV")
    assert abs(prof["positions"].get("ETH", 0.0) - 1.0) < 1e-9
    ev = event_store.list("0xV")
    assert any(e.get("type") == "exec_open" and e.get("status") == "ack" for e in ev)
    assert any(e.get("type") == "fill" for e in ev)

    r2 = svc.close("0xV", symbol="ETH", size=0.5)
    assert r2["ok"] is True
    prof = get_profile("0xV")
    assert abs(prof["positions"].get("ETH", 0.0) - 0.5) < 1e-9
    ev = event_store.list("0xV")
    assert any(e.get("type") == "exec_close" and e.get("status") == "ack" for e in ev)

