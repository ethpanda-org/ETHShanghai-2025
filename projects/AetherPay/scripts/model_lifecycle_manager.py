"""
AI模型自动更新系统 - 保持预言机准确性
通过定期重训练和增量学习保持模型时效性
"""

import os
import sys
import time
import json
import logging
import sqlite3
import schedule
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('model_updater.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('ModelUpdater')

class ModelLifecycleManager:
    """AI模型生命周期管理器"""

    def __init__(self):
        self.model_dir = 'saved_models'
        self.db_path = 'aether_oracle.db'
        self.performance_history = {}

        # 模型更新策略配置
        self.config = {
            'max_model_age_days': 3,          # 模型最大年龄（天）
            'min_accuracy_threshold': 0.85,    # 最低准确率阈值
            'retrain_interval_hours': 24,      # 定期重训练间隔（小时）
            'incremental_update_hours': 6,     # 增量更新间隔（小时）
            'performance_check_hours': 1,      # 性能检查间隔（小时）
            'min_data_points': 1000,          # 重训练最少数据点
            'rolling_window_days': 30,        # 滚动窗口天数
        }

    def check_model_health(self, pair: str) -> Dict:
        """检查模型健康状态"""
        pair_key = pair.replace('/', '_')
        model_file = f"{self.model_dir}/{pair_key}_lgb_model.txt"
        metadata_file = f"{self.model_dir}/{pair_key}_metadata.json"

        health_report = {
            'pair': pair,
            'exists': False,
            'age_days': None,
            'last_accuracy': None,
            'current_accuracy': None,
            'needs_update': False,
            'update_reason': []
        }

        # 检查模型是否存在
        if not os.path.exists(model_file):
            health_report['needs_update'] = True
            health_report['update_reason'].append('模型不存在')
            return health_report

        health_report['exists'] = True

        # 检查模型年龄
        try:
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)

            trained_at = datetime.fromisoformat(metadata['trained_at'])
            age_days = (datetime.now() - trained_at).days
            health_report['age_days'] = age_days
            health_report['last_accuracy'] = metadata['metrics'].get('r2', 0)

            # 年龄检查
            if age_days > self.config['max_model_age_days']:
                health_report['needs_update'] = True
                health_report['update_reason'].append(f'模型过旧（{age_days}天）')

        except Exception as e:
            logger.error(f"读取模型元数据失败 {pair}: {e}")
            health_report['needs_update'] = True
            health_report['update_reason'].append('元数据错误')

        # 检查当前性能
        current_accuracy = self.evaluate_model_performance(pair)
        health_report['current_accuracy'] = current_accuracy

        if current_accuracy and current_accuracy < self.config['min_accuracy_threshold']:
            health_report['needs_update'] = True
            health_report['update_reason'].append(f'准确率下降（{current_accuracy:.3f}）')

        return health_report

    def evaluate_model_performance(self, pair: str) -> float:
        """评估模型当前性能"""
        try:
            # 获取最近24小时的预测和实际数据
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # 这里简化处理，实际应该记录预测值并对比
            cursor.execute("""
                SELECT AVG(price) as avg_price,
                       MIN(price) as min_price,
                       MAX(price) as max_price,
                       COUNT(*) as count
                FROM exchange_rates
                WHERE pair = ?
                AND timestamp > datetime('now', '-1 day')
            """, (pair,))

            result = cursor.fetchone()
            conn.close()

            if result and result[3] > 100:  # 至少100个数据点
                # 简单的波动率作为性能指标（实际应该用预测vs实际）
                avg_price = result[0]
                volatility = (result[2] - result[1]) / avg_price if avg_price else 0

                # 波动率越低，认为模型越稳定（简化处理）
                estimated_accuracy = max(0.5, 1 - volatility * 10)
                return estimated_accuracy

        except Exception as e:
            logger.error(f"评估模型性能失败 {pair}: {e}")

        return None

    def retrain_model(self, pair: str, mode: str = 'full') -> bool:
        """重训练模型"""
        try:
            logger.info(f"开始{mode}训练 {pair} 模型...")

            # 构建训练命令
            cmd = [
                'python3',
                'models/train_model_optimized.py',
                '--pair', pair
            ]

            if mode == 'incremental':
                cmd.append('--incremental')
            elif mode == 'fast':
                cmd.append('--fast-mode')

            # 执行训练
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600  # 10分钟超时
            )

            if result.returncode == 0:
                logger.info(f"✅ {pair} 模型训练成功")

                # 记录训练历史
                self.record_training_history(pair, mode, 'success')
                return True
            else:
                logger.error(f"❌ {pair} 模型训练失败: {result.stderr}")
                self.record_training_history(pair, mode, 'failed')
                return False

        except Exception as e:
            logger.error(f"训练模型异常 {pair}: {e}")
            return False

    def record_training_history(self, pair: str, mode: str, status: str):
        """记录训练历史"""
        history = {
            'pair': pair,
            'timestamp': datetime.now().isoformat(),
            'mode': mode,
            'status': status
        }

        # 保存到文件
        history_file = 'training_history.json'
        try:
            if os.path.exists(history_file):
                with open(history_file, 'r') as f:
                    all_history = json.load(f)
            else:
                all_history = []

            all_history.append(history)

            # 只保留最近100条记录
            all_history = all_history[-100:]

            with open(history_file, 'w') as f:
                json.dump(all_history, f, indent=2)

        except Exception as e:
            logger.error(f"记录训练历史失败: {e}")

    def get_active_pairs(self) -> List[str]:
        """获取活跃的货币对"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # 获取最近有数据的货币对
            cursor.execute("""
                SELECT pair, COUNT(*) as count
                FROM exchange_rates
                WHERE timestamp > datetime('now', '-7 days')
                GROUP BY pair
                HAVING count > ?
                ORDER BY count DESC
            """, (self.config['min_data_points'],))

            pairs = [row[0] for row in cursor.fetchall()]
            conn.close()

            return pairs

        except Exception as e:
            logger.error(f"获取活跃货币对失败: {e}")
            return []

    def update_all_models(self):
        """更新所有需要更新的模型"""
        logger.info("="*60)
        logger.info("🔄 开始模型更新检查...")

        active_pairs = self.get_active_pairs()
        logger.info(f"活跃货币对: {len(active_pairs)}个")

        update_summary = {
            'checked': 0,
            'updated': 0,
            'failed': 0,
            'skipped': 0
        }

        for pair in active_pairs:
            update_summary['checked'] += 1

            # 检查模型健康状态
            health = self.check_model_health(pair)

            logger.info(f"\n{pair} 健康检查:")
            logger.info(f"  存在: {health['exists']}")
            logger.info(f"  年龄: {health['age_days']}天")
            logger.info(f"  上次准确率: {health['last_accuracy']:.3f}" if health['last_accuracy'] else "  上次准确率: N/A")
            logger.info(f"  当前准确率: {health['current_accuracy']:.3f}" if health['current_accuracy'] else "  当前准确率: N/A")

            if health['needs_update']:
                logger.info(f"  ⚠️ 需要更新: {', '.join(health['update_reason'])}")

                # 决定更新模式
                if not health['exists'] or health['age_days'] > 7:
                    mode = 'full'  # 完全重训练
                else:
                    mode = 'fast'  # 快速更新

                # 执行更新
                if self.retrain_model(pair, mode):
                    update_summary['updated'] += 1
                else:
                    update_summary['failed'] += 1
            else:
                logger.info(f"  ✅ 模型健康，无需更新")
                update_summary['skipped'] += 1

            # 避免过载
            time.sleep(2)

        # 显示更新总结
        logger.info("\n" + "="*60)
        logger.info("📊 更新总结:")
        logger.info(f"  检查: {update_summary['checked']}个")
        logger.info(f"  更新: {update_summary['updated']}个")
        logger.info(f"  失败: {update_summary['failed']}个")
        logger.info(f"  跳过: {update_summary['skipped']}个")
        logger.info("="*60)

    def incremental_learning(self, pair: str):
        """增量学习（在线学习）"""
        logger.info(f"执行 {pair} 增量学习...")

        # TODO: 实现增量学习逻辑
        # 1. 加载现有模型
        # 2. 获取新数据
        # 3. 增量更新模型参数
        # 4. 保存更新后的模型

        pass

    def start_scheduler(self):
        """启动自动更新调度器"""
        logger.info("🚀 启动模型自动更新系统")
        logger.info(f"配置:")
        logger.info(f"  - 完整检查: 每{self.config['retrain_interval_hours']}小时")
        logger.info(f"  - 性能监控: 每{self.config['performance_check_hours']}小时")
        logger.info(f"  - 模型最大年龄: {self.config['max_model_age_days']}天")
        logger.info(f"  - 最低准确率: {self.config['min_accuracy_threshold']}")

        # 立即执行一次
        self.update_all_models()

        # 设置定期任务
        schedule.every(self.config['retrain_interval_hours']).hours.do(self.update_all_models)
        schedule.every(self.config['performance_check_hours']).hours.do(self.check_all_performance)

        # 每天凌晨2点执行完整更新
        schedule.every().day.at("02:00").do(self.daily_maintenance)

        logger.info("\n✅ 调度器已启动，按Ctrl+C停止")

        while True:
            try:
                schedule.run_pending()
                time.sleep(60)  # 每分钟检查一次
            except KeyboardInterrupt:
                logger.info("\n👋 模型更新系统已停止")
                break
            except Exception as e:
                logger.error(f"调度器错误: {e}")
                time.sleep(60)

    def check_all_performance(self):
        """检查所有模型性能"""
        logger.info("📊 执行性能检查...")

        pairs = self.get_active_pairs()
        alerts = []

        for pair in pairs:
            health = self.check_model_health(pair)
            if health['current_accuracy'] and health['current_accuracy'] < 0.8:
                alerts.append(f"{pair}: 准确率 {health['current_accuracy']:.3f}")

        if alerts:
            logger.warning("⚠️ 性能警报:")
            for alert in alerts:
                logger.warning(f"  - {alert}")

    def daily_maintenance(self):
        """每日维护任务"""
        logger.info("🔧 执行每日维护...")

        # 1. 清理旧数据
        self.cleanup_old_data()

        # 2. 完整模型更新
        self.update_all_models()

        # 3. 生成性能报告
        self.generate_performance_report()

    def cleanup_old_data(self):
        """清理旧数据"""
        try:
            # 调用清理脚本
            subprocess.run(['python3', 'cleanup_old_data.py', '--days', '30'])
            logger.info("✅ 旧数据清理完成")
        except Exception as e:
            logger.error(f"清理数据失败: {e}")

    def generate_performance_report(self):
        """生成性能报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'models': {}
        }

        pairs = self.get_active_pairs()
        for pair in pairs:
            health = self.check_model_health(pair)
            report['models'][pair] = health

        # 保存报告
        report_file = f"performance_report_{datetime.now().strftime('%Y%m%d')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)

        logger.info(f"📄 性能报告已生成: {report_file}")

def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='AI模型生命周期管理')
    parser.add_argument('--check', help='检查特定模型健康状态', metavar='PAIR')
    parser.add_argument('--update', help='立即更新特定模型', metavar='PAIR')
    parser.add_argument('--update-all', action='store_true', help='更新所有模型')
    parser.add_argument('--daemon', action='store_true', help='以守护进程模式运行')

    args = parser.parse_args()

    manager = ModelLifecycleManager()

    if args.check:
        health = manager.check_model_health(args.check)
        print(json.dumps(health, indent=2))
    elif args.update:
        manager.retrain_model(args.update)
    elif args.update_all:
        manager.update_all_models()
    elif args.daemon:
        manager.start_scheduler()
    else:
        # 默认运行调度器
        manager.start_scheduler()

if __name__ == '__main__':
    main()