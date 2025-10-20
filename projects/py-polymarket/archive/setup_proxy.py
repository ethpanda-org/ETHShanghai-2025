#!/usr/bin/env python3
"""
代理配置工具

快速配置HTTP/SOCKS代理，保护IP安全
"""

import os
from proxy_config import setup_proxy_config

def main():
    print("="*50)
    print("Polymarket交易系统 - 代理配置工具")
    print("="*50)
    print()
    print("为什么需要代理？")
    print("• 保护真实IP地址")
    print("• 防止频繁请求被封锁")
    print("• 提高访问稳定性")
    print("• 绕过地理位置限制")
    print()
    
    # 检查当前代理配置
    from dotenv import load_dotenv
    load_dotenv()
    
    current_proxies = os.getenv('PROXY_LIST', '').strip()
    if current_proxies:
        proxy_count = len(current_proxies.split(','))
        print(f"✅ 当前已配置 {proxy_count} 个代理")
        print()
        
        choice = input("是否重新配置代理？(y/N): ").strip().lower()
        if choice != 'y':
            print("保持现有配置")
            return
    else:
        print("❌ 未配置代理")
        print()
    
    # 设置新的代理配置
    success = setup_proxy_config()
    
    if success:
        print()
        print("✅ 代理配置完成！")
        print()
        print("📋 使用说明:")
        print("• 运行模拟交易时会自动使用代理")
        print("• 系统会自动轮换代理地址")
        print("• 代理失败时会自动切换")
        print()
        print("🚀 现在可以安全地运行模拟交易:")
        print("   python run_simulation.py")
    else:
        print()
        print("❌ 代理配置失败")
        print("• 系统将使用直连模式")
        print("• 建议使用代理保护IP安全")
    
    input("\n按回车键退出...")

if __name__ == "__main__":
    main()