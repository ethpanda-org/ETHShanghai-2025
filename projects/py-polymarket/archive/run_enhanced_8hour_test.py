#!/usr/bin/env python3
"""
增强版8小时智能代理测试
具有更强的错误恢复能力和混合数据源策略
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
    print("增强版智能代理系统 - 8小时完整测试")
    print("条件代理模式 + 增强错误恢复")
    print("=" * 60)
    print()
    
    print("增强配置:")
    print("- 数据源: CLOB + GraphQL + 离线Mock数据")
    print("- 错误恢复: 网络失败时自动切换到离线模式")
    print("- 连接策略: 智能路由 + 故障切换")
    print("- 代理模式: 条件代理（爬虫时启用）")
    print("- 测试时长: 8小时")
    print("- 初始资金: $15,000")
    print("- Web监控: 启用")
    print()
    
    # 选择模式
    print("选择运行模式:")
    print("1. 直连模式 (CLOB + GraphQL，网络故障时切换离线)")
    print("2. 混合模式 (包含爬虫功能，需要代理)")
    print("3. 增强离线模式 (完全离线，使用模拟数据)")
    print()
    
    try:
        mode_input = input("请选择模式 (1/2/3): ").strip()
        
        if mode_input == "2":
            enable_crawler = True
            offline_mode = False
        elif mode_input == "3":
            enable_crawler = False
            offline_mode = True
        else:
            enable_crawler = False
            offline_mode = False
            
    except (EOFError, KeyboardInterrupt):
        print("\n[DEFAULT] 使用直连模式")
        enable_crawler = False
        offline_mode = False
    
    print(f"\n[MODE] 配置确认:")
    print(f"- 爬虫功能: {'启用' if enable_crawler else '禁用'}")
    print(f"- 离线模式: {'启用' if offline_mode else '禁用'}")
    print(f"- 故障切换: {'启用' if not offline_mode else '不适用'}")
    print()
    
    try:
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        
        # 创建增强交易系统
        system = EnhancedPolymarketSimulationSystem(
            initial_balance=15000,
            use_proxy=enable_crawler,
            offline_mode=offline_mode,
            auto_monitor=True,
            use_clob=True,
            use_graphql=True
        )
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 开始增强版8小时交易测试...")
        
        if enable_crawler:
            print("[CRAWLER] 爬虫操作将使用代理模式")
        if offline_mode:
            print("[OFFLINE] 使用离线模拟数据模式")
        else:
            print("[ONLINE] 在线模式，网络故障时自动处理")
            
        print("[DIRECT] CLOB和GraphQL优先使用直连")
        print("[MONITOR] Web监控: http://localhost:8888")
        print("[STRATEGIES] 多策略引擎: Spike Detection + Optimized + Mean Reversion")
        print()
        
        # 运行8小时增强测试
        await system.run_enhanced_simulation(8.0)
        
        print()
        print("[COMPLETED] 8小时增强交易测试完成！")
        print("[SUCCESS] 智能代理系统验证成功")
        
    except Exception as e:
        print(f"[ERROR] 系统错误: {e}")
        import traceback
        traceback.print_exc()
        
        print()
        print("[TROUBLESHOOTING] 错误排查:")
        if enable_crawler:
            print("1. 检查代理是否在端口33335运行")
            print("2. 验证Bright Data代理配置")
        if not offline_mode:
            print("3. 检查网络连接到CLOB和GraphQL端点")
        print("4. 确认依赖包已安装 (py-clob-client等)")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] 用户中断了交易测试")
        print("[INFO] 检查最新的enhanced_simulation_report_*.json文件获取结果")
    except Exception as e:
        print(f"\n[FATAL] 系统错误: {e}")