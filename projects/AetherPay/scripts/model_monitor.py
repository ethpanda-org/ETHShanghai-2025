"""
模型性能实时监控仪表盘
显示所有AI模型的健康状态和准确率趋势
"""

import os
import sys
import json
import sqlite3
import numpy as np
from datetime import datetime, timedelta
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class ModelMonitor:
    def __init__(self):
        self.model_dir = 'saved_models'
        self.db_path = 'aether_oracle.db'
        self.clear_screen = 'cls' if os.name == 'nt' else 'clear'

    def get_model_status(self):
        """获取所有模型状态"""
        models = {}

        # 扫描模型文件
        if os.path.exists(self.model_dir):
            for file in os.listdir(self.model_dir):
                if file.endswith('_metadata.json'):
                    pair = file.replace('_metadata.json', '').replace('_', '/')
                    metadata_file = os.path.join(self.model_dir, file)

                    try:
                        with open(metadata_file, 'r') as f:
                            metadata = json.load(f)

                        trained_at = datetime.fromisoformat(metadata['trained_at'])
                        age_days = (datetime.now() - trained_at).days
                        age_hours = (datetime.now() - trained_at).total_seconds() / 3600

                        # 估算当前准确率（基于年龄的简单衰减模型）
                        original_r2 = metadata['metrics'].get('r2', 0)
                        # 每天衰减约2-3%
                        decay_rate = 0.02
                        estimated_r2 = original_r2 * (1 - decay_rate * age_days)
                        estimated_r2 = max(0.5, estimated_r2)  # 最低0.5

                        models[pair] = {
                            'trained_at': trained_at.strftime('%Y-%m-%d %H:%M'),
                            'age_days': age_days,
                            'age_hours': age_hours,
                            'original_r2': original_r2,
                            'estimated_r2': estimated_r2,
                            'mae': metadata['metrics'].get('mae', 0),
                            'rmse': metadata['metrics'].get('rmse', 0),
                            'status': self.get_health_status(age_days, estimated_r2)
                        }
                    except Exception as e:
                        print(f"Error reading {file}: {e}")

        return models

    def get_health_status(self, age_days, r2_score):
        """判断模型健康状态"""
        if age_days <= 1 and r2_score > 0.9:
            return "🟢 优秀"
        elif age_days <= 3 and r2_score > 0.85:
            return "🟡 良好"
        elif age_days <= 7 and r2_score > 0.8:
            return "🟠 一般"
        else:
            return "🔴 需更新"

    def get_data_stats(self):
        """获取数据统计"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # 获取每个货币对的数据量
        cursor.execute("""
            SELECT pair,
                   COUNT(*) as total_records,
                   MAX(timestamp) as latest_update,
                   MIN(timestamp) as earliest_data
            FROM exchange_rates
            WHERE timestamp > datetime('now', '-7 days')
            GROUP BY pair
            ORDER BY total_records DESC
        """)

        data_stats = {}
        for row in cursor.fetchall():
            pair, count, latest, earliest = row
            data_stats[pair] = {
                'count': count,
                'latest': latest,
                'earliest': earliest,
                'days_of_data': (datetime.fromisoformat(latest) - datetime.fromisoformat(earliest)).days if latest and earliest else 0
            }

        conn.close()
        return data_stats

    def calculate_model_recommendations(self, models, data_stats):
        """计算模型更新建议"""
        recommendations = []

        for pair, stats in data_stats.items():
            if stats['count'] > 1000:  # 有足够数据
                if pair not in models:
                    recommendations.append({
                        'pair': pair,
                        'action': '🆕 需要训练',
                        'reason': '模型不存在',
                        'priority': 1
                    })
                elif models[pair]['age_days'] > 3:
                    recommendations.append({
                        'pair': pair,
                        'action': '🔄 需要更新',
                        'reason': f"模型已{models[pair]['age_days']}天未更新",
                        'priority': 2
                    })
                elif models[pair]['estimated_r2'] < 0.85:
                    recommendations.append({
                        'pair': pair,
                        'action': '⚠️ 建议更新',
                        'reason': f"准确率降至{models[pair]['estimated_r2']:.2%}",
                        'priority': 3
                    })

        return sorted(recommendations, key=lambda x: x['priority'])

    def display_dashboard(self):
        """显示监控仪表盘"""
        while True:
            try:
                os.system(self.clear_screen)

                models = self.get_model_status()
                data_stats = self.get_data_stats()
                recommendations = self.calculate_model_recommendations(models, data_stats)

                # 标题
                print("=" * 100)
                print(" " * 35 + "🤖 AI模型性能监控仪表盘")
                print("=" * 100)

                # 模型状态表
                print("\n【📊 模型状态】")
                print(f"  {'货币对':<12} {'训练时间':<20} {'年龄':<8} {'原始R²':<10} {'当前R²(估)':<12} {'MAE':<10} {'状态'}")
                print("  " + "-" * 95)

                for pair, model in sorted(models.items()):
                    age_display = f"{model['age_days']}天" if model['age_days'] > 0 else f"{model['age_hours']:.1f}小时"

                    print(f"  {pair:<12} {model['trained_at']:<20} {age_display:<8} "
                          f"{model['original_r2']:<10.3f} {model['estimated_r2']:<12.3f} "
                          f"{model['mae']:<10.1f} {model['status']}")

                # 数据可用性
                print("\n【📈 数据可用性（最近7天）】")
                print(f"  {'货币对':<12} {'记录数':<10} {'天数':<8} {'最新更新'}")
                print("  " + "-" * 50)

                for pair, stats in sorted(data_stats.items(), key=lambda x: x[1]['count'], reverse=True)[:10]:
                    latest = stats['latest'][:19] if stats['latest'] else 'N/A'
                    print(f"  {pair:<12} {stats['count']:<10} {stats['days_of_data']:<8} {latest}")

                # 更新建议
                if recommendations:
                    print("\n【⚡ 更新建议】")
                    print(f"  {'优先级':<8} {'货币对':<12} {'行动':<15} {'原因'}")
                    print("  " + "-" * 60)

                    for rec in recommendations[:5]:  # 只显示前5个
                        priority_icon = "🔴" if rec['priority'] == 1 else "🟡" if rec['priority'] == 2 else "🟢"
                        print(f"  {priority_icon} P{rec['priority']:<5} {rec['pair']:<12} {rec['action']:<15} {rec['reason']}")

                # 统计摘要
                total_models = len(models)
                healthy_models = sum(1 for m in models.values() if '🟢' in m['status'] or '🟡' in m['status'])
                needs_update = sum(1 for m in models.values() if '🔴' in m['status'])

                print("\n【📊 总体统计】")
                print(f"  总模型数: {total_models}")
                print(f"  健康模型: {healthy_models} ({healthy_models/max(total_models,1)*100:.1f}%)")
                print(f"  需要更新: {needs_update}")
                print(f"  可训练货币对: {len([d for d in data_stats.values() if d['count'] > 1000])}")

                # 底部信息
                print("\n" + "=" * 100)
                print(f"  更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"  刷新间隔: 10秒 | 按 Ctrl+C 退出")
                print("=" * 100)

                time.sleep(10)

            except KeyboardInterrupt:
                print("\n\n👋 监控已停止")
                break
            except Exception as e:
                print(f"\n❌ 错误: {e}")
                time.sleep(10)

def main():
    monitor = ModelMonitor()
    monitor.display_dashboard()

if __name__ == '__main__':
    main()