#!/usr/bin/env python3
"""
8小时无代理测试 - 完全离线模式
"""

import asyncio
import sys
import os
from datetime import datetime

# 确保路径正确
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

async def run_8hour_offline_test():
    """运行8小时完全离线测试"""
    
    print("=" * 80)
    print("8小时离线模式测试 - 无代理无网络")
    print("=" * 80)
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"模式: 完全离线 (无代理，无网络连接)")
    print(f"初始资金: $50,000")
    print(f"预计结束: 8小时后")
    print("-" * 80)
    
    try:
        # 导入并创建模拟系统
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        
        print("[OK] 成功导入交易系统")
        
        # 创建完全离线的系统实例
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=50000,
            use_proxy=False,       # 明确禁用代理
            offline_mode=True,     # 启用离线模式
            auto_monitor=True      # 自动启动Web监控界面
        )
        
        print("[OK] 成功创建离线模拟系统")
        print("[INFO] 系统配置:")
        print("  - 代理使用: 禁用")
        print("  - 网络访问: 禁用") 
        print("  - 数据源: 本地模拟数据")
        print("  - 策略: 优化多策略框架")
        print("  - Web监控: 自动启动 (http://localhost:8888)")
        print()
        
        print("[START] 开始8小时离线优化测试...")
        print("[INFO] 监控自动启动: 浏览器将自动打开监控界面")
        print("[INFO] 提示: 所有数据来自本地模拟，无需网络连接")
        print()
        
        # 运行8小时测试
        await sim.run_enhanced_simulation(8.0)
        
        print("\n" + "=" * 80)
        print("[SUCCESS] 8小时离线测试完成!")
        print("=" * 80)
        print(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("[REPORT] 请查看生成的报告文件分析结果")
        print("[INFO] 测试全程无网络连接，使用本地数据")
        
    except ImportError as e:
        print(f"[ERROR] 导入错误: {e}")
        print("[FALLBACK] 尝试使用基础模拟系统")
        
        try:
            from simulation_trading import PolymarketSimulationSystem
            sim = PolymarketSimulationSystem(initial_balance=50000)
            print("[OK] 使用基础模拟系统 (离线模式)")
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
    print("[START] 正在启动8小时离线测试...")
    print("[INFO] 此测试完全离线运行，不使用任何网络连接")
    asyncio.run(run_8hour_offline_test())