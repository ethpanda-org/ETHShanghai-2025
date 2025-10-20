import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[0]
SRC = ROOT / "src"
if SRC.exists():
    sys.path.insert(0, str(SRC))

from config import settings  # type: ignore
from polymarket.data.facade import DataIngestionFacade  # type: ignore
import asyncio


async def main():
    settings.OFFLINE_MODE = False
    facade = DataIngestionFacade(use_graphql=False, ttl_seconds=0, limit=5)
    try:
        markets = await facade.get_markets(force_refresh=True)
        print('markets len', len(markets))
        if markets:
            print('first market keys', list(markets[0].raw.keys())[:10])
    except Exception as exc:
        print('error', repr(exc))


asyncio.run(main())
