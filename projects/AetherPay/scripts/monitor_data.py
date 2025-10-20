"""
数据采集监控仪表盘
实时显示数据采集状态、质量和统计信息
"""

import sqlite3
import time
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class DataMonitor:
    def __init__(self):
        self.db_path = 'aether_oracle.db'
        self.clear_screen = 'cls' if os.name == 'nt' else 'clear'

    def get_latest_data(self):
        """获取最新的数据统计"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        stats = {}

        # 1. 总体统计
        cursor.execute("""
            SELECT COUNT(*) as total_records,
                   COUNT(DISTINCT pair) as unique_pairs,
                   COUNT(DISTINCT source) as data_sources,
                   MIN(timestamp) as earliest,
                   MAX(timestamp) as latest
            FROM exchange_rates
        """)
        result = cursor.fetchone()
        stats['overview'] = {
            'total_records': result[0],
            'unique_pairs': result[1],
            'data_sources': result[2],
            'earliest_data': result[3],
            'latest_data': result[4]
        }

        # 2. 每个货币对的统计
        cursor.execute("""
            SELECT pair,
                   COUNT(*) as record_count,
                   AVG(rate) as avg_rate,
                   MIN(rate) as min_rate,
                   MAX(rate) as max_rate,
                   MAX(timestamp) as latest_update,
                   julianday('now') - julianday(MAX(timestamp)) as days_old
            FROM exchange_rates
            WHERE timestamp > datetime('now', '-24 hours')
            GROUP BY pair
            ORDER BY pair
        """)

        stats['pairs'] = {}
        for row in cursor.fetchall():
            pair, count, avg_rate, min_rate, max_rate, latest, days_old = row

            # 计算波动率
            volatility = ((max_rate - min_rate) / avg_rate * 100) if avg_rate > 0 else 0

            # 数据新鲜度
            minutes_old = days_old * 24 * 60 if days_old else 0
            freshness = "🟢 新鲜" if minutes_old < 5 else "🟡 一般" if minutes_old < 30 else "🔴 过期"

            stats['pairs'][pair] = {
                'count': count,
                'avg_rate': avg_rate,
                'volatility': volatility,
                'latest_update': latest,
                'minutes_old': minutes_old,
                'freshness': freshness
            }

        # 3. 最近5分钟的采集频率
        cursor.execute("""
            SELECT pair, COUNT(*) as recent_count
            FROM exchange_rates
            WHERE timestamp > datetime('now', '-5 minutes')
            GROUP BY pair
        """)

        stats['recent_activity'] = {}
        for pair, count in cursor.fetchall():
            stats['recent_activity'][pair] = count

        # 4. 稳定币特别关注
        cursor.execute("""
            SELECT pair, rate, timestamp
            FROM exchange_rates
            WHERE pair IN ('USDC/USDT', 'USDT/DAI', 'DAI/USDC')
            AND timestamp > datetime('now', '-10 minutes')
            ORDER BY timestamp DESC
            LIMIT 9
        """)

        stats['stablecoins'] = []
        for pair, rate, timestamp in cursor.fetchall():
            deviation = abs(1.0 - rate) * 100  # 偏离1:1的百分比
            stats['stablecoins'].append({
                'pair': pair,
                'rate': rate,
                'deviation': deviation,
                'timestamp': timestamp
            })

        conn.close()
        return stats

    def display_dashboard(self):
        """显示监控仪表盘"""
        while True:
            try:
                # 清屏
                os.system(self.clear_screen)

                stats = self.get_latest_data()
                overview = stats['overview']

                # 标题
                print("=" * 80)
                print(" " * 25 + "📊 AetherPay 数据采集监控仪表盘")
                print("=" * 80)

                # 总体统计
                print("\n【📈 总体统计】")
                print(f"  总记录数: {overview['total_records']:,}")
                print(f"  活跃货币对: {overview['unique_pairs']}")
                print(f"  数据源数量: {overview['data_sources']}")
                print(f"  最新数据: {overview['latest_data'][:19] if overview['latest_data'] else 'N/A'}")

                # 货币对状态
                print("\n【💱 货币对状态】")
                print(f"  {'货币对':<12} {'24h记录':<8} {'平均价格':<12} {'波动率':<8} {'新鲜度':<8} {'更新时间'}")
                print("  " + "-" * 75)

                for pair, data in stats['pairs'].items():
                    recent = stats['recent_activity'].get(pair, 0)
                    activity = "🔥" if recent > 5 else "✓" if recent > 0 else "⚠️"

                    print(f"  {pair:<12} {data['count']:<8} "
                          f"{data['avg_rate']:<12.4f} "
                          f"{data['volatility']:<7.2f}% "
                          f"{data['freshness']:<8} "
                          f"{data['latest_update'][:19] if data['latest_update'] else 'N/A':<19} {activity}")

                # 稳定币监控
                if stats['stablecoins']:
                    print("\n【💰 稳定币汇率监控】")
                    print(f"  {'货币对':<12} {'汇率':<10} {'偏离度':<10} {'时间'}")
                    print("  " + "-" * 50)

                    for stable in stats['stablecoins'][:6]:
                        status = "✅" if stable['deviation'] < 0.1 else "⚠️" if stable['deviation'] < 0.5 else "🔴"
                        print(f"  {stable['pair']:<12} {stable['rate']:<10.6f} "
                              f"{stable['deviation']:<9.4f}% "
                              f"{stable['timestamp'][:19]} {status}")

                # 实时活动
                print("\n【🔄 最近5分钟采集活动】")
                active_pairs = [p for p, c in stats['recent_activity'].items() if c > 0]
                if active_pairs:
                    print(f"  活跃货币对: {', '.join(active_pairs)}")
                    total_recent = sum(stats['recent_activity'].values())
                    print(f"  5分钟内记录: {total_recent} 条")
                    print(f"  平均频率: {total_recent / 5:.1f} 条/分钟")
                else:
                    print("  ⚠️ 最近5分钟无数据采集！请检查采集器是否运行。")

                # 底部信息
                print("\n" + "=" * 80)
                print(f"  更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"  刷新间隔: 5秒 | 按 Ctrl+C 退出")
                print("=" * 80)

                # 等待5秒
                time.sleep(5)

            except KeyboardInterrupt:
                print("\n\n👋 监控已停止")
                break
            except Exception as e:
                print(f"\n❌ 错误: {e}")
                time.sleep(5)

    def check_data_quality(self):
        """检查数据质量问题"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        issues = []

        # 1. 检查异常值
        cursor.execute("""
            SELECT pair, rate, timestamp
            FROM exchange_rates
            WHERE (pair = 'BTC/USDT' AND (rate < 10000 OR rate > 200000))
               OR (pair = 'ETH/USDT' AND (rate < 100 OR rate > 20000))
               OR (pair LIKE '%USD%' AND pair NOT LIKE '%USDT%' AND (rate < 0.1 OR rate > 100))
            ORDER BY timestamp DESC
            LIMIT 10
        """)

        outliers = cursor.fetchall()
        if outliers:
            issues.append(f"发现 {len(outliers)} 个异常值")

        # 2. 检查数据断层
        cursor.execute("""
            SELECT pair,
                   MAX(julianday('now') - julianday(timestamp)) * 24 * 60 as minutes_since_update
            FROM exchange_rates
            GROUP BY pair
            HAVING minutes_since_update > 60
        """)

        stale = cursor.fetchall()
        if stale:
            issues.append(f"{len(stale)} 个货币对超过1小时未更新")

        conn.close()
        return issues

def main():
    monitor = DataMonitor()

    print("启动数据监控仪表盘...")
    print("提示: 如果看不到数据，请先运行 start_data_collection.py")
    time.sleep(2)

    monitor.display_dashboard()

if __name__ == '__main__':
    main()