#!/usr/bin/env python3
import ssl
import subprocess

import aiohttp
import asyncio


BRIGHT_DATA_CONFIG = {
    'host': 'brd.superproxy.io',
    'port': 33335,
    'base_username': 'brd-customer-hl_74a6e114',
    'zone': 'scraping_browser1',
    'password': 'fgf480g2mejd'
}

def test_with_curl():
    """使用curl测试代理连接"""
    username = f"{BRIGHT_DATA_CONFIG['base_username']}-zone-{BRIGHT_DATA_CONFIG['zone']}"
    
    curl_cmd = [
        'curl', '-v', '--connect-timeout', '15',
        '--proxy', f"http://{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}",
        '--proxy-user', f"{username}:{BRIGHT_DATA_CONFIG['password']}",
        'https://httpbin.org/ip'
    ]
    
    print("🔧 执行curl测试命令...")
    print(f"代理: {BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}")
    print(f"用户: {username}")
    
    try:
        result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=20)
        
        print(f"\n📊 Curl结果:")
        print(f"返回码: {result.returncode}")
        
        if result.stdout:
            print(f"✅ 成功输出:\n{result.stdout}")
        
        if result.stderr:
            print(f"🔍 详细信息:\n{result.stderr}")
            
            # 检查Bright Data特有的错误标识
            if 'x-brd-' in result.stderr.lower():
                print("📍 检测到Bright Data响应头 - 错误来自代理服务")
            
            # 检查常见错误
            if '407' in result.stderr:
                print("❌ 代理认证失败 - 请检查用户名和密码")
            elif '403' in result.stderr:
                print("❌ 访问被禁止 - 可能是zone配置问题")
            elif 'timeout' in result.stderr.lower():
                print("⏰ 连接超时 - 网络或防火墙问题")
            elif 'connection refused' in result.stderr.lower():
                print("❌ 连接被拒绝 - 端口或主机问题")
        
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print("❌ Curl命令执行超时")
        return False
    except FileNotFoundError:
        print("❌ 系统未安装curl命令")
        return False
    except Exception as e:
        print(f"❌ Curl执行出错: {e}")
        return False

async def test_with_python():
    """使用Python aiohttp测试"""
    username = f"{BRIGHT_DATA_CONFIG['base_username']}-zone-{BRIGHT_DATA_CONFIG['zone']}"
    proxy_url = f"http://{username}:{BRIGHT_DATA_CONFIG['password']}@{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}"
    
    print(f"\n🐍 Python aiohttp测试...")
    print(f"代理URL: {proxy_url[:50]}...")
    
    # 创建忽略SSL的上下文
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        timeout = aiohttp.ClientTimeout(total=20, connect=15)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            resp = await session.get("https://httpbin.org/ip", proxy=proxy_url)
            
            if resp.status == 200:
                data = await resp.json()
                ip = data.get('origin', 'Unknown')
                print(f"✅ Python测试成功!")
                print(f"   代理IP: {ip}")
                
                # 检查响应头
                brd_headers = {k: v for k, v in resp.headers.items() if 'brd' in k.lower()}
                if brd_headers:
                    print(f"   Bright Data头信息: {brd_headers}")
                
                return True
            else:
                print(f"❌ HTTP状态码: {resp.status}")
                text = await resp.text()
                print(f"   响应: {text[:200]}...")
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

def test_alternative_zones():
    """测试其他可能的zone名称"""
    possible_zones = [
        'scraping_browser1',
        'residential', 
        'datacenter',
        'static_residential',
        'mobile'
    ]
    
    print(f"\n🔄 测试不同的zone配置...")
    
    for zone in possible_zones:
        username = f"{BRIGHT_DATA_CONFIG['base_username']}-zone-{zone}"
        
        curl_cmd = [
            'curl', '--connect-timeout', '10', '--max-time', '15',
            '--proxy', f"http://{BRIGHT_DATA_CONFIG['host']}:{BRIGHT_DATA_CONFIG['port']}",
            '--proxy-user', f"{username}:{BRIGHT_DATA_CONFIG['password']}",
            'https://httpbin.org/ip'
        ]
        
        print(f"测试zone: {zone}")
        
        try:
            result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=20)
            if result.returncode == 0 and result.stdout:
                print(f"   ✅ Zone '{zone}' 工作正常!")
                print(f"   IP响应: {result.stdout.strip()}")
                return zone
            else:
                print(f"   ❌ Zone '{zone}' 失败")
                
        except Exception:
            print(f"   ❌ Zone '{zone}' 测试出错")
    
    return None

def main():
    """主测试函数"""
    print("="*60)
    print("Bright Data 快速代理测试")
    print("="*60)
    
    # 1. 首先用curl测试
    curl_success = test_with_curl()
    
    if curl_success:
        print("\n🎉 curl测试成功! 代理配置正确")
    else:
        print("\n❌ curl测试失败")
        
        # 2. 尝试不同的zone
        print("\n尝试其他zone配置...")
        working_zone = test_alternative_zones()
        
        if working_zone:
            print(f"\n✅ 找到可用的zone: {working_zone}")
            # 更新配置
            BRIGHT_DATA_CONFIG['zone'] = working_zone
            curl_success = True
        else:
            print("\n❌ 所有zone都失败")
    
    # 3. 如果curl成功，测试Python
    if curl_success:
        print(f"\n继续Python测试...")
        python_success = asyncio.run(test_with_python())
        
        if python_success:
            print(f"\n🎉 所有测试成功! 代理完全可用")
        else:
            print(f"\n⚠️  curl成功但Python失败 - 可能是SSL或aiohttp配置问题")
    
    # 4. 输出建议
    print(f"\n" + "="*60)
    print("建议和总结:")
    if curl_success:
        print("✅ 代理服务器可达且认证正确")
        print(f"✅ 推荐配置: zone={BRIGHT_DATA_CONFIG['zone']}")
    else:
        print("❌ 代理连接失败，请检查:")
        print("   1. Bright Data账户状态和余额")
        print("   2. Zone名称是否正确")
        print("   3. 用户名和密码是否正确")
        print("   4. 网络防火墙设置")
    
    print("="*60)

if __name__ == "__main__":
    main()