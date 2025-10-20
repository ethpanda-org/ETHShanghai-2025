#!/usr/bin/env python3
"""
Polymarket模拟交易快速启动脚本

一键启动模拟交易系统，测试盈利能力
"""

import asyncio
import sys
import os
from datetime import datetime

def print_banner():
    print("="*60)
    print("Polymarket模拟交易系统 - 快速启动")
    print("="*60)
    print("实时连接Polymarket，模拟交易，测试收益能力")
    print()

def check_environment():
    """检查环境配置"""
    print("检查系统环境...")
    
    # 检查Python版本
    if sys.version_info < (3, 7):
        print("❌ Python版本过低，需要3.7+")
        return False
    print(f"✅ Python版本: {sys.version.split()[0]}")
    
    # 检查必要依赖
    required_packages = ['aiohttp', 'numpy', 'pandas', 'dotenv']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}: 已安装")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package}: 未安装")
    
    if missing_packages:
        print(f"\n需要安装依赖: pip install {' '.join(missing_packages)}")
        return False
    
    # 检查API配置
    from dotenv import load_dotenv
    load_dotenv()
    
    twitter_token = os.getenv('TWITTER_BEARER_TOKEN')
    newsapi_key = os.getenv('NEWSAPI_KEY')
    
    api_count = 0
    if twitter_token:
        print(f"✅ Twitter API: 已配置")
        api_count += 1
    else:
        print("⚠️ Twitter API: 未配置")
    
    if newsapi_key:
        print(f"✅ NewsAPI: 已配置")  
        api_count += 1
    else:
        print("⚠️ NewsAPI: 未配置")
    
    print(f"API配置状态: {api_count}/2")
    print()
    return True

async def run_simulation():
    """运行模拟交易"""
    try:
        # 导入模拟交易系统
        from simulation_trading import PolymarketSimulationSystem
        from proxy_config import setup_proxy_config
        
        print("初始化模拟交易系统...")
        
        # 代理配置
        print("\n🔒 网络安全配置:")
        use_proxy_choice = input("是否使用代理保护IP？(Y/n): ").strip().lower()
        use_proxy = use_proxy_choice != 'n'
        
        if use_proxy:
            print("配置代理设置...")
            proxy_configured = setup_proxy_config()
            if not proxy_configured:
                print("⚠️ 代理配置失败，将使用直连模式")
                use_proxy = False
        
        # 获取用户配置
        print("\n配置模拟参数:")
        initial_balance = input("初始资金 (默认 $10,000): ").strip()
        if not initial_balance:
            initial_balance = 10000
        else:
            initial_balance = float(initial_balance)
        
        duration = input("模拟时长/小时 (默认 2小时): ").strip()
        if not duration:
            duration = 2
        else:
            duration = float(duration)
        
        print(f"\n启动模拟交易:")
        print(f"- 初始资金: ${initial_balance:,.0f}")
        print(f"- 模拟时长: {duration}小时")
        print(f"- 代理保护: {'✅ 已启用' if use_proxy else '❌ 未启用'}")
        print(f"- 开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        print("🚀 模拟交易开始...")
        print("按 Ctrl+C 可随时停止")
        print("-"*50)
        
        # 创建并运行模拟系统
        sim_system = PolymarketSimulationSystem(initial_balance, use_proxy=use_proxy)
        await sim_system.run_simulation(duration)
        
    except KeyboardInterrupt:
        print("\n\n用户停止模拟交易")
        print("正在生成最终报告...")
    except Exception as e:
        print(f"\n模拟交易出错: {e}")
        import traceback
        traceback.print_exc()

def main():
    """主函数"""
    print_banner()
    
    if not check_environment():
        print("\n环境检查失败，请修复后重试")
        input("按回车键退出...")
        return
    
    print("环境检查通过！")
    print("\n准备启动模拟交易...")
    input("按回车键开始...")
    
    try:
        asyncio.run(run_simulation())
    except Exception as e:
        print(f"启动失败: {e}")
        input("按回车键退出...")

if __name__ == "__main__":
    main()