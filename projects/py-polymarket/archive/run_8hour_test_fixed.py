#!/usr/bin/env python3
"""
8小时优化策略测试 - 修复版本
"""

import asyncio
import sys
import os
from datetime import datetime

# 确保路径正确
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

async def run_8hour_test_fixed():
    """运行修复版8小时测试"""
    
    print("=" * 80)
    print("8小时优化策略测试 - 修复版")
    print("=" * 80)
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"预计结束: 8小时后")
    print(f"初始资金: $50,000")
    print("-" * 80)
    
    try:
        # 导入并创建模拟系统
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        
        print("[OK] 成功导入交易系统")
        
        # 创建系统实例
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=50000,
            use_proxy=True,
            offline_mode=True  # 使用离线模式避免网络问题
        )
        
        print("[OK] 成功创建模拟系统")
        print("[START] 开始8小时优化策略测试...")
        print("[INFO] 提示: 可通过 http://localhost:8889 查看监控界面")
        print()
        
        # 运行8小时测试
        await sim.run_enhanced_simulation(8.0)
        
        print("\n" + "=" * 80)
        print("[SUCCESS] 8小时优化策略测试完成!")
        print("=" * 80)
        print(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("[REPORT] 请查看生成的报告文件分析结果")
        
    except ImportError as e:
        print(f"[ERROR] 导入错误: {e}")
        print("[FALLBACK] 将使用基础模拟系统")
        
        # 使用基础系统作为备用方案
        try:
            from simulation_trading import PolymarketSimulationSystem
            sim = PolymarketSimulationSystem(initial_balance=50000)
            print("[OK] 使用基础模拟系统")
            await sim.run_simulation(8)
        except Exception as e2:
            print(f"[ERROR] 基础系统也失败: {e2}")
            return
        
    except KeyboardInterrupt:
        print(f"\n[INTERRUPT] 测试被用户中断")
        
    except Exception as e:
        print(f"\n[ERROR] 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("[START] 正在启动8小时优化策略测试...")
    asyncio.run(run_8hour_test_fixed())