import asyncio

from config import settings
from polymarket.services.market_service import MarketDataService
from polymarket.utils.database import DatabaseManager
from polymarket.risk import RiskEngine


def test_market_data_pipeline_feeds_risk(tmp_path):
    original_offline = settings.OFFLINE_MODE
    settings.OFFLINE_MODE = True
    try:
        service = MarketDataService()
        snapshots = asyncio.run(service.get_snapshots(force_refresh=True))
    finally:
        settings.OFFLINE_MODE = original_offline

    records = service.as_records(snapshots)
    assert records, "expected fixture records for offline snapshots"

    db_path = tmp_path / "risk_pipe.sqlite3"
    manager = DatabaseManager(database_url=f"sqlite:///{db_path.as_posix()}")
    try:
        manager.batch_insert(records)
        returns = manager.query_returns_history()
        assert returns, "expected non-empty returns history"

        portfolio = {
            "returns": returns,
            "balance": 10_000.0,
            "positions": manager.get_open_positions(),
        }
        max_ratio = float(getattr(settings.trading, "max_single_position", 0.01))
        base_size = portfolio["balance"] * max_ratio
        order_size = min(base_size * 0.9, 150.0)
        order = {
            "market_id": records[0]["market_id"],
            "action": "yes",
            "size": order_size,
            "metadata": {},
        }
        engine = RiskEngine()
        assert engine.validate_order(order, portfolio)
    finally:
        manager.engine.dispose()
