"""
1天数据优化训练脚本 - 平衡速度和准确率
使用1天数据，但通过更好的特征工程提升准确率
预期：30秒-1分钟完成，R²>0.5
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import sqlite3
import json
import os
from datetime import datetime, timedelta
import logging
import warnings
import argparse

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

class OneDayTrainer:
    """1天数据优化训练器"""

    def __init__(self, model_dir='./saved_models'):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)

    def train(self, pair='ETH/USDT'):
        """使用1天数据训练，但优化特征和参数"""

        logger.info(f"\n{'='*60}")
        logger.info(f"📊 {pair} - 1天数据优化训练")
        logger.info(f"⚡ 目标: 30秒完成, R²>0.5")
        logger.info(f"{'='*60}\n")

        start_time = datetime.now()

        # 1. 加载1天数据（但使用所有记录）
        logger.info("📥 加载最近1天数据...")
        X, y = self._load_one_day_data(pair)

        if len(X) < 100:
            logger.error(f"数据不足: {len(X)}条")
            return None

        logger.info(f"✅ 数据: {len(X)}样本 × {X.shape[1]}特征")

        # 2. 时序分割（80/20）
        split_idx = int(len(X) * 0.8)
        X_train = X[:split_idx]
        y_train = y[:split_idx]
        X_test = X[split_idx:]
        y_test = y[split_idx:]

        logger.info(f"📊 训练集: {len(X_train)}样本, 测试集: {len(X_test)}样本")

        # 3. 优化的LightGBM参数
        logger.info("🚀 开始训练...")
        model = lgb.LGBMRegressor(
            n_estimators=100,      # 100棵树（平衡）
            learning_rate=0.05,
            num_leaves=31,
            max_depth=6,
            min_child_samples=20,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=0.1,
            random_state=42,
            n_jobs=-1,
            verbosity=-1
        )

        # 训练
        model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            callbacks=[lgb.early_stopping(10), lgb.log_evaluation(0)]
        )

        # 4. 评估
        y_pred_train = model.predict(X_train)
        y_pred_test = model.predict(X_test)

        train_r2 = r2_score(y_train, y_pred_train)
        test_r2 = r2_score(y_test, y_pred_test)
        test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
        test_mae = mean_absolute_error(y_test, y_pred_test)

        # 计算MAPE
        test_mape = np.mean(np.abs((y_test - y_pred_test) / y_test)) * 100

        logger.info(f"📈 训练R²: {train_r2:.3f}")
        logger.info(f"📊 测试R²: {test_r2:.3f}")
        logger.info(f"📊 RMSE: {test_rmse:.2f}")
        logger.info(f"📊 MAE: {test_mae:.2f}")
        logger.info(f"📊 MAPE: {test_mape:.2f}%")

        # 5. 保存
        self._save_model(pair, model, test_r2, test_rmse, test_mae, test_mape)

        # 计时
        total_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"\n✅ 训练完成！耗时: {total_time:.1f}秒")
        logger.info(f"💾 模型已保存: {self.model_dir}")

        # 效果评价
        if test_r2 > 0.7:
            logger.info(f"🎉 效果优秀！R²={test_r2:.3f} > 0.7")
        elif test_r2 > 0.5:
            logger.info(f"✅ 效果良好！R²={test_r2:.3f} > 0.5")
        elif test_r2 > 0.3:
            logger.info(f"⚠️ 效果一般，R²={test_r2:.3f}")
        else:
            logger.info(f"❌ 效果较差，R²={test_r2:.3f}")

        return {
            'r2': test_r2,
            'rmse': test_rmse,
            'mae': test_mae,
            'mape': test_mape,
            'time': total_time
        }

    def _load_one_day_data(self, pair):
        """加载并处理1天的数据"""
        conn = sqlite3.connect('aether_oracle.db')

        # 获取最近24小时的所有数据
        query = """
        SELECT
            price,
            volume,
            timestamp
        FROM exchange_rates
        WHERE pair = ?
        AND timestamp >= datetime('now', '-1 day')
        ORDER BY timestamp
        """

        df = pd.read_sql_query(query, conn, params=(pair,))
        conn.close()

        if df.empty:
            # 如果没有最近24小时的数据，获取最新的1000条
            conn = sqlite3.connect('aether_oracle.db')
            query = """
            SELECT price, volume, timestamp
            FROM exchange_rates
            WHERE pair = ?
            ORDER BY timestamp DESC
            LIMIT 1000
            """
            df = pd.read_sql_query(query, conn, params=(pair,))
            df = df.iloc[::-1].reset_index(drop=True)  # 反转顺序
            conn.close()

        if df.empty or len(df) < 100:
            return np.array([]), np.array([])

        # 创建优化的特征集
        features = self._create_optimized_features(df)

        # 准备训练数据
        lookback = 10  # 使用10个历史点
        X, y = self._prepare_sequences(features, lookback)

        return X, y

    def _create_optimized_features(self, df):
        """创建优化的特征集 - 20个关键特征"""
        features = pd.DataFrame()

        # 基础价格和成交量
        features['price'] = df['price'].values
        features['volume'] = df['volume'].values
        features['log_price'] = np.log(features['price'])
        features['log_volume'] = np.log(features['volume'] + 1)

        # 收益率特征（关键）
        features['returns'] = features['price'].pct_change()
        features['returns_2'] = features['price'].pct_change(2)
        features['returns_5'] = features['price'].pct_change(5)
        features['log_returns'] = features['log_price'].diff()

        # 移动平均（不同周期）
        for window in [5, 10, 20, 30]:
            features[f'sma_{window}'] = features['price'].rolling(window, min_periods=1).mean()
            features[f'price_to_sma_{window}'] = features['price'] / features[f'sma_{window}']

        # 指数移动平均
        features['ema_10'] = features['price'].ewm(span=10, adjust=False).mean()
        features['price_to_ema'] = features['price'] / features['ema_10']

        # 波动率（重要）
        features['volatility_5'] = features['returns'].rolling(5, min_periods=1).std()
        features['volatility_10'] = features['returns'].rolling(10, min_periods=1).std()
        features['volatility_ratio'] = features['volatility_5'] / (features['volatility_10'] + 1e-10)

        # 成交量特征
        features['volume_sma_10'] = features['volume'].rolling(10, min_periods=1).mean()
        features['volume_ratio'] = features['volume'] / (features['volume_sma_10'] + 1e-10)
        features['volume_change'] = features['volume'].pct_change()

        # RSI（相对强弱指标）
        delta = features['price'].diff()
        gain = delta.where(delta > 0, 0).rolling(14, min_periods=1).mean()
        loss = -delta.where(delta < 0, 0).rolling(14, min_periods=1).mean()
        rs = gain / (loss + 1e-10)
        features['rsi'] = 100 - (100 / (1 + rs))

        # MACD指标
        ema_12 = features['price'].ewm(span=12, adjust=False).mean()
        ema_26 = features['price'].ewm(span=26, adjust=False).mean()
        features['macd'] = ema_12 - ema_26
        features['macd_signal'] = features['macd'].ewm(span=9, adjust=False).mean()
        features['macd_diff'] = features['macd'] - features['macd_signal']

        # 布林带
        bb_period = 20
        bb_std = features['price'].rolling(bb_period, min_periods=1).std()
        bb_mean = features['price'].rolling(bb_period, min_periods=1).mean()
        features['bb_upper'] = bb_mean + (bb_std * 2)
        features['bb_lower'] = bb_mean - (bb_std * 2)
        features['bb_position'] = (features['price'] - features['bb_lower']) / (features['bb_upper'] - features['bb_lower'] + 1e-10)

        # 价格位置特征
        features['price_position'] = (features['price'] - features['price'].rolling(50, min_periods=1).min()) / \
                                     (features['price'].rolling(50, min_periods=1).max() -
                                      features['price'].rolling(50, min_periods=1).min() + 1e-10)

        # 填充缺失值
        features = features.fillna(method='ffill').fillna(0)

        return features

    def _prepare_sequences(self, features, lookback=10):
        """准备序列数据"""
        X = []
        y = []

        for i in range(lookback, len(features) - 1):
            X.append(features.iloc[i-lookback:i].values.flatten())
            y.append(features.iloc[i + 1]['price'])

        return np.array(X), np.array(y)

    def _save_model(self, pair, model, r2, rmse, mae, mape):
        """保存模型和元数据"""
        pair_key = pair.replace('/', '_')

        # 保存模型
        model_path = os.path.join(self.model_dir, f'{pair_key}_lgb_model.txt')
        model.booster_.save_model(model_path)

        # 保存元数据
        metadata = {
            'pair': pair,
            'trained_at': datetime.now().isoformat(),
            'version': 'one_day_optimized_v1',
            'performance': {
                'r2': float(r2),
                'rmse': float(rmse),
                'mae': float(mae),
                'mape': float(mape)
            },
            'training_config': {
                'data': '1_day',
                'features': 30,
                'lookback': 10,
                'model': 'LightGBM',
                'n_estimators': 100
            }
        }

        metadata_path = os.path.join(self.model_dir, f'{pair_key}_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"💾 模型已保存: {model_path}")


def main():
    parser = argparse.ArgumentParser(description='1天数据优化训练')
    parser.add_argument('--pair', type=str, default='ETH/USDT', help='交易对')
    parser.add_argument('--all', action='store_true', help='训练所有主要币种')

    args = parser.parse_args()

    trainer = OneDayTrainer()

    if args.all:
        # 批量训练
        pairs = ['ETH/USDT', 'BTC/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT']
        results = []

        for pair in pairs:
            logger.info(f"\n{'='*40}")
            logger.info(f"训练 {pair}")
            logger.info(f"{'='*40}")
            try:
                result = trainer.train(pair)
                if result:
                    results.append({'pair': pair, **result})
            except Exception as e:
                logger.error(f"❌ {pair} 失败: {e}")

        # 打印总结
        if results:
            logger.info(f"\n{'='*60}")
            logger.info("📊 训练结果汇总")
            logger.info(f"{'='*60}")
            for r in results:
                logger.info(f"{r['pair']}: R²={r['r2']:.3f}, 耗时={r['time']:.1f}秒")
    else:
        # 单个训练
        trainer.train(args.pair)


if __name__ == "__main__":
    main()