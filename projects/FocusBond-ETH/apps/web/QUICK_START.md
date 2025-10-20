# FocusBond EVM 快速启动指南

## 🚀 5分钟快速开始

### 步骤 1: 启动本地区块链

在项目根目录打开一个终端：

```bash
# 进入项目根目录
cd /Users/mingji/postgraduate/FocusBond-ETH

# 启动 Anvil 本地节点
./run.sh
```

保持这个终端窗口运行。

### 步骤 2: 启动前端应用

打开新的终端窗口：

```bash
# 进入前端目录
cd /Users/mingji/postgraduate/FocusBond-ETH/apps/web

# 安装依赖（首次运行）
pnpm install

# 启动开发服务器
pnpm dev
```

### 步骤 3: 配置 MetaMask

1. **添加 Anvil 网络**
   - 打开 MetaMask
   - 点击网络下拉菜单
   - 选择"添加网络" → "手动添加网络"
   - 填入以下信息：
     ```
     网络名称: Anvil Local
     RPC URL: http://127.0.0.1:8545
     链 ID: 31337
     货币符号: ETH
     ```
   - 点击"保存"

2. **导入测试账户（可选）**
   - 点击 MetaMask 右上角的账户图标
   - 选择"导入账户"
   - 选择"私钥"
   - 粘贴私钥：
     ```
     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
     ```
   - 点击"导入"
   - 这个账户地址是：`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

### 步骤 4: 访问应用

在浏览器中打开：

```
http://localhost:3000/dashboard-evm
```

### 步骤 5: 开始使用

1. **连接钱包**
   - 点击页面上的 "Connect Wallet" 按钮
   - 选择 MetaMask
   - 在弹出窗口中点击"连接"
   - 确认您已连接到 Anvil Local 网络

2. **查看余额**
   - 连接后会显示您的 ETH 余额
   - 以及 FCRED（专注积分）余额

3. **创建第一个专注会话**
   - 在"创建专注会话"卡片中：
     - 持续时间：输入 `5`（分钟）
     - 质押金额：输入 `0.1`（ETH）
   - 点击"创建会话"
   - 在 MetaMask 中确认交易

4. **管理会话**
   - 会话创建后，您会看到倒计时开始
   - 可以点击"💓 心跳"按钮保持会话活跃
   - 可以点击"中断会话"提前结束（需支付费用）
   - 等待倒计时结束后点击"完成会话"获得奖励

## 📱 界面说明

### 账户余额卡片
显示您的：
- **ETH 余额**：用于创建会话的质押
- **专注积分 (FCRED)**：用于支付中断费用

### 专注积分系统卡片
说明如何获得和使用专注积分

### 创建专注会话卡片
- **持续时间**：1-65535 分钟
- **质押金额**：最少 0.001 ETH
- **服务费信息**：显示基础费用和费用规则

### 我的会话卡片
显示当前活跃会话的详细信息：
- **倒计时**：剩余时间（HH:MM:SS 格式）
- **心跳状态**：显示上次心跳时间
- **会话信息**：运行时间、完成度、质押金额
- **中断惩罚**：显示当前中断需要支付的费用
- **完成奖励**：时间到后显示可获得的奖励

### 操作按钮
- **💓 心跳**：发送心跳信号保持会话活跃
- **中断会话**：提前结束会话（支付惩罚费用）
- **完成会话**：倒计时结束后完成会话（获得奖励）

## 🎯 使用场景示例

### 场景 1: 完整完成一个会话

```
1. 创建 30 分钟会话，质押 0.5 ETH
2. 每 2 分钟发送一次心跳
3. 30 分钟后点击"完成会话"
4. 获得奖励 + 质押金返还
```

### 场景 2: 中断会话

```
1. 创建 60 分钟会话，质押 0.3 ETH
2. 运行 15 分钟后需要中断
3. 点击"中断会话"
4. 查看费用计算（已运行 15 分钟，费用倍数 1.2x）
5. 确认支付 FCRED 费用
6. 会话结束，质押金返还
```

### 场景 3: 忘记发送心跳

```
1. 创建会话后开始工作
2. 超过 2 分钟未发送心跳
3. 界面显示黄色警告："⚠️ 需要发送心跳信号"
4. 点击"💓 心跳"按钮
5. 警告消失，继续专注
```

## ⚠️ 常见问题

### 1. 连接钱包失败
- 确保 MetaMask 已安装
- 确保已添加 Anvil Local 网络
- 确保已切换到 Anvil Local 网络

### 2. 创建会话失败
- 检查 ETH 余额是否足够
- 检查 Anvil 节点是否正在运行
- 检查参数是否有效（时长 1-65535，金额 ≥ 0.001）

### 3. 中断会话失败
- 检查 FCRED 余额是否足够支付费用
- 确保会话仍在活跃状态

### 4. 完成会话失败
- 确保倒计时已结束
- 确保会话仍在活跃状态

### 5. 心跳发送失败
- 检查网络连接
- 确保 MetaMask 已解锁
- 确保有足够的 ETH 支付 gas

## 🔧 故障排除

### Anvil 节点未运行
```bash
# 检查 Anvil 是否运行
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 如果失败，重启 Anvil
cd /Users/mingji/postgraduate/FocusBond-ETH
./run.sh
```

### 前端无法启动
```bash
# 清理 node_modules 重新安装
cd /Users/mingji/postgraduate/FocusBond-ETH/apps/web
rm -rf node_modules
rm -rf .next
pnpm install
pnpm dev
```

### MetaMask 交易卡住
```bash
# 重置 MetaMask 账户
# 在 MetaMask 中：
# 设置 → 高级 → 重置账户
```

### 合约地址错误
```bash
# 检查当前部署的合约地址
# 查看文件：/Users/mingji/postgraduate/FocusBond-ETH/apps/web/lib/wagmi.ts
# 确保合约地址与实际部署的一致
```

## 📊 监控和调试

### 查看 Anvil 日志
Anvil 终端会显示所有交易日志，包括：
- 交易哈希
- Gas 使用
- 事件日志

### 浏览器开发者工具
按 F12 打开开发者工具：
- **Console**：查看前端日志
- **Network**：查看 API 调用
- **Application → Local Storage**：查看本地存储

### API 调用监控
创建会话后，在 Network 标签中可以看到：
```
/api/session/calculate-fee?userAddress=0x...&tokenType=focus
```
每 5 秒调用一次，返回最新的费用和奖励信息。

## 🎓 下一步

### 学习更多
- 阅读 [功能整合文档](./EVM_INTEGRATION.md)
- 查看 [测试指南](./TESTING_GUIDE.md)
- 阅读 [整合总结](./INTEGRATION_SUMMARY.md)

### 开发和测试
- 尝试不同的时长和金额
- 测试各种边界情况
- 查看合约事件日志
- 修改费用参数测试

### 贡献代码
- Fork 项目
- 创建新功能
- 提交 Pull Request

## 📞 获取帮助

如果遇到问题：
1. 查看本文档的"常见问题"部分
2. 查看 [故障排除指南](./TROUBLESHOOTING.md)
3. 检查浏览器控制台错误
4. 检查 Anvil 终端日志

## 🎉 享受专注时光！

现在您已经准备好使用 FocusBond 开始您的专注之旅了！

记住：
- 💡 定期发送心跳
- ⏰ 合理设置专注时长
- 💰 确保有足够的 FCRED 支付费用
- 🎯 专注完成，获得奖励！

---

**祝您专注愉快！** 🚀

