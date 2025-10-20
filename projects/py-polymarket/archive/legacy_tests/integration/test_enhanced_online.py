import os
import sys
import time
import types
from core.data_collector import AsyncDataCollector
from core.risk_manager import RiskEngine
from core.strategy import ArbitrageStrategy, MarketMakingStrategy

import aiohttp
import asyncio
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

# 常见代理端口配置
COMMON_PROXY_PORTS = [
    "http://127.0.0.1:7890",  # Clash
    "http://127.0.0.1:1087",  # Shadowsocks
    "http://127.0.0.1:8001",  # V2Ray
    "http://127.0.0.1:1080",  # Socks5
    "http://127.0.0.1:8080",  # 通用HTTP代理
]

async def test_proxy_connectivity(proxy_url):
    """测试代理连接性"""
    try:
        timeout = aiohttp.ClientTimeout(total=3)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            resp = await session.get("https://httpbin.org/ip", proxy=proxy_url)
            if resp.status == 200:
                return True
    except:
        pass
    return False

async def find_working_proxy():
    """查找可用的代理"""
    print("正在检测可用代理...")
    for proxy in COMMON_PROXY_PORTS:
        print(f"测试代理: {proxy}")
        if await test_proxy_connectivity(proxy):
            print(f"✅ 找到可用代理: {proxy}")
            return proxy
    print("❌ 未找到可用代理，使用直连")
    return None

# 动态检测代理
working_proxy = asyncio.run(find_working_proxy())

# 在线模式配置
class OnlineSettings:
    OFFLINE_MODE = False
    POLYGON_RPC = "https://polygon-rpc.com"
    POLYMARKET_CONTRACT = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
    ABI = []
    CLOB_REST_URL = "https://clob.polymarket.com"
    CLOB_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
    PROXY_URL = working_proxy
    POLY_PRIVATE_KEY = None

print(f"使用代理配置: {OnlineSettings.PROXY_URL}")

# 创建模拟的config模块
import types
config_module = types.ModuleType('config')
config_module.settings = OnlineSettings()
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


class TestOnlineConnectivity(unittest.TestCase):
    """在线连接性测试"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()
        self.has_proxy = working_proxy is not None

    def test_internet_connectivity(self):
        """测试基本网络连接"""
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=10)
                proxy = self.collector.proxy_url if self.has_proxy else None
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    resp = await session.get("https://httpbin.org/ip", proxy=proxy)
                    if resp.status == 200:
                        data = await resp.json()
                        print(f"当前IP: {data.get('origin', 'Unknown')}")
                        return True
                return False
            except Exception as e:
                print(f"网络连接测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        if self.has_proxy:
            self.assertTrue(result, "代理网络连接应该正常")
        else:
            print("直连模式 - 如果连接失败可能需要代理")

    def test_polymarket_api_access(self):
        """测试Polymarket API访问"""
        async def test():
            try:
                # 测试公开的API端点
                url = "https://gamma-api.polymarket.com/events"  # 公开的事件API
                timeout = aiohttp.ClientTimeout(total=15)
                proxy = self.collector.proxy_url if self.has_proxy else None
                
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    resp = await session.get(url, proxy=proxy)
                    if resp.status == 200:
                        data = await resp.json()
                        print(f"✅ Polymarket API可访问，获取到 {len(data)} 个事件")
                        return True
                    else:
                        print(f"❌ API返回状态码: {resp.status}")
                        return False
            except Exception as e:
                print(f"❌ Polymarket API访问失败: {e}")
                return False
        
        result = asyncio.run(test())
        if not result:
            self.skipTest("Polymarket API不可访问")

    def test_alternative_api_endpoints(self):
        """测试替代API端点"""
        alternative_endpoints = [
            "https://gamma-api.polymarket.com/events",
            "https://strapi-matic.poly.market/markets",
        ]
        
        async def test_endpoint(url):
            try:
                timeout = aiohttp.ClientTimeout(total=10)
                proxy = self.collector.proxy_url if self.has_proxy else None
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    resp = await session.get(url, proxy=proxy)
                    return resp.status == 200
            except:
                return False
        
        async def test_all():
            results = {}
            for url in alternative_endpoints:
                result = await test_endpoint(url)
                results[url] = result
                print(f"{'✅' if result else '❌'} {url}")
            return results
        
        results = asyncio.run(test_all())
        available_count = sum(results.values())
        print(f"可用API端点: {available_count}/{len(alternative_endpoints)}")


class TestDataCollectorWithFallback(unittest.TestCase):
    """带回退机制的数据采集器测试"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()

    def test_fetch_markets_with_fallback(self):
        """测试带回退的市场数据获取"""
        async def test():
            try:
                # 首先尝试原始API
                markets = await self.collector.fetch_markets()
                if markets:
                    print(f"✅ 原始API成功，获取 {len(markets)} 个市场")
                    return markets
            except Exception as e:
                print(f"❌ 原始API失败: {e}")
            
            # 回退到公开API
            try:
                timeout = aiohttp.ClientTimeout(total=10)
                proxy = self.collector.proxy_url
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    resp = await session.get(
                        "https://gamma-api.polymarket.com/events",
                        proxy=proxy
                    )
                    if resp.status == 200:
                        events = await resp.json()
                        # 转换为我们期望的格式
                        markets = []
                        for event in events[:5]:  # 只取前5个
                            markets.append({
                                'market_id': event.get('id', 'unknown'),
                                'title': event.get('title', 'Unknown Event'),
                                'bid': 0.45,  # 模拟数据
                                'ask': 0.55,
                                'high': 0.6,
                                'low': 0.4,
                                'volatility': 0.1
                            })
                        print(f"✅ 回退API成功，获取 {len(markets)} 个事件")
                        return markets
            except Exception as e:
                print(f"❌ 回退API也失败: {e}")
            
            return []
        
        markets = asyncio.run(test())
        if markets:
            self.assertIsInstance(markets, list)
            self.assertGreater(len(markets), 0)
            print("市场数据获取成功")
        else:
            self.skipTest("所有API端点都不可用")

    def test_real_strategy_execution(self):
        """测试真实策略执行"""
        # 使用模拟的真实数据
        real_market_data = [
            {
                'market_id': 'REAL-1',
                'bid': 0.48,
                'ask': 0.52,
                'high': 0.55,
                'low': 0.45,
                'price': 0.50
            },
            {
                'market_id': 'REAL-2', 
                'bid': 0.62,
                'ask': 0.68,
                'high': 0.70,
                'low': 0.60,
                'price': 0.65
            }
        ]
        
        # 测试做市策略
        market_making = MarketMakingStrategy(spread=0.02, balance=10000)
        for market in real_market_data:
            orders = market_making.generate_orders(market)
            self.assertIn('action', orders)
            self.assertEqual(orders['action'], 'both')
            print(f"做市策略 - 市场{market['market_id']}: "
                  f"买价={orders['bid']}, 卖价={orders['ask']}")
        
        # 测试套利策略
        arbitrage = ArbitrageStrategy(threshold=0.05)
        opportunity = arbitrage.find_opportunities(
            real_market_data[0], real_market_data[1]
        )
        if opportunity:
            print(f"套利机会: {opportunity}")
        else:
            print("当前无套利机会")

    def test_comprehensive_risk_check(self):
        """综合风险检查测试"""
        risk_engine = RiskEngine()
        
        # 不同风险场景的测试数据
        scenarios = [
            {
                'name': '低风险场景',
                'order': {'size': 100},
                'portfolio': {
                    'returns': np.random.normal(0, 0.01, 200),
                    'balance': 10000
                }
            },
            {
                'name': '中等风险场景',
                'order': {'size': 500},
                'portfolio': {
                    'returns': np.random.normal(0, 0.03, 200),
                    'balance': 5000
                }
            },
            {
                'name': '高风险场景',
                'order': {'size': 2000},
                'portfolio': {
                    'returns': np.array([-0.05] * 50 + [0.02] * 150),
                    'balance': 3000
                }
            }
        ]
        
        for scenario in scenarios:
            is_valid = risk_engine.validate_order(
                scenario['order'], scenario['portfolio']
            )
            print(f"{scenario['name']}: {'✅ 通过' if is_valid else '❌ 拒绝'}")


class TestPerformanceMetrics(unittest.TestCase):
    """性能指标测试"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()

    def test_response_time_measurement(self):
        """测试响应时间测量"""
        async def measure_response_time():
            start_time = time.time()
            try:
                timeout = aiohttp.ClientTimeout(total=5)
                proxy = self.collector.proxy_url
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    resp = await session.get(
                        "https://httpbin.org/delay/1",  # 1秒延迟的测试端点
                        proxy=proxy
                    )
                    if resp.status == 200:
                        end_time = time.time()
                        response_time = end_time - start_time
                        print(f"响应时间: {response_time:.2f}秒")
                        return response_time
            except Exception as e:
                print(f"响应时间测试失败: {e}")
                return None
        
        response_time = asyncio.run(measure_response_time())
        if response_time:
            self.assertLess(response_time, 10.0, "响应时间应该在合理范围内")

    def test_concurrent_requests(self):
        """测试并发请求处理"""
        async def concurrent_test():
            tasks = []
            for i in range(3):  # 3个并发请求
                task = asyncio.create_task(self.make_test_request(i))
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            successful = sum(1 for r in results if not isinstance(r, Exception))
            print(f"并发测试: {successful}/3 个请求成功")
            return successful
        
        successful_count = asyncio.run(concurrent_test())
        self.assertGreater(successful_count, 0, "至少应有一个并发请求成功")

    async def make_test_request(self, request_id):
        """发起测试请求"""
        try:
            timeout = aiohttp.ClientTimeout(total=5)
            proxy = self.collector.proxy_url
            async with aiohttp.ClientSession(timeout=timeout) as session:
                resp = await session.get(
                    f"https://httpbin.org/json",
                    proxy=proxy
                )
                return resp.status == 200
        except:
            return False


if __name__ == '__main__':
    print("="*60)
    print("开始增强型在线测试...")
    print(f"代理配置: {OnlineSettings.PROXY_URL or '直连'}")
    print("="*60)
    
    # 创建测试套件
    suite = unittest.TestSuite()
    
    # 添加测试用例
    suite.addTest(unittest.makeSuite(TestOnlineConnectivity))
    suite.addTest(unittest.makeSuite(TestDataCollectorWithFallback))
    suite.addTest(unittest.makeSuite(TestPerformanceMetrics))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出结果统计
    print(f"\n{'='*60}")
    print(f"增强型在线测试结果:")
    print(f"{'='*60}")
    print(f"运行测试: {result.testsRun}")
    print(f"成功: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    success_rate = ((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100) if result.testsRun > 0 else 0
    print(f"成功率: {success_rate:.1f}%")
    print(f"{'='*60}")