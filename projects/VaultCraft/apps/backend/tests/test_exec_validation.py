from __future__ import annotations

from app.exec_service import ExecService
from app.hyper_exec import Order


def test_exec_validation_symbol_and_notional(monkeypatch, tmp_path):
    # Isolate positions file
    monkeypatch.setenv("POSITIONS_FILE", str(tmp_path / "positions.json"))
    monkeypatch.setenv("ENABLE_LIVE_EXEC", "0")
    # Restrict to ETH only and tiny max notional
    from app import settings as settings_mod
    monkeypatch.setenv("EXEC_ALLOWED_SYMBOLS", "ETH")
    monkeypatch.setenv("EXEC_MAX_NOTIONAL_USD", "1000")

    # Patch price to deterministic 2000 USD
    from app import exec_service as exec_mod

    class FakePR:
        def get_index_prices(self, symbols):
            return {s: 2000.0 for s in symbols}

    monkeypatch.setattr(exec_mod, "PriceRouter", lambda: FakePR())

    svc = ExecService()

    # Wrong symbol rejected
    r1 = svc.open("0xv", Order(symbol="BTC", size=1.0, side="buy"))
    assert r1["ok"] is False and "symbol not allowed" in r1["error"]

    # Notional too large: size=1 @2000 > 1000
    r2 = svc.open("0xv", Order(symbol="ETH", size=1.0, side="buy"))
    assert r2["ok"] is False and "notional exceeds" in r2["error"]

    # Allowed when size small
    r3 = svc.open("0xv", Order(symbol="ETH", size=0.4, side="buy"))
    assert r3["ok"] is True


def test_min_notional_rejected(monkeypatch, tmp_path):
    monkeypatch.setenv("POSITIONS_FILE", str(tmp_path / "positions.json"))
    from app import exec_service as exec_mod
    class FakePR:
        def get_index_prices(self, symbols):
            return {s: 1000.0 for s in symbols}
    monkeypatch.setattr(exec_mod, "PriceRouter", lambda: FakePR())
    monkeypatch.setenv("EXEC_MIN_NOTIONAL_USD", "100")
    svc = ExecService()
    r1 = svc.open("0xv", Order(symbol="ETH", size=0.05, side="buy"))
    assert r1["ok"] is False and "below" in r1["error"]
    r2 = svc.open("0xv", Order(symbol="ETH", size=0.2, side="buy"))
    assert r2["ok"] is True


def test_live_exec_error_ack_no_apply(monkeypatch, tmp_path):
    monkeypatch.setenv("POSITIONS_FILE", str(tmp_path / "positions.json"))
    monkeypatch.setenv("ENABLE_LIVE_EXEC", "1")
    from app.events import store as event_store
    class ErrDriver:
        def open(self, order: Order):
            return {"ack": {"status": "ok", "response": {"type": "order", "data": {"statuses": [{"error": "Order must have minimum value of $10."}]}}}}
        def close(self, symbol: str, size: float | None = None):
            return {"ack": {"status": "ok", "response": {"type": "order", "data": {"statuses": [{"error": "no position"}]}}}}
    svc = ExecService(driver=ErrDriver())
    out = svc.open("0xv", Order(symbol="ETH", size=0.001, side="buy"))
    assert out["ok"] is False
    # ensure no fill applied
    from app.positions import get_profile
    prof = get_profile("0xv")
    assert abs(prof["positions"].get("ETH", 0.0)) < 1e-9
    ev = event_store.list("0xv")
    assert any(e.get("type") == "exec_open" and e.get("status") in ("error","rejected") for e in ev)


def test_close_fallback_reduce_only(monkeypatch, tmp_path):
    monkeypatch.setenv("POSITIONS_FILE", str(tmp_path / "positions.json"))
    monkeypatch.setenv("ENABLE_LIVE_EXEC", "1")
    monkeypatch.setenv("ENABLE_CLOSE_FALLBACK_RO", "1")
    # seed a position
    from app.positions import set_profile, get_profile
    set_profile("0xv", {"cash": 0.0, "positions": {"ETH": 0.5}, "denom": 1000000})

    class Drv:
        def __init__(self):
            self.calls = []
        def close(self, symbol: str, size=None):
            self.calls.append(("close", symbol, size))
            # Return an ack with nested error to trigger fallback
            return {"ack": {"status": "ok", "response": {"type": "order", "data": {"statuses": [{"error": "Price too far from oracle"}]}}}}
        def open(self, order: Order):
            self.calls.append(("open", order.symbol, order.size, order.side, order.reduce_only))
            # Return ok ack sans error
            return {"ack": {"status": "ok", "response": {"type": "order", "data": {"statuses": [{"filled": {"totalSz": str(order.size)}}]}}}}

    svc = ExecService(driver=Drv())
    out = svc.close("0xv", symbol="ETH", size=0.5)
    assert out["ok"] is True
    prof = get_profile("0xv")
    # position should be reduced by ~0.5
    assert abs(prof["positions"].get("ETH", 0.0)) < 1e-9


def test_exec_retry_attempts(monkeypatch, tmp_path):
    monkeypatch.setenv("POSITIONS_FILE", str(tmp_path / "positions.json"))
    monkeypatch.setenv("ENABLE_LIVE_EXEC", "1")
    monkeypatch.setenv("EXEC_RETRY_ATTEMPTS", "2")
    monkeypatch.setenv("EXEC_RETRY_BACKOFF_SEC", "0")
    from app.hyper_exec import Order

    class RetryDriver:
        def __init__(self):
            self.calls = 0

        def open(self, order: Order):
            self.calls += 1
            if self.calls == 1:
                return {"ack": {"status": "ok", "response": {"type": "order", "data": {"statuses": [{"error": "Price too far from oracle"}]}}}}
            return {"ack": {"status": "ok", "response": {"type": "order", "data": {"statuses": [{"filled": {"totalSz": str(order.size)}}]}}}}

        def close(self, symbol: str, size: float | None = None):
            raise NotImplementedError

    drv = RetryDriver()
    svc = ExecService(driver=drv)
    out = svc.open("0xrv", Order(symbol="ETH", size=0.1, side="buy"))
    assert out["ok"] is True
    assert out.get("attempts") == 2
