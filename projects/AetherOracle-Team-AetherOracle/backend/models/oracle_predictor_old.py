import numpy as np
import onnxruntime as ort
import json
import logging
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.data_preprocessor_robust import RobustDataPreprocessor

class OraclePredictor:
    def __init__(self, model_dir='./saved_models'):
        self.model_dir = model_dir
        self.models = {}  # Store multiple pair models
        self.preprocessor = RobustDataPreprocessor()
        
        self.logger = logging.getLogger(__name__)

    def load_model(self, pair):
        pair_key = pair.replace('/', '_')
        
        if pair_key in self.models:
            return True
        
        try:
            # 尝试加载LightGBM模型（更简单可靠）
            lgb_path = os.path.join(self.model_dir, f'{pair_key}_lgb_model.txt')
            if os.path.exists(lgb_path):
                import lightgbm as lgb
                model = lgb.Booster(model_file=lgb_path)
                
                # Load metadata
                metadata_path = os.path.join(self.model_dir, f'{pair_key}_metadata.json')
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                
                self.models[pair_key] = {
                    'model': model,
                    'metadata': metadata,
                    'loaded_at': datetime.now(),
                    'type': 'lightgbm'
                }
                
                self.logger.info(f"LightGBM model loaded for {pair}")
                return True
            
            # 回退到ONNX模型
            onnx_path = os.path.join(self.model_dir, f'{pair_key}_model.onnx')
            if os.path.exists(onnx_path):
                session = ort.InferenceSession(onnx_path)
                
                # Load metadata
                metadata_path = os.path.join(self.model_dir, f'{pair_key}_metadata.json')
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                
                self.models[pair_key] = {
                    'session': session,
                    'metadata': metadata,
                    'loaded_at': datetime.now(),
                    'type': 'onnx'
                }
                
                self.logger.info(f"ONNX model loaded for {pair}")
                return True
            
            self.logger.error(f"No model found for {pair}")
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to load model for {pair}: {str(e)}")
            return False

    def predict_rate(self, pair, confidence_threshold=0.95):
        pair_key = pair.replace('/', '_')

        if pair_key not in self.models:
            if not self.load_model(pair):
                return None

        # Get model info early
        model_info = self.models[pair_key]

        try:
            # Get recent data - optimized: only need 2 days for 12h lookback
            # (vs previous 3 days for 24h lookback)
            rates_df, market_df = self.preprocessor.load_training_data(pair, days=2)

            if rates_df.empty:
                self.logger.warning(f"No recent data available for {pair}")
                return None

            # Prepare features
            features_df = self.preprocessor.create_features(rates_df, market_df)
            features_df = self.preprocessor.add_external_features(features_df)

            # Check minimum data requirement (reduced from 24h to 12h)
            min_hours = 12
            if len(features_df) < min_hours:
                self.logger.warning(f"Insufficient data for prediction: {len(features_df)} hours, need {min_hours}")
                return None

            # Prepare features for model - AUTO-DETECT lookback from metadata
            # Read lookback from metadata if available, else use default 12h
            lookback = model_info['metadata'].get('optimization_strategy', {}).get('lookback_hours', 12)

            features, _, _, feature_cols = self.preprocessor.prepare_ml_data(
                features_df,
                target_col='avg_price',
                lookback=lookback,  # Auto-detect from metadata
                lookahead=6
            )
            
            if len(features) == 0:
                self.logger.warning("No features generated")
                return None

            # Use the last sample
            latest_features = features[-1].reshape(1, -1).astype(np.float32)

            # 🔥 动态适配特征数（从元数据读取）
            # 优化后的模型：可能是50-100个特征 × 6-12h lookback
            if 'optimization_strategy' in model_info['metadata']:
                # New optimized model format
                feature_count = model_info['metadata']['features']['count']
                lookback_used = model_info['metadata']['optimization_strategy']['lookback_hours']
                expected_total_features = feature_count * lookback_used

                self.logger.info(f"Optimized model: {feature_count} features × {lookback_used}h = {expected_total_features} dims")
            else:
                # Old model format (fallback)
                expected_feature_count = model_info['metadata'].get('feature_count', 38)
                expected_total_features = expected_feature_count * 24  # old lookback=24

            if latest_features.shape[1] != expected_total_features:
                self.logger.error(
                    f"Feature count mismatch: got {latest_features.shape[1]}, "
                    f"expected {expected_total_features}"
                )
                return None

            # Predict using the loaded model
            if model_info['type'] == 'lightgbm':
                # Use LightGBM prediction
                prediction = model_info['model'].predict(latest_features)[0]
            else:
                # Use ONNX prediction
                session = model_info['session']
                input_name = session.get_inputs()[0].name
                prediction = session.run(None, {input_name: latest_features})[0][0]
            
            # Calculate confidence based on recent model performance
            confidence = self.calculate_confidence(pair, features_df)
            
            # Get current price for comparison
            current_price = rates_df['price'].iloc[-1]
            
            result = {
                'pair': pair,
                'predicted_price': float(prediction),
                'current_price': float(current_price),
                'price_change': float((prediction - current_price) / current_price * 100),
                'confidence': float(confidence),
                'prediction_horizon': '6h',
                'timestamp': datetime.now().isoformat(),
                'meets_threshold': bool(confidence >= confidence_threshold)
            }
            
            return result
            
        except Exception as e:
            self.logger.error(f"Prediction failed for {pair}: {str(e)}")
            return None

    def calculate_confidence(self, pair, features_df):
        # Simple confidence calculation based on data quality and volatility
        
        # Data freshness factor
        latest_timestamp = features_df.index[-1]
        age_hours = (datetime.now() - latest_timestamp).total_seconds() / 3600
        freshness_factor = max(0, 1 - age_hours / 24)  # Decay over 24 hours
        
        # Volatility factor (lower volatility = higher confidence)
        if 'volatility' in features_df.columns:
            recent_volatility = features_df['volatility'].iloc[-6:].mean()
            historical_volatility = features_df['volatility'].mean()
            volatility_factor = max(0.1, 1 - (recent_volatility / historical_volatility - 1))
        else:
            volatility_factor = 0.8
        
        # Data consistency factor
        if 'avg_price' in features_df.columns:
            price_changes = features_df['avg_price'].pct_change().iloc[-12:]
            consistency_factor = max(0.1, 1 - price_changes.std() * 10)
        else:
            consistency_factor = 0.7
        
        # Combined confidence
        confidence = (freshness_factor * 0.3 + volatility_factor * 0.4 + consistency_factor * 0.3)
        return min(0.99, max(0.01, confidence))

    def predict_multiple_pairs(self, pairs, confidence_threshold=0.95):
        results = {}
        
        for pair in pairs:
            result = self.predict_rate(pair, confidence_threshold)
            if result:
                results[pair] = result
        
        return results

    def get_model_health(self, pair):
        pair_key = pair.replace('/', '_')
        
        if pair_key not in self.models:
            return {'status': 'not_loaded'}
        
        model_info = self.models[pair_key]
        metadata = model_info['metadata']
        
        # Check model age
        trained_at = datetime.fromisoformat(metadata['trained_at'])
        age_days = (datetime.now() - trained_at).days
        
        # Get recent prediction accuracy if available
        recent_accuracy = self.get_recent_accuracy(pair)
        
        health = {
            'status': 'healthy',
            'trained_at': metadata['trained_at'],
            'age_days': age_days,
            'feature_count': metadata['feature_count'],
            'recent_accuracy': recent_accuracy,
            'loaded_at': model_info['loaded_at'].isoformat()
        }
        
        # Determine health status
        if age_days > 7:
            health['status'] = 'aging'
        if age_days > 30:
            health['status'] = 'stale'
        if recent_accuracy and recent_accuracy < 0.8:
            health['status'] = 'poor_performance'
        
        return health

    def get_recent_accuracy(self, pair):
        # This would compare recent predictions with actual outcomes
        # For now, return a placeholder
        return 0.85

    def validate_prediction_quality(self, result):
        if not result:
            return False
        
        # Check for reasonable values
        if result['predicted_price'] <= 0:
            return False
        
        # Check for extreme price changes (> 50%)
        if abs(result['price_change']) > 50:
            return False
        
        # Check confidence level
        if result['confidence'] < 0.1:
            return False
        
        return True

    def get_prediction_explanation(self, pair):
        # Return factors that influenced the prediction
        pair_key = pair.replace('/', '_')
        
        if pair_key not in self.models:
            return None
        
        # Get recent data
        rates_df, market_df = self.preprocessor.load_training_data(pair, days=1)
        
        if rates_df.empty:
            return None
        
        features_df = self.preprocessor.create_features(rates_df, market_df)
        
        # Analyze key factors
        explanation = {
            'trend_direction': self.analyze_trend(features_df),
            'volatility_level': self.analyze_volatility(features_df),
            'volume_pattern': self.analyze_volume(features_df),
            'market_sentiment': self.analyze_sentiment(features_df)
        }
        
        return explanation

    def analyze_trend(self, df):
        if 'avg_price' in df.columns and len(df) >= 12:
            recent_prices = df['avg_price'].iloc[-12:]
            trend = (recent_prices.iloc[-1] - recent_prices.iloc[0]) / recent_prices.iloc[0]
            
            if trend > 0.02:
                return 'strong_upward'
            elif trend > 0.005:
                return 'upward'
            elif trend < -0.02:
                return 'strong_downward'
            elif trend < -0.005:
                return 'downward'
            else:
                return 'sideways'
        return 'unknown'

    def analyze_volatility(self, df):
        if 'volatility' in df.columns:
            recent_vol = df['volatility'].iloc[-6:].mean()
            historical_vol = df['volatility'].mean()
            
            if recent_vol > historical_vol * 1.5:
                return 'high'
            elif recent_vol < historical_vol * 0.7:
                return 'low'
            else:
                return 'normal'
        return 'unknown'

    def analyze_volume(self, df):
        # Similar analysis for volume patterns
        return 'normal'  # Placeholder

    def analyze_sentiment(self, df):
        # Market sentiment analysis based on features
        return 'neutral'  # Placeholder

if __name__ == "__main__":
    import sys
    import json

    predictor = OraclePredictor()

    # 命令行模式：
    # 1) python3 models/oracle_predictor.py <PAIR> <CONFIDENCE_THRESHOLD>
    #    输出预测JSON，供Node服务器解析
    # 2) python3 models/oracle_predictor.py health <PAIR>
    #    输出模型健康状态JSON
    args = sys.argv[1:]

    try:
        if len(args) >= 1 and args[0] == 'health':
            if len(args) < 2:
                print(json.dumps({'status': 'error', 'error': 'Pair required'}))
                sys.exit(0)
            pair = args[1]
            health = predictor.get_model_health(pair)
            print(json.dumps(health))
            sys.exit(0)

        if len(args) >= 1:
            pair = args[0]
            confidence_threshold = float(args[1]) if len(args) >= 2 else 0.95
            result = predictor.predict_rate(pair, confidence_threshold=confidence_threshold)
            if result and predictor.validate_prediction_quality(result):
                print(json.dumps(result))
            else:
                print(json.dumps({'error': 'prediction_unavailable', 'pair': pair}))
            sys.exit(0)

        # 默认测试模式（无参数时）
        pairs = ['BTC/USDT', 'ETH/USDT']
        outputs = {}
        for pair in pairs:
            res = predictor.predict_rate(pair)
            outputs[pair] = res if res else {'error': 'prediction_unavailable'}
        print(json.dumps(outputs))
    except Exception as e:
        print(json.dumps({'status': 'error', 'error': str(e)}))
        sys.exit(1)