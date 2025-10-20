#!/usr/bin/env python3
"""
测试离线模式的模拟交易系统
"""

import asyncio
from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem

async def test_offline_simulation():
    """测试离线模式模拟交易"""
    print("=" * 50)
    print("TESTING OFFLINE SIMULATION")
    print("=" * 50)
    
    try:
        # 创建离线模式的模拟系统
        sim_system = EnhancedPolymarketSimulationSystem(
            initial_balance=20000,
            use_proxy=False,
            offline_mode=True
        )
        
        print("[OFFLINE] Simulation system initialized")
        print("[OFFLINE] Running 0.1 hour test (6 minutes)")
        
        # 运行短时间测试 
        await sim_system.run_enhanced_simulation(0.1)  # 6分钟测试
        
        return True
        
    except Exception as e:
        print(f"[OFFLINE] Test failed: {e}")
        print(f"[OFFLINE] Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_offline_simulation())
    if result:
        print("\n[SUCCESS] Offline simulation completed successfully!")
    else:
        print("\n[FAIL] Offline simulation test failed")