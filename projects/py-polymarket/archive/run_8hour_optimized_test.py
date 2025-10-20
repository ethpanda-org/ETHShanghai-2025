#!/usr/bin/env python3
"""
8小时优化策略综合测试 - 使用修正后的多策略框架
"""

import asyncio
import sys
import os
from datetime import datetime

# 添加当前目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem

async def run_8hour_optimized_test():
    """运行8小时优化策略测试"""
    
    print("=" * 80)
    print("8小时优化策略综合测试")
    print("=" * 80)
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"预计结束: 8小时后")
    print(f"初始资金: $50,000")
    print("-" * 80)
    print("核心优化:")
    print("- 多策略融合: 均值回归40% + 事件驱动30% + 套利20% + 动量10%")
    print("- 交易阈值优化: 信号>0.2, 置信度>0.4 (原0.3/0.6)")
    print("- 仓位提升: 最小$500, 最大5%单笔 (原$350/无限制)")
    print("- 预测市场修正: 仅BUY_YES/BUY_NO, 消除SELL操作")
    print("- 价格区间覆盖: 新增0.35-0.65中价策略")
    print("-" * 80)
    print("预期改进目标:")
    print("- 交易频率: 0.5笔/小时 -> 2-4笔/小时")
    print("- 资金利用率: 2.8% -> 8-15%")
    print("- 策略评分: 51分 -> 75分以上")
    print("- 多策略平衡: 4个策略协同工作")
    print("-" * 80)
    print("测试开始... (可通过 http://localhost:8889 监控进度)")
    print()
    
    try:
        # 创建优化后的模拟系统
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=50000,  # 5万美元测试资金
            use_proxy=True,
            offline_mode=True  # 使用离线模式确保稳定性
        )
        
        # 运行8小时优化策略测试
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 启动8小时优化策略测试...")
        await sim.run_enhanced_simulation(8.0)
        
        print("\n" + "=" * 80)
        print("8小时优化策略测试完成!")
        print("=" * 80)
        print(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("请查看生成的报告文件分析优化效果")
        
    except KeyboardInterrupt:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 测试被用户中断")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 测试过程中发生错误: {e}")
        print("请检查日志文件获取详细信息")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("正在启动8小时优化策略综合测试...")
    print("注意: 此测试将使用最新的多策略优化框架")
    asyncio.run(run_8hour_optimized_test())