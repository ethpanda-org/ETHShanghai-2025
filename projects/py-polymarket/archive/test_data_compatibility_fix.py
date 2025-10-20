#!/usr/bin/env python3
"""
数据格式兼容性测试 - 验证修复后的数据处理逻辑
"""

import asyncio
import json
import sys
import os
from datetime import datetime

# 添加路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

async def test_data_compatibility():
    """测试数据格式兼容性修复"""
    
    print("=" * 60)
    print("数据格式兼容性测试")
    print("=" * 60)
    print(f"测试时间: {datetime.now().strftime('%H:%M:%S')}")
    
    try:
        # 1. 测试优化策略的数据处理
        print("\n[测试1] 优化策略数据处理")
        from optimized_strategy import OptimizedTradingStrategy
        
        strategy = OptimizedTradingStrategy()
        print("[OK] 优化策略模块加载成功")
        
        # 2. 测试不同数据格式
        print("\n[测试2] 测试不同数据格式")
        
        # 完整格式 (理想情况)
        complete_market = {
            "market_id": "test_complete",
            "title": "Test Complete Market",
            "price": 0.75,
            "volume_24h": 10000,
            "volatility": 0.2,
            "time_to_expiry": 30,
            "category": "Test"
        }
        
        # 缺少price字段的格式 (问题情况)
        incomplete_market = {
            "market_id": "test_incomplete", 
            "title": "Test Incomplete Market",
            "outcomes": [
                {"name": "Yes", "price": 0.65, "volume_24h": 5000},
                {"name": "No", "price": 0.35, "volume_24h": 5000}
            ],
            "volume_24h": 10000,
            "category": "Test"
        }
        
        # 空数据格式 (最坏情况)
        empty_market = {
            "market_id": "test_empty",
            "title": "Test Empty Market"
        }
        
        test_cases = [
            ("完整数据", complete_market),
            ("缺少price字段", incomplete_market), 
            ("最小数据", empty_market)
        ]
        
        for case_name, market_data in test_cases:
            print(f"\n--- 测试案例: {case_name} ---")
            
            try:
                # 测试安全价格获取
                safe_price = strategy._safe_get_price(market_data)
                print(f"安全价格获取: {safe_price:.3f}")
                
                # 测试信号生成
                signal = strategy.generate_combined_signal(market_data)
                print(f"信号生成: 成功")
                print(f"  策略类型: {signal['strategy_type']}")
                print(f"  信号强度: {signal['signal_strength']:+.3f}")
                print(f"  置信度: {signal['confidence']:.3f}")
                
                # 测试仓位计算
                position_size = strategy.calculate_optimized_position_size(
                    signal['signal_strength'],
                    signal['confidence'],
                    market_data,
                    10000  # 可用余额
                )
                print(f"  推荐仓位: ${position_size:.0f}")
                
            except Exception as e:
                print(f"[ERROR] 案例失败: {e}")
                return False
        
        # 3. 测试数据获取器兼容性
        print(f"\n[测试3] 数据获取器兼容性")
        from enhanced_simulation_trading import EnhancedPolymarketDataFetcher
        
        # 测试离线模式数据加载
        async with EnhancedPolymarketDataFetcher(
            use_proxy=False, 
            offline_mode=True, 
            proxy_manager_port=24000
        ) as fetcher:
            
            print("[OK] 数据获取器初始化成功")
            
            # 加载模拟数据
            markets = await fetcher.fetch_active_markets(limit=3)
            
            if markets and len(markets) > 0:
                print(f"[OK] 成功加载 {len(markets)} 个市场数据")
                
                # 验证每个市场都有price字段
                for i, market in enumerate(markets):
                    market_id = market.get('market_id', f'market_{i}')
                    if 'price' in market and market['price'] is not None:
                        print(f"  市场 {market_id}: price={market['price']:.3f} ✓")
                    else:
                        print(f"  市场 {market_id}: 缺少price字段 ✗")
                        return False
            else:
                print(f"[ERROR] 未能加载市场数据")
                return False
        
        # 4. 完整集成测试
        print(f"\n[测试4] 完整集成测试")
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        
        # 创建系统实例
        sim_system = EnhancedPolymarketSimulationSystem(
            initial_balance=10000,
            use_proxy=False,
            offline_mode=True
        )
        print("[OK] 交易系统创建成功")
        
        # 测试策略信号生成 (不运行完整交易)
        async with EnhancedPolymarketDataFetcher(
            use_proxy=False, 
            offline_mode=True, 
            proxy_manager_port=24000
        ) as fetcher:
            
            markets = await fetcher.fetch_active_markets(limit=1)
            if markets:
                market = markets[0]
                
                # 测试信号生成流程
                signals = await sim_system._generate_and_execute_enhanced_signals([market])
                print("[OK] 信号生成流程测试成功")
        
        print(f"\n" + "=" * 60)
        print("✅ 所有数据兼容性测试通过!")
        print("🔧 数据格式不匹配问题已修复")
        print("🚀 系统可以安全重新启动")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n[CRITICAL ERROR] 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """主测试函数"""
    success = await test_data_compatibility()
    
    if success:
        print("\n🎉 数据兼容性修复验证成功!")
        print("现在可以安全地重新启动交易系统了。")
    else:
        print("\n❌ 还有问题需要解决")
        
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)