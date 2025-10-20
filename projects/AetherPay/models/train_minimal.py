"""
极简训练脚本 - 只用100条数据
最少的数据，最快的速度，合理的效果
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error
import sqlite3
import json
import os
from datetime import datetime
import logging
import warnings
import argparse

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

class MinimalTrainer:
    """极简训练器 - 100条数据"""

    def __init__(self, model_dir='./saved_models'):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)

    def train(self, pair='ETH/USDT', n_samples=100):
        """
        极简训练
        Args:
            pair: 交易对
            n_samples: 数据条数（默认100）
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"🚀 极简训练 {pair}")
        logger.info(f"📊 数据量: {n_samples}条")
        logger.info(f"⚡ 目标: 10秒完成")
        logger.info(f"{'='*60}\n")

        start_time = datetime.now()

        # 1. 加载极少数据
        logger.info(f"📥 加载最新{n_samples}条数据...")
        X, y = self._load_minimal_data(pair, n_samples)

        if len(X) < 50:
            logger.error(f"数据不足: {len(X)}条")
            return None

        logger.info(f"✅ 数据: {len(X)}样本 × {X.shape[1]}特征")

        # 2. 简单分割（80/20）
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )

        # 3. 极简LightGBM（只用20棵树）
        logger.info("🎯 训练中...")
        model = lgb.LGBMRegressor(
            n_estimators=20,  # 只用20棵树
            learning_rate=0.1,
            num_leaves=15,    # 减少叶子数
            max_depth=4,      # 浅树
            min_child_samples=5,
            random_state=42,
            n_jobs=-1,
            verbosity=-1
        )

        model.fit(X_train, y_train)

        # 4. 评估
        y_pred = model.predict(X_test)
        r2 = r2_score(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))

        logger.info(f"📊 R² Score: {r2:.3f}")
        logger.info(f"📊 RMSE: {rmse:.2f}")

        # 5. 保存
        self._save_model(pair, model, r2, rmse)

        # 计时
        total_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"\n✅ 完成！耗时: {total_time:.1f}秒")

        return {'r2': r2, 'rmse': rmse, 'time': total_time}

    def _load_minimal_data(self, pair, n_samples):
        """加载最少的数据"""
        conn = sqlite3.connect('aether_oracle.db')

        # 只获取最新的n_samples条数据
        query = """
        SELECT price, volume, timestamp
        FROM exchange_rates
        WHERE pair = ?
        ORDER BY timestamp DESC
        LIMIT ?
        """

        df = pd.read_sql_query(query, conn, params=(pair, n_samples))
        df = df.iloc[::-1].reset_index(drop=True)  # 反转顺序
        conn.close()

        if df.empty or len(df) < 50:
            return np.array([]), np.array([])

        # 极简特征（只用5个核心特征）
        features = pd.DataFrame()

        # 1. 价格
        features['price'] = df['price'].values

        # 2. 收益率
        features['returns'] = features['price'].pct_change().fillna(0)

        # 3. 简单移动平均
        features['sma_5'] = features['price'].rolling(5, min_periods=1).mean()
        features['price_to_sma'] = features['price'] / features['sma_5']

        # 4. 成交量
        features['volume'] = df['volume'].values
        features['volume_change'] = features['volume'].pct_change().fillna(0)

        # 5. 简单RSI
        delta = features['price'].diff()
        gain = delta.where(delta > 0, 0).rolling(7, min_periods=1).mean()
        loss = -delta.where(delta < 0, 0).rolling(7, min_periods=1).mean()
        features['rsi'] = 100 - (100 / (1 + gain / (loss + 1e-10)))

        # 填充缺失值
        features = features.fillna(0)

        # 准备数据（lookback=3，极简）
        lookback = 3
        X = []
        y = []

        for i in range(lookback, len(features) - 1):
            X.append(features.iloc[i-lookback:i].values.flatten())
            y.append(features.iloc[i + 1]['price'])

        return np.array(X), np.array(y)

    def _save_model(self, pair, model, r2, rmse):
        """保存模型"""
        pair_key = pair.replace('/', '_')

        # 保存模型
        model_path = os.path.join(self.model_dir, f'{pair_key}_lgb_model.txt')
        model.booster_.save_model(model_path)

        # 保存元数据
        metadata = {
            'pair': pair,
            'trained_at': datetime.now().isoformat(),
            'version': 'minimal_100',
            'performance': {'r2': float(r2), 'rmse': float(rmse)},
            'config': {
                'samples': 100,
                'features': 7,
                'lookback': 3,
                'trees': 20
            }
        }

        metadata_path = os.path.join(self.model_dir, f'{pair_key}_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"💾 模型已保存: {model_path}")


def main():
    parser = argparse.ArgumentParser(description='极简训练')
    parser.add_argument('--pair', type=str, default='ETH/USDT', help='交易对')
    parser.add_argument('--samples', type=int, default=100, help='数据条数')
    parser.add_argument('--all', action='store_true', help='训练所有币种')

    args = parser.parse_args()

    trainer = MinimalTrainer()

    if args.all:
        # 批量训练
        pairs = ['ETH/USDT', 'BTC/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT']
        total_time = 0

        for pair in pairs:
            logger.info(f"\n训练 {pair}...")
            try:
                result = trainer.train(pair, args.samples)
                if result:
                    total_time += result['time']
            except Exception as e:
                logger.error(f"❌ {pair} 失败: {e}")

        logger.info(f"\n✅ 全部完成！总耗时: {total_time:.1f}秒")
    else:
        # 单个训练
        trainer.train(args.pair, args.samples)


if __name__ == "__main__":
    main()