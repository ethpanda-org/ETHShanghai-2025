#!/usr/bin/env python3
"""
完整浏览器指纹模拟 - 解决Polymarket检测问题
"""

import asyncio
import aiohttp
import ssl
import random
import time
import json
from datetime import datetime

class BrowserFingerprintSession:
    """完整的浏览器指纹模拟会话"""
    
    def __init__(self):
        self.proxy_manager = self._init_proxy_manager()
        self.session = None
        self.request_count = 0
        self.last_request_time = 0
        self.cookies = {}
        
    def _init_proxy_manager(self):
        """初始化代理管理器"""
        class ProxyManager:
            def __init__(self):
                self.base_user = "brd-customer-hl_27b741ac-zone-residential_proxy1"
                self.password = "vslhbidpdl4f"
                self.proxy_host = "brd.superproxy.io"
                self.proxy_port = 33335
                
            def get_session_proxy(self):
                """获取会话级代理（保持IP一致）"""
                session_id = int(time.time()) // 1800  # 30分钟一个session
                proxy_user = f"{self.base_user}-session-{session_id}-country-us"
                return f"http://{proxy_user}:{self.password}@{self.proxy_host}:{self.proxy_port}"
                
        return ProxyManager()
    
    def _generate_browser_headers(self):
        """生成完整的浏览器头部"""
        
        # 真实Chrome浏览器头部组合
        browser_configs = [
            {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "sec_ch_ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                "sec_ch_ua_platform": '"Windows"',
            },
            {
                "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 
                "sec_ch_ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                "sec_ch_ua_platform": '"macOS"',
            }
        ]
        
        config = random.choice(browser_configs)
        
        headers = {
            'User-Agent': config["user_agent"],
            'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'sec-ch-ua': config["sec_ch_ua"],
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': config["sec_ch_ua_platform"],
            'DNT': '1',
            'Sec-GPC': '1',
        }
        
        return headers
    
    async def __aenter__(self):
        """创建完整的浏览器会话"""
        
        # 忽略SSL证书验证（针对住宅代理的SSL兼容性问题）
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # 设置更宽松的SSL配置
        ssl_context.set_ciphers('DEFAULT:@SECLEVEL=1')
        
        connector = aiohttp.TCPConnector(
            ssl=ssl_context,
            limit=10,
            limit_per_host=2,
            ttl_dns_cache=600,
            use_dns_cache=True,
            enable_cleanup_closed=True,
            force_close=True
        )
        
        # 更长的超时设置
        timeout = aiohttp.ClientTimeout(
            total=60,
            connect=30,
            sock_read=30
        )
        
        # 启用Cookie支持
        jar = aiohttp.CookieJar(unsafe=True)
        
        # 生成浏览器头部
        headers = self._generate_browser_headers()
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers,
            cookie_jar=jar
        )
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def simulate_human_behavior(self, base_url="https://polymarket.com"):
        """模拟真实用户浏览行为"""
        
        proxy_url = self.proxy_manager.get_session_proxy()
        print(f"[BEHAVIOR] 开始模拟用户浏览行为...")
        
        try:
            # 步骤1: 访问主页
            print(f"  [1] 访问主页...")
            response = await self.session.get(base_url, proxy=proxy_url)
            print(f"      状态码: {response.status}")
            
            if response.status == 200:
                # 模拟阅读时间
                await asyncio.sleep(random.uniform(3, 8))
                response.close()
                
                # 步骤2: 访问市场页面
                print(f"  [2] 浏览市场页面...")
                await asyncio.sleep(random.uniform(2, 5))
                
                markets_response = await self.session.get(
                    f"{base_url}/markets", 
                    proxy=proxy_url
                )
                print(f"      市场页面状态码: {markets_response.status}")
                markets_response.close()
                
                # 步骤3: 等待后访问API
                await asyncio.sleep(random.uniform(5, 12))
                return True
            else:
                response.close()
                return False
                
        except Exception as e:
            print(f"  [ERROR] 行为模拟失败: {e}")
            return False
    
    async def smart_api_request(self, url, method='GET', **kwargs):
        """智能API请求 - 包含频率控制和行为模拟"""
        
        # 严格的频率控制
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        # 最少间隔15秒，模拟真实用户
        min_interval = random.uniform(15, 30)
        if time_since_last < min_interval:
            sleep_time = min_interval - time_since_last
            print(f"[RATE_LIMIT] 等待 {sleep_time:.1f} 秒模拟人类行为...")
            await asyncio.sleep(sleep_time)
        
        # 如果是第一次请求或间隔很长，先模拟浏览行为
        if self.request_count == 0 or time_since_last > 1800:  # 30分钟
            behavior_success = await self.simulate_human_behavior()
            if not behavior_success:
                print(f"[WARNING] 行为模拟失败，继续尝试API请求...")
        
        self.last_request_time = time.time()
        self.request_count += 1
        
        # 添加API特定的头部
        api_headers = {
            'Referer': 'https://polymarket.com/',
            'Origin': 'https://polymarket.com',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
        }
        
        if 'headers' not in kwargs:
            kwargs['headers'] = {}
        kwargs['headers'].update(api_headers)
        
        # 使用会话级代理
        proxy_url = self.proxy_manager.get_session_proxy()
        kwargs['proxy'] = proxy_url
        
        try:
            if method.upper() == 'GET':
                response = await self.session.get(url, **kwargs)
            elif method.upper() == 'POST':
                response = await self.session.post(url, **kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
            
        except Exception as e:
            print(f"[ERROR] API请求失败: {e}")
            raise

async def test_browser_simulation():
    """测试完整的浏览器模拟"""
    print("=" * 70)
    print("完整浏览器指纹模拟测试")
    print("=" * 70)
    
    async with BrowserFingerprintSession() as session:
        
        # 测试序列
        test_urls = [
            ("Ping端点", "https://clob.polymarket.com/ping"),
            ("市场数据", "https://clob.polymarket.com/markets?limit=2"),
        ]
        
        success_count = 0
        
        for name, url in test_urls:
            print(f"\n[TEST] {name}")
            print("-" * 40)
            
            try:
                response = await session.smart_api_request(url)
                
                print(f"状态码: {response.status}")
                
                if response.status == 200:
                    try:
                        if 'ping' in url:
                            text = await response.text()
                            print(f"[SUCCESS] 响应: {text}")
                        else:
                            data = await response.json()
                            print(f"[SUCCESS] 获取数据: {len(data)} 个市场")
                        success_count += 1
                    except Exception as e:
                        print(f"[SUCCESS] 状态200但解析失败: {e}")
                        success_count += 1  # 仍算成功
                        
                elif response.status == 403:
                    print(f"[BLOCKED] 仍被拒绝访问")
                elif response.status == 404:
                    print(f"[ERROR] 端点不存在")
                elif response.status >= 500:
                    print(f"[SERVER] 服务器错误")
                else:
                    print(f"[OTHER] 状态码: {response.status}")
                
                # 获取响应头信息用于调试
                headers_info = dict(response.headers)
                if 'server' in headers_info:
                    print(f"服务器: {headers_info['server']}")
                
                response.close()
                
            except Exception as e:
                print(f"[ERROR] 请求异常: {e}")
        
        print(f"\n" + "=" * 70)
        print(f"测试结果: {success_count}/{len(test_urls)} 成功")
        
        if success_count > 0:
            print("[SUCCESS] 浏览器模拟有效!")
            print("建议: 集成到交易系统中使用")
            return True
        else:
            print("[FAILED] 仍需进一步优化")
            return False

if __name__ == "__main__":
    success = asyncio.run(test_browser_simulation())
    
    if success:
        print(f"\n[结论] 找到有效的访问方式")
        print(f"[建议] 可以集成到实际交易系统中")
    else:
        print(f"\n[结论] 需要考虑Bright Data高级产品")
        print(f"[建议] 联系技术支持或升级到Scraping Browser API")