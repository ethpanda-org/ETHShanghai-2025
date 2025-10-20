#!/usr/bin/env python3
"""
网络连接诊断工具
"""

import asyncio
import aiohttp
import time
from datetime import datetime

async def test_network_connectivity():
    """全面测试网络连接"""
    print("=" * 80)
    print("网络连接诊断工具")
    print("=" * 80)
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 测试目标
    test_targets = [
        {"name": "Google DNS", "url": "https://8.8.8.8"},
        {"name": "HTTP检测服务", "url": "https://httpbin.org/ip"},
        {"name": "Polymarket API", "url": "https://clob.polymarket.com/ping"},
        {"name": "GitHub", "url": "https://api.github.com"},
    ]
    
    results = {}
    
    for target in test_targets:
        print(f"[TEST] 测试连接: {target['name']}")
        
        try:
            start_time = time.time()
            timeout = aiohttp.ClientTimeout(total=10)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                response = await session.get(target['url'])
                end_time = time.time()
                
                latency = (end_time - start_time) * 1000
                
                if response.status == 200:
                    print(f"  ✅ 成功 - 状态码: {response.status}, 延迟: {latency:.0f}ms")
                    results[target['name']] = {"status": "success", "latency": latency, "code": response.status}
                else:
                    print(f"  ⚠️  异常 - 状态码: {response.status}, 延迟: {latency:.0f}ms")
                    results[target['name']] = {"status": "warning", "latency": latency, "code": response.status}
                
                response.close()
                
        except asyncio.TimeoutError:
            print(f"  ❌ 超时 - 连接超过10秒")
            results[target['name']] = {"status": "timeout", "error": "timeout"}
            
        except Exception as e:
            print(f"  ❌ 错误 - {str(e)}")
            results[target['name']] = {"status": "error", "error": str(e)}
        
        await asyncio.sleep(1)  # 间隔1秒避免频繁请求
    
    # 测试代理连接
    print("\n[PROXY] 测试代理连接...")
    try:
        from proxy_config import FixedProxySession
        
        async with FixedProxySession(use_proxy=True) as session:
            start_time = time.time()
            response = await session.get("https://geo.brdtest.com/mygeo.json")
            end_time = time.time()
            
            latency = (end_time - start_time) * 1000
            
            if response.status == 200:
                data = await response.json()
                print(f"  ✅ 代理成功 - IP: {data.get('ip', 'unknown')}, 国家: {data.get('country', 'unknown')}, 延迟: {latency:.0f}ms")
                results['Bright Data Proxy'] = {"status": "success", "latency": latency, "ip": data.get('ip')}
            else:
                print(f"  ⚠️  代理异常 - 状态码: {response.status}")
                results['Bright Data Proxy'] = {"status": "warning", "code": response.status}
            
            response.close()
            
    except Exception as e:
        print(f"  ❌ 代理错误 - {str(e)}")
        results['Bright Data Proxy'] = {"status": "error", "error": str(e)}
    
    # 总结
    print("\n" + "=" * 80)
    print("网络诊断总结")
    print("=" * 80)
    
    success_count = sum(1 for r in results.values() if r['status'] == 'success')
    total_count = len(results)
    
    print(f"总测试目标: {total_count}")
    print(f"成功连接: {success_count}")
    print(f"连接成功率: {success_count/total_count*100:.1f}%")
    
    if success_count == total_count:
        print("\n🎉 网络连接完全正常，可以使用在线模式")
        recommendation = "online"
    elif success_count >= total_count // 2:
        print("\n⚠️  网络连接部分正常，建议谨慎使用在线模式")
        recommendation = "mixed"
    else:
        print("\n❌ 网络连接存在问题，建议继续使用离线模式")
        recommendation = "offline"
    
    # 详细结果
    print("\n详细结果:")
    for name, result in results.items():
        status_icon = "✅" if result['status'] == 'success' else "⚠️" if result['status'] == 'warning' else "❌"
        print(f"  {status_icon} {name}: {result}")
    
    return recommendation

if __name__ == "__main__":
    asyncio.run(test_network_connectivity())