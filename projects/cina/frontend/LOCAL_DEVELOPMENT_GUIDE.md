# 本地开发环境设置指南

## 🎯 目标
设置本地开发环境，避免第三方合约问题，使用本地RPC进行测试。

## 🚀 快速开始

### 方法1: 一键启动（推荐）
```bash
# Windows
start-local-dev.bat

# Linux/Mac
chmod +x start-local-dev.sh
./start-local-dev.sh
```

### 方法2: 手动步骤

#### 1. 安装依赖
```bash
npm install
```

#### 2. 编译合约
```bash
npx hardhat compile
```

#### 3. 启动本地网络
```bash
npx hardhat node
```
**保持这个终端窗口打开！**

#### 4. 部署合约（新终端窗口）
```bash
npx hardhat run scripts/deploy.js --network localhost
```

#### 5. 启动前端应用（新终端窗口）
```bash
# 设置环境变量
set NEXT_PUBLIC_USE_LOCAL=true  # Windows
# 或
export NEXT_PUBLIC_USE_LOCAL=true  # Linux/Mac

# 启动应用
npm run dev
```

## 📋 配置说明

### 环境变量
```bash
NEXT_PUBLIC_USE_LOCAL=true  # 启用本地开发模式
NODE_ENV=development        # 开发环境
```

### 网络配置
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `1337`
- **网络名称**: `localhost`

### 合约地址（自动部署）
部署脚本会自动输出所有合约地址，类似：
```
📋 本地测试配置:
==================
RPC URL: http://127.0.0.1:8545
Chain ID: 1337
Diamond合约: 0x5FbDB2315678afecb367f032d93F642f64180aa3
WRMB代币: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
WBTC代币: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
FXUSD代币: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
USDC代币: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

## 🔑 测试账户

### 默认测试账户
```
地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
余额: 10000 ETH
```

### 导入到MetaMask
1. 打开MetaMask
2. 点击账户图标 → 导入账户
3. 粘贴私钥：`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
4. 添加本地网络：
   - 网络名称：`Hardhat Local`
   - RPC URL：`http://127.0.0.1:8545`
   - 链ID：`1337`
   - 货币符号：`ETH`

## 🧪 测试流程

### 1. 连接钱包
- 使用MetaMask连接到本地网络
- 确保账户有足够的ETH余额

### 2. 测试代币
- 所有测试代币已自动铸造到你的账户
- 每个代币有10,000个

### 3. 测试交易
- 尝试一步到位杠杆开仓
- 检查控制台日志
- 验证交易是否成功

## 🛠️ 故障排除

### 问题1: 合约部署失败
```bash
# 重新编译合约
npx hardhat compile --force

# 清理缓存
npx hardhat clean
```

### 问题2: 前端无法连接
```bash
# 检查本地网络是否运行
curl http://127.0.0.1:8545

# 检查环境变量
echo $NEXT_PUBLIC_USE_LOCAL
```

### 问题3: MetaMask连接失败
1. 确保MetaMask连接到正确的网络
2. 检查RPC URL和Chain ID
3. 重启MetaMask

## 📊 开发优势

### ✅ 本地开发的好处
- **无网络限制**: 不需要真实的RPC端点
- **快速测试**: 交易立即确认
- **免费Gas**: 本地网络Gas费用为0
- **完全控制**: 可以修改合约代码
- **调试友好**: 详细的错误信息

### 🔧 可以修改的内容
- 合约逻辑
- 代币数量
- 交易参数
- 错误处理

## 🚀 下一步

1. **测试基本功能**: 确保连接和交易正常
2. **修改合约**: 根据需要调整合约逻辑
3. **添加功能**: 实现更多交易功能
4. **部署到测试网**: 测试通过后部署到Sepolia

## 📝 注意事项

1. **保持本地网络运行**: 不要关闭Hardhat节点
2. **重新部署**: 修改合约后需要重新部署
3. **环境变量**: 确保设置了正确的环境变量
4. **钱包配置**: 确保MetaMask连接到本地网络

现在你可以完全在本地环境中测试整个交易流程，避免第三方合约的问题！🎉
