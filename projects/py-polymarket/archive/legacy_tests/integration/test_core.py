import os
import sys
import types
from core.data_collector import AsyncDataCollector
from core.models import DQNAgent, LSTMTrader, TradingSystem
from core.risk_manager import RiskEngine
from core.strategy import ArbitrageStrategy, MarketMakingStrategy

import asyncio
import numpy as np
import torch
import unittest
from unittest.mock import AsyncMock, Mock, patch


sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))

import unittest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import torch
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
from core.models import LSTMTrader, DQNAgent, TradingSystem
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
        
        asyncio.run(test())

    def test_fetch_order_book_offline(self):
        """测试离线模式获取订单簿"""
        async def test():
            order_book = await self.collector.fetch_order_book("test_market")
            self.assertIn('bids', order_book)
            self.assertIn('asks', order_book)
        
        asyncio.run(test())

    def test_subscribe_order_updates_offline(self):
        """测试离线模式订单更新订阅"""
        async def test():
            async for update in self.collector.subscribe_order_updates():
                self.assertIn('orderUpdates', update)
                break  # 只测试第一个更新
        
        asyncio.run(test())

    def test_sync_method(self):
        """测试同步方法"""
        markets = self.collector.fetch_all_active_market_data()
        self.assertIsInstance(markets, list)


class TestModels(unittest.TestCase):
    def setUp(self):
        self.lstm_trader = LSTMTrader(input_dim=5, hidden_dim=32)
        self.dqn_agent = DQNAgent(state_dim=10)
        self.trading_system = TradingSystem(state_dim=10, input_dim=5)

    def test_lstm_trader_forward(self):
        """测试LSTM交易者前向传播"""
        batch_size, seq_len, input_dim = 2, 10, 5
        x = torch.randn(batch_size, seq_len, input_dim)
        output = self.lstm_trader(x)
        self.assertEqual(output.shape, (batch_size, 1))

    def test_dqn_agent_act(self):
        """测试DQN智能体动作选择"""
        state = torch.randn(10)
        action = self.dqn_agent.act(state, epsilon=0.0)  # 不使用随机动作
        self.assertIn(action, [0, 1, 2])

    def test_dqn_agent_random_act(self):
        """测试DQN智能体随机动作"""
        state = torch.randn(10)
        action = self.dqn_agent.act(state, epsilon=1.0)  # 完全随机
        self.assertIn(action, [0, 1, 2])

    def test_trading_system_predict(self):
        """测试交易系统价格预测"""
        batch_size, seq_len, input_dim = 1, 5, 5
        x = torch.randn(batch_size, seq_len, input_dim)
        prediction = self.trading_system.predict_price(x)
        self.assertEqual(prediction.shape, (batch_size, 1))

    def test_trading_system_decide(self):
        """测试交易系统决策"""
        state = torch.randn(10)
        action = self.trading_system.decide_action(state)
        self.assertIn(action, [0, 1, 2])


class TestRiskManager(unittest.TestCase):
    def setUp(self):
        self.risk_engine = RiskEngine()

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


class TestStrategy(unittest.TestCase):
    def setUp(self):
        self.market_making = MarketMakingStrategy(spread=0.02, balance=10000)
        self.arbitrage = ArbitrageStrategy(threshold=0.05)

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

    def test_arbitrage_no_opportunity(self):
        """测试无套利机会"""
        market_a = {'price': 0.50, 'market_id': 'MARKET-A'}
        market_b = {'price': 0.51, 'market_id': 'MARKET-B'}
        
        opportunity = self.arbitrage.find_opportunities(market_a, market_b)
        self.assertIsNone(opportunity)


if __name__ == '__main__':
    # 创建测试套件
    suite = unittest.TestSuite()
    
    # 添加测试用例
    suite.addTest(unittest.makeSuite(TestDataCollector))
    suite.addTest(unittest.makeSuite(TestModels))
    suite.addTest(unittest.makeSuite(TestRiskManager))
    suite.addTest(unittest.makeSuite(TestStrategy))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出结果统计
    print(f"\n测试总结:")
    print(f"运行测试: {result.testsRun}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    print(f"成功率: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")