import os
import sys
import types
from core.data_collector import AsyncDataCollector
from core.risk_manager import RiskEngine
from core.strategy import ArbitrageStrategy, MarketMakingStrategy

import asyncio
import numpy as np
import unittest
from unittest.mock import Mock, patch


sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))

import unittest
import asyncio
from unittest.mock import Mock, patch
import numpy as np

# 模拟配置文件
class MockSettings:
    OFFLINE_MODE = True
    POLYGON_RPC = "https://polygon-rpc.com"
    POLYMARKET_CONTRACT = "0x1234567890abcdef"
    ABI = []
    CLOB_REST_URL = "https://clob.polymarket.com"
    CLOB_WS_URL = "wss://ws.polymarket.com"
    PROXY_URL = None

# 创建模拟的config模块
import types
config_module = types.ModuleType('config')
config_module.settings = MockSettings()
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


class TestDataCollector(unittest.TestCase):
    def setUp(self):
        self.collector = AsyncDataCollector()

    def test_init_offline_mode(self):
        """测试离线模式初始化"""
        self.assertIsNone(self.collector.proxy_url)
        self.assertIsNone(self.collector.w3)
        self.assertIsNone(self.collector.contract)
        self.assertIsNone(self.collector.account)

    def test_fetch_markets_offline(self):
        """测试离线模式获取市场数据"""
        async def test():
            markets = await self.collector.fetch_markets()
            self.assertIsInstance(markets, list)
            self.assertEqual(len(markets), 2)
            self.assertIn('market_id', markets[0])
            self.assertIn('bid', markets[0])
            self.assertIn('ask', markets[0])
            self.assertIn('volatility', markets[0])
        
        asyncio.run(test())

    def test_fetch_order_book_offline(self):
        """测试离线模式获取订单簿"""
        async def test():
            order_book = await self.collector.fetch_order_book("test_market")
            self.assertIn('bids', order_book)
            self.assertIn('asks', order_book)
            self.assertIsInstance(order_book['bids'], list)
            self.assertIsInstance(order_book['asks'], list)
        
        asyncio.run(test())

    def test_subscribe_order_updates_offline(self):
        """测试离线模式订单更新订阅"""
        async def test():
            count = 0
            async for update in self.collector.subscribe_order_updates():
                self.assertIn('orderUpdates', update)
                count += 1
                if count >= 1:  # 只测试第一个更新
                    break
            self.assertEqual(count, 1)
        
        asyncio.run(test())

    def test_sync_method(self):
        """测试同步方法"""
        markets = self.collector.fetch_all_active_market_data()
        self.assertIsInstance(markets, list)
        self.assertGreater(len(markets), 0)

    def test_auth_headers_generation(self):
        """测试认证头生成"""
        headers = self.collector._generate_auth_headers()
        # 在离线模式下，没有账户，应该返回空字典
        self.assertEqual(headers, {})


class TestRiskManager(unittest.TestCase):
    def setUp(self):
        self.risk_engine = RiskEngine()

    def test_init_factors(self):
        """测试初始化风险因子"""
        self.assertIn('var', self.risk_engine.factors)
        self.assertIn('liquidity', self.risk_engine.factors)
        self.assertEqual(len(self.risk_engine.factors), 2)

    def test_validate_order_pass(self):
        """测试订单验证通过"""
        order = {'size': 100}
        portfolio = {
            'returns': np.random.normal(0, 0.01, 200),
            'balance': 10000
        }
        result = self.risk_engine.validate_order(order, portfolio)
        self.assertTrue(result)

    def test_validate_order_fail_var(self):
        """测试订单因VaR检查失败"""
        order = {'size': 10000}  # 过大的订单
        portfolio = {
            'returns': np.array([-0.1] * 100 + [0.01] * 100),  # 高风险历史收益
            'balance': 1000
        }
        result = self.risk_engine.validate_order(order, portfolio)
        self.assertFalse(result)

    def test_validate_order_fail_liquidity(self):
        """测试订单因流动性检查失败"""
        order = {'size': 2000}  # 超过10%余额
        portfolio = {
            'returns': np.random.normal(0, 0.001, 100),
            'balance': 10000
        }
        result = self.risk_engine.validate_order(order, portfolio)
        self.assertFalse(result)

    def test_var_calculation(self):
        """测试VaR计算逻辑"""
        order = {'size': 100}
        portfolio = {
            'returns': np.array([-0.02, -0.01, 0.01, 0.02, 0.005] * 20),
            'balance': 10000
        }
        # 直接调用内部方法
        result = self.risk_engine._calculate_var(order, portfolio)
        self.assertIsInstance(result, bool)

    def test_liquidity_check(self):
        """测试流动性检查逻辑"""
        order = {'size': 500}  # 5%余额
        portfolio = {'balance': 10000}
        result = self.risk_engine._check_liquidity(order, portfolio)
        self.assertTrue(result)  # 应该通过，因为5% < 10%

        order = {'size': 1500}  # 15%余额
        result = self.risk_engine._check_liquidity(order, portfolio)
        self.assertFalse(result)  # 应该失败，因为15% > 10%


class TestStrategy(unittest.TestCase):
    def setUp(self):
        self.market_making = MarketMakingStrategy(spread=0.02, balance=10000)
        self.arbitrage = ArbitrageStrategy(threshold=0.05)

    def test_market_making_init(self):
        """测试做市策略初始化"""
        self.assertEqual(self.market_making.spread, 0.02)
        self.assertEqual(self.market_making.balance, 10000)

    def test_market_making_orders(self):
        """测试做市策略订单生成"""
        market_data = {
            'bid': 0.45,
            'ask': 0.55,
            'high': 0.6,
            'low': 0.4,
            'market_id': 'TEST-1'
        }
        orders = self.market_making.generate_orders(market_data)
        
        self.assertEqual(orders['action'], 'both')
        self.assertIn('bid', orders)
        self.assertIn('ask', orders)
        self.assertIn('size', orders)
        self.assertEqual(orders['market_id'], 'TEST-1')
        
        # 检查买卖价差
        mid_price = (market_data['bid'] + market_data['ask']) / 2
        expected_bid = round(mid_price * (1 - 0.02), 4)
        expected_ask = round(mid_price * (1 + 0.02), 4)
        self.assertEqual(orders['bid'], expected_bid)
        self.assertEqual(orders['ask'], expected_ask)

    def test_position_size_calculation(self):
        """测试头寸大小计算"""
        market_data = {
            'high': 0.6,
            'low': 0.4,
            'bid': 0.45,
            'ask': 0.55
        }
        size = self.market_making._calculate_position_size(market_data)
        self.assertIsInstance(size, float)
        self.assertGreater(size, 0)

    def test_arbitrage_init(self):
        """测试套利策略初始化"""
        self.assertEqual(self.arbitrage.threshold, 0.05)

    def test_arbitrage_opportunity_found(self):
        """测试套利机会发现"""
        market_a = {'price': 0.45, 'market_id': 'MARKET-A'}
        market_b = {'price': 0.55, 'market_id': 'MARKET-B'}
        
        opportunity = self.arbitrage.find_opportunities(market_a, market_b)
        
        self.assertIsNotNone(opportunity)
        self.assertEqual(opportunity['action'], 'arbitrage')
        self.assertEqual(opportunity['buy_market'], 'MARKET-A')
        self.assertEqual(opportunity['sell_market'], 'MARKET-B')
        self.assertEqual(opportunity['spread'], 0.1)
        self.assertEqual(opportunity['size'], 100)

    def test_arbitrage_no_opportunity(self):
        """测试无套利机会"""
        market_a = {'price': 0.50, 'market_id': 'MARKET-A'}
        market_b = {'price': 0.51, 'market_id': 'MARKET-B'}
        
        opportunity = self.arbitrage.find_opportunities(market_a, market_b)
        self.assertIsNone(opportunity)

    def test_arbitrage_reverse_opportunity(self):
        """测试反向套利机会"""
        market_a = {'price': 0.55, 'market_id': 'MARKET-A'}
        market_b = {'price': 0.45, 'market_id': 'MARKET-B'}
        
        opportunity = self.arbitrage.find_opportunities(market_a, market_b)
        
        self.assertIsNotNone(opportunity)
        self.assertEqual(opportunity['buy_market'], 'MARKET-B')
        self.assertEqual(opportunity['sell_market'], 'MARKET-A')


class TestIntegration(unittest.TestCase):
    """集成测试"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()
        self.risk_engine = RiskEngine()
        self.market_making = MarketMakingStrategy()

    def test_data_to_strategy_flow(self):
        """测试从数据采集到策略的完整流程"""
        # 获取市场数据
        markets = self.collector.fetch_all_active_market_data()
        self.assertIsInstance(markets, list)
        
        # 为每个市场生成订单
        for market in markets:
            orders = self.market_making.generate_orders(market)
            self.assertIsInstance(orders, dict)
            self.assertIn('action', orders)

    def test_risk_management_integration(self):
        """测试风险管理集成"""
        # 模拟一个订单
        order = {'size': 500}
        portfolio = {
            'returns': np.random.normal(0, 0.01, 100),
            'balance': 10000
        }
        
        # 风险检查
        is_valid = self.risk_engine.validate_order(order, portfolio)
        self.assertIsInstance(is_valid, bool)


if __name__ == '__main__':
    # 创建测试套件
    suite = unittest.TestSuite()
    
    # 添加测试用例
    suite.addTest(unittest.makeSuite(TestDataCollector))
    suite.addTest(unittest.makeSuite(TestRiskManager))
    suite.addTest(unittest.makeSuite(TestStrategy))
    suite.addTest(unittest.makeSuite(TestIntegration))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出结果统计
    print(f"\n{'='*50}")
    print(f"测试结果统计:")
    print(f"{'='*50}")
    print(f"运行测试: {result.testsRun}")
    print(f"成功: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    print(f"成功率: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.failures:
        print(f"\n失败详情:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback}")
    
    if result.errors:
        print(f"\n错误详情:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback}")
    
    print(f"{'='*50}")