#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
快速启动脚本
提供简化的使用接口
"""

import os
import sys
import argparse
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import DeepBSDESystem


def quick_start():
    """快速启动演示"""
    print("=" * 60)
    print("Deep BSDE 套利策略回测系统 - 快速启动")
    print("=" * 60)
    
    # 创建系统
    system = DeepBSDESystem()
    
    # 运行完整流程
    print("开始运行完整流程...")
    results = system.run_complete_pipeline(
        generator_type='gbm',
        model_type='deep_bsde_rnn',
        strategy_type='arbitrage',
        train_size=500,  # 较小的训练集用于快速演示
        test_size=50,    # 较小的测试集
        epochs=50,       # 较少的训练轮数
        batch_size=128,
        learning_rate=1e-3
    )
    
    print("\n" + "=" * 60)
    print("快速启动完成！")
    print("=" * 60)
    
    # 显示结果摘要
    summary = results['results']['summary']
    print(f"回测结果摘要:")
    print(f"  总路径数: {summary['total_paths']}")
    print(f"  平均最终PNL: {summary['mean_final_pnl']:.2f}")
    print(f"  平均夏普比率: {summary['mean_sharpe_ratio']:.4f}")
    print(f"  胜率: {summary['win_rate']:.1%}")
    
    print(f"\n生成的文件:")
    for file_type, file_path in results['saved_files'].items():
        print(f"  {file_type}: {file_path}")
    
    print("=" * 60)


def demo_different_models():
    """演示不同模型"""
    print("=" * 60)
    print("不同模型对比演示")
    print("=" * 60)
    
    models = ['mlp', 'rnn', 'deep_bsde_rnn']
    results = {}
    
    for model_type in models:
        print(f"\n测试模型: {model_type}")
        print("-" * 30)
        
        try:
            system = DeepBSDESystem()
            result = system.run_complete_pipeline(
                generator_type='gbm',
                model_type=model_type,
                strategy_type='arbitrage',
                train_size=200,
                test_size=20,
                epochs=30,
                batch_size=64
            )
            
            results[model_type] = result['results']['summary']
            print(f"✓ {model_type} 测试完成")
            
        except Exception as e:
            print(f"❌ {model_type} 测试失败: {e}")
            results[model_type] = None
    
    # 显示对比结果
    print("\n" + "=" * 60)
    print("模型对比结果")
    print("=" * 60)
    
    for model_type, summary in results.items():
        if summary:
            print(f"{model_type:15s}: PNL={summary['mean_final_pnl']:8.2f}, "
                  f"夏普={summary['mean_sharpe_ratio']:6.4f}, "
                  f"胜率={summary['win_rate']:6.1%}")
        else:
            print(f"{model_type:15s}: 测试失败")


def demo_different_strategies():
    """演示不同策略"""
    print("=" * 60)
    print("不同策略对比演示")
    print("=" * 60)
    
    strategies = ['arbitrage', 'callable_bond', 'mean_reversion']
    results = {}
    
    for strategy_type in strategies:
        print(f"\n测试策略: {strategy_type}")
        print("-" * 30)
        
        try:
            system = DeepBSDESystem()
            result = system.run_complete_pipeline(
                generator_type='gbm',
                model_type='deep_bsde_rnn',
                strategy_type=strategy_type,
                train_size=200,
                test_size=20,
                epochs=30,
                batch_size=64
            )
            
            results[strategy_type] = result['results']['summary']
            print(f"✓ {strategy_type} 测试完成")
            
        except Exception as e:
            print(f"❌ {strategy_type} 测试失败: {e}")
            results[strategy_type] = None
    
    # 显示对比结果
    print("\n" + "=" * 60)
    print("策略对比结果")
    print("=" * 60)
    
    for strategy_type, summary in results.items():
        if summary:
            print(f"{strategy_type:15s}: PNL={summary['mean_final_pnl']:8.2f}, "
                  f"夏普={summary['mean_sharpe_ratio']:6.4f}, "
                  f"胜率={summary['win_rate']:6.1%}")
        else:
            print(f"{strategy_type:15s}: 测试失败")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='Deep BSDE 快速启动脚本')
    parser.add_argument('--mode', type=str, default='quick',
                       choices=['quick', 'models', 'strategies'],
                       help='运行模式')
    parser.add_argument('--config', type=str, help='配置文件路径')
    
    args = parser.parse_args()
    
    try:
        if args.mode == 'quick':
            quick_start()
        elif args.mode == 'models':
            demo_different_models()
        elif args.mode == 'strategies':
            demo_different_strategies()
        
        print("\n🎉 演示完成！")
        
    except Exception as e:
        print(f"❌ 运行失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
