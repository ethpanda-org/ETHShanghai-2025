"""Simulation utilities bridging legacy strategies to the new engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable

from polymarket.strategies.engine import StrategyEngine


@dataclass
class LegacyMarket:
    market_id: str
    bid: float
    ask: float
    volatility: float
    extra: Dict[str, float]

    def to_raw(self) -> Dict[str, float]:
        payload = {"market_id": self.market_id, "bid": self.bid, "ask": self.ask, "volatility": self.volatility}
        payload.update(self.extra)
        return payload


def run_simulation(markets: Iterable[LegacyMarket], strategies: Dict[str, Dict]) -> Dict[str, Dict]:
    engine = StrategyEngine(strategies)
    results = {}
    for market in markets:
        order = engine.generate_order(market.to_raw())
        results[market.market_id] = order
    return results
