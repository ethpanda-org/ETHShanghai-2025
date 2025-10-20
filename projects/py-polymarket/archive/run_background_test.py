#!/usr/bin/env python3

import asyncio
import logging
import sys
from datetime import datetime

# 配置输出编码
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# 配置简化日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

async def run_background_test():
    """运行后台测试"""
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting 30-minute simulation test")
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Using offline mode with mock data")
        
        from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
        
        sim = EnhancedPolymarketSimulationSystem(
            initial_balance=20000,
            offline_mode=True
        )
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] System initialized - Starting simulation...")
        
        await sim.run_enhanced_simulation(0.5)  # 30分钟
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Simulation completed successfully!")
        
    except KeyboardInterrupt:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Test interrupted by user")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Error: {str(e)}")
        logger.error(f"Detailed error: {e}")

if __name__ == "__main__":
    asyncio.run(run_background_test())