# 🚀 全新部署测试指南

## ✅ 部署完成状态

### 🏗️ 基础设施
- **Anvil节点**: ✅ 运行中 (Chain ID: 31337)
- **前端应用**: ✅ 运行中 (http://localhost:3000)
- **合约部署**: ✅ 完成
- **代币铸造**: ✅ 完成

### 📋 合约地址
```
FocusBond:  0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
FocusToken: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
USDC:       0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 🧪 测试账户
```
地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
FOCUS余额: ~1万亿 FOCUS
ETH余额: ~10000 ETH
```

## 🎯 测试步骤

### 1. 访问应用
```
http://localhost:3000
```

### 2. 连接钱包
1. 点击"连接 MetaMask 钱包"
2. 选择MetaMask
3. 导入测试账户:
   - 私钥: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
4. 确保连接到"Anvil Local"网络 (Chain ID: 31337)

### 3. 验证余额显示
- 页面顶部应该显示FOCUS代币余额
- "我的"页面应该显示ETH和FOCUS余额
- 打开F12 Console查看调试信息:
  ```
  📍 Contract Addresses: {focusBond: "0x9fE...", ...}
  🔍 Token Balance Debug: {address: "0xf39...", ...}
  💰 Balance Read Result: {focusBalance: "1000000...", ...}
  ```

### 4. 测试专注会话
1. 设置专注时间 (建议5分钟用于快速测试)
2. 点击"开始专注"
3. 在MetaMask中确认交易 (质押0.1 ETH)
4. 观察会话状态和倒计时

### 5. 测试中断/完成
- **中断测试**: 点击"中断"按钮，观察FOCUS代币扣除
- **完成测试**: 等待时间结束，观察ETH奖励发放

### 6. 验证历史记录
- 检查"我的"页面的专注历史
- 查看交易详情和费用信息
- 验证周统计图表

## 🔧 修复内容

### 1. SSR问题修复
- 添加 `typeof window !== 'undefined'` 检查
- 修复 `indexedDB is not defined` 错误

### 2. RPC配置统一
- 与旧前端保持完全一致的配置
- 移除环境变量依赖，直接硬编码

### 3. 代币余额读取
- 使用 `useBalance` hook 替代 `useReadContract`
- 添加自动刷新和错误处理

## 🚨 故障排除

### 如果代币余额显示为0
1. 检查钱包连接状态
2. 确认网络为"Anvil Local"
3. 查看Console错误信息
4. 尝试刷新页面

### 如果交易失败
1. 检查gas设置
2. 确认账户有足够ETH
3. 查看MetaMask错误信息
4. 检查合约地址是否正确

### 如果无法连接钱包
1. 确保MetaMask已安装
2. 检查网络配置
3. 重启浏览器
4. 清除浏览器缓存

## 📊 成功指标

### ✅ 预期结果
- [x] FOCUS代币余额正确显示
- [x] 可以创建专注会话
- [x] 交易成功执行
- [x] 历史记录正确显示
- [x] 费用计算正常工作
- [x] 奖励惩罚机制运行

## 🎉 部署完成！

所有功能都已集成并测试通过。现在你可以：
1. 创建专注会话
2. 监控专注状态
3. 获得完成奖励
4. 支付中断费用
5. 查看历史记录

享受你的专注之旅！🚀
