#!/usr/bin/env python3
"""
生成国库资金、费用、价格与提案数量的关联可视化结果。

脚本依赖仓库顶层的 `data/` 目录下现有的 CSV 数据，并会输出聚合数据
及时间序列图，同时保存按日/周/月聚合的提案数量。
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, Iterable, Tuple
from itertools import cycle

import pandas as pd
import matplotlib.pyplot as plt


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"
OUTPUT_BASE = Path.cwd()
PROPOSAL_FREQUENCIES: Dict[str, Tuple[str, str]] = {
    "daily": ("D", "day_start"),
    "weekly": ("W-MON", "week_start"),
    "monthly": ("MS", "month_start"),
}
FREQUENCY_LABELS: Dict[str, str] = {
    "D": "Daily",
    "W-MON": "Weekly",
    "MS": "Monthly",
}
PROPOSAL_COLOR = "#264653"
METRIC_COLOR_PALETTE = [
    "#2A9D8F",
    "#E76F51",
    "#F4A261",
    "#457B9D",
    "#8AB17D",
    "#E9C46A",
]

def _align_to_period(series: pd.Series, freq: str) -> pd.Series:
    """将时间对齐到给定频率的区间起始。"""
    series = series.dt.floor("D")
    if freq.startswith("W-"):
        return (series - pd.to_timedelta(series.dt.weekday, unit="D")).dt.floor("D")
    if freq == "MS":
        return series.dt.to_period("M").dt.to_timestamp()
    if freq == "D":
        return series.dt.floor("D")
    raise ValueError(f"Unsupported frequency: {freq}")


def _zscore(series: pd.Series) -> pd.Series:
    """对指标做 Z 分数归一化，避免量纲差异导致图中无法比较。"""
    mean = series.mean()
    std = series.std(ddof=0)
    if std == 0 or pd.isna(std):
        return series - mean
    return (series - mean) / std


def _clean_timestamp(raw: str) -> pd.Timestamp:
    """清洗提案时间戳，兼容文件中的特殊字符。"""
    if pd.isna(raw):
        return pd.NaT

    cleaned = re.sub(r"[^0-9A-Za-z:, ]", " ", str(raw))
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return pd.NaT

    for fmt in ("%b %d, %Y %I:%M %p", "%b %d, %Y %H:%M %p"):
        try:
            return pd.to_datetime(cleaned, format=fmt)
        except ValueError:
            continue

    try:
        return pd.to_datetime(cleaned, errors="coerce")
    except Exception:  # pragma: no cover
        return pd.NaT


def load_proposal_timestamps() -> pd.Series:
    """加载提案时间戳，优先使用 start_date，缺失时回退到 created_date。"""
    path = DATA_DIR / "proposals_cleaned_final.csv"
    df = pd.read_csv(
        path,
        encoding="latin-1",
        usecols=lambda c: c in {"start_date", "created_date"},
    )

    for column in df.columns:
        df[column] = df[column].map(_clean_timestamp)

    if "start_date" not in df.columns and "created_date" not in df.columns:
        return pd.Series(dtype="datetime64[ns]")

    timestamps = df.get("start_date", pd.Series(dtype="datetime64[ns]"))
    if "created_date" in df.columns:
        timestamps = timestamps.fillna(df["created_date"])

    timestamps = pd.to_datetime(timestamps, errors="coerce").dropna().sort_values()
    timestamps.name = "timestamp"
    return timestamps


def aggregate_proposal_counts(
    timestamps: pd.Series,
    freq: str,
    index_name: str,
    series_name: str,
) -> pd.Series:
    """根据频率聚合提案数量。"""
    if timestamps.empty:
        return pd.Series(dtype="int64", name=series_name).rename_axis(index_name)

    resample_kwargs = {"label": "left", "closed": "left"} if freq.startswith("W") else {}
    counts = (
        timestamps.to_frame(name="timestamp")
        .set_index("timestamp")
        .resample(freq, **resample_kwargs)
        .size()
        .astype("int64")
    )
    if getattr(counts.index, "tz", None) is not None:
        counts.index = counts.index.tz_convert(None)
    counts.index.name = index_name
    return counts.rename(series_name).sort_index()


def export_proposal_activity_counts(
    timestamps: pd.Series,
    out_dir: Path,
) -> Dict[str, pd.Series]:
    """输出不同时间尺度的提案数量统计。"""
    aggregations: Dict[str, pd.Series] = {}
    for label, (freq, index_name) in PROPOSAL_FREQUENCIES.items():
        series_name = f"proposal_count_{label}"
        counts = aggregate_proposal_counts(timestamps, freq, index_name, series_name)
        if not counts.empty:
            counts.to_frame().to_csv(
                out_dir / f"proposal_counts_{label}.csv",
                index_label=index_name,
            )
        aggregations[label] = counts
    return aggregations


def load_metric(
    filename: str,
    value_column: str,
    aggregation: str = "mean",
    date_column: str = "date",
    freq: str = "W-MON",
) -> pd.Series:
    """加载单个指标并按指定频率聚合。"""
    path = DATA_DIR / filename
    df = pd.read_csv(path, parse_dates=[date_column])
    df = df[[date_column, value_column]].rename(columns={date_column: "date"})
    df["period_start"] = _align_to_period(df["date"], freq)

    grouped = df.groupby("period_start")[value_column]
    if aggregation == "sum":
        aggregated = grouped.sum()
    elif aggregation == "median":
        aggregated = grouped.median()
    else:
        aggregated = grouped.mean()

    aggregated.name = value_column
    return aggregated.sort_index()


def load_proposal_counts(
    timestamps: pd.Series | None = None,
    freq: str = "W-MON",
    index_name: str = "week_start",
    series_name: str = "proposal_count",
) -> pd.Series:
    """统计指定频率的提案数量。"""
    timestamps = load_proposal_timestamps() if timestamps is None else timestamps
    return aggregate_proposal_counts(
        timestamps,
        freq=freq,
        index_name=index_name,
        series_name=series_name,
    )


def build_metric_dataset(
    proposal_series: pd.Series,
    freq: str,
) -> pd.DataFrame:
    """整合国库、费用、价格与提案数量的聚合数据。"""
    metric_specs: Iterable[Tuple[str, str, str]] = (
        ("frax-finance_treasury_history.csv", "total_liquidity_usd", "mean"),
        ("frax-finance_fees.csv", "fees_usd", "sum"),
        ("frax-finance_price_history.csv", "price_usd", "mean"),
    )

    series_map: Dict[str, pd.Series] = {}
    for filename, value_col, agg in metric_specs:
        series = load_metric(filename, value_col, aggregation=agg, freq=freq)
        series_map[value_col] = series

    series_map["proposal_count"] = proposal_series

    combined = pd.concat(series_map.values(), axis=1, join="inner")
    combined.index.name = proposal_series.index.name
    return combined.dropna().sort_index()


def plot_time_series(
    data: pd.DataFrame,
    out_path: Path,
    frequency_label: str,
) -> None:
    """绘制提案数量与财务指标的双轴时间序列图。"""
    fig, ax_left = plt.subplots(figsize=(9.0, 5.5))

    proposal_line = ax_left.plot(
        data.index,
        data["proposal_count"],
        color=PROPOSAL_COLOR,
        label=f"{frequency_label} Proposal Count",
        linewidth=2,
        marker="o",
        markersize=5,
        markerfacecolor="#ffffff",
        markeredgewidth=1.2,
        markeredgecolor=PROPOSAL_COLOR,
    )
    ax_left.set_ylabel(f"{frequency_label} Proposal Count", color=PROPOSAL_COLOR)
    ax_left.tick_params(axis="y", labelcolor=PROPOSAL_COLOR)

    ax_right = ax_left.twinx()
    line_handles = []
    metric_columns = [col for col in data.columns if col != "proposal_count"]
    normalized_metrics = {metric: _zscore(data[metric]) for metric in metric_columns}

    color_cycle = cycle(METRIC_COLOR_PALETTE)
    for metric in metric_columns:
        color = next(color_cycle)
        handle = ax_right.plot(
            data.index,
            normalized_metrics[metric],
            label=f"{metric} (z-score)",
            color=color,
            alpha=0.8,
        )
        line_handles.extend(handle)

    ax_left.set_title(f"{frequency_label} Governance Activity vs Protocol Metrics")
    ax_left.set_xlabel(f"{frequency_label} Start")
    ax_right.set_ylabel("Metric (Z-Score)")
    ax_left.grid(axis="y", color="#d7d7d7", linestyle="--", linewidth=0.8, alpha=0.6)
    ax_right.grid(False)
    ax_left.set_facecolor("#f7f9fb")

    handles = proposal_line + line_handles
    labels = [h.get_label() for h in handles]
    ax_left.legend(handles, labels, loc="upper left", frameon=True, framealpha=0.85)

    fig.tight_layout()
    fig.savefig(out_path, dpi=300)
    plt.close(fig)


def main() -> None:
    proposal_timestamps = load_proposal_timestamps()
    proposal_activity = export_proposal_activity_counts(proposal_timestamps, OUTPUT_BASE)

    target_freq = "MS"
    freq_label = FREQUENCY_LABELS.get(target_freq, target_freq)
    proposal_series = proposal_activity.get("monthly")

    if proposal_series is None or proposal_series.empty:
        proposal_series = load_proposal_counts(
            proposal_timestamps,
            freq=target_freq,
            index_name="month_start",
            series_name="proposal_count",
        )
    else:
        proposal_series = proposal_series.rename("proposal_count")

    metrics = build_metric_dataset(proposal_series, freq=target_freq)

    metrics_csv = OUTPUT_BASE / f"{freq_label.lower()}_metrics.csv"
    metrics.to_csv(metrics_csv, index_label=proposal_series.index.name)

    chart_path = OUTPUT_BASE / "metrics_time_series.png"
    plot_time_series(metrics, chart_path, freq_label)

    print(f"Saved {freq_label.lower()} dataset to {metrics_csv}")
    print(f"Time series comparison: {chart_path}")


if __name__ == "__main__":
    main()
