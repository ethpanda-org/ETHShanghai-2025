import csv
from collections import defaultdict
from datetime import datetime
from typing import Dict, Iterable, List, Optional

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


def _tokens_sum(entry: Dict) -> Optional[float]:
    tokens = entry.get("tokens")
    if not isinstance(tokens, dict):
        return None
    total = 0.0
    seen = False
    for val in tokens.values():
        num = _to_float(val)
        if num is None:
            continue
        seen = True
        total += num
    return total if seen else None


def _build_chain_totals(chain_info: Dict) -> Dict[int, float]:
    totals: Dict[int, float] = {}
    tvl_history: Iterable = chain_info.get("tvl") or []
    tokens_usd: Iterable = chain_info.get("tokensInUsd") or []

    # Index token-based USD totals by timestamp for fallback when tvl entry misses the number.
    token_totals_by_ts: Dict[int, float] = {}
    for entry in tokens_usd:
        if not isinstance(entry, dict):
            continue
        ts = entry.get("date") or entry.get("timestamp")
        if ts is None:
            continue
        tokens_total = _tokens_sum(entry)
        if tokens_total is None:
            continue
        token_totals_by_ts[int(ts)] = tokens_total

    for entry in tvl_history:
        if not isinstance(entry, dict):
            continue
        ts = entry.get("date") or entry.get("timestamp")
        if ts is None:
            continue
        ts = int(ts)
        usd_val = _to_float(entry.get("totalLiquidityUSD"))
        if usd_val is None:
            usd_val = token_totals_by_ts.get(ts)
        if usd_val is None:
            continue
        totals[ts] = usd_val

    # Some payloads only expose tokensInUsd; add missing timestamps from there.
    for ts, usd_val in token_totals_by_ts.items():
        totals.setdefault(ts, usd_val)

    return totals


def fetch_frax_treasury_history(slug: str = "frax-finance") -> List[Dict]:
    url = f"https://api.llama.fi/treasury/{slug}"
    resp = requests.get(url)
    if resp.status_code != 200:
        raise Exception(f"请求失败: {resp.status_code} {resp.text}")
    data = resp.json()

    chain_tvls = data.get("chainTvls")
    if not isinstance(chain_tvls, dict) or not chain_tvls:
        raise ValueError("响应中缺少 chainTvls 字段，无法计算 Treasury 数据。")

    aggregated: Dict[int, float] = defaultdict(float)
    for key, info in chain_tvls.items():
        if not isinstance(info, dict):
            continue
        # 跳过总汇总字段，避免与具体链数据重复。
        if isinstance(key, str) and key.lower() == "owntokens":
            continue
        for ts, usd_val in _build_chain_totals(info).items():
            aggregated[ts] += usd_val

    if not aggregated:
        raise ValueError("未能从响应中解析到任何 Treasury 总额数据。")

    return [
        {"date": ts, "totalLiquidityUSD": total}
        for ts, total in sorted(aggregated.items())
    ]


def save_tvl_to_csv(tvl_data: List[Dict], filename: str = "frax_treasury_history.csv") -> None:
    if not tvl_data:
        print("⚠️ 没有发现历史数据，请检查结构")
        return
    with open(filename, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "date", "total_liquidity_usd"])
        for record in tvl_data:
            ts = int(record["date"])
            date_str = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
            tvl = record["totalLiquidityUSD"]
            writer.writerow([ts, date_str, tvl])
    print(f"✅ 已保存 {filename}（共 {len(tvl_data)} 条记录）")


def sample_weekly(records: List[Dict]) -> List[Dict]:
    seen = set()
    weekly = []
    for record in sorted(records, key=lambda r: r["date"]):
        ts = int(record["date"])
        week = datetime.utcfromtimestamp(ts).isocalendar()[:2]
        if week in seen:
            continue
        seen.add(week)
        weekly.append(record)
    return weekly


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="下载指定协议的 Treasury 历史数据")
    parser.add_argument("--slug", default="frax-finance", help="协议 slug（默认：uniswap）")
    parser.add_argument("--start", type=int, help="起始时间戳（秒）")
    parser.add_argument("--end", type=int, help="结束时间戳（秒）")
    parser.add_argument("--weekly", action="store_true", help="按周抽样，仅保留每周的一条记录")
    args = parser.parse_args()

    history = fetch_frax_treasury_history(args.slug)
    if args.start is not None or args.end is not None:
        start_ts = args.start if args.start is not None else float("-inf")
        end_ts = args.end if args.end is not None else float("inf")
        history = [
            item for item in history if start_ts <= int(item["date"]) <= end_ts
        ]

    if args.weekly:
        history = sample_weekly(history)

    output_file = f"{args.slug}_treasury_history.csv"
    save_tvl_to_csv(history, output_file)
