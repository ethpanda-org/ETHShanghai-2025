#!/usr/bin/env python3
"""
测试SSL修复后的连接
"""

import asyncio
import aiohttp
from proxy_config import ProxySession

async def test_ssl_fix():
    """测试SSL修复后的连接"""
    print("=== Testing SSL Fix ===")
    
    try:
        async with ProxySession(use_proxy=True) as session:
            print("[SSL-FIX] ProxySession initialized")
            
            url = "https://clob.polymarket.com/markets"
            params = {"limit": 1}
            
            print(f"[SSL-FIX] Testing: {url}")
            response = await session.get(url, params=params)
            print(f"[SSL-FIX] Status: {response.status}")
            
            if response.status == 200:
                data = await response.json()
                print(f"[SSL-FIX] Success! Got {len(data.get('data', []))} markets")
                
                # 显示第一个市场信息
                if data.get('data'):
                    market = data['data'][0]
                    print(f"[SSL-FIX] Sample market: {market.get('question', 'N/A')[:50]}")
                
                return True
            else:
                print(f"[SSL-FIX] Failed with status: {response.status}")
                text = await response.text()
                print(f"[SSL-FIX] Response: {text[:200]}")
                return False
                
    except Exception as e:
        print(f"[SSL-FIX] Failed: {e}")
        print(f"[SSL-FIX] Error type: {type(e).__name__}")
        return False

async def test_direct_ssl_fix():
    """测试直连SSL修复"""
    print("\n=== Testing Direct Connection with SSL Fix ===")
    
    try:
        connector = aiohttp.TCPConnector(ssl=False)
        timeout = aiohttp.ClientTimeout(total=15)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            url = "https://clob.polymarket.com/markets"
            params = {"limit": 1}
            
            print(f"[DIRECT-SSL] Testing: {url}")
            async with session.get(url, params=params) as response:
                print(f"[DIRECT-SSL] Status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"[DIRECT-SSL] Success! Got {len(data.get('data', []))} markets")
                    return True
                else:
                    print(f"[DIRECT-SSL] Failed with status: {response.status}")
                    return False
                    
    except Exception as e:
        print(f"[DIRECT-SSL] Failed: {e}")
        print(f"[DIRECT-SSL] Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    async def main():
        print("=" * 50)
        print("SSL FIX TESTING")
        print("=" * 50)
        
        # 测试直连SSL修复
        direct_result = await test_direct_ssl_fix()
        
        # 测试代理SSL修复
        proxy_result = await test_ssl_fix()
        
        print("\n" + "=" * 50)
        print("RESULTS")
        print("=" * 50)
        
        print(f"Direct SSL Fix: {'PASS' if direct_result else 'FAIL'}")
        print(f"Proxy SSL Fix: {'PASS' if proxy_result else 'FAIL'}")
        
        if direct_result or proxy_result:
            print("\n[SUCCESS] SSL fix worked! Ready to run simulation")
            return True
        else:
            print("\n[FAIL] SSL fix didn't resolve the issue")
            return False
    
    asyncio.run(main())