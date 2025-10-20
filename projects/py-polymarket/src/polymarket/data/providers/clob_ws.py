"""Minimal WebSocket client for the Polymarket CLOB."""

from __future__ import annotations

import asyncio
import json
import logging
import time
import random
from dataclasses import dataclass
from typing import AsyncIterator, Dict, Iterable, List, Optional

import aiohttp

from config import settings

logger = logging.getLogger(__name__)


def _load_env_bool(name: str, default: bool = False) -> bool:
    value = settings.config.get(name.lower()) if hasattr(settings, "config") else None
    if value is None:
        value = settings.config.get(name.upper()) if hasattr(settings, "config") else None
    if value is None:
        value = settings.config.get(name) if hasattr(settings, "config") else None
    if value is None:
        value = settings.trading.__dict__.get(name.lower()) if hasattr(settings, "trading") else None
    if value is None:
        value = None
    raw = value if value is not None else None
    if raw is None:
        return default
    if isinstance(raw, bool):
        return raw
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def build_market_subscription(asset_ids: Iterable[str], *, initial_dump: bool = True) -> Dict[str, object]:
    """Construct a market-channel subscription payload.

    Docs note an optional `initial_dump` flag (default true) to request an initial
    order book snapshot on subscribe. We include it explicitly to match server
    expectations when present.
    """
    ids = [asset_id for asset_id in asset_ids if asset_id]
    if not ids:
        raise ValueError("asset_ids must contain at least one valid token id")
    # Field name per upstream clients is `asset_ids` (singular `asset`),
    # not `assets_ids`.
    return {"type": "market", "asset_ids": ids, "initial_dump": bool(initial_dump)}


def build_user_subscription(markets: Iterable[str], *, api_key: str, api_secret: str, api_passphrase: str) -> Dict[str, object]:
    """Construct a user-channel subscription payload (requires creds)."""
    market_ids = [mid for mid in markets if mid]
    if not market_ids:
        raise ValueError("markets must contain at least one market id")
    if not api_key or not api_secret or not api_passphrase:
        raise ValueError("api_key, api_secret and api_passphrase are required for user subscriptions")
    return {
        "type": "user",
        "markets": market_ids,
        "auth": {"apiKey": api_key, "secret": api_secret, "passphrase": api_passphrase},
    }


@dataclass
class WebSocketConfig:
    endpoint: str
    proxy_url: Optional[str] = None
    # Docs example suggests 10s app heartbeat; also keep ws-level ping
    heartbeat_interval: float = 10.0
    reconnect_delay: float = 5.0
    max_reconnect_delay: float = 300.0
    trust_env: bool = False


class ClobWebSocketClient:
    """Small utility to consume Polymarket CLOB WebSocket channels."""

    def __init__(self, config: Optional[WebSocketConfig] = None) -> None:
        endpoint = settings.CLOB_WS_URL if config is None else config.endpoint
        self._config = config or WebSocketConfig(endpoint=settings.CLOB_WS_URL, proxy_url=settings.PROXY_URL)
        self._endpoint = endpoint
        self._session: Optional[aiohttp.ClientSession] = None
        self._closed = False

    async def __aenter__(self) -> "ClobWebSocketClient":
        await self._ensure_session()
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.close()

    async def close(self) -> None:
        self._closed = True
        if self._session is not None:
            await self._session.close()
            self._session = None

    async def stream_market_updates(
        self,
        asset_ids: Iterable[str],
        *,
        heartbeat_interval: Optional[float] = None,
        reconnect: bool = True,
    ) -> AsyncIterator[Dict[str, object]]:
        """Yield updates from the market channel."""
        subscription = build_market_subscription(asset_ids)
        async for message in self._stream(subscription, heartbeat_interval=heartbeat_interval, reconnect=reconnect):
            yield message

    async def stream_user_updates(
        self,
        market_ids: Iterable[str],
        *,
        api_key: str,
        api_secret: str,
        api_passphrase: str,
        heartbeat_interval: Optional[float] = None,
        reconnect: bool = True,
    ) -> AsyncIterator[Dict[str, object]]:
        """Yield private order updates for specific markets via user channel."""
        subscription = build_user_subscription(market_ids, api_key=api_key, api_secret=api_secret, api_passphrase=api_passphrase)
        async for message in self._stream(subscription, heartbeat_interval=heartbeat_interval, reconnect=reconnect):
            yield message

    async def _stream(
        self,
        subscription: Dict[str, object],
        *,
        heartbeat_interval: Optional[float],
        reconnect: bool,
    ) -> AsyncIterator[Dict[str, object]]:
        heartbeat = heartbeat_interval if heartbeat_interval is not None else self._config.heartbeat_interval
        base_delay = max(1.0, self._config.reconnect_delay)
        max_delay = max(base_delay, self._config.max_reconnect_delay)
        failures = 0

        def _channel_url(base: str, sub: Dict[str, object]) -> str:
            """Resolve channel URL. If base ends with /ws, append /market or /user.
            If it already ends with a channel suffix, keep as-is.
            """
            try:
                st = str(sub.get("type") or "")
            except Exception:
                st = ""
            b = base.rstrip("/")
            if b.endswith("/ws/market") or b.endswith("/ws/user"):
                return b
            if b.endswith("/ws"):
                suffix = "/market" if st == "market" else "/user" if st == "user" else ""
                return b + suffix
            return b
        while not self._closed:
            try:
                await self._ensure_session()
                assert self._session is not None  # for mypy
                url = _channel_url(self._endpoint, subscription)
                async with self._session.ws_connect(
                    url,
                    proxy=self._config.proxy_url,
                    heartbeat=heartbeat,
                    timeout=aiohttp.ClientTimeout(total=None),
                ) as ws:
                    await ws.send_json(subscription)
                    logger.debug("Subscribed to WebSocket channel %s", subscription.get("type"))
                    # In addition to websocket control ping, send a lightweight text PING per docs
                    async def _text_ping_task():
                        try:
                            interval = max(5.0, heartbeat)
                            while True:
                                await asyncio.sleep(interval)
                                try:
                                    await ws.send_str("PING")
                                except Exception:
                                    break
                        except asyncio.CancelledError:
                            pass
                    ping_task = asyncio.create_task(_text_ping_task())
                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            try:
                                payload = json.loads(msg.data)
                            except json.JSONDecodeError:
                                logger.debug("Discarding non-JSON WebSocket message: %s", msg.data)
                                continue
                            # Stream considered healthy once payload arrives
                            failures = 0
                            yield payload
                        elif msg.type == aiohttp.WSMsgType.ERROR:
                            logger.warning("WebSocket error: %s", msg.data)
                            break
                        elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.CLOSING):
                            try:
                                code = getattr(ws, "close_code", None)
                            except Exception:
                                code = None
                            logger.info("WebSocket closed by server (code=%s)", code)
                            break
                        else:
                            continue
                    try:
                        ping_task.cancel()
                    except Exception:
                        pass
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("WebSocket stream failed: %s", exc)
            if not reconnect:
                break
            # Exponential backoff with jitter on repeated failures
            failures += 1
            delay = min(max_delay, base_delay * (2 ** (failures - 1)))
            delay *= (0.75 + 0.5 * random.random())
            await asyncio.sleep(delay)

    async def _ensure_session(self) -> None:
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=None)
            # Allow opting into system proxy variables for WS via config (e.g., corporate env)
            trust = bool(self._config.trust_env)
            self._session = aiohttp.ClientSession(timeout=timeout, trust_env=trust)


__all__ = ["ClobWebSocketClient", "WebSocketConfig", "build_market_subscription", "build_user_subscription"]
