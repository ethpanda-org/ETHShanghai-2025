"""Market data provider leveraging the official py-clob-client."""

from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import time
from collections import deque
from pathlib import Path
from typing import Any, Dict, Deque, List, Optional, Tuple

from config import settings
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import ApiCreds, BookParams

from .base import MarketDataProvider, ProviderResult

logger = logging.getLogger(__name__)


class ClobRestProvider(MarketDataProvider):
    name = "clob_rest"
    _history_file = Path("reports") / "_price_history.json"

    def __init__(
        self,
        *,
        base_url: Optional[str] = None,
        limit: int = 50,
        chain_id: int = 137,
    ) -> None:
        host = (base_url or settings.CLOB_REST_URL).rstrip("/")
        private_key = getattr(settings, "POLY_PRIVATE_KEY", None)
        api_key = getattr(settings, "POLYMARKET_API_KEY", None)
        api_secret = getattr(settings, "POLYMARKET_API_SECRET", None)
        api_passphrase = getattr(settings, "POLYMARKET_API_PASSPHRASE", None)

        creds: Optional[ApiCreds] = None
        if api_key and api_secret and api_passphrase:
            creds = ApiCreds(
                api_key=api_key,
                api_secret=api_secret,
                api_passphrase=api_passphrase,
            )

        self._client = ClobClient(host, chain_id=chain_id, key=private_key, creds=creds)
        self._limit = max(1, limit)
        self._price_history: Dict[str, Dict[str, float]] = self._load_history()
        self._enrich_details = str(os.getenv("SERVICE_MARKET_ENRICH_DETAILS", "false")).lower() == "true"
        # Prefer documented batch endpoints when enriching
        self._use_batch_details = str(os.getenv("SERVICE_MARKET_USE_BATCH", "true")).lower() in {"1", "true", "yes", "on"}
        try:
            self._details_limit = max(1, int(os.getenv("SERVICE_MARKET_DETAILS_LIMIT", "10")))
        except ValueError:
            self._details_limit = 10
        # retry settings
        try:
            from tenacity import retry, stop_after_attempt, wait_exponential_jitter, retry_if_exception_type

            def _r():
                return retry(
                    reraise=True,
                    stop=stop_after_attempt(3),
                    wait=wait_exponential_jitter(initial=0.5, max=4.0),
                    retry=retry_if_exception_type(Exception),
                )

            self._retry_decorator = _r
        except Exception:
            self._retry_decorator = None

        # Safer defaults for unstable or high-latency networks
        try:
            self._max_concurrency = max(1, int(os.getenv("SERVICE_REST_MAX_CONCURRENCY", "2")))
        except ValueError:
            self._max_concurrency = 4
        rate_env = os.getenv("SERVICE_REST_RATE_LIMIT_PER_SEC", "0.5").strip()
        try:
            self._rate_limit_per_sec = max(0.0, float(rate_env))
        except ValueError:
            self._rate_limit_per_sec = 0.0
        self._semaphore: Optional[asyncio.Semaphore] = None
        self._rate_lock: Optional[asyncio.Lock] = None
        self._next_slot = 0.0
        self._inflight = 0
        self._latency_samples: Deque[float] = deque(maxlen=200)
        self._metrics: Dict[str, Any] = {
            "requests": 0,
            "429s": 0,
            "inflight_peak": 0,
            "current_inflight": 0,
        }

    def _retry(self, func, *args, **kwargs):
        if self._retry_decorator is None:
            return func(*args, **kwargs)
        deco = self._retry_decorator()

        @deco
        def _wrapped():
            return func(*args, **kwargs)

        return _wrapped()

    def _ensure_controls(self) -> Tuple[asyncio.Semaphore, Optional[asyncio.Lock]]:
        asyncio.get_running_loop()
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(self._max_concurrency)
        if self._rate_limit_per_sec > 0 and self._rate_lock is None:
            self._rate_lock = asyncio.Lock()
        return self._semaphore, self._rate_lock

    async def _acquire_rate_limit(self) -> None:
        if self._rate_limit_per_sec <= 0:
            return
        _, rate_lock = self._ensure_controls()
        assert rate_lock is not None
        interval = 1.0 / self._rate_limit_per_sec
        while True:
            async with rate_lock:
                now = time.perf_counter()
                if now >= self._next_slot:
                    self._next_slot = now + interval
                    return
                wait_time = self._next_slot - now
            await asyncio.sleep(min(wait_time, 1.0))

    async def _call_with_limits(self, func, *args, **kwargs):
        semaphore, _ = self._ensure_controls()
        async with semaphore:
            self._inflight += 1
            self._metrics["inflight_peak"] = max(self._metrics["inflight_peak"], self._inflight)
            await self._acquire_rate_limit()
            start = time.perf_counter()
            try:
                loop = asyncio.get_running_loop()
                return await loop.run_in_executor(None, lambda: self._retry(func, *args, **kwargs))
            except Exception as exc:
                if self._is_rate_limited_error(exc):
                    self._metrics["429s"] += 1
                raise
            finally:
                elapsed_ms = (time.perf_counter() - start) * 1000.0
                self._latency_samples.append(elapsed_ms)
                self._metrics["requests"] += 1
                self._inflight = max(0, self._inflight - 1)
                self._metrics["current_inflight"] = self._inflight

    @staticmethod
    def _is_rate_limited_error(exc: Exception) -> bool:
        status = getattr(exc, "status", None)
        if status == 429:
            return True
        status_code = getattr(exc, "status_code", None)
        if status_code == 429:
            return True
        code = getattr(exc, "code", None)
        if code == 429:
            return True
        message = str(exc)
        if "429" in message or "Too Many Requests" in message:
            return True
        return False

    def metrics_snapshot(self) -> Dict[str, Any]:
        samples = list(self._latency_samples)
        summary: Dict[str, Any] = {
            "requests": self._metrics["requests"],
            "429s": self._metrics["429s"],
            "inflight_peak": self._metrics["inflight_peak"],
            "current_inflight": self._metrics["current_inflight"],
            "max_concurrency": self._max_concurrency,
            "rate_limit_per_sec": self._rate_limit_per_sec,
        }
        if samples:
            sorted_samples = sorted(samples)
            count = len(sorted_samples)
            p50 = sorted_samples[count // 2]
            p95_idx = min(count - 1, max(0, math.ceil(count * 0.95) - 1))
            p95 = sorted_samples[p95_idx]
            summary["latency_ms"] = {
                "avg": round(sum(samples) / count, 3),
                "p50": round(p50, 3),
                "p95": round(p95, 3),
                "min": round(sorted_samples[0], 3),
                "max": round(sorted_samples[-1], 3),
            }
            histogram = {
                "<=100ms": 0,
                "100-250ms": 0,
                "250-500ms": 0,
                "500-1000ms": 0,
                ">1000ms": 0,
            }
            for value in samples:
                if value <= 100:
                    histogram["<=100ms"] += 1
                elif value <= 250:
                    histogram["100-250ms"] += 1
                elif value <= 500:
                    histogram["250-500ms"] += 1
                elif value <= 1000:
                    histogram["500-1000ms"] += 1
                else:
                    histogram[">1000ms"] += 1
            summary["latency_histogram"] = histogram
        else:
            summary["latency_ms"] = None
            summary["latency_histogram"] = None
        return summary

    def _load_history(self) -> Dict[str, Dict[str, float]]:
        try:
            return json.loads(self._history_file.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return {}
        except json.JSONDecodeError:
            return {}

    def _save_history(self) -> None:
        self._history_file.parent.mkdir(parents=True, exist_ok=True)
        self._history_file.write_text(json.dumps(self._price_history), encoding="utf-8")

    def _is_market_tradable(self, market: Dict[str, Any]) -> bool:
        if not isinstance(market, dict):
            return False
        if not market.get("active", True):
            return False
        if market.get("archived"):
            return False
        if not market.get("accepting_orders", False):
            return False
        tokens = market.get("tokens") or []
        return any(token.get("price") is not None for token in tokens)

    async def fetch_markets(self) -> ProviderResult:
        markets: List[Dict[str, Any]] = []
        cursor = "MA=="

        async def _fetch_page(next_cursor: Optional[str]) -> Optional[Dict[str, Any]]:
            """Try documented endpoints first, then fall back to sampling."""
            last_exc: Optional[Exception] = None
            for fn in (
                self._client.get_markets,
                self._client.get_simplified_markets,
                self._client.get_sampling_simplified_markets,
            ):
                try:
                    return await self._call_with_limits(fn, next_cursor=next_cursor)
                except Exception as exc:
                    last_exc = exc
                    continue
            if last_exc:
                raise last_exc
            return None

        while len(markets) < self._limit:
            payload = await _fetch_page(cursor)
            if not payload:
                break
            page = payload.get("data", []) if isinstance(payload, dict) else payload
            if not page:
                break
            filtered = [item for item in page if self._is_market_tradable(item)]
            markets.extend(filtered)
            cursor = payload.get("next_cursor") if isinstance(payload, dict) else None
            if not cursor:
                break

        enriched: List[Dict[str, Any]] = []
        detail_tasks: Dict[str, asyncio.Task] = {}
        detail_order: List[str] = []
        token_to_market: Dict[str, str] = {}

        for market in markets:
            tokens = market.get("tokens") or []
            yes_token = tokens[0].get("token_id") if tokens else None

            def _coerce(value: Any) -> Optional[float]:
                try:
                    if value is None:
                        return None
                    result = float(value)
                    if result != result or result in (float("inf"), float("-inf")):
                        return None
                    return result
                except (TypeError, ValueError):
                    return None

            yes_price = _coerce(tokens[0].get("price")) if tokens else None
            if yes_price is None:
                yes_price = _coerce(market.get("yes_price")) or 0.5
            no_price = _coerce(tokens[1].get("price")) if len(tokens) > 1 else None
            if no_price is None:
                no_price = 1 - yes_price

            best_bid = _coerce(market.get("best_bid"))
            best_ask = _coerce(market.get("best_ask"))
            order_liquidity = _coerce(market.get("liquidity")) or 0.0
            last_trade_price = _coerce(market.get("last_trade_price")) or yes_price

            market_id = str(
                market.get("market_id")
                or market.get("condition_id")
                or market.get("id")
                or market.get("market")
                or "unknown"
            )

            if yes_token:
                token_to_market[yes_token] = market_id
            if (
                self._enrich_details
                and yes_token
                and len(detail_tasks) < self._details_limit
                and market_id not in detail_tasks
                and not self._use_batch_details
            ):
                # Per-token fallback enrichment
                detail_order.append(market_id)
                detail_tasks[market_id] = asyncio.create_task(self._collect_details(yes_token))

            previous = self._price_history.get(market_id)
            prev_price = previous.get("price") if previous else None
            price_change = 0.0
            if prev_price is not None:
                price_change = yes_price - float(prev_price)
            self._price_history[market_id] = {"price": yes_price, "timestamp": time.time()}

            bid = _coerce(market.get("bid"))
            ask = _coerce(market.get("ask"))
            if bid is None and best_bid is not None:
                bid = best_bid
            if ask is None and best_ask is not None:
                ask = best_ask
            if bid is None:
                bid = max(0.0, yes_price - 0.01)
            if ask is None:
                ask = min(1.0, yes_price + 0.01)

            volume_24h = _coerce(market.get("volume_24h"))
            if volume_24h is None:
                volume_24h = _coerce(market.get("volume")) or 0.0

            market.update(
                {
                    "yes_price": yes_price,
                    "no_price": no_price,
                    "best_bid": best_bid,
                    "best_ask": best_ask,
                    "bid": bid,
                    "ask": ask,
                    "volume_24h": order_liquidity if order_liquidity else volume_24h,
                    "volume": volume_24h,
                    "price_change_24h": price_change,
                    "last_trade_price": last_trade_price,
                }
            )
            enriched.append(market)

        detail_map: Dict[str, Dict[str, Optional[float]]] = {}
        # Batch enrichment first (preferred), then complement with any per-token tasks
        if self._enrich_details and self._use_batch_details and token_to_market:
            try:
                # Limit batch size by details_limit
                tokens = list(token_to_market.keys())[: self._details_limit]
                # Batch prices for both sides
                params_sell = [BookParams(token_id=t, side="SELL") for t in tokens]
                params_buy = [BookParams(token_id=t, side="BUY") for t in tokens]
                prices_sell = await self._call_with_limits(self._client.get_prices, params_sell)
                prices_buy = await self._call_with_limits(self._client.get_prices, params_buy)
                def _to_map(items, side_key: str) -> Dict[str, float]:
                    out: Dict[str, float] = {}
                    if isinstance(items, list):
                        for it in items:
                            tid = str(it.get("token_id") or it.get("tokenId") or "")
                            price = it.get("price") if isinstance(it, dict) else None
                            try:
                                if tid and price is not None:
                                    out[tid] = float(price)
                            except Exception:
                                continue
                    elif isinstance(items, dict) and items.get("data"):
                        for it in items.get("data"):
                            tid = str(it.get("token_id") or it.get("tokenId") or "")
                            price = it.get("price")
                            try:
                                if tid and price is not None:
                                    out[tid] = float(price)
                            except Exception:
                                continue
                    return out
                bids_by_token = _to_map(prices_sell, "SELL")  # SELL => best_bid
                asks_by_token = _to_map(prices_buy, "BUY")    # BUY  => best_ask

                # Batch order books (to estimate simple liquidity) and last trade price
                params_books = [BookParams(token_id=t) for t in tokens]
                books = await self._call_with_limits(self._client.get_order_books, params_books)
                last_prices = await self._call_with_limits(self._client.get_last_trades_prices, params_books)

                liquidity_by_token: Dict[str, float] = {}
                if isinstance(books, list):
                    for ob in books:
                        try:
                            tid = str(getattr(ob, "asset_id", None) or getattr(ob, "market", None) or "")
                        except Exception:
                            tid = ""
                        if not tid:
                            # Some clients may not echo token id; skip liquidity in that case
                            continue
                        total = 0.0
                        try:
                            levels = (getattr(ob, "bids", None) or [])[:5] + (getattr(ob, "asks", None) or [])[:5]
                            for lvl in levels:
                                try:
                                    sz = float(getattr(lvl, "size", None) or (isinstance(lvl, dict) and lvl.get("size") or 0.0))
                                except Exception:
                                    sz = 0.0
                                total += max(0.0, sz)
                        except Exception:
                            pass
                        liquidity_by_token[tid] = total

                last_by_token: Dict[str, float] = {}
                if isinstance(last_prices, list):
                    for it in last_prices:
                        try:
                            tid = str(it.get("token_id") or it.get("tokenId") or "")
                            price = it.get("price")
                            if tid and price is not None:
                                last_by_token[tid] = float(price)
                        except Exception:
                            continue
                elif isinstance(last_prices, dict) and last_prices.get("data"):
                    for it in last_prices.get("data"):
                        try:
                            tid = str(it.get("token_id") or it.get("tokenId") or "")
                            price = it.get("price")
                            if tid and price is not None:
                                last_by_token[tid] = float(price)
                        except Exception:
                            continue

                # Build detail_map per market via token mapping
                for token, market_id in token_to_market.items():
                    detail_map.setdefault(market_id, {})
                    if token in bids_by_token:
                        detail_map[market_id]["best_bid"] = bids_by_token[token]
                    if token in asks_by_token:
                        detail_map[market_id]["best_ask"] = asks_by_token[token]
                    if token in liquidity_by_token:
                        detail_map[market_id]["liquidity"] = liquidity_by_token[token]
                    if token in last_by_token:
                        detail_map[market_id]["last_trade_price"] = last_by_token[token]
            except Exception as exc:
                logger.debug("Batch enrichment failed: %s", exc, exc_info=True)

        if detail_tasks:
            results = await asyncio.gather(*detail_tasks.values(), return_exceptions=True)
            for market_id, result in zip(detail_order, results):
                if isinstance(result, Exception) or result is None:
                    logger.debug("Detail enrichment failed for %s: %s", market_id, result)
                    continue
                # Do not overwrite batch results if already present
                entry = detail_map.setdefault(market_id, {})
                for k, v in result.items():
                    if entry.get(k) is None and v is not None:
                        entry[k] = v

        for market in enriched:
            market_id = str(
                market.get("market_id")
                or market.get("condition_id")
                or market.get("id")
                or market.get("market")
                or "unknown"
            )
            details = detail_map.get(market_id)
            if details:
                if details.get("best_bid") is not None:
                    market["best_bid"] = details["best_bid"]
                    market["bid"] = details["best_bid"]
                if details.get("best_ask") is not None:
                    market["best_ask"] = details["best_ask"]
                    market["ask"] = details["best_ask"]
                if details.get("liquidity") is not None:
                    market["volume_24h"] = max(details["liquidity"], market.get("volume_24h", 0.0))
                    market["volume"] = market["volume_24h"]
                if details.get("last_trade_price") is not None:
                    market["last_trade_price"] = details["last_trade_price"]
                    market["yes_price"] = details["last_trade_price"]

        self._save_history()
        return ProviderResult(payload=enriched[: self._limit], source=self.name)

    async def fetch_order_book(self, market_id: str) -> ProviderResult:
        order_book = await self._call_with_limits(self._client.get_order_book, market_id)
        payload = order_book.__dict__ if hasattr(order_book, "__dict__") else order_book
        return ProviderResult(payload=payload, source=self.name)

    async def close(self) -> None:
        """Release any underlying network resources held by the client."""
        close_fn = getattr(self._client, "close", None)
        if callable(close_fn):
            try:
                result = close_fn()
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                logger.debug("Failed to close CLOB REST client cleanly", exc_info=True)

    async def _collect_details(self, yes_token: str) -> Optional[Dict[str, Optional[float]]]:
        best_bid = best_ask = None
        order_liquidity = 0.0
        last_trade_price: Optional[float] = None
        try:
            bid_resp = await self._call_with_limits(self._client.get_price, yes_token, "SELL")
            if bid_resp and bid_resp.get("price") is not None:
                best_bid = float(bid_resp.get("price"))
        except Exception as exc:
            logger.debug("Bid lookup failed for %s: %s", yes_token, exc)
        try:
            ask_resp = await self._call_with_limits(self._client.get_price, yes_token, "BUY")
            if ask_resp and ask_resp.get("price") is not None:
                best_ask = float(ask_resp.get("price"))
        except Exception as exc:
            logger.debug("Ask lookup failed for %s: %s", yes_token, exc)
        try:
            ob = await self._call_with_limits(self._client.get_order_book, yes_token)
            ob_dict = ob.__dict__ if hasattr(ob, "__dict__") else ob
            bids = ob_dict.get("bids") or []
            asks = ob_dict.get("asks") or []
            for entry in (bids[:5] + asks[:5]):
                try:
                    order_liquidity += float(entry.get("size", 0.0))
                except (TypeError, ValueError):
                    continue
        except Exception as exc:
            logger.debug("Order book lookup failed for %s: %s", yes_token, exc)
        try:
            last = await self._call_with_limits(self._client.get_last_trade_price, yes_token)
            if last and last.get("price") is not None:
                last_trade_price = float(last.get("price"))
        except Exception as exc:
            logger.debug("Last trade lookup failed for %s: %s", yes_token, exc)
        return {
            "best_bid": best_bid,
            "best_ask": best_ask,
            "liquidity": order_liquidity,
            "last_trade_price": last_trade_price,
        }
