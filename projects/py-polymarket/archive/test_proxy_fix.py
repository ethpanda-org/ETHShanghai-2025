#!/usr/bin/env python3
"""
测试代理异步上下文管理器修复
"""

import asyncio
from enhanced_simulation_trading import EnhancedPolymarketDataFetcher

async def test_proxy_fix():
    """测试修复后的代理功能"""
    print("=== Testing Async Context Manager Fix ===")
    print("Testing proxy connection...")
    
    try:
        async with EnhancedPolymarketDataFetcher(use_proxy=True) as fetcher:
            print("[PASS] Async context manager working")
            print("Fetching market data...")
            
            markets = await fetcher.fetch_active_markets(limit=3)
            
            if markets:
                print(f"[PASS] Successfully got {len(markets)} markets")
                for i, market in enumerate(markets[:2]):
                    print(f"  Market {i+1}: {market.get('title', 'N/A')[:50]}")
                    print(f"          Price: {market.get('price', 'N/A')}")
                    print(f"          Volume: ${market.get('volume', 0):,.0f}")
                return True
            else:
                print("[FAIL] No market data retrieved")
                return False
                
    except Exception as e:
        print(f"[FAIL] Test failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_proxy_fix())
    if result:
        print("\n[SUCCESS] Fix successful! Ready for simulation")
    else:
        print("\n[DEBUG] Needs further debugging")