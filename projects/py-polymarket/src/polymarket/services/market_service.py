from __future__ import annotations

import asyncio
import inspect
import logging
import os
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from config import settings
from polymarket.data.facade import DataIngestionFacade
from polymarket.data.models.market import MarketTicker


logger = logging.getLogger(__name__)


@dataclass
class ServiceLayerConfig:
    market_cache_ttl: int = int(os.getenv("SERVICE_MARKET_CACHE_TTL", "30"))
    max_cache_size: int = int(os.getenv("SERVICE_MARKET_CACHE_MAX", "1"))
    market_fetch_limit: int = int(os.getenv("SERVICE_MARKET_FETCH_LIMIT", "50"))
    use_graphql: bool = os.getenv("SERVICE_USE_GRAPHQL", "false").lower() == "true"
    graphql_use_proxy: bool = os.getenv("SERVICE_GRAPHQL_USE_PROXY", "false").lower() == "true"
    risk_threshold_high: float = float(os.getenv("SERVICE_RISK_THRESHOLD_HIGH", "0.7"))
    risk_threshold_medium: float = float(os.getenv("SERVICE_RISK_THRESHOLD_MEDIUM", "0.4"))
    ws_stale_seconds: int = int(os.getenv("SERVICE_WS_STALE_SECONDS", "15"))

    def __post_init__(self) -> None:
        self.market_cache_ttl = max(0, self.market_cache_ttl)
        self.max_cache_size = max(1, self.max_cache_size)
        self.market_fetch_limit = max(1, self.market_fetch_limit)
        self.risk_threshold_high = max(0.0, min(1.0, self.risk_threshold_high))
        self.risk_threshold_medium = max(0.0, min(self.risk_threshold_high, self.risk_threshold_medium))
        self.ws_stale_seconds = max(0, self.ws_stale_seconds)


service_config = ServiceLayerConfig()


@dataclass
class MarketSnapshot:
    """Normalized market data with derived risk metrics."""

    market_id: str
    bid: float
    ask: float
    spread: float
    volatility: Optional[float]
    risk_score: float
    risk_level: str
    raw: Dict[str, Any]


class MarketDataService:
    """Service layer around market data sources with caching and risk scoring."""

    def __init__(self, ingestion: Optional[DataIngestionFacade] = None) -> None:
        proxy_url = settings.PROXY_URL
        graphql_use_proxy = service_config.graphql_use_proxy and bool(proxy_url)
        self._ingestion = ingestion or DataIngestionFacade(
            use_graphql=service_config.use_graphql,
            ttl_seconds=service_config.market_cache_ttl,
            limit=service_config.market_fetch_limit,
            proxy_url=proxy_url,
            graphql_use_proxy=graphql_use_proxy,
        )
        if not service_config.use_graphql:
            logger.info('GraphQL provider disabled; falling back to REST-only ingest')
        self._risk_hi = service_config.risk_threshold_high
        self._risk_mid = service_config.risk_threshold_medium
        self._last_fetch_info: Dict[str, Optional[str]] = {"fallback": False, "reason": None}

    async def get_snapshots(self, force_refresh: bool = False) -> List[MarketSnapshot]:
        markets = await self._ingestion.get_markets(force_refresh=force_refresh)
        self._last_fetch_info = self._ingestion.last_fetch_info()
        # Augment with freshness metrics for strategy visibility
        try:
            cache_meta = self._ingestion.cache_metadata() or {}
        except Exception:
            cache_meta = {}
        # Embed minimal freshness snapshot
        try:
            ws_ts = cache_meta.get("ws_last_message_ts")
            rest_ts = cache_meta.get("rest_last_fetch_ts")
            now = datetime.now(timezone.utc)
            def _age(ts):
                if not ts:
                    return None
                try:
                    if isinstance(ts, (int, float)):
                        dt = datetime.fromtimestamp(float(ts), tz=timezone.utc)
                    else:
                        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
                    return max(0.0, (now - dt).total_seconds())
                except Exception:
                    return None
            self._last_fetch_info.setdefault("sources", {})
            self._last_fetch_info["sources"].update(
                {
                    "ws_age_seconds": _age(ws_ts),
                    "rest_age_seconds": _age(rest_ts),
                }
            )
            # Mark stale WS as a fallback reason to inform runner risk/strategy gates
            try:
                ws_age = self._last_fetch_info["sources"]["ws_age_seconds"]
                if (ws_age is not None) and (ws_age > service_config.ws_stale_seconds) and (not settings.OFFLINE_MODE):
                    self._last_fetch_info["fallback"] = True
                    self._last_fetch_info.setdefault("reason", "stale_ws")
            except Exception:
                pass
        except Exception:
            pass
        return [self._build_snapshot(ticker) for ticker in markets]

    def last_fetch_info(self) -> Dict[str, Optional[str]]:
        return dict(self._last_fetch_info)

    def get_snapshots_sync(self, force_refresh: bool = False) -> List[MarketSnapshot]:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(self.get_snapshots(force_refresh=force_refresh))
        else:
            return asyncio.run_coroutine_threadsafe(
                self.get_snapshots(force_refresh=force_refresh),
                loop,
            ).result()

    def cache_metadata(self) -> Optional[Dict[str, Optional[float]]]:
        return self._ingestion.cache_metadata()

    def _build_snapshot(self, ticker: MarketTicker) -> MarketSnapshot:
        bid = ticker.bid
        ask = ticker.ask
        spread = max(0.0, ask - bid)
        volatility = ticker.volatility if isinstance(ticker.volatility, (int, float)) else None
        vol_value = float(volatility) if volatility is not None else 0.0

        risk_score = self._calculate_risk_score(spread, ask, vol_value)
        risk_level = self._risk_level(risk_score)

        observed_at = datetime.now(timezone.utc).isoformat()
        raw = dict(ticker.raw)
        raw['bid'] = bid
        raw['ask'] = ask
        if raw.get('yes_price') is None:
            raw['yes_price'] = bid if bid else ask
        if raw.get('no_price') is None and raw.get('yes_price') is not None:
            try:
                raw['no_price'] = 1.0 - float(raw['yes_price'])
            except (TypeError, ValueError):
                raw['no_price'] = None
        mid_price = (bid + ask) / 2.0 if (bid or ask) else 0.5
        raw.setdefault('mid_price', mid_price)
        raw.setdefault('price', mid_price)
        raw.setdefault('volume_24h', raw.get('volume_24h') or raw.get('volume') or 0.0)
        if volatility is not None:
            raw.setdefault('volatility', float(volatility))
        # Surface computed risk into raw for strategy gates
        raw.setdefault('risk_level', risk_level)
        raw.setdefault('risk_score', risk_score)
        raw['observed_at'] = observed_at

        return MarketSnapshot(
            market_id=ticker.market_id,
            bid=bid,
            ask=ask,
            spread=spread,
            volatility=volatility,
            risk_score=risk_score,
            risk_level=risk_level,
            raw=raw,
        )

    def as_records(self, snapshots: List[MarketSnapshot]) -> List[Dict[str, Any]]:
        return [self._snapshot_to_record(snapshot) for snapshot in snapshots]

    def _snapshot_to_record(self, snapshot: MarketSnapshot) -> Dict[str, Any]:
        record = dict(snapshot.raw)
        record['market_id'] = snapshot.market_id
        record['bid'] = snapshot.bid
        record['ask'] = snapshot.ask
        mid_price = (snapshot.bid + snapshot.ask) / 2.0 if (snapshot.bid or snapshot.ask) else record.get('price', 0.5)
        record.setdefault('price', mid_price)
        record.setdefault('volume_24h', record.get('volume_24h') or record.get('volume') or 0.0)
        if snapshot.volatility is not None:
            record.setdefault('volatility', float(snapshot.volatility))
        if not record.get('observed_at'):
            record['observed_at'] = datetime.now(timezone.utc).isoformat()
        return record

    def _calculate_risk_score(self, spread: float, ask: float, volatility: float) -> float:
        price = max(ask, 1e-6)
        spread_ratio = min(1.0, spread / price)
        vol_component = min(1.0, max(0.0, volatility))
        score = min(1.0, 0.6 * spread_ratio + 0.4 * vol_component)
        return round(score, 4)

    def _risk_level(self, score: float) -> str:
        if score >= self._risk_hi:
            return "HIGH"
        if score >= self._risk_mid:
            return "MEDIUM"
        return "LOW"

    async def close(self) -> None:
        close_fn = getattr(self._ingestion, "close", None)
        if callable(close_fn):
            try:
                result = close_fn()
                if inspect.isawaitable(result):
                    await result
            except Exception:
                logger.debug("MarketDataService ingestion close raised an exception", exc_info=True)

    async def __aenter__(self) -> "MarketDataService":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.close()


__all__ = ["MarketDataService", "MarketSnapshot", "service_config"]









