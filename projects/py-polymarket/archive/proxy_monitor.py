#!/usr/bin/env python3
"""
代理监控增强模块 - 检测代理中断并停止服务
"""

import asyncio
import aiohttp
import logging
from datetime import datetime
from typing import Optional, Dict
from proxy_config import ProxySession

logger = logging.getLogger(__name__)

class ProxyMonitorError(Exception):
    """代理监控异常"""
    pass

class EnhancedProxyMonitor:
    """增强版代理监控器"""
    
    def __init__(self, use_proxy: bool = True):
        self.use_proxy = use_proxy
        self.proxy_failures = 0
        self.max_failures = 3  # 最大失败次数
        self.last_success_time = None
        self.monitor_interval = 300  # 5分钟检查一次
        
    async def test_proxy_connection(self) -> bool:
        """测试代理连接"""
        if not self.use_proxy:
            return True
            
        try:
            from proxy_config import FixedProxySession
            async with FixedProxySession(use_proxy=True) as session:
                # 测试连接到一个简单的API
                test_url = "https://httpbin.org/ip"
                response = await session.get(test_url)
                
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"[PROXY] 代理连接正常，IP: {data.get('origin', 'unknown')}")
                    self.proxy_failures = 0
                    self.last_success_time = datetime.now()
                    response.close()
                    return True
                else:
                    logger.warning(f"[PROXY] 代理响应异常，状态码: {response.status}")
                    response.close()
                    return False
                        
        except asyncio.TimeoutError:
            logger.error("[PROXY] 代理连接超时")
            return False
        except Exception as e:
            logger.error(f"[PROXY] 代理连接失败: {e}")
            return False
    
    async def check_proxy_quota(self) -> Dict:
        """检查代理配额（如果可用）"""
        try:
            # 这里可以添加特定代理服务商的配额查询API
            # 目前返回基本信息
            return {
                "status": "unknown",
                "remaining_requests": "unknown",
                "quota_used": "unknown"
            }
        except Exception as e:
            logger.warning(f"[PROXY] 无法获取配额信息: {e}")
            return {"status": "error", "message": str(e)}
    
    async def monitor_proxy_health(self) -> bool:
        """监控代理健康状态"""
        if not self.use_proxy:
            return True
            
        is_healthy = await self.test_proxy_connection()
        
        if not is_healthy:
            self.proxy_failures += 1
            logger.warning(f"[PROXY] 代理检测失败 ({self.proxy_failures}/{self.max_failures})")
            
            if self.proxy_failures >= self.max_failures:
                logger.error("[PROXY] 代理连续失败次数超限，服务将停止")
                return False
        
        return True

class ProxyAwareDataFetcher:
    """带代理监控的数据获取器"""
    
    def __init__(self, use_proxy: bool = True, offline_mode: bool = False):
        self.base_url = "https://clob.polymarket.com"
        self.session = None
        self.use_proxy = use_proxy
        self.offline_mode = offline_mode
        self.proxy_monitor = EnhancedProxyMonitor(use_proxy)
        
        if offline_mode:
            logger.info("[OFFLINE] 离线模式已启用")
        elif use_proxy:
            logger.info("[PROXY] 代理模式已启用，将监控代理状态")
        else:
            logger.info("[DIRECT] 直连模式已启用")
    
    async def __aenter__(self):
        if self.offline_mode:
            return self
            
        # 首先检查代理状态
        if self.use_proxy:
            proxy_healthy = await self.proxy_monitor.monitor_proxy_health()
            if not proxy_healthy:
                raise ProxyMonitorError("代理服务不可用，停止数据获取服务")
        
        self.session = ProxySession(use_proxy=self.use_proxy)
        self.session = await self.session.__aenter__()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.__aexit__(exc_type, exc_val, exc_tb)
    
    async def fetch_with_proxy_check(self, url: str, **kwargs) -> Optional[aiohttp.ClientResponse]:
        """带代理检查的数据获取"""
        if self.offline_mode:
            # 返回模拟数据
            return None
            
        try:
            # 执行请求前检查代理状态
            if self.use_proxy:
                proxy_healthy = await self.proxy_monitor.monitor_proxy_health()
                if not proxy_healthy:
                    raise ProxyMonitorError("代理服务中断，无法继续获取数据")
            
            response = await self.session.get(url, **kwargs)
            return response
            
        except ProxyMonitorError:
            raise  # 重新抛出代理错误
        except Exception as e:
            logger.error(f"[FETCH] 数据获取失败: {e}")
            
            # 如果是代理相关错误，增加失败计数
            if self.use_proxy and any(keyword in str(e).lower() for keyword in ['proxy', 'timeout', 'connection']):
                self.proxy_monitor.proxy_failures += 1
                logger.warning(f"[PROXY] 疑似代理问题，失败计数: {self.proxy_monitor.proxy_failures}")
                
                if self.proxy_monitor.proxy_failures >= self.proxy_monitor.max_failures:
                    raise ProxyMonitorError(f"代理连续失败，原因: {e}")
            
            return None

async def test_proxy_monitor():
    """测试代理监控功能"""
    print("=" * 60)
    print("代理监控功能测试")
    print("=" * 60)
    
    try:
        monitor = EnhancedProxyMonitor(use_proxy=True)
        
        print("[TEST] 测试代理连接...")
        is_healthy = await monitor.test_proxy_connection()
        
        if is_healthy:
            print("[OK] 代理连接正常")
            
            print("[TEST] 检查代理配额...")
            quota = await monitor.check_proxy_quota()
            print(f"[INFO] 配额状态: {quota}")
            
        else:
            print("[ERROR] 代理连接失败")
            
    except Exception as e:
        print(f"[ERROR] 测试失败: {e}")

if __name__ == "__main__":
    asyncio.run(test_proxy_monitor())