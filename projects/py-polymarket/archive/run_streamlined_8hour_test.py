#!/usr/bin/env python3
"""
Streamlined 8-Hour Online Trading Test
精简版8小时在线交易测试

特性:
- 仅使用CLOB和GraphQL数据源
- 强制代理模式
- 网络故障时自动暂停
- 自动Web监控
"""

import asyncio
import sys
import os
from datetime import datetime

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

async def main():
    """主函数"""
    print("=" * 60)
    print("Streamlined Polymarket Trading System")
    print("8-Hour Online Test with CLOB + GraphQL")
    print("=" * 60)
    print()
    
    print("Configuration:")
    print("- Data sources: CLOB (primary) + GraphQL (backup)")
    print("- Proxy mode: FORCED (system requirement)")
    print("- Network failures: Auto-pause with error analysis")
    print("- Duration: 8 hours")
    print("- Initial balance: $10,000")
    print("- Web monitor: Auto-start at http://localhost:8888")
    print()
    
    try:
        from enhanced_streamlined_trading import EnhancedStreamlinedTradingSystem
        
        # 创建系统
        system = EnhancedStreamlinedTradingSystem(
            initial_balance=10000,
            auto_monitor=True,      # 启用自动Web监控
            proxy_manager_port=33335
        )
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting 8-hour streamlined simulation...")
        print("[REQUIREMENT] Proxy must be configured at port 33335")
        print("[MONITOR] Web interface will auto-open")
        print()
        
        # 运行8小时测试
        await system.run_enhanced_simulation(8.0)
        
        print()
        print("[COMPLETED] 8-hour streamlined trading test completed successfully!")
        
    except ImportError as e:
        print(f"[IMPORT ERROR] Required module not found: {e}")
        print("[SUGGESTION] Ensure all dependencies are installed")
        
    except Exception as e:
        print(f"[ERROR] System error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] User interrupted the simulation")
        print("[INFO] Final report should be generated automatically")
    except Exception as e:
        print(f"\n[FATAL] Unexpected error: {e}")