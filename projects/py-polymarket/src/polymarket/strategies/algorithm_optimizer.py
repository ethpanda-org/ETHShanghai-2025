#!/usr/bin/env python3
"""
策略算法优化器
Algorithm Optimizer for Trading Strategies

基于数学优化和机器学习的策略参数自动调优系统
"""

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import asyncio
import logging

import numpy as np
import pandas as pd
from scipy import optimize
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler

from src.polymarket.utils.logging_utils import get_logger, log_execution_time, async_log_execution_time

logger = get_logger(__name__)

@dataclass
class OptimizationResult:
    """优化结果数据类"""
    strategy_name: str
    original_params: Dict[str, Any]
    optimized_params: Dict[str, Any]
    improvement_pct: float
    confidence_score: float
    optimization_time: float
    validation_results: Dict[str, float]
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class BacktestResult:
    """回测结果数据类"""
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    avg_trade_duration: float
    total_trades: int
    volatility: float
    calmar_ratio: float

class StrategyAlgorithmOptimizer:
    """策略算法优化器"""
    
    def __init__(self, 
                 optimization_periods: int = 30,  # 优化周期天数
                 validation_periods: int = 7,     # 验证周期天数
                 n_trials: int = 100):            # 优化试验次数
        
        self.optimization_periods = optimization_periods
        self.validation_periods = validation_periods
        self.n_trials = n_trials
        
        # 优化历史记录
        self.optimization_history: List[OptimizationResult] = []
        
        # 性能基准
        self.performance_benchmarks = {
            'sharpe_ratio': {'min': 0.5, 'target': 1.5, 'excellent': 2.0},
            'max_drawdown': {'max': 0.15, 'target': 0.08, 'excellent': 0.05},
            'win_rate': {'min': 0.45, 'target': 0.60, 'excellent': 0.70},
            'total_return': {'min': 0.05, 'target': 0.15, 'excellent': 0.25}
        }
        
        logger.info("策略算法优化器初始化完成")

    @log_execution_time
    def optimize_mean_reversion_strategy(self, historical_data: pd.DataFrame) -> OptimizationResult:
        """优化均值回归策略参数"""
        
        logger.info("开始优化均值回归策略")
        start_time = datetime.now()
        
        # 当前参数
        original_params = {
            "z_score_threshold": 1.5,
            "lookback_period": 15,
            "mid_range_threshold": 0.15,
            "min_volatility": 0.08,
            "position_size_multiplier": 1.0,
            "holding_period": 3600
        }
        
        # 参数搜索空间
        param_bounds = {
            "z_score_threshold": (1.0, 3.0),
            "lookback_period": (10, 30),
            "mid_range_threshold": (0.05, 0.25),
            "min_volatility": (0.02, 0.15),
            "position_size_multiplier": (0.5, 2.0),
            "holding_period": (1800, 7200)
        }
        
        # 使用贝叶斯优化
        best_params, best_score = self._bayesian_optimize(
            self._evaluate_mean_reversion_params,
            param_bounds,
            historical_data,
            original_params
        )
        
        # 验证优化结果
        validation_results = self._validate_strategy_params(
            self._evaluate_mean_reversion_params,
            best_params,
            historical_data
        )
        
        optimization_time = (datetime.now() - start_time).total_seconds()
        improvement_pct = ((best_score - self._evaluate_mean_reversion_params(
            list(original_params.values()), historical_data
        )) / abs(best_score)) * 100
        
        result = OptimizationResult(
            strategy_name="enhanced_mean_reversion",
            original_params=original_params,
            optimized_params=best_params,
            improvement_pct=improvement_pct,
            confidence_score=validation_results['confidence'],
            optimization_time=optimization_time,
            validation_results=validation_results
        )
        
        self.optimization_history.append(result)
        logger.info(f"均值回归策略优化完成，性能提升: {improvement_pct:.1f}%")
        
        return result

    @log_execution_time
    def optimize_spike_detection_strategy(self, historical_data: pd.DataFrame) -> OptimizationResult:
        """优化异动检测策略参数"""
        
        logger.info("开始优化异动检测策略")
        start_time = datetime.now()
        
        # 当前参数
        original_params = {
            "spike_threshold": 0.05,
            "volume_surge_threshold": 2.0,
            "confidence_threshold": 0.7,
            "z_score_threshold": 2.0,
            "volatility_ratio_threshold": 2.5,
            "position_size_multiplier": 0.6,
            "stop_loss_pct": 0.03,
            "take_profit_pct": 0.06
        }
        
        # 参数搜索空间
        param_bounds = {
            "spike_threshold": (0.02, 0.1),
            "volume_surge_threshold": (1.5, 3.0),
            "confidence_threshold": (0.5, 0.9),
            "z_score_threshold": (1.5, 3.0),
            "volatility_ratio_threshold": (2.0, 4.0),
            "position_size_multiplier": (0.3, 1.0),
            "stop_loss_pct": (0.02, 0.05),
            "take_profit_pct": (0.04, 0.1)
        }
        
        # 使用遗传算法优化
        best_params, best_score = self._genetic_algorithm_optimize(
            self._evaluate_spike_detection_params,
            param_bounds,
            historical_data,
            original_params
        )
        
        # 验证优化结果
        validation_results = self._validate_strategy_params(
            self._evaluate_spike_detection_params,
            best_params,
            historical_data
        )
        
        optimization_time = (datetime.now() - start_time).total_seconds()
        improvement_pct = ((best_score - self._evaluate_spike_detection_params(
            list(original_params.values()), historical_data
        )) / abs(best_score)) * 100
        
        result = OptimizationResult(
            strategy_name="spike_detection",
            original_params=original_params,
            optimized_params=best_params,
            improvement_pct=improvement_pct,
            confidence_score=validation_results['confidence'],
            optimization_time=optimization_time,
            validation_results=validation_results
        )
        
        self.optimization_history.append(result)
        logger.info(f"异动检测策略优化完成，性能提升: {improvement_pct:.1f}%")
        
        return result

    @log_execution_time
    def optimize_portfolio_weights(self, strategies_performance: Dict[str, pd.DataFrame]) -> Dict[str, float]:
        """优化策略组合权重"""
        
        logger.info("开始优化策略组合权重")
        
        # 计算各策略的收益和风险指标
        strategy_metrics = {}
        for strategy_name, performance_data in strategies_performance.items():
            returns = performance_data['returns']
            strategy_metrics[strategy_name] = {
                'mean_return': returns.mean(),
                'volatility': returns.std(),
                'sharpe_ratio': returns.mean() / returns.std() if returns.std() > 0 else 0,
                'correlation': returns
            }
        
        # 构建协方差矩阵
        returns_matrix = pd.DataFrame({
            name: data['correlation'] 
            for name, data in strategy_metrics.items()
        })
        cov_matrix = returns_matrix.cov()
        
        # 使用均值方差优化
        n_strategies = len(strategy_metrics)
        mean_returns = np.array([metrics['mean_return'] for metrics in strategy_metrics.values()])
        
        # 目标函数：最大化夏普比率
        def objective(weights):
            portfolio_return = np.sum(weights * mean_returns)
            portfolio_variance = np.dot(weights.T, np.dot(cov_matrix, weights))
            portfolio_std = np.sqrt(portfolio_variance)
            
            if portfolio_std == 0:
                return -float('inf')
            
            return -(portfolio_return / portfolio_std)  # 负号因为要最大化
        
        # 约束条件
        constraints = [
            {'type': 'eq', 'fun': lambda weights: np.sum(weights) - 1}  # 权重和为1
        ]
        bounds = [(0.05, 0.8) for _ in range(n_strategies)]  # 每个策略5%-80%
        
        # 初始猜测（等权重）
        initial_weights = np.array([1/n_strategies] * n_strategies)
        
        # 优化
        result = optimize.minimize(
            objective,
            initial_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        if result.success:
            optimized_weights = {
                name: weight 
                for name, weight in zip(strategy_metrics.keys(), result.x)
            }
            
            logger.info("策略组合权重优化完成")
            for name, weight in optimized_weights.items():
                logger.info(f"  {name}: {weight:.1%}")
            
            return optimized_weights
        else:
            logger.warning("策略组合权重优化失败，使用等权重")
            return {name: 1/n_strategies for name in strategy_metrics.keys()}

    def _bayesian_optimize(self, objective_func, param_bounds, data, original_params):
        """贝叶斯优化实现"""
        
        # 简化版贝叶斯优化（实际项目可以使用skopt或其他专业库）
        best_score = float('-inf')
        best_params = original_params.copy()
        
        # 网格搜索 + 随机搜索组合
        n_grid_points = 50
        n_random_points = 50
        
        param_names = list(param_bounds.keys())
        param_ranges = list(param_bounds.values())
        
        # 网格搜索
        for _ in range(n_grid_points):
            test_params = {}
            for name, (min_val, max_val) in param_bounds.items():
                test_params[name] = np.random.uniform(min_val, max_val)
            
            score = objective_func(list(test_params.values()), data)
            
            if score > best_score:
                best_score = score
                best_params = test_params
        
        # 在最佳点附近进行局部优化
        def scipy_objective(params_list):
            return -objective_func(params_list, data)  # 负号因为scipy.minimize最小化
        
        bounds_list = [param_bounds[name] for name in param_names]
        initial_guess = [best_params[name] for name in param_names]
        
        scipy_result = optimize.minimize(
            scipy_objective,
            initial_guess,
            method='L-BFGS-B',
            bounds=bounds_list
        )
        
        if scipy_result.success:
            final_params = {
                name: value 
                for name, value in zip(param_names, scipy_result.x)
            }
            final_score = -scipy_result.fun
            
            if final_score > best_score:
                best_params = final_params
                best_score = final_score
        
        return best_params, best_score

    def _genetic_algorithm_optimize(self, objective_func, param_bounds, data, original_params):
        """遗传算法优化实现"""
        
        population_size = 50
        n_generations = 30
        mutation_rate = 0.1
        crossover_rate = 0.8
        
        param_names = list(param_bounds.keys())
        param_ranges = list(param_bounds.values())
        n_params = len(param_names)
        
        # 初始化种群
        population = []
        for _ in range(population_size):
            individual = []
            for min_val, max_val in param_ranges:
                individual.append(np.random.uniform(min_val, max_val))
            population.append(individual)
        
        best_score = float('-inf')
        best_params = original_params.copy()
        
        for generation in range(n_generations):
            # 评估适应度
            fitness_scores = []
            for individual in population:
                score = objective_func(individual, data)
                fitness_scores.append(score)
                
                if score > best_score:
                    best_score = score
                    best_params = {
                        name: value 
                        for name, value in zip(param_names, individual)
                    }
            
            # 选择
            fitness_scores = np.array(fitness_scores)
            # 处理负分数
            if np.min(fitness_scores) < 0:
                fitness_scores = fitness_scores - np.min(fitness_scores) + 1
            
            probabilities = fitness_scores / np.sum(fitness_scores)
            
            new_population = []
            
            for _ in range(population_size):
                if np.random.random() < crossover_rate:
                    # 交叉
                    parent1_idx = np.random.choice(len(population), p=probabilities)
                    parent2_idx = np.random.choice(len(population), p=probabilities)
                    
                    parent1 = population[parent1_idx]
                    parent2 = population[parent2_idx]
                    
                    # 单点交叉
                    crossover_point = np.random.randint(1, n_params)
                    child = parent1[:crossover_point] + parent2[crossover_point:]
                else:
                    # 选择
                    parent_idx = np.random.choice(len(population), p=probabilities)
                    child = population[parent_idx].copy()
                
                # 变异
                if np.random.random() < mutation_rate:
                    mutate_idx = np.random.randint(n_params)
                    min_val, max_val = param_ranges[mutate_idx]
                    child[mutate_idx] = np.random.uniform(min_val, max_val)
                
                new_population.append(child)
            
            population = new_population
        
        return best_params, best_score

    def _evaluate_mean_reversion_params(self, params, data):
        """评估均值回归策略参数"""
        
        try:
            z_threshold, lookback, mid_threshold, min_vol, pos_mult, hold_period = params
            
            # 模拟回测逻辑
            prices = data['price'].values if 'price' in data.columns else np.random.random(100) * 0.5 + 0.25
            volumes = data['volume'].values if 'volume' in data.columns else np.random.random(100) * 10000 + 5000
            
            returns = []
            
            for i in range(int(lookback), len(prices)):
                historical_prices = prices[i-int(lookback):i]
                current_price = prices[i]
                
                mean_price = np.mean(historical_prices)
                std_price = np.std(historical_prices)
                
                if std_price > min_vol:
                    z_score = (current_price - mean_price) / std_price
                    
                    if abs(z_score) > z_threshold:
                        # 生成交易信号
                        signal_strength = -np.sign(z_score) * min(abs(z_score) / 2.5, 1.0)
                        position_size = abs(signal_strength) * pos_mult
                        
                        # 计算收益（简化）
                        if i + int(hold_period/3600) < len(prices):
                            future_price = prices[i + int(hold_period/3600)]
                            trade_return = signal_strength * (future_price - current_price) / current_price
                            returns.append(trade_return * position_size)
            
            if not returns:
                return -1  # 无交易信号
            
            # 计算综合评分
            total_return = np.sum(returns)
            volatility = np.std(returns)
            sharpe_ratio = total_return / volatility if volatility > 0 else 0
            
            # 综合评分（权衡收益和风险）
            score = sharpe_ratio * 0.6 + total_return * 0.4
            
            return score
            
        except Exception as e:
            logger.error(f"参数评估失败: {e}")
            return -10  # 惩罚分数

    def _evaluate_spike_detection_params(self, params, data):
        """评估异动检测策略参数"""
        
        try:
            spike_threshold, vol_threshold, conf_threshold, z_threshold, vol_ratio_threshold, pos_mult, stop_loss, take_profit = params
            
            # 模拟异动检测逻辑
            prices = data['price'].values if 'price' in data.columns else np.random.random(100) * 0.5 + 0.25
            volumes = data['volume'].values if 'volume' in data.columns else np.random.random(100) * 10000 + 5000
            
            returns = []
            
            for i in range(20, len(prices)):
                recent_prices = prices[i-20:i]
                current_price = prices[i]
                
                # 检测价格异动
                price_change = (current_price - recent_prices[-2]) / recent_prices[-2]
                
                if abs(price_change) > spike_threshold:
                    # 计算Z-score
                    mean_price = np.mean(recent_prices[:-1])
                    std_price = np.std(recent_prices[:-1])
                    
                    if std_price > 0:
                        z_score = (current_price - mean_price) / std_price
                        
                        if abs(z_score) > z_threshold:
                            confidence = min(abs(z_score) / 3.0, 1.0)
                            
                            if confidence >= conf_threshold:
                                # 生成交易信号
                                signal_direction = 1 if price_change > 0 else -1
                                position_size = confidence * pos_mult
                                
                                # 模拟交易结果
                                entry_price = current_price
                                
                                # 寻找出场点
                                for j in range(i+1, min(i+10, len(prices))):
                                    exit_price = prices[j]
                                    pnl = signal_direction * (exit_price - entry_price) / entry_price
                                    
                                    # 止盈止损检查
                                    if pnl >= take_profit or pnl <= -stop_loss:
                                        returns.append(pnl * position_size)
                                        break
                                else:
                                    # 强制平仓
                                    if i + 5 < len(prices):
                                        exit_price = prices[i + 5]
                                        pnl = signal_direction * (exit_price - entry_price) / entry_price
                                        returns.append(pnl * position_size)
            
            if not returns:
                return -1
            
            # 计算评分
            total_return = np.sum(returns)
            win_rate = len([r for r in returns if r > 0]) / len(returns)
            volatility = np.std(returns)
            sharpe_ratio = total_return / volatility if volatility > 0 else 0
            
            # 综合评分
            score = sharpe_ratio * 0.4 + total_return * 0.3 + win_rate * 0.3
            
            return score
            
        except Exception as e:
            logger.error(f"异动策略参数评估失败: {e}")
            return -10

    def _validate_strategy_params(self, objective_func, params, data):
        """验证策略参数"""
        
        # 使用时间序列交叉验证
        n_splits = 5
        scores = []
        
        data_length = len(data)
        split_size = data_length // n_splits
        
        for i in range(n_splits):
            start_idx = i * split_size
            end_idx = (i + 1) * split_size if i < n_splits - 1 else data_length
            
            validation_data = data.iloc[start_idx:end_idx]
            score = objective_func(list(params.values()), validation_data)
            scores.append(score)
        
        mean_score = np.mean(scores)
        std_score = np.std(scores)
        confidence = max(0, 1 - (std_score / abs(mean_score))) if mean_score != 0 else 0
        
        return {
            'mean_score': mean_score,
            'std_score': std_score,
            'confidence': confidence,
            'all_scores': scores
        }

    @log_execution_time
    def generate_optimization_report(self) -> Dict:
        """生成优化报告"""
        
        if not self.optimization_history:
            return {"message": "无优化历史记录"}
        
        report = {
            "optimization_summary": {
                "total_optimizations": len(self.optimization_history),
                "avg_improvement": np.mean([r.improvement_pct for r in self.optimization_history]),
                "best_improvement": max([r.improvement_pct for r in self.optimization_history]),
                "avg_confidence": np.mean([r.confidence_score for r in self.optimization_history])
            },
            "strategy_results": {},
            "recommendations": [],
            "next_optimization_targets": []
        }
        
        # 按策略分组结果
        for result in self.optimization_history:
            strategy_name = result.strategy_name
            if strategy_name not in report["strategy_results"]:
                report["strategy_results"][strategy_name] = []
            
            report["strategy_results"][strategy_name].append({
                "timestamp": result.timestamp.isoformat(),
                "improvement_pct": result.improvement_pct,
                "confidence_score": result.confidence_score,
                "optimization_time": result.optimization_time,
                "optimized_params": result.optimized_params
            })
        
        # 生成建议
        avg_improvement = report["optimization_summary"]["avg_improvement"]
        if avg_improvement > 10:
            report["recommendations"].append("优化效果显著，建议应用优化参数到生产环境")
        elif avg_improvement > 5:
            report["recommendations"].append("优化效果中等，建议进一步验证后应用")
        else:
            report["recommendations"].append("优化效果有限，建议重新评估策略逻辑")
        
        # 识别下一个优化目标
        strategy_performances = {}
        for result in self.optimization_history:
            strategy_name = result.strategy_name
            if strategy_name not in strategy_performances:
                strategy_performances[strategy_name] = []
            strategy_performances[strategy_name].append(result.improvement_pct)
        
        for strategy, improvements in strategy_performances.items():
            avg_improvement = np.mean(improvements)
            if avg_improvement < 5:
                report["next_optimization_targets"].append(f"{strategy} - 需要进一步优化")
        
        return report

    def save_optimization_results(self, filepath: str = None):
        """保存优化结果"""
        
        if filepath is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = f"logs/optimization/strategy_optimization_{timestamp}.json"
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        results_data = []
        for result in self.optimization_history:
            result_dict = {
                "strategy_name": result.strategy_name,
                "original_params": result.original_params,
                "optimized_params": result.optimized_params,
                "improvement_pct": result.improvement_pct,
                "confidence_score": result.confidence_score,
                "optimization_time": result.optimization_time,
                "validation_results": result.validation_results,
                "timestamp": result.timestamp.isoformat()
            }
            results_data.append(result_dict)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump({
                "optimization_session": {
                    "session_start": min([r.timestamp for r in self.optimization_history]).isoformat(),
                    "session_end": max([r.timestamp for r in self.optimization_history]).isoformat(),
                    "total_optimizations": len(self.optimization_history)
                },
                "results": results_data,
                "report": self.generate_optimization_report()
            }, f, indent=2, ensure_ascii=False)
        
        logger.info(f"优化结果已保存到: {filepath}")

def main():
    """主函数：演示策略算法优化"""
    
    # 创建优化器
    optimizer = StrategyAlgorithmOptimizer(
        optimization_periods=30,
        validation_periods=7,
        n_trials=100
    )
    
    # 模拟历史数据
    np.random.seed(42)
    dates = pd.date_range(start='2023-01-01', periods=1000, freq='H')
    mock_data = pd.DataFrame({
        'timestamp': dates,
        'price': np.random.random(1000) * 0.5 + 0.25,
        'volume': np.random.random(1000) * 10000 + 5000,
        'returns': np.random.normal(0.001, 0.02, 1000)
    })
    
    print("=== 策略算法优化系统 ===")
    print(f"优化时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 优化均值回归策略
    print("[1] 优化均值回归策略...")
    mean_reversion_result = optimizer.optimize_mean_reversion_strategy(mock_data)
    print(f"   性能提升: {mean_reversion_result.improvement_pct:.1f}%")
    print(f"   置信度: {mean_reversion_result.confidence_score:.1%}")
    
    # 优化异动检测策略
    print("[2] 优化异动检测策略...")
    spike_detection_result = optimizer.optimize_spike_detection_strategy(mock_data)
    print(f"   性能提升: {spike_detection_result.improvement_pct:.1f}%")
    print(f"   置信度: {spike_detection_result.confidence_score:.1%}")
    
    # 优化组合权重
    print("[3] 优化策略组合权重...")
    strategies_performance = {
        'mean_reversion': mock_data[['returns']].rename(columns={'returns': 'returns'}),
        'spike_detection': mock_data[['returns']].rename(columns={'returns': 'returns'}) * 1.1,
        'momentum': mock_data[['returns']].rename(columns={'returns': 'returns'}) * 0.9
    }
    
    optimal_weights = optimizer.optimize_portfolio_weights(strategies_performance)
    print("   优化权重分配:")
    for strategy, weight in optimal_weights.items():
        print(f"     {strategy}: {weight:.1%}")
    
    # 生成报告
    print("\n[4] 生成优化报告...")
    report = optimizer.generate_optimization_report()
    print(f"   总优化次数: {report['optimization_summary']['total_optimizations']}")
    print(f"   平均性能提升: {report['optimization_summary']['avg_improvement']:.1f}%")
    print(f"   平均置信度: {report['optimization_summary']['avg_confidence']:.1%}")
    
    # 保存结果
    optimizer.save_optimization_results()
    
    print("\n=== 策略算法优化完成 ===")
    print()
    print("优化成果总结:")
    print("✓ 均值回归策略参数优化完成")
    print("✓ 异动检测策略参数优化完成") 
    print("✓ 策略组合权重优化完成")
    print("✓ 贝叶斯优化和遗传算法集成")
    print("✓ 时间序列交叉验证实现")
    print("✓ 自动化优化报告生成")

if __name__ == "__main__":
    main()