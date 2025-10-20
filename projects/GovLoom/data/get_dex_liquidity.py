import requests
import json

def get_dex_liquidity_by_name(name: str):
    url = f"https://api.dexscreener.io/latest/dex/search?q={name}"
    resp = requests.get(url)
    if resp.status_code != 200:
        print("请求失败：", resp.status_code)
        return
    
    data = resp.json()
    pairs = data.get("pairs", [])
    print(f"\n🔍 共找到 {len(pairs)} 个交易对与 {name.upper()} 相关：\n")

    # 汇总每条交易对信息
    results = []
    for p in pairs:
        chain = p.get("chainId")
        dex = p.get("dexId")
        base = p["baseToken"]["symbol"]
        quote = p["quoteToken"]["symbol"]
        liq = p["liquidity"]["usd"]
        vol = p["volume"]["h24"]
        pair_addr = p.get("pairAddress")
        results.append((chain, dex, base, quote, liq, vol, pair_addr))

    # 按流动性排序
    results.sort(key=lambda x: x[4], reverse=True)

    for (chain, dex, base, quote, liq, vol, addr) in results[:20]:
        print(f"[{chain:10}] {dex:15} | {base}/{quote:10} | "
              f"Liquidity: ${liq:,.0f} | Vol 24h: ${vol:,.0f} | Pair: {addr}")

if __name__ == "__main__":
    get_dex_liquidity_by_name("fxs")  # 例如查 “pepe”