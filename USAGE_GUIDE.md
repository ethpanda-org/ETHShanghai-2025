# Deep BSDE 套利策略回测系统 - 使用指南

## 概述

本系统采用模块化架构，将Deep BSDE套利策略分为三个核心模块：

1. **数学建模模块** (`math_modeling/`) - 路径生成和数学建模
2. **机器学习模块** (`ml_models/`) - 神经网络模型训练
3. **套利回测模块** (`backtest/`) - 策略回测和金融分析

## 快速开始

### 1. 环境设置

```bash
# 创建conda环
conda activate deep-bsde-pricing

# 或使用pip
pip install -r requirements.txt
```

### 2. 快速启动

```bash
# 运行快速演示
python quick_start.py --mode quick

# 测试不同模型
python quick_start.py --mode models

# 测试不同策略
python quick_start.py --mode strategies
```

### 3. 模块测试

```bash
# 运行模块测试
python test_modules.py
```

## 详细使用

### 1. 命令行使用

```bash
# 基本使用
python main.py --generator gbm --model deep_bsde_rnn --strategy arbitrage

# 自定义参数
python main.py \
    --generator gbm \
    --model deep_bsde_rnn \
    --strategy arbitrage \
    --train_size 1000 \
    --test_size 100 \
    --epochs 200 \
    --batch_size 256 \
    --learning_rate 1e-3

# 交互式模式
python main.py --interactive
```

### 2. 编程接口使用

```python
from main import DeepBSDESystem

# 创建系统实例
system = DeepBSDESystem()

# 运行完整流程
results = system.run_complete_pipeline(
    generator_type='gbm',
    model_type='deep_bsde_rnn',
    strategy_type='arbitrage',
    train_size=1000,
    test_size=100,
    epochs=200
)

# 查看结果
print(f"平均PNL: {results['results']['summary']['mean_final_pnl']:.2f}")
print(f"夏普比率: {results['results']['summary']['mean_sharpe_ratio']:.4f}")
```

### 3. 模块化使用

```python
# 数学建模模块
from math_modeling import get_path_generator, get_model

# 生成GBM路径
gbm_generator = get_path_generator('gbm', T=1.0, N=50, r=0.05, sigma=0.2, S0=100.0)
paths, times = gbm_generator.generate_paths(1000)

# 机器学习模块
from ml_models import ModelFactory

# 创建RNN模型
model = ModelFactory.create_model('deep_bsde_rnn', input_dim=1, hidden_dim=64)
trainer = ModelFactory.create_trainer('DeepBSDE_RNNTrainer', model)

# 回测模块
from backtest import get_strategy, BacktestEngine

# 创建套利策略
strategy = get_strategy('arbitrage', strike_price=100.0)
engine = BacktestEngine(strategy)
results = engine.run_backtest(paths)
```

## 配置说明

### 1. 默认配置

系统使用 `config/default_config.py` 中的默认配置，包含：

- **数学建模配置**: 路径生成器参数、模型参数
- **机器学习配置**: 模型架构、训练参数
- **回测配置**: 策略参数、数据加载器参数
- **设备配置**: GPU/CPU设置、精度设置
- **输出配置**: 文件保存设置

### 2. 自定义配置

```python
from config import ConfigManager

# 创建配置管理器
config_manager = ConfigManager()

# 修改配置
config_manager.set_config('ml_models.training.learning_rate', 0.001)
config_manager.set_config('backtest.strategies.arbitrage.strike_price', 105.0)

# 保存配置
config_manager.save_config('my_config.json')
```

### 3. 配置文件

支持JSON和YAML格式：

```json
{
  "ml_models": {
    "training": {
      "learning_rate": 0.001,
      "batch_size": 256,
      "epochs": 200
    }
  },
  "backtest": {
    "strategies": {
      "arbitrage": {
        "strike_price": 105.0,
        "initial_capital": 10000.0
      }
    }
  }
}
```

## 模块详解

### 1. 数学建模模块

#### 路径生成器

```python
from math_modeling import get_path_generator

# GBM路径生成器
gbm_gen = get_path_generator('gbm', T=1.0, N=50, r=0.05, sigma=0.2, S0=100.0)

# FBM路径生成器
fbm_gen = get_path_generator('fbm', T=1.0, N=50, H=0.7, sigma=0.2, S0=100.0)

# Vasicek利率模型
vasicek_gen = get_path_generator('vasicek', T=1.0, N=50, kappa=0.1, theta=0.05)

# 跳跃扩散模型
jump_gen = get_path_generator('jump_diffusion', T=1.0, N=50, lambda_jump=0.1)
```

#### 数学模型

```python
from math_modeling import get_model

# BSDE模型
bsde_model = get_model('bsde', r=0.05, sigma=0.2)

# Black-Scholes模型
bs_model = get_model('black_scholes', r=0.05, sigma=0.2)

# Heston随机波动率模型
heston_model = get_model('heston', r=0.05, kappa=2.0, theta=0.04)
```

### 2. 机器学习模块

#### 模型类型

- **MLP**: 多层感知机
- **RNN**: 循环神经网络
- **Deep BSDE MLP**: 基于MLP的Deep BSDE
- **Deep BSDE RNN**: 基于RNN的Deep BSDE
- **Transformer**: Transformer模型（预留）

#### 使用示例

```python
from ml_models import ModelFactory

# 创建模型
model = ModelFactory.create_model('deep_bsde_rnn', 
                                 input_dim=1, 
                                 hidden_dim=64, 
                                 num_layers=2)

# 创建训练器
trainer = ModelFactory.create_trainer('DeepBSDE_RNNTrainer', 
                                     model, 
                                     learning_rate=1e-3)

# 训练模型
history = trainer.train(train_dataloader, 
                       val_dataloader, 
                       epochs=200)
```

### 3. 套利回测模块

#### 策略类型

- **Arbitrage**: 基于Deep BSDE的套利策略
- **Callable Bond**: 可赎回债券策略
- **Mean Reversion**: 均值回归策略

#### 使用示例

```python
from backtest import get_strategy, BacktestEngine

# 创建策略
strategy = get_strategy('arbitrage', 
                       strike_price=100.0, 
                       initial_capital=10000.0)

# 创建回测引擎
engine = BacktestEngine(strategy)

# 运行回测
results = engine.run_backtest(price_paths, Y_seqs)
```

#### 数据加载器

```python
from backtest import DataLoaderFactory

# CSV数据加载器
csv_loader = DataLoaderFactory.create_loader('csv')
csv_loader.load_data('data.csv', has_header=True)

# 模拟数据加载器
sim_loader = DataLoaderFactory.create_loader('simulated')
sim_loader.load_data(generator_type='gbm', batch_size=1000)

# API数据加载器（预留）
api_loader = DataLoaderFactory.create_loader('api')
api_loader.load_data(symbol='AAPL', start_date='2023-01-01', end_date='2023-12-31')
```

## 输出文件说明

系统会在 `output/` 目录下生成以下文件：

### 1. 数据文件
- `*_summary_*.csv`: 回测结果汇总
- `*_detailed_*.csv`: 详细回测数据
- `*_paths_*.csv`: 价格路径数据

### 2. 可视化文件
- `pnl_analysis_*.png`: PNL分析图
- `price_paths_*.png`: 价格路径图
- `risk_metrics_*.png`: 风险指标图
- `interactive_results_*.html`: 交互式图表

### 3. 报告文件
- `summary_report_*.txt`: 汇总报告
- `training_progress_*.png`: 训练进度图

## 性能优化

### 1. GPU加速

系统自动检测并使用GPU：

```python
from utils import DeviceManager

# 获取设备管理器
device_manager = DeviceManager()

# 查看设备信息
device_manager.print_device_info()

# 清理GPU缓存
device_manager.clear_cache()
```

### 2. 混合精度训练

支持fp16和bf16精度：

```python
# 在配置中设置
config_manager.set_config('ml_models.training.precision', 'fp16')
```

### 3. 批处理优化

自动调整批次大小：

```python
# 获取最优批次大小
optimal_batch_size = device_manager.get_optimal_batch_size(model_size_mb=100)
```

## 扩展指南

### 1. 添加新的路径生成器

```python
from math_modeling.path_generators import BasePathGenerator

class MyPathGenerator(BasePathGenerator):
    def generate_paths(self, batch_size: int, **kwargs):
        # 实现路径生成逻辑
        pass

# 注册生成器
from math_modeling.path_generators import PATH_GENERATORS
PATH_GENERATORS['my_generator'] = MyPathGenerator
```

### 2. 添加新的神经网络

```python
from ml_models.base_model import BaseModel

class MyModel(BaseModel):
    def forward(self, x):
        # 实现前向传播
        pass
    
    def predict(self, x):
        # 实现预测
        pass

# 注册模型
from ml_models.base_model import ModelFactory
ModelFactory.register_model('my_model', MyModel, MyTrainer)
```

### 3. 添加新的回测策略

```python
from backtest.strategy import BaseStrategy

class MyStrategy(BaseStrategy):
    def execute(self, price_path, **kwargs):
        # 实现策略逻辑
        pass

# 注册策略
from backtest.strategy import STRATEGIES
STRATEGIES['my_strategy'] = MyStrategy
```

## 故障排除

### 1. 常见问题

**Q: CUDA内存不足**
A: 减少批次大小或使用CPU训练

**Q: 模型训练不收敛**
A: 调整学习率、增加训练轮数或检查数据质量

**Q: 回测结果异常**
A: 检查策略参数设置和数据质量

### 2. 调试模式

```python
# 启用详细日志
from utils import setup_logger
logger = setup_logger('debug', level='DEBUG')

# 运行测试
python test_modules.py
```

### 3. 性能分析

```python
from utils import PerformanceLogger

perf_logger = PerformanceLogger()
perf_logger.start_timer('training')
# ... 训练代码 ...
duration = perf_logger.end_timer('training')
```

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持GBM、FBM路径生成
- 支持MLP、RNN模型
- 支持套利策略回测
- 完整的可视化分析

## 许可证

本项目采用MIT许可证，详见LICENSE文件。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目地址: [GitHub Repository]
- 邮箱: [your-email@example.com]
- 文档: [Documentation URL]
