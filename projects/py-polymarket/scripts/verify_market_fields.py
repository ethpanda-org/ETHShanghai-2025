import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
paths = [str(ROOT), str(ROOT / 'src')]
for p in reversed(paths):
    if p not in sys.path:
        sys.path.insert(0, p)

from polymarket.data import DataIngestionFacade


def summarize_missing(markets):
    missing_bid = []
    missing_ask = []
    missing_vol = []
    for ticker in markets:
        if ticker.bid is None:
            missing_bid.append(ticker.market_id)
        if ticker.ask is None:
            missing_ask.append(ticker.market_id)
        if ticker.volatility is None:
            missing_vol.append(ticker.market_id)
    return missing_bid, missing_ask, missing_vol


async def main() -> None:
    facade = DataIngestionFacade()
    markets = await facade.get_markets(force_refresh=True)
    missing_bid, missing_ask, missing_vol = summarize_missing(markets)
    print(f"markets fetched: {len(markets)}")
    print(f"missing bid: {len(missing_bid)}")
    print(f"missing ask: {len(missing_ask)}")
    print(f"missing volatility: {len(missing_vol)}")
    if missing_bid:
        print("sample missing bid:", missing_bid[:5])
    if missing_ask:
        print("sample missing ask:", missing_ask[:5])
    if missing_vol:
        print("sample missing volatility:", missing_vol[:5])


if __name__ == "__main__":
    asyncio.run(main())


