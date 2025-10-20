#!/usr/bin/env python3
"""
Bright Data Proxy Manager 本地轮换测试
"""

import asyncio
import aiohttp
import ssl
import random
import time
from datetime import datetime

class LocalProxyManager:
    """本地Proxy Manager代理管理器"""
    
    def __init__(self, local_port=24000):
        self.local_port = local_port
        self.proxy_url = f"http://127.0.0.1:{local_port}"
        self.request_count = 0
        
    def get_proxy_url(self):
        """获取本地代理URL"""
        return self.proxy_url

class LocalRotatingSession:
    """使用本地Proxy Manager的轮换会话"""
    
    def __init__(self, proxy_port=24000):
        self.proxy_manager = LocalProxyManager(proxy_port)
        self.session = None
        self.request_count = 0
        
    async def __aenter__(self):
        # SSL配置
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        connector = aiohttp.TCPConnector(
            ssl=ssl_context,
            limit=20,
            limit_per_host=5,
            ttl_dns_cache=300,
            use_dns_cache=True
        )
        
        timeout = aiohttp.ClientTimeout(
            total=30,
            connect=15,
            sock_read=15
        )
        
        # 真实浏览器头部
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
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
    
    async def get(self, url, **kwargs):
        """GET请求 - 自动使用本地代理轮换"""
        
        # 频率控制
        if self.request_count > 0:
            await asyncio.sleep(random.uniform(3, 6))
        
        self.request_count += 1
        
        # 使用本地Proxy Manager
        proxy_url = self.proxy_manager.get_proxy_url()
        kwargs['proxy'] = proxy_url
        
        print(f"[请求 {self.request_count}] 通过本地代理: {proxy_url}")
        
        try:
            response = await self.session.get(url, **kwargs)
            return response
        except Exception as e:
            print(f"[ERROR] 请求失败: {e}")
            raise

async def test_local_proxy_manager():
    """测试本地Proxy Manager"""
    print("=" * 70)
    print("本地Proxy Manager轮换测试")
    print("=" * 70)
    
    # 可配置的端口号 - 根据你的Proxy Manager设置
    proxy_ports = [24000, 24001, 24002]  # 尝试常用端口
    
    working_port = None
    
    # 首先找到可用的端口
    for port in proxy_ports:
        print(f"\n[测试] 检查端口 {port}...")
        
        try:
            async with LocalRotatingSession(port) as session:
                # 测试基础连接
                response = await session.get("https://httpbin.org/ip")
                
                if response.status == 200:
                    data = await response.json()
                    ip = data.get('origin', 'unknown')
                    print(f"  [OK] 端口 {port} 可用，获取IP: {ip}")
                    response.close()
                    working_port = port
                    break
                else:
                    print(f"  [ERROR] 端口 {port} 响应异常: {response.status}")
                    response.close()
                    
        except Exception as e:
            print(f"  [ERROR] 端口 {port} 不可用: {e}")
    
    if not working_port:
        print(f"\n[FAILED] 未找到可用的Proxy Manager端口")
        print(f"请确保:")
        print(f"1. Proxy Manager已安装并运行")
        print(f"2. 已创建并启动了代理端口")
        print(f"3. 端口配置正确")
        return False
    
    print(f"\n[SUCCESS] 使用端口 {working_port} 进行完整测试")
    print("=" * 50)
    
    async with LocalRotatingSession(working_port) as session:
        
        # 测试1: IP轮换验证
        print(f"\n[测试1] IP轮换验证")
        print("-" * 30)
        
        ips_seen = set()
        for i in range(5):
            try:
                response = await session.get("https://httpbin.org/ip")
                if response.status == 200:
                    data = await response.json()
                    ip = data.get('origin', 'unknown')
                    ips_seen.add(ip)
                    print(f"  第{i+1}次请求 IP: {ip}")
                response.close()
            except Exception as e:
                print(f"  第{i+1}次请求失败: {e}")
        
        print(f"  总共获得 {len(ips_seen)} 个不同IP")
        
        # 测试2: Polymarket访问
        print(f"\n[测试2] Polymarket访问测试")
        print("-" * 30)
        
        polymarket_tests = [
            ("Ping端点", "https://clob.polymarket.com/ping"),
            ("市场数据", "https://clob.polymarket.com/markets?limit=3"),
        ]
        
        success_count = 0
        
        for name, url in polymarket_tests:
            print(f"  测试: {name}")
            
            try:
                response = await session.get(url)
                print(f"    状态码: {response.status}")
                
                if response.status == 200:
                    if 'ping' in url:
                        text = await response.text()
                        print(f"    [SUCCESS] 响应: {text}")
                    else:
                        data = await response.json()
                        print(f"    [SUCCESS] 获取 {len(data)} 个市场")
                    success_count += 1
                    
                elif response.status == 403:
                    print(f"    [BLOCKED] 仍被阻断")
                elif response.status == 404:
                    print(f"    [ERROR] 端点不存在")
                else:
                    print(f"    [OTHER] 状态: {response.status}")
                
                response.close()
                
            except Exception as e:
                print(f"    [ERROR] 请求失败: {e}")
        
        print(f"\n" + "=" * 70)
        print(f"Polymarket测试结果: {success_count}/{len(polymarket_tests)} 成功")
        
        if success_count > 0:
            print(f"[SUCCESS] 本地Proxy Manager有效!")
            print(f"[配置] 代理地址: http://127.0.0.1:{working_port}")
            print(f"[建议] 集成到交易系统中使用")
            return True
        else:
            print(f"[PARTIAL] Proxy Manager工作正常，但Polymarket仍需优化")
            print(f"[建议] 在Proxy Manager中调整配置或联系技术支持")
            return False

async def generate_integration_code(working_port):
    """生成集成代码示例"""
    print(f"\n" + "=" * 70)
    print("交易系统集成代码")
    print("=" * 70)
    
    integration_code = f'''
# 在你的交易系统中使用本地Proxy Manager

import aiohttp

class TradingSystemProxy:
    def __init__(self):
        self.proxy_url = "http://127.0.0.1:{working_port}"
    
    async def fetch_markets(self):
        async with aiohttp.ClientSession() as session:
            response = await session.get(
                "https://clob.polymarket.com/markets",
                proxy=self.proxy_url
            )
            return await response.json()
    
    async def fetch_orderbook(self, token_id):
        async with aiohttp.ClientSession() as session:
            response = await session.get(
                f"https://clob.polymarket.com/book?token_id={{token_id}}",
                proxy=self.proxy_url
            )
            return await response.json()

# 使用方法:
# trading_proxy = TradingSystemProxy()
# markets = await trading_proxy.fetch_markets()
'''
    
    print(integration_code)
    
    with open("proxy_integration_example.py", "w", encoding="utf-8") as f:
        f.write(integration_code)
    
    print(f"\n[文件] 集成代码已保存到: proxy_integration_example.py")

if __name__ == "__main__":
    print("[提示] 请确保Proxy Manager已安装并运行")
    print("[提示] 请确保已创建并启动了代理端口")
    print()
    
    success = asyncio.run(test_local_proxy_manager())
    
    if success:
        asyncio.run(generate_integration_code(24000))  # 使用找到的端口
    
    print(f"\n[下一步] 根据测试结果:")
    if success:
        print("✅ 将代理配置集成到交易系统")
        print("✅ 启动真实数据的在线测试")
    else:
        print("⚠️  在Proxy Manager中调整配置")
        print("⚠️  或联系Bright Data技术支持")