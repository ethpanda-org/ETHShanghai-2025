"""
批量训练所有货币对的AI模型
在数据采集24小时后运行此脚本
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
import subprocess
import time
import logging
from datetime import datetime, timedelta

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('model_training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('ModelTrainer')

class BatchModelTrainer:
    def __init__(self):
        self.db_path = 'aether_oracle.db'
        self.model_dir = 'saved_models'
        self.min_records = 1000  # 最少需要1000条记录才训练
        self.training_results = {}

    def check_data_availability(self):
        """检查每个货币对的数据可用性"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT pair,
                   COUNT(*) as record_count,
                   MIN(timestamp) as earliest,
                   MAX(timestamp) as latest,
                   julianday(MAX(timestamp)) - julianday(MIN(timestamp)) as days_of_data
            FROM exchange_rates
            GROUP BY pair
            ORDER BY record_count DESC
        """)

        pairs_status = []
        for pair, count, earliest, latest, days in cursor.fetchall():
            status = {
                'pair': pair,
                'records': count,
                'days': days,
                'earliest': earliest,
                'latest': latest,
                'ready': count >= self.min_records
            }
            pairs_status.append(status)

        conn.close()
        return pairs_status

    def train_single_model(self, pair):
        """训练单个模型"""
        logger.info(f"\n{'='*50}")
        logger.info(f"开始训练 {pair} 模型...")

        try:
            # 构建命令
            cmd = [
                'python' if os.name == 'nt' else 'python3',
                'models/train_model_optimized.py',
                '--pair', pair,
                '--fast-mode'  # 使用快速模式
            ]

            # 执行训练
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5分钟超时
            )

            if result.returncode == 0:
                logger.info(f"✅ {pair} 模型训练成功！")

                # 解析输出获取准确率
                output_lines = result.stdout.split('\n')
                for line in output_lines:
                    if 'R2 Score' in line or 'accuracy' in line.lower():
                        logger.info(f"  {line.strip()}")

                self.training_results[pair] = {
                    'status': 'success',
                    'message': '训练成功',
                    'time': datetime.now().isoformat()
                }
                return True

            else:
                logger.error(f"❌ {pair} 模型训练失败")
                logger.error(f"错误信息: {result.stderr}")
                self.training_results[pair] = {
                    'status': 'failed',
                    'message': result.stderr[:200],
                    'time': datetime.now().isoformat()
                }
                return False

        except subprocess.TimeoutExpired:
            logger.error(f"❌ {pair} 训练超时")
            self.training_results[pair] = {
                'status': 'timeout',
                'message': '训练超时（超过5分钟）',
                'time': datetime.now().isoformat()
            }
            return False

        except Exception as e:
            logger.error(f"❌ {pair} 训练出错: {e}")
            self.training_results[pair] = {
                'status': 'error',
                'message': str(e),
                'time': datetime.now().isoformat()
            }
            return False

    def train_all_models(self, force_retrain=False):
        """批量训练所有模型"""
        logger.info("="*60)
        logger.info("🚀 AetherPay AI模型批量训练")
        logger.info("="*60)

        # 检查数据可用性
        logger.info("\n📊 检查数据可用性...")
        pairs_status = self.check_data_availability()

        # 分类
        ready_pairs = [p for p in pairs_status if p['ready']]
        not_ready_pairs = [p for p in pairs_status if not p['ready']]

        # 显示统计
        logger.info(f"\n✅ 可训练的货币对 ({len(ready_pairs)}):")
        for p in ready_pairs:
            logger.info(f"  - {p['pair']:12s}: {p['records']:6d} 条记录, {p['days']:.1f} 天数据")

        if not_ready_pairs:
            logger.info(f"\n⚠️ 数据不足的货币对 ({len(not_ready_pairs)}):")
            for p in not_ready_pairs:
                logger.info(f"  - {p['pair']:12s}: {p['records']:6d} 条记录 (需要 {self.min_records} 条)")

        if not ready_pairs:
            logger.error("\n❌ 没有足够的数据可以训练模型！")
            logger.info("请继续运行数据采集器，等待数据积累。")
            return

        # 确认训练
        logger.info(f"\n准备训练 {len(ready_pairs)} 个模型")
        if not force_retrain:
            response = input("确认开始训练? (y/n): ")
            if response.lower() != 'y':
                logger.info("训练已取消")
                return

        # 开始训练
        logger.info("\n🔧 开始批量训练...")
        start_time = time.time()
        success_count = 0
        failed_count = 0

        # 优先训练重要的货币对
        priority_pairs = ['BTC/USDT', 'ETH/USDT', 'USDC/USDT', 'CNY/USD', 'EUR/USD']

        # 按优先级排序
        ready_pairs.sort(key=lambda x: (
            0 if x['pair'] in priority_pairs else 1,
            priority_pairs.index(x['pair']) if x['pair'] in priority_pairs else 999
        ))

        for status in ready_pairs:
            pair = status['pair']

            # 检查是否已有模型
            model_file = f"{self.model_dir}/{pair.replace('/', '_')}_lgb_model.txt"
            if os.path.exists(model_file) and not force_retrain:
                logger.info(f"⏭️  {pair} 模型已存在，跳过")
                continue

            if self.train_single_model(pair):
                success_count += 1
            else:
                failed_count += 1

            # 避免过载
            time.sleep(2)

        # 训练完成
        elapsed_time = time.time() - start_time
        logger.info("\n" + "="*60)
        logger.info("📊 训练完成统计:")
        logger.info(f"  成功: {success_count} 个模型")
        logger.info(f"  失败: {failed_count} 个模型")
        logger.info(f"  总耗时: {elapsed_time/60:.1f} 分钟")

        # 保存训练结果
        self.save_training_report()

        # 验证模型文件
        self.verify_models()

    def verify_models(self):
        """验证模型文件是否存在"""
        logger.info("\n🔍 验证模型文件...")

        model_files = []
        for file in os.listdir(self.model_dir):
            if file.endswith('_lgb_model.txt') or file.endswith('_model.onnx'):
                model_files.append(file)

        logger.info(f"找到 {len(model_files)} 个模型文件:")
        for f in sorted(model_files):
            size = os.path.getsize(f"{self.model_dir}/{f}") / 1024  # KB
            logger.info(f"  ✅ {f:30s} ({size:.1f} KB)")

    def save_training_report(self):
        """保存训练报告"""
        import json

        report = {
            'training_time': datetime.now().isoformat(),
            'results': self.training_results
        }

        report_file = f"training_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)

        logger.info(f"\n📄 训练报告已保存: {report_file}")

    def quick_train_essential(self):
        """快速训练最重要的模型"""
        essential_pairs = ['BTC/USDT', 'ETH/USDT', 'USDC/USDT']

        logger.info("🚀 快速训练核心模型")
        logger.info(f"目标: {', '.join(essential_pairs)}")

        for pair in essential_pairs:
            self.train_single_model(pair)

def main():
    import argparse

    parser = argparse.ArgumentParser(description='批量训练AI模型')
    parser.add_argument('--force', action='store_true', help='强制重新训练已有模型')
    parser.add_argument('--quick', action='store_true', help='只训练核心模型')
    args = parser.parse_args()

    trainer = BatchModelTrainer()

    if args.quick:
        trainer.quick_train_essential()
    else:
        trainer.train_all_models(force_retrain=args.force)

if __name__ == '__main__':
    main()