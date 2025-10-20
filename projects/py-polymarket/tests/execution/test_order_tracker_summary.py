from datetime import datetime, timezone

from polymarket.execution.order_tracker import ExecutionReport, OrderLifecycleTracker


def _build_report(**overrides):
    base = dict(
        order_id="ord-1",
        market_id="m1",
        action="yes",
        requested_notional=50.0,
        requested_shares=100.0,
        filled_notional=0.0,
        filled_shares=0.0,
        average_price=0.5,
        fees=0.0,
        status="pending",
        execution_mode="simulation",
        metadata={},
    )
    base.update(overrides)
    return ExecutionReport.build(**base)


def test_summary_counts_pending_orders():
    tracker = OrderLifecycleTracker()
    report = _build_report(order_id="ord-1")
    tracker.register(report)

    summary = tracker.summary()

    assert summary["total_tracked"] == 1
    assert summary["counts"]["pending"] == 1
    assert len(summary["pending"]) == 1
    pending_entry = summary["pending"][0]
    assert pending_entry["order_id"] == "ord-1"
    assert pending_entry["remaining_notional"] == report.requested_notional
    assert summary["latest_order"]["order_id"] == "ord-1"


def test_summary_updates_after_fill_and_finalise():
    tracker = OrderLifecycleTracker()
    ts = datetime.now(timezone.utc).isoformat()
    report = _build_report(order_id="ord-2", filled_notional=20.0, filled_shares=40.0, status="partial", average_price=0.5)
    report.timestamp = ts
    state = tracker.register(report)
    state.record_fill(
        notional=30.0,
        shares=60.0,
        price=0.5,
        fees=0.1,
        source="test",
        execution_mode="simulation",
    )
    tracker.finalise("ord-2")

    summary = tracker.summary()

    assert summary["counts"]["filled"] == 1
    assert summary["pending"] == []
    assert summary["latest_order"]["status"] == "filled"
