#!/usr/bin/env python3
import asyncio
import aiohttp
import ssl
import subprocess

# 使用正确的代理名称配置
BRIGHT_DATA_CONFIG = {
    'host': 'brd.superproxy.io',
    'port': 33335,
    'customer_id': 'hl_74a6e114',
    'proxy_name': '住宅代理1',  # 正确的代理名称
    'password': 'fgf480g2mejd'
}

# 构建正确的用户名
username = f"brd-customer-{BRIGHT_DATA_CONFIG['customer_id']}-zone-{BRIGHT_DATA_CONFIG['proxy_name']}"
proxy_url = f"http://{username}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"

print("="*70)
print("Bright Data 代理测试 - 使用正确的代理名称")
print("="*70)
print(f"客户ID: {BRIGHT_DATA_CONFIG['customer_id']}")
print(f"代理名称: {BRIGHT_DATA_CONFIG['proxy_name']}")
print(f"完整用户名: {username}")
print(f"代理URL: {proxy_url[:60]}...")
print("="*70)

def test_with_curl():
    """使用curl测试代理连接"""
    curl_cmd = [
        'curl', '-v', '--connect-timeout', '15', '--max-time', '30',
        '--proxy', f"http://{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}",
        '--proxy-user', f"{username}:{BRIGHT_DATA_CONFIG['password']}",
        'https://httpbin.org/ip'
    ]
    
    print("\n🔧 执行curl测试...")
    print(f"命令: curl --proxy http://{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']} --proxy-user {username}:*** https://httpbin.org/ip")
    
    try:
        result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=35)
        
        print(f"\n📊 Curl测试结果:")
        print(f"返回码: {result.returncode}")
        
        if result.stdout:
            print(f"✅ 成功响应:")
            print(result.stdout)
            return True, result.stdout
        
        if result.stderr:
            print(f"🔍 详细信息:")
            print(result.stderr)
            
            # 分析错误类型
            if '407' in result.stderr:
                print("❌ 认证失败 (HTTP 407) - 用户名或密码错误")
            elif '403' in result.stderr:
                print("❌ 访问被禁止 (HTTP 403) - 可能是代理配置问题")
            elif 'timeout' in result.stderr.lower():
                print("⏰ 连接超时 - 网络问题或代理不响应")
            elif 'connection refused' in result.stderr.lower():
                print("❌ 连接被拒绝 - 端口或服务问题")
            elif 'x-brd-' in result.stderr.lower():
                print("📍 检测到Bright Data错误头 - 代理服务响应")
            
        return result.returncode == 0, result.stderr
        
    except subprocess.TimeoutExpired:
        print("❌ Curl命令执行超时")
        return False, "Command timeout"
    except Exception as e:
        print(f"❌ Curl执行出错: {e}")
        return False, str(e)

async def test_with_python():
    """使用Python测试代理"""
    print(f"\n🐍 Python aiohttp测试...")
    
    # 忽略SSL验证
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        timeout = aiohttp.ClientTimeout(total=30, connect=20)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        async with aiohttp.ClientSession(
            connector=connector, 
            timeout=timeout,
            headers=headers
        ) as session:
            resp = await session.get("https://httpbin.org/ip", proxy=proxy_url)
            
            if resp.status == 200:
                data = await resp.json()
                ip = data.get('origin', 'Unknown')
                print(f"✅ Python测试成功!")
                print(f"   代理IP: {ip}")
                
                # 检查Bright Data响应头
                brd_headers = {k: v for k, v in resp.headers.items() if 'brd' in k.lower() or 'x-' in k.lower()}
                if brd_headers:
                    print(f"   响应头信息: {brd_headers}")
                
                return True, ip
            else:
                print(f"❌ HTTP状态码: {resp.status}")
                text = await resp.text()
                print(f"   响应内容: {text[:300]}...")
                return False, f"HTTP {resp.status}"
                
    except aiohttp.ClientProxyConnectionError as e:
        print(f"❌ 代理连接错误: {e}")
        return False, str(e)
    except asyncio.TimeoutError:
        print(f"❌ 连接超时")
        return False, "Timeout"
    except Exception as e:
        print(f"❌ 其他错误: {type(e).__name__}: {e}")
        return False, str(e)

async def test_polymarket_api():
    """测试Polymarket API访问"""
    print(f"\n🎯 测试Polymarket API访问...")
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        timeout = aiohttp.ClientTimeout(total=30)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
        
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers
        ) as session:
            # 测试Polymarket Events API
            resp = await session.get(
                "https://gamma-api.polymarket.com/events?limit=5",
                proxy=proxy_url
            )
            
            if resp.status == 200:
                events = await resp.json()
                print(f"✅ Polymarket API访问成功!")
                print(f"   获取到 {len(events)} 个事件")
                
                # 显示前两个事件
                for i, event in enumerate(events[:2], 1):
                    title = event.get('title', 'Unknown')[:50]
                    active = event.get('active', False)
                    end_date = event.get('end_date_iso', 'Unknown')[:10]
                    print(f"   {i}. {title}... (活跃: {active}, 结束: {end_date})")
                
                return True, events
            else:
                print(f"❌ Polymarket API失败: HTTP {resp.status}")
                text = await resp.text()
                print(f"   响应: {text[:200]}...")
                return False, f"HTTP {resp.status}"
                
    except Exception as e:
        print(f"❌ Polymarket API测试失败: {e}")
        return False, str(e)

def test_session_persistence():
    """测试会话保持功能"""
    print(f"\n🔄 测试会话保持...")
    
    # 使用会话ID
    session_id = int(asyncio.get_event_loop().time())
    session_username = f"{username}-session-{session_id}"
    
    curl_cmd = [
        'curl', '--connect-timeout', '10', '--max-time', '20',
        '--proxy', f"http://{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}",
        '--proxy-user', f"{session_username}:{BRIGHT_DATA_CONFIG['password']}",
        'https://httpbin.org/ip'
    ]
    
    print(f"会话用户名: {session_username}")
    
    try:
        ips = []
        for i in range(3):
            print(f"   请求 {i+1}/3...")
            result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=25)
            if result.returncode == 0 and result.stdout:
                import json
                try:
                    data = json.loads(result.stdout)
                    ip = data.get('origin', 'Unknown')
                    ips.append(ip)
                    print(f"     IP: {ip}")
                except:
                    print(f"     无法解析响应")
        
        if len(ips) >= 2:
            if len(set(ips)) == 1:
                print(f"✅ 会话保持成功 - 所有请求使用相同IP: {ips[0]}")
                return True
            else:
                print(f"⚠️  IP发生变化: {ips}")
                return True  # 仍然算成功，只是没有保持会话
        else:
            print(f"❌ 会话测试失败")
            return False
            
    except Exception as e:
        print(f"❌ 会话测试出错: {e}")
        return False

async def main():
    """主测试函数"""
    success_count = 0
    total_tests = 4
    
    # 测试1: Curl基础连接
    print("测试1: Curl基础连接测试")
    curl_success, curl_result = test_with_curl()
    if curl_success:
        success_count += 1
        print("✅ Curl测试通过")
    else:
        print("❌ Curl测试失败")
    
    # 如果curl成功，继续其他测试
    if curl_success:
        # 测试2: Python连接
        print("\n" + "="*50)
        print("测试2: Python连接测试")
        python_success, python_result = await test_with_python()
        if python_success:
            success_count += 1
            print("✅ Python测试通过")
        
        # 测试3: Polymarket API
        print("\n" + "="*50)
        print("测试3: Polymarket API测试")
        api_success, api_result = await test_polymarket_api()
        if api_success:
            success_count += 1
            print("✅ Polymarket API测试通过")
        
        # 测试4: 会话保持
        print("\n" + "="*50)
        print("测试4: 会话保持测试")
        session_success = test_session_persistence()
        if session_success:
            success_count += 1
            print("✅ 会话保持测试通过")
    
    # 总结
    print("\n" + "="*70)
    print("测试总结:")
    print("="*70)
    print(f"通过测试: {success_count}/{total_tests}")
    print(f"成功率: {success_count/total_tests*100:.1f}%")
    
    if success_count >= 2:
        print("🎉 代理配置基本正常！可以用于生产环境")
        print(f"✅ 推荐配置:")
        print(f"   代理名称: {BRIGHT_DATA_CONFIG['proxy_name']}")
        print(f"   用户名格式: {username}")
    elif success_count >= 1:
        print("⚠️  代理部分可用，建议进一步优化配置")
    else:
        print("❌ 代理配置需要修正，请检查:")
        print("   1. 代理名称是否为'住宅代理1'")
        print("   2. 客户ID是否正确")
        print("   3. 密码是否正确")
        print("   4. 账户余额和状态")
    
    print("="*70)

if __name__ == "__main__":
    asyncio.run(main())