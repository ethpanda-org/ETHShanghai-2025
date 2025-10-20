"""
超级快速训练脚本 - 30秒完成
只用最少的数据和特征，但保持合理的准确率
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import sqlite3
import json
import os
from datetime import datetime, timedelta
import logging
import warnings

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

class SuperFastTrainer:
    """极速训练器 - 30秒完成"""

    def __init__(self, model_dir='./saved_models'):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)

    def train_super_fast(self, pair='ETH/USDT'):
        """超快速训练 - 极简但有效"""

        logger.info(f"\n{'='*60}")
        logger.info(f"⚡ 极速训练 {pair} - 目标30秒完成")
        logger.info(f"{'='*60}\n")

        start_time = datetime.now()

        # 1. 只加载最近1天的数据（减少数据量）
        logger.info("📥 加载最少必要数据...")
        X, y = self._load_minimal_data(pair, hours=24)  # 只用24小时数据

        if len(X) < 100:
            logger.error(f"数据不足: {len(X)}条")
            return None

        logger.info(f"✅ 数据: {len(X)}样本 × {X.shape[1]}特征")

        # 2. 简单分割
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )

        # 3. 直接训练（不做参数搜索）
        logger.info("🚀 快速训练...")
        model = lgb.LGBMRegressor(
            n_estimators=50,  # 只用50棵树
            learning_rate=0.1,
            num_leaves=31,
            max_depth=5,
            random_state=42,
            n_jobs=-1,
            verbosity=-1
        )

        model.fit(X_train, y_train,
                 eval_set=[(X_test, y_test)],
                 callbacks=[lgb.early_stopping(5), lgb.log_evaluation(0)])

        # 4. 快速评估
        y_pred = model.predict(X_test)
        r2 = r2_score(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))

        logger.info(f"📊 性能: R²={r2:.3f}, RMSE={rmse:.1f}")

        # 5. 保存
        self._save_fast_model(pair, model, r2, rmse)

        # 计时
        total_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"\n✅ 完成！耗时: {total_time:.1f}秒")
        logger.info(f"💾 模型已保存: {self.model_dir}")

        return {'r2': r2, 'rmse': rmse, 'time': total_time}

    def _load_minimal_data(self, pair, hours=24):
        """加载最少的数据"""
        conn = sqlite3.connect('aether_oracle.db')

        # 只获取最近N小时的数据
        query = """
        WITH recent_data AS (
            SELECT
                price,
                volume,
                timestamp,
                ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
            FROM exchange_rates
            WHERE pair = ?
            ORDER BY timestamp DESC
            LIMIT ?
        )
        SELECT * FROM recent_data ORDER BY timestamp
        """

        # 每30秒一条数据，24小时约2880条，我们只取500条
        df = pd.read_sql_query(query, conn, params=(pair, 500))
        conn.close()

        if df.empty or len(df) < 100:
            return np.array([]), np.array([])

        # 超简单特征（只用10个最重要的）
        features = pd.DataFrame()

        # 基础特征
        features['price'] = df['price'].values
        features['volume'] = df['volume'].values
        features['returns'] = features['price'].pct_change().fillna(0)

        # 简单移动平均
        features['sma_5'] = features['price'].rolling(5, min_periods=1).mean()
        features['sma_10'] = features['price'].rolling(10, min_periods=1).mean()
        features['price_to_sma5'] = features['price'] / features['sma_5']

        # 简单波动率
        features['volatility'] = features['returns'].rolling(5, min_periods=1).std()

        # 成交量特征
        features['volume_sma'] = features['volume'].rolling(5, min_periods=1).mean()
        features['volume_ratio'] = features['volume'] / (features['volume_sma'] + 1e-10)

        # RSI（超简化版）
        delta = features['price'].diff()
        gain = delta.where(delta > 0, 0).rolling(7, min_periods=1).mean()
        loss = -delta.where(delta < 0, 0).rolling(7, min_periods=1).mean()
        features['rsi'] = 100 - (100 / (1 + gain / (loss + 1e-10)))

        # 填充缺失值
        features = features.fillna(0)

        # 准备训练数据（简单滑窗）
        lookback = 5  # 只看过去5个时间点
        X = []
        y = []

        for i in range(lookback, len(features) - 1):
            X.append(features.iloc[i-lookback:i].values.flatten())
            y.append(features.iloc[i + 1]['price'])  # 预测下一个价格

        return np.array(X), np.array(y)

    def _save_fast_model(self, pair, model, r2, rmse):
        """快速保存模型"""
        pair_key = pair.replace('/', '_')

        # 保存模型
        model_path = os.path.join(self.model_dir, f'{pair_key}_lgb_model.txt')
        model.booster_.save_model(model_path)  # 使用booster_

        # 保存简单元数据
        metadata = {
            'pair': pair,
            'trained_at': datetime.now().isoformat(),
            'version': 'super_fast_1.0',
            'performance': {
                'r2': float(r2),
                'rmse': float(rmse)
            },
            'training_config': {
                'data_points': 500,
                'features': 10,
                'lookback': 5
            }
        }

        metadata_path = os.path.join(self.model_dir, f'{pair_key}_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"💾 模型已保存: {model_path}")

def main():
    import argparse

    parser = argparse.ArgumentParser(description='超级快速训练')
    parser.add_argument('--pair', type=str, default='ETH/USDT')
    parser.add_argument('--all', action='store_true', help='训练所有主要币种')

    args = parser.parse_args()

    trainer = SuperFastTrainer()

    if args.all:
        pairs = ['ETH/USDT', 'BTC/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT']
        total_time = 0

        for pair in pairs:
            logger.info(f"\n训练 {pair}...")
            try:
                result = trainer.train_super_fast(pair)
                if result:
                    total_time += result['time']
            except Exception as e:
                logger.error(f"❌ {pair} 失败: {e}")

        logger.info(f"\n✅ 全部完成！总耗时: {total_time:.1f}秒")
    else:
        trainer.train_super_fast(args.pair)

if __name__ == "__main__":
    main()