"""High-level market data access facade."""

from __future__ import annotations

import asyncio
import contextlib
import inspect
import logging
import math
import os
import time
from dataclasses import dataclass
from typing import Any, AsyncIterator, Dict, Iterable, List, Mapping, Optional

from config import settings

from .cache.memory import TTLCache
from .models.market import MarketTicker
from .providers import ClobRestProvider, ClobWebSocketClient, WebSocketConfig
from .providers.base import MarketDataProvider
from .providers.graphql import GraphQLProvider
from .enrichment import enrich_market_data, sentiment_telemetry
from .validation import validate_market_data

logger = logging.getLogger(__name__)


@dataclass
class HotAssetEntry:
    token_id: str
    market_id: str
    base_score: float
    last_seen: float
    last_hit: float = 0.0
    bonus: float = 0.0


class HotAssetRegistry:
    """Track active/high-volume assets for WebSocket subscriptions."""

    def __init__(
        self,
        *,
        limit: Optional[int],
        static_assets: Optional[Iterable[str]] = None,
        min_score: float = 0.0,
        sticky_seconds: float = 120.0,
        expiry_seconds: float = 600.0,
        hit_boost: float = 0.0,
    ) -> None:
        self._limit = limit if limit and limit > 0 else None
        self._min_score = max(0.0, min_score)
        self._sticky_seconds = max(0.0, sticky_seconds)
        self._expiry_seconds = max(self._sticky_seconds, expiry_seconds)
        self._hit_boost = max(0.0, hit_boost)
        self._entries: Dict[str, HotAssetEntry] = {}
        unique_static: List[str] = []
        for asset in list(static_assets or []):
            if asset and asset not in unique_static:
                unique_static.append(asset)
        self._static_assets = unique_static

    @staticmethod
    def _now() -> float:
        return time.monotonic()

    @staticmethod
    def _as_float(value: Any) -> float:
        try:
            if value is None:
                return 0.0
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    def ingest_markets(self, markets: Iterable[Dict[str, Any]]) -> None:
        now = self._now()
        for market in markets:
            market_id = str(
                market.get("market_id")
                or market.get("condition_id")
                or market.get("id")
                or market.get("market")
                or ""
            )
            if not market_id:
                continue
            volume = self._as_float(market.get("volume_24h") or market.get("liquidity"))
            spread = self._as_float(market.get("ask")) - self._as_float(market.get("bid"))
            if spread <= 0:
                spread = 0.01
            liquidity = self._as_float(market.get("liquidity"))
            market_score = max(volume, 0.0) + max(liquidity, 0.0) * 0.5
            spread_component = max(0.0, 1.0 - min(1.0, spread)) * 500.0
            market_score += spread_component

            if market_score <= 0:
                continue

            for token in market.get("tokens") or []:
                token_id = token.get("token_id") or token.get("id")
                if not token_id:
                    continue
                token_interest = self._as_float(token.get("open_interest"))
                token_score = market_score + token_interest * 0.1
                entry = self._entries.get(token_id)
                if entry is None:
                    self._entries[token_id] = HotAssetEntry(
                        token_id=token_id,
                        market_id=market_id,
                        base_score=token_score,
                        last_seen=now,
                    )
                else:
                    entry.market_id = market_id
                    entry.base_score = token_score
                    entry.last_seen = now
        self._prune(now)

    def touch(self, token_id: str, *, market_id: Optional[str] = None, boost: Optional[float] = None) -> None:
        entry = self._entries.get(token_id)
        now = self._now()
        if entry is None:
            self._entries[token_id] = HotAssetEntry(
                token_id=token_id,
                market_id=market_id or "unknown",
                base_score=self._min_score,
                last_seen=now,
                last_hit=now,
                bonus=max(self._hit_boost, boost or 0.0),
            )
            return
        if market_id:
            entry.market_id = market_id
        entry.last_hit = now
        entry.last_seen = now
        entry.bonus = max(entry.bonus, boost or self._hit_boost)

    def _prune(self, now: float) -> None:
        stale: List[str] = []
        for token_id, entry in self._entries.items():
            if entry.bonus > 0.0 and now - entry.last_hit > self._sticky_seconds:
                entry.bonus = 0.0
            if now - entry.last_seen > self._expiry_seconds and entry.bonus == 0.0:
                stale.append(token_id)
        for token_id in stale:
            self._entries.pop(token_id, None)

    def active_assets(self) -> List[str]:
        now = self._now()
        self._prune(now)
        dynamic: List[Tuple[str, float]] = []
        for token_id, entry in self._entries.items():
            effective_bonus = entry.bonus if now - entry.last_hit <= self._sticky_seconds else 0.0
            effective_score = max(0.0, entry.base_score) + effective_bonus
            if entry.base_score < self._min_score and effective_bonus <= 0.0:
                continue
            dynamic.append((token_id, effective_score))
        dynamic.sort(key=lambda item: item[1], reverse=True)

        ordered: List[str] = []
        for token_id in self._static_assets:
            if token_id not in ordered:
                ordered.append(token_id)
        for token_id, _score in dynamic:
            if token_id not in ordered:
                ordered.append(token_id)

        if self._limit is None:
            return ordered
        return ordered[: self._limit]

    def describe(self) -> Dict[str, Any]:
        now = self._now()
        return {
            "limit": self._limit,
            "static": list(self._static_assets),
            "entries": [
                {
                    "token_id": entry.token_id,
                    "market_id": entry.market_id,
                    "base_score": entry.base_score,
                    "bonus": entry.bonus if now - entry.last_hit <= self._sticky_seconds else 0.0,
                    "last_seen": entry.last_seen,
                    "last_hit": entry.last_hit,
                }
                for entry in self._entries.values()
            ],
        }


class DataIngestionFacade:
    """Coordinate multiple providers and expose simplified accessors."""

    def __init__(
        self,
        *,
        use_graphql: bool = False,
        ttl_seconds: int = 30,
        limit: int = 50,
        proxy_url: Optional[str] = None,
        graphql_use_proxy: Optional[bool] = None,
    ) -> None:
        self._proxy_url = proxy_url or settings.PROXY_URL
        self._use_graphql = use_graphql and not settings.OFFLINE_MODE
        self._graphql_use_proxy = (
            self._proxy_url is not None if graphql_use_proxy is None else graphql_use_proxy
        )
        self._limit = limit
        self._cache: TTLCache[List[MarketTicker]] = TTLCache(ttl_seconds)
        self._base_ttl = max(0, ttl_seconds)
        self._current_ttl = self._base_ttl if self._base_ttl else 30
        self._last_ws_update: Optional[float] = None
        self._last_ws_idle: Optional[float] = None
        self._last_ws_wallclock: Optional[float] = None
        self._last_rest_fetch_ts: Optional[float] = None
        # Lazily create the asyncio lock inside async contexts to avoid requiring
        # a running event loop at construction time (tests may instantiate sync).
        self._lock: Optional[asyncio.Lock] = None

        self._rest_provider: MarketDataProvider = ClobRestProvider(limit=limit)
        # Track repeated snapshots where REST reports inflight requests after completion
        self._rest_inflight_streak = 0
        self._rest_inflight_warning_active = False
        self._rest_inflight_threshold = 3
        self._graphql_provider: Optional[MarketDataProvider] = None
        if self._use_graphql:
            graphql_proxy_url = self._proxy_url if self._graphql_use_proxy else None
            self._graphql_provider = GraphQLProvider(
                limit=limit,
                use_proxy=self._graphql_use_proxy,
                proxy_url=graphql_proxy_url,
            )

        config_use_ws = bool(getattr(settings, "DATA_USE_WS", False))
        use_ws_env = os.getenv("SERVICE_USE_WS", "true").strip().lower()
        env_use_ws = use_ws_env in {"1", "true", "yes", "on"}
        self._use_ws = (config_use_ws or env_use_ws) and not settings.OFFLINE_MODE
        if self._use_ws and not env_use_ws and config_use_ws:
            logger.info("SERVICE_USE_WS enabled via configuration flag")
        self._ws_client: Optional[ClobWebSocketClient] = None
        self._ws_task: Optional[asyncio.Task] = None
        self._ws_failures: int = 0
        self._ws_disabled_until: Optional[float] = None
        self._ws_health_status: Dict[str, Any] = {
            "status": "initialising" if self._use_ws else "disabled",
            "reason": None,
        }
        self._current_markets: Dict[str, Dict[str, Any]] = {}
        self._token_map: Dict[str, str] = {}
        self._ws_assets: List[str] = []
        self._hot_registry: Optional[HotAssetRegistry] = None
        ws_limit_env = os.getenv("SERVICE_WS_ASSET_LIMIT", "20").strip()
        try:
            self._ws_asset_limit = max(0, int(ws_limit_env))
        except ValueError:
            self._ws_asset_limit = 0
        static_env = os.getenv("SERVICE_WS_STATIC_ASSETS", "")
        self._ws_static_assets = [token.strip() for token in static_env.split(',') if token.strip()]

        if self._use_ws:
            def _env_float(name: str, default: float) -> float:
                raw = os.getenv(name)
                if raw is None or not raw.strip():
                    return default
                try:
                    return float(raw)
                except ValueError:
                    logger.warning("Invalid value for %s=%s; using default %.2f", name, raw, default)
                    return default

            min_score = _env_float("SERVICE_WS_MIN_SCORE", 2500.0)
            sticky_seconds = _env_float("SERVICE_WS_HOT_STICKY_SECONDS", 180.0)
            expiry_seconds = _env_float("SERVICE_WS_HOT_TTL_SECONDS", 900.0)
            hit_boost = _env_float("SERVICE_WS_HIT_BOOST", max(100.0, min_score * 0.1))
            limit = self._ws_asset_limit if self._ws_asset_limit > 0 else None
            self._hot_registry = HotAssetRegistry(
                limit=limit,
                static_assets=self._ws_static_assets,
                min_score=min_score,
                sticky_seconds=sticky_seconds,
                expiry_seconds=expiry_seconds,
                hit_boost=hit_boost,
            )
            # Decide WS proxy independently of REST proxy
            hb = _env_float("SERVICE_WS_HEARTBEAT_SECONDS", 20.0)
            rdelay = _env_float("SERVICE_WS_RECONNECT_DELAY", 5.0)
            ws_use_proxy = str(os.getenv("SERVICE_WS_USE_PROXY", "")).strip().lower() in {"1", "true", "yes", "on"}
            ws_proxy_override = os.getenv("CLOB_WS_PROXY_URL")
            if ws_proxy_override:
                ws_proxy = ws_proxy_override
            elif ws_use_proxy and self._proxy_url:
                ws_proxy = self._proxy_url
            else:
                ws_proxy = None
            ws_trust_env = str(os.getenv("SERVICE_WS_TRUST_ENV", "false")).strip().lower() in {"1", "true", "yes", "on"}
            ws_config = WebSocketConfig(endpoint=settings.CLOB_WS_URL, proxy_url=ws_proxy, heartbeat_interval=hb, reconnect_delay=rdelay, trust_env=ws_trust_env)
            self._ws_client = ClobWebSocketClient(ws_config)
            logger.info(
                "WebSocket streaming enabled (limit=%s, static=%d, min_score=%.0f, sticky=%ss, ws_proxy=%s, trust_env=%s, hb=%ss, rdelay=%ss)",
                self._ws_asset_limit if self._ws_asset_limit > 0 else "unbounded",
                len(self._ws_static_assets),
                min_score,
                sticky_seconds,
                "set" if ws_proxy else "none",
                ws_trust_env,
                hb,
                rdelay,
            )


        self._last_fetch_info: Dict[str, Optional[str]] = {"fallback": False, "reason": None}
    async def get_markets(self, force_refresh: bool = False) -> List[MarketTicker]:
        # Ensure lock is created within an async context (loop is available).
        if self._lock is None:
            try:
                self._lock = asyncio.Lock()
            except RuntimeError:
                # Fallback: if somehow no loop, proceed without a lock (single coroutine path)
                self._lock = asyncio.Lock()
        cached = None if force_refresh else self._cache.get()
        if cached is not None:
            return [MarketTicker(**vars(item)) for item in cached]

        async with self._lock:
            cached = None if force_refresh else self._cache.get()
            if cached is not None:
                return [MarketTicker(**vars(item)) for item in cached]

            result = await self._fetch_markets()
            return result

    async def get_order_book(self, market_id: str) -> Dict[str, Any]:
        if settings.OFFLINE_MODE:
            return {"bids": [{"price": 0.45, "quantity": 100}], "asks": [{"price": 0.55, "quantity": 120}]}
        response = await self._rest_provider.fetch_order_book(market_id)
        return response.payload

    def cache_metadata(self) -> Optional[Dict[str, Optional[float]]]:
        cached = self._cache.get()
        if cached is None:
            return None
        meta = self._cache.metadata()
        if meta is None:
            return None
        age, _timestamp = meta
        return {
            "count": float(len(cached)),
            "age_s": float(age),
            "ttl": float(self._current_ttl),
            "ws_idle_s": float(self._last_ws_idle) if self._last_ws_idle is not None else None,
            "ws_status": dict(self._ws_health_status),
            "ws_last_message_ts": float(self._last_ws_wallclock) if self._last_ws_wallclock is not None else None,
            "rest_last_fetch_ts": float(self._last_rest_fetch_ts) if self._last_rest_fetch_ts is not None else None,
        }

    def _compute_cache_ttl(self) -> int:
        if self._base_ttl == 0:
            self._last_ws_idle = None
            return 0
        base = self._base_ttl if self._base_ttl else 30
        if not self._use_ws:
            self._last_ws_idle = None
            return base
        now = time.monotonic()
        idle: Optional[float] = None
        if self._last_ws_update is None:
            ttl = min(base, 10)
        else:
            idle = now - self._last_ws_update
            if idle <= 15:
                ttl = max(base, 30)
            elif idle <= 60:
                ttl = max(10, min(base, 20))
            else:
                ttl = 5
        ttl = max(3, min(int(round(ttl)), 60))
        self._last_ws_idle = None if self._last_ws_update is None else idle
        return ttl

    def _store_cache(self, tickers: List[MarketTicker]) -> None:
        ttl = self._compute_cache_ttl()
        self._current_ttl = ttl
        self._cache.set_ttl(ttl)
        self._cache.set(tickers)
        self._update_last_fetch_cache(len(tickers))

    def _update_last_fetch_cache(self, count: int) -> None:
        cache_info: Dict[str, Any] = {
            "count": int(count),
            "age_s": 0.0,
            "ttl": float(self._current_ttl),
        }
        if self._last_ws_idle is not None:
            cache_info["ws_idle_s"] = float(self._last_ws_idle)
        self._last_fetch_info["cache"] = cache_info

    def _track_rest_metrics(self, metrics: Optional[Dict[str, Any]]) -> None:
        if not metrics:
            self._rest_inflight_streak = 0
            self._rest_inflight_warning_active = False
            return
        inflight = metrics.get("current_inflight")
        if isinstance(inflight, (int, float)) and inflight > 0:
            self._rest_inflight_streak += 1
            if (
                self._rest_inflight_streak >= self._rest_inflight_threshold
                and not self._rest_inflight_warning_active
            ):
                self._rest_inflight_warning_active = True
                logger.warning(
                    "REST provider reports %s inflight requests after completion (%d consecutive snapshots). "
                    "This may indicate a hanging HTTP session.",
                    inflight,
                    self._rest_inflight_streak,
                )
        else:
            self._rest_inflight_streak = 0
            self._rest_inflight_warning_active = False

    async def _fetch_markets(self) -> List[MarketTicker]:
        start_time = time.perf_counter()
        self._last_fetch_info = {'fallback': False, 'reason': None}
        if settings.OFFLINE_MODE:
            logger.info("OFFLINE_MODE enabled; returning fixture market data")
            self._last_fetch_info = {'fallback': True, 'reason': 'offline_mode'}
            tickers = self._offline_fixture_tickers()
            self._store_cache(tickers)
            self._track_rest_metrics(None)
            return tickers

        if self._graphql_provider is not None:
            try:
                payload = await self._graphql_provider.fetch_markets()
                if payload.payload:
                    enriched_payload = enrich_market_data(payload.payload)
                    validation_report = validate_market_data(enriched_payload, log_report=True)
                    logger.info(
                        "Data validation: %s/%s markets ready",
                        validation_report["valid_markets"],
                        validation_report["total_markets"],
                    )
                    self._last_fetch_info = {
                        'fallback': False,
                        'reason': None,
                        'validation': {
                            'total': validation_report.get('total_markets', 0),
                            'valid': validation_report.get('valid_markets', 0),
                            'coverage': validation_report.get('strategy_coverage', {}),
                        },
                    }
                    self._track_rest_metrics(None)
                    sentiment_stats = sentiment_telemetry(reset=True)
                    if sentiment_stats:
                        self._last_fetch_info["sentiment"] = sentiment_stats
                    return [self._to_ticker(item) for item in enriched_payload]
            except Exception as exc:
                logger.warning("GraphQL provider failed: %s", exc)

        try:
            payload = await self._rest_provider.fetch_markets()
        except Exception as exc:
            logger.error("REST provider failed: %s", exc, exc_info=True)
            self._last_fetch_info = {'fallback': True, 'reason': 'rest_exception'}
            metrics_fn = getattr(self._rest_provider, "metrics_snapshot", None)
            if callable(metrics_fn):
                metrics_snapshot = metrics_fn()
                self._last_fetch_info["rest_metrics"] = metrics_snapshot
                self._track_rest_metrics(metrics_snapshot)
            else:
                self._track_rest_metrics(None)
            return self._fallback_offline_tickers("REST provider error")

        markets: List[Dict[str, Any]] = payload.payload or []
        self._last_rest_fetch_ts = time.time()
        if not markets:
            self._last_fetch_info = {'fallback': True, 'reason': 'rest_empty_payload'}
            metrics_fn = getattr(self._rest_provider, "metrics_snapshot", None)
            if callable(metrics_fn):
                metrics_snapshot = metrics_fn()
                self._last_fetch_info["rest_metrics"] = metrics_snapshot
                self._track_rest_metrics(metrics_snapshot)
            else:
                self._track_rest_metrics(None)
            return self._fallback_offline_tickers("REST provider returned empty payload")

        enriched_markets = enrich_market_data(markets)
        validation_report = validate_market_data(enriched_markets, log_report=True)
        logger.info(
            "Data validation: %s/%s markets ready",
            validation_report["valid_markets"],
            validation_report["total_markets"],
        )
        self._last_fetch_info = {
            'fallback': False,
            'reason': None,
            'validation': {
                'total': validation_report.get('total_markets', 0),
                'valid': validation_report.get('valid_markets', 0),
                'coverage': validation_report.get('strategy_coverage', {}),
            },
        }
        metrics_fn = getattr(self._rest_provider, "metrics_snapshot", None)
        if callable(metrics_fn):
            metrics_snapshot = metrics_fn()
            self._last_fetch_info["rest_metrics"] = metrics_snapshot
            self._track_rest_metrics(metrics_snapshot)
        else:
            self._track_rest_metrics(None)
        self._update_current_markets(enriched_markets)
        if self._use_ws:
            await self._ensure_ws_task(enriched_markets)
            if self._ws_disabled_until is None and self._last_ws_update is not None:
                idle = time.monotonic() - self._last_ws_update
                stale_threshold = max(120.0, (self._base_ttl if self._base_ttl else 5) * 4)
                if idle > stale_threshold:
                    self._handle_ws_failure(f"stale:{int(idle)}s")
            self._last_fetch_info["ws_status"] = dict(self._ws_health_status)
        else:
            self._last_fetch_info["ws_status"] = {"status": "disabled", "reason": "ws_disabled"}
        # Annotate current source and cooldown remaining seconds, if any
        try:
            src = "rest_only"
            if self._use_ws and self._ws_disabled_until is None:
                if self._last_ws_update is not None:
                    idle2 = time.monotonic() - self._last_ws_update
                    src = "ws_live" if idle2 <= 60 else "ws_stale"
                else:
                    src = "ws_initialising"
            self._last_fetch_info["current_source"] = src
            if self._ws_disabled_until is not None:
                remaining = max(0.0, self._ws_disabled_until - time.monotonic())
                self._last_fetch_info["ws_cooldown_remaining_seconds"] = round(remaining, 2)
        except Exception:
            pass
        tickers = [self._to_ticker(item) for item in enriched_markets]
        ttl = self._base_ttl
        if self._use_ws:
            ttl = min(self._base_ttl if self._base_ttl else 5, 5) or 5
        self._store_cache(tickers)
        sentiment_stats = sentiment_telemetry(reset=True)
        if sentiment_stats:
            self._last_fetch_info["sentiment"] = sentiment_stats
        elapsed = time.perf_counter() - start_time
        self._last_fetch_info['fetch_time_seconds'] = round(elapsed, 3)
        self._last_fetch_info['markets_returned'] = len(tickers)
        logger.info("REST fetch completed in %.2fs (markets=%d, ws=%s)", elapsed, len(tickers), self._use_ws)
        return tickers

    def _offline_fixture_payload(self) -> List[Dict[str, Any]]:
        payload: List[Dict[str, Any]] = [
            {
                "market_id": "SIM-1",
                "bid": 0.45,
                "ask": 0.55,
                "high": 0.6,
                "low": 0.4,
                "volatility": 0.1,
                "volume_24h": 5000,
            },
            {
                "market_id": "SIM-2",
                "bid": 0.30,
                "ask": 0.35,
                "high": 0.36,
                "low": 0.29,
                "volatility": 0.05,
                "volume_24h": 8000,
            },
        ]
        return enrich_market_data(payload)

    def _offline_fixture_tickers(self) -> List[MarketTicker]:
        enriched_payload = self._offline_fixture_payload()
        tickers = [self._to_ticker(item) for item in enriched_payload]
        sentiment_stats = sentiment_telemetry(reset=True)
        if sentiment_stats:
            self._last_fetch_info["sentiment"] = sentiment_stats
        return tickers

    def _fallback_offline_tickers(self, reason: str) -> List[MarketTicker]:
        logger.warning("Falling back to offline fixture markets: %s", reason)
        tickers = self._offline_fixture_tickers()
        self._store_cache(tickers)
        return tickers

    def last_fetch_info(self) -> Dict[str, Optional[str]]:
        return dict(self._last_fetch_info)

    async def stream_market_updates(
        self,
        asset_ids: List[str],
        *,
        heartbeat_interval: Optional[float] = None,
        reconnect: bool = True,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Yield updates from the CLOB WebSocket when enabled."""
        if not self._ws_client:
            raise RuntimeError("WebSocket streaming is disabled. Set SERVICE_USE_WS=true to enable it.")
        async for message in self._ws_client.stream_market_updates(
            asset_ids, heartbeat_interval=heartbeat_interval, reconnect=reconnect
        ):
            yield message

    def _update_current_markets(self, markets: List[Dict[str, Any]]) -> None:
        self._current_markets = {}
        self._token_map = {}
        for entry in markets:
            market_id = str(
                entry.get("market_id")
                or entry.get("condition_id")
                or entry.get("id")
                or entry.get("market")
                or "unknown"
            )
            if not market_id:
                continue
            self._current_markets[market_id] = dict(entry)
            for token in entry.get("tokens") or []:
                token_id = token.get("token_id")
                if token_id:
                    self._token_map[token_id] = market_id
        if self._hot_registry:
            self._hot_registry.ingest_markets(markets)

    async def _ensure_ws_task(self, markets: List[Dict[str, Any]]) -> None:
        if not self._ws_client:
            return
        if self._ws_disabled_until is not None:
            remaining = self._ws_disabled_until - time.monotonic()
            if remaining > 0:
                self._last_fetch_info["ws_status"] = dict(self._ws_health_status)
                return
            logger.info("Re-enabling WebSocket streaming after cooldown")
            self._ws_disabled_until = None
            self._ws_failures = 0
            self._ws_health_status = {"status": "restarting", "reason": None}
        asset_ids: List[str] = []
        if self._hot_registry:
            asset_ids = list(dict.fromkeys(self._hot_registry.active_assets()))
        if not asset_ids:
            asset_ids.extend(self._ws_static_assets)
            for entry in markets:
                for token in entry.get("tokens") or []:
                    token_id = token.get("token_id")
                    if token_id:
                        asset_ids.append(token_id)
            asset_ids = list(dict.fromkeys(asset_ids))
            if self._ws_asset_limit > 0:
                asset_ids = asset_ids[: self._ws_asset_limit]
        if not asset_ids:
            return
        if self._ws_task and not self._ws_task.done():
            if set(asset_ids) == set(self._ws_assets):
                return
            self._ws_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._ws_task
        if set(asset_ids) != set(self._ws_assets):
            logger.debug(
                "Refreshing WS subscription asset set (count=%d)",
                len(asset_ids),
            )
        self._ws_assets = asset_ids
        self._ws_health_status = {
            "status": "starting",
            "assets": len(asset_ids),
        }
        self._ws_task = asyncio.create_task(self._run_ws_updates(asset_ids))

    def _handle_ws_failure(self, reason: str) -> None:
        if not self._use_ws:
            return
        self._ws_failures += 1
        backoff = min(900.0, 60.0 * self._ws_failures)
        self._ws_disabled_until = time.monotonic() + backoff
        self._ws_health_status = {
            "status": "degraded",
            "reason": reason,
            "retry_seconds": round(backoff, 2),
            "failures": self._ws_failures,
        }
        if self._ws_task:
            try:
                self._ws_task.cancel()
            except Exception:
                logger.debug("Failed to cancel WS task on WS failure", exc_info=True)
            self._ws_task = None
        logger.warning(
            "WebSocket streaming degraded (%s). Falling back to REST for %.0fs",
            reason,
            backoff,
        )

    async def _run_ws_updates(self, asset_ids: List[str]) -> None:
        if not self._ws_client:
            return
        try:
            async for message in self._ws_client.stream_market_updates(asset_ids, reconnect=True):
                await self._apply_ws_update(message)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("WebSocket market stream terminated: %s", exc)
            self._handle_ws_failure(f"exception:{exc}")
        finally:
            self._ws_task = None
            if self._ws_disabled_until is None:
                self._ws_health_status = {"status": "stopped", "reason": None}

    async def _apply_ws_update(self, message: Dict[str, Any]) -> None:
        asset_id = message.get("asset_id") or message.get("token_id")
        if not asset_id:
            return
        market_id = self._token_map.get(asset_id)
        if not market_id:
            return
        ws_timestamp = time.monotonic()
        if self._lock is None:
            try:
                self._lock = asyncio.Lock()
            except RuntimeError:
                self._lock = asyncio.Lock()
        async with self._lock:
            raw = self._current_markets.get(market_id)
            if raw is None:
                return
            raw = dict(raw)
            raw["ws_last_update"] = message

            def _as_float(value: Any) -> Optional[float]:
                try:
                    if value is None:
                        return None
                    return float(value)
                except (TypeError, ValueError):
                    return None

            bid_update = _as_float(message.get("best_bid") or message.get("bestBid") or message.get("bid"))
            ask_update = _as_float(message.get("best_ask") or message.get("bestAsk") or message.get("ask"))
            last_price = _as_float(
                message.get("last_trade_price") or message.get("lastPrice") or message.get("price")
            )
            if bid_update is not None:
                raw["bid"] = bid_update
            if ask_update is not None:
                raw["ask"] = ask_update
            if last_price is not None:
                raw["last_trade_price"] = last_price
                raw["yes_price"] = last_price

            self._current_markets[market_id] = raw
            self._last_ws_update = ws_timestamp
            self._last_ws_wallclock = time.time()
            self._last_ws_idle = 0.0
            tickers = [self._to_ticker(dict(item)) for item in self._current_markets.values()]
            self._cache.set(tickers)
            if self._hot_registry:
                self._hot_registry.touch(asset_id, market_id=market_id)
            self._ws_failures = 0
            self._ws_health_status = {
                "status": "healthy",
                "last_update_epoch": time.time(),
            }

    def _to_ticker(self, market: Dict[str, Any]) -> MarketTicker:
        def _as_float(value: Any) -> Optional[float]:
            try:
                return float(value)
            except (TypeError, ValueError):
                return None

        def _normalise_change(value: Any) -> Optional[float]:
            try:
                val = float(value)
            except (TypeError, ValueError):
                return None
            if not math.isfinite(val):
                return None
            if abs(val) > 1.0:
                if abs(val) <= 100.0:
                    val /= 100.0
                else:
                    val /= 1000.0
            return max(-1.0, min(1.0, val))

        def _orderbook_notional(side: str) -> Optional[float]:
            book = market.get("orderbook")
            if not isinstance(book, dict):
                return None
            levels = book.get("asks" if side == "ask" else "bids")
            if not isinstance(levels, list):
                return None
            total = 0.0
            for level in levels:
                if not isinstance(level, Mapping):
                    continue
                price = level.get("price") or level.get("p")
                qty = level.get("size") or level.get("q") or level.get("quantity")
                try:
                    price_f = float(price)
                    qty_f = float(qty)
                except (TypeError, ValueError):
                    continue
                if price_f <= 0 or qty_f <= 0:
                    continue
                total += price_f * qty_f
            return total if total > 0 else None

        yes_price = _as_float(market.get("yes_price"))
        if yes_price is None:
            tokens = market.get("tokens") or []
            yes_price = _as_float(tokens[0].get("price")) if tokens else 0.5
        no_price = _as_float(market.get("no_price"))
        if no_price is None and yes_price is not None:
            no_price = 1.0 - yes_price

        bid = _as_float(market.get("bid"))
        ask = _as_float(market.get("ask"))
        if bid is None:
            bid = _as_float(market.get("best_bid"))
        if ask is None:
            ask = _as_float(market.get("best_ask"))
        if bid is None or ask is None:
            bid = yes_price if bid is None else bid
            ask = yes_price if ask is None else ask

        market_id = str(
            market.get("market_id")
            or market.get("condition_id")
            or market.get("id")
            or market.get("market")
            or "unknown"
        )

        volatility = _as_float(market.get("volatility"))
        if volatility is None and yes_price is not None:
            volatility = yes_price * (1 - yes_price)

        market.setdefault("yes_price", yes_price)
        market.setdefault("no_price", no_price)
        if volatility is not None:
            market["volatility"] = volatility
        if _as_float(market.get("bid")) is None and bid is not None:
            market["bid"] = bid
        if _as_float(market.get("ask")) is None and ask is not None:
            market["ask"] = ask
        for key in ("price_change_24h", "price_change_1h", "momentum"):
            norm = _normalise_change(market.get(key))
            if norm is None:
                market.pop(key, None)
            else:
                market[key] = norm
        depth_yes = _orderbook_notional("ask")
        depth_no = _orderbook_notional("bid")
        if depth_yes is not None:
            market["depth_yes_notional"] = depth_yes
        if depth_no is not None:
            market["depth_no_notional"] = depth_no
        market.setdefault("market_id", market_id)
        market.setdefault("condition_id", market.get("condition_id") or market_id)
        tokens = market.get("tokens")
        if isinstance(tokens, list) and tokens:
            first = tokens[0]
            token_id = first.get("token_id") or first.get("id")
            if token_id:
                market.setdefault("token_id", token_id)

        return MarketTicker(
            market_id=market_id,
            bid=bid,
            ask=ask,
            high=_as_float(market.get("high")),
            low=_as_float(market.get("low")),
            volatility=volatility,
            raw=market,
        )

    async def close(self) -> None:
        """Release network resources associated with REST and WebSocket ingestion."""
        self._track_rest_metrics(None)
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._ws_task
        self._ws_task = None
        if self._ws_client is not None:
            try:
                await self._ws_client.close()
            except Exception:
                logger.debug("Failed to close WebSocket client cleanly", exc_info=True)
            self._ws_client = None
        close_fn = getattr(self._rest_provider, "close", None)
        if callable(close_fn):
            try:
                result = close_fn()
                if inspect.isawaitable(result):
                    await result
            except Exception:
                logger.debug("REST provider close raised an exception", exc_info=True)
        self._rest_inflight_streak = 0
        self._rest_inflight_warning_active = False

    async def __aenter__(self) -> "DataIngestionFacade":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.close()


__all__ = ["DataIngestionFacade", "MarketTicker"]





