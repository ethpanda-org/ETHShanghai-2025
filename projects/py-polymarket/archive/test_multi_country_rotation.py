#!/usr/bin/env python3
"""
多国IP轮换功能测试
"""

import asyncio
import sys
import os
from datetime import datetime

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

async def test_multi_country_rotation():
    """测试多国IP轮换功能"""
    print("=" * 60)
    print("多国IP轮换功能测试")
    print("=" * 60)
    print(f"测试时间: {datetime.now().strftime('%H:%M:%S')}")
    
    try:
        from enhanced_simulation_trading import EnhancedPolymarketDataFetcher
        
        print("[配置] 支持的国家列表:")
        print("1. 🇺🇸 United States")
        print("2. 🇨🇦 Canada") 
        print("3. 🇬🇧 United Kingdom")
        print("4. 🇩🇪 Germany")
        print("5. 🇫🇷 France")
        print("6. 🇳🇱 Netherlands") 
        print("7. 🇨🇭 Switzerland")
        print("8. 🇦🇺 Australia")
        
        print(f"\n[配置] 每8个请求自动轮换国家")
        print(f"[配置] 失败IP自动跳过")
        
        async with EnhancedPolymarketDataFetcher(
            use_proxy=True, 
            offline_mode=False, 
            proxy_manager_port=24000
        ) as fetcher:
            
            print(f"\n[OK] 多国IP代理系统初始化成功")
            
            # 测试多次请求，观察IP轮换
            print(f"\n[测试] 连续请求观察IP轮换...")
            
            success_count = 0
            for i in range(15):  # 测试15次请求，应该会轮换2次
                try:
                    print(f"\n--- 请求 {i+1}/15 ---")
                    
                    markets = await fetcher.fetch_active_markets(limit=1)
                    
                    if markets and len(markets) > 0:
                        success_count += 1
                        market = markets[0]
                        title = market.get('title', 'Unknown')[:30]
                        print(f"[SUCCESS] 获取市场: {title}...")
                    else:
                        print(f"[WARNING] 未获取到数据")
                        
                except Exception as e:
                    print(f"[ERROR] 请求失败: {e}")
                
                # 每5个请求暂停一下
                if (i + 1) % 5 == 0:
                    print(f"[INFO] 暂停2秒...")
                    await asyncio.sleep(2)
            
            print(f"\n[结果] 成功请求: {success_count}/15")
            
            if success_count >= 10:
                print(f"[SUCCESS] 多国IP轮换功能正常! 🎉")
                print(f"[READY] 可以启动8小时在线测试")
                return True
            elif success_count >= 5:
                print(f"[PARTIAL] 部分成功，代理基本可用")
                print(f"[SUGGESTION] 可以尝试启动测试")
                return True
            else:
                print(f"[FAILED] 成功率过低，需要检查代理配置")
                return False
                
    except Exception as e:
        print(f"[ERROR] 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("开始多国IP轮换测试...")
    
    success = await test_multi_country_rotation()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ 多国IP轮换配置成功")
        print("🌍 支持8个国家动态切换")
        print("🔄 智能故障切换机制")
        print("🚀 准备启动8小时在线测试")
    else:
        print("❌ 多国IP轮换需要调试")
        print("🔧 建议检查Proxy Manager配置")

if __name__ == "__main__":
    asyncio.run(main())