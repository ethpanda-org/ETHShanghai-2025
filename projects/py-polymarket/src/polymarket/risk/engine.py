"""Risk evaluation engines for Polymarket trading."""

from __future__ import annotations

import math

from datetime import datetime, timezone
from typing import Any, Dict, Tuple

import numpy as np

from polymarket.utils.logging_utils import get_logger
from config import settings

logger = get_logger(__name__)


class RiskEngine:
    """Multi-factor risk checks enriched with strategy context metadata."""

    def __init__(
        self,
        max_var_ratio: float = 0.05,
        max_single_order_ratio: float | None = None,
        volatility_risk_ceiling: float = 0.25,
    ) -> None:
        self.max_var_ratio = max_var_ratio
        if max_single_order_ratio is None:
            try:
                max_single_order_ratio = float(
                    getattr(settings, "RISK_MAX_SINGLE_ORDER_RATIO", getattr(settings.trading, "max_single_position", 0.01))
                )
            except Exception:
                max_single_order_ratio = 0.01
        self.max_single_order_ratio = float(max_single_order_ratio)
        try:
            vrc = float(getattr(settings, "RISK_VOLATILITY_CEILING", volatility_risk_ceiling))
        except Exception:
            vrc = volatility_risk_ceiling
        self.volatility_risk_ceiling = max(vrc, 1e-4)
        self.factors = {
            "var": self._calculate_var,
            "liquidity": self._check_liquidity,
        }

    def _harrell_davis_quantile(self, sample: np.ndarray, prob: float) -> float:
        """Estimate the quantile using the Harrell–Davis estimator."""
        n = sample.size
        if n == 0:
            raise ValueError("sample must be non-empty")
        if n == 1:
            return float(sample[0])
        ordered = np.sort(sample)
        a = prob * (n + 1)
        b = (1.0 - prob) * (n + 1)
        weights = np.zeros(n, dtype=float)
        for i in range(1, n + 1):
            upper = i / n
            lower = (i - 1) / n
            weights[i - 1] = math.betainc(a, b, upper) - math.betainc(a, b, lower)
        return float(np.dot(weights, ordered))

    def validate_order(self, order: Dict[str, Any], portfolio: Dict[str, Any]) -> bool:
        """Mutates the order metadata with a rich risk report and returns approval."""
        metadata = order.setdefault("metadata", {})
        risk_meta = metadata.setdefault("risk", {})
        risk_meta["timestamp"] = datetime.now(UTC).isoformat()
        risk_meta["factors"] = {}
        risk_meta["portfolio_balance"] = float(portfolio.get("balance", 0.0))
        risk_meta["order_size"] = float(order.get("size", 0.0))

        approved = True
        rejections = []

        for name, check in self.factors.items():
            factor_approved, details = check(order, portfolio)
            risk_meta["factors"][name] = details
            if not factor_approved:
                approved = False
                rejections.append(name)

        risk_meta["approved"] = approved
        if rejections:
            risk_meta["rejections"] = rejections
            logger.warning("Order rejected by risk factors: %s", rejections)
        else:
            risk_meta.pop("rejections", None)

        return approved

    # --- individual checks -------------------------------------------------

    def _calculate_var(self, order: Dict[str, Any], portfolio: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        returns = np.asarray(portfolio.get("returns", []), dtype=float)
        if returns.size:
            returns = returns[np.isfinite(returns)]
        recent = returns[-200:] if returns.size else np.asarray([])

        balance = float(portfolio.get("balance", 0.0))
        order_size = float(order.get("size", 0.0))
        allowed_loss = balance * self.max_var_ratio

        if recent.size == 0:
            details = {
                "approved": balance > 0.0,
                "reason": "insufficient_history",
                "allowed_loss": allowed_loss,
                "potential_loss": 0.0,
                "var": 0.0,
            }
            return details["approved"], details

        # Robust outlier handling using MAD-based filtering
        median = float(np.median(recent))
        deviations = np.abs(recent - median)
        mad = float(np.median(deviations))
        mad_scaled = 1.4826 * mad if mad > 0 else 0.0
        outlier_mask = np.ones_like(recent, dtype=bool)
        if mad > 0:
            threshold = 3.5 * mad
            outlier_mask = deviations <= threshold
        filtered = recent[outlier_mask]
        outliers_removed = int(recent.size - filtered.size)
        if filtered.size < 10:
            filtered = recent
            outliers_removed = 0

        # Winsorized trimming to reduce tail impact
        sorted_filtered = np.sort(filtered)
        trim_count = max(0, int(sorted_filtered.size * 0.05))
        if trim_count > 0 and (sorted_filtered.size - 2 * trim_count) >= 10:
            sample = sorted_filtered[trim_count:-trim_count]
        else:
            sample = sorted_filtered

        sample_size = int(sample.size)
        try:
            var = self._harrell_davis_quantile(sample, 0.05)
            var_low = self._harrell_davis_quantile(sample, 0.025)
            var_high = self._harrell_davis_quantile(sample, 0.075)
            quantile_method = "harrell-davis"
        except Exception:
            var = float(np.percentile(sample, 5))
            var_low = float(np.percentile(sample, 2.5))
            var_high = float(np.percentile(sample, 7.5))
            quantile_method = "percentile"
        potential_loss = order_size * abs(var)
        approved = potential_loss <= allowed_loss if balance > 0 else False

        strategy_meta = order.get("metadata", {})
        volatility = strategy_meta.get("volatility")
        volatility_loss = None
        if isinstance(volatility, (int, float)) and volatility > 0:
            clipped_vol = min(float(volatility), self.volatility_risk_ceiling)
            volatility_loss = order_size * clipped_vol
            if volatility_loss > allowed_loss:
                approved = False

        details = {
            "approved": approved,
            "var": var,
            "var_conf_interval": {
                "low": float(var_low),
                "high": float(var_high),
                "confidence": 0.95,
            },
            "potential_loss": potential_loss,
            "allowed_loss": allowed_loss,
            "volatility": float(volatility) if isinstance(volatility, (int, float)) else None,
            "volatility_loss": volatility_loss,
            "sample_size": int(recent.size),
            "sample_after_filter": sample_size,
            "trimmed": int(trim_count),
            "median": median,
            "mad": mad,
            "mad_scaled": mad_scaled,
            "outliers_removed": outliers_removed,
            "quantile_method": quantile_method,
        }
        return approved, details

    def _check_liquidity(self, order: Dict[str, Any], portfolio: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        balance = float(portfolio.get("balance", 0.0))
        order_size = float(order.get("size", 0.0))

        strategy_meta = order.get("metadata", {})
        volatility = strategy_meta.get("volatility")
        adjustment = 1.0
        if isinstance(volatility, (int, float)) and volatility > 0:
            ratio = self.volatility_risk_ceiling / max(float(volatility), 1e-4)
            adjustment = max(0.25, min(1.0, ratio))

        max_allocation = balance * self.max_single_order_ratio * adjustment
        approved = order_size <= max_allocation if balance > 0 else False
        if not approved:
            logger.info("Liquidity gate: order_size=%.4f max_alloc=%.4f adj=%.4f balance=%.2f", order_size, max_allocation, adjustment, balance)

        details = {
            "approved": approved,
            "order_size": order_size,
            "max_allocation": max_allocation,
            "volatility_adjustment": adjustment,
            "balance": balance,
        }
        return approved, details


__all__ = ["RiskEngine"]
try:  # Python 3.11+
    from datetime import UTC  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover - backward compatibility
    UTC = timezone.utc  # type: ignore[assignment]
