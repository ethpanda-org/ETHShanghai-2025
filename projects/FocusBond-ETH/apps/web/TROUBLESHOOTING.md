# FocusBond 前端钱包连接故障排除指南

## 当前问题分析

根据控制台错误信息，主要问题包括：

1. **浏览器扩展冲突** - `evmAsk.js` 和文件系统错误
2. **钱包连接失败** - 无法连接到 MetaMask/Phantom
3. **网络连接问题** - 需要本地 Hardhat 节点

## 解决方案

### 1. 浏览器扩展问题

**问题表现:**
- `evmAsk.js:5 Oe: Unexpected error`
- `无法添加文件系统：<illegal path>`

**解决方案:**
- 暂时禁用冲突的浏览器扩展
- 使用隐身模式测试
- 清除浏览器缓存和 Cookie

### 2. 钱包连接配置

**当前状态:**
- ✅ 本地 Hardhat 节点运行在 `http://localhost:8545`
- ✅ Wagmi 配置已更新支持 Hardhat 网络 (Chain ID: 31337)
- ✅ MetaMask、Phantom、WalletConnect 连接器已配置
- ✅ 环境变量文件已创建

**测试步骤:**

1. **确保 Hardhat 节点运行:**
   ```bash
   # 在主项目目录运行
   npx hardhat node
   ```

2. **添加 Hardhat 网络到 MetaMask:**
   - 网络名称: Hardhat
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - 货币符号: ETH

3. **导入测试账户到 MetaMask:**
   - 从 Hardhat 节点输出中复制私钥
   - 在 MetaMask 中导入账户

### 3. 连接测试

**成功连接的特征:**
- 钱包按钮显示 "Connected" 状态
- 显示钱包地址 (如: 0xf39...2266)
- 无控制台错误

**常见连接问题:**

1. **MetaMask 未检测到:**
   - 确保 MetaMask 扩展已安装并解锁
   - 检查是否在正确的网络 (Hardhat)

2. **Phantom 钱包问题:**
   - Phantom 主要支持 Solana，以太坊支持有限
   - 建议使用 MetaMask 进行测试

3. **网络连接失败:**
   - 确认 Hardhat 节点正在运行
   - 检查端口 8545 是否可用

## 开发环境设置

### 必需的服务:
1. **Hardhat 本地节点** - 在端口 8545 运行
2. **Next.js 开发服务器** - 在端口 3000 运行

### 启动命令:
```bash
# 终端 1 - 启动 Hardhat 节点
cd /home/zzyytt22/ethshanghai/FocusBond
npx hardhat node

# 终端 2 - 启动前端开发服务器
cd /home/zzyytt22/ethshanghai/FocusBond/apps/web
npm run dev
```

## 下一步测试

1. 访问 `http://localhost:3000`
2. 点击 "Connect MetaMask" 按钮
3. 在 MetaMask 中确认连接
4. 验证钱包连接状态
5. 测试会话管理功能

## 错误处理改进

当前实现包含:
- ✅ 错误状态显示
- ✅ 连接状态反馈
- ✅ 加载状态指示器
- ✅ 自动错误清除 (5秒后)

如果问题持续，请检查:
- 浏览器控制台的具体错误信息
- Hardhat 节点的日志输出
- 网络请求状态