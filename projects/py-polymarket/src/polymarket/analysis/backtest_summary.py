"""Utilities to aggregate archived backtest trade outputs.

This module focuses on producing per-strategy attribution and high-level
diversification metrics from the JSON exports emitted by backtest runs.
"""

from __future__ import annotations

import json
import math
import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence, Tuple


@dataclass
class TradeAttribution:
    market_id: Optional[str]
    timestamp: Optional[str]
    pnl: float
    strategies: List[str]
    raw: Mapping[str, object]


def _normalise_trade_payload(payload: Mapping[str, object]) -> TradeAttribution:
    pnl = payload.get("pnl")
    try:
        pnl_value = float(pnl)
    except (TypeError, ValueError):
        pnl_value = 0.0
    strat_payload = (
        payload.get("strategy_metadata", {}) if isinstance(payload, Mapping) else {}
    )
    strategies: List[str] = []
    if isinstance(strat_payload, Mapping):
        raw_list = strat_payload.get("strategies")
        if isinstance(raw_list, Sequence):
            for entry in raw_list:
                if isinstance(entry, Mapping) and entry.get("name"):
                    strategies.append(str(entry.get("name")))
    if not strategies and isinstance(payload.get("strategy"), str):
        strategies.append(str(payload["strategy"]))
    return TradeAttribution(
        market_id=str(payload.get("market_id")) if payload.get("market_id") else None,
        timestamp=str(payload.get("timestamp")) if payload.get("timestamp") else None,
        pnl=pnl_value,
        strategies=strategies,
        raw=payload,
    )


def load_backtest_trades(paths: Iterable[Path]) -> List[TradeAttribution]:
    """Load backtest trade outputs from multiple JSON files."""

    trades: List[TradeAttribution] = []
    for path in paths:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            continue
        except json.JSONDecodeError:
            continue
        candidates: Optional[Iterable[Mapping[str, object]]] = None
        if isinstance(data, Mapping):
            if isinstance(data.get("trades"), Sequence):
                candidates = data["trades"]
            else:
                candidates = data.values() if isinstance(data, Mapping) else None
        elif isinstance(data, Sequence):
            candidates = data
        if not candidates:
            continue
        for entry in candidates:
            if isinstance(entry, Mapping):
                trades.append(_normalise_trade_payload(entry))
    return trades


def _herfindahl_index(values: MutableMapping[str, float]) -> float:
    total = sum(abs(v) for v in values.values())
    if total <= 0:
        return 0.0
    return sum((abs(v) / total) ** 2 for v in values.values())


def aggregate_backtest_metrics(trades: Sequence[TradeAttribution]) -> Dict[str, object]:
    """Compute diversification statistics from archived trade attribution."""

    if not trades:
        return {
            "total_trades": 0,
            "total_pnl": 0.0,
            "avg_pnl": 0.0,
            "win_rate": 0.0,
            "volatility": 0.0,
            "strategy_stats": {},
            "diversification": {},
        }

    pnls = [trade.pnl for trade in trades]
    wins = sum(1 for value in pnls if value > 0)
    try:
        volatility = statistics.pstdev(pnls) if len(pnls) > 1 else 0.0
    except statistics.StatisticsError:
        volatility = 0.0

    # Per-strategy attribution
    strat_stats: Dict[str, Dict[str, object]] = defaultdict(
        lambda: {"trades": 0, "wins": 0, "pnls": []}
    )
    contribution: Dict[str, float] = defaultdict(float)
    pairwise = Counter()
    combination_map: Dict[str, Dict[str, float]] = defaultdict(
        lambda: {"trades": 0, "total_pnl": 0.0}
    )

    for trade in trades:
        participants = list(dict.fromkeys(trade.strategies)) or ["unattributed"]
        weight = 1.0 / len(participants)
        for name in participants:
            stats = strat_stats[name]
            stats["trades"] = int(stats["trades"]) + 1
            stats["pnls"].append(trade.pnl * weight)
            if trade.pnl > 0:
                stats["wins"] = int(stats["wins"]) + 1
            contribution[name] += trade.pnl * weight
        if len(participants) >= 2:
            for combo in _pairwise(participants):
                pairwise[combo] += 1
        combo_key = "+".join(sorted(participants))
        combo = combination_map[combo_key]
        combo["trades"] = combo.get("trades", 0) + 1
        combo["total_pnl"] = combo.get("total_pnl", 0.0) + trade.pnl

    strategy_summary = {}
    total_abs = sum(abs(v) for v in contribution.values())
    for name, stats in strat_stats.items():
        pnls_series = stats["pnls"]
        trades_count = max(1, int(stats["trades"]))
        avg_pnl = sum(pnls_series) / trades_count if pnls_series else 0.0
        volatility_pnl = (
            statistics.pstdev(pnls_series) if len(pnls_series) > 1 else 0.0
        )
        share = (abs(contribution[name]) / total_abs) if total_abs else 0.0
        strategy_summary[name] = {
            "trades": trades_count,
            "win_rate": (int(stats["wins"]) / trades_count) if trades_count else 0.0,
            "total_pnl": contribution[name],
            "avg_pnl": avg_pnl,
            "pnl_volatility": volatility_pnl,
            "contribution_share": share,
        }

    hhi = _herfindahl_index(contribution)
    diversification_index = 1.0 - hhi

    diversification = {
        "herfindahl_index": hhi,
        "diversification_index": diversification_index,
        "combinations": {
            combo: {
                "trades": values["trades"],
                "total_pnl": values["total_pnl"],
            }
            for combo, values in sorted(
                combination_map.items(), key=lambda item: (-item[1]["trades"], item[0])
            )
        },
        "pairwise_frequency": {
            " & ".join(pair): count for pair, count in pairwise.most_common()
        },
    }

    summary = {
        "total_trades": len(trades),
        "total_pnl": sum(pnls),
        "avg_pnl": sum(pnls) / len(pnls),
        "win_rate": wins / len(pnls),
        "volatility": volatility,
        "strategy_stats": strategy_summary,
        "diversification": diversification,
    }
    return summary


def _pairwise(strategies: Sequence[str]) -> Iterable[Tuple[str, str]]:
    if len(strategies) < 2:
        return []
    pairs: List[Tuple[str, str]] = []
    for idx, first in enumerate(strategies):
        for second in strategies[idx + 1 :]:
            pair = tuple(sorted((first, second)))
            pairs.append(pair)
    return pairs
