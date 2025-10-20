from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, Iterable, List, Optional

from config import settings
from polymarket.services.order_store import OrderStore

try:
    from py_clob_client.client import ClobClient
except Exception:  # pragma: no cover - optional dependency already in requirements
    ClobClient = None  # type: ignore[assignment]


logger = logging.getLogger(__name__)


class OrderRestPoller:
    """Best-effort REST poller for order lifecycle when WS is degraded/disabled.

    - Requires API creds via environment; when missing, remains inactive.
    - Writes normalized events into orders.jsonl and trades.jsonl with minimal dedupe.
    """

    def __init__(self, store: Optional[OrderStore] = None) -> None:
        self._store = store or OrderStore()
        self._task: Optional[asyncio.Task] = None
        self._closed = False
        self._seen: Dict[str, Dict[str, Any]] = {}
        self._client: Optional[Any] = None
        self._markets: List[str] = []
        self._errors: int = 0
        self._success: int = 0
        self._last_success_epoch: Optional[float] = None
        self._last_error_epoch: Optional[float] = None
        self._last_error: Optional[str] = None

    def running(self) -> bool:
        return self._task is not None and not self._task.done()

    def get_status(self) -> Dict[str, Any]:
        return {
            "running": self.running(),
            "interval_seconds": int(getattr(settings, "ORDER_REST_POLL_SECONDS", 15)),
            "limit": int(getattr(settings, "ORDER_REST_POLL_LIMIT", 100)),
            "success": self._success,
            "errors": self._errors,
            "last_success_epoch": self._last_success_epoch,
            "last_error_epoch": self._last_error_epoch,
            "last_error": self._last_error,
        }

    async def start(self, market_ids: Iterable[str]) -> None:
        if not settings.SERVICE_USE_ORDER_REST_FALLBACK:
            return
        if ClobClient is None:
            logger.info("OrderRestPoller disabled: py_clob_client unavailable")
            return
        api_key = getattr(settings, "POLYMARKET_API_KEY", None)
        api_secret = getattr(settings, "POLYMARKET_API_SECRET", None)
        api_passphrase = getattr(settings, "POLYMARKET_API_PASSPHRASE", None)
        private_key = getattr(settings, "POLY_PRIVATE_KEY", None)
        if not (api_key and api_secret and api_passphrase):
            logger.info("OrderRestPoller disabled: API creds not provided")
            return
        self._markets = list(dict.fromkeys([m for m in market_ids if m]))
        # (Re)create client
        try:
            self._client = ClobClient(settings.CLOB_REST_URL, chain_id=137, key=private_key, creds={
                "api_key": api_key,
                "api_secret": api_secret,
                "api_passphrase": api_passphrase,
            })
        except Exception as exc:
            logger.warning("Failed to init ClobClient for REST poller: %s", exc)
            self._client = None
            return
        # Restart task
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except Exception:
                pass
        self._closed = False
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._closed = True
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except Exception:
                pass
        self._task = None

    async def update_markets(self, market_ids: Iterable[str]) -> None:
        new = list(dict.fromkeys([m for m in market_ids if m]))
        if set(new) == set(self._markets):
            return
        self._markets = new

    async def _run(self) -> None:
        interval = int(getattr(settings, "ORDER_REST_POLL_SECONDS", 15))
        while not self._closed:
            try:
                await self._poll_once()
                self._success += 1
                import time as _t
                self._last_success_epoch = _t.time()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.debug("OrderRestPoller poll failed", exc_info=True)
                self._errors += 1
                import time as _t
                self._last_error_epoch = _t.time()
                if self._last_error is None:
                    try:
                        self._last_error = "poll_failed"
                    except Exception:
                        pass
            await asyncio.sleep(interval)

    async def _poll_once(self) -> None:
        client = self._client
        if client is None:
            return
        orders = self._fetch_orders(client)
        if not isinstance(orders, list):
            return
        limit = int(getattr(settings, "ORDER_REST_POLL_LIMIT", 100))
        count = 0
        for order in orders:
            if limit and count >= limit:
                break
            if not isinstance(order, dict):
                continue
            mid = str(order.get("market_id") or order.get("market") or order.get("condition_id") or "")
            if self._markets and mid and mid not in self._markets:
                continue
            oid = str(order.get("id") or order.get("order_id") or "")
            status = str(order.get("status") or order.get("state") or "").lower()
            side = str(order.get("side") or order.get("action") or "").lower()
            price = _f(order.get("price") or order.get("avg_price") or order.get("average_price"))
            size = _f(order.get("size") or order.get("quantity"))
            filled = _f(order.get("filled_size") or order.get("filled") or order.get("executed_quantity"))
            ts = order.get("timestamp") or time.time()

            prev = self._seen.get(oid) or {}
            prev_status = str(prev.get("status") or "")
            prev_filled = _f(prev.get("filled")) or 0.0
            size_val = float(size) if size is not None else None
            filled_val = float(filled) if filled is not None else None
            # normalize status
            event = "update"
            if status in {"open", "submitted", "pending"}:
                event = "submit"
            elif status in {"partially_filled", "partial"} or (filled and size and filled < size):
                event = "partial"
            elif status in {"filled", "closed"} or (filled and size and filled >= size):
                event = "filled"
            elif status in {"cancelled", "canceled"}:
                event = "cancel"
            elif status == "rejected":
                event = "reject"
            # dedupe: only record if status changed or filled increased
            should_write = False
            if event in {"partial", "filled"}:
                if filled_val is not None and filled_val > prev_filled + 1e-9:
                    should_write = True
                elif status and status != prev_status:
                    should_write = True
            else:
                if status and status != prev_status:
                    should_write = True
            if should_write:
                self._store.append_order(
                    {
                        "timestamp": ts,
                        "event": event,
                        "order_id": oid or None,
                        "market_id": mid or None,
                        "action": side or None,
                        "size": size,
                        "filled_size": filled,
                        "price": price,
                        "status": status or event,
                        "source": "rest_poll",
                    }
                )
                if event in {"partial", "filled"} and filled is not None and price is not None:
                    delta = (filled_val or 0.0) - (prev_filled or 0.0)
                    if delta <= 1e-9:
                        pass
                    else:
                        self._store.append_trade(
                            {
                                "timestamp": ts,
                                "order_id": oid or None,
                                "market_id": mid or None,
                                "action": side or None,
                                "filled_shares": delta,
                                "average_price": price,
                                "notional": float(delta) * float(price),
                                "status": event,
                                "execution_mode": "order_rest",
                            }
                        )
            # update seen snapshot
            self._seen[oid] = {"status": status, "filled": filled_val or 0.0, "size": size_val}
            count += 1

    # Attempt multiple method names to maximize compatibility across client versions
    def _fetch_orders(self, client: Any) -> List[Dict[str, Any]]:
        # Attempt paginated fetch; fall back to single-shot list
        collected: List[Dict[str, Any]] = []
        max_total = int(getattr(settings, "ORDER_REST_POLL_LIMIT", 100))
        # candidate methods and cursor param names
        method_names = ["list_orders", "get_orders", "get_user_orders", "get_open_orders"]
        cursor_params = ["next_cursor", "cursor", "page", "pageToken"]
        for mname in method_names:
            fn = getattr(client, mname, None)
            if not callable(fn):
                continue
            # first call without cursor
            try:
                res = fn()
            except Exception as exc:
                logger.debug("order poll %s() failed: %s", mname, exc)
                continue
            data, next_cursor = self._extract_orders(res)
            if data:
                collected.extend(data)
            # try to page while we have a next_cursor and capacity
            cursor = next_cursor
            while cursor and len(collected) < max_total:
                called = False
                for pname in cursor_params:
                    try:
                        res = fn(**{pname: cursor})
                        called = True
                        break
                    except Exception:
                        continue
                if not called:
                    break
                data, cursor = self._extract_orders(res)
                if data:
                    collected.extend(data)
                else:
                    break
            if collected:
                break
        return collected[:max_total]

    @staticmethod
    def _extract_orders(result: Any) -> "tuple[list[dict], Optional[str]]":
        try:
            if isinstance(result, dict):
                data = result.get("data") or result.get("orders") or []
                nxt = result.get("next_cursor") or result.get("nextCursor") or None
                if isinstance(data, list):
                    parsed = [dict(item) if not isinstance(item, dict) and hasattr(item, "__dict__") else (item if isinstance(item, dict) else {}) for item in data]
                    return parsed, nxt
            if isinstance(result, list):
                parsed = [dict(item) if not isinstance(item, dict) and hasattr(item, "__dict__") else (item if isinstance(item, dict) else {}) for item in result]
                return parsed, None
        except Exception:
            logger.debug("failed to extract orders payload", exc_info=True)
        return [], None


def _f(v: Any) -> Optional[float]:
    try:
        if v is None:
            return None
        f = float(v)
        if f != f:
            return None
        return f
    except (TypeError, ValueError):
        return None


__all__ = ["OrderRestPoller"]
