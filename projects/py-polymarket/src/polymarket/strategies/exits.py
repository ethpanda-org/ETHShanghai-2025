"""
Strategy-specific exit evaluation scaffolding.

This module defines the interface used by the trading runner to query
per-strategy exit recommendations. Concrete evaluators will be fleshed out
in subsequent tasks.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Mapping, Optional


@dataclass
class ExitDecision:
    """Represents a strategy-specific exit recommendation."""

    action: str  # "close" | "hold"
    reason: str
    metadata: Dict[str, Any]


class ExitEvaluator:
    """Base class for strategy exit evaluators."""

    strategy_name: str

    def capture_entry(self, strategy_state: Dict[str, Any], contribution: Mapping[str, Any]) -> None:
        """
        Allow the evaluator to store any strategy-specific entry metadata.

        Implementations mutate ``strategy_state`` in place.
        """

    def evaluate(
        self,
        strategy_state: Mapping[str, Any],
        position: Mapping[str, Any],
        market: Mapping[str, Any],
    ) -> Optional[ExitDecision]:
        """Return an exit decision, or ``None`` to defer."""
        return None


class MeanReversionExitEvaluator(ExitEvaluator):
    strategy_name = "mean_reversion"
    _target_slack_ratio = 0.25
    _stop_multiplier = 1.6

    def capture_entry(self, strategy_state: Dict[str, Any], contribution: Mapping[str, Any]) -> None:
        metadata = contribution.get("metadata") or {}
        strategy_state["entry_mid_price"] = metadata.get("mid_price")
        strategy_state["entry_deviation"] = metadata.get("deviation")
        strategy_state["entry_bias"] = contribution.get("bias")

    def evaluate(
        self,
        strategy_state: Mapping[str, Any],
        position: Mapping[str, Any],
        market: Mapping[str, Any],
    ) -> Optional[ExitDecision]:
        entry_dev = _to_float(strategy_state.get("entry_deviation"))
        entry_mid = _to_float(strategy_state.get("entry_mid_price"))
        if entry_dev is None and entry_mid is None:
            return None
        cur_mid = _mid_price(market)
        target = 0.5
        if entry_dev is None and entry_mid is not None:
            entry_dev = target - entry_mid
        if entry_dev is None:
            return None
        cur_dev = target - cur_mid
        threshold = max(0.01, abs(entry_dev) * self._target_slack_ratio)

        if abs(cur_dev) <= threshold:
            return ExitDecision(
                action="close",
                reason="mean_reversion_target",
                metadata={
                    "current_mid": cur_mid,
                    "current_deviation": cur_dev,
                    "threshold": threshold,
                },
            )

        if abs(cur_dev) >= abs(entry_dev) * self._stop_multiplier:
            return ExitDecision(
                action="close",
                reason="mean_reversion_stop",
                metadata={
                    "current_mid": cur_mid,
                    "current_deviation": cur_dev,
                    "stop_multiplier": self._stop_multiplier,
                },
            )
        return None


class MomentumExitEvaluator(ExitEvaluator):
    strategy_name = "momentum_scalping"
    _decay_ratio = 0.35

    def capture_entry(self, strategy_state: Dict[str, Any], contribution: Mapping[str, Any]) -> None:
        metadata = contribution.get("metadata") or {}
        strategy_state["entry_momentum"] = metadata.get("momentum")
        strategy_state["entry_bias"] = contribution.get("bias")

    def evaluate(
        self,
        strategy_state: Mapping[str, Any],
        position: Mapping[str, Any],
        market: Mapping[str, Any],
    ) -> Optional[ExitDecision]:
        entry_momentum = _to_float(strategy_state.get("entry_momentum"))
        if entry_momentum is None:
            return None
        cur_momentum = _to_float(market.get("price_change_24h") or market.get("momentum"))
        if cur_momentum is None:
            return None
        one_hour = _to_float(market.get("price_change_1h"))

        if entry_momentum > 0 and cur_momentum <= 0:
            return ExitDecision(
                action="close",
                reason="momentum_reversal",
                metadata={"current_momentum": cur_momentum},
            )
        if entry_momentum < 0 and cur_momentum >= 0:
            return ExitDecision(
                action="close",
                reason="momentum_reversal",
                metadata={"current_momentum": cur_momentum},
            )
        if one_hour is not None:
            if entry_momentum > 0 and one_hour < 0:
                return ExitDecision(
                    action="close",
                    reason="momentum_1h_reversal",
                    metadata={"one_hour_change": one_hour},
                )
            if entry_momentum < 0 and one_hour > 0:
                return ExitDecision(
                    action="close",
                    reason="momentum_1h_reversal",
                    metadata={"one_hour_change": one_hour},
                )
        if abs(cur_momentum) <= abs(entry_momentum) * self._decay_ratio:
            return ExitDecision(
                action="close",
                reason="momentum_decay",
                metadata={
                    "current_momentum": cur_momentum,
                    "decay_ratio": self._decay_ratio,
                },
            )
        return None


class MicroArbitrageExitEvaluator(ExitEvaluator):
    strategy_name = "micro_arbitrage"

    def capture_entry(self, strategy_state: Dict[str, Any], contribution: Mapping[str, Any]) -> None:
        metadata = contribution.get("metadata") or {}
        ref_id = metadata.get("reference_market_id") or metadata.get("reference_condition_id")
        if ref_id:
            strategy_state["reference_market_id"] = str(ref_id)
        bias = contribution.get("bias")
        strategy_state["direction"] = "yes" if (bias or 0.0) >= 0 else "no"
        strategy_state["entry_edge"] = metadata.get("edge")
        strategy_state["threshold"] = metadata.get("internal_edge_threshold")
        strategy_state["mode"] = metadata.get("mode", "internal")

    def evaluate(
        self,
        strategy_state: Mapping[str, Any],
        position: Mapping[str, Any],
        market: Mapping[str, Any],
    ) -> Optional[ExitDecision]:
        mode = str(strategy_state.get("mode", "internal")).lower()
        if mode == "external":
            # Exit when net edge (external vs local) no longer exceeds taker cost
            ext_bid = _to_float(market.get("external_bid"))
            ext_ask = _to_float(market.get("external_ask"))
            bid = _to_float(market.get("bid"))
            ask = _to_float(market.get("ask"))
            if ext_bid is None or ext_ask is None or bid is None or ask is None:
                return None
            direction = str(strategy_state.get("direction") or position.get("side") or "yes").lower()
            fee = _to_float(strategy_state.get("taker_fee"))
            if fee is None:
                fee = 0.003
            if direction == "yes":
                current_edge = (ext_bid - ask) - max(0.0, fee)
            else:
                current_edge = (bid - ext_ask) - max(0.0, fee)
            if current_edge <= 0.0:
                return ExitDecision(
                    action="close",
                    reason="micro_arbitrage_external_edge_cost",
                    metadata={
                        "current_edge": current_edge,
                        "taker_fee": fee,
                        "external_bid": ext_bid,
                        "external_ask": ext_ask,
                        "local_bid": bid,
                        "local_ask": ask,
                    },
                )
            return None
        # Internal mode logic
        ref_id = str(strategy_state.get("reference_market_id") or "").lower()
        if not ref_id:
            return None
        refs = market.get("internal_micro_refs") or []
        ref_entry = None
        for candidate in refs:
            for key in ("market_id", "condition_id"):
                cand_id = str(candidate.get(key) or "").lower()
                if cand_id and cand_id == ref_id:
                    ref_entry = candidate
                    break
            if ref_entry:
                break
        if ref_entry is None:
            return ExitDecision(
                action="close",
                reason="micro_arbitrage_ref_missing",
                metadata={"reference_market_id": strategy_state.get("reference_market_id")},
            )
        ref_price = _to_float(ref_entry.get("yes_price"))
        local_bid = _to_float(market.get("bid"))
        local_ask = _to_float(market.get("ask"))
        if ref_price is None or (local_bid is None and local_ask is None):
            return None

        direction = str(strategy_state.get("direction") or position.get("side") or "yes").lower()
        threshold = strategy_state.get("threshold")
        if not isinstance(threshold, (int, float)):
            threshold = 0.0
        reentry_guard = max(0.0, float(threshold) * 0.5)

        if direction == "yes":
            mark = local_ask if local_ask is not None else _mid_price(market)
            current_edge = ref_price - mark
            should_exit = current_edge <= reentry_guard
        else:
            mark = local_bid if local_bid is not None else _mid_price(market)
            current_edge = mark - ref_price
            should_exit = current_edge <= reentry_guard

        if should_exit:
            return ExitDecision(
                action="close",
                reason="micro_arbitrage_edge_reverted",
                metadata={
                    "current_edge": current_edge,
                    "reference_market_id": ref_entry.get("market_id"),
                    "threshold": threshold,
                },
            )
        return None


class EventDrivenExitEvaluator(ExitEvaluator):
    strategy_name = "event_driven"
    _sentiment_decay_ratio = 0.25
    _volume_decay_ratio = 0.4
    _default_hold_seconds = 900  # 15 minutes
    _default_trailing_trigger = 0.045
    _default_trailing_decay = 0.02

    def capture_entry(self, strategy_state: Dict[str, Any], contribution: Mapping[str, Any]) -> None:
        metadata = contribution.get("metadata") or {}
        strategy_state["entry_sentiment"] = metadata.get("sentiment")
        strategy_state["entry_volume"] = metadata.get("volume")
        strategy_state["entry_spike"] = metadata.get("spike")
        strategy_state["entry_bias"] = contribution.get("bias")
        hold_seconds = metadata.get("hold_seconds")
        if isinstance(hold_seconds, (int, float)) and hold_seconds > 0:
            strategy_state["hold_seconds"] = int(hold_seconds)
        else:
            entry_spike = metadata.get("spike")
            if isinstance(entry_spike, (int, float)) and entry_spike >= 0.6:
                strategy_state["hold_seconds"] = int(
                    metadata.get("expected_duration_seconds", self._default_hold_seconds)
                )
        if metadata.get("hold_to_resolution"):
            strategy_state["hold_to_resolution"] = True
        elif metadata.get("hold_to_resolution") is None:
            entry_spike = metadata.get("spike")
            if isinstance(entry_spike, (int, float)) and entry_spike >= 0.9:
                strategy_state["hold_to_resolution"] = True
        trailing_trigger = metadata.get("trailing_trigger_pct")
        trailing_decay = metadata.get("trailing_decay_pct")
        try:
            strategy_state["trailing_trigger_pct"] = float(trailing_trigger)
        except (TypeError, ValueError):
            strategy_state["trailing_trigger_pct"] = self._default_trailing_trigger
        try:
            strategy_state["trailing_decay_pct"] = float(trailing_decay)
        except (TypeError, ValueError):
            strategy_state["trailing_decay_pct"] = self._default_trailing_decay
        strategy_state["best_pnl_pct"] = 0.0

    def evaluate(
        self,
        strategy_state: Mapping[str, Any],
        position: Mapping[str, Any],
        market: Mapping[str, Any],
    ) -> Optional[ExitDecision]:
        now = datetime.now(timezone.utc)
        hold_to_resolution = bool(strategy_state.get("hold_to_resolution"))
        is_resolved = bool(market.get("resolved") or market.get("is_resolved"))
        if hold_to_resolution and not is_resolved:
            return ExitDecision(
                action="hold",
                reason="event_hold_to_resolution",
                metadata={"hold_to_resolution": True},
            )

        entry_sentiment = _to_float(strategy_state.get("entry_sentiment"))
        cur_sentiment = _to_float(market.get("news_sentiment") or market.get("sentiment"))
        if entry_sentiment is not None and cur_sentiment is not None:
            if entry_sentiment > 0 and cur_sentiment <= 0:
                return ExitDecision(
                    action="close",
                    reason="event_sentiment_reversal",
                    metadata={"current_sentiment": cur_sentiment},
                )
            if entry_sentiment < 0 and cur_sentiment >= 0:
                return ExitDecision(
                    action="close",
                    reason="event_sentiment_reversal",
                    metadata={"current_sentiment": cur_sentiment},
                )
            if abs(cur_sentiment) <= abs(entry_sentiment) * self._sentiment_decay_ratio:
                return ExitDecision(
                    action="close",
                    reason="event_sentiment_decay",
                    metadata={
                        "current_sentiment": cur_sentiment,
                        "decay_ratio": self._sentiment_decay_ratio,
                    },
                )

        entry_volume = _to_float(strategy_state.get("entry_volume"))
        cur_volume = _to_float(market.get("volume_24h") or market.get("volume"))
        if entry_volume and cur_volume is not None:
            if cur_volume <= entry_volume * self._volume_decay_ratio:
                return ExitDecision(
                    action="close",
                    reason="event_volume_fade",
                    metadata={
                        "current_volume": cur_volume,
                        "entry_volume": entry_volume,
                        "decay_ratio": self._volume_decay_ratio,
                    },
                )

        hold_seconds = strategy_state.get("hold_seconds")
        if isinstance(hold_seconds, (int, float)) and hold_seconds > 0:
            try:
                opened_at_str = position.get("opened_at")
                if opened_at_str:
                    opened_at = datetime.fromisoformat(str(opened_at_str).replace("Z", "+00:00"))
                else:
                    opened_at = None
            except Exception:
                opened_at = None
            if opened_at:
                elapsed = (now - opened_at).total_seconds()
                remaining = max(0.0, hold_seconds - elapsed)
                if remaining > 0:
                    return ExitDecision(
                        action="hold",
                        reason="event_hold_window",
                        metadata={
                            "hold_seconds": hold_seconds,
                            "remaining_seconds": remaining,
                        },
                    )

        # Trailing stop: require favourable PnL and give back beyond decay threshold.
        try:
            cur_pnl_pct = _pnl_pct(position, market)
        except Exception:
            cur_pnl_pct = None
        if cur_pnl_pct is not None:
            best_seen = strategy_state.get("best_pnl_pct")
            if not isinstance(best_seen, (int, float)):
                best_seen = position.get("best_pnl_pct", 0.0)
            best_seen = float(best_seen or 0.0)
            if cur_pnl_pct > best_seen:
                best_seen = cur_pnl_pct
            trailing_trigger = float(strategy_state.get("trailing_trigger_pct") or self._default_trailing_trigger)
            trailing_decay = float(strategy_state.get("trailing_decay_pct") or self._default_trailing_decay)
            strategy_state["best_pnl_pct"] = best_seen
            if best_seen >= trailing_trigger and (best_seen - cur_pnl_pct) >= trailing_decay:
                return ExitDecision(
                    action="close",
                    reason="event_trailing_stop",
                    metadata={
                        "best_pnl_pct": best_seen,
                        "current_pnl_pct": cur_pnl_pct,
                        "trailing_decay_pct": trailing_decay,
                    },
                )

        return None


EVALUATORS: Dict[str, ExitEvaluator] = {
    MeanReversionExitEvaluator.strategy_name: MeanReversionExitEvaluator(),
    MomentumExitEvaluator.strategy_name: MomentumExitEvaluator(),
    MicroArbitrageExitEvaluator.strategy_name: MicroArbitrageExitEvaluator(),
    EventDrivenExitEvaluator.strategy_name: EventDrivenExitEvaluator(),
}


def get_evaluator(strategy_name: str) -> Optional[ExitEvaluator]:
    """Return the evaluator for ``strategy_name`` if registered."""
    return EVALUATORS.get(strategy_name)


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _mid_price(market: Mapping[str, Any]) -> float:
    bid = market.get("bid")
    ask = market.get("ask")
    try:
        if bid is not None and ask is not None:
            return (float(bid) + float(ask)) / 2.0
    except (TypeError, ValueError):
        pass
    for key in ("mid_price", "yes_price"):
        val = market.get(key)
        try:
            if val is not None:
                return float(val)
        except (TypeError, ValueError):
            continue
    return 0.5


def _yes_mark_for_side(side: str, market: Mapping[str, Any]) -> float:
    bid = market.get("bid")
    ask = market.get("ask")
    mid = _mid_price(market)
    if str(side).lower() == "yes":
        try:
            return float(bid)
        except (TypeError, ValueError):
            return mid
    try:
        return float(ask)
    except (TypeError, ValueError):
        return mid


def _pnl_pct(position: Mapping[str, Any], market: Mapping[str, Any]) -> Optional[float]:
    side = str(position.get("side") or "").lower()
    entry_yes = _to_float(position.get("entry_yes"))
    shares = _to_float(position.get("shares"))
    notional = _to_float(position.get("notional"))
    if entry_yes is None or shares is None or notional in (None, 0.0):
        return None
    mark_yes = _yes_mark_for_side(side, market)
    if side == "yes":
        pnl = shares * (mark_yes - entry_yes)
    else:
        pnl = shares * (entry_yes - mark_yes)
    notional = max(1e-9, notional)
    return pnl / notional


__all__ = [
    "ExitDecision",
    "ExitEvaluator",
    "MeanReversionExitEvaluator",
    "MomentumExitEvaluator",
    "EventDrivenExitEvaluator",
    "get_evaluator",
]
