from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

from config import settings
from polymarket.data.providers.clob_ws import ClobWebSocketClient, WebSocketConfig
from polymarket.services.order_store import OrderStore


logger = logging.getLogger(__name__)


@dataclass
class OrderWsStatus:
    status: str = "disabled"  # disabled | starting | healthy | degraded | stopped
    reason: Optional[str] = None
    failures: int = 0
    cooldown_until: Optional[float] = None
    assets: int = 0
    last_success_epoch: Optional[float] = None
    last_error_epoch: Optional[float] = None
    last_error: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "status": self.status,
            "failures": self.failures,
            "assets": self.assets,
        }
        if self.reason:
            payload["reason"] = self.reason
        if self.cooldown_until is not None:
            payload["cooldown_remaining_seconds"] = max(0.0, self.cooldown_until - time.monotonic())
        if self.last_success_epoch is not None:
            payload["last_success_epoch"] = float(self.last_success_epoch)
        if self.last_error_epoch is not None:
            payload["last_error_epoch"] = float(self.last_error_epoch)
        if self.last_error:
            payload["last_error"] = self.last_error
        return payload


class OrderLifecycleStreamer:
    """Background order lifecycle listener (private WS; REST fallback planned).

    - Disabled by default; enable via SERVICE_USE_ORDER_WS=true and provide API creds in env.
    - Appends normalized lifecycle events to the existing JSONL writers (orders/trades).
    - Minimal parsing: attempts to map common message shapes to (submitted/partial/filled/cancelled).
    """

    def __init__(self, store: Optional[OrderStore] = None) -> None:
        self._store = store or OrderStore()
        self._task: Optional[asyncio.Task] = None
        self._ws_client: Optional[ClobWebSocketClient] = None
        self._markets: List[str] = []
        self._status = OrderWsStatus(status="disabled")
        self._closed = False
        self._seen: Dict[str, float] = {}

    def get_status(self) -> Dict[str, Any]:
        return self._status.as_dict()

    def running(self) -> bool:
        return self._task is not None and not self._task.done()

    async def start(self, market_ids: Iterable[str]) -> None:
        """Start streaming for the provided market ids, replacing any existing task."""
        if not settings.SERVICE_USE_ORDER_WS:
            self._status = OrderWsStatus(status="disabled", reason="feature_flag_off")
            return
        api_key = getattr(settings, "POLYMARKET_API_KEY", None)
        api_secret = getattr(settings, "POLYMARKET_API_SECRET", None)
        api_passphrase = getattr(settings, "POLYMARKET_API_PASSPHRASE", None)
        if not (api_key and api_secret and api_passphrase):
            self._status = OrderWsStatus(status="disabled", reason="missing_api_creds")
            logger.info("OrderLifecycleStreamer disabled: API creds not provided")
            return
        self._markets = list(dict.fromkeys([m for m in market_ids if m]))
        if settings.ORDER_WS_SUB_LIMIT and len(self._markets) > settings.ORDER_WS_SUB_LIMIT:
            self._markets = self._markets[: settings.ORDER_WS_SUB_LIMIT]
        # Recreate client each time to ensure subscription refresh is applied
        cfg = WebSocketConfig(endpoint=settings.CLOB_WS_URL, proxy_url=settings.PROXY_URL)
        self._ws_client = ClobWebSocketClient(cfg)
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except Exception:
                pass
        self._status = OrderWsStatus(status="starting", assets=len(self._markets))
        self._closed = False
        self._task = asyncio.create_task(self._run(api_key, api_secret, api_passphrase))

    async def stop(self) -> None:
        self._closed = True
        if self._task and not self._task.done():
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        self._task = None
        if self._ws_client:
            try:
                await self._ws_client.close()
            except Exception:
                pass
        self._status.status = "stopped"

    async def update_markets(self, market_ids: Iterable[str]) -> None:
        new_set = list(dict.fromkeys([m for m in market_ids if m]))
        if settings.ORDER_WS_SUB_LIMIT and len(new_set) > settings.ORDER_WS_SUB_LIMIT:
            new_set = new_set[: settings.ORDER_WS_SUB_LIMIT]
        if set(new_set) == set(self._markets):
            return
        await self.start(new_set)

    async def _run(self, api_key: str, api_secret: str, api_passphrase: str) -> None:
        assert self._ws_client is not None
        backoff = settings.ORDER_WS_COOLDOWN_SECONDS
        while not self._closed:
            try:
                self._status = OrderWsStatus(status="starting", assets=len(self._markets))
                async for msg in self._ws_client.stream_user_updates(
                    self._markets,
                    api_key=api_key,
                    api_secret=api_secret,
                    api_passphrase=api_passphrase,
                    reconnect=True,
                ):
                    self._status.status = "healthy"
                    self._status.last_success_epoch = time.time()
                    self._handle_message(msg)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("OrderLifecycleStreamer error: %s", exc)
                self._status.status = "degraded"
                self._status.reason = f"exception:{type(exc).__name__}"
                self._status.failures += 1
                self._status.cooldown_until = time.monotonic() + backoff
                self._status.last_error_epoch = time.time()
                try:
                    self._status.last_error = str(exc)
                except Exception:
                    pass
                await asyncio.sleep(backoff)

    def _handle_message(self, message: Dict[str, Any]) -> None:
        """Best-effort normalization for order lifecycle messages.

        We try to detect common shapes and map to:
        - orders.jsonl: event=submit|partial|filled|cancel|reject (plus context)
        - trades.jsonl: append when a fill/partial contains executed quantity/notional
        """
        try:
            order = message.get("order") if isinstance(message, dict) else None
            if not isinstance(order, dict):
                order = message
            status = str(order.get("status") or order.get("state") or "").lower()
            ev = str(message.get("event") or message.get("type") or status or "update").lower()
            market_id = str(order.get("market_id") or order.get("market") or order.get("condition_id") or "")
            order_id = order.get("id") or order.get("order_id")
            side = str(order.get("side") or order.get("action") or "").lower()
            price = _as_float(order.get("price") or order.get("avg_price") or order.get("average_price"))
            filled_size = _as_float(order.get("filled_size") or order.get("filled") or order.get("executed_quantity"))
            requested = _as_float(order.get("size") or order.get("quantity") or order.get("requested_size"))
            ts = order.get("timestamp") or message.get("timestamp") or time.time()

            # Classify event
            event = "update"
            if ev in {"submitted", "submit"}:
                event = "submit"
            elif ev in {"partial", "partially_filled", "partial_fill"} or (filled_size and requested and filled_size < requested):
                event = "partial"
            elif ev in {"filled", "fill"} or (filled_size and requested and filled_size >= requested):
                event = "filled"
            elif ev in {"cancel", "cancelled", "canceled"} or status in {"cancelled", "canceled"}:
                event = "cancel"
            elif ev in {"reject", "rejected"} or status == "rejected":
                event = "reject"

            order_record = {
                "timestamp": ts,
                "event": event,
                "order_id": order_id,
                "market_id": market_id,
                "action": side,
                "status": status or event,
                "size": requested,
                "filled_size": filled_size,
                "price": price,
                "raw": message,
            }
            self._store.append_order(order_record)

            # If a fill occurred, append trade record as delta fill (best-effort)
            if event in {"partial", "filled"} and filled_size and price and order_id:
                prev = float(self._seen.get(str(order_id)) or 0.0)
                delta = float(filled_size) - prev
                if delta > 1e-9:
                    self._store.append_trade(
                        {
                            "timestamp": ts,
                            "order_id": order_id,
                            "market_id": market_id,
                            "action": side,
                            "filled_shares": delta,
                            "average_price": price,
                            "notional": float(delta) * float(price),
                            "status": event,
                            "execution_mode": "order_ws",
                        }
                    )
                    self._seen[str(order_id)] = float(filled_size)
        except Exception:
            logger.debug("Failed to normalize order WS message", exc_info=True)


def _as_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        f = float(value)
        if f != f or f in (float("inf"), float("-inf")):
            return None
        return f
    except (TypeError, ValueError):
        return None


__all__ = ["OrderLifecycleStreamer", "OrderWsStatus"]
