#!/usr/bin/env python3
"""
检查当前8小时测试状态
"""

import os
import glob
import json
from datetime import datetime

def check_test_status():
    print("=" * 80)
    print("8小时优化策略测试状态检查")
    print("=" * 80)
    
    # 查找最新的报告文件
    reports = glob.glob('enhanced_simulation_report_*.json')
    if reports:
        latest = max(reports, key=os.path.getctime)
        print(f"最新报告文件: {latest}")
        
        # 检查文件修改时间
        mtime = os.path.getmtime(latest)
        mtime_dt = datetime.fromtimestamp(mtime)
        current_time = datetime.now()
        time_diff = (current_time - mtime_dt).total_seconds() / 60
        
        print(f"文件修改时间: {mtime_dt.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"距离现在: {time_diff:.1f} 分钟")
        
        # 读取报告内容
        try:
            with open(latest, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            summary = data.get('simulation_summary', {})
            
            print("\n[BASIC INFO] 基本信息")
            print("-" * 50)
            print(f"测试类型: {data.get('simulation_type', 'unknown')}")
            print(f"策略模式: {data.get('strategies_used', 'unknown')}")
            print(f"开始时间: {summary.get('start_time', 'unknown')}")
            print(f"结束时间: {summary.get('end_time', '进行中')}")
            print(f"持续时间: {summary.get('duration_hours', 0):.2f} 小时")
            print(f"初始资金: ${summary.get('initial_balance', 0):,}")
            
            perf = summary.get('performance_metrics', {})
            print(f"\n[PERFORMANCE] 性能指标")
            print("-" * 50)
            print(f"交易次数: {perf.get('total_trades', 0)}")
            print(f"持仓数量: {perf.get('open_positions', 0)}")
            print(f"当前余额: ${perf.get('current_balance', 0):,}")
            print(f"总盈亏: ${perf.get('total_pnl', 0):+,.0f}")
            print(f"总收益率: {perf.get('total_return', 0):+.1%}")
            print(f"胜率: {perf.get('win_rate', 0):.1%}")
            
            # 分析交易详情
            trades = data.get('trades', [])
            if trades:
                print(f"\n[TRADES] 交易详情 (共{len(trades)}笔)")
                print("-" * 50)
                for i, trade in enumerate(trades[:5], 1):  # 显示前5笔交易
                    print(f"{i}. {trade.get('market_title', 'Unknown')[:40]}")
                    print(f"   策略: {trade.get('strategy_type', 'unknown')}")
                    print(f"   方向: {trade.get('direction', 'unknown')}")
                    print(f"   价格: {trade.get('entry_price', 0):.3f}")
                    print(f"   仓位: ${trade.get('position_size', 0):.0f}")
                    print(f"   状态: {trade.get('status', 'unknown')}")
                    print()
                
                if len(trades) > 5:
                    print(f"   ... 还有 {len(trades) - 5} 笔交易")
            
            # 检查是否在运行
            end_time = summary.get('end_time')
            if end_time and end_time != '进行中':
                print(f"\n[STATUS] 测试状态: 已完成")
            elif time_diff < 5:
                print(f"\n[STATUS] 测试状态: 正在运行中 (最近{time_diff:.1f}分钟有更新)")
            else:
                print(f"\n[STATUS] 测试状态: 可能已停止 (最后更新{time_diff:.1f}分钟前)")
                
        except Exception as e:
            print(f"读取报告文件失败: {e}")
    else:
        print("未找到测试报告文件")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    check_test_status()