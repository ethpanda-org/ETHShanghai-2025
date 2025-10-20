"""Interactive demo CLI for exploring strategy and risk outputs."""

import argparse
import asyncio
import json
from typing import Any, Dict

from config import settings
from polymarket.data.facade import DataIngestionFacade
from polymarket.strategies import StrategyEngine
from polymarket.risk import RiskEngine


async def _gather_snapshot(use_offline: bool, limit: int) -> Dict[str, Any]:
    original_offline = settings.OFFLINE_MODE
    try:
        settings.OFFLINE_MODE = use_offline or settings.OFFLINE_MODE
        facade = DataIngestionFacade(use_graphql=not settings.OFFLINE_MODE, ttl_seconds=0, limit=limit)
        markets = await facade.get_markets(force_refresh=True)
        return markets[0].raw if markets else {}
    finally:
        settings.OFFLINE_MODE = original_offline


def render_preview(order: Dict[str, Any]) -> None:
    print("=== Strategy Decision Preview ===")
    print(json.dumps(order, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Quick interactive strategy demo")
    parser.add_argument("--offline", action="store_true", help="Use built-in offline fixtures")
    parser.add_argument("--limit", type=int, default=20, help="Max markets loaded for the preview")
    args = parser.parse_args()

    snapshot = asyncio.run(_gather_snapshot(args.offline, args.limit))
    if not snapshot:
        print("No market data available for demo mode.")
        return

    engine = StrategyEngine(settings.strategies)
    risk = RiskEngine()

    order = engine.generate_order(snapshot)
    approved = risk.validate_order(order, {
        "returns": [0.01] * 200,
        "balance": settings.trading.initial_balance,
        "positions": [],
    })
    order.setdefault("metadata", {}).setdefault("risk", {})["approved"] = approved

    render_preview(order)


if __name__ == "__main__":
    main()
