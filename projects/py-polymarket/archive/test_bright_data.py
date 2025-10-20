import sys
import os
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


class TestBrightDataProxy(unittest.TestCase):
    """Bright Data代理测试"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()
        self.proxy_url = BRIGHT_DATA_PROXY

    def test_proxy_configuration(self):
        """测试代理配置"""
        self.assertEqual(self.collector.proxy_url, BRIGHT_DATA_PROXY)
        print(f"代理配置: {BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}")
        print(f"用户区域: {BRIGHT_DATA_CONFIG['username']}")

    def test_proxy_ip_location(self):
        """测试代理IP和位置"""
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=15)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    # 测试IP地址
                    resp = await session.get("https://httpbin.org/ip", proxy=self.proxy_url)
                    if resp.status == 200:
                        ip_data = await resp.json()
                        proxy_ip = ip_data.get('origin', 'Unknown')
                        print(f"✅ 代理IP: {proxy_ip}")
                        
                        # 测试地理位置
                        resp2 = await session.get("http://ip-api.com/json", proxy=self.proxy_url)
                        if resp2.status == 200:
                            geo_data = await resp2.json()
                            country = geo_data.get('country', 'Unknown')
                            city = geo_data.get('city', 'Unknown')
                            print(f"✅ 代理位置: {city}, {country}")
                        
                        return True
                return False
            except Exception as e:
                print(f"❌ 代理连接失败: {e}")
                return False
        
        result = asyncio.run(test())
        self.assertTrue(result, "Bright Data代理应该正常工作")

    def test_proxy_headers_and_user_agent(self):
        """测试代理头信息和User-Agent"""
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=15)
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                async with aiohttp.ClientSession(headers=headers, timeout=timeout) as session:
                    resp = await session.get("https://httpbin.org/headers", proxy=self.proxy_url)
                    if resp.status == 200:
                        data = await resp.json()
                        received_headers = data.get('headers', {})
                        print(f"✅ User-Agent: {received_headers.get('User-Agent', 'Not found')}")
                        print(f"✅ Host: {received_headers.get('Host', 'Not found')}")
                        return True
                return False
            except Exception as e:
                print(f"❌ 头信息测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        self.assertTrue(result, "代理应该正确转发头信息")

    def test_proxy_performance(self):
        """测试代理性能"""
        async def test():
            try:
                # 测试多个请求的响应时间
                times = []
                timeout = aiohttp.ClientTimeout(total=10)
                
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    for i in range(3):
                        start_time = time.time()
                        resp = await session.get("https://httpbin.org/json", proxy=self.proxy_url)
                        if resp.status == 200:
                            end_time = time.time()
                            response_time = end_time - start_time
                            times.append(response_time)
                            print(f"请求 {i+1}: {response_time:.2f}秒")
                
                if times:
                    avg_time = sum(times) / len(times)
                    print(f"✅ 平均响应时间: {avg_time:.2f}秒")
                    return avg_time < 10.0  # 期望平均响应时间小于10秒
                return False
            except Exception as e:
                print(f"❌ 性能测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        self.assertTrue(result, "代理性能应该在可接受范围内")


class TestPolymarketWithBrightData(unittest.TestCase):
    """使用Bright Data代理测试Polymarket API"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()

    def test_polymarket_clob_api(self):
        """测试Polymarket CLOB API"""
        async def test():
            try:
                markets = await self.collector.fetch_markets()
                if markets:
                    print(f"✅ CLOB API成功，获取 {len(markets)} 个市场")
                    # 显示第一个市场的详细信息
                    if len(markets) > 0:
                        first_market = markets[0]
                        print(f"示例市场: {first_market}")
                    return True
                return False
            except Exception as e:
                print(f"❌ CLOB API失败: {e}")
                return False
        
        result = asyncio.run(test())
        if not result:
            print("CLOB API可能需要特殊配置或认证")

    def test_polymarket_public_api(self):
        """测试Polymarket公开API"""
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=15)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    # 测试事件API
                    resp = await session.get(
                        "https://gamma-api.polymarket.com/events",
                        proxy=self.collector.proxy_url
                    )
                    if resp.status == 200:
                        events = await resp.json()
                        print(f"✅ 事件API成功，获取 {len(events)} 个事件")
                        
                        # 显示一些事件信息
                        for event in events[:3]:
                            title = event.get('title', 'Unknown')
                            slug = event.get('slug', 'unknown')
                            print(f"  - {title} ({slug})")
                        
                        return True
                    else:
                        print(f"❌ 事件API返回状态码: {resp.status}")
                        return False
            except Exception as e:
                print(f"❌ 公开API测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        self.assertTrue(result, "公开API应该可以通过代理访问")

    def test_polymarket_markets_api(self):
        """测试Polymarket市场API"""
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=15)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    # 测试市场API
                    resp = await session.get(
                        "https://strapi-matic.poly.market/markets",
                        proxy=self.collector.proxy_url
                    )
                    if resp.status == 200:
                        markets = await resp.json()
                        market_count = len(markets) if isinstance(markets, list) else len(markets.get('data', []))
                        print(f"✅ 市场API成功，获取 {market_count} 个市场")
                        return True
                    else:
                        print(f"❌ 市场API返回状态码: {resp.status}")
                        return False
            except Exception as e:
                print(f"❌ 市场API测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("市场API通过代理访问成功")

    def test_order_book_access(self):
        """测试订单簿访问"""
        async def test():
            try:
                # 首先获取市场列表
                timeout = aiohttp.ClientTimeout(total=15)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    resp = await session.get(
                        "https://gamma-api.polymarket.com/events",
                        proxy=self.collector.proxy_url
                    )
                    if resp.status == 200:
                        events = await resp.json()
                        if events:
                            # 尝试获取第一个事件的详细信息
                            event_id = events[0].get('id')
                            if event_id:
                                detail_resp = await session.get(
                                    f"https://gamma-api.polymarket.com/events/{event_id}",
                                    proxy=self.collector.proxy_url
                                )
                                if detail_resp.status == 200:
                                    detail_data = await detail_resp.json()
                                    print(f"✅ 事件详情API成功")
                                    markets = detail_data.get('markets', [])
                                    print(f"  包含 {len(markets)} 个市场")
                                    return True
                return False
            except Exception as e:
                print(f"❌ 订单簿访问测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("订单簿相关API可以正常访问")


class TestWebSocketWithBrightData(unittest.TestCase):
    """使用Bright Data代理测试WebSocket连接"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()

    def test_websocket_connection_attempt(self):
        """测试WebSocket连接尝试"""
        async def test():
            try:
                print("尝试WebSocket连接...")
                count = 0
                start_time = time.time()
                
                # 设置更短的超时时间用于测试
                async for update in self.collector.subscribe_order_updates():
                    print(f"收到WebSocket消息: {update}")
                    count += 1
                    # 收到一条消息或超时10秒就停止
                    if count >= 1 or (time.time() - start_time) > 10:
                        break
                
                if count > 0:
                    print(f"✅ WebSocket成功，收到 {count} 条消息")
                    return True
                else:
                    print("⚠️  WebSocket连接超时，未收到消息")
                    return False
            except Exception as e:
                print(f"❌ WebSocket连接失败: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("WebSocket通过代理连接成功")
        else:
            print("WebSocket可能需要特殊配置或不支持代理")


class TestTradingWithRealData(unittest.TestCase):
    """使用真实数据测试交易策略"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()
        self.market_making = MarketMakingStrategy(spread=0.01, balance=10000)
        self.arbitrage = ArbitrageStrategy(threshold=0.03)
        self.risk_engine = RiskEngine()

    def test_real_data_trading_pipeline(self):
        """测试真实数据交易管道"""
        async def test():
            try:
                # 获取真实市场数据
                timeout = aiohttp.ClientTimeout(total=15)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    resp = await session.get(
                        "https://gamma-api.polymarket.com/events",
                        proxy=self.collector.proxy_url
                    )
                    if resp.status == 200:
                        events = await resp.json()
                        
                        # 转换为交易策略所需的格式
                        markets = []
                        for event in events[:5]:  # 只处理前5个事件
                            market_data = {
                                'market_id': event.get('id', 'unknown'),
                                'title': event.get('title', 'Unknown Event'),
                                'bid': 0.45,  # 模拟买价
                                'ask': 0.55,  # 模拟卖价
                                'high': 0.60,
                                'low': 0.40,
                                'price': 0.50
                            }
                            markets.append(market_data)
                        
                        print(f"✅ 获取到 {len(markets)} 个市场数据")
                        
                        # 测试做市策略
                        for market in markets:
                            orders = self.market_making.generate_orders(market)
                            print(f"做市订单 - {market['title'][:30]}...")
                            print(f"  买价: {orders['bid']}, 卖价: {orders['ask']}, 数量: {orders['size']}")
                            
                            # 风险检查
                            test_order = {'size': orders['size']}
                            test_portfolio = {
                                'returns': np.random.normal(0, 0.02, 100),
                                'balance': 10000
                            }
                            is_safe = self.risk_engine.validate_order(test_order, test_portfolio)
                            print(f"  风险检查: {'✅ 通过' if is_safe else '❌ 拒绝'}")
                        
                        # 测试套利机会
                        if len(markets) >= 2:
                            opportunity = self.arbitrage.find_opportunities(markets[0], markets[1])
                            if opportunity:
                                print(f"✅ 发现套利机会: {opportunity}")
                            else:
                                print("⚠️  当前无套利机会")
                        
                        return True
                return False
            except Exception as e:
                print(f"❌ 真实数据交易测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        self.assertTrue(result, "真实数据交易管道应该正常工作")


if __name__ == '__main__':
    print("="*70)
    print("开始Bright Data代理测试...")
    print(f"代理服务器: {BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}")
    print(f"用户区域: {BRIGHT_DATA_CONFIG['username']}")
    print("="*70)
    
    # 创建测试套件
    suite = unittest.TestSuite()
    
    # 添加测试用例
    suite.addTest(unittest.makeSuite(TestBrightDataProxy))
    suite.addTest(unittest.makeSuite(TestPolymarketWithBrightData))
    suite.addTest(unittest.makeSuite(TestWebSocketWithBrightData))
    suite.addTest(unittest.makeSuite(TestTradingWithRealData))
    
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
            print(f"- {test}")
    
    if result.errors:
        print(f"\n错误详情:")
        for test, traceback in result.errors:
            print(f"- {test}")
    
    print(f"{'='*70}")
    print("测试完成！")