#!/usr/bin/env python3
"""
Network diagnosis and proxy fallback analysis script
Analyze CLOB and GraphQL API connection issues, implement intelligent proxy fallback
"""

import asyncio
import aiohttp
import ssl
import time
from datetime import datetime

async def diagnose_network_connectivity():
    """Diagnose network connection issues"""
    print("=== Network Connection Diagnosis ===")
    print()
    
    # Test endpoints
    endpoints = {
        'CLOB API': 'https://clob.polymarket.com/markets',
        'GraphQL Orderbook': 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/orderbook-subgraph/0.0.1/gn',
        'GraphQL Activity': 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/activity-subgraph/0.0.4/gn',
        'Basic Connectivity': 'https://httpbin.org/ip',
        'DNS Resolution': 'https://1.1.1.1/dns-query'
    }
    
    # Create session
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
                    # GraphQL test query
                    response = await session.post(url, json={
                        'query': '{ __schema { queryType { name } } }'
                    })
                else:
                    # REST API test
                    response = await session.get(url, params={'limit': 1} if 'clob' in url else {})
                
                elapsed = time.time() - start_time
                
                if response.status == 200:
                    print(f"  [OK] Status: {response.status}, Latency: {elapsed:.2f}s")
                    results[name] = {'status': 'success', 'code': response.status, 'latency': elapsed}
                else:
                    print(f"  [ERROR] Status: {response.status}, Latency: {elapsed:.2f}s")
                    results[name] = {'status': 'http_error', 'code': response.status, 'latency': elapsed}
                    
            except asyncio.TimeoutError:
                elapsed = time.time() - start_time
                print(f"  [TIMEOUT] Connection timeout: {elapsed:.2f}s")
                results[name] = {'status': 'timeout', 'code': None, 'latency': elapsed}
                
            except aiohttp.ClientError as e:
                elapsed = time.time() - start_time
                print(f"  [CONNECTION] Connection error: {str(e)[:50]}...")
                results[name] = {'status': 'connection_error', 'code': None, 'latency': elapsed}
                
            except Exception as e:
                elapsed = time.time() - start_time
                print(f"  [ERROR] Other error: {str(e)[:50]}...")
                results[name] = {'status': 'other_error', 'code': None, 'latency': elapsed}
    
    return results

async def test_proxy_effectiveness():
    """Test if proxy can solve connection issues"""
    print("\n=== Proxy Connection Effectiveness Test ===")
    
    # Check if proxy configuration is available
    try:
        from brightdata_config import get_proxy_auth_url, get_proxy_info
        proxy_url = get_proxy_auth_url()
        proxy_info = get_proxy_info()
        print(f"[PROXY] Proxy configuration available: {proxy_info['host']}:{proxy_info['port']}")
    except ImportError:
        print("[ERROR] Proxy configuration file not found")
        return False
    
    # SSL configuration
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Try to load SSL certificate
    if proxy_info.get('ssl_cert'):
        try:
            ssl_context.load_verify_locations(proxy_info['ssl_cert'])
            print(f"[SSL] SSL certificate loaded")
        except Exception as e:
            print(f"[WARNING] SSL certificate loading failed: {e}")
    
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
        
        # Test proxy connection
        try:
            print("[TEST] Testing basic connection through proxy...")
            response = await session.get(
                'https://httpbin.org/ip',
                proxy=proxy_url
            )
            
            if response.status == 200:
                data = await response.json()
                print(f"[SUCCESS] Proxy connection successful, proxy IP: {data.get('origin')}")
                
                # Test proxy access to CLOB
                print("[TEST] Testing CLOB API through proxy...")
                clob_response = await session.get(
                    'https://clob.polymarket.com/markets',
                    proxy=proxy_url,
                    params={'limit': 1}
                )
                
                if clob_response.status == 200:
                    print("[SUCCESS] Proxy can solve CLOB API access issues!")
                    return True
                else:
                    print(f"[PARTIAL] Proxy basic connection OK, but CLOB API still returns: {clob_response.status}")
                    return False
            else:
                print(f"[ERROR] Proxy connection failed: {response.status}")
                return False
                
        except Exception as e:
            print(f"[ERROR] Proxy test failed: {e}")
            return False

def analyze_network_issues(results):
    """Analyze network issues and provide solutions"""
    print("\n=== Network Issues Analysis ===")
    
    # Count issue types
    total_tests = len(results)
    timeout_count = sum(1 for r in results.values() if r['status'] == 'timeout')
    connection_errors = sum(1 for r in results.values() if r['status'] == 'connection_error')
    http_errors = sum(1 for r in results.values() if r['status'] == 'http_error')
    success_count = sum(1 for r in results.values() if r['status'] == 'success')
    
    print(f"Total tests: {total_tests}")
    print(f"Successful connections: {success_count}")
    print(f"Timeout errors: {timeout_count}")
    print(f"Connection errors: {connection_errors}")
    print(f"HTTP errors: {http_errors}")
    print()
    
    # Issue diagnosis
    if success_count == 0:
        print("[DIAGNOSIS] Complete network isolation")
        print("Cause: All external connections failed")
        print("Recommendation: Check firewall, network connection or use proxy")
        return "complete_isolation"
        
    elif success_count < total_tests // 2:
        print("[DIAGNOSIS] Partial network restriction")
        print("Cause: Specific APIs or domains are restricted")
        print("Recommendation: Use proxy to bypass network restrictions")
        return "partial_restriction"
        
    elif timeout_count > connection_errors:
        print("[DIAGNOSIS] Network latency issues")
        print("Cause: Slow or unstable network connection")
        print("Recommendation: Increase timeout or use more stable network")
        return "network_latency"
        
    elif http_errors > 0:
        print("[DIAGNOSIS] API service issues")
        print("Cause: Target API service temporarily unavailable")
        print("Recommendation: Wait for service recovery or find alternative data sources")
        return "api_service_issue"
        
    else:
        print("[DIAGNOSIS] Intermittent network issues")
        print("Cause: Unstable network connection")
        print("Recommendation: Implement retry mechanism and proxy fallback")
        return "intermittent_issue"

def recommend_smart_proxy_strategy(issue_type, proxy_works):
    """Recommend smart proxy strategy based on diagnosis"""
    print("\n=== Smart Proxy Strategy Recommendations ===")
    
    if issue_type in ['complete_isolation', 'partial_restriction']:
        if proxy_works:
            print("[STRATEGY] Immediate Proxy Fallback")
            print("- Enable proxy mode for all data sources")
            print("- Set connection timeout to 10 seconds")
            print("- Implement automatic proxy detection")
            print("- Use proxy for both CLOB and GraphQL APIs")
        else:
            print("[STRATEGY] Offline Mode Fallback")
            print("- Switch to offline simulation data")
            print("- Disable network-dependent features")
            print("- Use cached market data if available")
    
    elif issue_type == "network_latency":
        print("[STRATEGY] Adaptive Timeout Strategy")
        print("- Increase connection timeout to 30 seconds")
        print("- Implement progressive retry with backoff")
        print("- Use direct connection first, proxy as backup")
        print("- Monitor connection success rate")
    
    elif issue_type == "api_service_issue":
        print("[STRATEGY] Service Fallback Chain")
        print("- Try CLOB API first")
        print("- Fallback to GraphQL APIs") 
        print("- Use proxy if direct connection fails")
        print("- Implement smart service health monitoring")
    
    else:
        print("[STRATEGY] Hybrid Connection Strategy")
        print("- Use direct connection by default")
        print("- Enable proxy fallback on connection failure")
        print("- Limit retry attempts to prevent infinite loops")
        print("- Implement connection health scoring")

async def main():
    """Main diagnosis function"""
    print("=" * 60)
    print("Polymarket API Network Connection Diagnosis")
    print("=" * 60)
    print()
    
    # 1. Network connection diagnosis
    results = await diagnose_network_connectivity()
    
    # 2. Analyze issues
    issue_type = analyze_network_issues(results)
    
    # 3. Test proxy effectiveness
    proxy_works = False
    if issue_type in ['complete_isolation', 'partial_restriction']:
        proxy_works = await test_proxy_effectiveness()
    
    # 4. Provide smart proxy strategy recommendations
    recommend_smart_proxy_strategy(issue_type, proxy_works)
    
    print()
    print("=" * 60)
    print("Diagnosis Complete")
    print("=" * 60)
    
    return {
        'issue_type': issue_type,
        'proxy_works': proxy_works,
        'results': results
    }

if __name__ == "__main__":
    asyncio.run(main())