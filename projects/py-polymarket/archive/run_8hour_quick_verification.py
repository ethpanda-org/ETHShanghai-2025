#!/usr/bin/env python3
"""
快速8小时模拟交易测试验证
"""

import asyncio
import sys
import os
from datetime import datetime
import json

# 确保路径正确
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

async def run_quick_8hour_test():
    """运行快速8小时测试验证"""
    
    print("=" * 80)
    print("8小时模拟交易快速验证测试")
    print("=" * 80)
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"模式: 完全离线 + 优化策略")
    print(f"初始资金: $50,000")
    print("-" * 80)
    
    try:
        # 导入交易系统
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        print("[OK] 增强交易系统导入成功")
        
        # 创建离线系统
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=50000,
            use_proxy=False,      # 禁用代理避免网络问题
            offline_mode=True     # 使用离线模式
        )
        print("[OK] 离线模拟系统创建成功")
        
        print("[START] 开始8小时模拟交易测试...")
        print("[INFO] 系统配置:")
        print("  - 数据源: 本地模拟数据")
        print("  - 网络连接: 禁用")
        print("  - 策略: 优化多策略框架")
        print("  - 更新频率: 每60秒")
        print()
        
        # 创建定期状态报告任务
        async def status_reporter():
            """状态报告任务"""
            import glob
            last_report_count = 0
            
            while True:
                await asyncio.sleep(300)  # 每5分钟报告一次
                
                try:
                    # 检查报告文件
                    reports = glob.glob('enhanced_simulation_report_*.json')
                    current_report_count = len(reports)
                    
                    if current_report_count > last_report_count:
                        latest = max(reports, key=os.path.getctime)
                        mtime = os.path.getmtime(latest)
                        mtime_dt = datetime.fromtimestamp(mtime)
                        
                        print(f"\n[PROGRESS] {datetime.now().strftime('%H:%M:%S')} - 发现新报告")
                        print(f"[FILE] {latest}")
                        print(f"[TIME] 生成时间: {mtime_dt.strftime('%H:%M:%S')}")
                        
                        # 读取基本信息
                        with open(latest, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        summary = data.get('simulation_summary', {})
                        perf = summary.get('performance_metrics', {})
                        print(f"[DATA] 交易数: {perf.get('total_trades', 0)}")
                        print(f"[DATA] 持仓数: {perf.get('open_positions', 0)}")
                        print(f"[DATA] 当前余额: ${perf.get('current_balance', 0):,.0f}")
                        print(f"[DATA] 总收益: ${perf.get('total_pnl', 0):+,.0f}")
                        print()
                        
                        last_report_count = current_report_count
                    else:
                        print(f"[STATUS] {datetime.now().strftime('%H:%M:%S')} - 测试运行中，等待数据更新...")
                        
                except Exception as e:
                    print(f"[ERROR] 状态检查失败: {e}")
        
        # 运行测试和状态监控
        await asyncio.gather(
            sim.run_enhanced_simulation(8.0),  # 8小时测试
            status_reporter()                  # 状态报告
        )
        
        print("\n" + "=" * 80)
        print("[SUCCESS] 8小时模拟交易测试完成!")
        print("=" * 80)
        print(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except KeyboardInterrupt:
        print(f"\n[INTERRUPT] 测试被用户中断")
        print(f"[TIME] 中断时间: {datetime.now().strftime('%H:%M:%S')}")
        
    except Exception as e:
        print(f"\n[ERROR] 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("[INIT] 启动8小时模拟交易快速验证...")
    asyncio.run(run_quick_8hour_test())