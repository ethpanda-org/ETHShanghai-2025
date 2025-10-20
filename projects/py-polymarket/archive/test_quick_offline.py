#!/usr/bin/env python3
"""
快速测试离线模式数据获取
"""

import asyncio
from enhanced_simulation_trading import EnhancedPolymarketDataFetcher

async def quick_offline_test():
    """快速测试离线模式数据获取"""
    print("=== Quick Offline Data Test ===")
    
    try:
        async with EnhancedPolymarketDataFetcher(use_proxy=False, offline_mode=True) as fetcher:
            print("[TEST] Fetcher initialized in offline mode")
            
            markets = await fetcher.fetch_active_markets(limit=3)
            
            if markets:
                print(f"[SUCCESS] Got {len(markets)} mock markets:")
                for i, market in enumerate(markets):
                    print(f"  {i+1}. {market['title'][:50]}")
                    print(f"     Price: {market.get('price', 'N/A')}")
                    print(f"     Volume: ${market.get('volume', 0):,.0f}")
                    print(f"     Category: {market.get('category', 'N/A')}")
                    print()
                return True
            else:
                print("[FAIL] No markets retrieved")
                return False
                
    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(quick_offline_test())
    if result:
        print("[SUCCESS] Offline mode data fetching works!")
    else:
        print("[FAIL] Offline mode test failed")