"""
结果可视化模块
生成各种分析图表
"""

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List, Tuple
import os
from datetime import datetime

# 可选依赖
try:
    import seaborn as sns
    HAS_SEABORN = True
except ImportError:
    HAS_SEABORN = False
    print("警告: seaborn未安装，某些图表样式可能不可用")

try:
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.subplots import make_subplots
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False
    print("警告: plotly未安装，交互式图表将不可用")


class ResultVisualizer:
    """结果可视化器"""
    
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        self.setup_matplotlib()
    
    def setup_matplotlib(self):
        """设置matplotlib"""
        plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
        plt.rcParams['axes.unicode_minus'] = False
        if HAS_SEABORN:
            plt.style.use('seaborn-v0_8')
        else:
            plt.style.use('default')
    
    def plot_pnl_curves(self, results: Dict[str, Any], save_plot: bool = True) -> Optional[str]:
        """绘制PNL曲线"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
        individual_results = results.get('individual_results', [])
        if not individual_results:
            print("❌ 没有回测结果可绘制")
            return None
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # 子图1: 所有路径的PNL曲线
        ax1 = axes[0, 0]
        for i, result in enumerate(individual_results[:10]):  # 最多显示10条路径
            ax1.plot(result['times'], result['pnl'], alpha=0.7, linewidth=0.8)
        
        ax1.set_xlabel('时间')
        ax1.set_ylabel('PNL')
        ax1.set_title('PNL曲线对比')
        ax1.grid(True, alpha=0.3)
        
        # 子图2: 平均PNL曲线
        ax2 = axes[0, 1]
        all_times = [result['times'] for result in individual_results]
        all_pnls = [result['pnl'] for result in individual_results]
        
        min_length = min(len(pnl) for pnl in all_pnls)
        avg_pnl = np.mean([pnl[:min_length] for pnl in all_pnls], axis=0)
        avg_times = np.mean([times[:min_length] for times in all_times], axis=0)
        
        ax2.plot(avg_times, avg_pnl, 'r-', linewidth=2, label='平均PNL')
        ax2.set_xlabel('时间')
        ax2.set_ylabel('PNL')
        ax2.set_title('平均PNL曲线')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        # 子图3: 最终PNL分布
        ax3 = axes[1, 0]
        final_pnls = [result['final_pnl'] for result in individual_results]
        ax3.hist(final_pnls, bins=20, alpha=0.7, edgecolor='black')
        ax3.axvline(np.mean(final_pnls), color='r', linestyle='--', 
                   label=f'平均值: {np.mean(final_pnls):.2f}')
        ax3.set_xlabel('最终PNL')
        ax3.set_ylabel('频次')
        ax3.set_title('最终PNL分布')
        ax3.legend()
        ax3.grid(True, alpha=0.3)
        
        # 子图4: 夏普比率分布
        ax4 = axes[1, 1]
        sharpe_ratios = [result['sharpe_ratio'] for result in individual_results]
        ax4.hist(sharpe_ratios, bins=20, alpha=0.7, edgecolor='black')
        ax4.axvline(np.mean(sharpe_ratios), color='r', linestyle='--',
                   label=f'平均值: {np.mean(sharpe_ratios):.2f}')
        ax4.set_xlabel('夏普比率')
        ax4.set_ylabel('频次')
        ax4.set_title('夏普比率分布')
        ax4.legend()
        ax4.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_plot:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.output_dir}/pnl_analysis_{timestamp}.png"
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            print(f"✓ PNL分析图已保存到: {filename}")
            plt.show()
            return filename
        else:
            plt.show()
            return None
    
    def plot_price_paths(self, results: Dict[str, Any], n_paths: int = 10, save_plot: bool = True) -> Optional[str]:
        """绘制价格路径"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
        individual_results = results.get('individual_results', [])
        if not individual_results:
            print("❌ 没有回测结果可绘制")
            return None
        
        plt.figure(figsize=(12, 8))
        
        # 绘制价格路径
        for i, result in enumerate(individual_results[:n_paths]):
            plt.plot(result['times'], result['prices'], alpha=0.7, linewidth=0.8)
        
        # 绘制平均价格路径
        all_times = [result['times'] for result in individual_results]
        all_prices = [result['prices'] for result in individual_results]
        
        min_length = min(len(prices) for prices in all_prices)
        avg_prices = np.mean([prices[:min_length] for prices in all_prices], axis=0)
        avg_times = np.mean([times[:min_length] for times in all_times], axis=0)
        
        plt.plot(avg_times, avg_prices, 'r-', linewidth=2, label='平均价格路径')
        
        plt.xlabel('时间')
        plt.ylabel('价格')
        plt.title(f'价格路径分析 (显示{n_paths}条路径)')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        if save_plot:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.output_dir}/price_paths_{timestamp}.png"
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            print(f"✓ 价格路径图已保存到: {filename}")
            plt.show()
            return filename
        else:
            plt.show()
            return None
    
    def plot_risk_metrics(self, results: Dict[str, Any], save_plot: bool = True) -> Optional[str]:
        """绘制风险指标"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
        individual_results = results.get('individual_results', [])
        if not individual_results:
            print("❌ 没有回测结果可绘制")
            return None
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # 子图1: 最大回撤分布
        ax1 = axes[0, 0]
        max_drawdowns = [result['max_drawdown'] for result in individual_results]
        ax1.hist(max_drawdowns, bins=20, alpha=0.7, edgecolor='black')
        ax1.axvline(np.mean(max_drawdowns), color='r', linestyle='--',
                   label=f'平均值: {np.mean(max_drawdowns):.2f}')
        ax1.set_xlabel('最大回撤')
        ax1.set_ylabel('频次')
        ax1.set_title('最大回撤分布')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # 子图2: PNL vs 最大回撤散点图
        ax2 = axes[0, 1]
        final_pnls = [result['final_pnl'] for result in individual_results]
        ax2.scatter(max_drawdowns, final_pnls, alpha=0.6)
        ax2.set_xlabel('最大回撤')
        ax2.set_ylabel('最终PNL')
        ax2.set_title('PNL vs 最大回撤')
        ax2.grid(True, alpha=0.3)
        
        # 子图3: 夏普比率 vs 最终PNL散点图
        ax3 = axes[1, 0]
        sharpe_ratios = [result['sharpe_ratio'] for result in individual_results]
        ax3.scatter(sharpe_ratios, final_pnls, alpha=0.6)
        ax3.set_xlabel('夏普比率')
        ax3.set_ylabel('最终PNL')
        ax3.set_title('夏普比率 vs 最终PNL')
        ax3.grid(True, alpha=0.3)
        
        # 子图4: 胜率分析
        ax4 = axes[1, 1]
        win_rate = np.mean([pnl > 0 for pnl in final_pnls])
        ax4.bar(['亏损', '盈利'], [1 - win_rate, win_rate], 
               color=['red', 'green'], alpha=0.7)
        ax4.set_ylabel('比例')
        ax4.set_title(f'胜率分析 (胜率: {win_rate:.1%})')
        ax4.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_plot:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.output_dir}/risk_metrics_{timestamp}.png"
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            print(f"✓ 风险指标图已保存到: {filename}")
            plt.show()
            return filename
        else:
            plt.show()
            return None
    
    def plot_strategy_comparison(self, strategy_results: Dict[str, Dict[str, Any]], 
                                save_plot: bool = True) -> Optional[str]:
        """绘制策略对比图"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
        if not strategy_results:
            print("❌ 没有策略结果可对比")
            return None
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        strategy_names = list(strategy_results.keys())
        
        # 子图1: 平均PNL对比
        ax1 = axes[0, 0]
        avg_pnls = [results['summary']['mean_final_pnl'] for results in strategy_results.values()]
        ax1.bar(strategy_names, avg_pnls, alpha=0.7)
        ax1.set_ylabel('平均最终PNL')
        ax1.set_title('策略平均PNL对比')
        ax1.grid(True, alpha=0.3)
        
        # 子图2: 夏普比率对比
        ax2 = axes[0, 1]
        sharpe_ratios = [results['summary']['mean_sharpe_ratio'] for results in strategy_results.values()]
        ax2.bar(strategy_names, sharpe_ratios, alpha=0.7, color='orange')
        ax2.set_ylabel('平均夏普比率')
        ax2.set_title('策略夏普比率对比')
        ax2.grid(True, alpha=0.3)
        
        # 子图3: 最大回撤对比
        ax3 = axes[1, 0]
        max_drawdowns = [results['summary']['mean_max_drawdown'] for results in strategy_results.values()]
        ax3.bar(strategy_names, max_drawdowns, alpha=0.7, color='red')
        ax3.set_ylabel('平均最大回撤')
        ax3.set_title('策略最大回撤对比')
        ax3.grid(True, alpha=0.3)
        
        # 子图4: 胜率对比
        ax4 = axes[1, 1]
        win_rates = [results['summary']['win_rate'] for results in strategy_results.values()]
        ax4.bar(strategy_names, win_rates, alpha=0.7, color='green')
        ax4.set_ylabel('胜率')
        ax4.set_title('策略胜率对比')
        ax4.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_plot:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.output_dir}/strategy_comparison_{timestamp}.png"
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            print(f"✓ 策略对比图已保存到: {filename}")
            plt.show()
            return filename
        else:
            plt.show()
            return None
    
    def create_interactive_plot(self, results: Dict[str, Any], save_html: bool = True) -> Optional[str]:
        """创建交互式图表"""
        if not HAS_PLOTLY:
            print("❌ plotly未安装，无法创建交互式图表")
            return None
            
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
        individual_results = results.get('individual_results', [])
        if not individual_results:
            print("❌ 没有回测结果可绘制")
            return None
        
        # 创建子图
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('PNL曲线', '价格路径', '最终PNL分布', '风险指标'),
            specs=[[{"secondary_y": False}, {"secondary_y": False}],
                   [{"secondary_y": False}, {"secondary_y": False}]]
        )
        
        # 子图1: PNL曲线
        for i, result in enumerate(individual_results[:5]):  # 显示5条路径
            fig.add_trace(
                go.Scatter(x=result['times'], y=result['pnl'], 
                          mode='lines', name=f'路径 {i+1}',
                          opacity=0.7),
                row=1, col=1
            )
        
        # 子图2: 价格路径
        for i, result in enumerate(individual_results[:5]):
            fig.add_trace(
                go.Scatter(x=result['times'], y=result['prices'],
                          mode='lines', name=f'价格 {i+1}',
                          opacity=0.7),
                row=1, col=2
            )
        
        # 子图3: 最终PNL分布
        final_pnls = [result['final_pnl'] for result in individual_results]
        fig.add_trace(
            go.Histogram(x=final_pnls, name='PNL分布', opacity=0.7),
            row=2, col=1
        )
        
        # 子图4: 风险指标雷达图
        avg_pnl = np.mean(final_pnls)
        avg_sharpe = np.mean([result['sharpe_ratio'] for result in individual_results])
        avg_drawdown = np.mean([result['max_drawdown'] for result in individual_results])
        win_rate = np.mean([pnl > 0 for pnl in final_pnls])
        
        fig.add_trace(
            go.Scatter(x=['PNL', '夏普比率', '最大回撤', '胜率'],
                      y=[avg_pnl, avg_sharpe, abs(avg_drawdown), win_rate],
                      mode='markers+lines', name='风险指标',
                      marker=dict(size=10)),
            row=2, col=2
        )
        
        # 更新布局
        fig.update_layout(
            title_text="Deep BSDE 套利策略回测结果",
            showlegend=True,
            height=800
        )
        
        if save_html:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.output_dir}/interactive_results_{timestamp}.html"
            fig.write_html(filename)
            print(f"✓ 交互式图表已保存到: {filename}")
            return filename
        else:
            fig.show()
            return None


class PlotGenerator:
    """图表生成器"""
    
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        self.visualizer = ResultVisualizer(output_dir)
    
    def generate_all_plots(self, results: Dict[str, Any]) -> Dict[str, str]:
        """生成所有图表"""
        generated_files = {}
        
        # PNL分析图
        pnl_file = self.visualizer.plot_pnl_curves(results, save_plot=True)
        if pnl_file:
            generated_files['pnl_analysis'] = pnl_file
        
        # 价格路径图
        price_file = self.visualizer.plot_price_paths(results, save_plot=True)
        if price_file:
            generated_files['price_paths'] = price_file
        
        # 风险指标图
        risk_file = self.visualizer.plot_risk_metrics(results, save_plot=True)
        if risk_file:
            generated_files['risk_metrics'] = risk_file
        
        # 交互式图表
        interactive_file = self.visualizer.create_interactive_plot(results, save_html=True)
        if interactive_file:
            generated_files['interactive'] = interactive_file
        
        return generated_files
    
    def generate_summary_report(self, results: Dict[str, Any], 
                              strategy_name: str = "Deep BSDE Strategy") -> str:
        """生成汇总报告"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{self.output_dir}/summary_report_{timestamp}.txt"
        
        summary = results.get('summary', {})
        individual_results = results.get('individual_results', [])
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"Deep BSDE 套利策略回测报告\n")
            f.write(f"策略名称: {strategy_name}\n")
            f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 60 + "\n\n")
            
            f.write("回测概要:\n")
            f.write(f"  总路径数: {summary.get('total_paths', 0)}\n")
            f.write(f"  平均最终PNL: {summary.get('mean_final_pnl', 0):.2f}\n")
            f.write(f"  PNL标准差: {summary.get('std_final_pnl', 0):.2f}\n")
            f.write(f"  中位数PNL: {summary.get('median_final_pnl', 0):.2f}\n")
            f.write(f"  最小PNL: {summary.get('min_final_pnl', 0):.2f}\n")
            f.write(f"  最大PNL: {summary.get('max_final_pnl', 0):.2f}\n\n")
            
            f.write("风险指标:\n")
            f.write(f"  平均最大回撤: {summary.get('mean_max_drawdown', 0):.2f}\n")
            f.write(f"  回撤标准差: {summary.get('std_max_drawdown', 0):.2f}\n")
            f.write(f"  平均夏普比率: {summary.get('mean_sharpe_ratio', 0):.4f}\n")
            f.write(f"  夏普比率标准差: {summary.get('std_sharpe_ratio', 0):.4f}\n")
            f.write(f"  胜率: {summary.get('win_rate', 0):.1%}\n")
            f.write(f"  盈利因子: {summary.get('profit_factor', 0):.2f}\n")
            f.write(f"  Calmar比率: {summary.get('calmar_ratio', 0):.2f}\n\n")
            
            f.write("详细结果:\n")
            for i, result in enumerate(individual_results[:10]):  # 显示前10条路径
                f.write(f"  路径 {i+1}:\n")
                f.write(f"    最终PNL: {result.get('final_pnl', 0):.2f}\n")
                f.write(f"    最大回撤: {result.get('max_drawdown', 0):.2f}\n")
                f.write(f"    夏普比率: {result.get('sharpe_ratio', 0):.4f}\n")
                f.write(f"    最优停时: {result.get('optimal_time', 0)}\n")
                f.write(f"    最优价值: {result.get('optimal_value', 0):.4f}\n\n")
        
        print(f"✓ 汇总报告已保存到: {filename}")
        return filename
