#!/usr/bin/env python3
"""
30分钟快速验证测试 - 使用修正后的预测市场交易逻辑
"""

import asyncio
import sys
import os
from datetime import datetime

# 添加当前目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem

async def run_30min_verification_test():
    """运行30分钟验证测试"""
    print("=" * 70)
    print("30分钟预测市场验证测试")
    print("=" * 70)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"初始资金: $20,000")
    print(f"测试重点: 验证修正后的预测市场交易逻辑")
    print("-" * 70)
    print("[FIXED] 已修正: 不再使用SELL操作")
    print("[FIXED] 新机制: 仅使用BUY_YES和BUY_NO代币")
    print("-" * 70)
    print("测试开始...")
    print()
    
    try:
        # 创建增强版模拟系统
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=20000,
            use_proxy=True,
            offline_mode=True
        )
        
        # 运行30分钟模拟
        await sim.run_enhanced_simulation(0.5)
        
        print("\n" + "=" * 70)
        print("30分钟验证测试完成!")
        print("=" * 70)
        
    except KeyboardInterrupt:
        print("\n测试被用户中断")
        
    except Exception as e:
        print(f"\n测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("启动30分钟预测市场验证测试...")
    asyncio.run(run_30min_verification_test())