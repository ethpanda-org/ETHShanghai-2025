"""Analysis utilities for summarising backtest and simulation outputs."""

from .backtest_summary import aggregate_backtest_metrics, load_backtest_trades

__all__ = ["aggregate_backtest_metrics", "load_backtest_trades"]
