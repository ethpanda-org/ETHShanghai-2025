"""
实时数据采集启动器 - AetherPay Oracle
自动采集14个货币对的实时汇率数据
每30秒采集一次（高频数据用于30秒预测）
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import schedule
import logging
from datetime import datetime
from data.data_collector import DataCollector
import sqlite3
import json

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_collection.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('DataCollectionScheduler')

class DataCollectionManager:
    def __init__(self):
        self.collector = None
        self.db_path = 'aether_oracle.db'
        self.collection_stats = {
            'total_collections': 0,
            'successful_collections': 0,
            'failed_collections': 0,
            'last_collection_time': None,
            'pairs_collected': {}
        }
        self.initialize_collector()

    def initialize_collector(self):
        """初始化数据采集器"""
        try:
            self.collector = DataCollector()
            logger.info("✅ 数据采集器初始化成功")
            logger.info(f"📊 配置的货币对: {self.collector.currency_pairs}")

            # 确保法币采集器也初始化
            if hasattr(self.collector, 'fiat_collector'):
                logger.info(f"💱 法币对: {self.collector.fiat_collector.fiat_pairs if self.collector.fiat_collector else '未配置'}")
        except Exception as e:
            logger.error(f"❌ 初始化失败: {e}")
            raise

    def collect_data(self):
        """执行一次数据采集"""
        try:
            start_time = time.time()
            logger.info("="*60)
            logger.info("🚀 开始数据采集...")

            # 调用采集器的主方法
            self.collector.collect_all_data()

            # 更新统计
            self.collection_stats['total_collections'] += 1
            self.collection_stats['successful_collections'] += 1
            self.collection_stats['last_collection_time'] = datetime.now().isoformat()

            # 验证数据入库
            self.verify_data_collection()

            elapsed_time = time.time() - start_time
            logger.info(f"✅ 数据采集完成，耗时: {elapsed_time:.2f}秒")

            # 显示统计信息
            self.show_statistics()

        except Exception as e:
            self.collection_stats['failed_collections'] += 1
            logger.error(f"❌ 数据采集失败: {e}")

    def verify_data_collection(self):
        """验证数据是否成功入库"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # 检查每个货币对的最新数据
            cursor.execute("""
                SELECT pair, MAX(timestamp) as latest_time, COUNT(*) as total_records
                FROM exchange_rates
                WHERE timestamp > datetime('now', '-1 hour')
                GROUP BY pair
                ORDER BY pair
            """)

            results = cursor.fetchall()

            logger.info("\n📈 最近1小时数据统计:")
            logger.info("-" * 40)
            for pair, latest_time, count in results:
                self.collection_stats['pairs_collected'][pair] = count
                logger.info(f"  {pair:12s}: {count:4d} 条记录 | 最新: {latest_time[:19]}")

            # 检查稳定币数据
            cursor.execute("""
                SELECT pair, price
                FROM exchange_rates
                WHERE pair IN ('USDC/USDT', 'USDT/DAI', 'DAI/USDC')
                AND timestamp > datetime('now', '-5 minutes')
                ORDER BY timestamp DESC
                LIMIT 3
            """)

            stablecoin_data = cursor.fetchall()
            if stablecoin_data:
                logger.info("\n💰 稳定币汇率:")
                for pair, price in stablecoin_data:
                    logger.info(f"  {pair}: {price:.6f}")

            conn.close()

        except Exception as e:
            logger.error(f"验证数据失败: {e}")

    def show_statistics(self):
        """显示采集统计信息"""
        stats = self.collection_stats
        success_rate = (stats['successful_collections'] / max(stats['total_collections'], 1)) * 100

        logger.info("\n📊 采集统计:")
        logger.info(f"  总采集次数: {stats['total_collections']}")
        logger.info(f"  成功次数: {stats['successful_collections']}")
        logger.info(f"  失败次数: {stats['failed_collections']}")
        logger.info(f"  成功率: {success_rate:.1f}%")
        logger.info(f"  活跃货币对: {len(stats['pairs_collected'])}")

    def check_data_freshness(self):
        """检查数据新鲜度"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # 检查每个货币对的数据新鲜度
            cursor.execute("""
                SELECT pair,
                       MAX(timestamp) as latest_time,
                       julianday('now') - julianday(MAX(timestamp)) as days_old
                FROM exchange_rates
                GROUP BY pair
                HAVING days_old > 0.0035  -- 超过5分钟视为过期
                ORDER BY days_old DESC
            """)

            stale_pairs = cursor.fetchall()

            if stale_pairs:
                logger.warning("\n⚠️ 以下货币对数据过期:")
                for pair, latest_time, days_old in stale_pairs:
                    minutes_old = days_old * 24 * 60
                    logger.warning(f"  {pair}: 最后更新 {minutes_old:.1f} 分钟前")

            conn.close()

        except Exception as e:
            logger.error(f"检查数据新鲜度失败: {e}")

    def run_continuous(self):
        """持续运行数据采集"""
        logger.info("="*60)
        logger.info("🎯 AetherPay Oracle 数据采集系统")
        logger.info("="*60)
        logger.info("配置:")
        logger.info("  - 采集频率: 每30秒")
        logger.info("  - 数据源: 7个 (Binance, Coinbase, OKX等)")
        logger.info("  - 货币对: 14个 (加密货币+法币)")
        logger.info("="*60)

        # 立即执行一次
        logger.info("立即执行首次采集...")
        self.collect_data()

        # 设置定时任务
        schedule.every(30).seconds.do(self.collect_data)
        schedule.every(5).minutes.do(self.check_data_freshness)

        logger.info("\n✅ 定时任务已启动，按 Ctrl+C 停止")
        logger.info("="*60 + "\n")

        # 持续运行
        while True:
            try:
                schedule.run_pending()
                time.sleep(1)
            except KeyboardInterrupt:
                logger.info("\n👋 数据采集已停止")
                self.show_statistics()
                break
            except Exception as e:
                logger.error(f"运行错误: {e}")
                time.sleep(5)  # 错误后等待5秒重试

def main():
    """主函数"""
    manager = DataCollectionManager()
    manager.run_continuous()

if __name__ == '__main__':
    main()