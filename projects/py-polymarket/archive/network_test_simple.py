#!/usr/bin/env python3
"""
简化网络连接诊断工具
"""

import asyncio
import aiohttp
import time
from datetime import datetime

async def test_network_simple():
    """简化网络连接测试"""
    print("=" * 60)
    print("网络连接诊断")
    print("=" * 60)
    print(f"测试时间: {datetime.now().strftime('%H:%M:%S')}")
    print()
    
    # 测试目标
    test_targets = [
        ("Google DNS", "https://8.8.8.8"),
        ("HTTP服务", "https://httpbin.org/ip"),
        ("GitHub API", "https://api.github.com"),
        ("Polymarket", "https://clob.polymarket.com/ping"),
    ]
    
    results = []
    
    for name, url in test_targets:
        print(f"[TEST] {name}...")
        
        try:
            timeout = aiohttp.ClientTimeout(total=5)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                start = time.time()
                response = await session.get(url)
                duration = (time.time() - start) * 1000
                
                if response.status == 200:
                    print(f"  [OK] 成功 - {duration:.0f}ms")
                    results.append(("SUCCESS", name, response.status, duration))
                else:
                    print(f"  [WARN] 状态码{response.status} - {duration:.0f}ms")
                    results.append(("WARNING", name, response.status, duration))
                
                response.close()
                
        except asyncio.TimeoutError:
            print(f"  [ERROR] 连接超时")
            results.append(("TIMEOUT", name, 0, 0))
            
        except Exception as e:
            print(f"  [ERROR] 连接失败: {str(e)[:50]}")
            results.append(("ERROR", name, 0, 0))
        
        await asyncio.sleep(0.5)
    
    # 测试代理
    print(f"\n[PROXY] 测试代理连接...")
    try:
        from proxy_config import FixedProxySession
        
        async with FixedProxySession(use_proxy=True) as session:
            start = time.time()
            response = await session.get("https://geo.brdtest.com/mygeo.json")
            duration = (time.time() - start) * 1000
            
            if response.status == 200:
                data = await response.json()
                print(f"  [OK] 代理成功 - IP:{data.get('ip', 'unknown')}")
                results.append(("SUCCESS", "代理服务", response.status, duration))
            else:
                print(f"  [WARN] 代理状态码{response.status}")
                results.append(("WARNING", "代理服务", response.status, duration))
            
            response.close()
            
    except Exception as e:
        print(f"  [ERROR] 代理失败: {str(e)[:50]}")
        results.append(("ERROR", "代理服务", 0, 0))
    
    # 总结
    print("\n" + "=" * 60)
    print("诊断结果总结")
    print("=" * 60)
    
    success_count = sum(1 for r in results if r[0] == "SUCCESS")
    total_count = len(results)
    
    print(f"总测试: {total_count}")
    print(f"成功: {success_count}")
    print(f"成功率: {success_count/total_count*100:.1f}%")
    
    if success_count >= 3:
        recommendation = "ONLINE"
        print(f"\n[建议] 网络状况良好，可以使用在线模式")
    elif success_count >= 1:
        recommendation = "MIXED"
        print(f"\n[建议] 网络状况一般，谨慎使用在线模式")
    else:
        recommendation = "OFFLINE"
        print(f"\n[建议] 网络状况较差，建议继续离线模式")
    
    print(f"\n详细结果:")
    for status, name, code, duration in results:
        print(f"  {status:8} | {name:12} | {code:3} | {duration:6.0f}ms")
    
    return recommendation

if __name__ == "__main__":
    result = asyncio.run(test_network_simple())
    print(f"\n最终建议: {result}")