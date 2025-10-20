"""Strategy engine that combines decisions from the registry."""

from __future__ import annotations

import math
import logging
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional, Tuple

from config import settings
from polymarket.execution.fees import get_fee_manager

from .registry import get as get_strategy_factory
from .types import StrategyDecision


@dataclass
class StrategySpec:
    name: str
    weight: float
    min_confidence: float
    instance: Any
    exclusive: bool = False


class StrategyEngine:
    """Multiplex strategy evaluator that aggregates weighted signals."""

    def __init__(self, strategy_configs: Mapping[str, Mapping[str, Any]]) -> None:
        self._specs: List[StrategySpec] = []
        for name, config in (strategy_configs or {}).items():
            if not config or not config.get("enabled", True):
                continue
            weight = float(config.get("weight", 0.0))
            if weight <= 0:
                continue
            params = config.get("params", {}) or {}
            factory = get_strategy_factory(name)
            if not factory:
                continue
            instance = factory(params)
            min_conf = float(params.get("min_confidence", config.get("min_confidence", 0.0)))
            exclusive = bool(config.get("exclusive", params.get("exclusive", False)))
            self._specs.append(
                StrategySpec(
                    name=name,
                    weight=weight,
                    min_confidence=min_conf,
                    instance=instance,
                    exclusive=exclusive,
                )
            )

        self._total_weight = sum(spec.weight for spec in self._specs)
        trading = settings.trading
        self._initial_balance = float(getattr(trading, "initial_balance", 10_000))
        self._max_single_ratio = float(getattr(trading, "max_single_position", 0.05))
        self._min_position = float(getattr(trading, "min_position_size", 100))
        self._fees = get_fee_manager()
        self._runtime_balance: Optional[float] = None
        # Minimum signal/confidence floor for acting (configurable)
        try:
            self._signal_floor = float(getattr(settings, "STRATEGY_SIGNAL_FLOOR", 0.12))
        except Exception:
            self._signal_floor = 0.12
        try:
            self._consensus_min = int(getattr(settings, "STRATEGY_CONSENSUS_MIN", 2))
        except Exception:
            self._consensus_min = 2
        try:
            self._slippage_model = str(getattr(settings.execution, "slippage_model", "taker")).lower()
        except Exception:
            self._slippage_model = "taker"

    def update_runtime_balance(self, balance: Optional[float]) -> None:
        """Persist the most recent portfolio balance for sizing decisions."""
        if balance is None:
            self._runtime_balance = None
            return
        try:
            cast_balance = float(balance)
        except (TypeError, ValueError):
            self._runtime_balance = None
            return
        if not math.isfinite(cast_balance) or cast_balance <= 0:
            self._runtime_balance = None
            return
        self._runtime_balance = cast_balance

    def generate_order(self, market: Mapping[str, Any]) -> Dict[str, Any]:
        market_id = str(market.get("market_id", market.get("id", "unknown")))
        if not self._specs:
            return self._hold_order(market, reason="no_strategies_enabled")

        decisions: List[Tuple[StrategySpec, StrategyDecision]] = []
        contributions: List[Dict[str, Any]] = []
        exclusive_mode = False
        for spec in self._specs:
            evaluator = getattr(spec.instance, "evaluate", None)
            if evaluator is None:
                continue
            decision = evaluator(market)
            if not isinstance(decision, StrategyDecision):
                continue
            decision.clamp()
            if decision.confidence < spec.min_confidence:
                continue
            contribution = {
                "name": spec.name,
                "bias": decision.bias,
                "confidence": decision.confidence,
                "size_hint": decision.size_hint,
                "reason": decision.reason,
                "metadata": decision.metadata,
            }
            if spec.exclusive or decision.metadata.get("exclusive"):
                contribution["exclusive"] = True
                decisions = [(spec, decision)]
                contributions = [contribution]
                exclusive_mode = True
                break
            contribution["exclusive"] = False
            decisions.append((spec, decision))
            contributions.append(contribution)

        if not decisions:
            return self._hold_order(market, reason="no_signal")

        total_weight = sum(spec.weight for spec, _ in decisions)
        if total_weight <= 0:
            return self._hold_order(market, reason="invalid_weight")

        weighted_bias = sum(spec.weight * decision.bias * decision.confidence for spec, decision in decisions) / total_weight
        weighted_confidence = sum(spec.weight * decision.confidence for spec, decision in decisions) / total_weight
        weighted_size_hint = sum(spec.weight * decision.size_hint for spec, decision in decisions) / total_weight

        # Apply optional per-market overrides for thresholds
        local_signal_floor = self._signal_floor
        local_consensus_min = self._consensus_min
        try:
            overrides = getattr(settings, "STRATEGY_THRESHOLD_OVERRIDES", {}) or {}
            ov = overrides.get(market_id) or {}
            if isinstance(ov, dict):
                if "signal_floor" in ov:
                    try:
                        local_signal_floor = float(ov["signal_floor"])
                    except Exception:
                        pass
                if "consensus_min" in ov:
                    try:
                        local_consensus_min = int(ov["consensus_min"])
                    except Exception:
                        pass
        except Exception:
            pass

        if abs(weighted_bias) < local_signal_floor or weighted_confidence < local_signal_floor:
            logger.debug(
                "StrategyEngine hold: weak signal for %s (bias=%.4f confidence=%.4f floor=%.4f)",
                market_id,
                weighted_bias,
                weighted_confidence,
                local_signal_floor,
            )
            return self._hold_order(market, reason="weak_signal", contributions=contributions)

        action = "yes" if weighted_bias > 0 else "no"

        if not exclusive_mode:
            # Directional consensus: require agreement from >= local_consensus_min strategies
            agree = 0
            for c in contributions:
                if action == "yes" and c.get("bias", 0) > 0:
                    agree += 1
                elif action == "no" and c.get("bias", 0) < 0:
                    agree += 1
            if agree < local_consensus_min:
                logger.debug(
                    "StrategyEngine hold: insufficient consensus for %s (agree=%s required=%s)",
                    market_id,
                    agree,
                    local_consensus_min,
                )
                return self._hold_order(market, reason="insufficient_consensus", contributions=contributions)

        if not exclusive_mode:
            # Execution-cost budget prefilter (skip if expected edge <= fees + half-spread + premium)
            try:
                    bid = market.get("bid")
                    ask = market.get("ask")
                    if bid is not None and ask is not None:
                        bid = float(bid); ask = float(ask)
                        half_spread = max(0.0, (ask - bid) / 2.0)
                        fee_rate = (
                            self._fees.maker_fee
                            if self._slippage_model.startswith("maker")
                            else self._fees.taker_fee
                        )
                        risk_premium = float(getattr(settings, "EDGE_RISK_PREMIUM", 0.005))
                        cost_budget = fee_rate + half_spread + risk_premium
                    # Estimate edge from strategy metadata
                    mid = (bid + ask) / 2.0
                    edge_est = 0.0
                    for c in contributions:
                        name = str(c.get("name") or "")
                        meta = c.get("metadata") or {}
                        if name == "mean_reversion":
                            try:
                                dev = float(meta.get("deviation", 0.0))
                                edge_est = max(edge_est, abs(dev))
                            except Exception:
                                pass
                        elif name == "momentum_scalping":
                            try:
                                mom = float(meta.get("momentum", 0.0))
                                edge_est = max(edge_est, abs(mom) * float(mid))
                            except Exception:
                                pass
                    if edge_est <= cost_budget:
                        logger.debug(
                            "StrategyEngine hold: insufficient edge for %s (edge=%.4f cost_budget=%.4f)",
                            market_id,
                            edge_est,
                            cost_budget,
                        )
                        return self._hold_order(market, reason="insufficient_edge", contributions=contributions)
            except Exception:
                # Fail open if we cannot evaluate cost budget
                pass
        balance_reference = self._runtime_balance if self._runtime_balance is not None else self._initial_balance
        if balance_reference <= 0:
            balance_reference = self._initial_balance
        base_size = balance_reference * self._max_single_ratio
        volatility = market.get("volatility")
        vol_factor = 1.0
        try:
            if isinstance(volatility, (int, float)):
                vol = float(volatility)
                if vol > 0.2:
                    vol_factor = 0.5
                elif vol > 0.1:
                    vol_factor = 0.75
        except Exception:
            vol_factor = 1.0
        scale = max(0.1, weighted_size_hint * weighted_confidence)
        scale = min(0.12, scale)
        target_size = base_size * scale * vol_factor
        size = max(self._min_position, target_size)

        metadata = {
            "combined_score": weighted_bias,
            "confidence": weighted_confidence,
            "size_hint": weighted_size_hint,
            "strategies": contributions,
        }
        if exclusive_mode and contributions:
            metadata["exclusive_strategy"] = contributions[0].get("name")
        metadata["balance_reference"] = balance_reference
        volatility = market.get("volatility")
        if isinstance(volatility, (int, float)):
            metadata["volatility"] = float(volatility)

        metadata["decision"] = "execute"
        logger.debug(
            "StrategyEngine execute: market=%s action=%s size=%.4f score=%.4f confidence=%.4f",
            market_id,
            action,
            size,
            weighted_bias,
            weighted_confidence,
        )
        return {
            "market_id": market_id,
            "action": action,
            "size": round(size, 4),
            "metadata": metadata,
        }

    def _hold_order(self, market: Mapping[str, Any], reason: str, contributions: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        metadata = {"reason": reason, "decision": "hold"}
        if contributions:
            metadata["strategies"] = contributions
        logger.debug(
            "StrategyEngine hold: market=%s reason=%s contributions=%s",
            market.get("market_id", market.get("id", "unknown")),
            reason,
            contributions or [],
        )
        return {
            "market_id": str(market.get("market_id", market.get("id", "unknown"))),
            "action": "hold",
            "size": 0.0,
            "metadata": metadata,
        }


__all__ = ["StrategyEngine"]
logger = logging.getLogger(__name__)
