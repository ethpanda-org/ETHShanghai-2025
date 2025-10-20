#!/usr/bin/env python3
"""
在线交易状态实时监控
"""

import os
import glob
import json
import time
from datetime import datetime

def check_test_status():
    """检查测试状态"""
    print("=" * 50)
    print("在线交易测试状态监控")
    print("=" * 50)
    print(f"检查时间: {datetime.now().strftime('%H:%M:%S')}")
    
    # 检查报告文件
    reports = glob.glob('enhanced_simulation_report_*.json')
    if reports:
        latest = max(reports, key=os.path.getctime)
        mtime = os.path.getmtime(latest)
        mtime_dt = datetime.fromtimestamp(mtime)
        current_time = datetime.now()
        time_diff = (current_time - mtime_dt).total_seconds() / 60
        
        print(f"最新报告: {latest}")
        print(f"生成时间: {mtime_dt.strftime('%H:%M:%S')}")
        print(f"距现在: {time_diff:.1f}分钟")
        
        if time_diff < 5:
            print("[STATUS] 测试运行中，正在生成数据")
            
            try:
                with open(latest, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                summary = data.get('simulation_summary', {})
                perf = summary.get('performance_metrics', {})
                
                print("\n交易状态:")
                print(f"  模式: {data.get('simulation_type', 'unknown')}")
                print(f"  交易次数: {perf.get('total_trades', 0)}")
                print(f"  持仓数量: {perf.get('open_positions', 0)}")
                print(f"  当前余额: ${perf.get('current_balance', 0):,.0f}")
                
                if perf.get('total_pnl'):
                    pnl = perf['total_pnl']
                    print(f"  总收益: ${pnl:+,.0f}")
                    if perf.get('current_balance', 0) > 0:
                        return_pct = (pnl / 10000) * 100
                        print(f"  收益率: {return_pct:+.2f}%")
                
                return True
                
            except Exception as e:
                print(f"[ERROR] 读取报告失败: {e}")
                return False
        else:
            print("[STATUS] 数据更新停滞，可能遇到问题")
            return False
    else:
        print("[STATUS] 未找到报告文件，测试可能未启动")
        return False

def check_proxy_status():
    """检查代理状态"""
    print("\n代理状态检查:")
    import subprocess
    try:
        result = subprocess.run([
            'curl', '--connect-timeout', '5', 
            '--proxy', '127.0.0.1:24000', 
            'http://geo.brdtest.com/mygeo.json'
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print("  [OK] Proxy Manager连接正常")
            return True
        else:
            print("  [ERROR] Proxy Manager连接失败")
            print(f"  错误: {result.stderr}")
            return False
    except Exception as e:
        print(f"  [ERROR] 代理检查失败: {e}")
        return False

def monitor_loop():
    """持续监控循环"""
    print("开始持续监控...")
    print("按 Ctrl+C 停止监控\n")
    
    try:
        while True:
            test_ok = check_test_status()
            proxy_ok = check_proxy_status()
            
            if not test_ok and not proxy_ok:
                print("\n[WARNING] 测试和代理都有问题，建议检查配置")
            elif not proxy_ok:
                print("\n[WARNING] 代理问题，可能影响数据获取")
            elif test_ok:
                print("\n[OK] 测试运行正常")
            
            print("\n" + "-" * 50)
            time.sleep(30)  # 每30秒检查一次
            
    except KeyboardInterrupt:
        print("\n监控已停止")

if __name__ == "__main__":
    print("选择监控模式:")
    print("1. 单次检查")
    print("2. 持续监控")
    
    choice = input("请选择 (1/2): ").strip()
    
    if choice == "2":
        monitor_loop()
    else:
        check_test_status()
        check_proxy_status()