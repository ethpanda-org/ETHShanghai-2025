"""Data validation module to ensure all strategies have required fields."""

import logging
from typing import Any, Dict, List, Set

logger = logging.getLogger(__name__)


class StrategyDataValidator:
    """Validate that market data contains all fields required by strategies."""
    
    # Required fields for each strategy
    STRATEGY_REQUIREMENTS = {
        "mean_reversion": {"bid", "ask"},
        "event_driven": {"volume_24h"},
        "momentum_scalping": set(),
        "micro_arbitrage": {"bid", "ask", "external_bid", "external_ask"}
    }
    
    # Optional fields that improve strategy performance
    STRATEGY_OPTIONAL = {
        "mean_reversion": {"volatility", "mid_price", "spread"},
        "event_driven": {"sentiment_confidence", "volume"},
        "momentum_scalping": {"price_change_1h", "volatility_24h", "price_trend"},
        "micro_arbitrage": {"external_spread", "arbitrage_opportunity"}
    }
    STRATEGY_ALTERNATIVES = {
        "event_driven": [{"sentiment", "news_sentiment"}],
        "momentum_scalping": [{"momentum", "price_change_24h"}],
    }
    
    def __init__(self):
        self.validation_stats = {
            "total_markets": 0,
            "validation_errors": 0,
            "strategy_readiness": {strategy: 0 for strategy in self.STRATEGY_REQUIREMENTS}
        }
    
    def validate_markets(self, markets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate all markets and return validation report."""
        self.validation_stats["total_markets"] = len(markets)
        self.validation_stats["validation_errors"] = 0
        
        validation_report = {
            "total_markets": len(markets),
            "valid_markets": 0,
            "strategy_coverage": {},
            "missing_fields": {},
            "warnings": []
        }
        
        for strategy in self.STRATEGY_REQUIREMENTS:
            validation_report["strategy_coverage"][strategy] = 0
            validation_report["missing_fields"][strategy] = set()
        
        for i, market in enumerate(markets):
            market_id = market.get("market_id", f"market_{i}")
            
            try:
                market_validation = self._validate_single_market(market, market_id)
                
                if market_validation["is_valid"]:
                    validation_report["valid_markets"] += 1
                
                # Update strategy coverage
                for strategy, ready in market_validation["strategy_ready"].items():
                    if ready:
                        validation_report["strategy_coverage"][strategy] += 1
                
                # Collect missing fields
                for strategy, missing in market_validation["missing_fields"].items():
                    validation_report["missing_fields"][strategy].update(missing)
                
                # Add warnings
                validation_report["warnings"].extend(market_validation["warnings"])
                
            except Exception as e:
                logger.error(f"Validation error for market {market_id}: {e}")
                self.validation_stats["validation_errors"] += 1
                validation_report["warnings"].append(f"Validation failed for {market_id}: {e}")
        
        # Convert sets to lists for JSON serialization
        for strategy in validation_report["missing_fields"]:
            validation_report["missing_fields"][strategy] = list(validation_report["missing_fields"][strategy])
        
        # Calculate coverage percentages
        total_markets = validation_report["total_markets"]
        if total_markets > 0:
            for strategy in validation_report["strategy_coverage"]:
                coverage = validation_report["strategy_coverage"][strategy]
                validation_report["strategy_coverage"][strategy] = {
                    "ready_markets": coverage,
                    "coverage_percentage": round(coverage / total_markets * 100, 1)
                }
        
        return validation_report
    
    def _validate_single_market(self, market: Dict[str, Any], market_id: str) -> Dict[str, Any]:
        """Validate a single market for all strategies."""
        result = {
            "market_id": market_id,
            "is_valid": True,
            "strategy_ready": {},
            "missing_fields": {},
            "warnings": []
        }
        
        # Check each strategy's requirements
        for strategy, required_fields in self.STRATEGY_REQUIREMENTS.items():
            missing_fields = self._check_required_fields(strategy, market, required_fields)
            
            result["strategy_ready"][strategy] = len(missing_fields) == 0
            result["missing_fields"][strategy] = missing_fields
            
            if missing_fields:
                result["is_valid"] = False
                result["warnings"].append(
                    f"{strategy} strategy missing fields in {market_id}: {', '.join(missing_fields)}"
                )
            
            # Optional fields are advisory; do not spam warnings. We only compute readiness elsewhere.
        
        # Additional validations
        self._validate_data_quality(market, result)
        
        return result
    
    def _check_required_fields(self, strategy: str, market: Dict[str, Any], required_fields: Set[str]) -> Set[str]:
        """Check which required or alternative fields are missing."""
        missing: Set[str] = set()

        for field in required_fields:
            if not self._field_present(market, field):
                missing.add(field)

        for alternatives in self.STRATEGY_ALTERNATIVES.get(strategy, []):
            if not any(self._field_present(market, alias) for alias in alternatives):
                missing.add("/".join(sorted(alternatives)))

        return missing

    def _field_present(self, market: Dict[str, Any], field: str) -> bool:
        if field not in market:
            return False
        value = market.get(field)
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        return True
    
    def _validate_data_quality(self, market: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate data quality and add warnings."""
        market_id = result["market_id"]
        
        # Check bid/ask relationship
        bid = market.get("bid")
        ask = market.get("ask")
        if bid is not None and ask is not None:
            spread = ask - bid
            if spread < -1e-4:
                result["warnings"].append(f"Invalid bid/ask spread in {market_id}: bid={bid} > ask={ask}")
            elif spread > 0.4:  # Spread > 40%
                result["warnings"].append(f"Very wide spread in {market_id}: {spread:.3f}")
        
        # Check price ranges (should be 0-1 for prediction markets)
        for price_field in ["bid", "ask", "yes_price", "no_price"]:
            price = market.get(price_field)
            if price is not None and (price < 0 or price > 1):
                result["warnings"].append(f"Price out of range in {market_id}: {price_field}={price}")
        
        # Check volume reasonableness
        volume = market.get("volume_24h", 0)
        if volume < 0:
            result["warnings"].append(f"Negative volume in {market_id}: {volume}")
        elif volume > 1e9:  # Very high volume
            result["warnings"].append(f"Unusually high volume in {market_id}: {volume}")
        
        # Check sentiment range
        sentiment = market.get("sentiment")
        if sentiment is not None and (sentiment < -1 or sentiment > 1):
            result["warnings"].append(f"Sentiment out of range in {market_id}: {sentiment}")
        
        # Check external prices if present
        ext_bid = market.get("external_bid")
        ext_ask = market.get("external_ask")
        if ext_bid is not None and ext_ask is not None:
            ext_spread = ext_ask - ext_bid
            if ext_spread < -1e-4:
                result["warnings"].append(f"Invalid external spread in {market_id}: ext_bid={ext_bid} > ext_ask={ext_ask}")
    
    def get_validation_summary(self) -> Dict[str, Any]:
        """Get summary of validation statistics."""
        return self.validation_stats.copy()
    
    def log_validation_report(self, report: Dict[str, Any]) -> None:
        """Log validation report summary."""
        total = report["total_markets"]
        valid = report["valid_markets"]
        
        logger.info(f"Market data validation: {valid}/{total} markets valid ({valid/total*100:.1f}%)")
        
        for strategy, coverage in report["strategy_coverage"].items():
            if isinstance(coverage, dict):
                ready = coverage["ready_markets"]
                pct = coverage["coverage_percentage"]
                logger.info(f"  {strategy}: {ready}/{total} markets ready ({pct}%)")
        
        if report["warnings"]:
            logger.warning(f"Validation warnings: {len(report['warnings'])} issues found")
            for warning in report["warnings"][:5]:  # Log first 5 warnings
                logger.warning(f"  {warning}")
            if len(report["warnings"]) > 5:
                logger.warning(f"  ... and {len(report['warnings']) - 5} more warnings")


# Global validator instance
_validator = StrategyDataValidator()

def validate_market_data(markets: List[Dict[str, Any]], log_report: bool = True) -> Dict[str, Any]:
    """Public function to validate market data."""
    report = _validator.validate_markets(markets)
    if log_report:
        _validator.log_validation_report(report)
    return report

