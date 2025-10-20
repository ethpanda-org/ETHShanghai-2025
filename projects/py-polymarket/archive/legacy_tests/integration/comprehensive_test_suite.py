#!/usr/bin/env python3
"""
完整的交易系统综合测试套件
包含功能测试、性能测试、代码质量分析
"""

import cProfile
import gc
import io
import os
import pstats
import ssl
import sys
import threading
import time
import types
from concurrent.futures import ThreadPoolExecutor
from core.data_collector import AsyncDataCollector
from core.models import DQNAgent, LSTMTrader, TradingSystem
from core.risk_manager import RiskEngine
from core.strategy import ArbitrageStrategy, MarketMakingStrategy

import aiohttp
import asyncio
import json
import numpy as np
import unittest
from unittest.mock import Mock

import memory_profiler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))

import unittest
import asyncio
import aiohttp
import ssl
import time
import memory_profiler
import cProfile
import pstats
import io
from unittest.mock import Mock
import numpy as np
import json
from concurrent.futures import ThreadPoolExecutor
import threading
import gc

# 配置设置
OFFLINE_CONFIG = {
    'OFFLINE_MODE': True,
    'PROXY_URL': None
}

ONLINE_CONFIG = {
    'OFFLINE_MODE': False, 
    'PROXY_URL': 'http://brd-customer-hl_74a6e114-zone-residential_proxy1:dddh9tsmw3zh@brd.superproxy.io:33335'
}

class PerformanceTestSuite:
    """性能测试套件"""
    
    def __init__(self):
        self.results = {}
        self.setup_modules()
    
    def setup_modules(self):
        """设置测试模块"""
        import types
        
        # 创建离线配置
        config_module = types.ModuleType('config')
        config_module.settings = type('Settings', (), OFFLINE_CONFIG)()
        sys.modules['config'] = config_module
        
        # 创建工具模块
        utils_module = types.ModuleType('utils')
        proxy_manager_module = types.ModuleType('proxy_manager')
        proxy_manager_module.ProxyManager = Mock()
        utils_module.proxy_manager = proxy_manager_module
        sys.modules['utils'] = utils_module
        sys.modules['utils.proxy_manager'] = proxy_manager_module
        
        # 导入核心模块
        from core.data_collector import AsyncDataCollector
        from core.models import LSTMTrader, DQNAgent, TradingSystem
        from core.risk_manager import RiskEngine
        from core.strategy import MarketMakingStrategy, ArbitrageStrategy
        
        self.modules = {
            'AsyncDataCollector': AsyncDataCollector,
            'LSTMTrader': LSTMTrader,
            'DQNAgent': DQNAgent, 
            'TradingSystem': TradingSystem,
            'RiskEngine': RiskEngine,
            'MarketMakingStrategy': MarketMakingStrategy,
            'ArbitrageStrategy': ArbitrageStrategy
        }

    def run_functionality_tests(self):
        """运行功能测试"""
        print("🧪 运行功能测试...")
        start_time = time.time()
        
        # 测试数据收集器
        collector = self.modules['AsyncDataCollector']()
        
        # 离线模式测试
        offline_tests = {
            'market_data_fetch': self._test_market_data_fetch(collector),
            'order_book_fetch': self._test_order_book_fetch(collector),
            'sync_method': self._test_sync_method(collector)
        }
        
        # 测试风险管理
        risk_engine = self.modules['RiskEngine']()
        risk_tests = {
            'var_calculation': self._test_var_calculation(risk_engine),
            'liquidity_check': self._test_liquidity_check(risk_engine),
            'order_validation': self._test_order_validation(risk_engine)
        }
        
        # 测试交易策略
        market_making = self.modules['MarketMakingStrategy'](spread=0.02, balance=10000)
        arbitrage = self.modules['ArbitrageStrategy'](threshold=0.05)
        
        strategy_tests = {
            'market_making_orders': self._test_market_making(market_making),
            'arbitrage_detection': self._test_arbitrage(arbitrage),
            'position_sizing': self._test_position_sizing(market_making)
        }
        
        end_time = time.time()
        
        self.results['functionality'] = {
            'offline_tests': offline_tests,
            'risk_tests': risk_tests,
            'strategy_tests': strategy_tests,
            'total_time': end_time - start_time,
            'success_rate': self._calculate_success_rate([offline_tests, risk_tests, strategy_tests])
        }
        
        print(f"✅ 功能测试完成 ({end_time - start_time:.2f}s)")
        return self.results['functionality']

    def run_performance_benchmarks(self):
        """运行性能基准测试"""
        print("⚡ 运行性能基准测试...")
        start_time = time.time()
        
        # 内存使用测试
        memory_before = memory_profiler.memory_usage()[0]
        
        # CPU密集型测试
        cpu_results = self._benchmark_cpu_intensive_operations()
        
        # I/O密集型测试  
        io_results = self._benchmark_io_operations()
        
        # 并发测试
        concurrency_results = self._benchmark_concurrency()
        
        # 内存测试
        memory_after = memory_profiler.memory_usage()[0]
        memory_usage = memory_after - memory_before
        
        end_time = time.time()
        
        self.results['performance'] = {
            'cpu_benchmarks': cpu_results,
            'io_benchmarks': io_results,
            'concurrency_benchmarks': concurrency_results,
            'memory_usage': memory_usage,
            'total_time': end_time - start_time
        }
        
        print(f"✅ 性能测试完成 ({end_time - start_time:.2f}s)")
        return self.results['performance']

    def run_code_quality_analysis(self):
        """代码质量分析"""
        print("🔍 代码质量分析...")
        start_time = time.time()
        
        # 分析代码结构
        code_metrics = self._analyze_code_structure()
        
        # 分析复杂度
        complexity_metrics = self._analyze_complexity()
        
        # 分析依赖关系
        dependency_metrics = self._analyze_dependencies()
        
        end_time = time.time()
        
        self.results['code_quality'] = {
            'structure_metrics': code_metrics,
            'complexity_metrics': complexity_metrics,
            'dependency_metrics': dependency_metrics,
            'analysis_time': end_time - start_time
        }
        
        print(f"✅ 代码质量分析完成 ({end_time - start_time:.2f}s)")
        return self.results['code_quality']

    def _test_market_data_fetch(self, collector):
        """测试市场数据获取"""
        try:
            markets = asyncio.run(collector.fetch_markets())
            return {
                'success': True,
                'data_count': len(markets),
                'data_structure_valid': all(key in markets[0] for key in ['market_id', 'bid', 'ask']) if markets else False
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _test_order_book_fetch(self, collector):
        """测试订单簿获取"""
        try:
            order_book = asyncio.run(collector.fetch_order_book("test_market"))
            return {
                'success': True,
                'has_bids': 'bids' in order_book,
                'has_asks': 'asks' in order_book
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _test_sync_method(self, collector):
        """测试同步方法"""
        try:
            markets = collector.fetch_all_active_market_data()
            return {
                'success': True,
                'data_count': len(markets)
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _test_var_calculation(self, risk_engine):
        """测试VaR计算"""
        try:
            order = {'size': 100}
            portfolio = {
                'returns': np.random.normal(0, 0.01, 200),
                'balance': 10000
            }
            result = risk_engine._calculate_var(order, portfolio)
            return {
                'success': True,
                'result_type': type(result).__name__,
                'is_boolean': isinstance(result, bool)
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _test_liquidity_check(self, risk_engine):
        """测试流动性检查"""
        try:
            order = {'size': 500}
            portfolio = {'balance': 10000}
            result = risk_engine._check_liquidity(order, portfolio)
            return {
                'success': True,
                'result': result,
                'expected': True  # 5% < 10%
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _test_order_validation(self, risk_engine):
        """测试订单验证"""
        try:
            order = {'size': 100}
            portfolio = {
                'returns': np.random.normal(0, 0.01, 100),
                'balance': 10000
            }
            result = risk_engine.validate_order(order, portfolio)
            return {
                'success': True,
                'validation_passed': result
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _test_market_making(self, strategy):
        """测试做市策略"""
        try:
            market_data = {
                'bid': 0.45,
                'ask': 0.55,
                'high': 0.6,
                'low': 0.4,
                'market_id': 'TEST-1'
            }
            orders = strategy.generate_orders(market_data)
            return {
                'success': True,
                'has_action': 'action' in orders,
                'has_prices': all(key in orders for key in ['bid', 'ask']),
                'spread_correct': orders['ask'] > orders['bid']
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _test_arbitrage(self, strategy):
        """测试套利策略"""
        try:
            market_a = {'price': 0.45, 'market_id': 'MARKET-A'}
            market_b = {'price': 0.55, 'market_id': 'MARKET-B'}
            opportunity = strategy.find_opportunities(market_a, market_b)
            return {
                'success': True,
                'opportunity_found': opportunity is not None,
                'correct_direction': opportunity['buy_market'] == 'MARKET-A' if opportunity else None
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _test_position_sizing(self, strategy):
        """测试头寸计算"""
        try:
            market_data = {'high': 0.6, 'low': 0.4, 'bid': 0.45, 'ask': 0.55}
            size = strategy._calculate_position_size(market_data)
            return {
                'success': True,
                'size_positive': size > 0,
                'size_reasonable': 0 < size < 10000
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _benchmark_cpu_intensive_operations(self):
        """CPU密集型操作基准测试"""
        results = {}
        
        # 测试NumPy数组操作
        start = time.time()
        large_array = np.random.random((1000, 1000))
        matrix_mult = np.dot(large_array, large_array)
        results['numpy_matrix_mult'] = time.time() - start
        
        # 测试风险计算
        start = time.time()
        for _ in range(1000):
            returns = np.random.normal(0, 0.01, 100)
            var = np.percentile(returns, 5)
        results['var_calculations_1000x'] = time.time() - start
        
        # 测试策略计算
        start = time.time()
        strategy = self.modules['MarketMakingStrategy']()
        for _ in range(1000):
            market_data = {
                'bid': np.random.uniform(0.4, 0.6),
                'ask': np.random.uniform(0.6, 0.8),
                'high': 0.8,
                'low': 0.4
            }
            orders = strategy.generate_orders(market_data)
        results['strategy_calculations_1000x'] = time.time() - start
        
        return results

    def _benchmark_io_operations(self):
        """I/O操作基准测试"""
        results = {}
        
        # 测试异步市场数据获取
        start = time.time()
        collector = self.modules['AsyncDataCollector']()
        for _ in range(10):
            markets = asyncio.run(collector.fetch_markets())
        results['market_data_fetch_10x'] = time.time() - start
        
        # 测试同步方法性能
        start = time.time()
        for _ in range(10):
            markets = collector.fetch_all_active_market_data()
        results['sync_method_10x'] = time.time() - start
        
        return results

    def _benchmark_concurrency(self):
        """并发性能测试"""
        results = {}
        
        # 测试异步并发
        async def concurrent_fetch():
            collector = self.modules['AsyncDataCollector']()
            tasks = [collector.fetch_markets() for _ in range(10)]
            return await asyncio.gather(*tasks)
        
        start = time.time()
        results_list = asyncio.run(concurrent_fetch())
        results['async_concurrent_fetch'] = time.time() - start
        
        # 测试线程池并发
        def sync_task():
            collector = self.modules['AsyncDataCollector']()
            return collector.fetch_all_active_market_data()
        
        start = time.time()
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(sync_task) for _ in range(10)]
            thread_results = [f.result() for f in futures]
        results['thread_pool_concurrent'] = time.time() - start
        
        return results

    def _analyze_code_structure(self):
        """分析代码结构"""
        metrics = {}
        
        # 分析文件大小
        core_files = ['data_collector.py', 'models.py', 'risk_manager.py', 'strategy.py']
        file_sizes = {}
        
        for file in core_files:
            file_path = os.path.join('core', file)
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    lines = f.readlines()
                    file_sizes[file] = {
                        'total_lines': len(lines),
                        'code_lines': len([l for l in lines if l.strip() and not l.strip().startswith('#')]),
                        'comment_lines': len([l for l in lines if l.strip().startswith('#')])
                    }
        
        metrics['file_metrics'] = file_sizes
        
        # 分析类和函数数量
        module_analysis = {}
        for name, module_class in self.modules.items():
            if hasattr(module_class, '__dict__'):
                methods = [attr for attr in dir(module_class) if not attr.startswith('_')]
                module_analysis[name] = {
                    'public_methods': len(methods),
                    'total_attributes': len(dir(module_class))
                }
        
        metrics['module_analysis'] = module_analysis
        
        return metrics

    def _analyze_complexity(self):
        """分析代码复杂度"""
        metrics = {}
        
        # 简单的复杂度度量
        complexity_scores = {}
        
        # 分析各模块的估算复杂度
        for name, module_class in self.modules.items():
            score = 0
            methods = [attr for attr in dir(module_class) if not attr.startswith('_')]
            
            # 基于方法数量的复杂度
            score += len(methods) * 2
            
            # 基于继承的复杂度
            if hasattr(module_class, '__bases__'):
                score += len(module_class.__bases__) * 5
            
            complexity_scores[name] = score
        
        metrics['complexity_scores'] = complexity_scores
        metrics['average_complexity'] = np.mean(list(complexity_scores.values()))
        
        return metrics

    def _analyze_dependencies(self):
        """分析依赖关系"""
        metrics = {}
        
        # 分析import依赖
        import_counts = {}
        
        core_files = ['data_collector.py', 'models.py', 'risk_manager.py', 'strategy.py']
        
        for file in core_files:
            file_path = os.path.join('core', file)
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    content = f.read()
                    import_lines = [line for line in content.split('\n') if line.strip().startswith('import') or line.strip().startswith('from')]
                    import_counts[file] = len(import_lines)
        
        metrics['import_dependencies'] = import_counts
        metrics['average_imports'] = np.mean(list(import_counts.values())) if import_counts else 0
        
        return metrics

    def _calculate_success_rate(self, test_groups):
        """计算成功率"""
        total_tests = 0
        successful_tests = 0
        
        for group in test_groups:
            for test_name, result in group.items():
                total_tests += 1
                if isinstance(result, dict) and result.get('success', False):
                    successful_tests += 1
        
        return (successful_tests / total_tests * 100) if total_tests > 0 else 0

    def generate_comprehensive_report(self):
        """生成综合报告"""
        print("\n" + "="*80)
        print("🏁 交易系统综合测试报告")
        print("="*80)
        
        # 功能测试报告
        if 'functionality' in self.results:
            func_results = self.results['functionality']
            print(f"\n📋 功能测试结果:")
            print(f"   成功率: {func_results['success_rate']:.1f}%")
            print(f"   执行时间: {func_results['total_time']:.2f}s")
            
            # 详细结果
            for category, tests in func_results.items():
                if isinstance(tests, dict) and category.endswith('_tests'):
                    print(f"\n   {category.replace('_', ' ').title()}:")
                    for test_name, result in tests.items():
                        if isinstance(result, dict):
                            status = "✅" if result.get('success', False) else "❌"
                            print(f"     {status} {test_name}")
        
        # 性能测试报告
        if 'performance' in self.results:
            perf_results = self.results['performance']
            print(f"\n⚡ 性能测试结果:")
            print(f"   总执行时间: {perf_results['total_time']:.2f}s")
            print(f"   内存使用: {perf_results['memory_usage']:.2f} MB")
            
            print(f"\n   CPU基准测试:")
            for test_name, time_taken in perf_results['cpu_benchmarks'].items():
                print(f"     {test_name}: {time_taken:.4f}s")
            
            print(f"\n   I/O基准测试:")
            for test_name, time_taken in perf_results['io_benchmarks'].items():
                print(f"     {test_name}: {time_taken:.4f}s")
            
            print(f"\n   并发测试:")
            for test_name, time_taken in perf_results['concurrency_benchmarks'].items():
                print(f"     {test_name}: {time_taken:.4f}s")
        
        # 代码质量报告
        if 'code_quality' in self.results:
            quality_results = self.results['code_quality']
            print(f"\n🔍 代码质量分析:")
            print(f"   分析时间: {quality_results['analysis_time']:.2f}s")
            
            # 文件结构
            if 'file_metrics' in quality_results['structure_metrics']:
                print(f"\n   文件结构分析:")
                for file, metrics in quality_results['structure_metrics']['file_metrics'].items():
                    print(f"     {file}: {metrics['total_lines']} 行 ({metrics['code_lines']} 代码, {metrics['comment_lines']} 注释)")
            
            # 复杂度分析
            if 'complexity_scores' in quality_results['complexity_metrics']:
                print(f"\n   复杂度分析:")
                print(f"     平均复杂度: {quality_results['complexity_metrics']['average_complexity']:.1f}")
                for module, score in quality_results['complexity_metrics']['complexity_scores'].items():
                    print(f"     {module}: {score}")
        
        # 性能优化建议
        self._generate_optimization_recommendations()
        
        print("="*80)

    def _generate_optimization_recommendations(self):
        """生成优化建议"""
        print(f"\n💡 性能优化建议:")
        
        recommendations = []
        
        if 'performance' in self.results:
            perf_results = self.results['performance']
            
            # 内存优化建议
            if perf_results['memory_usage'] > 50:
                recommendations.append("内存使用较高，考虑使用生成器和__slots__优化")
            
            # CPU优化建议
            cpu_benchmarks = perf_results['cpu_benchmarks']
            if cpu_benchmarks.get('numpy_matrix_mult', 0) > 1.0:
                recommendations.append("NumPy操作较慢，考虑使用更小的数据集或GPU加速")
            
            if cpu_benchmarks.get('var_calculations_1000x', 0) > 0.5:
                recommendations.append("VaR计算可以通过预计算和缓存优化")
            
            # I/O优化建议
            io_benchmarks = perf_results['io_benchmarks']
            if io_benchmarks.get('market_data_fetch_10x', 0) > 2.0:
                recommendations.append("市场数据获取较慢，考虑连接池和缓存")
            
            # 并发优化建议
            concurrent_benchmarks = perf_results['concurrency_benchmarks']
            async_time = concurrent_benchmarks.get('async_concurrent_fetch', 0)
            thread_time = concurrent_benchmarks.get('thread_pool_concurrent', 0)
            
            if async_time > thread_time:
                recommendations.append("异步性能低于线程池，检查异步实现")
            elif thread_time > async_time * 2:
                recommendations.append("线程池开销较大，优先使用异步")
        
        # 代码质量建议
        if 'code_quality' in self.results:
            quality_results = self.results['code_quality']
            
            avg_complexity = quality_results['complexity_metrics'].get('average_complexity', 0)
            if avg_complexity > 50:
                recommendations.append("代码复杂度较高，考虑重构和模块化")
            
            avg_imports = quality_results['dependency_metrics'].get('average_imports', 0)
            if avg_imports > 10:
                recommendations.append("依赖较多，考虑减少不必要的导入")
        
        # 通用建议
        recommendations.extend([
            "实现连接池管理减少网络开销",
            "添加结果缓存减少重复计算", 
            "使用配置文件管理参数",
            "实现健康检查和监控",
            "添加更多单元测试覆盖边界情况"
        ])
        
        for i, rec in enumerate(recommendations[:8], 1):
            print(f"   {i}. {rec}")


def main():
    """主测试函数"""
    print("🚀 启动交易系统综合测试...")
    
    # 创建测试套件
    test_suite = PerformanceTestSuite()
    
    # 运行所有测试
    test_suite.run_functionality_tests()
    test_suite.run_performance_benchmarks()
    test_suite.run_code_quality_analysis()
    
    # 生成报告
    test_suite.generate_comprehensive_report()
    
    # 保存结果
    with open('comprehensive_test_results.json', 'w') as f:
        json.dump(test_suite.results, f, indent=2, default=str)
    
    print(f"\n💾 详细结果已保存到 comprehensive_test_results.json")

if __name__ == "__main__":
    main()