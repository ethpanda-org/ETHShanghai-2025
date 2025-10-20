#!/usr/bin/env python3
"""
Bright Data Proxy Manager 配置指南
"""

def proxy_manager_setup_guide():
    print("=" * 70)
    print("Bright Data Proxy Manager 设置指南")
    print("=" * 70)
    
    print("\n[步骤1] 安装Proxy Manager")
    print("1. 访问: https://brightdata.com/products/proxy-manager")
    print("2. 下载适用于Windows的Proxy Manager")
    print("3. 安装并启动应用程序")
    
    print("\n[步骤2] 配置端口")
    print("1. 打开Proxy Manager应用")
    print("2. 点击 'Add new proxy port'")
    print("3. 选择 'Rotating (IPs)' 预设")
    print("4. 配置:")
    print("   - Zone: residential_proxy1")
    print("   - Port: 24000 (或其他可用端口)")
    print("   - Session: true")
    print("   - IP rotation: Every request")
    
    print("\n[步骤3] 启动代理端口")
    print("1. 点击 'Save' 保存配置")
    print("2. 启动代理端口")
    print("3. 记录本地端口号 (如: 24000)")
    
    print("\n[步骤4] 在代码中使用")
    print("使用本地代理地址: http://127.0.0.1:24000")
    print("每个请求会自动轮换到新的IP")
    
    print("\n[代码示例]")
    print("""
async with aiohttp.ClientSession() as session:
    response = await session.get(
        "https://clob.polymarket.com/ping",
        proxy="http://127.0.0.1:24000"  # Proxy Manager本地端口
    )
""")

if __name__ == "__main__":
    proxy_manager_setup_guide()