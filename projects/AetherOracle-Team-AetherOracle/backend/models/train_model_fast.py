"""
⚡ AetherPay AI模型超快速训练脚本
优化重点：解决ETH/USDT训练缓慢问题
预期：2-3分钟完成训练（vs 之前可能20-30分钟）
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
import sqlite3
import json
import os
import sys
from datetime import datetime, timedelta
import logging
import warnings

warnings.filterwarnings('ignore')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FastModelTrainer:
    """超快速模型训练器 - 专注速度优化"""

    def __init__(self, model_dir='./saved_models'):
        self.model_dir = model_dir
        self.scaler = StandardScaler()
        os.makedirs(model_dir, exist_ok=True)

    def train_fast(self, pair='ETH/USDT'):
        """
        快速训练模型
        优化策略：
        1. 简化特征工程 - 只用最重要的特征
        2. 减少数据量 - 使用最近3天数据
        3. 固定参数 - 不做参数搜索
        4. 简单验证 - 只做train/test split
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"⚡ 开始超快速训练 {pair} 模型")
        logger.info(f"{'='*60}\n")

        start_time = datetime.now()

        # Step 1: 快速加载数据
        logger.info("📥 加载数据...")
        X, y = self._load_data_fast(pair)

        if len(X) == 0:
            logger.error(f"❌ 没有足够的数据训练 {pair}")
            return None

        logger.info(f"✅ 数据加载完成: {len(X)}样本 × {X.shape[1]}特征")

        # Step 2: 简单分割数据（80/20）
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False  # 时间序列不打乱
        )

        # Step 3: 快速训练（固定最优参数）
        logger.info("🎯 开始训练...")
        model = self._train_lgb_fast(X_train, y_train, X_test, y_test)

        # Step 4: 评估
        y_pred = model.predict(X_test)
        metrics = {
            'r2': r2_score(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'mae': mean_absolute_error(y_test, y_pred)
        }

        logger.info(f"📊 模型性能: R²={metrics['r2']:.4f}, RMSE={metrics['rmse']:.2f}")

        # Step 5: 保存模型
        self._save_model_fast(pair, model, metrics)

        # 计算总耗时
        total_time = (datetime.now() - start_time).total_seconds()

        logger.info(f"\n{'='*60}")
        logger.info(f"✅ 训练完成！")
        logger.info(f"⏱️  总耗时: {total_time:.1f}秒 ({total_time/60:.1f}分钟)")
        logger.info(f"📈 R² Score: {metrics['r2']:.4f}")
        logger.info(f"💾 模型已保存到: {self.model_dir}")
        logger.info(f"{'='*60}\n")

        return metrics

    def _load_data_fast(self, pair, days=3):
        """快速加载和处理数据 - 简化版"""
        conn = sqlite3.connect('aether-oracle/aether_oracle.db')

        # 只加载最近3天数据
        start_time = datetime.now() - timedelta(days=days)

        # 简单查询 - 只获取基本数据
        query = """
        SELECT
            price,
            volume,
            timestamp
        FROM exchange_rates
        WHERE pair = ?
        AND timestamp >= ?
        ORDER BY timestamp
        """

        df = pd.read_sql_query(query, conn, params=(pair, start_time.isoformat()))
        conn.close()

        if df.empty or len(df) < 100:
            logger.warning(f"数据不足: {len(df)}条")
            return np.array([]), np.array([])

        # 超简单特征工程
        features = self._create_simple_features(df)

        # 准备训练数据（简化版）
        X, y = self._prepare_data_fast(features)

        return X, y

    def _create_simple_features(self, df):
        """创建简单但有效的特征"""
        # 基础特征
        features = pd.DataFrame()
        features['price'] = df['price'].values
        features['volume'] = df['volume'].values

        # 价格变化
        features['returns'] = features['price'].pct_change()

        # 简单移动平均（只用3个）
        features['sma_5'] = features['price'].rolling(5, min_periods=1).mean()
        features['sma_10'] = features['price'].rolling(10, min_periods=1).mean()
        features['sma_20'] = features['price'].rolling(20, min_periods=1).mean()

        # 价格与均线的差
        features['price_sma5_diff'] = features['price'] - features['sma_5']
        features['price_sma10_diff'] = features['price'] - features['sma_10']

        # 成交量特征
        features['volume_sma'] = features['volume'].rolling(5, min_periods=1).mean()
        features['volume_ratio'] = features['volume'] / (features['volume_sma'] + 1e-10)

        # 简单波动率
        features['volatility'] = features['returns'].rolling(10, min_periods=1).std()

        # 滞后特征（只用3个）
        for lag in [1, 3, 6]:
            features[f'price_lag_{lag}'] = features['price'].shift(lag)
            features[f'returns_lag_{lag}'] = features['returns'].shift(lag)

        # 时间特征
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        features['hour'] = df['timestamp'].dt.hour
        features['day_of_week'] = df['timestamp'].dt.dayofweek

        # 填充缺失值
        features = features.fillna(method='ffill').fillna(0)

        return features

    def _prepare_data_fast(self, features, lookback=6, lookahead=6):
        """快速准备数据 - 避免循环"""
        if len(features) < lookback + lookahead + 10:
            return np.array([]), np.array([])

        # 方法1：使用向量化操作代替循环
        n_samples = len(features) - lookback - lookahead
        n_features = len(features.columns)

        # 预分配数组
        X = np.zeros((n_samples, lookback * n_features))
        y = np.zeros(n_samples)

        # 向量化创建特征（更快）
        feature_array = features.values
        for i in range(n_samples):
            X[i] = feature_array[i:i+lookback].flatten()
            y[i] = feature_array[i+lookback+lookahead, 0]  # 预测未来价格

        # 移除包含NaN的样本
        valid_mask = ~(np.isnan(X).any(axis=1) | np.isnan(y))
        X = X[valid_mask]
        y = y[valid_mask]

        # 标准化特征
        if len(X) > 0:
            X = self.scaler.fit_transform(X)

        return X, y

    def _train_lgb_fast(self, X_train, y_train, X_valid, y_valid):
        """使用固定的优化参数快速训练"""
        # 经验最优参数（不做搜索）
        params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'n_jobs': -1
        }

        # 创建数据集
        train_data = lgb.Dataset(X_train, label=y_train)
        valid_data = lgb.Dataset(X_valid, label=y_valid, reference=train_data)

        # 训练模型（只用100棵树，快速）
        model = lgb.train(
            params,
            train_data,
            num_boost_round=100,  # 减少树的数量
            valid_sets=[valid_data],
            callbacks=[lgb.early_stopping(10), lgb.log_evaluation(0)]
        )

        return model

    def _save_model_fast(self, pair, model, metrics):
        """快速保存模型"""
        pair_key = pair.replace('/', '_')

        # 保存模型
        model_path = os.path.join(self.model_dir, f'{pair_key}_lgb_model.txt')
        model.save_model(model_path)

        # 保存元数据
        metadata = {
            'pair': pair,
            'trained_at': datetime.now().isoformat(),
            'model_version': 'fast_1.0',
            'performance': metrics,
            'training_mode': 'fast',
            'training_time_seconds': (datetime.now() - datetime.now()).total_seconds()
        }

        metadata_path = os.path.join(self.model_dir, f'{pair_key}_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"💾 模型已保存: {model_path}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='超快速模型训练')
    parser.add_argument('--pair', type=str, default='ETH/USDT', help='交易对')
    parser.add_argument('--batch', action='store_true', help='批量训练所有主要货币对')

    args = parser.parse_args()

    trainer = FastModelTrainer()

    if args.batch:
        # 批量训练主要货币对
        pairs = ['ETH/USDT', 'BTC/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT']
        for pair in pairs:
            logger.info(f"\n{'='*40}")
            logger.info(f"训练 {pair}")
            logger.info(f"{'='*40}")
            try:
                trainer.train_fast(pair)
            except Exception as e:
                logger.error(f"❌ {pair} 训练失败: {e}")
    else:
        # 单个训练
        trainer.train_fast(args.pair)

    logger.info("\n✅ 所有任务完成!")


if __name__ == "__main__":
    main()