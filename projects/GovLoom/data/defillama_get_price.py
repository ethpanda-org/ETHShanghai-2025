import argparse
import requests
import csv
from datetime import datetime, timedelta, timezone
import time

CHAIN = "ethereum"
FRAX_ADDRESS = "0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0"

def date_to_timestamp(date_str):
    """YYYY-MM-DD 转换为 UNIX 秒时间戳"""
    return int(datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp())

def fetch_price_at_timestamp(chain, address, ts):
    """获取指定时间戳的 Frax 价格"""
    url = f"https://coins.llama.fi/prices/historical/{ts}/{chain}:{address}"
    resp = requests.get(url)
    if resp.status_code != 200:
        print(f"⚠️ 请求失败 {resp.status_code}: {resp.text}")
        return None
    data = resp.json()
    coin_key = f"{chain}:{address}"
    return data.get("coins", {}).get(coin_key, {}).get("price")

def collect_price_range(chain, address, start_ts, end_ts, step=86400):
    """按天或周间隔抓取价格数据"""
    prices = []
    ts = start_ts
    while ts <= end_ts:
        price = fetch_price_at_timestamp(chain, address, ts)
        if price:
            prices.append({"timestamp": ts, "price": price})
        ts += step
        time.sleep(0.2)  # 防止速率限制
    return prices

def save_to_csv(prices, filename="frax_price_history.csv"):
    """保存为 CSV"""
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "date", "price_usd"])
        for p in prices:
            date_str = datetime.fromtimestamp(p["timestamp"], tz=timezone.utc).strftime("%Y-%m-%d")
            writer.writerow([p["timestamp"], date_str, p["price"]])
    print(f"✅ 已保存 {len(prices)} 条数据到 {filename}")

def main():
    parser = argparse.ArgumentParser(description="从 DeFiLlama 获取 Frax 历史价格")
    parser.add_argument("--slug", default="frax-finance", help="协议 slug（默认：frax-finance）")
    parser.add_argument("--start", default="2023-06-01", help="起始日期（YYYY-MM-DD）")
    parser.add_argument("--end", default=datetime.now().strftime("%Y-%m-%d"), help="结束日期（YYYY-MM-DD）")
    parser.add_argument("--weekly", action="store_true", help="按周抽样，仅保留每周一条记录")
    args = parser.parse_args()

    start_ts = date_to_timestamp(args.start)
    end_ts = date_to_timestamp(args.end)
    step = 7 * 24 * 3600 if args.weekly else 24 * 3600

    print(f"🔍 正在获取 {args.slug} 从 {args.start} 到 {args.end} 的历史价格...")

    prices = collect_price_range(CHAIN, FRAX_ADDRESS, start_ts, end_ts, step)
    if not prices:
        print("⚠️ 未获取到任何价格数据，请检查时间范围或网络。")
    else:
        save_to_csv(prices, f"{args.slug}_price_history.csv")

if __name__ == "__main__":
    main()