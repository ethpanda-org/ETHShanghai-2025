# import requests, json, sys

# API_KEY = "e1db8b15-f9e8-4cb3-80c5-ee5a164ac16d"
# symbol = "FRX"

# url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/market-pairs/latest"
# params = {"symbol": symbol, "limit": 50}
# headers = {"X-CMC_PRO_API_KEY": API_KEY}

# resp = requests.get(url, headers=headers, params=params)
# data = resp.json()

# # The API omits the "data" field when it returns an error payload, so fail gracefully.
# payload = data.get("data", {})
# pairs = payload.get("market_pairs")
# if not pairs:
#     status = data.get("status", {})
#     error_msg = status.get("error_message") or f"unexpected response: {json.dumps(data)}"
#     print(f"API 请求失败：{error_msg}")
#     sys.exit(1)

# print(f"{symbol} 当前在 {len(pairs)} 个 CEX 交易对上架：\n")
# for p in pairs[:10]:
#     ex = p["exchange"]["name"]
#     base = p["market_pair_base"]["currency_symbol"]
#     quote = p["market_pair_quote"]["currency_symbol"]
#     price = p["quote"]["USD"]["price"]
#     vol = p["quote"]["USD"]["volume_24h"]
#     print(f"{ex:15} | {base}/{quote:8} | Price: ${price:.3f} | 24h Vol: ${vol:,.0f}")


import requests

coin_id = "frax-share"  # CoinGecko 的 ID
url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/tickers"

resp = requests.get(url)
data = resp.json()

tickers = data["tickers"]
# Order by reported volume (descending) and take the top 15.
sorted_tickers = sorted(
    tickers, key=lambda t: t.get("volume") or 0, reverse=True
)

print(f"{coin_id} 当前在 {len(tickers)} 个交易对上架，以下为成交量最高的 15 个：\n")
for t in sorted_tickers[:20]:
    market = t["market"]["name"]
    pair = t["base"] + "/" + t["target"]
    price = t["last"]
    vol = t["volume"]
    print(f"{market:15} | {pair:10} | Price: ${price:.3f} | Vol: ${vol:,.0f}")
