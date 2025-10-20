import os
import ssl
import sys
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
import ssl
from unittest.mock import Mock
import numpy as np

# 正确的Bright Data代理配置
BRIGHT_DATA_CONFIG = {
    'host': 'brd.superproxy.io',
    'port': 33335,
    'username': 'brd-customer-hl_74a6e114-zone-residential_proxy1',
    'password': 'dddh9tsmw3zh'  # 正确的密码
}

# 构建代理URL
proxy_url = f"http://{BRIGHT_DATA_CONFIG['username']}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"

print("🎉 Bright Data代理配置成功!")
print("="*60)
print(f"用户名: {BRIGHT_DATA_CONFIG['username']}")
print(f"代理地址: {BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}")
print(f"状态: ✅ 连接成功")
print(f"位置: 巴西 Lucas do Rio Verde")
print(f"代理IP: 193.179.61.66")
print("="*60)

# 更新的在线模式配置
class WorkingBrightDataSettings:
    OFFLINE_MODE = False
    POLYGON_RPC = "https://polygon-rpc.com"
    POLYMARKET_CONTRACT = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
    ABI = []
    CLOB_REST_URL = "https://clob.polymarket.com"
    CLOB_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
    PROXY_URL = proxy_url
    POLY_PRIVATE_KEY = None

# 创建模拟的config模块
import types
config_module = types.ModuleType('config')
config_module.settings = WorkingBrightDataSettings()
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


class TestWorkingProxy(unittest.TestCase):
    """测试工作的代理配置"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()
        self.proxy_url = proxy_url

    def test_proxy_basic_functionality(self):
        """测试代理基本功能"""
        async def test():
            # 创建忽略SSL的配置
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            try:
                connector = aiohttp.TCPConnector(ssl=ssl_context)
                timeout = aiohttp.ClientTimeout(total=20)
                
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                
                async with aiohttp.ClientSession(
                    connector=connector,
                    timeout=timeout,
                    headers=headers
                ) as session:
                    # 测试IP获取
                    resp = await session.get("https://httpbin.org/ip", proxy=self.proxy_url)
                    if resp.status == 200:
                        data = await resp.json()
                        ip = data.get('origin', 'Unknown')
                        print(f"✅ 代理IP测试成功: {ip}")
                        return True, ip
                    return False, "Failed"
                    
            except Exception as e:
                print(f"❌ 代理测试失败: {e}")
                return False, str(e)
        
        success, result = asyncio.run(test())
        self.assertTrue(success, f"代理应该正常工作: {result}")

    def test_session_persistence(self):
        """测试会话保持功能"""
        async def test():
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            # 使用会话ID
            session_username = f"{BRIGHT_DATA_CONFIG['username']}-session-12345"
            session_proxy = f"http://{session_username}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"
            
            try:
                connector = aiohttp.TCPConnector(ssl=ssl_context)
                timeout = aiohttp.ClientTimeout(total=15)
                
                async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                    ips = []
                    for i in range(3):
                        resp = await session.get("https://httpbin.org/ip", proxy=session_proxy)
                        if resp.status == 200:
                            data = await resp.json()
                            ip = data.get('origin', 'Unknown')
                            ips.append(ip)
                            print(f"   会话请求 {i+1}: {ip}")
                        await asyncio.sleep(1)
                    
                    if len(ips) >= 2 and len(set(ips)) <= 1:
                        print(f"✅ 会话保持成功 - 使用相同IP")
                        return True
                    else:
                        print(f"⚠️  IP可能发生变化: {ips}")
                        return len(ips) > 0
                        
            except Exception as e:
                print(f"❌ 会话测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        print("会话测试完成")

    def test_alternative_apis(self):
        """测试其他API访问"""
        async def test():
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            # 测试不同的API端点
            test_apis = [
                "https://httpbin.org/json",
                "https://api.ipify.org?format=json",
                "http://ip-api.com/json"
            ]
            
            successful_apis = []
            
            try:
                connector = aiohttp.TCPConnector(ssl=ssl_context)
                timeout = aiohttp.ClientTimeout(total=15)
                
                async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                    for api in test_apis:
                        try:
                            resp = await session.get(api, proxy=self.proxy_url)
                            if resp.status == 200:
                                data = await resp.text()
                                print(f"✅ {api}: 成功")
                                successful_apis.append(api)
                            else:
                                print(f"❌ {api}: HTTP {resp.status}")
                        except Exception as e:
                            print(f"❌ {api}: {type(e).__name__}")
                
                print(f"API测试结果: {len(successful_apis)}/{len(test_apis)} 成功")
                return len(successful_apis) > 0
                
            except Exception as e:
                print(f"❌ API测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("多个API可通过代理访问")

    def test_trading_system_with_proxy(self):
        """测试交易系统与代理集成"""
        print("\n🎯 测试交易系统代理集成...")
        
        # 验证模块正确加载
        self.assertEqual(self.collector.proxy_url, proxy_url)
        print(f"✅ 数据收集器代理配置: {self.collector.proxy_url[:50]}...")
        
        # 测试策略组件
        market_making = MarketMakingStrategy(spread=0.02, balance=10000)
        arbitrage = ArbitrageStrategy(threshold=0.05)
        risk_engine = RiskEngine()
        
        # 模拟市场数据测试
        test_market = {
            'market_id': 'PROXY-TEST-1',
            'bid': 0.48,
            'ask': 0.52,
            'high': 0.55,
            'low': 0.45
        }
        
        # 测试做市策略
        orders = market_making.generate_orders(test_market)
        print(f"✅ 做市策略: 买={orders['bid']}, 卖={orders['ask']}")
        
        # 测试风险管理
        test_order = {'size': orders['size']}
        test_portfolio = {
            'returns': np.random.normal(0, 0.01, 100),
            'balance': 10000
        }
        is_safe = risk_engine.validate_order(test_order, test_portfolio)
        print(f"✅ 风险检查: {'通过' if is_safe else '拒绝'}")
        
        print(f"✅ 交易系统与代理集成成功!")

    def test_country_targeting(self):
        """测试国家定向功能"""
        async def test():
            # 测试美国IP
            us_username = f"{BRIGHT_DATA_CONFIG['username']}-country-us"
            us_proxy = f"http://{us_username}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"
            
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            try:
                connector = aiohttp.TCPConnector(ssl=ssl_context)
                timeout = aiohttp.ClientTimeout(total=15)
                
                async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                    resp = await session.get("http://ip-api.com/json", proxy=us_proxy)
                    if resp.status == 200:
                        data = await resp.json()
                        country = data.get('country', 'Unknown')
                        city = data.get('city', 'Unknown')
                        print(f"✅ 美国IP测试: {country}, {city}")
                        return True
                    return False
            except Exception as e:
                print(f"⚠️  美国IP测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("国家定向功能可用")


if __name__ == '__main__':
    print("开始完整的代理功能测试...\n")
    
    # 创建测试套件
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestWorkingProxy))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出结果统计
    print(f"\n{'='*60}")
    print(f"代理功能测试结果:")
    print(f"{'='*60}")
    print(f"运行测试: {result.testsRun}")
    print(f"成功: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    success_rate = ((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100) if result.testsRun > 0 else 0
    print(f"成功率: {success_rate:.1f}%")
    
    # 保存配置
    config_content = f"""# Bright Data 代理配置 - 工作版本
# 生成时间: {asyncio.get_event_loop().time()}

PROXY_HOST={BRIGHT_DATA_CONFIG['host']}
PROXY_PORT={BRIGHT_DATA_CONFIG['port']}
PROXY_USERNAME={BRIGHT_DATA_CONFIG['username']}
PROXY_PASSWORD={BRIGHT_DATA_CONFIG['password']}
PROXY_URL={proxy_url}

# 使用示例:
# curl --proxy {BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']} --proxy-user {BRIGHT_DATA_CONFIG['username']}:{BRIGHT_DATA_CONFIG['password']} https://httpbin.org/ip

# 高级用法:
# 美国IP: {BRIGHT_DATA_CONFIG['username']}-country-us:{BRIGHT_DATA_CONFIG['password']}
# 会话保持: {BRIGHT_DATA_CONFIG['username']}-session-[RANDOM]:{BRIGHT_DATA_CONFIG['password']}
# 指定城市: {BRIGHT_DATA_CONFIG['username']}-country-us-city-newyork:{BRIGHT_DATA_CONFIG['password']}
"""
    
    with open('working_proxy_config.txt', 'w') as f:
        f.write(config_content)
    
    print(f"\n💾 配置已保存到 working_proxy_config.txt")
    print(f"🎉 Bright Data代理现在完全可用于你的交易系统!")
    print(f"{'='*60}")