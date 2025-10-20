import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


logger = logging.getLogger(__name__)

@dataclass
class RiskMetrics:
    """风险指标数据类"""
    max_drawdown: float
    current_drawdown: float
    var_95: float
    expected_shortfall: float
    sharpe_ratio: float
    volatility: float
    correlation_risk: float
    kelly_fraction: float

class PredictionMarketRiskEngine:
    """
    专门针对预测市场特性设计的增强版风控引擎
    
    预测市场特点：
    1. 高波动性 - 事件驱动导致价格剧烈波动
    2. 时间衰减 - 接近结算日期波动加剧
    3. 信息不对称 - 内幕消息影响巨大
    4. 流动性风险 - 部分市场成交稀少
    5. 二元结果 - 最终价格只能是0或1
    """
    
    def __init__(self, 
                 max_drawdown_limit: float = 0.15,
                 max_single_position: float = 0.05,
                 max_correlation_exposure: float = 0.3,
                 min_liquidity_threshold: float = 1000,
                 time_decay_factor: float = 2.0):
        """
        初始化预测市场风控引擎
        
        Args:
            max_drawdown_limit: 最大回撤限制 (15%)
            max_single_position: 单个仓位最大占比 (5%)
            max_correlation_exposure: 最大相关性敞口 (30%)
            min_liquidity_threshold: 最小流动性阈值 ($1000)
            time_decay_factor: 时间衰减系数
        """
        self.max_drawdown_limit = max_drawdown_limit
        self.max_single_position = max_single_position
        self.max_correlation_exposure = max_correlation_exposure
        self.min_liquidity_threshold = min_liquidity_threshold
        self.time_decay_factor = time_decay_factor
        
        # 风控因子字典
        self.risk_factors = {
            'drawdown_control': self._check_max_drawdown,
            'position_sizing': self._check_position_size,
            'correlation_risk': self._check_correlation_risk,
            'liquidity_risk': self._check_liquidity_risk,
            'time_decay_risk': self._check_time_decay_risk,
            'volatility_scaling': self._apply_volatility_scaling,
            'kelly_criterion': self._apply_kelly_sizing,
            'event_risk': self._check_event_risk,
            'binary_outcome_risk': self._check_binary_outcome_risk
        }
        
        # 历史风险指标缓存
        self._risk_metrics_cache = {}
        self._last_calculation_time = None
        
    def validate_order(self, order: Dict, portfolio: Dict, market_data: Dict) -> Tuple[bool, List[str]]:
        """
        综合风险检查
        
        Args:
            order: 订单信息
            portfolio: 投资组合状态  
            market_data: 市场数据
            
        Returns:
            (is_valid, rejection_reasons)
        """
        rejection_reasons = []
        
        # 更新风险指标
        risk_metrics = self._calculate_risk_metrics(portfolio)
        
        # 逐项检查风控因子
        for factor_name, factor_func in self.risk_factors.items():
            try:
                is_valid, reason = factor_func(order, portfolio, market_data, risk_metrics)
                if not is_valid:
                    rejection_reasons.append(f"{factor_name}: {reason}")
            except Exception as e:
                logger.error(f"风控因子 {factor_name} 检查失败: {e}")
                rejection_reasons.append(f"{factor_name}: 检查异常")
        
        is_order_valid = len(rejection_reasons) == 0
        
        if not is_order_valid:
            logger.warning(f"订单被风控拒绝: {rejection_reasons}")
        
        return is_order_valid, rejection_reasons
    
    def _calculate_risk_metrics(self, portfolio: Dict) -> RiskMetrics:
        """计算综合风险指标"""
        current_time = datetime.now()
        
        # 缓存机制：5分钟内不重复计算
        if (self._last_calculation_time and 
            current_time - self._last_calculation_time < timedelta(minutes=5)):
            return self._risk_metrics_cache.get('current', RiskMetrics(0,0,0,0,0,0,0,0))
        
        returns = np.array(portfolio.get('returns', []))
        
        if len(returns) < 10:
            # 数据不足时返回保守估计
            return RiskMetrics(
                max_drawdown=0.0,
                current_drawdown=0.0,
                var_95=0.0,
                expected_shortfall=0.0,
                sharpe_ratio=0.0,
                volatility=0.0,
                correlation_risk=0.0,
                kelly_fraction=0.0
            )
        
        # 计算各项风险指标
        max_drawdown = self._calculate_max_drawdown(returns)
        current_drawdown = self._calculate_current_drawdown(returns)
        var_95 = np.percentile(returns, 5)
        expected_shortfall = returns[returns <= var_95].mean() if len(returns[returns <= var_95]) > 0 else var_95
        sharpe_ratio = self._calculate_sharpe_ratio(returns)
        volatility = np.std(returns) * np.sqrt(252)  # 年化波动率
        correlation_risk = self._calculate_correlation_risk(portfolio)
        kelly_fraction = self._calculate_kelly_fraction(returns)
        
        risk_metrics = RiskMetrics(
            max_drawdown=max_drawdown,
            current_drawdown=current_drawdown,
            var_95=var_95,
            expected_shortfall=expected_shortfall,
            sharpe_ratio=sharpe_ratio,
            volatility=volatility,
            correlation_risk=correlation_risk,
            kelly_fraction=kelly_fraction
        )
        
        # 更新缓存
        self._risk_metrics_cache['current'] = risk_metrics
        self._last_calculation_time = current_time
        
        return risk_metrics
    
    def _check_max_drawdown(self, order: Dict, portfolio: Dict, market_data: Dict, 
                           risk_metrics: RiskMetrics) -> Tuple[bool, str]:
        """最大回撤风控"""
        if risk_metrics.current_drawdown > self.max_drawdown_limit:
            return False, f"当前回撤 {risk_metrics.current_drawdown:.1%} 超过限制 {self.max_drawdown_limit:.1%}"
        
        # 模拟订单执行后的潜在回撤
        estimated_loss = order.get('size', 0) * 0.1  # 假设最大损失10%
        potential_drawdown = (portfolio.get('balance', 0) - estimated_loss) / portfolio.get('balance', 1)
        
        if 1 - potential_drawdown > self.max_drawdown_limit:
            return False, f"潜在回撤 {1-potential_drawdown:.1%} 可能超过限制"
        
        return True, ""
    
    def _check_position_size(self, order: Dict, portfolio: Dict, market_data: Dict,
                           risk_metrics: RiskMetrics) -> Tuple[bool, str]:
        """仓位规模风控"""
        position_ratio = order.get('size', 0) / portfolio.get('balance', 1)
        
        if position_ratio > self.max_single_position:
            return False, f"单笔仓位 {position_ratio:.1%} 超过限制 {self.max_single_position:.1%}"
        
        return True, ""
    
    def _check_correlation_risk(self, order: Dict, portfolio: Dict, market_data: Dict,
                              risk_metrics: RiskMetrics) -> Tuple[bool, str]:
        """相关性风险检查"""
        # 检查同类市场敞口
        market_category = market_data.get('category', 'unknown')
        current_exposure = self._calculate_category_exposure(portfolio, market_category)
        
        new_exposure = current_exposure + order.get('size', 0)
        exposure_ratio = new_exposure / portfolio.get('balance', 1)
        
        if exposure_ratio > self.max_correlation_exposure:
            return False, f"分类 '{market_category}' 敞口 {exposure_ratio:.1%} 超过限制 {self.max_correlation_exposure:.1%}"
        
        return True, ""
    
    def _check_liquidity_risk(self, order: Dict, portfolio: Dict, market_data: Dict,
                            risk_metrics: RiskMetrics) -> Tuple[bool, str]:
        """流动性风险检查"""
        # 检查市场流动性
        daily_volume = market_data.get('volume_24h', 0)
        if daily_volume < self.min_liquidity_threshold:
            return False, f"市场流动性不足: 24h交易量 ${daily_volume:.0f} < ${self.min_liquidity_threshold:.0f}"
        
        # 检查订单规模与流动性的比例
        order_size = order.get('size', 0)
        if order_size > daily_volume * 0.05:  # 不超过日交易量的5%
            return False, f"订单规模 ${order_size:.0f} 过大，超过日交易量5%"
        
        return True, ""
    
    def _check_time_decay_risk(self, order: Dict, portfolio: Dict, market_data: Dict,
                             risk_metrics: RiskMetrics) -> Tuple[bool, str]:
        """时间衰减风险检查"""
        # 预测市场接近到期时波动加剧
        expiry_date = market_data.get('expiry_date')
        if not expiry_date:
            return True, ""  # 无到期时间信息跳过检查
        
        try:
            if isinstance(expiry_date, str):
                expiry_date = datetime.strptime(expiry_date, '%Y-%m-%d')
            
            days_to_expiry = (expiry_date - datetime.now()).days
            
            if days_to_expiry <= 7:  # 到期前一周
                # 增加风险系数
                risk_multiplier = self.time_decay_factor * (8 - days_to_expiry) / 7
                adjusted_size = order.get('size', 0) / risk_multiplier
                
                if adjusted_size != order.get('size', 0):
                    return False, f"接近到期 ({days_to_expiry}天)，建议降低仓位至 ${adjusted_size:.0f}"
                    
        except Exception as e:
            logger.warning(f"时间衰减检查异常: {e}")
        
        return True, ""
    
    def _apply_volatility_scaling(self, order: Dict, portfolio: Dict, market_data: Dict,
                                risk_metrics: RiskMetrics) -> Tuple[bool, str]:
        """波动率调整仓位"""
        if risk_metrics.volatility > 0.5:  # 年化波动率50%以上
            scale_factor = 0.5 / risk_metrics.volatility
            recommended_size = order.get('size', 0) * scale_factor
            
            if recommended_size < order.get('size', 0) * 0.5:  # 如果需要大幅缩减
                return False, f"高波动率 {risk_metrics.volatility:.1%}，建议仓位缩减至 ${recommended_size:.0f}"
        
        return True, ""
    
    def _apply_kelly_sizing(self, order: Dict, portfolio: Dict, market_data: Dict,
                          risk_metrics: RiskMetrics) -> Tuple[bool, str]:
        """Kelly公式仓位管理"""
        if risk_metrics.kelly_fraction <= 0:
            return False, "Kelly公式显示负期望收益，不建议交易"
        
        # Kelly公式建议的最大仓位
        kelly_max_size = portfolio.get('balance', 0) * risk_metrics.kelly_fraction * 0.25  # Kelly的25%
        
        if order.get('size', 0) > kelly_max_size:
            return False, f"仓位 ${order.get('size', 0):.0f} 超过Kelly建议 ${kelly_max_size:.0f}"
        
        return True, ""
    
    def _check_event_risk(self, order: Dict, portfolio: Dict, market_data: Dict,
                        risk_metrics: RiskMetrics) -> Tuple[bool, str]:
        """事件风险检查"""
        # 检查是否有重大事件即将发生
        event_date = market_data.get('next_event_date')
        if event_date:
            try:
                if isinstance(event_date, str):
                    event_date = datetime.strptime(event_date, '%Y-%m-%d')
                
                days_to_event = (event_date - datetime.now()).days
                if 0 <= days_to_event <= 3:  # 事件前3天
                    return False, f"重大事件 {days_to_event} 天后发生，建议避免新开仓"
                    
            except Exception as e:
                logger.warning(f"事件风险检查异常: {e}")
        
        return True, ""
    
    def _check_binary_outcome_risk(self, order: Dict, portfolio: Dict, market_data: Dict,
                                 risk_metrics: RiskMetrics) -> Tuple[bool, str]:
        """二元结果风险检查"""
        # 预测市场最终只有0或1两个结果
        current_price = market_data.get('price', 0.5)
        
        # 极端价格时风险加剧
        if current_price > 0.95 or current_price < 0.05:
            return False, f"价格 {current_price:.3f} 过于极端，风险过高"
        
        # 价格接近0.5时不确定性最高
        if 0.45 <= current_price <= 0.55:
            max_size_50_50 = portfolio.get('balance', 0) * 0.03  # 50/50时最大3%仓位
            if order.get('size', 0) > max_size_50_50:
                return False, f"价格接近0.5，最大建议仓位 ${max_size_50_50:.0f}"
        
        return True, ""
    
    # 辅助计算方法
    def _calculate_max_drawdown(self, returns: np.ndarray) -> float:
        """计算最大回撤"""
        cumulative = np.cumprod(1 + returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        return abs(np.min(drawdown))
    
    def _calculate_current_drawdown(self, returns: np.ndarray) -> float:
        """计算当前回撤"""
        if len(returns) == 0:
            return 0.0
        
        cumulative = np.cumprod(1 + returns)
        peak = np.max(cumulative)
        current = cumulative[-1]
        return (peak - current) / peak if peak > 0 else 0.0
    
    def _calculate_sharpe_ratio(self, returns: np.ndarray) -> float:
        """计算夏普比率"""
        if len(returns) == 0 or np.std(returns) == 0:
            return 0.0
        return np.mean(returns) / np.std(returns) * np.sqrt(252)
    
    def _calculate_correlation_risk(self, portfolio: Dict) -> float:
        """计算组合相关性风险"""
        # 简化版本：基于持仓分布计算
        positions = portfolio.get('positions', {})
        if len(positions) <= 1:
            return 0.0
        
        # 按类别分组计算集中度
        category_weights = {}
        total_value = sum(pos.get('value', 0) for pos in positions.values())
        
        for pos in positions.values():
            category = pos.get('category', 'unknown')
            weight = pos.get('value', 0) / total_value if total_value > 0 else 0
            category_weights[category] = category_weights.get(category, 0) + weight
        
        # 计算赫芬达尔指数作为集中度指标
        hhi = sum(w**2 for w in category_weights.values())
        return hhi
    
    def _calculate_kelly_fraction(self, returns: np.ndarray) -> float:
        """计算Kelly公式建议仓位比例"""
        if len(returns) == 0:
            return 0.0
        
        wins = returns[returns > 0]
        losses = returns[returns < 0]
        
        if len(wins) == 0 or len(losses) == 0:
            return 0.0
        
        win_rate = len(wins) / len(returns)
        avg_win = np.mean(wins)
        avg_loss = abs(np.mean(losses))
        
        if avg_loss == 0:
            return 0.0
        
        kelly_fraction = win_rate - (1 - win_rate) * (avg_loss / avg_win)
        return max(0, min(kelly_fraction, 0.1))  # 限制在0-10%之间
    
    def _calculate_category_exposure(self, portfolio: Dict, category: str) -> float:
        """计算特定类别的敞口"""
        positions = portfolio.get('positions', {})
        total_exposure = 0
        
        for pos in positions.values():
            if pos.get('category') == category:
                total_exposure += pos.get('value', 0)
        
        return total_exposure
    
    def get_risk_report(self, portfolio: Dict) -> Dict:
        """生成风险报告"""
        risk_metrics = self._calculate_risk_metrics(portfolio)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'risk_level': self._assess_risk_level(risk_metrics),
            'metrics': {
                'max_drawdown': f"{risk_metrics.max_drawdown:.1%}",
                'current_drawdown': f"{risk_metrics.current_drawdown:.1%}",
                'var_95': f"{risk_metrics.var_95:.2%}",
                'expected_shortfall': f"{risk_metrics.expected_shortfall:.2%}",
                'sharpe_ratio': f"{risk_metrics.sharpe_ratio:.2f}",
                'volatility': f"{risk_metrics.volatility:.1%}",
                'correlation_risk': f"{risk_metrics.correlation_risk:.2f}",
                'kelly_fraction': f"{risk_metrics.kelly_fraction:.1%}"
            },
            'warnings': self._generate_risk_warnings(risk_metrics),
            'recommendations': self._generate_recommendations(risk_metrics)
        }
    
    def _assess_risk_level(self, risk_metrics: RiskMetrics) -> str:
        """评估整体风险水平"""
        risk_score = 0
        
        # 回撤风险
        if risk_metrics.current_drawdown > 0.1:
            risk_score += 3
        elif risk_metrics.current_drawdown > 0.05:
            risk_score += 1
        
        # 波动率风险
        if risk_metrics.volatility > 0.6:
            risk_score += 3
        elif risk_metrics.volatility > 0.4:
            risk_score += 1
        
        # 相关性风险
        if risk_metrics.correlation_risk > 0.5:
            risk_score += 2
        
        # 夏普比率
        if risk_metrics.sharpe_ratio < 0:
            risk_score += 2
        elif risk_metrics.sharpe_ratio < 1:
            risk_score += 1
        
        if risk_score >= 6:
            return "HIGH"
        elif risk_score >= 3:
            return "MEDIUM" 
        else:
            return "LOW"
    
    def _generate_risk_warnings(self, risk_metrics: RiskMetrics) -> List[str]:
        """生成风险警告"""
        warnings = []
        
        if risk_metrics.current_drawdown > self.max_drawdown_limit * 0.8:
            warnings.append(f"当前回撤 {risk_metrics.current_drawdown:.1%} 接近限制")
        
        if risk_metrics.volatility > 0.5:
            warnings.append(f"波动率 {risk_metrics.volatility:.1%} 过高")
        
        if risk_metrics.correlation_risk > 0.4:
            warnings.append("投资组合集中度过高")
        
        if risk_metrics.sharpe_ratio < 0:
            warnings.append("负夏普比率，策略表现不佳")
        
        return warnings
    
    def _generate_recommendations(self, risk_metrics: RiskMetrics) -> List[str]:
        """生成优化建议"""
        recommendations = []
        
        if risk_metrics.current_drawdown > 0.1:
            recommendations.append("建议暂停新开仓，等待回撤回复")
        
        if risk_metrics.volatility > 0.4:
            recommendations.append("建议降低仓位规模，使用波动率调整")
        
        if risk_metrics.correlation_risk > 0.3:
            recommendations.append("建议分散投资，降低单一类别集中度")
        
        if risk_metrics.kelly_fraction < 0.02:
            recommendations.append("Kelly公式建议仓位过小，考虑优化策略")
        
        return recommendations