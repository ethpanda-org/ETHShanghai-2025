"""GraphQL provider for Polymarket market data."""

from __future__ import annotations

from typing import Any, Dict, Optional

from config import settings
from polymarket.data.graphql_client import PolymarketGraphQLClient

from .base import MarketDataProvider, ProviderResult


class GraphQLProvider(MarketDataProvider):
    name = "graphql"

    def __init__(self, limit: int = 50, use_proxy: Optional[bool] = None, proxy_url: Optional[str] = None) -> None:
        self._limit = limit
        self._use_proxy = settings.PROXY_URL is not None if use_proxy is None else use_proxy
        self._proxy_url = proxy_url or settings.PROXY_URL

    async def fetch_markets(self) -> ProviderResult:
        proxy_cfg: Optional[Dict[str, Any]] = None
        if self._use_proxy and self._proxy_url:
            proxy_cfg = {"url": self._proxy_url}
        async with PolymarketGraphQLClient(
            use_proxy=bool(proxy_cfg),
            proxy_config=proxy_cfg,
        ) as client:
            payload = await client.fetch_market_data(limit=self._limit)
            return ProviderResult(payload=payload or [], source=self.name)

    async def fetch_order_book(self, market_id: str) -> ProviderResult:
        raise NotImplementedError("Order book fetch via GraphQL is not implemented")
