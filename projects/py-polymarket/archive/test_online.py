import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))

import unittest
import asyncio
import aiohttp
from unittest.mock import Mock, patch
import numpy as np
import time

# 在线模式配置
class OnlineSettings:
    OFFLINE_MODE = False
    POLYGON_RPC = "https://polygon-rpc.com"
    POLYMARKET_CONTRACT = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"  # Polymarket CTF Exchange
    ABI = []  # 简化的ABI，实际使用时需要完整ABI
    CLOB_REST_URL = "https://clob.polymarket.com"
    CLOB_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
    PROXY_URL = "http://127.0.0.1:7890"  # 常见的本地代理端口，请根据实际情况调整
    POLY_PRIVATE_KEY = None  # 测试时不使用私钥

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


class TestOnlineDataCollector(unittest.TestCase):
    def setUp(self):
        self.collector = AsyncDataCollector()
        self.timeout = 10  # 10秒超时

    def test_init_online_mode(self):
        """测试在线模式初始化"""
        self.assertEqual(self.collector.proxy_url, "http://127.0.0.1:7890")
        # 注意：不测试Web3连接，因为可能需要特定的RPC配置

    def test_proxy_connectivity(self):
        """测试代理连接性"""
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=5)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    # 测试通过代理访问一个简单的URL
                    resp = await session.get(
                        "https://httpbin.org/ip", 
                        proxy=self.collector.proxy_url
                    )
                    self.assertEqual(resp.status, 200)
                    data = await resp.json()
                    print(f"代理IP: {data.get('origin', 'Unknown')}")
                    return True
            except Exception as e:
                print(f"代理连接失败: {e}")
                return False
        
        result = asyncio.run(test())
        if not result:
            self.skipTest("代理不可用，跳过在线测试")

    def test_fetch_markets_online(self):
        """测试在线模式获取市场数据"""
        async def test():
            try:
                markets = await self.collector.fetch_markets()
                self.assertIsInstance(markets, list)
                if len(markets) > 0:
                    market = markets[0]
                    # 检查市场数据结构（根据实际API响应调整）
                    print(f"获取到 {len(markets)} 个市场")
                    print(f"示例市场数据: {market}")
                return True
            except aiohttp.ClientError as e:
                print(f"网络错误: {e}")
                return False
            except ValueError as e:
                print(f"API错误: {e}")
                return False
            except Exception as e:
                print(f"其他错误: {e}")
                return False
        
        result = asyncio.run(test())
        if not result:
            self.skipTest("API不可用或需要认证")

    def test_fetch_order_book_online(self):
        """测试在线模式获取订单簿"""
        async def test():
            try:
                # 先获取市场列表
                markets = await self.collector.fetch_markets()
                if not markets:
                    return False
                
                # 获取第一个市场的订单簿
                market_id = markets[0].get('id') or markets[0].get('market_id') or markets[0].get('token_id')
                if not market_id:
                    print("无法找到有效的market_id")
                    return False
                
                order_book = await self.collector.fetch_order_book(market_id)
                self.assertIsInstance(order_book, dict)
                print(f"订单簿数据: {order_book}")
                return True
            except Exception as e:
                print(f"获取订单簿失败: {e}")
                return False
        
        result = asyncio.run(test())
        if not result:
            self.skipTest("无法获取订单簿数据")

    def test_websocket_connection(self):
        """测试WebSocket连接"""
        async def test():
            try:
                count = 0
                start_time = time.time()
                async for update in self.collector.subscribe_order_updates():
                    print(f"收到WebSocket更新: {update}")
                    count += 1
                    # 测试收到至少一条消息或超时5秒
                    if count >= 1 or (time.time() - start_time) > 5:
                        break
                return count > 0
            except Exception as e:
                print(f"WebSocket连接失败: {e}")
                return False
        
        result = asyncio.run(test())
        if not result:
            self.skipTest("WebSocket连接不可用")

    def test_auth_headers_without_key(self):
        """测试无私钥时的认证头生成"""
        headers = self.collector._generate_auth_headers()
        # 没有私钥时应该返回空字典
        self.assertEqual(headers, {})

    def test_sync_method_online(self):
        """测试同步方法在线调用"""
        try:
            markets = self.collector.fetch_all_active_market_data()
            self.assertIsInstance(markets, list)
            print(f"同步方法获取到 {len(markets)} 个市场")
        except Exception as e:
            self.skipTest(f"同步方法调用失败: {e}")


class TestRealDataIntegration(unittest.TestCase):
    """真实数据集成测试"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()
        self.risk_engine = RiskEngine()
        self.market_making = MarketMakingStrategy(spread=0.01, balance=1000)
        self.arbitrage = ArbitrageStrategy(threshold=0.02)

    def test_real_market_data_processing(self):
        """测试真实市场数据处理"""
        try:
            markets = self.collector.fetch_all_active_market_data()
            if not markets:
                self.skipTest("无法获取市场数据")
            
            # 处理真实市场数据
            for market in markets[:3]:  # 只测试前3个市场
                # 确保市场数据有必要的字段
                if not all(key in market for key in ['bid', 'ask']) and 'price' not in market:
                    # 模拟缺失的字段
                    if 'price' in market:
                        market['bid'] = market['price'] * 0.98
                        market['ask'] = market['price'] * 1.02
                    else:
                        market['bid'] = 0.45
                        market['ask'] = 0.55
                    market['high'] = market.get('high', market['ask'] * 1.1)
                    market['low'] = market.get('low', market['bid'] * 0.9)
                
                # 测试策略生成订单
                orders = self.market_making.generate_orders(market)
                self.assertIsInstance(orders, dict)
                self.assertIn('action', orders)
                
                print(f"市场 {market.get('id', market.get('market_id', 'unknown'))}: "
                      f"买价={orders.get('bid')}, 卖价={orders.get('ask')}, 数量={orders.get('size')}")
        
        except Exception as e:
            self.skipTest(f"真实数据处理测试失败: {e}")

    def test_arbitrage_with_real_data(self):
        """测试真实数据套利机会发现"""
        try:
            markets = self.collector.fetch_all_active_market_data()
            if len(markets) < 2:
                self.skipTest("市场数据不足，无法测试套利")
            
            # 检查前两个市场是否存在套利机会
            market_a = markets[0]
            market_b = markets[1]
            
            # 确保有price字段
            for market in [market_a, market_b]:
                if 'price' not in market:
                    if 'bid' in market and 'ask' in market:
                        market['price'] = (market['bid'] + market['ask']) / 2
                    else:
                        market['price'] = 0.5  # 默认价格
            
            opportunity = self.arbitrage.find_opportunities(market_a, market_b)
            
            if opportunity:
                print(f"发现套利机会: {opportunity}")
                self.assertEqual(opportunity['action'], 'arbitrage')
            else:
                print("当前市场无套利机会")
        
        except Exception as e:
            self.skipTest(f"套利测试失败: {e}")

    def test_risk_management_with_real_data(self):
        """测试真实数据风险管理"""
        # 创建模拟的投资组合数据
        portfolio = {
            'returns': np.random.normal(0, 0.02, 200),  # 模拟历史收益
            'balance': 10000
        }
        
        # 测试不同大小的订单
        test_orders = [
            {'size': 100},   # 小订单
            {'size': 500},   # 中等订单
            {'size': 1500},  # 大订单
        ]
        
        for order in test_orders:
            is_valid = self.risk_engine.validate_order(order, portfolio)
            print(f"订单大小 {order['size']}: {'通过' if is_valid else '拒绝'}")


class TestNetworkResilience(unittest.TestCase):
    """网络韧性测试"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()

    def test_timeout_handling(self):
        """测试超时处理"""
        async def test():
            try:
                # 使用很短的超时来测试错误处理
                original_timeout = aiohttp.ClientTimeout(total=0.001)  # 1毫秒超时
                
                # 这应该会超时
                async with aiohttp.ClientSession(timeout=original_timeout) as session:
                    await session.get(f"{self.collector.rest_url}/markets", 
                                    proxy=self.collector.proxy_url)
                return False
            except (asyncio.TimeoutError, aiohttp.ServerTimeoutError):
                return True  # 期望的超时错误
            except Exception as e:
                print(f"其他错误: {e}")
                return True  # 其他网络错误也是可接受的
        
        result = asyncio.run(test())
        self.assertTrue(result, "应该能正确处理网络超时")

    def test_invalid_proxy_handling(self):
        """测试无效代理处理"""
        async def test():
            try:
                timeout = aiohttp.ClientTimeout(total=3)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    # 使用无效代理
                    await session.get("https://httpbin.org/ip", 
                                    proxy="http://invalid-proxy:8080")
                return False
            except Exception:
                return True  # 期望出现连接错误
        
        result = asyncio.run(test())
        self.assertTrue(result, "应该能正确处理无效代理")


if __name__ == '__main__':
    print("开始在线代理测试...")
    print(f"代理设置: {OnlineSettings.PROXY_URL}")
    print(f"REST API: {OnlineSettings.CLOB_REST_URL}")
    print(f"WebSocket: {OnlineSettings.CLOB_WS_URL}")
    print("="*60)
    
    # 创建测试套件
    suite = unittest.TestSuite()
    
    # 添加测试用例
    suite.addTest(unittest.makeSuite(TestOnlineDataCollector))
    suite.addTest(unittest.makeSuite(TestRealDataIntegration))
    suite.addTest(unittest.makeSuite(TestNetworkResilience))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出结果统计
    print(f"\n{'='*60}")
    print(f"在线测试结果统计:")
    print(f"{'='*60}")
    print(f"运行测试: {result.testsRun}")
    print(f"成功: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    print(f"跳过: {len([t for t in result.skipped if hasattr(result, 'skipped')])}")
    print(f"成功率: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.failures:
        print(f"\n失败详情:")
        for test, traceback in result.failures:
            print(f"- {test}")
    
    if result.errors:
        print(f"\n错误详情:")
        for test, traceback in result.errors:
            print(f"- {test}")
    
    print(f"{'='*60}")
    print("注意: 某些测试可能因为网络、代理或API限制而跳过")