#!/usr/bin/env python3
"""
增强版Bright Data代理 - 更激进的轮换策略
"""

import asyncio
import aiohttp
import ssl
import random
import time
from datetime import datetime

class EnhancedBrightDataProxy:
    """增强版Bright Data代理管理器"""
    
    def __init__(self):
        self.base_user = "brd-customer-hl_27b741ac-zone-residential_proxy1"
        self.password = "vslhbidpdl4f"
        self.proxy_host = "brd.superproxy.io"
        self.proxy_port = 33335
        
    def get_fresh_proxy(self):
        """每次获取全新的代理配置"""
        # 使用时间戳 + 随机数确保每次都不同
        timestamp = int(time.time() * 1000)  # 毫秒级时间戳
        random_id = random.randint(1000, 9999)
        session_id = f"{timestamp}{random_id}"
        
        # 添加更多参数尝试获取不同地区IP
        configs = [
            f"{self.base_user}-session-{session_id}",
            f"{self.base_user}-session-{session_id}-country-us",
            f"{self.base_user}-session-{session_id}-country-ca",
            f"{self.base_user}-session-{session_id}-country-gb",
        ]
        
        selected_config = random.choice(configs)
        proxy_url = f"http://{selected_config}:{self.password}@{self.proxy_host}:{self.proxy_port}"
        
        print(f"[PROXY] 新配置: {selected_config}")
        return proxy_url

async def test_enhanced_rotation():
    """测试增强轮换策略"""
    print("=" * 70)
    print("增强版IP轮换测试")
    print("=" * 70)
    
    proxy_manager = EnhancedBrightDataProxy()
    
    # SSL配置
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    connector = aiohttp.TCPConnector(ssl=ssl_context, limit=10)
    timeout = aiohttp.ClientTimeout(total=30)
    
    # 模拟不同浏览器的User-Agent
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ]
    
    success_count = 0
    
    for attempt in range(5):  # 尝试5次不同的配置
        print(f"\n[尝试 {attempt + 1}] 测试新的代理配置...")
        
        # 每次使用全新的代理和User-Agent
        proxy_url = proxy_manager.get_fresh_proxy()
        user_agent = random.choice(user_agents)
        
        headers = {
            'User-Agent': user_agent,
            'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0',
        }
        
        try:
            async with aiohttp.ClientSession(
                connector=connector, 
                timeout=timeout, 
                headers=headers
            ) as session:
                
                # 先检查代理IP
                ip_response = await session.get("https://httpbin.org/ip", proxy=proxy_url)
                if ip_response.status == 200:
                    ip_data = await ip_response.json()
                    current_ip = ip_data.get('origin', 'unknown')
                    print(f"  当前IP: {current_ip}")
                ip_response.close()
                
                # 等待一段时间模拟人类行为
                await asyncio.sleep(random.uniform(3, 8))
                
                # 尝试访问Polymarket
                polymarket_response = await session.get(
                    "https://clob.polymarket.com/ping", 
                    proxy=proxy_url
                )
                
                print(f"  Polymarket状态码: {polymarket_response.status}")
                
                if polymarket_response.status == 200:
                    text = await polymarket_response.text()
                    print(f"  [SUCCESS] 响应: {text}")
                    success_count += 1
                    
                    # 如果成功，继续测试API
                    try:
                        await asyncio.sleep(2)
                        api_response = await session.get(
                            "https://clob.polymarket.com/markets?limit=2",
                            proxy=proxy_url
                        )
                        
                        if api_response.status == 200:
                            api_data = await api_response.json()
                            print(f"  [SUCCESS] API数据: {len(api_data)} 个市场")
                        else:
                            print(f"  [API] 状态码: {api_response.status}")
                            
                        api_response.close()
                        
                    except Exception as e:
                        print(f"  [API] 测试失败: {e}")
                
                elif polymarket_response.status == 403:
                    print(f"  [BLOCKED] IP仍被封禁")
                elif polymarket_response.status == 404:
                    print(f"  [ERROR] 端点不存在或配置错误")
                else:
                    print(f"  [OTHER] 其他状态: {polymarket_response.status}")
                
                polymarket_response.close()
                
        except Exception as e:
            print(f"  [ERROR] 连接失败: {e}")
        
        # 请求间较长延迟
        if attempt < 4:
            wait_time = random.uniform(10, 20)
            print(f"  等待 {wait_time:.1f} 秒后继续...")
            await asyncio.sleep(wait_time)
    
    print(f"\n" + "=" * 70)
    print(f"测试结果: {success_count}/5 次成功")
    
    if success_count > 0:
        print("[PARTIAL SUCCESS] 找到了有效的访问方式!")
        print("建议: 在交易系统中使用相同的配置")
        return True
    else:
        print("[FAILED] 所有尝试都失败")
        print("建议: 考虑升级到ISP代理或联系Bright Data支持")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_enhanced_rotation())
    
    if success:
        print(f"\n[下一步] 将成功的配置集成到交易系统中")
    else:
        print(f"\n[下一步] 需要升级代理服务或寻找其他解决方案")