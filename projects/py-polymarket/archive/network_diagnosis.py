#!/usr/bin/env python3
"""
网络诊断和代理回退分析脚本
分析CLOB和GraphQL API连接问题，实现智能代理回退
"""

import asyncio
import aiohttp
import ssl
import time
from datetime import datetime

async def diagnose_network_connectivity():
    """诊断网络连接问题"""
    print("=== 网络连接诊断分析 ===")
    print()
    
    # 测试端点
    endpoints = {
        'CLOB API': 'https://clob.polymarket.com/markets',
        'GraphQL Orderbook': 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/orderbook-subgraph/0.0.1/gn',
        'GraphQL Activity': 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/activity-subgraph/0.0.4/gn',
        'Basic Connectivity': 'https://httpbin.org/ip',
        'DNS Resolution': 'https://1.1.1.1/dns-query'
    }
    
    # 创建会话
    connector = aiohttp.TCPConnector(
        limit=10,
        limit_per_host=3,
        ttl_dns_cache=300,
        force_close=True
    )
    
    timeout = aiohttp.ClientTimeout(total=15, connect=5, sock_read=8)
    
    headers = {
        'User-Agent': 'Polymarket-Diagnosis/1.0',
        'Accept': 'application/json',
        'Connection': 'close'
    }
    
    results = {}
    
    async with aiohttp.ClientSession(
        connector=connector,
        timeout=timeout,
        headers=headers
    ) as session:
        
        for name, url in endpoints.items():
            print(f"[TEST] {name}")
            start_time = time.time()
            
            try:
                if 'graphql' in url.lower():
                    # GraphQL测试查询
                    response = await session.post(url, json={
                        'query': '{ __schema { queryType { name } } }'
                    })
                else:
                    # REST API测试
                    response = await session.get(url, params={'limit': 1} if 'clob' in url else {})
                
                elapsed = time.time() - start_time
                
                if response.status == 200:
                    print(f"  [OK] 状态: {response.status}, 延迟: {elapsed:.2f}s")
                    results[name] = {'status': 'success', 'code': response.status, 'latency': elapsed}
                else:
                    print(f"  [ERROR] 状态: {response.status}, 延迟: {elapsed:.2f}s")
                    results[name] = {'status': 'http_error', 'code': response.status, 'latency': elapsed}
                    
            except asyncio.TimeoutError:
                elapsed = time.time() - start_time
                print(f"  [TIMEOUT] 连接超时: {elapsed:.2f}s")
                results[name] = {'status': 'timeout', 'code': None, 'latency': elapsed}
                
            except aiohttp.ClientError as e:
                elapsed = time.time() - start_time
                print(f"  [CONNECTION] 连接错误: {str(e)[:50]}...")
                results[name] = {'status': 'connection_error', 'code': None, 'latency': elapsed}
                
            except Exception as e:
                elapsed = time.time() - start_time
                print(f"  [ERROR] 其他错误: {str(e)[:50]}...")
                results[name] = {'status': 'other_error', 'code': None, 'latency': elapsed}
    
    return results

async def test_proxy_effectiveness():
    """测试代理是否能解决连接问题"""
    print("\n=== 代理连接效果测试 ===")
    
    # 检查是否有代理配置
    try:
        from brightdata_config import get_proxy_auth_url, get_proxy_info
        proxy_url = get_proxy_auth_url()
        proxy_info = get_proxy_info()
        print(f"[PROXY] 代理配置可用: {proxy_info['host']}:{proxy_info['port']}")
    except ImportError:
        print("[ERROR] 未找到代理配置文件")
        return False
    
    # SSL配置
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # 尝试加载SSL证书
    if proxy_info.get('ssl_cert'):
        try:
            ssl_context.load_verify_locations(proxy_info['ssl_cert'])
            print(f"[SSL] SSL证书已加载")
        except Exception as e:
            print(f"[WARNING] SSL证书加载失败: {e}")
    
    connector = aiohttp.TCPConnector(
        ssl=ssl_context,
        force_close=True,
        limit=3,
        limit_per_host=1
    )
    
    timeout = aiohttp.ClientTimeout(total=30, connect=15, sock_read=15)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Connection': 'close'
    }
    
    async with aiohttp.ClientSession(
        connector=connector,
        timeout=timeout,
        headers=headers
    ) as session:
        
        # 测试代理连接
        try:
            print("[TEST] 通过代理测试基础连接...")
            response = await session.get(
                'https://httpbin.org/ip',
                proxy=proxy_url
            )
            
            if response.status == 200:
                data = await response.json()
                print(f"[SUCCESS] 代理连接成功，代理IP: {data.get('origin')}")
                
                # 测试代理访问CLOB
                print("[TEST] 通过代理测试CLOB API...")
                clob_response = await session.get(
                    'https://clob.polymarket.com/markets',
                    proxy=proxy_url,
                    params={'limit': 1}
                )
                
                if clob_response.status == 200:
                    print("[SUCCESS] 代理可以解决CLOB API访问问题！")
                    return True
                else:
                    print(f"[PARTIAL] 代理基础连接OK，但CLOB API仍返回: {clob_response.status}")
                    return False
            else:
                print(f"[ERROR] 代理连接失败: {response.status}")
                return False
                
        except Exception as e:
            print(f"[ERROR] 代理测试失败: {e}")
            return False

def analyze_network_issues(results):
    """分析网络问题并提供解决方案"""
    print("\n=== 网络问题分析 ===")
    
    # 统计问题类型
    total_tests = len(results)
    timeout_count = sum(1 for r in results.values() if r['status'] == 'timeout')
    connection_errors = sum(1 for r in results.values() if r['status'] == 'connection_error')
    http_errors = sum(1 for r in results.values() if r['status'] == 'http_error')
    success_count = sum(1 for r in results.values() if r['status'] == 'success')
    
    print(f"总测试数: {total_tests}")
    print(f"成功连接: {success_count}")
    print(f"超时错误: {timeout_count}")
    print(f"连接错误: {connection_errors}")
    print(f"HTTP错误: {http_errors}")
    print()
    
    # 问题诊断
    if success_count == 0:
        print("[DIAGNOSIS] 完全网络隔离")
        print("原因: 所有外部连接都失败")
        print("建议: 检查防火墙、网络连接或使用代理")
        return "complete_isolation"
        
    elif success_count < total_tests // 2:
        print("[DIAGNOSIS] 部分网络限制")
        print("原因: 特定API或域名被限制访问")
        print("建议: 使用代理绕过网络限制")
        return "partial_restriction"
        
    elif timeout_count > connection_errors:
        print("[DIAGNOSIS] 网络延迟问题")
        print("原因: 网络连接缓慢或不稳定")
        print("建议: 增加超时时间或使用更稳定的网络")
        return "network_latency"
        
    elif http_errors > 0:
        print("[DIAGNOSIS] API服务问题")
        print("原因: 目标API服务暂时不可用")
        print("建议: 等待服务恢复或寻找替代数据源")
        return "api_service_issue"
        
    else:
        print("[DIAGNOSIS] 间歇性网络问题")
        print("原因: 网络连接不稳定")
        print("建议: 实现重试机制和代理回退")
        return "intermittent_issue"

async def main():
    """主诊断函数"""
    print("=" * 60)
    print("Polymarket API 网络连接诊断")
    print("=" * 60)
    print()
    
    # 1. 网络连接诊断
    results = await diagnose_network_connectivity()
    
    # 2. 分析问题
    issue_type = analyze_network_issues(results)
    
    # 3. 测试代理效果
    if issue_type in ['complete_isolation', 'partial_restriction']:
        proxy_works = await test_proxy_effectiveness()
        
        print(f"\n=== 解决方案建议 ===")
        if proxy_works:
            print("[SOLUTION] 代理回退策略")
            print("✓ 代理可以解决当前网络问题")
            print("✓ 建议在智能代理系统中启用代理回退")
            print("✓ 当直连失败时自动切换到代理模式")
        else:
            print("[SOLUTION] 综合解决策略")
            print("! 代理也无法完全解决问题")
            print("! 建议使用离线模式或等待网络恢复")
    else:
        print(f"\n=== 解决方案建议 ===")
        print("[SOLUTION] 网络优化策略")
        print("• 增加重试间隔和超时时间")
        print("• 实现智能重试限制（避免无限重连）")
        print("• 添加网络状态监控和报告")
    
    print()
    print("=" * 60)
    print("诊断完成")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())