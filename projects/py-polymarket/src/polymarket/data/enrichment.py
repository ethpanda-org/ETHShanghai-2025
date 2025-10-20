"""Market data enrichment module to add missing fields for all strategies."""

import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import statistics

from config import settings
from .sentiment_provider import SentimentProvider

logger = logging.getLogger(__name__)


class MarketDataEnricher:
    """Enrich market data with additional fields required by all strategies."""
    
    def __init__(self):
        self._price_history: Dict[str, List[Dict[str, Any]]] = {}
        self._external_prices: Dict[str, Dict[str, float]] = {}
        self._sentiment_cache: Dict[str, Dict[str, Any]] = {}
        self._sentiment_provider = SentimentProvider()
        self._sentiment_stats: Dict[str, Any] = {
            "total_markets": 0,
            "cache_hits": 0,
            "live_requests": 0,
            "live_hits": 0,
            "live_misses": 0,
            "fallback_used": 0,
            "offline_blocks": 0,
            "live_sources_available": self._sentiment_provider.has_live_sources(),
            "offline_mode": bool(getattr(settings, "OFFLINE_MODE", False)),
            "last_live_source": None,
            "last_live_at": None,
            "last_fallback_reason": None,
            "fallback_reasons": {},
        }
        self._internal_pairs = self._build_internal_pairs()
        
    def enrich_market_data(self, markets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enrich market data with all fields needed by strategies."""
        enriched_markets = []
        
        for market in markets:
            try:
                enriched = self._enrich_single_market(market)
                enriched_markets.append(enriched)
            except Exception as e:
                logger.warning(f"Failed to enrich market {market.get('market_id', 'unknown')}: {e}")
                # Add basic enrichment even if full enrichment fails
                enriched_markets.append(self._add_basic_enrichment(market))
                
        if enriched_markets:
            # refresh mapping in case settings were reloaded
            self._internal_pairs = self._build_internal_pairs()
            if self._internal_pairs:
                self._attach_internal_references(enriched_markets)

        return enriched_markets
    
    def _enrich_single_market(self, market: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich a single market with all required fields."""
        market_id = market.get("market_id", "unknown")
        
        # Create enriched copy
        enriched = market.copy()
        
        # 1. Add price change data for momentum strategy
        enriched.update(self._add_price_change_data(market_id, market))
        
        # 2. Add external price data for arbitrage strategy (preserve upstream truth; synthetic only as fallback)
        enriched.update(self._add_external_price_data(market_id, market))
        
        # 3. Add sentiment data for event-driven strategy
        enriched.update(self._add_sentiment_data(market_id, market))
        
        # 4. Add volume data
        enriched.update(self._add_volume_data(market))
        
        # 5. Ensure bid/ask data for mean reversion
        enriched.update(self._ensure_bid_ask_data(market))
        
        # 6. Add technical indicators
        enriched.update(self._add_technical_indicators(market_id, market))
        
        return enriched
    
    def _add_price_change_data(self, market_id: str, market: Dict[str, Any]) -> Dict[str, Any]:
        """Add price change data for momentum strategy."""
        current_price = self._get_current_price(market)
        
        # Update price history
        if market_id not in self._price_history:
            self._price_history[market_id] = []
            
        history = self._price_history[market_id]
        now = time.time()
        
        # Add current price to history
        history.append({
            "price": current_price,
            "timestamp": now,
            "volume": market.get("volume_24h", 0)
        })
        
        # Keep only last 24 hours of data
        cutoff = now - 24 * 3600
        history[:] = [h for h in history if h["timestamp"] > cutoff]
        
        # Calculate price changes
        price_change_1h = self._calculate_price_change(history, 3600)
        price_change_24h = self._calculate_price_change(history, 24 * 3600)
        momentum = self._calculate_momentum(history)
        
        return {
            "price_change_1h": price_change_1h,
            "price_change_24h": price_change_24h,
            "momentum": momentum,
            "price_history_length": len(history)
        }

    def _build_internal_pairs(self) -> Dict[str, List[str]]:
        mapping: Dict[str, List[str]] = {}
        try:
            raw_pairs = getattr(settings, "MICRO_ARBITRAGE_REFERENCE_PAIRS", {})
        except Exception:
            raw_pairs = {}
        if isinstance(raw_pairs, dict):
            for raw_key, raw_values in raw_pairs.items():
                if not raw_key:
                    continue
                key = str(raw_key).lower()
                refs: List[str] = []
                if isinstance(raw_values, (list, tuple, set)):
                    refs = [str(val).lower() for val in raw_values if val]
                elif raw_values:
                    refs = [str(raw_values).lower()]
                if refs:
                    mapping[key] = refs
        return mapping

    def _attach_internal_references(self, markets: List[Dict[str, Any]]) -> None:
        if not self._internal_pairs:
            return
        index: Dict[str, Dict[str, Any]] = {}
        for market in markets:
            market_id = str(market.get("market_id") or "").lower()
            condition_id = str(market.get("condition_id") or "").lower()
            if market_id:
                index[market_id] = market
            if condition_id:
                index[condition_id] = market

        for market in markets:
            market_keys = {
                str(market.get("market_id") or "").lower(),
                str(market.get("condition_id") or "").lower(),
            }
            configured_refs: List[str] = []
            for key in list(market_keys):
                if key and key in self._internal_pairs:
                    configured_refs = self._internal_pairs[key]
                    break
            if not configured_refs:
                continue
            refs_payload: List[Dict[str, Any]] = []
            for ref_id in configured_refs:
                ref_market = index.get(ref_id)
                if not ref_market:
                    continue
                refs_payload.append(
                    {
                        "market_id": ref_market.get("market_id"),
                        "condition_id": ref_market.get("condition_id", ref_market.get("market_id")),
                        "yes_price": ref_market.get("yes_price"),
                        "bid": ref_market.get("bid"),
                        "ask": ref_market.get("ask"),
                        "volume_24h": ref_market.get("volume_24h"),
                        "title": ref_market.get("title"),
                    }
                )
            if refs_payload:
                market["internal_micro_refs"] = refs_payload
    
    def _add_external_price_data(self, market_id: str, market: Dict[str, Any]) -> Dict[str, Any]:
        """Add external price data for arbitrage strategy."""
        existing_bid = market.get("external_bid")
        existing_ask = market.get("external_ask")
        existing_flag = market.get("external_real")

        # If provider already supplied external prices, preserve the payload as-is.
        if existing_bid is not None and existing_ask is not None:
            try:
                eb = float(existing_bid)
                ea = float(existing_ask)
            except Exception:
                eb = existing_bid
                ea = existing_ask
            spread = None
            try:
                spread = float(ea) - float(eb)
            except Exception:
                pass
            source = market.get("external_source")
            if not source:
                source = "upstream" if existing_flag else "synthetic"
            return {
                "external_bid": eb,
                "external_ask": ea,
                "external_spread": round(spread, 4) if isinstance(spread, (int, float)) else market.get("external_spread"),
                "external_real": bool(existing_flag) if existing_flag is not None else True,
                "external_source": source,
            }

        # Otherwise, simulate external prices (fallback only)
        current_bid = market.get("bid", 0.5)
        current_ask = market.get("ask", 0.5)
        external_bid = current_bid * (0.98 + 0.04 * (hash(market_id + "bid") % 100) / 100)
        external_ask = current_ask * (0.98 + 0.04 * (hash(market_id + "ask") % 100) / 100)
        external_bid = max(0.01, min(0.99, external_bid))
        external_ask = max(0.01, min(0.99, external_ask))
        if external_bid >= external_ask:
            mid = (external_bid + external_ask) / 2.0
            spread = max(0.01, abs(external_ask - external_bid))
            external_bid = max(0.01, mid - spread / 2.0)
            external_ask = min(0.99, mid + spread / 2.0)

        return {
            "external_bid": round(external_bid, 4),
            "external_ask": round(external_ask, 4),
            "external_spread": round(external_ask - external_bid, 4),
            "external_real": False,
            "external_source": "synthetic",
            "arbitrage_opportunity": abs(current_bid - external_bid) > 0.01 or abs(current_ask - external_ask) > 0.01,
        }
    
    def _add_sentiment_data(self, market_id: str, market: Dict[str, Any]) -> Dict[str, Any]:
        """Add sentiment data for event-driven strategy."""
        stats = self._sentiment_stats
        stats["total_markets"] += 1
        stats["live_sources_available"] = self._sentiment_provider.has_live_sources()
        offline_mode = bool(
            getattr(settings, "OFFLINE_MODE", False)
            or str(os.getenv("POLY_OFFLINE_MODE", "")).strip().lower() == "true"
        )
        stats["offline_mode"] = offline_mode
        cache_entry = self._sentiment_cache.get(market_id)
        info = None
        if cache_entry:
            captured = cache_entry.get("captured_at")
            if isinstance(captured, (int, float)) and (time.time() - captured) < 300:
                info = cache_entry.get("data")
                stats["cache_hits"] += 1
        if info is None:
            if offline_mode:
                stats["offline_blocks"] += 1
            else:
                stats["live_requests"] += 1
                try:
                    info = self._sentiment_provider.sentiment_for_market(market)
                except Exception:
                    logger.debug("Sentiment provider failure", exc_info=True)
                    info = None
                if info:
                    stats["live_hits"] += 1
                    stats["last_live_source"] = str(info.get("source") or "unknown")
                    stats["last_live_at"] = time.time()
                    self._sentiment_cache[market_id] = {"data": info, "captured_at": time.time()}
                else:
                    stats["live_misses"] += 1

        if info:
            score = float(info.get("score", 0.0))
            confidence = float(info.get("confidence", 0.0))
            source = str(info.get("source") or "newsapi")
            stats["last_fallback_reason"] = None
            # Capture a timestamp so strategies can apply freshness/decay
            try:
                from datetime import datetime, timezone

                captured_iso = datetime.now(timezone.utc).isoformat()
            except Exception:
                captured_iso = None
            payload = {
                "news_sentiment": max(-1.0, min(1.0, score)),
                "sentiment": max(-1.0, min(1.0, score)),
                "sentiment_confidence": max(0.0, min(1.0, confidence)),
                "sentiment_source": source,
            }
            if captured_iso:
                payload["sentiment_updated_at"] = captured_iso
            return payload

        fallback_reason = "volume_trend"
        volume = market.get("volume_24h", 0)
        if market_id in self._price_history and len(self._price_history[market_id]) > 1:
            recent_prices = [h["price"] for h in self._price_history[market_id][-5:]]
            if len(recent_prices) >= 2:
                price_trend = (recent_prices[-1] - recent_prices[0]) / max(recent_prices[0], 0.01)
                volume_factor = min(1.0, volume / 10000)
                sentiment = price_trend * volume_factor
            else:
                sentiment = 0.0
                fallback_reason = "insufficient_history"
        else:
            sentiment = 0.0
            fallback_reason = "no_history"

        sentiment += (hash(market_id + str(int(time.time() / 3600))) % 21 - 10) / 100
        sentiment = max(-1.0, min(1.0, sentiment))
        stats["fallback_used"] += 1
        stats["last_fallback_reason"] = fallback_reason
        reasons = stats.setdefault("fallback_reasons", {})
        reasons[fallback_reason] = reasons.get(fallback_reason, 0) + 1

        # Provide a timestamp so age/decay logic can kick in even for fallback
        try:
            from datetime import datetime, timezone

            captured_iso = datetime.now(timezone.utc).isoformat()
        except Exception:
            captured_iso = None
        out = {
            "news_sentiment": sentiment,
            "sentiment": sentiment,
            "sentiment_confidence": min(1.0, volume / 5000),
            "sentiment_source": "volume_based",
        }
        if captured_iso:
            out["sentiment_updated_at"] = captured_iso
        return out
    
    def _add_volume_data(self, market: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure volume data is present."""
        volume_24h = market.get("volume_24h")
        if volume_24h is None:
            # Try to get from other fields
            volume_24h = market.get("volume", market.get("total_volume", 0))
            
        return {
            "volume_24h": float(volume_24h) if volume_24h is not None else 0.0,
            "volume": float(volume_24h) if volume_24h is not None else 0.0
        }
    
    def _ensure_bid_ask_data(self, market: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure bid/ask data is present for mean reversion strategy.

        Prefer provider-derived best bid/ask when available; otherwise derive
        a reasonable spread around the yes price.
        """
        # Prefer provider best bid/ask if present
        bid = market.get("bid")
        ask = market.get("ask")
        best_bid = market.get("best_bid")
        best_ask = market.get("best_ask")

        if bid is None and best_bid is not None:
            bid = best_bid
        if ask is None and best_ask is not None:
            ask = best_ask

        # If still missing, derive from yes_price
        if bid is None or ask is None:
            yes_price = market.get("yes_price", 0.5)
            spread = 0.02  # Default 2% spread
            if bid is None:
                bid = yes_price - spread / 2
            if ask is None:
                ask = yes_price + spread / 2

        # Ensure bid < ask and a sane spread
        try:
            fbid = float(bid)
            fask = float(ask)
        except Exception:
            # fallback to symmetric around yes_price
            yp = float(market.get("yes_price", 0.5) or 0.5)
            fbid = yp - 0.01
            fask = yp + 0.01

        if fbid >= fask:
            mid = (fbid + fask) / 2.0
            spread = max(0.01, abs(fask - fbid))
            fbid = mid - spread / 2.0
            fask = mid + spread / 2.0

        return {
            "bid": round(float(fbid), 4),
            "ask": round(float(fask), 4),
            "spread": round(float(fask) - float(fbid), 4),
            "mid_price": round((float(fbid) + float(fask)) / 2, 4),
        }
    
    def _add_technical_indicators(self, market_id: str, market: Dict[str, Any]) -> Dict[str, Any]:
        """Add technical indicators."""
        if market_id not in self._price_history or len(self._price_history[market_id]) < 2:
            return {
                "volatility_1h": 0.05,  # Default volatility
                "volatility_24h": 0.1,
                "price_trend": 0.0
            }
            
        history = self._price_history[market_id]
        prices = [h["price"] for h in history]
        
        # Calculate volatility
        if len(prices) >= 2:
            volatility = statistics.stdev(prices) if len(prices) > 1 else 0.05
        else:
            volatility = 0.05
            
        # Calculate trend
        if len(prices) >= 3:
            trend = (prices[-1] - prices[0]) / max(prices[0], 0.01)
        else:
            trend = 0.0
            
        return {
            "volatility_1h": round(volatility, 4),
            "volatility_24h": round(volatility, 4),
            "price_trend": round(trend, 4),
            "price_samples": len(prices)
        }
    
    def _add_basic_enrichment(self, market: Dict[str, Any]) -> Dict[str, Any]:
        """Add basic enrichment when full enrichment fails."""
        enriched = market.copy()
        
        # Add minimal required fields
        enriched.setdefault("price_change_24h", 0.0)
        enriched.setdefault("momentum", 0.0)
        enriched.setdefault("external_bid", None)
        enriched.setdefault("external_ask", None)
        enriched.setdefault("news_sentiment", 0.0)
        enriched.setdefault("sentiment", 0.0)
        enriched.setdefault("volume_24h", 0.0)
        
        # Ensure bid/ask
        if "bid" not in enriched or "ask" not in enriched:
            price = enriched.get("yes_price", 0.5)
            enriched.setdefault("bid", price - 0.01)
            enriched.setdefault("ask", price + 0.01)
            
        return enriched
    
    def _get_current_price(self, market: Dict[str, Any]) -> float:
        """Get current price from market data."""
        return market.get("yes_price") or market.get("mid_price") or (
            (market.get("bid", 0.5) + market.get("ask", 0.5)) / 2
        )
    
    def _calculate_price_change(self, history: List[Dict[str, Any]], seconds_ago: int) -> float:
        """Calculate price change over specified time period."""
        if len(history) < 2:
            return 0.0
            
        now = time.time()
        cutoff = now - seconds_ago
        
        # Find price closest to cutoff time
        old_price = None
        for h in history:
            if h["timestamp"] >= cutoff:
                old_price = h["price"]
                break
                
        if old_price is None:
            old_price = history[0]["price"]
            
        current_price = history[-1]["price"]
        
        if old_price == 0:
            return 0.0
            
        return (current_price - old_price) / old_price
    
    def _calculate_momentum(self, history: List[Dict[str, Any]]) -> float:
        """Calculate momentum indicator."""
        if len(history) < 3:
            return 0.0
            
        prices = [h["price"] for h in history[-5:]]  # Last 5 prices
        
        # Simple momentum: average of recent price changes
        changes = []
        for i in range(1, len(prices)):
            if prices[i-1] != 0:
                changes.append((prices[i] - prices[i-1]) / prices[i-1])
                
        return statistics.mean(changes) if changes else 0.0

    def sentiment_metrics(self, *, reset: bool = False) -> Dict[str, Any]:
        snapshot: Dict[str, Any] = dict(self._sentiment_stats)
        fallback_reasons = dict(snapshot.get("fallback_reasons") or {})
        snapshot["fallback_reasons"] = fallback_reasons
        last_live_at = snapshot.get("last_live_at")
        if isinstance(last_live_at, (int, float)):
            try:
                snapshot["last_live_at_iso"] = datetime.fromtimestamp(
                    last_live_at, tz=timezone.utc
                ).isoformat()
            except Exception:
                snapshot["last_live_at_iso"] = None
        snapshot["has_live_sources"] = self._sentiment_provider.has_live_sources()
        if reset:
            for key in ("total_markets", "cache_hits", "live_requests", "live_hits", "live_misses", "fallback_used", "offline_blocks"):
                self._sentiment_stats[key] = 0
            self._sentiment_stats["fallback_reasons"] = {}
            self._sentiment_stats["last_fallback_reason"] = None
            self._sentiment_stats["offline_mode"] = bool(getattr(settings, "OFFLINE_MODE", False))
        return snapshot


# Global enricher instance
_enricher = MarketDataEnricher()

def enrich_market_data(markets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Public function to enrich market data."""
    return _enricher.enrich_market_data(markets)


def sentiment_telemetry(*, reset: bool = False) -> Dict[str, Any]:
    """Return sentiment provider telemetry statistics."""
    return _enricher.sentiment_metrics(reset=reset)

