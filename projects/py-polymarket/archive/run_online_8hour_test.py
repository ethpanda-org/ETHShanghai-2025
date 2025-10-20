#!/usr/bin/env python3
"""
在线8小时智能代理测试
使用真实在线数据源，条件代理模式
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
    print("在线8小时智能代理交易测试")
    print("条件代理模式 + 真实数据源")
    print("=" * 60)
    print()
    
    print("测试配置:")
    print("- 运行模式: 在线模式（真实API数据）")
    print("- 代理模式: 条件代理（爬虫时启用）")
    print("- 数据源: CLOB + GraphQL 真实API")
    print("- 网络故障处理: 智能重试和错误恢复")
    print("- 测试时长: 8小时")
    print("- 初始资金: $15,000")
    print("- Web监控: 启用")
    print()
    
    # 选择模式
    print("选择运行模式:")
    print("1. 直连模式 (CLOB + GraphQL，无需代理)")
    print("2. 混合模式 (CLOB/GraphQL直连 + Crawler代理)")
    print()
    
    try:
        mode_input = input("请选择模式 (1/2): ").strip()
        enable_crawler = mode_input == "2"
    except (EOFError, KeyboardInterrupt):
        print("\n[DEFAULT] 使用直连模式")
        enable_crawler = False
    
    if enable_crawler:
        print("\n[MODE] 混合模式: 需要代理配置用于爬虫功能")
        print("[REQUIREMENT] 确保代理在端口33335运行")
    else:
        print("\n[MODE] 直连模式: CLOB/GraphQL官方API直连")
        print("[INFO] 无需代理配置")
    
    print()
    
    try:
        from smart_proxy_trading_system import SmartProxyTradingSystem
        
        # 创建在线智能代理交易系统
        system = SmartProxyTradingSystem(
            initial_balance=15000,
            enable_crawler=enable_crawler,
            auto_monitor=True,          # 启用Web监控
            proxy_manager_port=33335
        )
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 开始在线8小时智能代理测试...")
        print()
        
        if enable_crawler:
            print("[CRAWLER] 爬虫操作将使用代理模式")
        print("[ONLINE] 使用真实CLOB和GraphQL API数据")
        print("[DIRECT] CLOB和GraphQL使用直连模式")
        print("[MONITOR] Web监控: http://localhost:8888")
        print("[RECOVERY] 网络故障时自动重试和错误恢复")
        print()
        
        # 运行8小时在线测试
        await system.run_smart_simulation(8.0)
        
        print()
        print("[COMPLETED] 8小时在线智能代理测试完成！")
        print("[SUCCESS] 条件代理模式验证成功")
        
    except Exception as e:
        print(f"[ERROR] 系统错误: {e}")
        import traceback
        traceback.print_exc()
        
        print()
        print("[TROUBLESHOOTING] 在线测试故障排查:")
        if enable_crawler:
            print("1. 检查代理服务器是否在端口33335运行")
            print("2. 验证Bright Data代理配置")
        print("3. 检查网络连接到CLOB API (clob.polymarket.com)")
        print("4. 检查网络连接到GraphQL API (api.goldsky.com)")
        print("5. 确认防火墙未阻止外部连接")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] 用户中断了在线测试")
        print("[INFO] 检查最新的enhanced_simulation_report_*.json获取结果")
    except Exception as e:
        print(f"\n[FATAL] 在线测试错误: {e}")