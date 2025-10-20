"""
回测引擎实现
负责执行回测和管理投资组合
"""

import torch
import numpy as np
from typing import Dict, Any, Optional, List, Tuple, Union
from tqdm import tqdm
import pandas as pd
from datetime import datetime
import os

from .strategy import BaseStrategy
from .metrics import FinancialMetrics, RiskMetrics, PerformanceMetrics


class BacktestEngine:
    """回测引擎"""
    
    def __init__(self, 
                 strategy: BaseStrategy,
                 device: Optional[torch.device] = None):
        self.strategy = strategy
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.results = {}
        self.summary = {}
    
    def run_backtest(self, 
                    price_paths: Union[torch.Tensor, np.ndarray],
                    Y_seqs: Optional[Union[torch.Tensor, np.ndarray]] = None,
                    **kwargs) -> Dict[str, Any]:
        """
        运行回测
        
        Args:
            price_paths: 价格路径 (batch_size, time_steps, d) 或 (batch_size, time_steps)
            Y_seqs: Y序列 (batch_size, time_steps) 或 None
            **kwargs: 其他参数
            
        Returns:
            backtest_results: 回测结果
        """
        # 转换为numpy数组
        if isinstance(price_paths, torch.Tensor):
            try:
                price_paths = price_paths.cpu().numpy()
            except RuntimeError as e:
                if "Numpy is not available" in str(e):
                    # 处理NumPy兼容性问题
                    price_paths = np.array(price_paths.cpu().tolist())
                else:
                    raise e
        if Y_seqs is not None and isinstance(Y_seqs, torch.Tensor):
            try:
                Y_seqs = Y_seqs.cpu().numpy()
            except RuntimeError as e:
                if "Numpy is not available" in str(e):
                    # 处理NumPy兼容性问题
                    Y_seqs = np.array(Y_seqs.cpu().tolist())
                else:
                    raise e
        
        # 确保price_paths是3维的
        if len(price_paths.shape) == 2:
            price_paths = price_paths.reshape(price_paths.shape[0], price_paths.shape[1], 1)
        
        batch_size = price_paths.shape[0]
        individual_results = []
        
        print(f"开始回测，共 {batch_size} 条路径...")
        
        for i in tqdm(range(batch_size), desc="回测进度"):
            price_path = price_paths[i, :, 0]  # 取第一个资产维度
            Y_seq = Y_seqs[i] if Y_seqs is not None else None
            
            # 执行策略
            result = self.strategy.execute(price_path, Y_seq, **kwargs)
            result['path_id'] = i
            individual_results.append(result)
        
        # 汇总结果
        self.results = {
            'individual_results': individual_results,
            'summary': self._compute_summary(individual_results)
        }
        
        return self.results
    
    def _compute_summary(self, individual_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """计算汇总统计"""
        if not individual_results:
            return {}
        
        # 提取关键指标
        final_pnls = [r.get('final_pnl', 0) for r in individual_results]
        max_drawdowns = [r.get('max_drawdown', 0) for r in individual_results]
        sharpe_ratios = [r.get('sharpe_ratio', 0) for r in individual_results]
        
        # 计算统计量
        summary = {
            'total_paths': len(individual_results),
            'mean_final_pnl': np.mean(final_pnls),
            'std_final_pnl': np.std(final_pnls),
            'median_final_pnl': np.median(final_pnls),
            'min_final_pnl': np.min(final_pnls),
            'max_final_pnl': np.max(final_pnls),
            'mean_max_drawdown': np.mean(max_drawdowns),
            'std_max_drawdown': np.std(max_drawdowns),
            'mean_sharpe_ratio': np.mean(sharpe_ratios),
            'std_sharpe_ratio': np.std(sharpe_ratios),
            'win_rate': np.mean([pnl > 0 for pnl in final_pnls]),
            'profit_factor': self._calculate_profit_factor(final_pnls),
            'calmar_ratio': self._calculate_calmar_ratio(final_pnls, max_drawdowns)
        }
        
        return summary
    
    def _calculate_profit_factor(self, pnls: List[float]) -> float:
        """计算盈利因子"""
        profits = [pnl for pnl in pnls if pnl > 0]
        losses = [abs(pnl) for pnl in pnls if pnl < 0]
        
        if not losses:
            return float('inf') if profits else 0.0
        
        total_profit = sum(profits) if profits else 0.0
        total_loss = sum(losses)
        
        return total_profit / total_loss if total_loss > 0 else 0.0
    
    def _calculate_calmar_ratio(self, pnls: List[float], drawdowns: List[float]) -> float:
        """计算Calmar比率"""
        if not pnls or not drawdowns:
            return 0.0
        
        annual_return = np.mean(pnls) * 252  # 假设日数据
        max_drawdown = abs(min(drawdowns))
        
        return annual_return / max_drawdown if max_drawdown > 0 else 0.0
    
    def save_results(self, output_dir: str = "output", filename_prefix: str = "backtest_results") -> Dict[str, str]:
        """保存回测结果"""
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        saved_files = {}
        
        # 保存汇总结果
        summary_df = pd.DataFrame([self.results['summary']])
        summary_filename = f"{output_dir}/{filename_prefix}_summary_{timestamp}.csv"
        summary_df.to_csv(summary_filename, index=False)
        saved_files['summary'] = summary_filename
        
        # 保存详细结果
        detailed_data = []
        for result in self.results['individual_results']:
            path_id = result['path_id']
            time_steps = result['time_steps']
            times = result['times']
            prices = result['prices']
            pnl = result['pnl']
            portfolio_values = result['portfolio_values']
            
            for t in range(len(time_steps)):
                detailed_data.append({
                    'path_id': path_id,
                    'time_step': time_steps[t],
                    'time': times[t],
                    'price': prices[t],
                    'pnl': pnl[t],
                    'portfolio_value': portfolio_values[t],
                    'final_pnl': result['final_pnl'],
                    'max_drawdown': result['max_drawdown'],
                    'sharpe_ratio': result['sharpe_ratio']
                })
        
        detailed_df = pd.DataFrame(detailed_data)
        detailed_filename = f"{output_dir}/{filename_prefix}_detailed_{timestamp}.csv"
        detailed_df.to_csv(detailed_filename, index=False)
        saved_files['detailed'] = detailed_filename
        
        return saved_files
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """获取性能指标"""
        if not self.results:
            return {}
        
        individual_results = self.results['individual_results']
        
        # 计算高级指标
        metrics = FinancialMetrics()
        risk_metrics = RiskMetrics()
        performance_metrics = PerformanceMetrics()
        
        # 提取所有PNL序列
        all_pnls = [result['pnl'] for result in individual_results]
        all_final_pnls = [result['final_pnl'] for result in individual_results]
        
        # 计算指标
        performance_data = {
            'total_return': np.mean(all_final_pnls),
            'volatility': np.std(all_final_pnls),
            'sharpe_ratio': metrics.calculate_sharpe_ratio(all_final_pnls),
            'max_drawdown': risk_metrics.calculate_max_drawdown(all_pnls),
            'var_95': risk_metrics.calculate_var(all_final_pnls, 0.05),
            'expected_shortfall': risk_metrics.calculate_expected_shortfall(all_final_pnls, 0.05),
            'calmar_ratio': performance_metrics.calculate_calmar_ratio(all_final_pnls),
            'sortino_ratio': performance_metrics.calculate_sortino_ratio(all_final_pnls),
            'omega_ratio': performance_metrics.calculate_omega_ratio(all_final_pnls)
        }
        
        return performance_data


class PortfolioEngine:
    """投资组合引擎"""
    
    def __init__(self, 
                 strategies: List[BaseStrategy],
                 weights: Optional[List[float]] = None,
                 device: Optional[torch.device] = None):
        self.strategies = strategies
        self.weights = weights or [1.0 / len(strategies)] * len(strategies)
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        if len(self.weights) != len(self.strategies):
            raise ValueError("权重数量必须与策略数量相等")
        
        # 归一化权重
        total_weight = sum(self.weights)
        self.weights = [w / total_weight for w in self.weights]
    
    def run_portfolio_backtest(self, 
                              price_paths: Union[torch.Tensor, np.ndarray],
                              Y_seqs: Optional[Union[torch.Tensor, np.ndarray]] = None,
                              **kwargs) -> Dict[str, Any]:
        """运行投资组合回测"""
        # 转换为numpy数组
        if isinstance(price_paths, torch.Tensor):
            try:
                price_paths = price_paths.cpu().numpy()
            except RuntimeError as e:
                if "Numpy is not available" in str(e):
                    # 处理NumPy兼容性问题
                    price_paths = np.array(price_paths.cpu().tolist())
                else:
                    raise e
        if Y_seqs is not None and isinstance(Y_seqs, torch.Tensor):
            try:
                Y_seqs = Y_seqs.cpu().numpy()
            except RuntimeError as e:
                if "Numpy is not available" in str(e):
                    # 处理NumPy兼容性问题
                    Y_seqs = np.array(Y_seqs.cpu().tolist())
                else:
                    raise e
        
        batch_size = price_paths.shape[0]
        portfolio_results = []
        
        print(f"开始投资组合回测，共 {batch_size} 条路径，{len(self.strategies)} 个策略...")
        
        for i in tqdm(range(batch_size), desc="投资组合回测进度"):
            price_path = price_paths[i, :, 0]
            Y_seq = Y_seqs[i] if Y_seqs is not None else None
            
            # 运行各个策略
            strategy_results = []
            for j, strategy in enumerate(self.strategies):
                result = strategy.execute(price_path, Y_seq, **kwargs)
                strategy_results.append(result)
            
            # 组合结果
            portfolio_result = self._combine_strategy_results(strategy_results, i)
            portfolio_results.append(portfolio_result)
        
        # 汇总结果
        portfolio_summary = self._compute_portfolio_summary(portfolio_results)
        
        return {
            'individual_results': portfolio_results,
            'strategy_results': [self._extract_strategy_results(portfolio_results, i) 
                                for i in range(len(self.strategies))],
            'summary': portfolio_summary
        }
    
    def _combine_strategy_results(self, strategy_results: List[Dict[str, Any]], path_id: int) -> Dict[str, Any]:
        """组合策略结果"""
        # 计算加权组合价值
        weighted_pnl = sum(result['pnl'][-1] * weight 
                          for result, weight in zip(strategy_results, self.weights))
        
        # 计算加权组合价值序列
        time_steps = len(strategy_results[0]['pnl'])
        weighted_pnl_series = []
        
        for t in range(time_steps):
            weighted_pnl_t = sum(result['pnl'][t] * weight 
                               for result, weight in zip(strategy_results, self.weights))
            weighted_pnl_series.append(weighted_pnl_t)
        
        # 计算组合指标
        final_pnl = weighted_pnl_series[-1]
        max_drawdown = min(weighted_pnl_series)
        sharpe_ratio = self._calculate_sharpe_ratio(weighted_pnl_series)
        
        return {
            'path_id': path_id,
            'time_steps': strategy_results[0]['time_steps'],
            'times': strategy_results[0]['times'],
            'prices': strategy_results[0]['prices'],
            'pnl': weighted_pnl_series,
            'final_pnl': final_pnl,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe_ratio,
            'strategy_weights': self.weights,
            'strategy_final_pnls': [result['final_pnl'] for result in strategy_results]
        }
    
    def _compute_portfolio_summary(self, portfolio_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """计算投资组合汇总统计"""
        if not portfolio_results:
            return {}
        
        final_pnls = [r['final_pnl'] for r in portfolio_results]
        max_drawdowns = [r['max_drawdown'] for r in portfolio_results]
        sharpe_ratios = [r['sharpe_ratio'] for r in portfolio_results]
        
        summary = {
            'total_paths': len(portfolio_results),
            'strategy_count': len(self.strategies),
            'strategy_weights': self.weights,
            'mean_final_pnl': np.mean(final_pnls),
            'std_final_pnl': np.std(final_pnls),
            'median_final_pnl': np.median(final_pnls),
            'min_final_pnl': np.min(final_pnls),
            'max_final_pnl': np.max(final_pnls),
            'mean_max_drawdown': np.mean(max_drawdowns),
            'mean_sharpe_ratio': np.mean(sharpe_ratios),
            'win_rate': np.mean([pnl > 0 for pnl in final_pnls]),
            'diversification_ratio': self._calculate_diversification_ratio(portfolio_results)
        }
        
        return summary
    
    def _extract_strategy_results(self, portfolio_results: List[Dict[str, Any]], strategy_idx: int) -> List[Dict[str, Any]]:
        """提取单个策略的结果"""
        strategy_results = []
        for result in portfolio_results:
            strategy_result = {
                'path_id': result['path_id'],
                'final_pnl': result['strategy_final_pnls'][strategy_idx],
                'weight': result['strategy_weights'][strategy_idx]
            }
            strategy_results.append(strategy_result)
        
        return strategy_results
    
    def _calculate_diversification_ratio(self, portfolio_results: List[Dict[str, Any]]) -> float:
        """计算分散化比率"""
        if len(self.strategies) <= 1:
            return 1.0
        
        # 计算各策略的收益率
        strategy_returns = []
        for i in range(len(self.strategies)):
            strategy_pnls = [result['strategy_final_pnls'][i] for result in portfolio_results]
            strategy_returns.append(strategy_pnls)
        
        # 计算加权平均收益率
        weighted_returns = []
        for j in range(len(portfolio_results)):
            weighted_return = sum(strategy_returns[i][j] * self.weights[i] 
                                 for i in range(len(self.strategies)))
            weighted_returns.append(weighted_return)
        
        # 计算分散化比率
        portfolio_vol = np.std(weighted_returns)
        weighted_vol = sum(np.std(strategy_returns[i]) * self.weights[i] 
                          for i in range(len(self.strategies)))
        
        return weighted_vol / portfolio_vol if portfolio_vol > 0 else 1.0
    
    def _calculate_sharpe_ratio(self, pnl: List[float]) -> float:
        """计算夏普比率"""
        if len(pnl) < 2:
            return 0.0
        
        pnl_returns = np.diff(pnl)
        if len(pnl_returns) == 0 or np.std(pnl_returns) == 0:
            return 0.0
        
        return np.mean(pnl_returns) / np.std(pnl_returns) * np.sqrt(252)
