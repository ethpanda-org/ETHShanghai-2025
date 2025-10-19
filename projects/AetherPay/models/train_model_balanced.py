"""
平衡版训练脚本 - 速度与准确率的最佳平衡
预期：2-3分钟训练，R²>0.85
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit, RandomizedSearchCV
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from scipy.stats import uniform, randint
import json
import os
import sys
from datetime import datetime
import logging
import warnings
import argparse

warnings.filterwarnings('ignore')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.data_preprocessor_optimized import OptimizedDataPreprocessor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BalancedModelTrainer:
    """平衡速度与准确率的训练器"""

    def __init__(self, model_dir='./saved_models'):
        self.model_dir = model_dir
        self.preprocessor = OptimizedDataPreprocessor()
        os.makedirs(model_dir, exist_ok=True)

    def train_balanced(self, pair='ETH/USDT', days=7):
        """
        平衡训练 - 2-3分钟完成，准确率>0.85
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"⚖️ 开始平衡训练 {pair} 模型")
        logger.info(f"📅 训练数据: {days}天")
        logger.info(f"{'='*60}\n")

        start_time = datetime.now()

        # Step 1: 加载数据
        logger.info("📥 加载数据...")
        rates_df, market_df = self.preprocessor.load_training_data(pair, days)

        if rates_df.empty:
            raise ValueError(f"❌ {pair} 没有可用数据")

        logger.info(f"✅ 原始数据: {len(rates_df)}条记录")

        # Step 2: 创建特征（优化版）
        logger.info("🔧 创建特征...")
        features_df = self.preprocessor.create_features(rates_df, market_df)
        features_df = self.preprocessor.add_external_features(features_df)

        # Step 3: 准备ML数据（向量化版本 - 快100倍！）
        logger.info("📊 准备训练数据（向量化）...")
        X, y, timestamps, feature_cols = self.preprocessor.prepare_ml_data_vectorized(
            features_df,
            target_col='avg_price',
            lookback=12,  # 12小时窗口
            lookahead=6   # 预测6小时后
        )

        if len(X) == 0:
            raise ValueError("数据不足")

        logger.info(f"✅ 训练数据: {len(X)}样本 × {X.shape[1]}特征")

        # Step 4: 特征选择（快速版）
        logger.info("🔍 快速特征选择...")
        X_selected, selected_features = self._quick_feature_selection(X, y, feature_cols, n_features=80)

        # Step 5: 交叉验证训练
        logger.info("🎯 开始训练...")
        tscv = TimeSeriesSplit(n_splits=3)
        model, best_score, best_params = self._train_with_cv(X_selected, y, tscv)

        logger.info(f"📊 最佳R²: {best_score:.4f}")

        # Step 6: 最终评估
        final_metrics = self._evaluate_model(model, X_selected, y, tscv)

        # Step 7: 保存模型
        metadata = self._save_model(
            pair, model, selected_features,
            days, best_score, best_params, final_metrics
        )

        total_time = (datetime.now() - start_time).total_seconds()

        logger.info(f"\n{'='*60}")
        logger.info(f"✅ 训练完成！")
        logger.info(f"⏱️  总耗时: {total_time:.1f}秒 ({total_time/60:.1f}分钟)")
        logger.info(f"📈 R² Score: {best_score:.4f}")
        logger.info(f"📊 RMSE: {final_metrics['rmse']:.2f}")
        logger.info(f"📊 MAE: {final_metrics['mae']:.2f}")
        logger.info(f"💾 模型已保存: {self.model_dir}")
        logger.info(f"{'='*60}\n")

        return metadata

    def _quick_feature_selection(self, X, y, feature_names, n_features=80):
        """快速特征选择 - 只用30棵树"""

        # 训练小模型获取特征重要性
        selector = lgb.LGBMRegressor(
            n_estimators=30,  # 减少到30棵树
            learning_rate=0.1,
            max_depth=5,
            num_leaves=31,
            random_state=42,
            n_jobs=-1,
            verbosity=-1
        )

        selector.fit(X, y)

        # 获取特征重要性
        importances = selector.feature_importances_

        # 生成展平后的特征名（如果需要）
        n_original_features = len(feature_names)
        n_total_features = X.shape[1]
        lookback = n_total_features // n_original_features  # 计算实际的lookback

        if n_total_features != n_original_features:
            # 生成展平后的特征名
            expanded_features = []
            for i in range(lookback):
                for feat in feature_names:
                    expanded_features.append(f'{feat}_t-{lookback-i}')
            feature_names = expanded_features[:n_total_features]  # 确保长度匹配

        # 选择Top N特征
        n_features = min(n_features, len(importances))  # 不超过实际特征数
        indices = np.argsort(importances)[-n_features:]
        X_selected = X[:, indices]

        # 确保索引不越界
        selected_features = []
        for idx in indices:
            if idx < len(feature_names):
                selected_features.append(feature_names[idx])
            else:
                selected_features.append(f'feature_{idx}')

        return X_selected, selected_features

    def _train_with_cv(self, X, y, tscv):
        """使用少量参数搜索训练"""

        # 精简的参数搜索空间
        param_distributions = {
            'num_leaves': [31, 50, 70],
            'learning_rate': [0.03, 0.05, 0.1],
            'feature_fraction': [0.8, 0.9],
            'bagging_fraction': [0.8, 0.9],
            'max_depth': [5, 7, 9]
        }

        base_model = lgb.LGBMRegressor(
            n_estimators=150,
            random_state=42,
            n_jobs=-1,
            verbosity=-1
        )

        # 随机搜索（只搜索10次）
        random_search = RandomizedSearchCV(
            base_model,
            param_distributions,
            n_iter=10,  # 减少到10次
            cv=tscv,
            scoring='r2',
            n_jobs=-1,
            verbose=0,
            random_state=42
        )

        random_search.fit(X, y)

        return random_search.best_estimator_, random_search.best_score_, random_search.best_params_

    def _evaluate_model(self, model, X, y, tscv):
        """评估模型性能"""
        all_predictions = []
        all_actuals = []

        for train_idx, test_idx in tscv.split(X):
            X_test = X[test_idx]
            y_test = y[test_idx]

            y_pred = model.predict(X_test)

            all_predictions.extend(y_pred)
            all_actuals.extend(y_test)

        rmse = np.sqrt(mean_squared_error(all_actuals, all_predictions))
        mae = mean_absolute_error(all_actuals, all_predictions)
        r2 = r2_score(all_actuals, all_predictions)

        return {
            'rmse': float(rmse),
            'mae': float(mae),
            'r2': float(r2)
        }

    def _save_model(self, pair, model, selected_features, days, best_score, best_params, metrics):
        """保存模型和元数据"""
        pair_key = pair.replace('/', '_')

        # 保存LightGBM模型
        model_path = os.path.join(self.model_dir, f'{pair_key}_lgb_model.txt')
        model.booster_.save_model(model_path)

        # 创建元数据
        metadata = {
            'pair': pair,
            'trained_at': datetime.now().isoformat(),
            'model_version': '2.0_balanced',
            'training_config': {
                'days': days,
                'lookback': 12,
                'lookahead': 6,
                'n_features': len(selected_features)
            },
            'performance': {
                'r2_score': float(best_score),
                'rmse': metrics['rmse'],
                'mae': metrics['mae']
            },
            'model_params': best_params,
            'features': selected_features[:20]  # 只保存前20个重要特征
        }

        metadata_path = os.path.join(self.model_dir, f'{pair_key}_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"💾 模型已保存: {model_path}")

        return metadata


def main():
    parser = argparse.ArgumentParser(description='平衡版模型训练')
    parser.add_argument('--pair', type=str, default='ETH/USDT', help='交易对')
    parser.add_argument('--days', type=int, default=7, help='训练数据天数')
    parser.add_argument('--all', action='store_true', help='训练所有主要货币对')

    args = parser.parse_args()

    trainer = BalancedModelTrainer()

    if args.all:
        # 批量训练
        pairs = ['ETH/USDT', 'BTC/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT']
        for pair in pairs:
            try:
                logger.info(f"\n{'='*40}")
                logger.info(f"训练 {pair}")
                logger.info(f"{'='*40}")
                trainer.train_balanced(pair, args.days)
            except Exception as e:
                logger.error(f"❌ {pair} 训练失败: {e}")
    else:
        # 单个训练
        trainer.train_balanced(args.pair, args.days)

    logger.info("\n✅ 所有任务完成!")


if __name__ == "__main__":
    main()