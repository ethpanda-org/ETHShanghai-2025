#!/usr/bin/env python3
"""
简化数据收集监控工具

实时监控交易数据收集状态
"""

import json
import time
import os
from datetime import datetime
import glob

def monitor_data_collection():
    """监控数据收集状态"""
    print("交易数据收集监控")
    print("="*40)
    
    try:
        while True:
            # 清屏
            os.system('cls' if os.name == 'nt' else 'clear')
            
            print("📊 Polymarket交易数据收集监控")
            print("="*50)
            print(f"🕒 监控时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print()
            
            # 检查报告文件
            report_files = glob.glob("*simulation_report_*.json")
            
            if report_files:
                # 使用最新文件
                latest_file = max(report_files, key=os.path.getmtime)
                
                try:
                    with open(latest_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # 显示数据收集状态
                    trades = data.get('trades', [])
                    summary = data.get('simulation_summary', {})
                    metrics = summary.get('performance_metrics', {})
                    
                    print("📈 数据收集状态:")
                    print(f"  总交易数: {len(trades)}")
                    print(f"  已结束交易: {metrics.get('closed_trades', 0)}")
                    print(f"  当前持仓: {metrics.get('open_positions', 0)}")
                    print(f"  数据有效性: {'✅ 良好' if len(trades) >= 10 else '⚠️ 需要更多数据'}")
                    
                    print()
                    print("💰 交易表现:")
                    print(f"  当前余额: ${metrics.get('current_balance', 0):,.0f}")
                    print(f"  总盈亏: ${metrics.get('total_pnl', 0):+,.0f}")
                    print(f"  胜率: {metrics.get('win_rate', 0):.1%}")
                    print(f"  收益率: {metrics.get('total_return', 0):+.1%}")
                    
                    # 策略数据质量
                    strategy_perf = metrics.get('strategy_performance', {})
                    if strategy_perf:
                        print()
                        print("🎯 策略数据收集:")
                        for strategy, perf in strategy_perf.items():
                            trades_count = perf.get('total_trades', 0)
                            quality = "✅ 充足" if trades_count >= 5 else "⚠️ 不足" if trades_count >= 2 else "❌ 缺乏"
                            print(f"  {strategy}: {trades_count}笔 - {quality}")
                    
                    # 数据质量评估
                    print()
                    print("📊 数据质量评估:")
                    
                    total_trades = len(trades)
                    if total_trades >= 20:
                        quality_score = "🟢 优秀"
                        recommendation = "数据量充足，可进行深度分析"
                    elif total_trades >= 10:
                        quality_score = "🟡 良好"
                        recommendation = "数据量适中，可进行基础分析"
                    elif total_trades >= 5:
                        quality_score = "🟠 一般"
                        recommendation = "建议继续运行收集更多数据"
                    else:
                        quality_score = "🔴 不足"
                        recommendation = "数据量太少，需要更长时间运行"
                    
                    print(f"  数据质量: {quality_score}")
                    print(f"  建议: {recommendation}")
                    
                    # 运行时间
                    start_time = summary.get('start_time')
                    if start_time:
                        try:
                            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                            runtime_hours = (datetime.now() - start_dt).total_seconds() / 3600
                            print(f"  运行时长: {runtime_hours:.1f} 小时")
                        except:
                            pass
                    
                except Exception as e:
                    print(f"❌ 读取数据文件失败: {e}")
            
            else:
                print("🔍 等待交易开始...")
                print("💡 请确保模拟交易系统正在运行")
            
            print()
            print("🔄 自动更新中... (Ctrl+C 退出)")
            
            time.sleep(10)  # 每10秒更新
            
    except KeyboardInterrupt:
        print("\n📊 数据监控已退出")

if __name__ == "__main__":
    monitor_data_collection()