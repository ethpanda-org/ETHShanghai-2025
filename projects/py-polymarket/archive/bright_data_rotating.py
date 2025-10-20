#!/usr/bin/env python3
"""
Bright Data Session轮换代理配置
"""

import asyncio
import aiohttp
import ssl
import random
import time
from datetime import datetime

class BrightDataRotatingProxy:
    """Bright Data旋转代理管理器"""
    
    def __init__(self):
        # 你的Bright Data凭据
        self.base_user = "brd-customer-hl_27b741ac-zone-residential_proxy1"
        self.password = "vslhbidpdl4f"
        self.proxy_host = "brd.superproxy.io"
        self.proxy_port = 33335
        
        self.session_counter = 0
        self.last_rotation_time = 0
        self.rotation_interval = 300  # 5分钟轮换一次
        
    def get_rotating_proxy_url(self):
        """生成带轮换session的代理URL"""
        current_time = int(time.time())
        
        # 方法1: 基于时间的session ID (每5分钟轮换)
        session_id = current_time // self.rotation_interval
        
        # 方法2: 也可以使用随机数
        # session_id = random.randint(10000, 99999)
        
        # 方法3: 或者使用计数器
        # self.session_counter += 1
        # session_id = self.session_counter
        
        proxy_user = f"{self.base_user}-session-{session_id}"
        proxy_url = f"http://{proxy_user}:{self.password}@{self.proxy_host}:{self.proxy_port}"
        
        print(f"[PROXY] 使用Session ID: {session_id}")
        return proxy_url
    
    def force_rotate(self):
        """强制轮换到新IP"""
        self.session_counter += 1
        session_id = int(time.time()) + self.session_counter
        proxy_user = f"{self.base_user}-session-{session_id}"
        proxy_url = f"http://{proxy_user}:{self.password}@{self.proxy_host}:{self.proxy_port}"
        print(f"[PROXY] 强制轮换到Session: {session_id}")
        return proxy_url

class RotatingProxySession:
    """带IP轮换的HTTP会话"""
    
    def __init__(self):
        self.proxy_manager = BrightDataRotatingProxy()
        self.session = None
        self.request_count = 0
        
    async def __aenter__(self):
        # 创建SSL上下文
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # 创建连接器
        connector = aiohttp.TCPConnector(
            ssl=ssl_context,
            limit=20,
            limit_per_host=5,
            ttl_dns_cache=300,
            use_dns_cache=True,
        )
        
        # 超时设置
        timeout = aiohttp.ClientTimeout(
            total=30,
            connect=15,
            sock_read=15
        )
        
        # 真实浏览器headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers
        )
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get(self, url, rotate_ip=False, **kwargs):
        """GET请求，支持IP轮换"""
        
        # 决定是否轮换IP
        if rotate_ip or self.request_count % 10 == 0:  # 每10个请求轮换一次
            proxy_url = self.proxy_manager.get_rotating_proxy_url()
        else:
            proxy_url = self.proxy_manager.get_rotating_proxy_url()  # 使用当前session
        
        # 添加代理到请求
        kwargs['proxy'] = proxy_url
        
        # 频率控制
        if self.request_count > 0:
            await asyncio.sleep(random.uniform(2, 5))  # 2-5秒随机延迟
        
        self.request_count += 1
        
        try:
            response = await self.session.get(url, **kwargs)
            return response
        except Exception as e:
            print(f"[ERROR] 请求失败，尝试强制轮换IP: {e}")
            # 如果请求失败，强制轮换IP重试
            new_proxy = self.proxy_manager.force_rotate()
            kwargs['proxy'] = new_proxy
            await asyncio.sleep(3)
            return await self.session.get(url, **kwargs)

async def test_rotating_proxy():
    """测试IP轮换功能"""
    print("=" * 70)
    print("Bright Data Session轮换测试")
    print("=" * 70)
    
    async with RotatingProxySession() as session:
        
        # 测试1: 检查IP轮换
        print("\n[TEST 1] IP轮换测试")
        print("-" * 40)
        
        for i in range(3):
            try:
                response = await session.get("https://httpbin.org/ip", rotate_ip=True)
                if response.status == 200:
                    data = await response.json()
                    current_ip = data.get('origin', 'unknown')
                    print(f"  第{i+1}次请求 IP: {current_ip}")
                response.close()
            except Exception as e:
                print(f"  第{i+1}次请求失败: {e}")
            
            await asyncio.sleep(2)
        
        # 测试2: Polymarket访问
        print(f"\n[TEST 2] Polymarket访问测试")
        print("-" * 40)
        
        polymarket_urls = [
            "https://clob.polymarket.com/ping",
            "https://clob.polymarket.com/markets?limit=3",
        ]
        
        for url in polymarket_urls:
            try:
                print(f"  测试: {url}")
                response = await session.get(url, rotate_ip=True)
                
                if response.status == 200:
                    if 'ping' in url:
                        text = await response.text()
                        print(f"    [SUCCESS] Ping响应: {text}")
                    else:
                        data = await response.json()
                        print(f"    [SUCCESS] 获取到 {len(data)} 个市场数据")
                elif response.status == 403:
                    print(f"    [BLOCKED] 访问被拒绝，尝试更多轮换...")
                else:
                    print(f"    [ERROR] 状态码: {response.status}")
                
                response.close()
                
            except Exception as e:
                print(f"    [ERROR] 请求失败: {e}")
            
            await asyncio.sleep(3)

if __name__ == "__main__":
    asyncio.run(test_rotating_proxy())