#!/usr/bin/env python3
"""
运行30分钟的离线模拟交易测试
"""

import asyncio
from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem

async def run_30min_test():
    """运行30分钟的模拟交易测试"""
    print("=" * 60)
    print("30-MINUTE OFFLINE SIMULATION TEST")
    print("=" * 60)
    
    try:
        # 创建离线模拟系统
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=20000,  # $20,000 初始资金
            use_proxy=False,
            offline_mode=True
        )
        
        print("[INIT] System initialized successfully")
        print("[INIT] Mode: Offline with mock data")
        print("[INIT] Duration: 30 minutes (0.5 hours)")
        print("[INIT] Initial balance: $20,000")
        print("[INIT] Starting simulation...")
        print("-" * 60)
        
        # 运行30分钟模拟交易
        await sim.run_enhanced_simulation(0.5)
        
        print("-" * 60)
        print("[COMPLETE] 30-minute simulation completed!")
        return True
        
    except KeyboardInterrupt:
        print("\n[INTERRUPT] User interrupted the simulation")
        print("[INTERRUPT] Generating final report...")
        return True
        
    except Exception as e:
        print(f"[ERROR] Simulation failed: {e}")
        print(f"[ERROR] Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Starting 30-minute offline simulation test...")
    print("Press Ctrl+C to stop early and generate report\n")
    
    result = asyncio.run(run_30min_test())
    
    if result:
        print("\n" + "=" * 60)
        print("TEST COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print("Check the generated simulation report files for detailed results.")
    else:
        print("\n" + "=" * 60) 
        print("TEST FAILED")
        print("=" * 60)