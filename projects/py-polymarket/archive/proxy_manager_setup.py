#!/usr/bin/env python3
"""
Bright Data Proxy Manager 安装和配置指南
"""

def proxy_manager_installation_guide():
    print("=" * 70)
    print("Bright Data Proxy Manager 安装配置指南")
    print("=" * 70)
    
    print("\n[步骤1] 下载和安装Proxy Manager")
    print("1. 访问: https://brightdata.com/products/proxy-manager")
    print("2. 点击 'Download' 按钮")
    print("3. 选择 Windows 版本下载")
    print("4. 运行安装程序并完成安装")
    print("5. 启动 Proxy Manager 应用程序")
    
    print("\n[步骤2] 登录和基础配置")
    print("1. 打开Proxy Manager应用")
    print("2. 使用你的Bright Data账号登录")
    print("3. 系统会自动检测你的可用zone")
    
    print("\n[步骤3] 创建轮换代理端口")
    print("1. 在主界面点击 '+ Add new proxy port'")
    print("2. 选择预设配置:")
    print("   - 点击 'Rotating (IPs)' 预设")
    print("   - 或手动配置以下设置:")
    
    print("\n[手动配置参数] (如果选择手动配置)")
    print("基础设置:")
    print("  - Port: 24000 (或其他未占用端口)")
    print("  - Zone: residential_proxy1 (你的zone名称)")
    print("  - Country: 留空 (自动分配) 或选择 'US'")
    
    print("\n高级设置:")
    print("  - Session: true (启用会话)")
    print("  - Keep-alive: 60 (秒)")
    print("  - Pool size: 50")
    print("  - IP rotation: 'every_request' (每次请求轮换)")
    print("  - DNS: 8.8.8.8")
    
    print("\n[步骤4] 启动代理端口")
    print("1. 配置完成后点击 'Save'")
    print("2. 点击端口旁边的 'Start' 按钮")
    print("3. 等待状态变为 'Running' (绿色)")
    print("4. 记录端口号 (例如: 24000)")
    
    print("\n[步骤5] 验证配置")
    print("代理地址: http://127.0.0.1:24000")
    print("每个请求会自动轮换到新的IP")
    print("无需用户名密码 (本地访问)")

if __name__ == "__main__":
    proxy_manager_installation_guide()