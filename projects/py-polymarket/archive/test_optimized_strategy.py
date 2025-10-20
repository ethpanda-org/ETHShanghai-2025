#!/usr/bin/env python3
"""
测试优化后的策略配置 - 30分钟验证测试
"""

import asyncio
import sys
import os
from datetime import datetime

# 添加当前目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem

async def test_optimized_strategy():
    """测试优化后的策略配置"""
    
    print("=" * 70)
    print("优化策略测试 - 30分钟验证")
    print("=" * 70)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("优化内容:")
    print("- 多策略融合: 均值回归40% + 事件驱动30% + 套利20% + 动量10%")
    print("- 降低交易阈值: 信号强度>0.2, 置信度>0.4")
    print("- 增加仓位大小: 最小$500, 最大单笔5%")
    print("- 支持中价区间: 0.35-0.65价格区间策略")
    print("- 套利策略: 同类市场价差机会识别")
    print("-" * 70)
    print("预期改进:")
    print("- 交易频率: 从0.5笔/小时提升至2-4笔/小时")
    print("- 资金利用率: 从2.8%提升至8-15%")
    print("- 策略评分: 从51分提升至75分以上")
    print("-" * 70)
    print("测试开始...")
    print()
    
    try:
        # 创建优化后的模拟系统
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=30000,  # 3万美元测试
            use_proxy=True,
            offline_mode=True
        )
        
        # 运行30分钟测试
        await sim.run_enhanced_simulation(0.5)
        
        print("\n" + "=" * 70)
        print("优化策略30分钟测试完成!")
        print("=" * 70)
        
    except KeyboardInterrupt:
        print("\n测试被用户中断")
        
    except Exception as e:
        print(f"\n测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("启动优化策略验证测试...")
    asyncio.run(test_optimized_strategy())