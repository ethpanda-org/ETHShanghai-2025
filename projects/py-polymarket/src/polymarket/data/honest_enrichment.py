"""Honest market data enrichment - only adds data that can be reasonably derived."""

import logging
import time
import statistics
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class HonestMarketDataEnricher:
    """
    Honest data enrichment that only adds data that can be reasonably derived
    from existing data, without creating fake external data.
    """
    
    def __init__(self):
        self._price_history: Dict[str, List[Dict[str, Any]]] = {}
        
    def enrich_market_data(self, markets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enrich market data honestly - no fake external data."""
        enriched_markets = []
        
        for market in markets:
            try:
                enriched = self._enrich_single_market(market)
                enriched_markets.append(enriched)
            except Exception as e:
                logger.warning(f"Failed to enrich market {market.get('market_id', 'unknown')}: {e}")
                enriched_markets.append(market)  # Return original if enrichment fails
                
        return enriched_markets
    
    def _enrich_single_market(self, market: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich a single market with only honest data."""
        market_id = market.get("market_id", "unknown")
        enriched = market.copy()
        
        # 1. Add price change data (based on real price history)
        enriched.update(self._add_honest_price_change_data(market_id, market))
        
        # 2. Ensure bid/ask data exists (derive from available price data)
        enriched.update(self._ensure_honest_bid_ask_data(market))
        
        # 3. Add volume-based sentiment (derived from real volume/price data)
        enriched.update(self._add_volume_based_sentiment(market_id, market))
        
        # 4. Add technical indicators (based on real price history)
        enriched.update(self._add_honest_technical_indicators(market_id, market))
        
        # 5. Mark what data is available vs missing
        enriched.update(self._add_data_availability_flags(market))
        
        return enriched
    
    def _add_honest_price_change_data(self, market_id: str, market: Dict[str, Any]) -> Dict[str, Any]:
        """Add price change data based on real price history only."""
        current_price = self._get_current_price(market)
        
        # Update price history with real data
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
        
        # Only calculate if we have enough real history
        if len(history) >= 2:
            price_change_1h = self._calculate_price_change(history, 3600)
            price_change_24h = self._calculate_price_change(history, 24 * 3600)
            momentum = self._calculate_momentum(history)
            has_price_history = True
        else:
            # Not enough history - mark as unavailable
            price_change_1h = None
            price_change_24h = None
            momentum = None
            has_price_history = False
        
        return {
            "price_change_1h": price_change_1h,
            "price_change_24h": price_change_24h,
            "momentum": momentum,
            "has_price_history": has_price_history,
            "price_history_length": len(history)
        }
    
    def _ensure_honest_bid_ask_data(self, market: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure bid/ask data using only available price information."""
        bid = market.get("bid")
        ask = market.get("ask")
        
        # If we have both bid and ask, we're good
        if bid is not None and ask is not None:
            return {
                "bid": float(bid),
                "ask": float(ask),
                "spread": float(ask) - float(bid),
                "mid_price": (float(bid) + float(ask)) / 2,
                "bid_ask_source": "original"
            }
        
        # Try to derive from other available price data
        yes_price = market.get("yes_price")
        no_price = market.get("no_price")
        
        if yes_price is not None:
            # Use yes_price as mid, but mark uncertainty
            mid_price = float(yes_price)
            
            # If we have order book data, try to estimate spread
            estimated_spread = self._estimate_spread_from_market_data(market)
            
            derived_bid = mid_price - estimated_spread / 2
            derived_ask = mid_price + estimated_spread / 2
            
            return {
                "bid": round(max(0.01, derived_bid), 4),
                "ask": round(min(0.99, derived_ask), 4),
                "spread": estimated_spread,
                "mid_price": mid_price,
                "bid_ask_source": "derived_from_yes_price",
                "bid_ask_uncertainty": True
            }
        
        # If no price data available, mark as unavailable
        return {
            "bid": None,
            "ask": None,
            "spread": None,
            "mid_price": None,
            "bid_ask_source": "unavailable",
            "bid_ask_available": False
        }
    
    def _add_volume_based_sentiment(self, market_id: str, market: Dict[str, Any]) -> Dict[str, Any]:
        """Add sentiment based only on volume and price patterns."""
        volume = market.get("volume_24h", 0)
        
        # Only calculate sentiment if we have real price history
        if market_id in self._price_history and len(self._price_history[market_id]) > 1:
            recent_prices = [h["price"] for h in self._price_history[market_id][-5:]]
            if len(recent_prices) >= 2:
                # Calculate price trend
                price_trend = (recent_prices[-1] - recent_prices[0]) / max(recent_prices[0], 0.01)
                
                # Volume-weighted sentiment (higher volume = more confident signal)
                volume_weight = min(1.0, volume / 10000) if volume > 0 else 0
                sentiment = price_trend * volume_weight
                
                return {
                    "news_sentiment": sentiment,
                    "sentiment": sentiment,
                    "sentiment_confidence": volume_weight,
                    "sentiment_source": "volume_price_based",
                    "sentiment_available": True
                }
        
        # No reliable sentiment data available
        return {
            "news_sentiment": None,
            "sentiment": None,
            "sentiment_confidence": 0.0,
            "sentiment_source": "unavailable",
            "sentiment_available": False
        }
    
    def _add_honest_technical_indicators(self, market_id: str, market: Dict[str, Any]) -> Dict[str, Any]:
        """Add technical indicators based on real price history."""
        if market_id not in self._price_history or len(self._price_history[market_id]) < 3:
            return {
                "volatility": None,
                "price_trend": None,
                "technical_indicators_available": False
            }
            
        history = self._price_history[market_id]
        prices = [h["price"] for h in history]
        
        # Calculate real volatility
        volatility = statistics.stdev(prices) if len(prices) > 1 else None
        
        # Calculate trend
        if len(prices) >= 3:
            trend = (prices[-1] - prices[0]) / max(prices[0], 0.01)
        else:
            trend = None
            
        return {
            "volatility": round(volatility, 4) if volatility else None,
            "price_trend": round(trend, 4) if trend else None,
            "technical_indicators_available": volatility is not None and trend is not None,
            "price_samples": len(prices)
        }
    
    def _add_data_availability_flags(self, market: Dict[str, Any]) -> Dict[str, Any]:
        """Add flags indicating what data is actually available."""
        return {
            "data_completeness": {
                "has_bid_ask": market.get("bid") is not None and market.get("ask") is not None,
                "has_volume": market.get("volume_24h") is not None and market.get("volume_24h", 0) > 0,
                "has_price_history": market.get("has_price_history", False),
                "has_sentiment": market.get("sentiment_available", False),
                "has_external_prices": False,  # We don't provide fake external prices
                "strategy_readiness": {
                    "mean_reversion": market.get("bid") is not None and market.get("ask") is not None,
                    "event_driven": market.get("volume_24h") is not None,
                    "momentum_scalping": market.get("price_change_24h") is not None,
                    "micro_arbitrage": False  # No external prices available
                }
            }
        }
    
    def _estimate_spread_from_market_data(self, market: Dict[str, Any]) -> float:
        """Estimate spread from available market data."""
        # Try to get spread from order book if available
        if "order_book" in market:
            # This would be real order book data
            pass
        
        # Use volatility to estimate spread if available
        volatility = market.get("volatility")
        if volatility is not None:
            # Higher volatility = wider spread (rough approximation)
            return max(0.01, min(0.1, volatility * 2))
        
        # Default conservative spread
        return 0.02
    
    def _get_current_price(self, market: Dict[str, Any]) -> float:
        """Get current price from market data."""
        # Priority: mid_price > yes_price > average of bid/ask
        if market.get("mid_price"):
            return float(market["mid_price"])
        elif market.get("yes_price"):
            return float(market["yes_price"])
        elif market.get("bid") and market.get("ask"):
            return (float(market["bid"]) + float(market["ask"])) / 2
        else:
            return 0.5  # Fallback
    
    def _calculate_price_change(self, history: List[Dict[str, Any]], seconds_ago: int) -> Optional[float]:
        """Calculate price change over specified time period."""
        if len(history) < 2:
            return None
            
        now = time.time()
        cutoff = now - seconds_ago
        
        # Find price closest to cutoff time
        old_price = None
        for h in history:
            if h["timestamp"] >= cutoff:
                old_price = h["price"]
                break
                
        if old_price is None or old_price == 0:
            return None
            
        current_price = history[-1]["price"]
        return (current_price - old_price) / old_price
    
    def _calculate_momentum(self, history: List[Dict[str, Any]]) -> Optional[float]:
        """Calculate momentum indicator."""
        if len(history) < 3:
            return None
            
        prices = [h["price"] for h in history[-5:]]  # Last 5 prices
        
        # Simple momentum: average of recent price changes
        changes = []
        for i in range(1, len(prices)):
            if prices[i-1] != 0:
                changes.append((prices[i] - prices[i-1]) / prices[i-1])
                
        return statistics.mean(changes) if changes else None


# Global honest enricher instance
_honest_enricher = HonestMarketDataEnricher()

def enrich_market_data_honestly(markets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Public function to enrich market data honestly."""
    return _honest_enricher.enrich_market_data(markets)

