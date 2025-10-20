import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_ROOT = ROOT / "src"
POLYMARKET_SRC = SRC_ROOT / "polymarket"
for path in (ROOT, SRC_ROOT, POLYMARKET_SRC):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from config import settings  # noqa: E402
from polymarket.strategies import StrategyEngine  # noqa: E402
from polymarket.risk import RiskEngine  # noqa: E402
from polymarket.services.market_service import MarketDataService  # noqa: E402


def ensure_offline_mode() -> None:
    os.environ.setdefault("OFFLINE_MODE", "true")


def format_snapshot(order):
    return {
        "action": order.get("action"),
        "size": order.get("size"),
        "metadata": order.get("metadata", {}),
    }


def describe_order(snapshot_id: str, order):
    action = order.get("action")
    if action == "hold" or order.get("size", 0) <= 0:
        return f"- {snapshot_id}: no actionable signal"
    return f"- {snapshot_id}: action={action} size={order.get('size')}"


async def simulate_once() -> None:
    ensure_offline_mode()
    service = MarketDataService()
    snapshots = await service.get_snapshots()
    engine = StrategyEngine(settings.strategies)
    risk = RiskEngine()
    portfolio = {
        "returns": [0.01] * 200,
        "balance": 10000,
        "positions": [],
    }
    print("Simulated orders:")
    for snapshot in snapshots:
        market_row = snapshot.raw
        order = engine.generate_order(market_row)
        if order.get("action") == "hold" or order.get("size", 0) <= 0:
            print(f"- {snapshot.market_id}: no actionable signal")
            continue
        approved = risk.validate_order(order, portfolio)
        risk_meta = order.get("metadata", {}).get("risk", {})
        print(f"- {snapshot.market_id}: approved={approved}")
        print(f"  order={order}")
        print(f"  risk={risk_meta}")
        print(f"  service risk score={snapshot.risk_score} level={snapshot.risk_level}\n")


if __name__ == "__main__":
    asyncio.run(simulate_once())
