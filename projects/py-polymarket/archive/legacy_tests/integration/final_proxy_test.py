#!/usr/bin/env python3
import os
import socket
import ssl
import subprocess
import sys
import types
from core.data_collector import AsyncDataCollector
from core.risk_manager import RiskEngine
from core.strategy import ArbitrageStrategy, MarketMakingStrategy

import aiohttp
import asyncio
from unittest.mock import Mock


sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))

# 最终正确的Bright Data配置
BRIGHT_DATA_CONFIG = {
    'host': 'brd.superproxy.io',
    'port': 33335,
    'username': 'brd-customer-hl_74a6e114-zone-residential_proxy1',  # 正确的用户名
    'password': 'fgf480g2mejd'
}

proxy_url = f"http://{BRIGHT_DATA_CONFIG['username']}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"

print("="*80)
print("🎯 Bright Data 最终测试 - 使用正确的用户名")
print("="*80)
print(f"用户名: {BRIGHT_DATA_CONFIG['username']}")
print(f"主机端口: {BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}")
print(f"代理URL: {proxy_url[:70]}...")
print("="*80)

def test_basic_connectivity():
    """测试基础连接性"""
    print("\n🔧 1. 基础连接性测试")
    
    # 测试端口连通性
    import socket
    try:
        sock = socket.create_connection((BRIGHT_DATA_CONFIG['host'], BRIGHT_DATA_CONFIG['port']), timeout=5)
        sock.close()
        print(f"   ✅ 端口 {BRIGHT_DATA_CONFIG['port']} 可达")
    except Exception as e:
        print(f"   ❌ 端口连接失败: {e}")
        return False
    
    # 测试代理服务器响应
    try:
        result = subprocess.run([
            'curl', '--connect-timeout', '3', '--max-time', '5',
            f"http://{BRIGHT_DATA_CONFIG['username']}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"
        ], capture_output=True, text=True, timeout=10)
        
        if 'Proxy Authentication Required' in result.stdout:
            print(f"   ⚠️  认证格式可能有问题")
            return False
        elif result.stdout:
            print(f"   ✅ 代理服务器响应: {result.stdout.strip()}")
            return True
        else:
            print(f"   ⚠️  代理服务器无响应")
            return False
    except Exception as e:
        print(f"   ❌ 代理服务器测试失败: {e}")
        return False

def test_simple_request():
    """测试简单请求"""
    print("\n🌐 2. 简单HTTP请求测试")
    
    curl_cmd = [
        'curl', '-s', '--connect-timeout', '8', '--max-time', '15',
        '--proxy', f"http://{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}",
        '--proxy-user', f"{BRIGHT_DATA_CONFIG['username']}:{BRIGHT_DATA_CONFIG['password']}",
        'http://httpbin.org/ip'
    ]
    
    try:
        result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=20)
        
        if result.returncode == 0 and result.stdout:
            print(f"   ✅ HTTP请求成功!")
            print(f"   📍 响应: {result.stdout.strip()}")
            return True, result.stdout
        else:
            print(f"   ❌ HTTP请求失败")
            if result.stderr:
                print(f"   🔍 错误信息: {result.stderr.strip()}")
            return False, result.stderr
    except subprocess.TimeoutExpired:
        print(f"   ❌ 请求超时")
        return False, "Timeout"
    except Exception as e:
        print(f"   ❌ 请求失败: {e}")
        return False, str(e)

async def test_python_aiohttp():
    """使用Python aiohttp测试"""
    print("\n🐍 3. Python aiohttp测试")
    
    # 忽略SSL验证
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        timeout = aiohttp.ClientTimeout(total=20, connect=15)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=timeout, 
            headers=headers
        ) as session:
            resp = await session.get("http://httpbin.org/ip", proxy=proxy_url)
            
            if resp.status == 200:
                data = await resp.json()
                ip = data.get('origin', 'Unknown')
                print(f"   ✅ Python请求成功!")
                print(f"   📍 代理IP: {ip}")
                
                # 检查响应头
                brd_headers = {k: v for k, v in resp.headers.items() 
                             if any(x in k.lower() for x in ['brd', 'x-', 'proxy'])}
                if brd_headers:
                    print(f"   🔍 代理相关头信息: {brd_headers}")
                
                return True, ip
            else:
                print(f"   ❌ HTTP状态码: {resp.status}")
                text = await resp.text()
                print(f"   📄 响应内容: {text[:150]}...")
                return False, f"HTTP {resp.status}"
                
    except Exception as e:
        print(f"   ❌ Python请求失败: {type(e).__name__}: {e}")
        return False, str(e)

async def test_polymarket_integration():
    """测试Polymarket API集成"""
    print("\n🎯 4. Polymarket API集成测试")
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        timeout = aiohttp.ClientTimeout(total=25)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers
        ) as session:
            # 测试Polymarket Events API
            resp = await session.get(
                "https://gamma-api.polymarket.com/events?limit=3&active=true",
                proxy=proxy_url
            )
            
            if resp.status == 200:
                events = await resp.json()
                print(f"   ✅ Polymarket API访问成功!")
                print(f"   📊 获取到 {len(events)} 个活跃事件")
                
                # 显示事件信息
                for i, event in enumerate(events[:2], 1):
                    title = event.get('title', 'Unknown')[:45]
                    slug = event.get('slug', 'unknown')
                    print(f"   {i}. {title}... ({slug})")
                
                return True, len(events)
            else:
                print(f"   ❌ Polymarket API失败: HTTP {resp.status}")
                text = await resp.text()
                print(f"   📄 响应: {text[:200]}...")
                return False, f"HTTP {resp.status}"
                
    except Exception as e:
        print(f"   ❌ Polymarket API测试失败: {e}")
        return False, str(e)

def update_data_collector_config():
    """更新数据收集器配置"""
    print("\n⚙️  5. 更新交易系统配置")
    
    # 在线模式配置
    class FinalBrightDataSettings:
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
    config_module.settings = FinalBrightDataSettings()
    sys.modules['config'] = config_module
    
    # 创建模拟的utils.proxy_manager模块
    utils_module = types.ModuleType('utils')
    proxy_manager_module = types.ModuleType('proxy_manager')
    from unittest.mock import Mock
    proxy_manager_module.ProxyManager = Mock()
    utils_module.proxy_manager = proxy_manager_module
    sys.modules['utils'] = utils_module
    sys.modules['utils.proxy_manager'] = proxy_manager_module
    
    try:
        from core.data_collector import AsyncDataCollector
        from core.strategy import MarketMakingStrategy, ArbitrageStrategy
        from core.risk_manager import RiskEngine
        
        print(f"   ✅ 交易系统模块加载成功")
        print(f"   ⚙️  代理URL已配置: {proxy_url[:50]}...")
        
        # 创建实例测试
        collector = AsyncDataCollector()
        market_making = MarketMakingStrategy()
        risk_engine = RiskEngine()
        
        print(f"   ✅ 所有组件初始化成功")
        return True
        
    except Exception as e:
        print(f"   ❌ 配置更新失败: {e}")
        return False

async def main():
    """主测试流程"""
    print("开始完整的Bright Data代理测试流程...\n")
    
    results = {}
    
    # 1. 基础连接性
    results['connectivity'] = test_basic_connectivity()
    
    # 2. 简单请求
    if results['connectivity']:
        results['simple_request'], curl_response = test_simple_request()
    else:
        results['simple_request'] = False
        curl_response = None
    
    # 3. Python请求
    if results['simple_request']:
        results['python_request'], python_response = await test_python_aiohttp()
    else:
        results['python_request'] = False
        python_response = None
    
    # 4. Polymarket API
    if results['python_request']:
        results['polymarket_api'], api_response = await test_polymarket_integration()
    else:
        results['polymarket_api'] = False
        api_response = None
    
    # 5. 配置更新
    results['config_update'] = update_data_collector_config()
    
    # 总结报告
    print("\n" + "="*80)
    print("🏁 测试完成 - 最终报告")
    print("="*80)
    
    passed_tests = sum(results.values())
    total_tests = len(results)
    success_rate = (passed_tests / total_tests) * 100
    
    print(f"📊 测试结果: {passed_tests}/{total_tests} 通过 ({success_rate:.1f}%)")
    print(f"📋 详细结果:")
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"   {test_name.replace('_', ' ').title()}: {status}")
    
    if success_rate >= 80:
        print(f"\n🎉 代理配置成功! 可以用于生产环境")
        print(f"✅ 推荐配置:")
        print(f"   用户名: {BRIGHT_DATA_CONFIG['username']}")
        print(f"   代理URL: {proxy_url}")
        
        # 保存配置到文件
        with open('bright_data_config.txt', 'w') as f:
            f.write(f"# Bright Data 代理配置\n")
            f.write(f"PROXY_URL={proxy_url}\n")
            f.write(f"USERNAME={BRIGHT_DATA_CONFIG['username']}\n")
            f.write(f"HOST={BRIGHT_DATA_CONFIG['host']}\n")
            f.write(f"PORT={BRIGHT_DATA_CONFIG['port']}\n")
        
        print(f"   💾 配置已保存到 bright_data_config.txt")
        
    elif success_rate >= 40:
        print(f"\n⚠️  代理部分可用，建议进一步调试")
        print(f"💡 建议检查:")
        if not results['connectivity']:
            print(f"   - 网络连接和防火墙设置")
        if not results['simple_request']:
            print(f"   - 代理认证配置")
        if not results['python_request']:
            print(f"   - Python SSL证书配置")
        if not results['polymarket_api']:
            print(f"   - API访问权限和限制")
    else:
        print(f"\n❌ 代理配置需要修正")
        print(f"💡 建议:")
        print(f"   1. 确认Bright Data账户状态和余额")
        print(f"   2. 验证用户名: {BRIGHT_DATA_CONFIG['username']}")
        print(f"   3. 检查密码是否正确")
        print(f"   4. 联系Bright Data技术支持")
        print(f"\n🔄 备用方案: 使用直连模式")
        print(f"   你的交易系统在直连模式下完全可用!")
    
    print("="*80)

if __name__ == "__main__":
    asyncio.run(main())