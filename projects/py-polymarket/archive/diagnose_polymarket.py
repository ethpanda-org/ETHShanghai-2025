#!/usr/bin/env python3
"""
Polymarket SSL连接问题诊断工具 - 无Unicode版本
"""

import asyncio
import aiohttp
import ssl
import socket
from datetime import datetime

async def diagnose_polymarket_ssl():
    """诊断Polymarket SSL连接问题"""
    print("=" * 70)
    print("Polymarket SSL连接问题诊断")
    print("=" * 70)
    print(f"诊断时间: {datetime.now().strftime('%H:%M:%S')}")
    print()
    
    results = []
    
    # 1. DNS和端口测试
    print("[STEP 1] 基础连通性测试")
    print("-" * 40)
    
    try:
        ip = socket.gethostbyname("clob.polymarket.com")
        print(f"[OK] DNS解析: clob.polymarket.com -> {ip}")
        
        # 测试443端口
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((ip, 443))
        sock.close()
        
        if result == 0:
            print(f"[OK] 端口443开放: {ip}:443")
        else:
            print(f"[ERROR] 端口443被阻断: {ip}:443")
            results.append("PORT_BLOCKED")
            return results
            
    except Exception as e:
        print(f"[ERROR] DNS解析失败: {e}")
        results.append("DNS_FAILED")
        return results
    
    # 2. SSL握手测试
    print(f"\n[STEP 2] SSL握手测试")
    print("-" * 40)
    
    ssl_success = False
    ssl_configs = [
        ("严格验证", True, True),
        ("忽略主机名", True, False), 
        ("忽略证书", False, False),
    ]
    
    for name, verify, check_host in ssl_configs:
        try:
            ctx = ssl.create_default_context()
            if not verify:
                ctx.verify_mode = ssl.CERT_NONE
            if not check_host:
                ctx.check_hostname = False
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            ssl_sock = ctx.wrap_socket(sock, server_hostname="clob.polymarket.com")
            ssl_sock.connect((ip, 443))
            
            print(f"[OK] SSL握手成功: {name}")
            ssl_success = True
            ssl_sock.close()
            break
            
        except ssl.SSLError as e:
            print(f"[ERROR] SSL错误 ({name}): {str(e)[:50]}...")
        except Exception as e:
            print(f"[ERROR] 连接失败 ({name}): {str(e)[:50]}...")
    
    if not ssl_success:
        results.append("SSL_HANDSHAKE_FAILED")
        return results
    
    # 3. HTTP请求测试
    print(f"\n[STEP 3] HTTP请求测试")
    print("-" * 40)
    
    user_agents = [
        ("Chrome浏览器", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"),
        ("API客户端", "polymarket-api-client/1.0"),
        ("Python客户端", "python-aiohttp/3.8.0"),
    ]
    
    successful_requests = []
    
    for ua_name, user_agent in user_agents:
        try:
            # 最宽松的SSL配置
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            
            connector = aiohttp.TCPConnector(ssl=ssl_ctx, limit=5)
            timeout = aiohttp.ClientTimeout(total=15)
            
            headers = {
                'User-Agent': user_agent,
                'Accept': 'application/json',
                'Connection': 'keep-alive',
            }
            
            async with aiohttp.ClientSession(
                connector=connector, 
                timeout=timeout, 
                headers=headers
            ) as session:
                
                response = await session.get("https://clob.polymarket.com/ping")
                status = response.status
                
                print(f"[{ua_name}] 状态码: {status}")
                
                if status == 200:
                    text = await response.text()
                    print(f"  [OK] 响应: {text[:30]}...")
                    successful_requests.append(ua_name)
                elif status == 403:
                    print(f"  [BLOCKED] 访问被拒绝 - 可能IP被封")
                    results.append("IP_BLOCKED_403")
                elif status == 429:
                    print(f"  [RATE_LIMITED] 请求频率限制")
                    results.append("RATE_LIMITED")
                elif status >= 500:
                    print(f"  [SERVER_ERROR] 服务器错误")
                    results.append("SERVER_ERROR")
                else:
                    print(f"  [UNKNOWN] 未知状态码: {status}")
                
                response.close()
                
        except aiohttp.ClientSSLError as e:
            print(f"[{ua_name}] SSL错误: {str(e)[:40]}...")
            results.append("SSL_ERROR")
        except aiohttp.ClientConnectorError as e:
            print(f"[{ua_name}] 连接错误: {str(e)[:40]}...")
            results.append("CONNECTION_ERROR")
        except asyncio.TimeoutError:
            print(f"[{ua_name}] 请求超时")
            results.append("TIMEOUT")
        except Exception as e:
            print(f"[{ua_name}] 其他错误: {str(e)[:40]}...")
            results.append("OTHER_ERROR")
        
        await asyncio.sleep(1)
    
    # 4. 代理测试
    print(f"\n[STEP 4] 代理访问测试")
    print("-" * 40)
    
    try:
        from proxy_config import FixedProxySession
        
        async with FixedProxySession(use_proxy=True) as session:
            response = await session.get("https://clob.polymarket.com/ping")
            status = response.status
            
            print(f"[PROXY] 状态码: {status}")
            
            if status == 200:
                text = await response.text()
                print(f"  [OK] 代理访问成功: {text[:30]}...")
                successful_requests.append("代理访问")
                results.append("PROXY_SUCCESS")
            elif status == 403:
                print(f"  [BLOCKED] 代理IP也被封")
                results.append("PROXY_IP_BLOCKED")
            else:
                print(f"  [ERROR] 代理访问失败: {status}")
                results.append("PROXY_FAILED")
            
            response.close()
            
    except Exception as e:
        print(f"[PROXY] 代理测试失败: {str(e)[:50]}...")
        results.append("PROXY_ERROR")
    
    # 5. 地理位置检测
    print(f"\n[STEP 5] IP和地理位置检测")
    print("-" * 40)
    
    try:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        
        async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ssl_ctx)) as session:
            # 检查当前IP
            try:
                response = await session.get("https://httpbin.org/ip", timeout=aiohttp.ClientTimeout(total=10))
                if response.status == 200:
                    data = await response.json()
                    current_ip = data.get('origin', 'unknown')
                    print(f"[INFO] 当前IP: {current_ip}")
                response.close()
            except:
                print("[INFO] 无法检测当前IP")
            
            # 检查地理位置
            try:
                response = await session.get("https://ipapi.co/json/", timeout=aiohttp.ClientTimeout(total=10))
                if response.status == 200:
                    data = await response.json()
                    country = data.get('country_name', 'unknown')
                    city = data.get('city', 'unknown')
                    print(f"[INFO] 地理位置: {country}, {city}")
                    
                    # 检查是否在受限地区
                    restricted_countries = ['CN', 'IR', 'KP', 'SY']
                    if data.get('country_code') in restricted_countries:
                        print(f"[WARNING] 可能在地理限制区域")
                        results.append("GEO_RESTRICTED")
                        
                response.close()
            except:
                print("[INFO] 无法检测地理位置")
                
    except Exception as e:
        print(f"[ERROR] IP检测失败: {e}")
    
    print(f"\n" + "=" * 70)
    print("诊断结果总结")
    print("=" * 70)
    
    if successful_requests:
        print("[SUCCESS] 发现可用的连接方式:")
        for method in successful_requests:
            print(f"  - {method}")
    else:
        print("[FAILED] 所有连接方式都失败")
    
    print(f"\n[ANALYSIS] 问题分析:")
    unique_results = list(set(results))
    
    if "IP_BLOCKED_403" in unique_results:
        print("  - IP被Polymarket封禁 (403错误)")
    if "GEO_RESTRICTED" in unique_results:
        print("  - 可能存在地理位置限制")
    if "SSL_ERROR" in unique_results:
        print("  - SSL/TLS握手问题")
    if "RATE_LIMITED" in unique_results:
        print("  - 请求频率过高被限制")
    if "PROXY_SUCCESS" in unique_results:
        print("  - 代理可以绕过限制")
    
    print(f"\n[RECOMMENDATIONS] 解决方案:")
    if "PROXY_SUCCESS" in unique_results:
        print("  1. [推荐] 使用代理访问 - 已验证可用")
        print("  2. 配置多个代理IP轮换使用")
        print("  3. 使用住宅代理避免检测")
    else:
        print("  1. 尝试更换代理服务商")
        print("  2. 使用不同地区的代理IP")
        print("  3. 降低请求频率")
        print("  4. 模拟真实浏览器行为")
    
    return unique_results

if __name__ == "__main__":
    result = asyncio.run(diagnose_polymarket_ssl())
    print(f"\n[FINAL] 诊断标签: {result}")