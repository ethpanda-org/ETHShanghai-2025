import pytest

from polymarket.utils.database import DatabaseManager, MarketData


@pytest.fixture()
def sqlite_manager(tmp_path):
    db_path = tmp_path / "test_polymarket.sqlite3"
    url = f"sqlite:///{db_path.as_posix()}"
    manager = DatabaseManager(database_url=url)
    try:
        yield manager
    finally:
        manager.engine.dispose()


def _sample_markets():
    return [
        {"market_id": "M1", "bid": 0.45, "ask": 0.55, "volume_24h": 1500},
        {"market_id": "M1", "bid": 0.50, "ask": 0.60, "volume_24h": 1700},
        {"market_id": "M2", "bid": 0.30, "ask": 0.35, "volume_24h": 800},
        {"market_id": "M2", "bid": 0.32, "ask": 0.37, "volume_24h": 900},
        {"market_id": "M3", "bid": 0.65, "ask": 0.70, "volume_24h": 1200},
    ]


def test_batch_insert_and_portfolio_helpers(sqlite_manager):
    manager = sqlite_manager
    manager.batch_insert(_sample_markets())

    with manager.Session() as session:
        rows = session.query(MarketData).all()
        assert len(rows) == 5

    returns = manager.query_returns_history(days=7, max_points=10)
    assert returns, "expected non-empty returns history"
    assert all(-1.0 <= value <= 1.0 for value in returns)

    balance = manager.get_current_balance()
    assert isinstance(balance, float)
    assert balance > 0

    positions = manager.get_open_positions(limit=5)
    assert positions, "expected at least one open position"
    assert {pos["market_id"] for pos in positions}.issubset({"M1", "M2", "M3"})


def test_custom_database_url_uses_provided_path(tmp_path):
    db_path = tmp_path / "custom.sqlite3"
    url = f"sqlite:///{db_path.as_posix()}"
    manager = DatabaseManager(database_url=url)
    try:
        assert manager.engine.url.database.endswith("custom.sqlite3")
        assert manager._backend.startswith("sqlite")
    finally:
        manager.engine.dispose()
