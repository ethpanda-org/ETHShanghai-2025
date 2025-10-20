#!/usr/bin/env python3
"""
测试Proxy Manager集成到交易系统
"""

import asyncio
import sys
import os
from datetime import datetime

# 确保路径正确
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

async def test_proxy_integration():
    """测试Proxy Manager集成"""
    print("=" * 70)
    print("Proxy Manager 集成测试")
    print("=" * 70)
    print(f"开始时间: {datetime.now().strftime('%H:%M:%S')}")
    
    try:
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        print("[OK] 交易系统导入成功")
        
        # 创建系统实例 - 使用在线模式和Proxy Manager
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=10000,
            use_proxy=True,      # 启用代理
            offline_mode=False   # 禁用离线模式，使用真实API
        )
        print("[OK] 交易系统创建成功")
        print(f"[CONFIG] 代理端口: {sim.proxy_manager_port}")
        print(f"[CONFIG] 代理URL: {sim.proxy_manager_url}")
        
        # 测试数据获取
        print("\n[测试] 尝试获取真实市场数据...")
        
        from enhanced_simulation_trading import EnhancedPolymarketDataFetcher
        async with EnhancedPolymarketDataFetcher(
            use_proxy=True, 
            offline_mode=False, 
            proxy_manager_port=24000
        ) as fetcher:
            
            print("[OK] 数据获取器创建成功")
            
            # 获取少量市场数据测试连接
            markets = await fetcher.fetch_active_markets(limit=3)
            
            if markets:
                print(f"[SUCCESS] 获取到 {len(markets)} 个市场数据:")
                for i, market in enumerate(markets, 1):
                    print(f"  {i}. {market.get('title', 'Unknown')[:50]}...")
                    if market.get('price'):
                        print(f"     价格: {market['price']:.3f}")
                    if market.get('volume_24h'):
                        print(f"     24h成交量: ${market['volume_24h']:,.0f}")
                    print()
                
                print("[SUCCESS] Proxy Manager集成成功!")
                print("[READY] 可以启动在线交易测试")
                return True
                
            else:
                print("[ERROR] 未获取到市场数据")
                print("[ISSUE] 可能是Proxy Manager配置或网络问题")
                return False
    
    except ImportError as e:
        print(f"[ERROR] 模块导入失败: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] 集成测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

async def quick_online_test():
    """快速在线测试 - 5分钟"""
    print("\n" + "=" * 70)
    print("5分钟快速在线交易测试")
    print("=" * 70)
    
    try:
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=10000,
            use_proxy=True,
            offline_mode=False
        )
        
        print("[START] 开始5分钟在线测试...")
        print("[INFO] 使用真实Polymarket数据")
        print("[INFO] 通过Proxy Manager访问")
        
        # 运行5分钟测试
        await sim.run_enhanced_simulation(0.083)  # 5分钟 = 0.083小时
        
        print("[SUCCESS] 5分钟在线测试完成!")
        return True
        
    except Exception as e:
        print(f"[ERROR] 在线测试失败: {e}")
        return False

if __name__ == "__main__":
    print("[提示] 确保Proxy Manager在端口24000运行")
    print()
    
    # 步骤1: 测试集成
    integration_success = asyncio.run(test_proxy_integration())
    
    if integration_success:
        print("\n[选择] 是否进行5分钟快速在线测试? (y/n)")
        choice = input().lower().strip()
        
        if choice in ['y', 'yes', '是']:
            # 步骤2: 快速在线测试
            test_success = asyncio.run(quick_online_test())
            
            if test_success:
                print("\n[下一步] 集成验证成功!")
                print("1. 启动完整8小时在线交易测试")
                print("2. 监控交易性能和策略效果")
                print("3. 分析真实数据下的策略表现")
            else:
                print("\n[问题] 需要检查网络连接或Proxy Manager配置")
        else:
            print("\n[完成] 集成测试通过，随时可以启动在线测试")
    else:
        print("\n[问题] 需要解决集成问题后再进行在线测试")