#!/usr/bin/env python3
"""
修复Bright Data代理连接问题
"""

import asyncio
import aiohttp
import ssl

async def test_proxy_variations():
    """测试不同的代理连接方式"""
    print("=" * 60)
    print("修复Bright Data代理连接")
    print("=" * 60)
    
    # 你的Bright Data凭据
    proxy_configs = [
        # 原始配置
        "http://brd-customer-hl_27b741ac-zone-residential_proxy1:vslhbidpdl4f@brd.superproxy.io:33335",
        # 添加会话ID
        "http://brd-customer-hl_27b741ac-zone-residential_proxy1-session-123:vslhbidpdl4f@brd.superproxy.io:33335",
        # 指定国家
        "http://brd-customer-hl_27b741ac-zone-residential_proxy1-country-us:vslhbidpdl4f@brd.superproxy.io:33335",
    ]
    
    for i, proxy_url in enumerate(proxy_configs, 1):
        print(f"\n[TEST {i}] 测试代理配置...")
        
        try:
            # 宽松的SSL配置
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            connector = aiohttp.TCPConnector(
                ssl=ssl_context,
                limit=5,
                enable_cleanup_closed=True
            )
            
            timeout = aiohttp.ClientTimeout(total=30)
            
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                # 先测试代理本身
                response = await session.get(
                    "https://httpbin.org/ip", 
                    proxy=proxy_url
                )
                
                if response.status == 200:
                    data = await response.json()
                    proxy_ip = data.get('origin', 'unknown')
                    print(f"  [OK] 代理IP: {proxy_ip}")
                    response.close()
                    
                    # 测试Polymarket访问
                    try:
                        polymarket_response = await session.get(
                            "https://clob.polymarket.com/ping",
                            proxy=proxy_url,
                            headers={
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                            }
                        )
                        
                        if polymarket_response.status == 200:
                            text = await polymarket_response.text()
                            print(f"  [SUCCESS] Polymarket访问成功: {text}")
                            polymarket_response.close()
                            return proxy_url  # 返回可用的代理
                        else:
                            print(f"  [BLOCKED] Polymarket访问被阻: {polymarket_response.status}")
                            polymarket_response.close()
                            
                    except Exception as e:
                        print(f"  [ERROR] Polymarket测试失败: {e}")
                else:
                    print(f"  [ERROR] 代理测试失败: {response.status}")
                    response.close()
                    
        except Exception as e:
            print(f"  [ERROR] 连接失败: {e}")
    
    return None

if __name__ == "__main__":
    working_proxy = asyncio.run(test_proxy_variations())
    if working_proxy:
        print(f"\n[RESULT] 找到可用代理: {working_proxy}")
    else:
        print(f"\n[RESULT] 所有代理配置都失败")