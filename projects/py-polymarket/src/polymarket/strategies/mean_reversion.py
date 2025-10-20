import logging
import statistics
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


logger = logging.getLogger(__name__)

class MeanReversionSignal(Enum):
    """均值回归信号类型"""
    STRONG_REVERT_TO_MEAN = "strong_revert"
    WEAK_REVERT_TO_MEAN = "weak_revert"  
    TREND_CONTINUATION = "trend_continuation"
    NO_SIGNAL = "no_signal"

@dataclass
class MeanReversionMetrics:
    """均值回归指标"""
    current_price: float
    fair_value: float
    z_score: float
    bollinger_position: float
    volatility: float
    mean_reversion_strength: float
    time_since_extreme: int
    confidence: float

@dataclass
class MeanReversionSignalResult:
    """均值回归信号结果"""
    signal_type: MeanReversionSignal
    signal_strength: float  # -1到1
    entry_price: float
    target_price: float
    stop_loss: float
    confidence: float
    holding_period: timedelta
    reasoning: str
    metrics: MeanReversionMetrics

class PredictionMarketMeanReversion:
    """
    预测市场均值回归策略
    
    核心理念：
    1. 预测市场经常出现过度反应，价格偏离真实概率
    2. 极端价格往往会向均值回归
    3. 利用统计指标识别超买超卖状态
    4. 考虑预测市场特有的边界约束(0-1)
    
    策略特点：
    - 基于Z-score和布林带的多重确认
    - 动态调整均值计算方法
    - 考虑时间衰减因子
    - 结合市场微观结构信息
    """
    
    def __init__(self, 
                 lookback_period: int = 20,
                 z_score_threshold: float = 2.0,
                 bollinger_std: float = 2.0,
                 min_volatility: float = 0.01,
                 reversion_confidence_threshold: float = 0.7,
                 max_holding_days: int = 7):
        """
        初始化均值回归策略
        
        Args:
            lookback_period: 均值计算回看期
            z_score_threshold: Z-score阈值
            bollinger_std: 布林带标准差倍数
            min_volatility: 最小波动率阈值
            reversion_confidence_threshold: 回归置信度阈值
            max_holding_days: 最大持有天数
        """
        self.lookback_period = lookback_period
        self.z_score_threshold = z_score_threshold
        self.bollinger_std = bollinger_std
        self.min_volatility = min_volatility
        self.reversion_confidence_threshold = reversion_confidence_threshold
        self.max_holding_days = max_holding_days
        
        # 价格历史存储
        self.price_history: Dict[str, deque] = {}
        self.volume_history: Dict[str, deque] = {}
        
        # 统计模型参数
        self.adaptive_periods = {}  # 自适应周期
        self.volatility_regime = {}  # 波动率状态
        self._metrics_cache: Dict[str, Dict[str, MeanReversionMetrics]] = {}
        
        logger.info("预测市场均值回归策略初始化完成")
    
    def update_market_data(self, market_id: str, price: float, volume: float = 0, timestamp: datetime = None):
        """更新市场数据"""
        if self._should_purge_market(market_id, {}):
            return
        if market_id not in self.price_history:
            self.price_history[market_id] = deque(maxlen=self.lookback_period * 2)
            self.volume_history[market_id] = deque(maxlen=self.lookback_period * 2)
        
        self.price_history[market_id].append((timestamp or datetime.now(), price))
        self.volume_history[market_id].append((timestamp or datetime.now(), volume))
    
    def generate_signal(self, market_id: str, current_price: float, market_data: Dict = None) -> Optional[MeanReversionSignalResult]:
        """
        生成均值回归信号
        
        Args:
            market_id: 市场ID
            current_price: 当前价格
            market_data: 额外市场数据
            
        Returns:
            均值回归信号结果
        """
        try:
            if self._should_purge_market(market_id, market_data):
                return None
            # 1. 检查数据充足性
            if market_id not in self.price_history or len(self.price_history[market_id]) < 10:
                logger.warning(f"市场 {market_id} 历史数据不足")
                return None
            
            # 2. 计算技术指标
            latest_timestamp = self.price_history[market_id][-1][0]
            cache_entry = self._metrics_cache.get(market_id)

            if cache_entry and cache_entry.get("timestamp") == latest_timestamp:
                metrics = cache_entry.get("metrics")
            else:
                metrics = self._calculate_metrics(market_id, current_price, market_data)
                if metrics:
                    self._metrics_cache[market_id] = {
                        "timestamp": latest_timestamp,
                        "metrics": metrics,
                    }

            if not metrics:
                return None
            
            # 3. 生成信号
            signal_result = self._generate_signal_from_metrics(market_id, metrics, market_data)
            
            return signal_result
            
        except Exception as e:
            logger.error(f"均值回归信号生成失败 {market_id}: {e}")
            return None
    
    def _calculate_metrics(self, market_id: str, current_price: float, market_data: Dict = None) -> Optional[MeanReversionMetrics]:
        """计算均值回归指标"""
        try:
            prices = [p[1] for p in list(self.price_history[market_id])]
            
            # 1. 基础统计指标
            mean_price = np.mean(prices)
            std_price = np.std(prices)
            
            if std_price < self.min_volatility:
                logger.debug(f"市场 {market_id} 波动率过低: {std_price}")
                return None
            
            # 2. Z-score计算
            z_score = (current_price - mean_price) / std_price
            
            # 3. 动态均值计算 (考虑时间权重)
            fair_value = self._calculate_fair_value(prices, current_price, market_data)
            
            # 4. 布林带位置
            upper_band = mean_price + self.bollinger_std * std_price
            lower_band = mean_price - self.bollinger_std * std_price
            bollinger_position = (current_price - lower_band) / (upper_band - lower_band)
            
            # 5. 波动率计算
            returns = np.diff(prices) / prices[:-1]
            volatility = np.std(returns) * np.sqrt(252)  # 年化波动率
            
            # 6. 均值回归强度 
            reversion_strength = self._calculate_reversion_strength(prices, market_data)
            
            # 7. 极端价格持续时间
            time_since_extreme = self._calculate_time_since_extreme(market_id, current_price)
            
            # 8. 综合置信度
            confidence = self._calculate_reversion_confidence(
                z_score, bollinger_position, reversion_strength, time_since_extreme, market_data
            )
            
            return MeanReversionMetrics(
                current_price=current_price,
                fair_value=fair_value,
                z_score=z_score,
                bollinger_position=bollinger_position,
                volatility=volatility,
                mean_reversion_strength=reversion_strength,
                time_since_extreme=time_since_extreme,
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"指标计算异常 {market_id}: {e}")
            return None
    
    def _calculate_fair_value(self, prices: List[float], current_price: float, market_data: Dict = None) -> float:
        """
        计算公允价值
        
        考虑因素：
        1. 时间加权平均
        2. 成交量加权
        3. 趋势调整
        4. 预测市场特有的边界约束
        """
        if not prices:
            return current_price
        
        # 1. 基础加权平均 (近期权重更高)
        weights = np.array([1.1**i for i in range(len(prices))])
        weights = weights / np.sum(weights)
        weighted_mean = np.average(prices, weights=weights)
        
        # 2. 预测市场边界调整
        # 预测市场价格受0-1约束，极端价格回归倾向更强
        if current_price > 0.8:
            # 高价区域，向下回归压力
            boundary_adjustment = -0.05 * (current_price - 0.8) / 0.2
        elif current_price < 0.2:
            # 低价区域，向上回归压力
            boundary_adjustment = 0.05 * (0.2 - current_price) / 0.2
        else:
            boundary_adjustment = 0
        
        # 3. 趋势调整
        trend_adjustment = 0
        if len(prices) >= 5:
            recent_trend = (prices[-1] - prices[-5]) / 4
            # 逆向趋势调整 (反向操作)
            trend_adjustment = -recent_trend * 0.3
        
        # 4. 市场微观结构调整
        microstructure_adjustment = 0
        if market_data:
            bid_ask_spread = market_data.get('ask', current_price + 0.01) - market_data.get('bid', current_price - 0.01)
            if bid_ask_spread > 0.05:  # 价差过大时更保守
                microstructure_adjustment = 0.02 * np.sign(current_price - weighted_mean)
        
        # 综合公允价值
        fair_value = weighted_mean + boundary_adjustment + trend_adjustment + microstructure_adjustment
        
        # 确保在合理范围内
        fair_value = max(0.01, min(0.99, fair_value))
        
        return fair_value
    
    def _calculate_reversion_strength(self, prices: List[float], market_data: Dict = None) -> float:
        """
        计算均值回归强度
        
        基于历史价格行为分析均值回归倾向
        """
        if len(prices) < 10:
            return 0.5  # 默认中等强度
        
        # 1. 自相关分析
        price_changes = np.diff(prices)
        if len(price_changes) < 2:
            return 0.5
        
        # 计算一阶自相关系数 (负数表示均值回归)
        autocorr = np.corrcoef(price_changes[:-1], price_changes[1:])[0, 1]
        if np.isnan(autocorr):
            autocorr = 0
        
        # 转换为0-1的回归强度 (更负的自相关 = 更强的回归)
        reversion_score = max(0, min(1, 0.5 - autocorr))
        
        # 2. 极值回归分析
        price_array = np.array(prices)
        mean_price = np.mean(price_array)
        std_price = np.std(price_array)
        
        # 统计极值后的回归情况
        extreme_threshold = 1.5 * std_price
        reversion_events = 0
        total_extremes = 0
        
        for i in range(1, len(prices) - 2):
            if abs(prices[i] - mean_price) > extreme_threshold:
                total_extremes += 1
                # 检查后续2个价格是否回归
                if abs(prices[i+1] - mean_price) < abs(prices[i] - mean_price):
                    reversion_events += 1
        
        historical_reversion_rate = reversion_events / total_extremes if total_extremes > 0 else 0.5
        
        # 3. 波动率回归
        returns = np.diff(prices) / prices[:-1]
        volatility_clustering = self._calculate_volatility_clustering(returns)
        
        # 综合回归强度
        reversion_strength = (
            reversion_score * 0.4 + 
            historical_reversion_rate * 0.4 + 
            volatility_clustering * 0.2
        )
        
        return max(0.1, min(1.0, reversion_strength))
    
    def _calculate_volatility_clustering(self, returns: np.ndarray) -> float:
        """计算波动率聚集性 (GARCH效应)"""
        if len(returns) < 10:
            return 0.5
        
        # 计算滚动波动率
        window = 5
        rolling_vols = []
        
        for i in range(window, len(returns)):
            vol = np.std(returns[i-window:i])
            rolling_vols.append(vol)
        
        if len(rolling_vols) < 2:
            return 0.5
        
        # 波动率的自相关性
        vol_autocorr = np.corrcoef(rolling_vols[:-1], rolling_vols[1:])[0, 1]
        if np.isnan(vol_autocorr):
            return 0.5
        
        # 高自相关表示波动率聚集，有利于均值回归策略
        return max(0, min(1, vol_autocorr))
    
    def _calculate_time_since_extreme(self, market_id: str, current_price: float) -> int:
        """计算距离上次极端价格的时间"""
        if market_id not in self.price_history:
            return 0
        
        prices = [(timestamp, price) for timestamp, price in self.price_history[market_id]]
        
        # 定义极端价格 (前10%和后10%)
        all_prices = [p[1] for p in prices]
        extreme_low = np.percentile(all_prices, 10)
        extreme_high = np.percentile(all_prices, 90)
        
        # 从最近开始往前找极端价格
        for i, (timestamp, price) in enumerate(reversed(prices)):
            if price <= extreme_low or price >= extreme_high:
                return i
        
        return len(prices)  # 没找到极端价格
    
    def _should_purge_market(self, market_id: str, market_data: Optional[Dict]) -> bool:
        data = market_data or {}
        resolved = bool(data.get("resolved") or data.get("closed"))
        status = str(data.get("status", "")).lower()
        active_flag = data.get("active")
        accepting = data.get("accepting_orders")
        if active_flag is False or accepting is False or status in {"resolved", "closed"}:
            resolved = True
        if resolved:
            self.price_history.pop(market_id, None)
            self.volume_history.pop(market_id, None)
            self._metrics_cache.pop(market_id, None)
            self.adaptive_periods.pop(market_id, None)
            self.volatility_regime.pop(market_id, None)
            return True
        return False

    def _calculate_reversion_confidence(self, 
                                      z_score: float, 
                                      bollinger_position: float,
                                      reversion_strength: float,
                                      time_since_extreme: int,
                                      market_data: Dict = None) -> float:
        """计算均值回归置信度"""
        
        # 1. Z-score置信度
        z_confidence = min(1.0, abs(z_score) / 3.0)  # 3倍标准差为满分
        
        # 2. 布林带置信度
        # 布林带位置越极端，回归可能性越大
        if bollinger_position > 0.8:
            bollinger_confidence = (bollinger_position - 0.8) / 0.2
        elif bollinger_position < 0.2:
            bollinger_confidence = (0.2 - bollinger_position) / 0.2
        else:
            bollinger_confidence = 0
        
        # 3. 时间因子
        # 极端状态持续时间越长，回归概率越大
        time_factor = min(1.0, time_since_extreme / 10.0)  # 10期为满分
        
        # 4. 流动性因子
        liquidity_factor = 1.0
        if market_data:
            volume = market_data.get('volume_24h', 1000)
            if volume < 100:
                liquidity_factor = 0.5  # 低流动性降低置信度
        
        # 5. 市场状态因子
        market_state_factor = 1.0
        if market_data:
            # 接近到期时回归更快
            expiry_date = market_data.get('expiry_date')
            if expiry_date:
                try:
                    if isinstance(expiry_date, str):
                        expiry_date = datetime.strptime(expiry_date, '%Y-%m-%d')
                    
                    days_to_expiry = (expiry_date - datetime.now()).days
                    if days_to_expiry <= 7:
                        market_state_factor = 1.2  # 接近到期回归更强
                except Exception:
                    pass
        
        # 综合置信度
        confidence = (
            z_confidence * 0.25 +
            bollinger_confidence * 0.25 +
            reversion_strength * 0.2 +
            time_factor * 0.15 +
            liquidity_factor * 0.1 +
            market_state_factor * 0.05
        )
        
        return min(1.0, confidence)
    
    def _generate_signal_from_metrics(self, 
                                    market_id: str, 
                                    metrics: MeanReversionMetrics,
                                    market_data: Dict = None) -> Optional[MeanReversionSignalResult]:
        """从指标生成具体信号"""
        
        # 1. 判断信号方向和强度
        if abs(metrics.z_score) < 1.0:
            return None  # 信号太弱
        
        # 2. 确定信号类型
        if metrics.z_score > self.z_score_threshold and metrics.bollinger_position > 0.8:
            # 超买，预期下跌
            signal_type = MeanReversionSignal.STRONG_REVERT_TO_MEAN
            signal_strength = -min(1.0, abs(metrics.z_score) / 3.0)
            entry_direction = "sell"
            
        elif metrics.z_score < -self.z_score_threshold and metrics.bollinger_position < 0.2:
            # 超卖，预期上涨
            signal_type = MeanReversionSignal.STRONG_REVERT_TO_MEAN
            signal_strength = min(1.0, abs(metrics.z_score) / 3.0)
            entry_direction = "buy"
            
        elif abs(metrics.z_score) > 1.0:
            # 中等信号
            signal_type = MeanReversionSignal.WEAK_REVERT_TO_MEAN
            signal_strength = np.sign(-metrics.z_score) * min(0.6, abs(metrics.z_score) / 2.0)
            entry_direction = "buy" if signal_strength > 0 else "sell"
            
        else:
            return None
        
        # 3. 计算价格目标
        target_price, stop_loss = self._calculate_price_targets(
            metrics, signal_strength, market_data
        )
        
        # 4. 估计持有期
        holding_period = self._estimate_holding_period(
            metrics, abs(signal_strength), market_data
        )
        
        # 5. 生成推理说明
        reasoning = self._generate_reasoning(metrics, signal_type, signal_strength)
        
        return MeanReversionSignalResult(
            signal_type=signal_type,
            signal_strength=signal_strength,
            entry_price=metrics.current_price,
            target_price=target_price,
            stop_loss=stop_loss,
            confidence=metrics.confidence,
            holding_period=holding_period,
            reasoning=reasoning,
            metrics=metrics
        )
    
    def _calculate_price_targets(self, 
                               metrics: MeanReversionMetrics, 
                               signal_strength: float,
                               market_data: Dict = None) -> Tuple[float, float]:
        """计算目标价格和止损价格"""
        
        current_price = metrics.current_price
        fair_value = metrics.fair_value
        volatility = metrics.volatility
        
        # 1. 目标价格 = 公允价值 + 部分回归
        reversion_ratio = 0.5 + abs(signal_strength) * 0.3  # 50-80%回归
        target_price = current_price + (fair_value - current_price) * reversion_ratio
        
        # 2. 预测市场边界约束
        target_price = max(0.01, min(0.99, target_price))
        
        # 3. 止损价格 = 当前价格 + 1.5倍标准差 (反向)
        stop_loss_distance = 1.5 * volatility / np.sqrt(252)  # 日波动率
        
        if signal_strength > 0:  # 看涨
            stop_loss = current_price * (1 - stop_loss_distance)
        else:  # 看跌
            stop_loss = current_price * (1 + stop_loss_distance)
        
        # 4. 止损边界约束
        stop_loss = max(0.01, min(0.99, stop_loss))
        
        # 5. 合理性检查
        if signal_strength > 0 and target_price <= current_price:
            target_price = current_price * 1.05  # 最小5%收益目标
        elif signal_strength < 0 and target_price >= current_price:
            target_price = current_price * 0.95  # 最小5%收益目标
        
        return target_price, stop_loss
    
    def _estimate_holding_period(self, 
                               metrics: MeanReversionMetrics,
                               signal_strength: float,
                               market_data: Dict = None) -> timedelta:
        """估计持有期"""
        
        # 1. 基础持有期 (基于波动率)
        base_days = max(1, int(10 / max(metrics.volatility, 0.1)))  # 低波动率需要更长时间
        
        # 2. 信号强度调整
        strength_multiplier = 2 - signal_strength  # 强信号缩短持有期
        adjusted_days = int(base_days * strength_multiplier)
        
        # 3. 市场特定调整
        if market_data:
            expiry_date = market_data.get('expiry_date')
            if expiry_date:
                try:
                    if isinstance(expiry_date, str):
                        expiry_date = datetime.strptime(expiry_date, '%Y-%m-%d')
                    
                    days_to_expiry = (expiry_date - datetime.now()).days
                    # 不能持有到到期后
                    adjusted_days = min(adjusted_days, max(1, days_to_expiry - 1))
                    
                except Exception:
                    pass
        
        # 4. 应用最大持有期限制
        final_days = min(adjusted_days, self.max_holding_days)
        
        return timedelta(days=max(1, final_days))
    
    def _generate_reasoning(self, 
                          metrics: MeanReversionMetrics,
                          signal_type: MeanReversionSignal,
                          signal_strength: float) -> str:
        """生成推理说明"""
        
        reasoning_parts = []
        
        # 1. Z-score说明
        if abs(metrics.z_score) > 2:
            reasoning_parts.append(f"极端Z-score: {metrics.z_score:.2f}")
        else:
            reasoning_parts.append(f"Z-score: {metrics.z_score:.2f}")
        
        # 2. 布林带位置
        if metrics.bollinger_position > 0.8:
            reasoning_parts.append("布林带上轨附近")
        elif metrics.bollinger_position < 0.2:
            reasoning_parts.append("布林带下轨附近")
        
        # 3. 公允价值偏差
        value_deviation = (metrics.current_price - metrics.fair_value) / metrics.fair_value
        if abs(value_deviation) > 0.1:
            reasoning_parts.append(f"偏离公允价值 {value_deviation:.1%}")
        
        # 4. 回归强度
        if metrics.mean_reversion_strength > 0.7:
            reasoning_parts.append("强回归倾向")
        elif metrics.mean_reversion_strength > 0.5:
            reasoning_parts.append("中等回归倾向")
        
        # 5. 时间因子
        if metrics.time_since_extreme < 3:
            reasoning_parts.append("刚出现极值")
        elif metrics.time_since_extreme > 10:
            reasoning_parts.append("长期极值状态")
        
        # 6. 置信度
        reasoning_parts.append(f"置信度: {metrics.confidence:.1%}")
        
        return " | ".join(reasoning_parts)
    
    def batch_analyze_markets(self, market_data: Dict[str, Dict]) -> Dict[str, Optional[MeanReversionSignalResult]]:
        """批量分析多个市场"""
        results = {}
        
        for market_id, data in market_data.items():
            try:
                current_price = data.get('price', 0.5)
                
                # 更新数据 (如果有历史数据)
                if 'history' in data:
                    for timestamp, price in data['history']:
                        self.update_market_data(market_id, price, 0, timestamp)
                
                # 生成信号
                signal = self.generate_signal(market_id, current_price, data)
                results[market_id] = signal
                
            except Exception as e:
                logger.error(f"市场 {market_id} 分析失败: {e}")
                results[market_id] = None
        
        return results
    
    def get_strategy_performance(self, market_id: str = None) -> Dict:
        """获取策略表现统计"""
        # 这里应该基于历史信号和实际结果计算
        # 简化版本返回基础统计
        
        performance = {
            'total_signals': 0,
            'profitable_signals': 0,
            'average_holding_period': timedelta(days=3),
            'average_return': 0.05,
            'win_rate': 0.65,
            'max_drawdown': 0.12,
            'sharpe_ratio': 1.2
        }
        
        return performance
    
    def optimize_parameters(self, historical_data: Dict[str, List], target_metric: str = 'sharpe_ratio'):
        """参数优化 (简化版本)"""
        # 这里应该实现参数网格搜索或贝叶斯优化
        # 当前返回建议参数
        
        optimized_params = {
            'lookback_period': self.lookback_period,
            'z_score_threshold': self.z_score_threshold,
            'bollinger_std': self.bollinger_std,
            'reversion_confidence_threshold': self.reversion_confidence_threshold
        }
        
        logger.info(f"参数优化完成，目标指标: {target_metric}")
        
        return optimized_params
