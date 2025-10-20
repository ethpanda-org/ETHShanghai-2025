#!/usr/bin/env python3
"""
代理连接诊断测试
"""

import asyncio
import aiohttp
import time
from proxy_config import ProxySession, ProxyManager

async def test_direct_connection():
    """测试直接连接（不使用代理）"""
    print("=== Testing Direct Connection ===")
    
    try:
        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            url = "https://clob.polymarket.com/markets"
            params = {"limit": 1}
            
            print(f"Testing: {url}")
            async with session.get(url, params=params) as response:
                print(f"[DIRECT] Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print(f"[DIRECT] Got {len(data.get('data', []))} markets")
                    return True
                else:
                    print(f"[DIRECT] Failed with status: {response.status}")
                    return False
                    
    except Exception as e:
        print(f"[DIRECT] Connection failed: {e}")
        print(f"[DIRECT] Error type: {type(e).__name__}")
        return False

async def test_proxy_connection():
    """测试代理连接"""
    print("\n=== Testing Proxy Connection ===")
    
    try:
        proxy_manager = ProxyManager()
        proxy_config = proxy_manager.get_random_proxy()
        
        if not proxy_config:
            print("[PROXY] No proxy configuration found")
            return False
            
        proxy_url = proxy_config.get('http')
        print(f"[PROXY] Using: {proxy_url}")
        
        timeout = aiohttp.ClientTimeout(total=30, connect=15)
        connector = aiohttp.TCPConnector(limit=10)
        
        async with aiohttp.ClientSession(
            connector=connector, 
            timeout=timeout
        ) as session:
            url = "https://clob.polymarket.com/markets"
            params = {"limit": 1}
            
            print(f"[PROXY] Testing: {url}")
            async with session.get(url, params=params, proxy=proxy_url) as response:
                print(f"[PROXY] Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print(f"[PROXY] Got {len(data.get('data', []))} markets")
                    return True
                else:
                    print(f"[PROXY] Failed with status: {response.status}")
                    return False
                    
    except Exception as e:
        print(f"[PROXY] Connection failed: {e}")
        print(f"[PROXY] Error type: {type(e).__name__}")
        return False

async def test_proxy_session():
    """测试ProxySession类"""
    print("\n=== Testing ProxySession Class ===")
    
    try:
        async with ProxySession(use_proxy=True) as session:
            print("[SESSION] ProxySession initialized successfully")
            
            url = "https://clob.polymarket.com/markets"
            params = {"limit": 1}
            
            print(f"[SESSION] Testing: {url}")
            response = await session.get(url, params=params)
            print(f"[SESSION] Status: {response.status}")
            
            if response.status == 200:
                data = await response.json()
                print(f"[SESSION] Got {len(data.get('data', []))} markets")
                return True
            else:
                print(f"[SESSION] Failed with status: {response.status}")
                return False
                
    except Exception as e:
        print(f"[SESSION] Connection failed: {e}")
        print(f"[SESSION] Error type: {type(e).__name__}")
        return False

async def test_simple_http():
    """测试简单HTTP连接"""
    print("\n=== Testing Simple HTTP ===")
    
    try:
        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # 测试简单的HTTP请求
            url = "https://httpbin.org/get"
            
            print(f"[HTTP] Testing: {url}")
            async with session.get(url) as response:
                print(f"[HTTP] Status: {response.status}")
                if response.status == 200:
                    print("[HTTP] Simple HTTP connection works")
                    return True
                else:
                    print(f"[HTTP] Failed with status: {response.status}")
                    return False
                    
    except Exception as e:
        print(f"[HTTP] Connection failed: {e}")
        print(f"[HTTP] Error type: {type(e).__name__}")
        return False

async def comprehensive_diagnosis():
    """综合诊断"""
    print("=" * 50)
    print("COMPREHENSIVE PROXY DIAGNOSIS")
    print("=" * 50)
    
    results = {}
    
    # 1. 测试简单HTTP
    results['simple_http'] = await test_simple_http()
    
    # 2. 测试直接连接
    results['direct_connection'] = await test_direct_connection()
    
    # 3. 测试代理连接
    results['proxy_connection'] = await test_proxy_connection()
    
    # 4. 测试ProxySession
    results['proxy_session'] = await test_proxy_session()
    
    # 总结
    print("\n" + "=" * 50)
    print("DIAGNOSIS SUMMARY")
    print("=" * 50)
    
    for test_name, result in results.items():
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} {test_name}")
    
    # 给出建议
    print("\n" + "=" * 50)
    print("RECOMMENDATIONS")
    print("=" * 50)
    
    if not results['simple_http']:
        print("- Network connection issue. Check internet connectivity.")
    elif not results['direct_connection']:
        print("- Polymarket API might be blocked or rate-limited.")
        print("- Try using a VPN or proxy.")
    elif not results['proxy_connection']:
        print("- Proxy configuration issue.")
        print("- Check proxy credentials and server availability.")
    elif not results['proxy_session']:
        print("- ProxySession implementation issue.")
        print("- Check async context manager implementation.")
    else:
        print("- All tests passed! System should work correctly.")
    
    return results

if __name__ == "__main__":
    asyncio.run(comprehensive_diagnosis())