#!/usr/bin/env python3
"""
Proxy Manager配置优化和最终集成方案
"""

import asyncio
import aiohttp
import ssl
import random
import time

def proxy_manager_optimization_guide():
    print("=" * 70)
    print("Proxy Manager 配置优化指南")
    print("=" * 70)
    
    print("\n[当前问题分析]")
    print("✅ Proxy Manager基础连接正常")
    print("❌ IP轮换未生效 (5次请求同一IP)")
    print("❌ Polymarket连接超时")
    
    print("\n[Proxy Manager配置优化]")
    print("请在Proxy Manager中调整以下设置:")
    print()
    print("1. 点击你的代理端口 (24000)")
    print("2. 点击 'Edit' 或 '设置' 按钮")
    print("3. 修改以下配置:")
    print()
    print("   [Session设置]")
    print("   ✓ Session: false (禁用会话保持)")
    print("   ✓ Keep-alive: 0 (禁用保持连接)")
    print("   ✓ Pool size: 100 (增加IP池大小)")
    print()
    print("   [轮换设置]")
    print("   ✓ IP rotation: 'every_request' (每次请求轮换)")
    print("   ✓ Session duration: 0 (立即轮换)")
    print("   ✓ Sticky IP: false (禁用粘性IP)")
    print()
    print("   [地理位置]")
    print("   ✓ Country: 'US' (美国)")
    print("   ✓ State: 留空或选择 'California'")
    print("   ✓ City: 留空")
    print()
    print("   [高级设置]")
    print("   ✓ DNS: 1.1.1.1")
    print("   ✓ Direct: false")
    print("   ✓ Debug: info")
    print()
    print("4. 点击 'Save' 保存")
    print("5. 重启端口 (Stop -> Start)")

class OptimizedLocalProxy:
    """优化后的本地代理会话"""
    
    def __init__(self, proxy_port=24000):
        self.proxy_port = proxy_port
        self.proxy_url = f"http://127.0.0.1:{proxy_port}"
        self.session = None
        self.request_count = 0
        
    async def __aenter__(self):
        # 更宽松的SSL和连接配置
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        ssl_context.set_ciphers('DEFAULT:@SECLEVEL=1')
        
        connector = aiohttp.TCPConnector(
            ssl=ssl_context,
            limit=50,
            limit_per_host=10,
            ttl_dns_cache=600,
            use_dns_cache=True,
            enable_cleanup_closed=True,
            force_close=False,  # 不强制关闭连接
            keepalive_timeout=60
        )
        
        # 更长的超时时间
        timeout = aiohttp.ClientTimeout(
            total=60,     # 总超时60秒
            connect=30,   # 连接超时30秒
            sock_read=30  # 读取超时30秒
        )
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
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
    
    async def safe_request(self, url, **kwargs):
        """安全的请求方法"""
        
        # 每次请求间隔
        if self.request_count > 0:
            await asyncio.sleep(random.uniform(5, 10))
        
        self.request_count += 1
        kwargs['proxy'] = self.proxy_url
        
        print(f"[请求 {self.request_count}] {url}")
        
        try:
            response = await self.session.get(url, **kwargs)
            return response
        except asyncio.TimeoutError:
            print(f"  [TIMEOUT] 请求超时，可能需要调整Proxy Manager配置")
            raise
        except Exception as e:
            print(f"  [ERROR] 请求失败: {e}")
            raise

async def final_polymarket_test():
    """最终Polymarket访问测试"""
    print("\n" + "=" * 70)
    print("最终Polymarket访问测试")
    print("=" * 70)
    
    async with OptimizedLocalProxy(24000) as proxy:
        
        # 测试1: 验证IP轮换（优化后）
        print("\n[验证] IP轮换测试")
        print("-" * 30)
        
        ips = []
        for i in range(3):  # 减少到3次测试
            try:
                response = await proxy.safe_request("https://httpbin.org/ip")
                if response.status == 200:
                    data = await response.json()
                    ip = data.get('origin', 'unknown')
                    ips.append(ip)
                    print(f"  测试{i+1}: {ip}")
                response.close()
            except Exception as e:
                print(f"  测试{i+1} 失败: {e}")
        
        unique_ips = len(set(ips))
        print(f"  结果: {unique_ips}/{len(ips)} 个不同IP")
        
        if unique_ips < 2:
            print(f"  [WARNING] IP轮换可能未生效，请检查Proxy Manager配置")
        
        # 测试2: Polymarket访问
        print(f"\n[最终测试] Polymarket API访问")
        print("-" * 30)
        
        test_urls = [
            "https://clob.polymarket.com/ping",
            "https://clob.polymarket.com/markets?limit=1",
        ]
        
        success_count = 0
        
        for url in test_urls:
            try:
                response = await proxy.safe_request(url)
                
                print(f"  状态码: {response.status}")
                
                if response.status == 200:
                    try:
                        if 'ping' in url:
                            text = await response.text()
                            print(f"  [SUCCESS] Ping: {text}")
                        else:
                            data = await response.json()
                            print(f"  [SUCCESS] 数据: {len(data)} 个市场")
                        success_count += 1
                    except Exception as e:
                        print(f"  [SUCCESS] 连接成功但解析失败: {e}")
                        success_count += 1
                        
                elif response.status == 403:
                    print(f"  [BLOCKED] 访问被拒绝")
                elif response.status == 404:
                    print(f"  [ERROR] 端点不存在")
                else:
                    print(f"  [OTHER] 状态码: {response.status}")
                
                response.close()
                
            except Exception as e:
                print(f"  [ERROR] 连接失败: {e}")
        
        print(f"\n" + "=" * 70)
        print(f"最终测试结果: {success_count}/{len(test_urls)} 成功")
        
        if success_count >= 1:
            print("[SUCCESS] 找到有效的访问方式!")
            print("[行动] 可以集成到交易系统进行真实数据测试")
            return True
        else:
            print("[FAILED] 仍需进一步优化")
            print("[建议] 联系Bright Data技术支持获得专业配置")
            return False

if __name__ == "__main__":
    proxy_manager_optimization_guide()
    
    print(f"\n请按照上述指南优化Proxy Manager配置")
    print(f"完成后按回车键继续测试...")
    input()
    
    print(f"\n开始最终测试...")
    success = asyncio.run(final_polymarket_test())
    
    if success:
        print(f"\n[下一步] 集成到交易系统并启动在线测试")
    else:
        print(f"\n[下一步] 需要进一步优化或寻求技术支持")