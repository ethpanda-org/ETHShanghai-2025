#!/usr/bin/env python3
"""
8小时综合预测市场模拟测试 - 使用修正后的交易逻辑
"""

import asyncio
import sys
import os
from datetime import datetime

# 添加当前目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem

async def run_8hour_comprehensive_test():
    """运行8小时综合测试"""
    print("=" * 70)
    print("8小时预测市场综合模拟测试")
    print("=" * 70)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"预计结束: {(datetime.now()).strftime('%Y-%m-%d %H:%M:%S')} + 8小时")
    print(f"初始资金: $50,000")
    print(f"测试重点: 修正后的预测市场交易逻辑")
    print(f"预期交易: 20-50笔")
    print("-" * 70)
    print("[FIXED] 已修正: 不再使用SELL操作")
    print("[FIXED] 新机制: 仅使用BUY_YES和BUY_NO代币")
    print("[FIXED] 高价格(>0.75): 买入NO代币")
    print("[FIXED] 低价格(<0.25): 买入YES代币")
    print("[FIXED] 中等价格: 根据信号方向决定")
    print("-" * 70)
    print("测试开始... (按 Ctrl+C 提前停止)")
    print()
    
    try:
        # 创建增强版模拟系统
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=50000,
            use_proxy=True,
            offline_mode=True  # 使用离线模式确保稳定性
        )
        
        # 运行8小时模拟
        await sim.run_enhanced_simulation(8.0)
        
        print("\n" + "=" * 70)
        print("8小时综合测试完成!")
        print("=" * 70)
        
    except KeyboardInterrupt:
        print("\n" + "=" * 70)
        print("测试被用户中断")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n测试过程中发生错误: {e}")
        print("请检查日志文件获取详细信息")

if __name__ == "__main__":
    print("启动8小时预测市场综合测试...")
    asyncio.run(run_8hour_comprehensive_test())