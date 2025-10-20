#!/usr/bin/env python3
"""
修复版代理配置管理模块
"""

import os
import random
import asyncio
import aiohttp
from typing import Optional, List, Dict
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

class ProxyManager:
    """代理管理器"""
    
    def __init__(self):
        self.proxy_pools = self._load_proxy_config()
        self.current_proxy = None
        self.failed_proxies = set()
        
    def _load_proxy_config(self) -> List[Dict]:
        """加载代理配置"""
        proxies = []
        
        # 使用最新的Bright Data代理配置
        bright_data_proxy = "http://brd-customer-hl_27b741ac-zone-residential_proxy1:vslhbidpdl4f@brd.superproxy.io:33335"
        proxies.append({
            'http': bright_data_proxy,
            'https': bright_data_proxy
        })
        
        # 从环境变量加载额外代理
        proxy_list = os.getenv('PROXY_LIST', '').strip()
        if proxy_list:
            for proxy_str in proxy_list.split(','):
                proxy_str = proxy_str.strip()
                if proxy_str and proxy_str != bright_data_proxy:
                    proxies.append({
                        'http': proxy_str,
                        'https': proxy_str
                    })
        
        return proxies
    
    def get_random_proxy(self) -> Optional[Dict]:
        """获取随机代理"""
        if not self.proxy_pools:
            return None
            
        available_proxies = [p for p in self.proxy_pools 
                           if p.get('http') not in self.failed_proxies]
        
        if not available_proxies:
            # 重置失败代理列表
            self.failed_proxies.clear()
            available_proxies = self.proxy_pools
        
        if available_proxies:
            self.current_proxy = random.choice(available_proxies)
            return self.current_proxy
        
        return None
    
    def mark_proxy_failed(self, proxy: Dict):
        """标记代理失败"""
        if proxy and proxy.get('http'):
            self.failed_proxies.add(proxy['http'])
    
    def get_current_proxy(self) -> Optional[Dict]:
        """获取当前代理"""
        return self.current_proxy

class FixedProxySession:
    """修复版支持代理的HTTP会话"""
    
    def __init__(self, use_proxy: bool = True):
        self.proxy_manager = ProxyManager()
        self.use_proxy = use_proxy
        self.session = None
        self.current_proxy = None
        
    async def __aenter__(self):
        """异步上下文管理器入口"""
        # 获取代理配置
        if self.use_proxy:
            proxy_config = self.proxy_manager.get_random_proxy()
            if proxy_config:
                self.current_proxy = proxy_config.get('http')
                logger.info(f"[PROXY] 使用代理: {self.current_proxy}")
            else:
                logger.warning("[PROXY] 未配置代理，使用直连")
        
        # 配置连接器
        connector = aiohttp.TCPConnector(
            limit=50,
            limit_per_host=10,
            ttl_dns_cache=300,
            use_dns_cache=True,
            ssl=False,  # 禁用SSL验证
        )
        
        # 配置超时
        timeout = aiohttp.ClientTimeout(
            total=30,
            connect=15,
            sock_read=15
        )
        
        # 配置请求头
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        # 创建会话
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers
        )
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器退出"""
        if self.session:
            await self.session.close()
    
    async def get(self, url: str, **kwargs):
        """GET请求"""
        if not self.session:
            raise RuntimeError("Session not initialized. Use 'async with' statement.")
        
        # 添加代理参数
        if self.current_proxy:
            kwargs['proxy'] = self.current_proxy
        
        try:
            response = await self.session.get(url, **kwargs)
            return response
        except Exception as e:
            logger.error(f"[PROXY] 请求失败: {e}")
            # 标记代理失败
            if self.current_proxy:
                self.proxy_manager.mark_proxy_failed({'http': self.current_proxy})
            raise
    
    async def post(self, url: str, **kwargs):
        """POST请求"""
        if not self.session:
            raise RuntimeError("Session not initialized. Use 'async with' statement.")
        
        # 添加代理参数
        if self.current_proxy:
            kwargs['proxy'] = self.current_proxy
        
        try:
            response = await self.session.post(url, **kwargs)
            return response
        except Exception as e:
            logger.error(f"[PROXY] 请求失败: {e}")
            # 标记代理失败
            if self.current_proxy:
                self.proxy_manager.mark_proxy_failed({'http': self.current_proxy})
            raise

# 兼容性别名
ProxySession = FixedProxySession

async def test_proxy_session():
    """测试修复后的ProxySession"""
    print("=" * 60)
    print("测试修复后的ProxySession")
    print("=" * 60)
    
    try:
        async with FixedProxySession(use_proxy=True) as session:
            print("[TEST] 测试代理连接...")
            
            # 测试连接到Bright Data测试端点
            test_url = "https://geo.brdtest.com/mygeo.json"
            response = await session.get(test_url)
            
            if response.status == 200:
                data = await response.json()
                print(f"[OK] 代理连接成功!")
                print(f"[INFO] 返回IP: {data.get('ip', 'unknown')}")
                print(f"[INFO] 国家: {data.get('country', 'unknown')}")
                print(f"[INFO] 城市: {data.get('city', 'unknown')}")
                
                # 关闭响应
                response.close()
                return True
            else:
                print(f"[ERROR] 响应状态码: {response.status}")
                response.close()
                return False
                    
    except Exception as e:
        print(f"[ERROR] 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_proxy_session())