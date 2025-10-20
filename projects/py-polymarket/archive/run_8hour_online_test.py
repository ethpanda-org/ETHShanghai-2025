#!/usr/bin/env python3
"""
8小时在线模拟交易测试 - 使用真实Polymarket数据
"""

import asyncio
import sys
import os
from datetime import datetime
import json

# 确保路径正确
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

async def run_online_8hour_test():
    """运行在线8小时测试"""
    
    print("=" * 80)
    print("8小时在线模拟交易测试")
    print("=" * 80)
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"模式: 在线模式 + 真实数据 + 优化策略")
    print(f"初始资金: $10,000")
    print(f"代理状态: Proxy Manager端口24000")
    print("-" * 80)
    
    try:
        # 导入交易系统
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        print("[OK] 增强交易系统导入成功")
        
        # 创建在线系统 - 使用真实数据和Proxy Manager
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=10000,
            use_proxy=True,       # 启用Proxy Manager
            offline_mode=False,   # 禁用离线模式，使用真实数据
            auto_monitor=True     # 自动启动Web监控界面
        )
        print("[OK] 在线模拟系统创建成功")
        
        print("[START] 开始8小时在线模拟交易测试...")
        print("[INFO] 系统配置:")
        print("  - 数据源: Polymarket真实API")
        print("  - 网络连接: 通过Bright Data Proxy Manager")
        print("  - 代理端口: 127.0.0.1:24000")
        print("  - 策略: 优化多策略框架")
        print("  - 更新频率: 每60秒")
        print("  - Web监控: 自动启动 (http://localhost:8888)")
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
                        print(f"[DATA] 数据源: 真实Polymarket API")
                        print()
                        
                        last_report_count = current_report_count
                    else:
                        print(f"[STATUS] {datetime.now().strftime('%H:%M:%S')} - 在线测试运行中，获取真实市场数据...")
                        
                except Exception as e:
                    print(f"[ERROR] 状态检查失败: {e}")
        
        # 代理监控任务 - 简化版本
        async def proxy_monitor():
            """简化的代理监控任务"""
            while True:
                await asyncio.sleep(600)  # 每10分钟检查一次
                
                try:
                    print(f"[PROXY] {datetime.now().strftime('%H:%M:%S')} - 代理连接检查")
                    # 简单的代理健康检查
                    import aiohttp
                    async with aiohttp.ClientSession() as session:
                        try:
                            response = await session.get('http://127.0.0.1:24000', timeout=5)
                            print(f"[PROXY] {datetime.now().strftime('%H:%M:%S')} - 代理服务器响应正常")
                        except:
                            print(f"[PROXY WARNING] {datetime.now().strftime('%H:%M:%S')} - 代理服务器无响应，但交易继续运行")
                        
                except Exception as e:
                    print(f"[PROXY INFO] 代理检查: {e}")
                    # 继续运行，不中断交易
        
        # 运行测试、状态监控和代理监控
        await asyncio.gather(
            sim.run_enhanced_simulation(8.0),  # 8小时测试
            status_reporter(),                 # 状态报告
            proxy_monitor()                    # 代理监控
        )
        
        print("\n" + "=" * 80)
        print("[SUCCESS] 8小时在线模拟交易测试完成!")
        print("=" * 80)
        print(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except KeyboardInterrupt:
        print(f"\n[INTERRUPT] 测试被用户中断")
        print(f"[TIME] 中断时间: {datetime.now().strftime('%H:%M:%S')}")
        
    except Exception as e:
        print(f"\n[ERROR] 测试失败: {e}")
        
        # 如果是代理相关错误，建议切换到离线模式
        if any(keyword in str(e).lower() for keyword in ['proxy', 'timeout', 'connection']):
            print("[SUGGESTION] 检测到网络/代理问题，建议:")
            print("1. 检查代理配额是否充足")
            print("2. 重新验证代理连接")
            print("3. 或切换到离线模式继续测试")
        
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("[INIT] 启动8小时在线模拟交易测试...")
    asyncio.run(run_online_8hour_test())