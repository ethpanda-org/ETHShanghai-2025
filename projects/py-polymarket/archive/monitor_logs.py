#!/usr/bin/env python3
"""
实时日志监控工具

监控模拟交易日志，提供实时分析
"""

import time
import os
from datetime import datetime
import re

def monitor_trading_logs():
    """监控交易日志"""
    print("📊 Polymarket交易日志实时监控")
    print("="*50)
    
    log_files = [
        "enhanced_simulation_trading.log",
        "simulation_trading.log"
    ]
    
    # 找到最新的日志文件
    latest_log = None
    for log_file in log_files:
        if os.path.exists(log_file):
            latest_log = log_file
            break
    
    if not latest_log:
        print("❌ 未找到交易日志文件")
        print("💡 请先启动模拟交易系统")
        return
    
    print(f"📁 监控日志文件: {latest_log}")
    print("🔄 实时监控中... (Ctrl+C 退出)")
    print("-"*50)
    
    # 实时监控
    with open(latest_log, 'r', encoding='utf-8') as f:
        # 跳到文件末尾
        f.seek(0, 2)
        
        try:
            while True:
                line = f.readline()
                if line:
                    # 过滤重要信息
                    if any(keyword in line for keyword in [
                        "执行增强交易", "执行模拟交易", "新交易", "平仓", 
                        "余额", "盈亏", "胜率", "ERROR", "WARNING"
                    ]):
                        timestamp = datetime.now().strftime("%H:%M:%S")
                        print(f"[{timestamp}] {line.strip()}")
                else:
                    time.sleep(1)
        except KeyboardInterrupt:
            print("\n📊 日志监控已停止")

if __name__ == "__main__":
    monitor_trading_logs()