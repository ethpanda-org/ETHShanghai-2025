import argparse
import csv
from collections import defaultdict
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Tuple

import requests


def _to_float(value: object) -> Optional[float]:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _parse_chart(chart: Iterable) -> Dict[int, float]:
    results: Dict[int, float] = {}
    if not isinstance(chart, Iterable):
        return results
    for entry in chart:
        if not isinstance(entry, (list, tuple)) or len(entry) < 2:
            continue
        ts = entry[0]
        value = _to_float(entry[1])
        if value is None:
            continue
        if isinstance(ts, (int, float)):
            ts_int = int(ts)
        else:
            try:
                ts_int = int(ts)
            except (TypeError, ValueError):
                continue
        results[ts_int] = value
    return results


def _parse_breakdown(breakdown: Iterable) -> Dict[int, Dict[str, float]]:
    breakdown_by_version: Dict[int, Dict[str, float]] = {}
    if not isinstance(breakdown, Iterable):
        return breakdown_by_version
    for entry in breakdown:
        if not isinstance(entry, (list, tuple)) or len(entry) < 2:
            continue
        ts = entry[0]
        raw = entry[1]
        if isinstance(ts, (int, float)):
            ts_int = int(ts)
        else:
            try:
                ts_int = int(ts)
            except (TypeError, ValueError):
                continue
        if not isinstance(raw, dict):
            continue
        version_totals: Dict[str, float] = defaultdict(float)
        for chain_payload in raw.values():
            if not isinstance(chain_payload, dict):
                continue
            for version, value in chain_payload.items():
                usd_val = _to_float(value)
                if usd_val is None:
                    continue
                version_totals[str(version)] += usd_val
        if version_totals:
            breakdown_by_version[ts_int] = dict(version_totals)
    return breakdown_by_version


def _fetch_summary(slug: str, data_type: str) -> Dict:
    base_url = f"https://api.llama.fi/summary/fees/{slug}"
    params = {"dataType": data_type} if data_type != "fees" else None
    resp = requests.get(base_url, params=params)
    if resp.status_code in (404, 500):
        return {}
    resp.raise_for_status()
    return resp.json()


def fetch_protocol_fees_and_revenue(
    slug: str,
) -> Tuple[Dict[int, float], Dict[int, float], Dict[int, Dict[str, float]]]:
    fees_summary = _fetch_summary(slug, "fees")
    revenue_summary = _fetch_summary(slug, "revenue")

    fees_chart = _parse_chart(fees_summary.get("totalDataChart"))

    revenue_chart: Dict[int, float] = {}
    if revenue_summary:
        revenue_chart = _parse_chart(revenue_summary.get("totalDataChart"))
    if not revenue_chart:
        revenue_chart = _parse_chart(fees_summary.get("totalRevenueChart"))

    breakdown_chart = _parse_breakdown(fees_summary.get("totalDataChartBreakdown"))

    return fees_chart, revenue_chart, breakdown_chart


def _filter_by_range(
    data: List[Dict], start_ts: Optional[int], end_ts: Optional[int], ts_key: str = "timestamp"
) -> List[Dict]:
    if start_ts is None and end_ts is None:
        return data
    start_bound = start_ts if start_ts is not None else float("-inf")
    end_bound = end_ts if end_ts is not None else float("inf")
    return [
        item
        for item in data
        if start_bound <= int(item[ts_key]) <= end_bound
    ]


def sample_weekly(records: List[Dict], ts_key: str = "timestamp") -> List[Dict]:
    seen = set()
    sampled = []
    for record in sorted(records, key=lambda r: r[ts_key]):
        ts = int(record[ts_key])
        week = datetime.utcfromtimestamp(ts).isocalendar()[:2]
        if week in seen:
            continue
        seen.add(week)
        sampled.append(record)
    return sampled


def save_totals_csv(rows: List[Dict], filename: str) -> None:
    with open(filename, mode="w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["timestamp", "date", "fees_usd", "revenue_usd", "total_usd"])
        for row in rows:
            ts = int(row["timestamp"])
            date_str = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
            writer.writerow(
                [
                    ts,
                    date_str,
                    row["fees_usd"],
                    row["revenue_usd"],
                    row["total_usd"],
                ]
            )


def save_version_breakdown_csv(rows: List[Dict], filename: str) -> None:
    with open(filename, mode="w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["timestamp", "date", "version", "fees_usd"])
        for row in rows:
            ts = int(row["timestamp"])
            date_str = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
            writer.writerow(
                [
                    ts,
                    date_str,
                    row["version"],
                    row["fees_usd"],
                ]
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="下载协议的 Fees & Revenue 历史数据")
    parser.add_argument("--slug", default="frax-finance", help="协议 slug（默认：frax-finance）")
    parser.add_argument("--start", type=int, help="起始时间戳（秒）")
    parser.add_argument("--end", type=int, help="结束时间戳（秒）")
    parser.add_argument("--weekly", action="store_true", help="按周抽样，仅保留每周的一条记录")
    args = parser.parse_args()

    fees_chart, revenue_chart, breakdown_chart = fetch_protocol_fees_and_revenue(args.slug)

    all_timestamps = sorted(set(fees_chart) | set(revenue_chart))
    totals_rows = [
        {
            "timestamp": ts,
            "fees_usd": round(fees_chart.get(ts, 0.0), 6),
            "revenue_usd": round(revenue_chart.get(ts, 0.0), 6),
            "total_usd": round(fees_chart.get(ts, 0.0) + revenue_chart.get(ts, 0.0), 6),
        }
        for ts in all_timestamps
    ]

    totals_rows = _filter_by_range(totals_rows, args.start, args.end)

    if args.weekly:
        totals_rows = sample_weekly(totals_rows)

    kept_ts = {int(row["timestamp"]) for row in totals_rows}

    version_rows: List[Dict] = []
    for ts, version_totals in breakdown_chart.items():
        if kept_ts and ts not in kept_ts:
            continue
        if args.start is not None and ts < args.start:
            continue
        if args.end is not None and ts > args.end:
            continue
        for version, value in version_totals.items():
            version_rows.append(
                {
                    "timestamp": ts,
                    "version": version,
                    "fees_usd": round(value, 6),
                }
            )

    totals_filename = f"{args.slug}_fees_revenue.csv"
    version_filename = f"{args.slug}_fees_by_version.csv"

    save_totals_csv(totals_rows, totals_filename)
    save_version_breakdown_csv(version_rows, version_filename)

    print(
        f"✅ 已保存 {args.slug} 的 Fees & Revenue 数据至 {totals_filename}，以及按版本划分的费用至 {version_filename}"
    )
