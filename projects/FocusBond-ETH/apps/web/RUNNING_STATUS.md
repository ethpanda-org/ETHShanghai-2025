# ✅ 应用运行状态

## 🎉 应用已成功启动！

**启动时间**: 刚刚  
**状态**: 🟢 运行中

---

## 📍 访问地址

### 主页面（Solana 版本）
```
http://localhost:3000
```

### EVM Dashboard（推荐测试）
```
http://localhost:3000/dashboard-evm
```

---

## 🔧 运行中的服务

### 1. Anvil 本地节点 ✅
- **端口**: 8545
- **RPC URL**: http://127.0.0.1:8545
- **Chain ID**: 31337
- **状态**: 正在运行

测试命令：
```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 2. Next.js 开发服务器 ✅
- **端口**: 3000
- **主页**: http://localhost:3000
- **EVM Dashboard**: http://localhost:3000/dashboard-evm
- **状态**: 正在运行

---

## 🎯 下一步操作

### 1. 在浏览器中访问
打开浏览器访问：
```
http://localhost:3000/dashboard-evm
```

### 2. 配置 MetaMask（如果还没配置）

#### 添加 Anvil Local 网络
1. 打开 MetaMask
2. 点击网络下拉菜单
3. 选择 "添加网络" → "手动添加网络"
4. 填入以下信息：
   ```
   网络名称: Anvil Local
   RPC URL: http://127.0.0.1:8545
   Chain ID: 31337
   货币符号: ETH
   ```
5. 点击 "保存"

#### 导入测试账户（可选）
- 点击 MetaMask 右上角的账户图标
- 选择 "导入账户"
- 选择 "私钥"
- 粘贴私钥：
  ```
  0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
  ```
- 这个账户地址是：`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

### 3. 开始测试

1. **连接钱包**
   - 点击页面上的 "Connect Wallet" 按钮
   - 选择 MetaMask
   - 确认连接

2. **查看余额**
   - ETH 余额会自动显示
   - FCRED (专注积分) 余额也会显示

3. **创建第一个会话**
   - 持续时间：输入 `5` (分钟)
   - 质押金额：输入 `0.1` (ETH)
   - 点击 "创建会话"
   - 在 MetaMask 中确认交易

4. **测试其他功能**
   - 发送心跳：点击 "💓 心跳"
   - 中断会话：点击 "中断会话"（会扣除 FCRED）
   - 完成会话：等待倒计时结束后点击 "完成会话"

---

## 📊 后台进程信息

### 查看运行中的进程
```bash
# 查看 Anvil 进程
ps aux | grep anvil | grep -v grep

# 查看 Next.js 进程
ps aux | grep "next dev" | grep -v grep

# 查看端口占用
lsof -i :8545  # Anvil
lsof -i :3000  # Next.js
```

---

## 🛑 停止服务

### 停止 Next.js 开发服务器
```bash
# 方法1: 查找进程并停止
ps aux | grep "next dev" | grep -v grep | awk '{print $2}' | xargs kill

# 方法2: 使用 pkill
pkill -f "next dev"
```

### 停止 Anvil 节点
```bash
# 方法1: 查找进程并停止
ps aux | grep anvil | grep -v grep | awk '{print $2}' | xargs kill

# 方法2: 使用 pkill
pkill -f anvil
```

---

## 🔍 查看日志

### Anvil 日志
```bash
cd /Users/mingji/postgraduate/FocusBond-ETH
tail -f anvil.log
```

### Next.js 控制台输出
开发服务器的输出会显示在启动它的终端中。

---

## 📱 界面预览

访问 `http://localhost:3000/dashboard-evm` 你将看到：

1. **顶部标题**
   - "FocusBond EVM"
   - "Stake ETH to stay focused. Break early and pay a fee."

2. **连接钱包按钮**
   - RainbowKit 提供的钱包连接界面

3. **连接后显示**（连接钱包后）
   - 钱包地址
   - 合约地址信息
   - 账户余额（ETH 和 FCRED）
   - 创建会话表单
   - 活跃会话管理

---

## ✅ 测试清单

使用前请确认：
- [x] Anvil 节点正在运行 (端口 8545)
- [x] Next.js 服务器正在运行 (端口 3000)
- [ ] MetaMask 已安装
- [ ] 已添加 Anvil Local 网络到 MetaMask
- [ ] 已导入测试账户（可选）

准备开始测试：
- [ ] 访问 http://localhost:3000/dashboard-evm
- [ ] 连接 MetaMask 钱包
- [ ] 查看余额显示
- [ ] 创建一个测试会话
- [ ] 测试心跳功能
- [ ] 测试中断会话
- [ ] 测试完成会话

---

## 📞 需要帮助？

### 常见问题

**Q: 无法访问 http://localhost:3000**
- 检查 Next.js 进程是否运行：`lsof -i :3000`
- 查看错误日志

**Q: MetaMask 无法连接**
- 确保已添加 Anvil Local 网络
- 检查 Chain ID 是否为 31337
- 检查 RPC URL 是否为 http://127.0.0.1:8545

**Q: 交易失败**
- 确保 Anvil 节点正在运行
- 检查账户 ETH 余额是否足够
- 查看 MetaMask 错误信息

### 查看完整文档

- [快速启动指南](./QUICK_START.md)
- [测试指南](./TESTING_GUIDE.md)
- [功能整合文档](./EVM_INTEGRATION.md)

---

## 🎊 开始使用！

一切准备就绪！现在访问：

```
http://localhost:3000/dashboard-evm
```

**祝你测试愉快！** 🚀

---

**最后更新**: $(date)  
**状态**: ✅ 运行中

