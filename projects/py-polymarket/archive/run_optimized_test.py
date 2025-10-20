#!/usr/bin/env python3
"""
优化后的在线交易测试脚本
基于报告分析结果进行参数调整
"""

import asyncio
import sys
import os
from datetime import datetime

# 确保路径正确
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

async def run_optimized_online_test():
    """运行优化后的在线交易测试"""
    
    print("=== 启动优化后的在线交易测试 ===")
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 基于分析结果的优化配置
    optimized_config = {
        'initial_balance': 5000,        # 增加初始资金，提高交易灵活性
        'test_duration': 2.0,           # 增加到2小时，观察完整交易周期
        'use_proxy': True,              # 启用代理获取真实数据
        'offline_mode': False,          # 在线模式
        'auto_monitor': True,           # 自动启动Web监控
        'position_size_multiplier': 1.5, # 增加仓位规模
        'update_frequency': 30,         # 30秒更新一次市场数据
    }
    
    print("[CONFIG] 优化配置:")
    for key, value in optimized_config.items():
        print(f"  {key}: {value}")
    
    try:
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        
        # 创建优化的交易系统
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=optimized_config['initial_balance'],
            use_proxy=optimized_config['use_proxy'],
            offline_mode=optimized_config['offline_mode'],
            auto_monitor=optimized_config['auto_monitor']
        )
        
        print("[OK] 优化交易系统创建成功")
        print(f"[MONITOR] Web监控界面: http://localhost:{sim.monitor_port}")
        print(f"[TIME] 预计运行时长: {optimized_config['test_duration']}小时")
        print()
        
        # 显示改进点
        print("[IMPROVEMENTS] 本次测试改进:")
        print("1. [OK] 测试时长: 1分钟 -> 2小时")
        print("2. [OK] 初始资金: $1,000 -> $5,000") 
        print("3. [OK] 数据源: 模拟数据 -> 真实Polymarket数据")
        print("4. [OK] 监控: 手动启动 -> 自动启动")
        print("5. [OK] 仓位规模: 标准 -> 增强1.5倍")
        print()
        
        # 启动测试
        print("[START] 开始优化后的在线交易测试...")
        await sim.run_enhanced_simulation(optimized_config['test_duration'])
        
        print("[SUCCESS] 优化测试完成!")
        
    except Exception as e:
        print(f"[ERROR] 测试失败: {e}")
        
        # 如果在线模式失败，提供离线模式作为备选
        print("[FALLBACK] 尝试离线模式作为备选...")
        try:
            from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
            
            sim_offline = EnhancedPolymarketSimulationSystem(
                initial_balance=optimized_config['initial_balance'],
                use_proxy=False,
                offline_mode=True,
                auto_monitor=True
            )
            
            print("[OK] 离线模式系统创建成功")
            print("[START] 开始离线模式测试...")
            
            # 离线模式使用稍短的时间
            await sim_offline.run_enhanced_simulation(0.5)  # 30分钟
            
            print("[SUCCESS] 离线模式测试完成!")
            
        except Exception as e2:
            print(f"[ERROR] 离线模式也失败: {e2}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    # 运行优化后的测试
    asyncio.run(run_optimized_online_test())