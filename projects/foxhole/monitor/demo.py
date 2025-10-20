"""
演示脚本 - 运行 10 秒展示监控功能
"""

import asyncio
import sys
from token_monitor import TokenMonitor


async def demo():
    """演示监控功能"""
    print("\n" + "=" * 60)
    print("Dex Screener Token Monitor - 演示模式")
    print("=" * 60)
    print("\n本演示将运行 10 秒，展示监控功能...")
    print("按 Ctrl+C 可提前停止\n")
    
    monitor = TokenMonitor()
    
    # 初始化
    monitor._initialize_csv()
    
    # 创建会话
    import aiohttp
    timeout = aiohttp.ClientTimeout(total=10)
    monitor.session = aiohttp.ClientSession(timeout=timeout)
    
    try:
        # 运行 10 秒
        start_time = asyncio.get_event_loop().time()
        iteration = 0
        
        while asyncio.get_event_loop().time() - start_time < 10:
            iteration += 1
            
            # 获取数据
            tokens = await monitor._fetch_latest_tokens()
            
            # 保存数据
            if tokens:
                monitor._save_tokens(tokens)
                
                # 显示前3个
                print(f"\n[迭代 {iteration}] 获取到 {len(tokens)} 个 token:")
                for i, (symbol, name) in enumerate(tokens[:3], 1):
                    print(f"  {i}. {symbol}: {name}")
            else:
                print(f"\n[迭代 {iteration}] 未获取到新 token")
            
            # 等待
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        print("\n\n演示被用户中断")
    finally:
        await monitor.session.close()
        
        print("\n" + "=" * 60)
        print("演示完成 - 最终统计")
        print("=" * 60)
        print(f"总请求次数: {monitor.stats['total_fetched']}")
        print(f"新增 token: {monitor.stats['total_saved']}")
        print(f"重复 token: {monitor.stats['total_duplicates']}")
        print(f"错误次数: {monitor.stats['errors']}")
        print(f"缓存大小: {len(monitor.seen_tokens)} tokens")
        print(f"\n数据已保存到: {monitor.csv_file}")
        print(f"日志已保存到: monitor.log")
        print("\n提示: 运行 'python token_monitor.py' 开始正式监控")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    try:
        asyncio.run(demo())
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()

