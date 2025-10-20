"""Base classes and utilities for market data providers."""

from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional


@dataclass
class ProviderResult:
    """Wrapper for data responses and metadata."""

    payload: Any
    source: str
    metadata: Optional[Dict[str, Any]] = None


class MarketDataProvider(abc.ABC):
    """Abstract interface for fetching market data."""

    name: str = "provider"

    @abc.abstractmethod
    async def fetch_markets(self) -> ProviderResult:  # pragma: no cover - interface
        """Return market listings payload."""

    @abc.abstractmethod
    async def fetch_order_book(self, market_id: str) -> ProviderResult:  # pragma: no cover - interface
        """Return order book snapshot for a market."""

    def supports_streaming(self) -> bool:
        return False

    async def stream_updates(self) -> Iterable[ProviderResult]:  # pragma: no cover - optional
        raise NotImplementedError("Streaming not supported by this provider")
