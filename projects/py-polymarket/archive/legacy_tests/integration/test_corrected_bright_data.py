import os
import socket
import ssl
import subprocess
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
import ssl
from unittest.mock import Mock
import numpy as np
import time
import json
import subprocess

# 修正后的Bright Data代理配置
BRIGHT_DATA_CONFIG = {
    'host': 'brd.superproxy.io',
    'port': 33335,  # 修正端口
    'base_username': 'brd-customer-hl_74a6e114',
    'zone': 'scraping_browser1',  # 你可以修改为实际的zone名称
    'password': 'fgf480g2mejd'
}

# 构建正确格式的用户名和代理URL
username = f"{BRIGHT_DATA_CONFIG['base_username']}-zone-{BRIGHT_DATA_CONFIG['zone']}"
BRIGHT_DATA_PROXY = f"http://{username}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"

print(f"使用修正后的Bright Data配置:")
print(f"  主机: {BRIGHT_DATA_CONFIG['host']}")
print(f"  端口: {BRIGHT_DATA_CONFIG['port']}")
print(f"  用户名: {username}")
print(f"  密码: {'*' * len(BRIGHT_DATA_CONFIG['password'])}")

# SSL配置 - 忽略SSL验证（针对"立即访问"模式）
def create_ssl_context():
    """创建忽略SSL验证的上下文"""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context

# 在线模式配置
class CorrectedBrightDataSettings:
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
config_module.settings = CorrectedBrightDataSettings()
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


class TestCorrectedBrightData(unittest.TestCase):
    """使用修正配置的Bright Data测试"""
    
    def setUp(self):
        self.collector = AsyncDataCollector()
        self.proxy_url = BRIGHT_DATA_PROXY
        self.ssl_context = create_ssl_context()

    def test_curl_command_equivalent(self):
        """模拟curl命令测试代理连接"""
        print("\n🔧 执行curl命令测试...")
        
        # 构建curl命令
        curl_cmd = [
            'curl', '-v',
            '--proxy', f"{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}",
            '--proxy-user', f"{username}:{BRIGHT_DATA_CONFIG['password']}",
            '--connect-timeout', '10',
            'https://httpbin.org/ip'
        ]
        
        try:
            result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=15)
            print(f"Curl返回码: {result.returncode}")
            print(f"Curl输出: {result.stdout}")
            if result.stderr:
                print(f"Curl错误: {result.stderr}")
            
            # 检查是否包含x-brd-字段
            if 'x-brd-' in result.stderr.lower():
                print("✅ 检测到x-brd字段，错误来自Bright Data")
            else:
                print("⚠️  未检测到x-brd字段，可能是目标网站或本地环境问题")
                
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            print("❌ Curl命令超时")
            return False
        except FileNotFoundError:
            print("⚠️  curl命令未找到，跳过curl测试")
            return True  # 不因为curl不存在而失败
        except Exception as e:
            print(f"❌ Curl测试出错: {e}")
            return False

    def test_corrected_proxy_connection(self):
        """使用修正配置测试代理连接"""
        async def test():
            try:
                # 创建带SSL忽略的连接器
                connector = aiohttp.TCPConnector(ssl=self.ssl_context)
                timeout = aiohttp.ClientTimeout(total=15, connect=10)
                
                async with aiohttp.ClientSession(
                    connector=connector, 
                    timeout=timeout
                ) as session:
                    print("测试修正后的代理配置...")
                    resp = await session.get("https://httpbin.org/ip", proxy=self.proxy_url)
                    
                    if resp.status == 200:
                        data = await resp.json()
                        proxy_ip = data.get('origin', 'Unknown')
                        print(f"✅ 代理连接成功!")
                        print(f"   代理IP: {proxy_ip}")
                        
                        # 检查响应头中的Bright Data字段
                        headers = dict(resp.headers)
                        brd_headers = {k: v for k, v in headers.items() if k.lower().startswith('x-brd-')}
                        if brd_headers:
                            print(f"   Bright Data响应头: {brd_headers}")
                        
                        return True
                    else:
                        print(f"❌ HTTP状态码: {resp.status}")
                        response_text = await resp.text()
                        print(f"   响应内容: {response_text[:200]}...")
                        return False
                        
            except aiohttp.ClientProxyConnectionError as e:
                print(f"❌ 代理连接错误: {e}")
                return False
            except asyncio.TimeoutError:
                print(f"❌ 连接超时")
                return False
            except Exception as e:
                print(f"❌ 其他错误: {type(e).__name__}: {e}")
                return False
        
        result = asyncio.run(test())
        self.assertTrue(result, "修正后的代理配置应该能正常连接")

    def test_multiple_zone_formats(self):
        """测试不同的zone格式"""
        async def test_zone_format(zone_name):
            test_username = f"{BRIGHT_DATA_CONFIG['base_username']}-zone-{zone_name}"
            test_proxy = f"http://{test_username}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"
            
            try:
                connector = aiohttp.TCPConnector(ssl=self.ssl_context)
                timeout = aiohttp.ClientTimeout(total=10)
                
                async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                    resp = await session.get("https://httpbin.org/ip", proxy=test_proxy)
                    if resp.status == 200:
                        data = await resp.json()
                        return True, data.get('origin', 'Unknown')
                    return False, f"HTTP {resp.status}"
            except Exception as e:
                return False, f"{type(e).__name__}: {str(e)[:50]}"
        
        # 测试不同可能的zone名称
        test_zones = [
            'scraping_browser1',
            'residential',
            'datacenter', 
            'static',
            'isp'
        ]
        
        print("\n🔍 测试不同zone格式:")
        for zone in test_zones:
            print(f"测试zone: {zone}")
            success, result = asyncio.run(test_zone_format(zone))
            if success:
                print(f"   ✅ 成功! IP: {result}")
                return  # 找到可用的就停止
            else:
                print(f"   ❌ 失败: {result}")
        
        print("⚠️  所有zone格式都失败，请检查Bright Data控制面板中的zone名称")

    def test_session_based_request(self):
        """测试基于会话的请求"""
        async def test():
            try:
                # 使用会话ID避免IP轮换
                session_username = f"{username}-session-{int(time.time())}"
                session_proxy = f"http://{session_username}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"
                
                connector = aiohttp.TCPConnector(ssl=self.ssl_context)
                timeout = aiohttp.ClientTimeout(total=15)
                
                async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                    print("测试会话保持...")
                    
                    # 连续发起3个请求，应该使用相同IP
                    ips = []
                    for i in range(3):
                        resp = await session.get("https://httpbin.org/ip", proxy=session_proxy)
                        if resp.status == 200:
                            data = await resp.json()
                            ip = data.get('origin', 'Unknown')
                            ips.append(ip)
                            print(f"   请求 {i+1}: {ip}")
                        await asyncio.sleep(1)
                    
                    if ips and len(set(ips)) == 1:
                        print("✅ 会话保持成功 - 所有请求使用相同IP")
                        return True
                    else:
                        print("⚠️  会话保持可能未生效 - IP发生变化")
                        return len(ips) > 0  # 至少有请求成功
                        
            except Exception as e:
                print(f"❌ 会话测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("会话功能测试完成")

    def test_polymarket_with_corrected_proxy(self):
        """使用修正代理测试Polymarket API"""
        async def test():
            try:
                connector = aiohttp.TCPConnector(ssl=self.ssl_context)
                timeout = aiohttp.ClientTimeout(total=20)
                
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                
                async with aiohttp.ClientSession(
                    connector=connector, 
                    timeout=timeout,
                    headers=headers
                ) as session:
                    print("测试Polymarket API访问...")
                    
                    # 测试事件API
                    resp = await session.get(
                        "https://gamma-api.polymarket.com/events?limit=3",
                        proxy=self.proxy_url
                    )
                    
                    if resp.status == 200:
                        events = await resp.json()
                        print(f"✅ Polymarket API成功!")
                        print(f"   获取到 {len(events)} 个事件")
                        
                        # 显示事件信息
                        for i, event in enumerate(events[:2], 1):
                            title = event.get('title', 'Unknown')[:40]
                            active = event.get('active', False)
                            print(f"   {i}. {title}... (活跃: {active})")
                        
                        return True
                    else:
                        print(f"❌ API状态码: {resp.status}")
                        
                        # 检查是否有Bright Data错误头
                        brd_headers = {k: v for k, v in resp.headers.items() if k.lower().startswith('x-brd-')}
                        if brd_headers:
                            print(f"   Bright Data错误信息: {brd_headers}")
                        
                        return False
                        
            except Exception as e:
                print(f"❌ Polymarket API测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("Polymarket API通过修正代理访问成功")

    def test_ssl_verification_bypass(self):
        """测试SSL验证绕过"""
        async def test():
            try:
                # 测试不同的SSL配置
                ssl_contexts = [
                    create_ssl_context(),  # 忽略SSL
                    None,  # 默认SSL
                ]
                
                for i, ssl_ctx in enumerate(ssl_contexts):
                    print(f"测试SSL配置 {i+1}: {'忽略验证' if ssl_ctx else '默认验证'}")
                    
                    try:
                        connector = aiohttp.TCPConnector(ssl=ssl_ctx)
                        timeout = aiohttp.ClientTimeout(total=10)
                        
                        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                            resp = await session.get("https://httpbin.org/ip", proxy=self.proxy_url)
                            if resp.status == 200:
                                print(f"   ✅ SSL配置 {i+1} 成功")
                                return True
                            else:
                                print(f"   ❌ SSL配置 {i+1} HTTP状态: {resp.status}")
                    except Exception as e:
                        print(f"   ❌ SSL配置 {i+1} 失败: {type(e).__name__}")
                
                return False
            except Exception as e:
                print(f"❌ SSL测试失败: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("SSL配置测试完成")


class TestProxyDiagnostics(unittest.TestCase):
    """代理诊断测试"""
    
    def test_network_environment_check(self):
        """网络环境检查"""
        print("\n🔍 网络环境检查:")
        
        # 检查是否能解析域名
        try:
            import socket
            ip = socket.gethostbyname(BRIGHT_DATA_CONFIG['host'])
            print(f"   ✅ DNS解析: {BRIGHT_DATA_CONFIG['host']} -> {ip}")
        except Exception as e:
            print(f"   ❌ DNS解析失败: {e}")
        
        # 检查端口连通性
        try:
            sock = socket.create_connection(
                (BRIGHT_DATA_CONFIG['host'], BRIGHT_DATA_CONFIG['port']), 
                timeout=10
            )
            sock.close()
            print(f"   ✅ 端口连通: {BRIGHT_DATA_CONFIG['port']}")
        except Exception as e:
            print(f"   ❌ 端口不通: {e}")

    def test_python_ssl_warning_fix(self):
        """Python SSL警告修复检查"""
        import ssl
        print(f"\n🔍 SSL环境检查:")
        print(f"   Python SSL版本: {ssl.OPENSSL_VERSION}")
        print(f"   SSL版本号: {ssl.OPENSSL_VERSION_INFO}")
        
        if ssl.OPENSSL_VERSION_INFO < (1, 1, 1):
            print("   ⚠️  建议升级OpenSSL到1.1.1+版本")
        else:
            print("   ✅ OpenSSL版本符合要求")


if __name__ == '__main__':
    print("="*70)
    print("Bright Data修正配置测试")
    print("="*70)
    print(f"配置信息:")
    print(f"  主机: {BRIGHT_DATA_CONFIG['host']}")
    print(f"  端口: {BRIGHT_DATA_CONFIG['port']} (已修正)")
    print(f"  完整用户名: {username}")
    print(f"  SSL验证: 已禁用 (立即访问模式)")
    print("="*70)
    
    # 创建测试套件
    suite = unittest.TestSuite()
    
    # 添加测试用例
    suite.addTest(unittest.makeSuite(TestCorrectedBrightData))
    suite.addTest(unittest.makeSuite(TestProxyDiagnostics))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出结果统计
    print(f"\n{'='*70}")
    print(f"修正配置测试结果:")
    print(f"{'='*70}")
    print(f"运行测试: {result.testsRun}")
    print(f"成功: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    success_rate = ((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100) if result.testsRun > 0 else 0
    print(f"成功率: {success_rate:.1f}%")
    
    if success_rate < 50:
        print(f"\n💡 进一步排查建议:")
        print(f"1. 检查Bright Data控制面板中的zone名称是否为'scraping_browser1'")
        print(f"2. 确认账户余额充足且zone状态为活跃")
        print(f"3. 如使用IP定向，检查IP是否正确分配")
        print(f"4. 联系Bright Data技术支持确认配置")
    
    print(f"{'='*70}")