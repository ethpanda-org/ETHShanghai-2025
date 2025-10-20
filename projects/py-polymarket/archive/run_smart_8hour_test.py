#!/usr/bin/env python3
"""
智能代理系统 - 8小时完整测试
支持条件代理模式的完整交易测试
"""

import asyncio
import sys
import os
from datetime import datetime

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

async def main():
    """主函数"""
    print("=" * 60)
    print("智能代理系统 - 8小时完整测试")
    print("条件代理模式: 爬虫用代理，官方API直连")
    print("=" * 60)
    print()
    
    print("系统配置:")
    print("- 数据源: CLOB (直连) + GraphQL (直连) + Crawler (代理)")
    print("- 连接策略: 智能路由，根据操作类型选择连接方式")
    print("- 代理模式: 仅爬虫操作使用代理")
    print("- 官方API: 直连模式，无需代理")
    print("- 测试时长: 8小时")
    print("- 初始资金: $10,000")
    print("- Web监控: 自动启动")
    print()
    
    # 询问用户是否启用爬虫功能
    print("选择运行模式:")
    print("1. 直连模式 (仅CLOB + GraphQL，无需代理)")
    print("2. 混合模式 (CLOB/GraphQL直连 + Crawler代理)")
    print()
    
    try:
        mode_input = input("请选择模式 (1/2): ").strip()
        enable_crawler = mode_input == "2"
    except (EOFError, KeyboardInterrupt):
        print("\n[DEFAULT] 使用直连模式")
        enable_crawler = False
    
    if enable_crawler:
        print("\n[MODE] 混合模式: CLOB/GraphQL直连 + Crawler代理")
        print("[REQUIREMENT] 爬虫功能需要代理配置在端口33335")
    else:
        print("\n[MODE] 直连模式: 仅CLOB/GraphQL官方API")
        print("[INFO] 不需要代理配置")
    
    print()
    
    try:
        from smart_proxy_trading_system import SmartProxyTradingSystem
        
        # 创建智能代理交易系统
        system = SmartProxyTradingSystem(
            initial_balance=10000,
            enable_crawler=enable_crawler,
            auto_monitor=True,       # 启用Web监控
            proxy_manager_port=33335
        )
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 开始8小时智能代理交易测试...")
        
        if enable_crawler:
            print("[PROXY] 爬虫操作将使用代理模式")
        print("[DIRECT] CLOB和GraphQL将使用直连模式")
        print("[MONITOR] Web监控将在 http://localhost:8888 启动")
        print()
        
        # 运行8小时测试
        await system.run_smart_simulation(8.0)
        
        print()
        print("[COMPLETED] 8小时智能代理交易测试完成！")
        print("[SUCCESS] 条件代理模式验证成功")
        
    except Exception as e:
        print(f"[ERROR] 系统错误: {e}")
        import traceback
        traceback.print_exc()
        
        print()
        print("[TROUBLESHOOTING] 错误排查:")
        if enable_crawler:
            print("1. 检查代理是否在端口33335运行")
            print("2. 验证Bright Data代理配置")
        print("3. 检查网络连接")
        print("4. 确认依赖包已安装")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] 用户中断了模拟交易")
        print("[INFO] 最终报告应该已自动生成")
    except Exception as e:
        print(f"\n[FATAL] 意外错误: {e}")