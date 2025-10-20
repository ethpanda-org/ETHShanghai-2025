#!/usr/bin/env python3
"""
实时性能监控面板

监控交易系统关键指标
"""

import json
import time
import os
from datetime import datetime
import glob

class RealTimeMonitor:
    """实时监控面板"""
    
    def __init__(self):
        self.last_update = None
        self.metrics_history = []
    
    def find_latest_report(self):
        """找到最新的报告文件"""
        patterns = [
            "enhanced_simulation_report_*.json",
            "simulation_report_*.json"
        ]
        
        latest_file = None
        latest_time = 0
        
        for pattern in patterns:
            files = glob.glob(pattern)
            for file in files:
                mtime = os.path.getmtime(file)
                if mtime > latest_time:
                    latest_time = mtime
                    latest_file = file
        
        return latest_file
    
    def display_metrics(self, metrics):
        """显示关键指标"""
        os.system('cls' if os.name == 'nt' else 'clear')
        
        print("🚀 Polymarket实时交易监控面板")
        print("="*60)
        print(f"📅 更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # 核心指标
        print("💰 资金状况:")
        print(f"  当前余额: ${metrics.get('current_balance', 0):,.0f}")
        print(f"  可用资金: ${metrics.get('available_balance', 0):,.0f}")
        print(f"  总盈亏: ${metrics.get('total_pnl', 0):+,.0f}")
        print(f"  收益率: {metrics.get('total_return', 0):+.1%}")
        
        print()
        print("📊 交易统计:")
        print(f"  总交易数: {metrics.get('total_trades', 0)}")
        print(f"  已结束: {metrics.get('closed_trades', 0)}")
        print(f"  当前持仓: {metrics.get('open_positions', 0)}")
        print(f"  胜率: {metrics.get('win_rate', 0):.1%}")
        
        print()
        print("⚡ 风险指标:")
        print(f"  夏普比率: {metrics.get('sharpe_ratio', 0):.2f}")
        print(f"  最大回撤: {metrics.get('max_drawdown', 0):.1%}")
        
        # 策略表现 (如果是增强版)
        strategy_perf = metrics.get('strategy_performance', {})
        if strategy_perf:
            print()
            print("🎯 策略表现:")
            for strategy, perf in strategy_perf.items():
                print(f"  {strategy}: 胜率{perf.get('win_rate', 0):.1%} | "
                      f"收益{perf.get('avg_return', 0):+.1%} | "
                      f"{perf.get('total_trades', 0)}笔")
        
        # 风险指标 (如果是增强版)
        risk_metrics = metrics.get('risk_metrics', {})
        if risk_metrics:
            print()
            print("⚠️ 风险监控:")
            print(f"  总敞口: ${risk_metrics.get('total_exposure', 0):,.0f}")
            print(f"  敞口比例: {risk_metrics.get('exposure_ratio', 0):.1%}")
            print(f"  风险评分: {risk_metrics.get('avg_risk_score', 0):.2f}")
        
        print()
        print("🔄 按 Ctrl+C 退出监控")
    
    def run(self):
        """运行实时监控"""
        print("🚀 启动实时性能监控...")
        print("🔍 正在搜索交易数据...")
        
        try:
            while True:
                # 尝试读取最新数据
                report_file = self.find_latest_report()
                
                if report_file:
                    try:
                        with open(report_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            metrics = data.get('simulation_summary', {}).get('performance_metrics', {})
                            
                            if metrics:
                                self.display_metrics(metrics)
                            else:
                                print("📊 等待交易数据生成...")
                    except Exception as e:
                        print(f"❌ 读取数据失败: {e}")
                else:
                    print("🔍 未找到交易报告文件，等待交易开始...")
                
                time.sleep(5)  # 每5秒更新一次
                
        except KeyboardInterrupt:
            print("\n📊 实时监控已退出")

if __name__ == "__main__":
    monitor = RealTimeMonitor()
    monitor.run()