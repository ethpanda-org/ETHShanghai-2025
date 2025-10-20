"""Lightweight reference strategy implementations."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Mapping, Optional

from config import settings

from .types import StrategyDecision


@dataclass
class BaseSimpleStrategy:
    """Base helper storing common parameters."""

    min_confidence: float = 0.0
    max_spread_bps: Optional[float] = None
    min_volume_24h: Optional[float] = None
    min_liquidity: Optional[float] = None

    def _normalize_confidence(self, value: float) -> float:
        return max(0.0, min(1.0, value))

    def _normalize_bias(self, value: float) -> float:
        return max(-1.0, min(1.0, value))

    def _passes_basic_filters(self, market: Mapping[str, float]) -> bool:
        """Skip thin or illiquid books before evaluating signals."""

        spread = None
        bid = market.get("bid")
        ask = market.get("ask")
        if bid is not None and ask is not None:
            try:
                spread = float(ask) - float(bid)
            except (TypeError, ValueError):
                spread = None
        elif market.get("spread") is not None:
            try:
                spread = float(market.get("spread"))
            except (TypeError, ValueError):
                spread = None

        max_spread_bps = self.max_spread_bps
        if max_spread_bps is None:
            try:
                max_spread_bps = float(getattr(settings, "STRATEGY_MAX_SPREAD_BPS", 0.0))
            except Exception:
                max_spread_bps = 0.0
        if max_spread_bps and spread is not None:
            if spread * 10_000.0 > max_spread_bps:
                return False

        min_volume = self.min_volume_24h
        if min_volume is None:
            try:
                min_volume = float(getattr(settings, "STRATEGY_MIN_VOLUME_24H", 0.0))
            except Exception:
                min_volume = 0.0
        if min_volume:
            volume = market.get("volume_24h")
            if volume is None:
                volume = market.get("volume")
            if volume is not None:
                try:
                    if float(volume) < min_volume:
                        return False
                except (TypeError, ValueError):
                    return False

        min_liquidity = self.min_liquidity
        if min_liquidity is None:
            try:
                min_liquidity = float(getattr(settings, "STRATEGY_MIN_LIQUIDITY", 0.0))
            except Exception:
                min_liquidity = 0.0
        if min_liquidity:
            liquidity_yes = market.get("liquidity_yes")
            liquidity_no = market.get("liquidity_no")
            yes_ok = False
            no_ok = False
            if liquidity_yes is not None:
                try:
                    yes_ok = float(liquidity_yes) >= min_liquidity
                except (TypeError, ValueError):
                    yes_ok = False
            if liquidity_no is not None:
                try:
                    no_ok = float(liquidity_no) >= min_liquidity
                except (TypeError, ValueError):
                    no_ok = False
            if liquidity_yes is not None or liquidity_no is not None:
                if not (yes_ok or no_ok):
                    return False

        return True

    def evaluate(self, market: Mapping[str, float]) -> Optional[StrategyDecision]:  # pragma: no cover - interface
        raise NotImplementedError


@dataclass
class MeanReversionStrategy(BaseSimpleStrategy):
    mid_target: float = 0.5
    sensitivity: float = 0.2
    min_deviation: float = 0.0  # absolute |mid - target| filter
    require_non_negative_momentum: bool = False
    price_extreme_bound: float = 0.0
    use_dynamic_target: bool = True
    dynamic_target_alpha: float = 0.2
    _target_state: Dict[str, float] = field(default_factory=dict, init=False, repr=False)

    def _current_target(self, market_id: str) -> float:
        return self._target_state.get(market_id, self.mid_target)

    def _update_target(self, market_id: str, mid_price: float) -> None:
        if not self.use_dynamic_target:
            return
        try:
            mid_val = float(mid_price)
        except (TypeError, ValueError):
            return
        alpha = max(0.0, min(1.0, float(self.dynamic_target_alpha)))
        prev = self._target_state.get(market_id, self.mid_target)
        new_target = (1.0 - alpha) * prev + alpha * mid_val
        self._target_state[market_id] = max(0.01, min(0.99, new_target))

    def _finalize(
        self,
        decision: Optional[StrategyDecision],
        market_id: str,
        mid_price: float,
    ) -> Optional[StrategyDecision]:
        if market_id:
            self._update_target(market_id, mid_price)
        return decision

    def evaluate(self, market: Mapping[str, float]) -> Optional[StrategyDecision]:
        if not self._passes_basic_filters(market):
            return None
        market_id = str(
            market.get("market_id")
            or market.get("id")
            or market.get("token_id")
            or ""
        )
        bid = float(market.get("bid", 0.0) or 0.0)
        ask = float(market.get("ask", 0.0) or 0.0)
        if bid <= 0 or ask <= 0:
            return None
        mid_price = (bid + ask) / 2.0
        # skip extremes near 0/1 region if configured
        if self.price_extreme_bound and (mid_price < self.price_extreme_bound or mid_price > 1.0 - self.price_extreme_bound):
            return self._finalize(None, market_id, mid_price)
        # Start with previously observed anchor before updating
        target_price = self._current_target(market_id) if market_id else self.mid_target
        diff = target_price - mid_price
        if self.min_deviation and abs(diff) < self.min_deviation:
            return self._finalize(None, market_id, mid_price)
        if self.require_non_negative_momentum:
            momentum_val = None
            for field in ("price_change_1h", "price_change_24h", "momentum"):
                raw_val = market.get(field)
                if raw_val is None:
                    continue
                try:
                    momentum_val = float(raw_val)
                    break
                except (TypeError, ValueError):
                    momentum_val = None
            if momentum_val is not None:
                if diff > 0 and momentum_val < 0:
                    return self._finalize(None, market_id, mid_price)
        bias = self._normalize_bias(diff / max(self.sensitivity, 1e-6))
        confidence = self._normalize_confidence(abs(diff) / max(self.sensitivity * 0.75, 1e-6))
        if confidence < self.min_confidence:
            return self._finalize(None, market_id, mid_price)
        reason = f"mid={mid_price:.3f}, target={target_price:.3f}"
        decision = StrategyDecision(
            bias=bias,
            confidence=confidence,
            size_hint=min(1.0, confidence + abs(bias) / 2.0),
            reason=reason,
            metadata={
                "mid_price": mid_price,
                "target_price": target_price,
                "deviation": diff,
            },
        )
        return self._finalize(decision.clamp(), market_id, mid_price)


@dataclass
class MomentumStrategy(BaseSimpleStrategy):
    threshold: float = 0.02
    require_consistency_1h: bool = False
    min_1h_magnitude: float = 0.005

    def evaluate(self, market: Mapping[str, float]) -> Optional[StrategyDecision]:
        if not self._passes_basic_filters(market):
            return None
        change = market.get("price_change_24h")
        if change is None:
            change = market.get("momentum")
        if change is None:
            return None
        delta = float(change)
        if abs(delta) < self.threshold:
            return None
        volatility = self._extract_volatility(market)
        # optional 1h consistency check
        if self.require_consistency_1h:
            ch1 = market.get("price_change_1h")
            try:
                if ch1 is not None and abs(float(ch1)) >= self.min_1h_magnitude:
                    if (delta > 0 and float(ch1) < 0) or (delta < 0 and float(ch1) > 0):
                        return None
            except (TypeError, ValueError):
                pass
        norm_denominator = max(self.threshold, volatility, 1e-6)
        normalized_delta = delta / norm_denominator
        bias = self._normalize_bias(normalized_delta)
        confidence = self._normalize_confidence(abs(normalized_delta))
        if confidence < self.min_confidence:
            return None
        mr_bias = None
        mid_price = market.get("mid_price")
        if mid_price is None and "bid" in market and "ask" in market:
            bid = market.get("bid")
            ask = market.get("ask")
            try:
                if bid is not None and ask is not None:
                    mid_price = (float(bid) + float(ask)) / 2.0
            except (TypeError, ValueError):
                mid_price = None
        try:
            if mid_price is not None:
                diff = 0.5 - float(mid_price)
                if abs(diff) >= 0.01:
                    mr_bias = 1 if diff > 0 else -1
        except (TypeError, ValueError):
            mr_bias = None
        if mr_bias is not None and confidence < 0.7:
            momentum_bias = 1 if delta > 0 else -1
            if momentum_bias != mr_bias:
                return None
        size_hint = min(1.0, confidence + min(1.0, abs(normalized_delta)))
        reason = f"delta={delta:.3f}"
        return StrategyDecision(
            bias=bias,
            confidence=confidence,
            size_hint=size_hint,
            reason=reason,
            metadata={
                "momentum": delta,
                "normalized_momentum": normalized_delta,
                "volatility_ref": volatility,
            },
        ).clamp()

    @staticmethod
    def _extract_volatility(market: Mapping[str, float]) -> float:
        candidates = [
            market.get("volatility"),
            market.get("volatility_24h"),
            market.get("volatility_1h"),
            market.get("atr"),
        ]
        for value in candidates:
            try:
                if value is not None:
                    vol = abs(float(value))
                    if vol > 0:
                        return vol
            except (TypeError, ValueError):
                continue
        return 0.0


@dataclass
class EventDrivenStrategy(BaseSimpleStrategy):
    volume_threshold: float = 5000.0
    sentiment_weight: float = 0.6
    sentiment_floor: float = 0.05
    volume_spike_multiplier_non_news: float = 1.5
    require_true_source: bool = False
    non_news_conf_scale: float = 0.7
    max_age_seconds: int = 1800
    decay_half_life_seconds: int = 900
    allowed_risk_levels: Optional[list] = None

    def evaluate(self, market: Mapping[str, float]) -> Optional[StrategyDecision]:
        if not self._passes_basic_filters(market):
            return None
        sentiment = self._extract_sentiment(market)
        volume = float(market.get("volume_24h", 0.0) or 0.0)
        spike_ratio = (volume - self.volume_threshold) / max(self.volume_threshold, 1e-6)
        spike = max(0.0, spike_ratio)

        if abs(sentiment) < self.sentiment_floor and spike <= 0.0:
            return None
        source = str(market.get("sentiment_source") or "").lower()
        # Recognize common true-source aliases
        news_aliases = {"news", "newsapi", "gnews", "ap", "reuters", "bloomberg", "ft", "guardian"}
        social_aliases = {"social", "twitter", "x", "reddit"}
        true_sources = news_aliases | social_aliases
        synthetic = source not in true_sources
        if self.require_true_source and synthetic:
            return None

        # For synthetic sources, require a visible volume spike and boost its effect
        spike_eff = float(spike)
        if synthetic:
            if spike_eff <= 0.0:
                return None
            spike_eff *= max(1.0, float(self.volume_spike_multiplier_non_news))
        if spike_eff > 0.0:
            if abs(sentiment) >= self.sentiment_floor:
                volume_bias = spike_eff if sentiment >= 0 else -spike_eff
            else:
                volume_bias = 0.0
        else:
            volume_bias = 0.0

        score = self.sentiment_weight * sentiment + (1 - self.sentiment_weight) * volume_bias
        if abs(score) <= 1e-6:
            return None

        confidence_base = max(abs(sentiment), abs(volume_bias))
        # Incorporate sentiment_confidence from enrichment and downscale synthetic sources
        raw_conf = market.get("sentiment_confidence")
        try:
            conf_scale = float(raw_conf) if raw_conf is not None else 1.0
        except (TypeError, ValueError):
            conf_scale = 1.0
        conf_scale = max(0.2, min(1.0, conf_scale))
        if synthetic:
            conf_scale *= max(0.0, min(1.0, self.non_news_conf_scale))
        confidence = self._normalize_confidence(confidence_base * conf_scale)
        age_seconds = self._estimate_age_seconds(market)
        if age_seconds is not None and self.max_age_seconds and age_seconds > self.max_age_seconds:
            return None
        if age_seconds is not None and self.decay_half_life_seconds > 0:
            decay_factor = 0.5 ** (age_seconds / float(self.decay_half_life_seconds))
            confidence *= decay_factor
            score *= decay_factor
        if confidence < self.min_confidence:
            return None

        bias = self._normalize_bias(score)
        size_hint = min(1.0, 0.35 + confidence + min(spike_eff, 1.0) * 0.30)
        reason = f"sentiment={sentiment:.3f}, volume={volume:.0f}, spike={spike:.3f}"
        metadata = {
            "sentiment": sentiment,
            "volume": volume,
            "spike": spike,
            "spike_effective": spike_eff,
            "exclusive": True,
            "age_seconds": age_seconds,
            "decay_half_life": self.decay_half_life_seconds,
            "sentiment_confidence": float(raw_conf) if isinstance(raw_conf, (int, float)) else raw_conf,
            "sentiment_source": source,
        }
        # Provide a rough expected duration to help exit policy decide initial hold window
        try:
            # 10–40 minutes depending on spike magnitude
            expected = int(600 + max(0.0, min(1.0, spike)) * 1800)
            metadata["expected_duration_seconds"] = expected
        except Exception:
            pass
        return StrategyDecision(
            bias=bias,
            confidence=confidence,
            size_hint=size_hint,
            reason=reason,
            metadata=metadata,
        ).clamp()

    def _extract_sentiment(self, market: Mapping[str, float]) -> float:
        if market.get("news_sentiment") is not None:
            return float(market.get("news_sentiment") or 0.0)
        if market.get("sentiment_source") is not None and market.get("sentiment") is not None:
            return float(market.get("sentiment") or 0.0)
        return float(market.get("sentiment", 0.0) or 0.0)

    def _estimate_age_seconds(self, market: Mapping[str, float]) -> Optional[float]:
        timestamp = (
            market.get("sentiment_updated_at")
            or market.get("sentiment_timestamp")
            or market.get("sentiment_ts")
        )
        if timestamp is None:
            return None
        try:
            if isinstance(timestamp, (int, float)):
                return max(0.0, float(timestamp))
            dt = datetime.fromisoformat(str(timestamp).replace("Z", "+00:00"))
            return max(0.0, (datetime.now(timezone.utc) - dt).total_seconds())
        except Exception:
            return None


@dataclass
class MicroArbitrageStrategy(BaseSimpleStrategy):
    min_spread: float = 0.02
    taker_fee: float = 0.003
    min_net_edge: float = 0.002
    external_spread_max: float = 0.05
    min_local_liquidity: float = 0.0
    external_fee: float = 0.0015
    internal_edge_threshold: float = 0.015
    internal_confidence_scale: float = 1.0
    min_reference_volume: float = 0.0
    allow_external_fallback: bool = True

    def evaluate(self, market: Mapping[str, float]) -> Optional[StrategyDecision]:
        if not self._passes_basic_filters(market):
            return None
        # Optional risk-level gate
        try:
            if self.allowed_risk_levels:
                levels = {str(x).upper() for x in self.allowed_risk_levels}
                rlevel = str(market.get("risk_level") or "").upper()
                if rlevel and rlevel not in levels:
                    return None
        except Exception:
            pass

        internal_decision = self._evaluate_internal_market(market)
        if internal_decision is not None:
            return internal_decision

        if not self.allow_external_fallback:
            return None

        return self._evaluate_external_market(market)

    def _evaluate_internal_market(self, market: Mapping[str, float]) -> Optional[StrategyDecision]:
        references = market.get("internal_micro_refs") or []
        if not references:
            return None

        local_bid = self._to_float(market.get("bid"))
        local_ask = self._to_float(market.get("ask"))
        yes_price = self._to_float(market.get("yes_price"))
        if local_bid is None or local_ask is None or yes_price is None:
            return None
        if self.min_local_liquidity and not self._has_min_liquidity(market):
            return None

        cost_buffer = self.taker_fee + self.external_fee
        best_signal: Optional[Dict[str, Any]] = None
        for ref in references:
            ref_price = self._to_float(ref.get("yes_price"))
            if ref_price is None:
                continue
            ref_volume = self._to_float(ref.get("volume_24h"))
            long_edge = ref_price - local_ask - cost_buffer
            short_edge = local_bid - ref_price - cost_buffer
            if long_edge > self.internal_edge_threshold:
                signal = {
                    "direction": "yes",
                    "edge": long_edge,
                    "ref": ref,
                    "volume": ref_volume,
                }
            elif short_edge > self.internal_edge_threshold:
                signal = {
                    "direction": "no",
                    "edge": short_edge,
                    "ref": ref,
                    "volume": ref_volume,
                }
            else:
                continue
            if best_signal is None or signal["edge"] > best_signal["edge"]:
                best_signal = signal

        if not best_signal:
            return None

        edge = best_signal["edge"]
        confidence_raw = min(
            1.0,
            (edge / max(self.internal_edge_threshold, 1e-6)) * self.internal_confidence_scale,
        )
        volume_factor = 1.0
        if self.min_reference_volume > 0 and isinstance(best_signal.get("volume"), (int, float)):
            volume_factor = min(1.0, max(0.0, best_signal["volume"]) / self.min_reference_volume)
        confidence = confidence_raw * volume_factor
        if confidence < self.min_confidence:
            return None

        bias = 1.0 if best_signal["direction"] == "yes" else -1.0
        size_hint = min(1.0, confidence + volume_factor * 0.3)
        metadata = {
            "mode": "internal",
            "reference_market_id": best_signal["ref"].get("market_id"),
            "reference_condition_id": best_signal["ref"].get("condition_id"),
            "reference_yes_price": best_signal["ref"].get("yes_price"),
            "edge": edge,
            "exclusive": True,
            "internal_edge_threshold": self.internal_edge_threshold,
        }
        reason = f"internal_edge={edge:.4f}, ref={metadata['reference_market_id']}"
        return StrategyDecision(
            bias=self._normalize_bias(bias),
            confidence=self._normalize_confidence(confidence),
            size_hint=size_hint,
            reason=reason,
            metadata=metadata,
        ).clamp()

    def _evaluate_external_market(self, market: Mapping[str, float]) -> Optional[StrategyDecision]:
        if market.get("external_real") is not True:
            return None

        bid = self._to_float(market.get("bid"))
        ask = self._to_float(market.get("ask"))
        ext_bid = self._to_float(market.get("external_bid"))
        ext_ask = self._to_float(market.get("external_ask"))
        if bid is None or ask is None or ext_bid is None or ext_ask is None:
            return None

        if not self._has_min_liquidity(market):
            return None

        local_spread = abs(ask - bid)
        if local_spread > self.min_spread:
            return None
        ext_spread = abs(ext_ask - ext_bid)
        if self.external_spread_max > 0 and ext_ask >= ext_bid and ext_spread > self.external_spread_max:
            return None

        # Net edge after including local taker cost; aligns with todolist gate and fee-aware execution
        buy_edge = (ext_bid - ask) - max(0.0, self.taker_fee)
        sell_edge = (bid - ext_ask) - max(0.0, self.taker_fee)

        bias = 0.0
        confidence = 0.0
        reason_parts = []
        if buy_edge > self.min_net_edge:
            inc = min(1.0, buy_edge / max(self.min_net_edge, 1e-6))
            bias += inc
            confidence = max(confidence, inc)
            reason_parts.append(f"buy_edge={buy_edge:.3f}")
        if sell_edge > self.min_net_edge:
            inc = min(1.0, sell_edge / max(self.min_net_edge, 1e-6))
            bias -= inc
            confidence = max(confidence, inc)
            reason_parts.append(f"sell_edge={sell_edge:.3f}")

        if bias == 0.0 or confidence < self.min_confidence:
            return None

        size_hint = min(1.0, confidence + abs(bias) / 2)
        reason = "; ".join(reason_parts) if reason_parts else "external mismatch"
        return StrategyDecision(
            bias=self._normalize_bias(bias),
            confidence=self._normalize_confidence(confidence),
            size_hint=size_hint,
            reason=reason,
            metadata={
                "mode": "external",
                "external_bid": ext_bid,
                "external_ask": ext_ask,
                "local_bid": bid,
                "local_ask": ask,
                "external_spread": ext_spread,
                "local_liquidity": self._resolve_local_liquidity(market),
                "buy_edge": buy_edge,
                "sell_edge": sell_edge,
                "taker_fee": self.taker_fee,
                "min_net_edge": self.min_net_edge,
            },
        ).clamp()

    def _has_min_liquidity(self, market: Mapping[str, float]) -> bool:
        if self.min_local_liquidity <= 0:
            return True
        liquidity = self._resolve_local_liquidity(market)
        return liquidity is not None and liquidity >= self.min_local_liquidity

    def _resolve_local_liquidity(self, market: Mapping[str, float]) -> Optional[float]:
        for key in ("order_liquidity", "liquidity_yes", "liquidity_no", "liquidity"):
            value = self._to_float(market.get(key))
            if value is not None:
                return value
        return None

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        try:
            if value is None:
                return None
            return float(value)
        except (TypeError, ValueError):
            return None


__all__ = [
    "BaseSimpleStrategy",
    "MeanReversionStrategy",
    "MomentumStrategy",
    "EventDrivenStrategy",
    "MicroArbitrageStrategy",
]
