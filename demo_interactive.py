#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
交互式模式演示脚本
展示如何使用Deep BSDE系统的交互式功能
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import DeepBSDESystem

def demo_interactive_mode():
    """演示交互式模式的使用"""
    print("="*80)
    print("Deep BSDE 套利策略回测系统 - 交互式模式演示")
    print("="*80)
    print()
    print("本演示将展示如何使用交互式模式进行:")
    print("1. 数据生成器设置")
    print("2. 模型配置")
    print("3. 策略设置")
    print("4. 回测运行")
    print("5. 结果保存")
    print()
    
    # 创建系统实例
    system = DeepBSDESystem()
    
    print("✓ 系统初始化完成")
    print(f"  设备: {system.device}")
    print()
    
    # 演示1: 设置数据生成器
    print("="*50)
    print("演示1: 设置数据生成器")
    print("="*50)
    
    available_generators = ['gbm', 'fbm', 'vasicek', 'jump_diffusion']
    print(f"可用的生成器类型: {', '.join(available_generators)}")
    
    # 使用GBM生成器
    generator_type = 'gbm'
    print(f"选择生成器: {generator_type}")
    system.setup_data_generation(generator_type)
    print("✓ 数据生成器设置完成")
    print()
    
    # 演示2: 生成训练数据
    print("="*50)
    print("演示2: 生成训练数据")
    print("="*50)
    
    batch_size = 100
    print(f"生成 {batch_size} 条路径...")
    train_data = system.generate_training_data(batch_size)
    print(f"✓ 生成了 {train_data[0].shape[0]} 条路径")
    print(f"  路径形状: {train_data[0].shape}")
    print(f"  时间步数: {train_data[1].shape}")
    print()
    
    # 演示3: 设置模型
    print("="*50)
    print("演示3: 设置模型")
    print("="*50)
    
    available_models = ['mlp', 'rnn', 'deep_bsde_rnn', 'deep_bsde_mlp', 'transformer']
    print(f"可用的模型类型: {', '.join(available_models)}")
    
    # 使用MLP模型
    model_type = 'mlp'
    print(f"选择模型: {model_type}")
    system.setup_model(model_type)
    print("✓ 模型设置完成")
    print()
    
    # 演示4: 设置策略
    print("="*50)
    print("演示4: 设置策略")
    print("="*50)
    
    available_strategies = ['arbitrage', 'callable_bond', 'mean_reversion']
    print(f"可用的策略类型: {', '.join(available_strategies)}")
    
    # 使用套利策略
    strategy_type = 'arbitrage'
    print(f"选择策略: {strategy_type}")
    system.setup_strategy(strategy_type)
    print("✓ 策略设置完成")
    print()
    
    # 演示5: 运行回测
    print("="*50)
    print("演示5: 运行回测")
    print("="*50)
    
    test_size = 20
    print(f"生成 {test_size} 条测试路径...")
    test_data = system.generate_training_data(test_size)
    print("开始回测...")
    
    results = system.run_backtest(test_data)
    
    print("✓ 回测完成")
    print("回测结果摘要:")
    summary = results['summary']
    print(f"  总路径数: {summary['total_paths']}")
    print(f"  平均最终PNL: {summary['mean_final_pnl']:.2f}")
    print(f"  标准差: {summary['std_final_pnl']:.2f}")
    print(f"  中位数PNL: {summary['median_final_pnl']:.2f}")
    print(f"  最小PNL: {summary['min_final_pnl']:.2f}")
    print(f"  最大PNL: {summary['max_final_pnl']:.2f}")
    print(f"  胜率: {summary['win_rate']:.2%}")
    print(f"  平均最大回撤: {summary['mean_max_drawdown']:.2f}")
    print()
    
    # 演示6: 查看配置
    print("="*50)
    print("演示6: 查看系统配置")
    print("="*50)
    
    config_summary = system.config_manager.get_config_summary()
    print("配置摘要:")
    print(f"  模块数量: {config_summary['modules']}")
    print(f"  配置键总数: {config_summary['total_keys']}")
    print(f"  当前设备: {system.device}")
    print(f"  数据生成器: {'已设置' if system.path_generator else '未设置'}")
    print(f"  模型: {'已设置' if system.model else '未设置'}")
    print(f"  策略: {'已设置' if system.strategy else '未设置'}")
    print()
    
    # 演示7: 保存结果
    print("="*50)
    print("演示7: 保存结果")
    print("="*50)
    
    output_dir = "demo_output"
    print(f"保存结果到: {output_dir}")
    
    try:
        saved_files = system.save_results(results, output_dir)
        print("✓ 结果保存完成")
        print("保存的文件:")
        for file_type, file_path in saved_files.items():
            print(f"  {file_type}: {file_path}")
    except Exception as e:
        print(f"⚠ 保存结果时出现问题: {e}")
        print("这可能是由于缺少某些依赖或权限问题")
    
    print()
    print("="*80)
    print("演示完成！")
    print("="*80)
    print()
    print("要使用真正的交互式模式，请运行:")
    print("  python main.py --interactive")
    print()
    print("或者使用命令行模式:")
    print("  python main.py --generator gbm --model mlp --strategy arbitrage")
    print("  python main.py --train_size 1000 --test_size 100 --epochs 50")

if __name__ == "__main__":
    demo_interactive_mode()



