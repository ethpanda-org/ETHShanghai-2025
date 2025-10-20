# 🎯 快速参考

## 当前配置

### 合约地址
- FocusBond: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- FocusCredit: `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6`
- MockUSDC: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`

### 费用配置
- baseFeeFocus: **5 FOCUS** ✅
- baseFeeUsdc: 1 USDC
- feeStepMin: 10 分钟

### 奖励/惩罚
| 操作 | 时长 | FOCUS变化 |
|------|------|----------|
| 完成 | 5分钟 | +0.25 |
| 完成 | 25分钟 | +1.25 |
| 中断 | 5分钟 | -5 |
| 中断 | 15分钟 | -6 |

### 市场兑换比例
- 100 FOCUS = 0.01 ETH
- 10000 FOCUS = 1 ETH

### 用户余额
- FOCUS: ~4000 FOCUS
- ETH: ~2.9 ETH

## 测试账户

**地址**: `0x891402c216Dbda3eD7BEB0f95Dd89b010523642A`

**私钥**: 需要在MetaMask中导入

## 快速测试

```bash
# 1. 启动前端（如果未启动）
cd /Users/mingji/postgraduate/FocusBond-ETH/apps/web && pnpm dev

# 2. 访问
open http://localhost:3000

# 3. 测试完成专注
# - 选择5分钟专注
# - 等待倒计时结束
# - 验证FOCUS余额增加0.25

# 4. 测试中断专注
# - 开始5分钟专注
# - 立即中断
# - 验证FOCUS余额减少5
```

## 常用命令

```bash
# 查看FOCUS余额
cast call 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6 "balanceOf(address)" 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A --rpc-url http://127.0.0.1:8545

# 查看ETH余额
cast balance 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A --rpc-url http://127.0.0.1:8545

# 查看baseFeeFocus
cast call 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 "baseFeeFocus()" --rpc-url http://127.0.0.1:8545
```
