# AI预测套利基金项目 - 使用指南

## 项目简介

这是一个结合AI预测和区块链套利的DeFi基金系统，包含：
- 🤖 AI预测模块（Python）
- 🔗 智能合约（Solidity）
- 🎨 前端界面（React + Vite）

## 系统架构

```
AI预测 → 智能合约 → 套利执行 → 收益分配 → 用户界面
```

## 快速开始

### 1. 环境要求

- **Node.js**: v18+ 
- **Python**: 3.8+
- **Git**: 最新版本

### 2. 项目结构

```
DL-pricing-modular/
├── eth_sh/                          # 前端和智能合约
│   ├── src/                         # React前端源码
│   ├── smart contract/              # 智能合约
│   │   ├── token.sol               # 主合约文件
│   │   ├── deply.js                # 部署脚本
│   │   ├── demo.js                 # 演示脚本
│   │   └── hardhat.config.js       # Hardhat配置
│   └── package.json                # 前端依赖
├── main.py                         # AI预测主程序
├── demo_interactive.py             # 交互式演示
└── requirements.txt               # Python依赖
```

## 详细使用指南

### 🚀 启动前端应用

1. **进入前端目录**
   ```bash
   cd eth_sh
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   - 打开浏览器访问显示的地址（通常是 http://localhost:3000）
   - 如果端口被占用，会自动使用下一个可用端口

### 🔗 智能合约操作

#### 部署合约

1. **进入智能合约目录**
   ```bash
   cd eth_sh/smart\ contract
   ```

2. **安装Hardhat依赖**
   ```bash
   npm install --save-dev @nomicfoundation/hardhat-toolbox
   ```

3. **编译合约**
   ```bash
   npx hardhat compile
   ```

4. **部署到本地网络**
   ```bash
   npx hardhat run deply.js --network hardhat
   ```

   输出示例：
   ```
   部署合约...
   部署者地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   AIDefiFund deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   合约所有者: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   套利阈值: 5%
   ```

#### 运行合约演示

1. **运行完整演示**
   ```bash
   npx hardhat run demo.js --network hardhat
   ```

   演示流程：
   - 1️⃣ 设置AI预测价格（2000 ETH）
   - 2️⃣ 用户存入ETH（0.5 ETH）
   - 3️⃣ 执行套利（市场价格2200 ETH，偏差10%）
   - 4️⃣ 查看收益分配

2. **运行简单测试**
   ```bash
   npx hardhat run test-direct.js --network hardhat
   ```

#### 合约功能说明

**AIDefiFund合约主要功能：**

- `updatePredictedPrice(uint256 _price)` - 更新AI预测价格
- `deposit()` - 用户存入ETH获得基金代币
- `executeArbitrage(uint256 marketPrice)` - 执行套利交易
- `withdraw(uint256 amount)` - 提取本金和收益
- `balanceOf(address)` - 查询用户代币余额
- `totalSupply()` - 查询总供应量
- `pnl()` - 查询当前收益

### 🤖 AI预测模块

1. **安装Python依赖**
   ```bash
   pip install -r requirements.txt
   ```

2. **运行交互式演示**
   ```bash
   python demo_interactive.py
   ```

3. **运行主程序**
   ```bash
   python main.py --interactive
   ```

## 使用场景示例

### 场景1：完整的套利流程

1. **启动前端**（终端1）
   ```bash
   cd eth_sh && npm run dev
   ```

2. **部署合约**（终端2）
   ```bash
   cd eth_sh/smart\ contract
   npx hardhat run deply.js --network hardhat
   ```

3. **运行演示**（终端2）
   ```bash
   npx hardhat run demo.js --network hardhat
   ```

4. **查看前端界面**（浏览器）
   - 访问 http://localhost:3000
   - 查看AI预测结果和市场模拟

### 场景2：开发调试

1. **编译合约**
   ```bash
   cd eth_sh/smart\ contract
   npx hardhat compile
   ```

2. **运行测试**
   ```bash
   npx hardhat run test-direct.js --network hardhat
   ```

3. **查看合约状态**
   ```bash
   npx hardhat run debug.js --network hardhat
   ```

## 常见问题解决

### 1. 端口被占用
```bash
# 查看端口使用情况
lsof -i :3000

# 杀死占用进程
kill -9 <PID>
```

### 2. 合约编译失败
```bash
# 清理缓存重新编译
npx hardhat clean
npx hardhat compile
```

### 3. 依赖安装失败
```bash
# 清理npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules
npm install
```

### 4. Python模块导入错误
```bash
# 检查Python环境
python --version
pip list

# 重新安装依赖
pip install -r requirements.txt --force-reinstall
```

## 开发命令速查

### 前端开发
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览构建结果
```

### 智能合约
```bash
npx hardhat compile              # 编译合约
npx hardhat test                 # 运行测试
npx hardhat run deply.js         # 部署合约
npx hardhat run demo.js          # 运行演示
npx hardhat console              # 进入控制台
```

### Python AI模块
```bash
python main.py --interactive     # 交互式模式
python demo_interactive.py       # 演示模式
python quick_start.py            # 快速开始
```

## 项目配置

### 环境变量（可选）
创建 `.env` 文件：
```env
# 网络配置
ALCHEMY_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_here

# AI配置
MODEL_TYPE=mlp
GENERATOR_TYPE=gbm
```

### Hardhat网络配置
```javascript
// hardhat.config.js
networks: {
  hardhat: {
    chainId: 1337
  },
  sepolia: {
    url: process.env.ALCHEMY_RPC,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License

## 联系方式

如有问题，请提交Issue或联系开发团队。

---

**祝您使用愉快！** 🚀