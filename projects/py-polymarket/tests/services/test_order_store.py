from datetime import datetime, timedelta, timezone
from decimal import Decimal

from polymarket.services.order_store import OrderStore


def test_order_store_append_and_load(tmp_path):
    orders_path = tmp_path / "orders.jsonl"
    trades_path = tmp_path / "trades.jsonl"
    store = OrderStore(orders_path=orders_path, trades_path=trades_path)

    ts1 = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
    ts2 = ts1 + timedelta(minutes=1)

    store.append_order({"order_id": "o-1", "timestamp": ts1, "size": 10.0})
    store.append_order({"order_id": "o-2", "timestamp": ts2, "size": 15.0})

    all_orders = store.load_orders()
    assert [order["order_id"] for order in all_orders] == ["o-1", "o-2"]

    latest_order = store.load_orders(limit=1)
    assert [order["order_id"] for order in latest_order] == ["o-2"]

    recent_orders = list(store.iter_orders(since=ts2))
    assert [order["order_id"] for order in recent_orders] == ["o-2"]


def test_order_store_trade_serialisation(tmp_path):
    orders_path = tmp_path / "orders.jsonl"
    trades_path = tmp_path / "trades.jsonl"
    store = OrderStore(orders_path=orders_path, trades_path=trades_path)

    trade_ts = datetime(2025, 1, 2, 9, 30, tzinfo=timezone.utc)
    store.append_trade(
        {
            "timestamp": trade_ts,
            "order_id": "t-1",
            "market_id": "mkt",
            "side": "yes",
            "requested_notional": Decimal("25.50"),
            "filled_notional": Decimal("25.50"),
            "fees": Decimal("0.05"),
            "path": tmp_path,
        }
    )

    trades = store.load_trades()
    assert len(trades) == 1
    trade = trades[0]
    assert trade["order_id"] == "t-1"
    assert trade["timestamp"].startswith("2025-01-02T09:30")
    assert trade["fees"] == 0.05
    assert trade["filled_notional"] == 25.5
    assert trade["path"] == str(tmp_path)


def test_order_store_handles_missing_files(tmp_path):
    orders_path = tmp_path / "orders.jsonl"
    trades_path = tmp_path / "trades.jsonl"
    store = OrderStore(orders_path=orders_path, trades_path=trades_path)

    assert list(store.iter_orders()) == []
    assert list(store.iter_trades()) == []
