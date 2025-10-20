# 🚀 部署测试指南

## ✅ 当前状态

### 基础设施状态
- **Anvil**: ✅ 运行中 (Chain ID: 31337)
- **前端**: ✅ 运行中 (http://localhost:3000)
- **合约**: ✅ 已部署
- **代币**: ✅ 已铸造

### 合约地址
```
FocusBond: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
FocusToken: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
USDC: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 测试账户
```
地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
FOCUS余额: ~1万亿 FOCUS
ETH余额: ~100 ETH
```

## 🧪 完整测试流程

### 1. 访问应用
```bash
# 打开浏览器访问
http://localhost:3000
```

### 2. 连接钱包
1. 点击"连接钱包"按钮
2. 选择MetaMask
3. 确保连接到Anvil Local网络 (Chain ID: 31337)
4. 使用测试账户: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

### 3. 验证余额显示
- 页面顶部应该显示FOCUS代币余额
- "我的"页面应该显示ETH和FOCUS余额
- 打开F12 Console查看调试信息

### 4. 测试专注会话
1. 设置专注时间 (例如: 5分钟用于测试)
2. 点击"开始专注"
3. 确认MetaMask交易
4. 观察会话状态

### 5. 测试中断/完成
- **中断**: 点击"中断"按钮，观察FOCUS代币扣除
- **完成**: 等待时间结束，观察ETH奖励

### 6. 验证历史记录
- 检查"我的"页面的专注历史
- 查看交易详情和费用信息

## 🔍 调试信息

### Console日志
打开F12 Console，应该看到：
```
📍 Contract Addresses: {focusBond: "0x9fE...", ...}
🔍 Token Balance Debug: {address: "0xf39...", ...}
💰 Balance Read Result: {focusBalance: "1000000...", ...}
```

### API日志
后端日志显示费用计算正常：
```
Fee calculation debug: {
  elapsedMinutes: 183,
  feeStepMin: 10,
  feeSteps: 18,
  feeMultiplier: 460,
  breakFee: '220000000000000000000'
}
```

## 🚨 常见问题

### 1. 代币余额显示为0
- 检查钱包连接
- 确认网络为Anvil Local
- 查看Console错误信息

### 2. 交易失败
- 检查gas设置
- 确认账户有足够ETH
- 查看MetaMask错误信息

### 3. 无法连接钱包
- 确保MetaMask已安装
- 检查网络配置
- 重启浏览器

## 📊 预期结果

### 成功指标
- ✅ FOCUS代币余额正确显示
- ✅ 可以创建专注会话
- ✅ 交易成功执行
- ✅ 历史记录正确显示
- ✅ 费用计算正常工作

如果所有测试都通过，说明部署成功！🎉
