"""
默认配置文件
包含所有模块的默认参数
"""

# 数学建模模块默认配置
MATH_MODELING_CONFIG = {
    'path_generators': {
        'gbm': {
            'T': 1.0,
            'N': 50,
            'd': 1,
            'r': 0.05,
            'sigma': 0.2,
            'S0': 100.0
        },
        'fbm': {
            'T': 1.0,
            'N': 50,
            'd': 1,
            'H': 0.7,
            'sigma': 0.2,
            'S0': 100.0
        },
        'vasicek': {
            'T': 1.0,
            'N': 50,
            'd': 1,
            'kappa': 0.1,
            'theta': 0.05,
            'sigma': 0.02,
            'r0': 0.03
        },
        'jump_diffusion': {
            'T': 1.0,
            'N': 50,
            'd': 1,
            'r': 0.05,
            'sigma': 0.2,
            'lambda_jump': 0.1,
            'mu_jump': 0.0,
            'sigma_jump': 0.1,
            'S0': 100.0
        }
    },
    'models': {
        'bsde': {
            'r': 0.05,
            'sigma': 0.2
        },
        'black_scholes': {
            'r': 0.05,
            'sigma': 0.2
        },
        'heston': {
            'r': 0.05,
            'kappa': 2.0,
            'theta': 0.04,
            'sigma_v': 0.3,
            'rho': -0.7,
            'v0': 0.04
        },
        'callable_bond': {
            'r': 0.05,
            'sigma': 0.2,
            'coupon_rate': 0.03,
            'call_times': [0.5, 1.0],
            'call_prices': [102.0, 100.0],
            'face_value': 100.0
        }
    }
}

# 机器学习模块默认配置
ML_MODELS_CONFIG = {
    'mlp': {
        'input_dim': 2,
        'hidden_dims': [64, 64],
        'output_dim': 1,
        'activation': 'relu',
        'dropout': 0.0
    },
    'deep_bsde_mlp': {
        'd': 1,
        'N': 50,
        'T': 1.0,
        'r': 0.05,
        'hidden_size': 64
    },
    'rnn': {
        'input_dim': 1,
        'hidden_dim': 64,
        'num_layers': 2,
        'rnn_type': 'lstm',
        'dropout': 0.0,
        'bidirectional': False,
        'output_dim': 1
    },
    'deep_bsde_rnn': {
        'input_dim': 1,
        'hidden_dim': 64,
        'num_layers': 2,
        'rnn_type': 'lstm',
        'dropout': 0.0
    },
    'transformer': {
        'input_dim': 1,
        'd_model': 64,
        'nhead': 8,
        'num_layers': 6,
        'dim_feedforward': 256,
        'dropout': 0.1,
        'output_dim': 1
    },
    'training': {
        'learning_rate': 1e-3,
        'weight_decay': 0.0,
        'batch_size': 256,
        'epochs': 200,
        'precision': 'fp32',
        'grad_clip': 5.0,
        'loss_type': 'mse'
    }
}

# 套利回测模块默认配置
BACKTEST_CONFIG = {
    'strategies': {
        'arbitrage': {
            'strike_price': 100.0,
            'initial_capital': 10000.0,
            'risk_free_rate': 0.05,
            'transaction_cost': 0.001,
            'sigma': 0.2
        },
        'callable_bond': {
            'face_value': 100.0,
            'coupon_rate': 0.03,
            'call_times': [0.5, 1.0],
            'call_prices': [102.0, 100.0],
            'risk_free_rate': 0.05
        },
        'mean_reversion': {
            'lookback_window': 20,
            'threshold': 2.0,
            'position_size': 1.0,
            'transaction_cost': 0.001
        }
    },
    'data_loaders': {
        'csv': {
            'has_header': False,
            'time_column': None,
            'price_columns': None
        },
        'simulated': {
            'generator_type': 'gbm',
            'batch_size': 1000,
            'time_steps': 50,
            'num_assets': 1
        },
        'api': {
            'api_url': '',
            'api_key': None,
            'interval': '1d'
        }
    },
    'metrics': {
        'risk_free_rate': 0.0,
        'confidence_level': 0.05,
        'periods_per_year': 252
    },
    'visualization': {
        'save_plots': True,
        'save_html': True,
        'dpi': 300,
        'n_paths_show': 10,
        'figure_size': (12, 8)
    }
}

# 设备管理默认配置
DEVICE_CONFIG = {
    'auto_select': True,
    'prefer_cuda': True,
    'cuda_device': 0,
    'precision': 'fp32',
    'enable_amp': True,
    'enable_benchmark': True
}

# 日志配置
LOGGING_CONFIG = {
    'level': 'INFO',
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file': 'logs/deep_bsde.log',
    'max_size': 10 * 1024 * 1024,  # 10MB
    'backup_count': 5
}

# 输出配置
OUTPUT_CONFIG = {
    'base_dir': 'output',
    'create_timestamp': True,
    'save_models': True,
    'save_results': True,
    'save_plots': True,
    'save_reports': True
}

# 完整默认配置
DEFAULT_CONFIG = {
    'math_modeling': MATH_MODELING_CONFIG,
    'ml_models': ML_MODELS_CONFIG,
    'backtest': BACKTEST_CONFIG,
    'device': DEVICE_CONFIG,
    'logging': LOGGING_CONFIG,
    'output': OUTPUT_CONFIG
}

# 配置验证规则
CONFIG_VALIDATION_RULES = {
    'math_modeling.path_generators.gbm.T': {'type': float, 'min': 0.01, 'max': 10.0},
    'math_modeling.path_generators.gbm.N': {'type': int, 'min': 10, 'max': 1000},
    'math_modeling.path_generators.gbm.r': {'type': float, 'min': 0.0, 'max': 1.0},
    'math_modeling.path_generators.gbm.sigma': {'type': float, 'min': 0.01, 'max': 2.0},
    'math_modeling.path_generators.gbm.S0': {'type': float, 'min': 0.1, 'max': 10000.0},
    
    'ml_models.training.learning_rate': {'type': float, 'min': 1e-6, 'max': 1.0},
    'ml_models.training.batch_size': {'type': int, 'min': 1, 'max': 10000},
    'ml_models.training.epochs': {'type': int, 'min': 1, 'max': 10000},
    
    'backtest.strategies.arbitrage.strike_price': {'type': float, 'min': 0.1, 'max': 10000.0},
    'backtest.strategies.arbitrage.initial_capital': {'type': float, 'min': 100.0, 'max': 10000000.0},
    'backtest.strategies.arbitrage.transaction_cost': {'type': float, 'min': 0.0, 'max': 0.1}
}
