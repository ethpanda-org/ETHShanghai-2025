#!/usr/bin/env python3
"""
简化交易数据分析工具

分析模拟交易生成的数据，提供关键洞察
"""

import json
import numpy as np
from datetime import datetime
import glob
import os

def analyze_trading_results():
    """分析交易结果"""
    print("交易数据分析")
    print("="*40)
    
    # 找到最新的报告文件
    report_files = glob.glob("*simulation_report_*.json")
    
    if not report_files:
        print("[ERROR] 未找到交易报告文件")
        print("[INFO] 请先运行模拟交易系统")
        return
    
    latest_file = max(report_files, key=os.path.getmtime)
    print(f"[FILE] 分析文件: {latest_file}")
    
    try:
        with open(latest_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 基础数据
        trades = data.get('trades', [])
        summary = data.get('simulation_summary', {})
        metrics = summary.get('performance_metrics', {})
        
        print(f"\n[STATS] 基础统计:")
        print(f"  总交易数: {len(trades)}")
        print(f"  已完成: {metrics.get('closed_trades', 0)}")
        print(f"  胜率: {metrics.get('win_rate', 0):.1%}")
        print(f"  总收益: ${metrics.get('total_pnl', 0):+,.0f}")
        print(f"  收益率: {metrics.get('total_return', 0):+.1%}")
        
        # 策略分析
        strategy_perf = metrics.get('strategy_performance', {})
        if strategy_perf:
            print(f"\n[STRATEGY] 策略表现排名:")
            strategies = sorted(strategy_perf.items(), 
                              key=lambda x: x[1].get('win_rate', 0), 
                              reverse=True)
            
            for i, (strategy, perf) in enumerate(strategies, 1):
                print(f"  {i}. {strategy}")
                print(f"     胜率: {perf.get('win_rate', 0):.1%}")
                print(f"     收益: {perf.get('avg_return', 0):+.1%}")
                print(f"     交易数: {perf.get('total_trades', 0)}")
        
        # 交易分析
        closed_trades = [t for t in trades if t.get('status') == 'CLOSED']
        
        if closed_trades:
            print(f"\n[PNL] 盈亏分析:")
            
            # 盈利交易
            profitable_trades = [t for t in closed_trades if t.get('pnl', 0) > 0]
            losing_trades = [t for t in closed_trades if t.get('pnl', 0) <= 0]
            
            if profitable_trades:
                avg_win = np.mean([t['pnl'] for t in profitable_trades])
                print(f"  盈利交易: {len(profitable_trades)}笔")
                print(f"  平均盈利: ${avg_win:.0f}")
            
            if losing_trades:
                avg_loss = np.mean([t['pnl'] for t in losing_trades])
                print(f"  亏损交易: {len(losing_trades)}笔")
                print(f"  平均亏损: ${avg_loss:.0f}")
            
            # 持仓时间分析
            hold_times = []
            for trade in closed_trades:
                if trade.get('entry_time') and trade.get('exit_time'):
                    try:
                        entry = datetime.fromisoformat(trade['entry_time'].replace('Z', '+00:00'))
                        exit = datetime.fromisoformat(trade['exit_time'].replace('Z', '+00:00'))
                        hold_hours = (exit - entry).total_seconds() / 3600
                        hold_times.append(hold_hours)
                    except:
                        pass
            
            if hold_times:
                print(f"\n[TIME] 持仓时间分析:")
                print(f"  平均持仓: {np.mean(hold_times):.1f} 小时")
                print(f"  最短持仓: {min(hold_times):.1f} 小时")
                print(f"  最长持仓: {max(hold_times):.1f} 小时")
        
        # 风险分析
        print(f"\n[RISK] 风险指标:")
        print(f"  夏普比率: {metrics.get('sharpe_ratio', 0):.2f}")
        print(f"  最大回撤: {metrics.get('max_drawdown', 0):.1%}")
        
        # 关键洞察
        print(f"\n[INSIGHTS] 关键洞察:")
        
        insights = []
        
        # 胜率分析
        win_rate = metrics.get('win_rate', 0)
        if win_rate > 0.7:
            insights.append("[GOOD] 胜率优秀，策略选择效果好")
        elif win_rate > 0.6:
            insights.append("[OK] 胜率良好，系统表现稳定")
        elif win_rate > 0.5:
            insights.append("[FAIR] 胜率一般，建议优化策略参数")
        else:
            insights.append("[POOR] 胜率偏低，需要重新评估策略")
        
        # 收益分析
        total_return = metrics.get('total_return', 0)
        if total_return > 0.1:
            insights.append("[EXCELLENT] 收益率优秀，策略有效")
        elif total_return > 0.05:
            insights.append("[GOOD] 收益率良好，表现稳健")
        elif total_return > 0:
            insights.append("[OK] 收益为正，但有改进空间")
        else:
            insights.append("[LOSS] 出现亏损，需要调整策略")
        
        # 策略多样性
        if len(strategy_perf) > 1:
            strategy_returns = [perf.get('avg_return', 0) for perf in strategy_perf.values()]
            if max(strategy_returns) - min(strategy_returns) > 0.1:
                insights.append("[DIVERSE] 策略表现差异大，建议重新分配权重")
        
        # 数据量评估
        if len(closed_trades) >= 20:
            insights.append("[DATA+] 数据量充足，分析结果可信")
        elif len(closed_trades) >= 10:
            insights.append("[DATA] 数据量适中，基础分析有效")
        else:
            insights.append("[DATA-] 数据量较少，建议延长测试时间")
        
        for insight in insights:
            print(f"  {insight}")
        
        # 建议
        print(f"\n[SUGGEST] 优化建议:")
        
        if win_rate < 0.6:
            print(f"  1. 提高信号质量阈值，过滤弱信号")
        
        if strategy_perf:
            best_strategy = max(strategy_perf.items(), key=lambda x: x[1].get('win_rate', 0))
            print(f"  2. 增加最佳策略权重: {best_strategy[0]}")
        
        if metrics.get('max_drawdown', 0) > 0.2:
            print(f"  3. 加强风险控制，降低最大回撤")
        
        if len(closed_trades) < 15:
            print(f"  4. 延长测试时间，收集更多数据")
        
        print(f"\n[DONE] 分析完成！")
        
    except Exception as e:
        print(f"[ERROR] 分析失败: {e}")

if __name__ == "__main__":
    analyze_trading_results()