import asyncio, time
import sys
from pathlib import Path
sys.path.insert(0, str(Path('src').resolve()))
from polymarket.data.providers.clob_rest import ClobRestProvider

async def main():
    provider = ClobRestProvider(limit=10)
    start = time.perf_counter()
    result = await provider.fetch_markets()
    elapsed = time.perf_counter() - start
    payload = result.payload if hasattr(result, 'payload') else result
    print(f'fetch_markets: {elapsed:.2f}s, markets={len(payload)}')

asyncio.run(main())
