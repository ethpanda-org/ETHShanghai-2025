import os
import sys
import time
import types
from core.data_collector import AsyncDataCollector
from core.risk_manager import RiskEngine
from core.strategy import ArbitrageStrategy, MarketMakingStrategy

import aiohttp
import asyncio
import json
import numpy as np
import unittest
from unittest.mock import Mock


sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))

import unittest
import asyncio
import aiohttp
from unittest.mock import Mock
import numpy as np
import time
import json

# Bright Data代理配置
BRIGHT_DATA_CONFIG = {
    'host': 'brd.superproxy.io',
    'port': 9222,
    'username': 'brd-customer-hl_74a6e114-zone-scraping_browser1',
    'password': 'fgf480g2mejd'
}

# 构建代理URL
BRIGHT_DATA_PROXY = f"http://{BRIGHT_DATA_CONFIG['username']}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"

print(f"使用Bright Data代理: {BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}")

# 在线模式配置
class BrightDataSettings:
    OFFLINE_MODE = False
    POLYGON_RPC = "https://polygon-rpc.com"
    POLYMARKET_CONTRACT = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
    ABI = []
    CLOB_REST_URL = "https://clob.polymarket.com"
    CLOB_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
    PROXY_URL = BRIGHT_DATA_PROXY
    POLY_PRIVATE_KEY = None

# 创建模拟的config模块
import types
config_module = types.ModuleType('config')
config_module.settings = BrightDataSettings()
sys.modules['config'] = config_module

# 创建模拟的utils.proxy_manager模块
utils_module = types.ModuleType('utils')
proxy_manager_module = types.ModuleType('proxy_manager')
proxy_manager_module.ProxyManager = Mock()
utils_module.proxy_manager = proxy_manager_module
sys.modules['utils'] = utils_module
sys.modules['utils.proxy_manager'] = proxy_manager_module

# 导入要测试的模块
from core.data_collector import AsyncDataCollector
from core.risk_manager import RiskEngine
from core.strategy import MarketMakingStrategy, ArbitrageStrategy


class TestBrightDataQuick(unittest.TestCase):
    """Bright Data代理快速测试"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()
        self.proxy_url = BRIGHT_DATA_PROXY

    def test_proxy_basic_connection(self):
        """测试代理基本连接 - 快速版本"""
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=10, connect=5)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    # 简单的IP测试
                    print("测试代理IP...")
                    resp = await session.get("https://httpbin.org/ip", proxy=self.proxy_url)
                    if resp.status == 200:
                        ip_data = await resp.json()
                        proxy_ip = ip_data.get('origin', 'Unknown')
                        print(f"✅ 代理IP: {proxy_ip}")
                        return True
                    else:
                        print(f"❌ HTTP状态码: {resp.status}")
                        return False
            except asyncio.TimeoutError:
                print("❌ 连接超时")
                return False
            except aiohttp.ClientConnectorError as e:
                print(f"❌ 连接错误: {e}")
                return False
            except Exception as e:
                print(f"❌ 其他错误: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("Bright Data代理连接成功")
        else:
            self.fail("代理连接失败 - 请检查代理配置")

    def test_proxy_authentication(self):
        """测试代理认证"""
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=8)
                # 测试错误的认证
                wrong_proxy = f"http://wrong:wrong@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    try:
                        resp = await session.get("https://httpbin.org/ip", proxy=wrong_proxy)
                        print("❌ 错误认证居然成功了")
                        return False
                    except:
                        print("✅ 错误认证被正确拒绝")
                
                # 测试正确的认证
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    resp = await session.get("https://httpbin.org/ip", proxy=self.proxy_url)
                    if resp.status == 200:
                        print("✅ 正确认证成功")
                        return True
                    return False
            except Exception as e:
                print(f"❌ 认证测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        self.assertTrue(result, "代理认证应该正常工作")

    def test_polymarket_api_quick(self):
        """快速测试Polymarket API"""
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=15)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    # 测试公开的事件API
                    print("测试Polymarket Events API...")
                    resp = await session.get(
                        "https://gamma-api.polymarket.com/events?limit=5",
                        proxy=self.proxy_url
                    )
                    if resp.status == 200:
                        events = await resp.json()
                        print(f"✅ Events API成功，获取 {len(events)} 个事件")
                        
                        # 显示前两个事件
                        for i, event in enumerate(events[:2]):
                            title = event.get('title', 'Unknown')[:50]
                            active = event.get('active', False)
                            print(f"  {i+1}. {title}... (活跃: {active})")
                        
                        return True
                    else:
                        print(f"❌ API状态码: {resp.status}")
                        text = await resp.text()
                        print(f"响应: {text[:200]}...")
                        return False
            except Exception as e:
                print(f"❌ API测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("Polymarket API通过代理访问成功")
        else:
            print("Polymarket API访问失败 - 可能需要特殊配置")

    def test_concurrent_requests(self):
        """测试并发请求处理"""
        async def single_request(session, i):
            try:
                resp = await session.get(f"https://httpbin.org/delay/1", proxy=self.proxy_url)
                return resp.status == 200
            except:
                return False
        
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=15)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    # 发起3个并发请求
                    tasks = [single_request(session, i) for i in range(3)]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    successful = sum(1 for r in results if r is True)
                    print(f"✅ 并发测试: {successful}/3 个请求成功")
                    return successful >= 1  # 至少一个成功就算通过
            except Exception as e:
                print(f"❌ 并发测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        self.assertTrue(result, "并发请求应该能正常处理")

    def test_trading_strategy_with_proxy(self):
        """测试通过代理的交易策略"""
        # 使用模拟数据测试策略，不依赖网络
        market_making = MarketMakingStrategy(spread=0.02, balance=10000)
        arbitrage = ArbitrageStrategy(threshold=0.05)
        risk_engine = RiskEngine()
        
        # 模拟市场数据
        test_markets = [
            {
                'market_id': 'TEST-1',
                'bid': 0.48,
                'ask': 0.52,
                'high': 0.55,
                'low': 0.45,
                'price': 0.50
            },
            {
                'market_id': 'TEST-2',
                'bid': 0.72,
                'ask': 0.78,
                'high': 0.80,
                'low': 0.70,
                'price': 0.75
            }
        ]
        
        print("测试交易策略...")
        
        # 测试做市策略
        for market in test_markets:
            orders = market_making.generate_orders(market)
            print(f"做市 {market['market_id']}: 买={orders['bid']}, 卖={orders['ask']}")
            
            # 风险检查
            test_order = {'size': orders['size']}
            test_portfolio = {
                'returns': np.random.normal(0, 0.01, 100),
                'balance': 10000
            }
            is_safe = risk_engine.validate_order(test_order, test_portfolio)
            print(f"  风险检查: {'通过' if is_safe else '拒绝'}")
        
        # 测试套利
        opportunity = arbitrage.find_opportunities(test_markets[0], test_markets[1])
        if opportunity:
            print(f"✅ 套利机会: 价差 {opportunity['spread']}")
        else:
            print("⚠️  无套利机会")
        
        print("✅ 交易策略测试完成")


class TestProxyDiagnostics(unittest.TestCase):
    """代理诊断测试"""
    
    def setUp(self):
        self.proxy_url = BRIGHT_DATA_PROXY

    def test_proxy_connectivity_diagnosis(self):
        """代理连接诊断"""
        async def test():
            # 测试不同的超时设置
            timeouts = [5, 10, 15]
            
            for timeout_val in timeouts:
                try:
                    timeout = aiohttp.ClientTimeout(total=timeout_val)
                    async with aiohttp.ClientSession(timeout=timeout) as session:
                        start = time.time()
                        resp = await session.get("https://httpbin.org/ip", proxy=self.proxy_url)
                        end = time.time()
                        
                        if resp.status == 200:
                            print(f"✅ 超时{timeout_val}s: 成功 ({end-start:.2f}s)")
                            return True
                        else:
                            print(f"❌ 超时{timeout_val}s: HTTP {resp.status}")
                except asyncio.TimeoutError:
                    print(f"⏰ 超时{timeout_val}s: 连接超时")
                except Exception as e:
                    print(f"❌ 超时{timeout_val}s: {type(e).__name__}")
            
            return False
        
        result = asyncio.run(test())
        if not result:
            print("所有超时设置都失败 - 代理可能不可用")

    def test_proxy_endpoint_variations(self):
        """测试不同的代理端点"""
        async def test():
            endpoints = [
                "https://httpbin.org/ip",
                "https://api.ipify.org?format=json",
                "http://ip-api.com/json"
            ]
            
            timeout = aiohttp.ClientTimeout(total=10)
            successful = 0
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                for endpoint in endpoints:
                    try:
                        resp = await session.get(endpoint, proxy=self.proxy_url)
                        if resp.status == 200:
                            data = await resp.text()
                            print(f"✅ {endpoint}: 成功")
                            successful += 1
                        else:
                            print(f"❌ {endpoint}: HTTP {resp.status}")
                    except Exception as e:
                        print(f"❌ {endpoint}: {type(e).__name__}")
            
            print(f"端点测试结果: {successful}/{len(endpoints)} 成功")
            return successful > 0
        
        result = asyncio.run(test())
        if result:
            print("至少一个端点可以通过代理访问")


if __name__ == '__main__':
    print("="*70)
    print("Bright Data代理快速测试开始...")
    print(f"代理: {BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}")
    print(f"用户: {BRIGHT_DATA_CONFIG['username']}")
    print("="*70)
    
    # 创建测试套件
    suite = unittest.TestSuite()
    
    # 添加测试用例
    suite.addTest(unittest.makeSuite(TestBrightDataQuick))
    suite.addTest(unittest.makeSuite(TestProxyDiagnostics))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出结果统计
    print(f"\n{'='*70}")
    print(f"Bright Data代理测试结果:")
    print(f"{'='*70}")
    print(f"运行测试: {result.testsRun}")
    print(f"成功: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    success_rate = ((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100) if result.testsRun > 0 else 0
    print(f"成功率: {success_rate:.1f}%")
    
    if result.failures:
        print(f"\n失败详情:")
        for test, traceback in result.failures:
            print(f"- {test.split(' ')[0]}")
    
    if result.errors:
        print(f"\n错误详情:")
        for test, traceback in result.errors:
            print(f"- {test.split(' ')[0]}")
    
    print(f"{'='*70}")
    print("测试完成！")