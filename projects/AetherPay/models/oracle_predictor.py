#!/usr/bin/env python3
"""
Oracle AI Predictor - Fixed Version
修复了路径和特征维度问题
"""

import sys
import json
import os
import numpy as np
import lightgbm as lgb
from datetime import datetime, timedelta
import sqlite3
import pandas as pd

class OraclePredictor:
    def __init__(self, model_dir=None):
        """Initialize with correct model directory"""
        if model_dir is None:
            # 使用脚本所在目录的相对路径
            script_dir = os.path.dirname(os.path.abspath(__file__))
            self.model_dir = os.path.join(script_dir, '../saved_models')
        else:
            self.model_dir = model_dir

        self.models = {}
        self.metadata = {}
        self.load_models()

        # 数据库路径也需要修正
        script_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_path = os.path.join(script_dir, '../aether_oracle.db')

    def load_models(self):
        """Load all available models"""
        if not os.path.exists(self.model_dir):
            print(f"Model directory not found: {self.model_dir}", file=sys.stderr)
            return

        for file in os.listdir(self.model_dir):
            if file.endswith('_lgb_model.txt'):
                pair = file.replace('_lgb_model.txt', '').replace('_', '/')
                model_path = os.path.join(self.model_dir, file)
                metadata_path = os.path.join(self.model_dir, file.replace('_lgb_model.txt', '_metadata.json'))

                try:
                    # Load model
                    model = lgb.Booster(model_file=model_path)

                    # Load metadata
                    metadata = {}
                    if os.path.exists(metadata_path):
                        with open(metadata_path, 'r') as f:
                            metadata = json.load(f)

                    self.models[pair] = {
                        'model': model,
                        'metadata': metadata
                    }

                except Exception as e:
                    print(f"Error loading model for {pair}: {e}", file=sys.stderr)

    def create_features(self, df, lookback=5, feature_count=10):
        """Create features matching the training configuration"""
        features = []

        # Basic features for the latest row
        if len(df) > 0:
            latest = df.iloc[-1]
            features.extend([
                latest['price'],
                latest['volume'] if 'volume' in df.columns else 0,
                latest['price'] * 0.999,  # Simulated bid (0.1% spread)
                latest['price'] * 1.001,  # Simulated ask (0.1% spread)
                latest['price'] * 0.002   # Simulated spread
            ])

        # Rolling statistics (if we have enough data)
        if len(df) >= lookback:
            prices = df['price'].tail(lookback)
            features.append(prices.mean())
            features.append(prices.std() if len(prices) > 1 else 0)
            features.append(prices.min())
            features.append(prices.max())
            features.append(prices.iloc[-1] - prices.iloc[0])  # Price change
        else:
            # Pad with zeros if not enough data
            features.extend([0] * 5)

        # Ensure we have exactly feature_count features
        while len(features) < feature_count:
            features.append(0)

        # Create lookback features by repeating the pattern
        full_features = []
        for i in range(lookback):
            if i < len(df):
                # Use actual historical data
                full_features.extend(features)
            else:
                # Pad with zeros
                full_features.extend([0] * feature_count)

        return np.array(full_features)

    def predict(self, pair, confidence_threshold=0.95):
        """Make prediction for a currency pair"""

        # 🆕 Wrapped token mapping: WETH -> ETH, WBTC -> BTC
        # 因为AI模型使用的是 ETH/USDT 和 BTC/USDT，而不是 WETH/USDT 和 WBTC/USDT
        original_pair = pair
        pair = pair.replace('WETH', 'ETH').replace('WBTC', 'BTC')

        # 如果是稳定币对，返回1:1汇率
        stable_pairs = ['USDC/USDT', 'USDT/USDC', 'DAI/USDT', 'USDT/DAI', 'USDC/DAI', 'DAI/USDC']
        if pair in stable_pairs:
            return {
                'pair': pair,
                'predicted_price': 1.0,
                'current_price': 1.0,
                'price_change': 0,
                'confidence': 1.0,
                'prediction_horizon': '30s',
                'timestamp': datetime.now().isoformat(),
                'meets_threshold': True,
                'optimal_settlement_path': {
                    'name': 'Curve Finance',
                    'protocol': 'Curve',
                    'estimated_cost_pct': 0.04,
                    'settlement_time_seconds': 18,
                    'reliability': 0.99,
                    'risk_level': 'low',
                    'reason': 'Best for stablecoin swaps with minimal slippage',
                    'alternative_paths': ['FXPool Direct', 'Uniswap V3']
                }
            }

        if pair not in self.models:
            print(f"No model found for {pair}", file=sys.stderr)
            return {
                'error': 'prediction_unavailable',
                'pair': original_pair,  # 🆕 返回原始交易对名称
                'message': 'No AI model available for this trading pair'
            }

        model_info = self.models[pair]
        model = model_info['model']
        metadata = model_info['metadata']

        try:
            # Get training configuration from metadata
            training_config = metadata.get('training_config', {})
            feature_count = training_config.get('features', 10)
            lookback_used = training_config.get('lookback', 5)

            # Get recent data from database
            conn = sqlite3.connect(self.db_path)
            query = """
            SELECT price, volume, timestamp
            FROM exchange_rates
            WHERE pair = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """

            df = pd.read_sql_query(query, conn, params=(pair, lookback_used * 2))
            conn.close()

            if df.empty:
                return {
                    'error': 'no_data',
                    'pair': pair,
                    'message': 'No historical data available'
                }

            # Reverse to get chronological order
            df = df.iloc[::-1]

            # Create features matching training configuration
            features = self.create_features(df, lookback_used, feature_count)

            # Ensure correct shape
            expected_features = feature_count * lookback_used
            if len(features) != expected_features:
                # Resize if needed
                if len(features) < expected_features:
                    features = np.pad(features, (0, expected_features - len(features)), 'constant')
                else:
                    features = features[:expected_features]

            features = features.reshape(1, -1)

            # Make prediction
            prediction = model.predict(features)[0]
            current_price = df['price'].iloc[-1] if not df.empty else prediction

            # ✅ 修复：从实时价格API获取置信度
            try:
                import requests
                realtime_response = requests.get(
                    f'http://localhost:3001/realtime?pair={pair}',
                    timeout=2
                )
                if realtime_response.status_code == 200:
                    realtime_data = realtime_response.json()
                    confidence = realtime_data.get('confidence', 0.7)
                    # 如果有实时价格，使用实时价格作为当前价格
                    if 'aggregated_price' in realtime_data and realtime_data['aggregated_price'] > 0:
                        current_price = realtime_data['aggregated_price']
                else:
                    # 降级到原来的计算方式
                    price_std = df['price'].std() if len(df) > 1 else 0
                    confidence = max(0.7, min(1.0, 1.0 - (price_std / current_price) if current_price > 0 else 0.7))
            except Exception as e:
                # 如果API调用失败，使用更合理的默认值
                print(f"Failed to fetch realtime confidence: {e}", file=sys.stderr)
                price_std = df['price'].std() if len(df) > 1 else 0
                confidence = max(0.7, min(1.0, 1.0 - (price_std / current_price) if current_price > 0 else 0.7))

            # Determine optimal settlement path based on pair and amount
            settlement_path = self.get_optimal_settlement_path(pair, prediction, confidence)

            result = {
                'pair': original_pair,  # 🆕 返回原始交易对名称（WETH/WBTC）而不是映射后的（ETH/BTC）
                'predicted_price': float(prediction),
                'current_price': float(current_price),
                'price_change': float(prediction - current_price),
                'confidence': float(confidence),
                'prediction_horizon': '30s',
                'timestamp': datetime.now().isoformat(),
                'meets_threshold': bool(confidence >= confidence_threshold),
                'optimal_settlement_path': settlement_path
            }

            return result

        except Exception as e:
            print(f"Prediction error for {pair}: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return {
                'error': 'prediction_failed',
                'pair': pair,
                'message': str(e)
            }

    def get_optimal_settlement_path(self, pair, predicted_price, confidence):
        """Determine optimal settlement path based on trading pair and prediction"""

        # 高流动性交易对
        high_liquidity_pairs = ['BTC/USDT', 'ETH/USDT', 'BTC/ETH']

        if pair in high_liquidity_pairs:
            if confidence > 0.9:
                return {
                    'name': 'Uniswap V3 Concentrated',
                    'protocol': 'Uniswap V3',
                    'estimated_cost_pct': 0.05,
                    'settlement_time_seconds': 12,
                    'reliability': 0.98,
                    'risk_level': 'low',
                    'reason': 'High liquidity pair with concentrated liquidity',
                    'alternative_paths': ['FXPool', 'SushiSwap']
                }
            else:
                return {
                    'name': 'FXPool Aggregated',
                    'protocol': 'FXPool',
                    'estimated_cost_pct': 0.06,
                    'settlement_time_seconds': 15,
                    'reliability': 0.95,
                    'risk_level': 'medium',
                    'reason': 'Aggregated liquidity for better execution',
                    'alternative_paths': ['1inch Router', 'Paraswap']
                }
        else:
            # 低流动性或异国对
            return {
                'name': 'Smart Order Router',
                'protocol': 'Multi-DEX',
                'estimated_cost_pct': 0.08,
                'settlement_time_seconds': 25,
                'reliability': 0.92,
                'risk_level': 'medium',
                'reason': 'Split order across multiple DEXs for best price',
                'alternative_paths': ['Direct FXPool', 'OTC Desk']
            }

    def get_health(self, pair):
        """Get model health status"""
        if pair not in self.models:
            return {
                'pair': pair,
                'status': 'not_found',
                'message': 'Model not available'
            }

        metadata = self.models[pair]['metadata']

        # Check model age
        trained_at = metadata.get('trained_at', '')
        if trained_at:
            age_hours = (datetime.now() - datetime.fromisoformat(trained_at)).total_seconds() / 3600
        else:
            age_hours = 999

        health_status = 'healthy' if age_hours < 24 else 'stale' if age_hours < 72 else 'outdated'

        return {
            'pair': pair,
            'status': health_status,
            'model_age_hours': age_hours,
            'performance': metadata.get('performance', {}),
            'training_config': metadata.get('training_config', {}),
            'last_trained': trained_at
        }

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Missing pair argument'}))
        sys.exit(1)

    if sys.argv[1] == 'health':
        # Health check mode
        pair = sys.argv[2] if len(sys.argv) > 2 else 'BTC/USDT'
        predictor = OraclePredictor()
        result = predictor.get_health(pair)
        print(json.dumps(result))
    else:
        # Prediction mode
        pair = sys.argv[1]
        confidence_threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.95

        predictor = OraclePredictor()
        result = predictor.predict(pair, confidence_threshold)

        print(json.dumps(result))

if __name__ == '__main__':
    main()