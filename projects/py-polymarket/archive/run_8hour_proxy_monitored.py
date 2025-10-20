#!/usr/bin/env python3
"""
8小时代理监控测试 - 代理中断时自动停止
"""

import asyncio
import sys
import os
import logging
from datetime import datetime
from proxy_monitor import ProxyMonitorError, EnhancedProxyMonitor

# 确保路径正确
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def run_8hour_proxy_monitored_test():
    """运行8小时代理监控测试"""
    
    print("=" * 80)
    print("8小时代理监控测试 - 代理中断时自动停止")
    print("=" * 80)
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"初始资金: $50,000")
    print(f"代理监控: 启用 (每5分钟检查一次)")
    print(f"失败阈值: 3次连续失败后停止")
    print("-" * 80)
    
    # 初始化代理监控
    proxy_monitor = EnhancedProxyMonitor(use_proxy=True)
    
    try:
        # 首先测试代理连接
        print("[PROXY] 初始代理连接测试...")
        proxy_healthy = await proxy_monitor.test_proxy_connection()
        
        if not proxy_healthy:
            print("[ERROR] 代理初始连接失败，无法启动测试")
            print("[STOP] 服务因代理不可用而停止")
            return
        
        print("[OK] 代理连接正常，开始导入交易系统...")
        
        # 导入交易系统
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        
        # 创建增强版交易系统 (使用代理模式)
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=50000,
            use_proxy=True,        # 启用代理
            offline_mode=False     # 使用在线模式
        )
        
        print("[OK] 交易系统创建成功")
        print("[START] 开始8小时代理监控测试...")
        print("[INFO] 系统配置:")
        print("  - 代理模式: 启用")
        print("  - 在线模式: 启用")
        print("  - 代理监控: 每5分钟检查")
        print("  - 自动停止: 代理失败3次后停止")
        print()
        print("[WARNING] 如果代理服务中断，系统将自动停止并提醒")
        print()
        
        # 启动代理监控任务
        async def proxy_monitoring_task():
            """代理监控后台任务"""
            while True:
                try:
                    await asyncio.sleep(300)  # 每5分钟检查一次
                    
                    print(f"[PROXY] {datetime.now().strftime('%H:%M:%S')} - 执行代理健康检查...")
                    proxy_healthy = await proxy_monitor.monitor_proxy_health()
                    
                    if not proxy_healthy:
                        print(f"\n{'='*60}")
                        print("🚨 代理服务中断检测到!")
                        print("🛑 系统将自动停止以保护您的代理配额")
                        print(f"⏰ 停止时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                        print("💡 请检查代理配置后重新启动测试")
                        print("="*60)
                        raise ProxyMonitorError("代理服务中断，自动停止测试")
                    else:
                        print(f"[PROXY] 代理状态正常")
                        
                except ProxyMonitorError:
                    raise  # 重新抛出以停止主任务
                except Exception as e:
                    logger.error(f"[PROXY] 监控任务异常: {e}")
        
        # 启动并发任务：交易系统 + 代理监控
        try:
            await asyncio.gather(
                sim.run_enhanced_simulation(8.0),  # 8小时交易测试
                proxy_monitoring_task()            # 代理监控任务
            )
        except ProxyMonitorError as e:
            print(f"\n[PROXY_STOP] {e}")
            print("[ACTION] 测试因代理中断而停止")
            return
        
        print("\n" + "=" * 80)
        print("[SUCCESS] 8小时代理监控测试完成!")
        print("=" * 80)
        print(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("[INFO] 代理服务全程正常，测试顺利完成")
        
    except ProxyMonitorError as e:
        print(f"\n{'='*60}")
        print("🚨 代理中断检测 - 服务自动停止")
        print("="*60)
        print(f"🛑 停止原因: {e}")
        print(f"⏰ 停止时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("💡 建议操作:")
        print("  1. 检查代理服务商状态")
        print("  2. 验证代理配置信息")
        print("  3. 确认代理配额是否充足")
        print("  4. 代理恢复后重新启动测试")
        print("="*60)
        
    except KeyboardInterrupt:
        print(f"\n[INTERRUPT] 测试被用户手动中断")
        print(f"[TIME] 中断时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"\n[ERROR] 测试过程中发生错误: {e}")
        print(f"[TIME] 错误时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("[INIT] 正在启动8小时代理监控测试...")
    print("[INFO] 系统将持续监控代理状态，如遇中断将自动停止")
    asyncio.run(run_8hour_proxy_monitored_test())