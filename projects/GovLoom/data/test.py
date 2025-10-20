import requests
import csv
from datetime import datetime

def fetch_frax_revenue_history():
    url = "https://api.llama.fi/summary/revenue/frax-finance?dataType=daily"
    resp = requests.get(url)
    if resp.status_code != 200:
        raise Exception(f"请求失败: {resp.status_code} {resp.text}")
    data = resp.json()
    revenue = data.get("totalDataChart", [])
    return revenue

def save_revenue_to_csv(revenue, filename="frax_revenue_history.csv"):
    if not revenue:
        print("⚠️ 未返回任何收入数据")
        return
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "date", "revenue_usd"])
        for item in revenue:
            ts = item[0]
            date_str = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
            revenue_usd = item[1]
            writer.writerow([ts, date_str, revenue_usd])
    print(f"✅ 已保存 Frax Finance 收入历史数据到 {filename}")

if __name__ == "__main__":
    revenue = fetch_frax_revenue_history()
    save_revenue_to_csv(revenue)