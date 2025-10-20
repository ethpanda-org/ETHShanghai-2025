"""Strategy registry plumbing."""

from __future__ import annotations

from typing import Callable, Dict, Mapping, Optional

from .simple import (
    EventDrivenStrategy,
    MeanReversionStrategy,
    MicroArbitrageStrategy,
    MomentumStrategy,
)

StrategyFactory = Callable[[Mapping[str, object]], object]

_REGISTRY: Dict[str, StrategyFactory] = {}


def register(name: str, factory: StrategyFactory) -> None:
    _REGISTRY[name] = factory


def get(name: str) -> Optional[StrategyFactory]:
    return _REGISTRY.get(name)


def available() -> Dict[str, StrategyFactory]:
    return dict(_REGISTRY)


register(
    "mean_reversion",
    lambda cfg: MeanReversionStrategy(
        min_confidence=float(cfg.get("min_confidence", 0.3)),
        mid_target=float(cfg.get("mid_target", 0.5)),
        sensitivity=float(cfg.get("sensitivity", 0.2)),
        min_deviation=float(cfg.get("min_deviation", 0.0)),
        require_non_negative_momentum=bool(cfg.get("require_non_negative_momentum", False)),
    ),
)
register(
    "event_driven",
    lambda cfg: EventDrivenStrategy(
        min_confidence=float(cfg.get("min_confidence", 0.3)),
        volume_threshold=float(cfg.get("volume_threshold", 5000.0)),
        sentiment_weight=float(cfg.get("sentiment_weight", 0.6)),
        sentiment_floor=float(cfg.get("sentiment_floor", 0.05)),
        require_true_source=bool(cfg.get("require_true_source", False)),
        non_news_conf_scale=float(cfg.get("non_news_conf_scale", 0.7)),
        max_age_seconds=int(cfg.get("max_age_seconds", 1800)),
        decay_half_life_seconds=int(cfg.get("decay_half_life_seconds", 900)),
        volume_spike_multiplier_non_news=float(cfg.get("volume_spike_multiplier_non_news", 1.5)),
        allowed_risk_levels=list(cfg.get("allowed_risk_levels", [])) if isinstance(cfg.get("allowed_risk_levels", []), (list, tuple)) else None,
    ),
)
register(
    "micro_arbitrage",
    lambda cfg: MicroArbitrageStrategy(
        min_confidence=float(cfg.get("min_confidence", 0.2)),
        min_spread=float(cfg.get("min_spread", 0.02)),
        taker_fee=float(cfg.get("taker_fee", 0.003)),
        min_net_edge=float(cfg.get("min_net_edge", 0.002)),
        external_spread_max=float(cfg.get("external_spread_max", 0.05)),
        min_local_liquidity=float(cfg.get("min_local_liquidity", 0.0)),
        external_fee=float(cfg.get("external_fee", 0.0)),
        internal_edge_threshold=float(cfg.get("internal_edge_threshold", 0.015)),
        internal_confidence_scale=float(cfg.get("internal_confidence_scale", 1.0)),
        min_reference_volume=float(cfg.get("min_reference_volume", 0.0)),
        allow_external_fallback=bool(cfg.get("allow_external_fallback", True)),
    ),
)
register(
    "momentum_scalping",
    lambda cfg: MomentumStrategy(
        min_confidence=float(cfg.get("min_confidence", 0.2)),
        threshold=float(cfg.get("threshold", 0.02)),
    ),
)


__all__ = ["register", "get", "available"]
