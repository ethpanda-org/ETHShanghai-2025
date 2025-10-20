"""On-chain event provider using Web3."""

from __future__ import annotations

from typing import Any, AsyncGenerator, Dict

from web3 import Web3
from web3.exceptions import BlockNotFound

from config import settings

from .base import MarketDataProvider, ProviderResult


class OnChainEventProvider(MarketDataProvider):
    name = "onchain"

    def __init__(self) -> None:
        self._w3 = Web3(Web3.HTTPProvider(settings.POLYGON_RPC))
        self._contract = self._w3.eth.contract(
            address=settings.POLYMARKET_CONTRACT,
            abi=settings.ABI,
        )

    async def fetch_markets(self) -> ProviderResult:
        raise NotImplementedError("On-chain provider does not fetch markets")

    async def fetch_order_book(self, market_id: str) -> ProviderResult:
        raise NotImplementedError("On-chain provider does not fetch order book snapshots")

    def supports_streaming(self) -> bool:
        return True

    async def stream_updates(self) -> AsyncGenerator[ProviderResult, None]:
        last_block = self._w3.eth.block_number
        while True:
            try:
                current_block = self._w3.eth.block_number
                if current_block > last_block:
                    logs = self._contract.events.OrderFilled.get_logs(
                        fromBlock=last_block,
                        toBlock=current_block,
                    )
                    for entry in logs:
                        yield ProviderResult(
                            payload={
                                "event": "OrderFilled",
                                "block": entry["blockNumber"],
                                "args": dict(entry["args"]),
                            },
                            source=self.name,
                        )
                    last_block = current_block
            except BlockNotFound:
                last_block = max(last_block - 5, 0)
            finally:
                import asyncio

                await asyncio.sleep(5)
