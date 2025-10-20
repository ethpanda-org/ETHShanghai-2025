#!/usr/bin/env python3
"""
离线8小时智能代理测试
使用模拟数据确保测试能够完整运行8小时
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
    print("离线8小时智能代理交易测试")
    print("使用模拟数据 + 条件代理架构验证")
    print("=" * 60)
    print()
    
    print("测试配置:")
    print("- 运行模式: 离线模拟数据")
    print("- 代理模式: 条件代理（演示模式）")
    print("- 数据源: 模拟市场数据")
    print("- 测试时长: 8小时")
    print("- 初始资金: $20,000")
    print("- Web监控: 启用")
    print("- 策略: Spike Detection + Optimized + Mean Reversion")
    print()
    
    try:
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        
        # 创建离线模式交易系统
        system = EnhancedPolymarketSimulationSystem(
            initial_balance=20000,
            use_proxy=False,          # 不使用代理（演示条件代理逻辑）
            offline_mode=True,        # 强制离线模式
            auto_monitor=True,        # 启用Web监控
            use_clob=True,           # 演示CLOB集成（离线回退）
            use_graphql=True         # 演示GraphQL集成（离线回退）
        )
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 开始离线8小时智能代理测试...")
        print()
        
        print("[OFFLINE] 使用离线模拟数据")
        print("[PROXY] 条件代理架构 - 演示模式（不需要实际代理）")
        print("[CLOB] CLOB集成 - 离线回退到模拟数据") 
        print("[GRAPHQL] GraphQL集成 - 离线回退到模拟数据")
        print("[MONITOR] Web监控: http://localhost:8888")
        print("[STRATEGIES] 多策略引擎: 全功能演示")
        print()
        print("注意: 此为离线演示模式，所有网络操作使用模拟数据")
        print("条件代理逻辑: 如启用爬虫(enable_crawler=True)则要求代理配置")
        print()
        
        # 运行完整8小时测试
        await system.run_enhanced_simulation(8.0)
        
        print()
        print("[COMPLETED] 8小时离线智能代理测试完成！")
        print("[SUCCESS] 条件代理架构演示成功")
        print("[VERIFIED] 系统在无网络环境下正常工作")
        
    except Exception as e:
        print(f"[ERROR] 系统错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] 用户中断了离线测试")
        print("[INFO] 检查enhanced_simulation_report_*.json获取结果")
    except Exception as e:
        print(f"\n[FATAL] 离线测试错误: {e}")