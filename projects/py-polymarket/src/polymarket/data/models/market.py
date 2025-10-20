"""Typed models for market data responses."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class MarketTicker:
    market_id: str
    bid: float
    ask: float
    high: Optional[float]
    low: Optional[float]
    volatility: Optional[float]
    raw: Dict[str, Any]


@dataclass
class OrderBook:
    market_id: str
    bids: Any
    asks: Any
    raw: Dict[str, Any]
