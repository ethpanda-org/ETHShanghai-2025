import argparse
import csv
import time
from datetime import datetime
import requests

def fetch_protocol_tvl(slug, start_ts=None, end_ts=None):
    url = f"https://api.llama.fi/protocol/{slug}"
    start_bound = int(start_ts) if start_ts is not None else None
    end_bound = int(end_ts) if end_ts is not None else None
    params = {}
    if start_bound is not None:
        params["start"] = start_bound
    if end_bound is not None:
        params["end"] = end_bound
    resp = requests.get(url, params=params or None)
    if resp.status_code != 200:
        raise Exception(f"请求失败：{resp.status_code}")
    data = resp.json()
    tvl_history = data.get("tvl", [])
    if start_bound is not None or end_bound is not None:
        filtered = []
        for item in tvl_history:
            ts = int(item["date"])
            if start_bound is not None and ts < start_bound:
                continue
            if end_bound is not None and ts > end_bound:
                continue
            filtered.append(item)
        tvl_history = filtered
        data["tvl"] = tvl_history
    return data

def sample_weekly(tvl_history):
    seen_weeks = set()
    weekly = []
    for item in sorted(tvl_history, key=lambda i: i["date"]):
        ts = int(item["date"])
        dt = datetime.utcfromtimestamp(ts)
        week_key = (dt.isocalendar().year, dt.isocalendar().week)
        if week_key in seen_weeks:
            continue
        seen_weeks.add(week_key)
        weekly.append(item)
    return weekly

def save_tvl_to_csv(tvl_history, filename="tvl_history.csv"):
    with open(filename, mode='w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "date", "tvl_usd"])
        for item in tvl_history:
            ts = int(item["date"])   # 时间戳 (秒)
            tvl = item["totalLiquidityUSD"]
            writer.writerow([ts, time.strftime("%Y-%m-%d", time.gmtime(ts)), tvl])

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="下载指定协议的 TVL 历史数据")
    parser.add_argument("--slug", default="frax-finance", help="协议 slug（默认：uniswap）")
    parser.add_argument("--start", type=int, help="起始时间戳（秒）")
    parser.add_argument("--end", type=int, help="结束时间戳（秒）")
    parser.add_argument("--weekly", action="store_true", help="按周抽样，仅保留每周的一条记录")
    args = parser.parse_args()

    info = fetch_protocol_tvl(args.slug, args.start, args.end)
    tvl_history = info.get("tvl", [])
    if args.weekly:
        tvl_history = sample_weekly(tvl_history)

    if tvl_history:
        output_file = f"{args.slug}_tvl.csv"
        save_tvl_to_csv(tvl_history, output_file)
        print(f"已保存 {args.slug} 的 TVL 数据至 {output_file}，共 {len(tvl_history)} 条记录")
    else:
        print("未找到 tvl 数据字段，请检查协议 slug 是否正确。")
