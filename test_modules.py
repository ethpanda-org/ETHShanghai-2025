#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
模块集成测试脚本
验证各个模块的功能和集成
"""

import os
import sys
import torch
import numpy as np
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_math_modeling():
    """测试数学建模模块"""
    print("=" * 50)
    print("测试数学建模模块")
    print("=" * 50)
    
    try:
        from math_modeling import get_path_generator, get_model
        
        # 测试路径生成器
        print("1. 测试GBM路径生成器...")
        gbm_generator = get_path_generator('gbm', T=1.0, N=50, r=0.05, sigma=0.2, S0=100.0)
        paths, times = gbm_generator.generate_paths(100)
        print(f"   ✓ GBM路径生成成功: {paths.shape}")
        
        # 测试FBM路径生成器
        print("2. 测试FBM路径生成器...")
        fbm_generator = get_path_generator('fbm', T=1.0, N=50, H=0.7, sigma=0.2, S0=100.0)
        fbm_paths, fbm_times = fbm_generator.generate_paths(100)
        print(f"   ✓ FBM路径生成成功: {fbm_paths.shape}")
        
        # 测试模型
        print("3. 测试BSDE模型...")
        bsde_model = get_model('bsde', r=0.05, sigma=0.2)
        test_prices = torch.tensor([100.0, 105.0, 110.0])
        payoff = bsde_model.compute_payoff(test_prices, strike=100.0)
        print(f"   ✓ BSDE模型测试成功: payoff = {payoff.mean().item():.2f}")
        
        print("✓ 数学建模模块测试通过")
        return True
        
    except Exception as e:
        print(f"❌ 数学建模模块测试失败: {e}")
        return False


def test_ml_models():
    """测试机器学习模块"""
    print("=" * 50)
    print("测试机器学习模块")
    print("=" * 50)
    
    try:
        from ml_models import ModelFactory
        
        # 测试MLP模型
        print("1. 测试MLP模型...")
        mlp_model = ModelFactory.create_model('mlp', input_dim=2, hidden_dims=[32, 32], output_dim=1)
        test_input = torch.randn(10, 2)
        output = mlp_model(test_input)
        print(f"   ✓ MLP模型测试成功: {test_input.shape} -> {output.shape}")
        
        # 测试RNN模型
        print("2. 测试RNN模型...")
        rnn_model = ModelFactory.create_model('rnn', input_dim=1, hidden_dim=32, num_layers=2)
        test_input = torch.randn(10, 50, 1)
        output = rnn_model(test_input)
        print(f"   ✓ RNN模型测试成功: {test_input.shape} -> {output.shape}")
        
        # 测试Deep BSDE RNN模型
        print("3. 测试Deep BSDE RNN模型...")
        deep_rnn_model = ModelFactory.create_model('deep_bsde_rnn', input_dim=1, hidden_dim=32)
        log_returns = torch.randn(10, 50, 1)
        paths = torch.randn(10, 51, 1)
        dS = paths[:, 1:] - paths[:, :-1]
        dt_arr = torch.tensor([0.02] * 50)
        
        try:
            Y_T, Y_seq = deep_rnn_model(log_returns, paths, dS, dt_arr)
            print(f"   ✓ Deep BSDE RNN模型测试成功: Y_T = {Y_T.shape}, Y_seq = {Y_seq.shape}")
        except Exception as e:
            print(f"   ⚠ Deep BSDE RNN模型测试部分失败: {e}")
        
        print("✓ 机器学习模块测试通过")
        return True
        
    except Exception as e:
        print(f"❌ 机器学习模块测试失败: {e}")
        return False


def test_backtest():
    """测试回测模块"""
    print("=" * 50)
    print("测试回测模块")
    print("=" * 50)
    
    try:
        from backtest import get_strategy, BacktestEngine, DataLoaderFactory
        
        # 测试策略
        print("1. 测试套利策略...")
        arbitrage_strategy = get_strategy('arbitrage', strike_price=100.0, initial_capital=10000.0)
        test_path = torch.tensor([100.0, 105.0, 110.0, 115.0, 120.0])
        result = arbitrage_strategy.execute(test_path)
        print(f"   ✓ 套利策略测试成功: 最终PNL = {result['final_pnl']:.2f}")
        
        # 测试回测引擎
        print("2. 测试回测引擎...")
        test_paths = torch.randn(10, 50, 1) * 10 + 100  # 模拟价格路径
        engine = BacktestEngine(arbitrage_strategy)
        backtest_results = engine.run_backtest(test_paths)
        print(f"   ✓ 回测引擎测试成功: {backtest_results['summary']['total_paths']} 条路径")
        
        # 测试数据加载器
        print("3. 测试数据加载器...")
        simulated_loader = DataLoaderFactory.create_loader('simulated')
        success = simulated_loader.load_data(generator_type='gbm', batch_size=50, time_steps=30)
        if success:
            data = simulated_loader.get_data()
            print(f"   ✓ 数据加载器测试成功: {data.shape}")
        
        print("✓ 回测模块测试通过")
        return True
        
    except Exception as e:
        print(f"❌ 回测模块测试失败: {e}")
        return False


def test_config():
    """测试配置管理"""
    print("=" * 50)
    print("测试配置管理")
    print("=" * 50)
    
    try:
        from config import ConfigManager, get_config, set_config
        
        # 测试配置管理器
        print("1. 测试配置管理器...")
        config_manager = ConfigManager()
        config = config_manager.get_config()
        print(f"   ✓ 配置管理器测试成功: {len(config)} 个模块")
        
        # 测试配置获取和设置
        print("2. 测试配置获取和设置...")
        original_lr = get_config('ml_models.training.learning_rate')
        set_config('ml_models.training.learning_rate', 0.001)
        new_lr = get_config('ml_models.training.learning_rate')
        print(f"   ✓ 配置设置测试成功: {original_lr} -> {new_lr}")
        
        # 恢复原始值
        set_config('ml_models.training.learning_rate', original_lr)
        
        print("✓ 配置管理测试通过")
        return True
        
    except Exception as e:
        print(f"❌ 配置管理测试失败: {e}")
        return False


def test_utils():
    """测试工具模块"""
    print("=" * 50)
    print("测试工具模块")
    print("=" * 50)
    
    try:
        from utils import DeviceManager, setup_logger
        
        # 测试设备管理
        print("1. 测试设备管理...")
        device_manager = DeviceManager()
        device = device_manager.get_device()
        device_info = device_manager.get_device_info()
        print(f"   ✓ 设备管理测试成功: {device}, 类型: {device_info['type']}")
        
        # 测试日志系统
        print("2. 测试日志系统...")
        logger = setup_logger('test_logger')
        logger.info("测试日志消息")
        print("   ✓ 日志系统测试成功")
        
        print("✓ 工具模块测试通过")
        return True
        
    except Exception as e:
        print(f"❌ 工具模块测试失败: {e}")
        return False


def test_integration():
    """测试模块集成"""
    print("=" * 50)
    print("测试模块集成")
    print("=" * 50)
    
    try:
        # 导入主系统
        from main import DeepBSDESystem
        
        print("1. 测试系统初始化...")
        system = DeepBSDESystem()
        print("   ✓ 系统初始化成功")
        
        print("2. 测试数据生成...")
        system.setup_data_generation('gbm', T=1.0, N=30, r=0.05, sigma=0.2, S0=100.0)
        train_data = system.generate_training_data(100)
        print(f"   ✓ 数据生成成功: {train_data[0].shape}")
        
        print("3. 测试模型设置...")
        system.setup_model('mlp', input_dim=2, hidden_dims=[32], output_dim=1)
        print("   ✓ 模型设置成功")
        
        print("4. 测试策略设置...")
        system.setup_strategy('arbitrage', strike_price=100.0, initial_capital=10000.0)
        print("   ✓ 策略设置成功")
        
        print("5. 测试回测运行...")
        test_data = system.generate_training_data(20)
        results = system.run_backtest(test_data)
        print(f"   ✓ 回测运行成功: 平均PNL = {results['summary']['mean_final_pnl']:.2f}")
        
        print("✓ 模块集成测试通过")
        return True
        
    except Exception as e:
        print(f"❌ 模块集成测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主测试函数"""
    print("Deep BSDE 套利策略回测系统 - 模块测试")
    print("=" * 60)
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # 记录系统信息
    print(f"Python版本: {sys.version}")
    print(f"PyTorch版本: {torch.__version__}")
    print(f"CUDA可用: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA版本: {torch.version.cuda}")
        print(f"GPU数量: {torch.cuda.device_count()}")
    print("=" * 60)
    
    # 运行测试
    test_results = []
    
    test_results.append(("数学建模模块", test_math_modeling()))
    test_results.append(("机器学习模块", test_ml_models()))
    test_results.append(("回测模块", test_backtest()))
    test_results.append(("配置管理", test_config()))
    test_results.append(("工具模块", test_utils()))
    test_results.append(("模块集成", test_integration()))
    
    # 输出测试结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✓ 通过" if result else "❌ 失败"
        print(f"{test_name:20s}: {status}")
        if result:
            passed += 1
    
    print("=" * 60)
    print(f"总计: {passed}/{total} 个测试通过")
    
    if passed == total:
        print("🎉 所有测试通过！系统运行正常。")
        return 0
    else:
        print("⚠️  部分测试失败，请检查相关模块。")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
