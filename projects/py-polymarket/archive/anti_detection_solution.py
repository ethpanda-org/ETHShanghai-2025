#!/usr/bin/env python3
"""
Polymarket IP封禁问题解决方案
"""

import asyncio
import aiohttp
import ssl
import random
import time
from datetime import datetime

class AntiDetectionProxySession:
    """防检测代理会话"""
    
    def __init__(self, use_proxy=True):
        self.use_proxy = use_proxy
        self.session = None
        self.request_count = 0
        self.last_request_time = 0
        
    async def __aenter__(self):
        """创建防检测会话"""
        
        # 随机User-Agent池
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        ]
        
        # 随机选择User-Agent
        selected_ua = random.choice(user_agents)
        
        # 真实浏览器头部
        headers = {
            'User-Agent': selected_ua,
            'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }
        
        # SSL配置 - 模拟浏览器
        ssl_context = ssl.create_default_context()
        ssl_context.set_ciphers('ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS')
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED
        
        # 连接器配置
        connector = aiohttp.TCPConnector(
            ssl=ssl_context,
            limit=10,
            limit_per_host=3,
            ttl_dns_cache=300,
            use_dns_cache=True,
            enable_cleanup_closed=True,
        )
        
        # 超时配置
        timeout = aiohttp.ClientTimeout(
            total=30,
            connect=15,
            sock_read=20
        )
        
        # 代理配置
        if self.use_proxy:
            from proxy_config import ProxyManager
            proxy_manager = ProxyManager()
            proxy_config = proxy_manager.get_random_proxy()
            if proxy_config:
                self.proxy_url = proxy_config.get('http')
                print(f"[PROXY] 使用代理: {self.proxy_url}")
        
        # 创建会话
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers,
            cookie_jar=aiohttp.CookieJar()  # 启用Cookie支持
        )
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def smart_request(self, method, url, **kwargs):
        """智能请求 - 包含频率控制和错误处理"""
        
        # 频率控制 - 每分钟最多15次请求
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < 4:  # 最少间隔4秒
            sleep_time = 4 - time_since_last + random.uniform(0.5, 2.0)
            print(f"[RATE_LIMIT] 等待 {sleep_time:.1f} 秒...")
            await asyncio.sleep(sleep_time)
        
        self.last_request_time = time.time()
        self.request_count += 1
        
        # 添加代理
        if self.use_proxy and hasattr(self, 'proxy_url'):
            kwargs['proxy'] = self.proxy_url
        
        # 添加随机延迟模拟人类行为
        if self.request_count > 1:
            human_delay = random.uniform(0.3, 1.5)
            await asyncio.sleep(human_delay)
        
        try:
            # 发送请求
            response = await self.session.request(method, url, **kwargs)
            
            # 检查响应状态
            if response.status == 403:
                print(f"[WARNING] 访问被拒绝 - 可能需要更换IP")
            elif response.status == 429:
                print(f"[WARNING] 请求频率过高 - 增加延迟")
                await asyncio.sleep(60)  # 等待1分钟
            elif response.status >= 500:
                print(f"[WARNING] 服务器错误: {response.status}")
            
            return response
            
        except Exception as e:
            print(f"[ERROR] 请求失败: {e}")
            raise
    
    async def get(self, url, **kwargs):
        """GET请求"""
        return await self.smart_request('GET', url, **kwargs)
    
    async def post(self, url, **kwargs):
        """POST请求"""
        return await self.smart_request('POST', url, **kwargs)

async def test_anti_detection_solution():
    """测试防检测解决方案"""
    print("=" * 70)
    print("Polymarket防检测访问方案测试")
    print("=" * 70)
    print(f"测试时间: {datetime.now().strftime('%H:%M:%S')}")
    print()
    
    success_count = 0
    test_urls = [
        ("Ping端点", "https://clob.polymarket.com/ping"),
        ("市场列表", "https://clob.polymarket.com/markets?limit=5"),
        ("订单簿", "https://clob.polymarket.com/book?token_id=21742633143463906290569050155826241533067272736897614950488156847949938836455"),
    ]
    
    try:
        async with AntiDetectionProxySession(use_proxy=True) as session:
            
            for name, url in test_urls:
                print(f"[TEST] {name}")
                
                try:
                    response = await session.get(url)
                    
                    if response.status == 200:
                        # 尝试解析响应
                        try:
                            if 'ping' in url:
                                text = await response.text()
                                print(f"  [OK] Ping响应: {text}")
                            else:
                                data = await response.json()
                                if isinstance(data, list):
                                    print(f"  [OK] 获取到 {len(data)} 条数据")
                                elif isinstance(data, dict):
                                    print(f"  [OK] 获取到数据: {list(data.keys())[:3]}")
                                else:
                                    print(f"  [OK] 响应类型: {type(data)}")
                            
                            success_count += 1
                            
                        except Exception as e:
                            print(f"  [WARNING] 响应解析失败: {e}")
                            # 即使解析失败，如果状态码是200也算成功
                            success_count += 1
                    
                    else:
                        print(f"  [ERROR] 状态码: {response.status}")
                    
                    response.close()
                    
                except Exception as e:
                    print(f"  [ERROR] 请求失败: {e}")
                
                # 请求间隔
                await asyncio.sleep(random.uniform(2, 5))
        
        print(f"\n" + "=" * 70)
        print(f"测试结果: {success_count}/{len(test_urls)} 成功")
        
        if success_count >= 2:
            print("[SUCCESS] 防检测方案有效!")
            print("建议: 在交易系统中使用此配置")
        elif success_count >= 1:
            print("[PARTIAL] 部分成功，需要进一步优化")
        else:
            print("[FAILED] 方案无效，需要更换代理或调整策略")
        
        return success_count >= 2
        
    except Exception as e:
        print(f"[CRITICAL] 测试失败: {e}")
        return False

async def create_production_config():
    """创建生产环境配置建议"""
    print("\n" + "=" * 70)
    print("生产环境配置建议")
    print("=" * 70)
    
    config = {
        "proxy_settings": {
            "use_proxy": True,
            "proxy_type": "residential",  # 住宅代理
            "rotation_interval": 300,     # 5分钟轮换
            "max_requests_per_proxy": 50,
        },
        "request_settings": {
            "min_interval": 4.0,          # 最小请求间隔4秒
            "max_requests_per_minute": 15,
            "timeout": 30,
            "retry_attempts": 3,
        },
        "headers": {
            "user_agent_rotation": True,
            "browser_simulation": True,
            "cookie_persistence": True,
        },
        "monitoring": {
            "track_success_rate": True,
            "auto_failover": True,
            "alert_on_blocks": True,
        }
    }
    
    print("推荐配置:")
    for category, settings in config.items():
        print(f"\n[{category.upper()}]")
        for key, value in settings.items():
            print(f"  {key}: {value}")
    
    print(f"\n[关键要点]")
    print("1. 必须使用高质量住宅代理")
    print("2. 严格控制请求频率 (每分钟<15次)")
    print("3. 模拟真实浏览器行为")
    print("4. 实施自动故障转移")
    print("5. 监控IP封禁状态")

if __name__ == "__main__":
    # 测试防检测方案
    success = asyncio.run(test_anti_detection_solution())
    
    # 生成配置建议
    asyncio.run(create_production_config())