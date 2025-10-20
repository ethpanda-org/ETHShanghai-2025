# 🎯 完整测试指南

## 系统状态

- ✅ **Anvil**: 运行中
- ✅ **前端**: http://localhost:3000
- ✅ **合约**: 已部署（包含购买功能）
- ✅ **余额**: 2000 FOCUS + 1 ETH

## 合约地址（已更新）

- **FocusBond**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- **FocusCredit**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **MockUSDC**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

## 测试账户

- **地址**: `0x891402c216Dbda3eD7BEB0f95Dd89b010523642A`
- **初始余额**: 2000 FOCUS + 1 ETH

## 🧪 测试流程

### 测试1: 市场购买功能 ⭐ 新功能

**目标**: 测试用ETH购买FOCUS

**步骤**:
1. 访问 http://localhost:3000
2. 点击"市场"标签
3. 选择购买100 FOCUS（0.001 ETH）
4. 点击"购买"按钮
5. 确认MetaMask交易
6. 等待交易确认

**预期结果**:
- ✅ FOCUS余额: 2000 → 2100 (+100)
- ✅ ETH余额: 1.0 → 0.999 (-0.001)
- ✅ 显示"成功购买 100 FOCUS!"

**验证命令**:
```bash
# 检查FOCUS余额
cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "balanceOf(address)" 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A --rpc-url http://127.0.0.1:8545

# 应该显示: 2100 FOCUS
```

---

### 测试2: 完成会话奖励

**目标**: 测试完成专注后获得FOCUS奖励

**步骤**:
1. 记录当前FOCUS余额（如2100 FOCUS）
2. 选择5分钟专注
3. 点击"开始专注"
4. 确认质押0.1 ETH
5. 等待5分钟倒计时结束
6. 自动完成会话
7. 查看FOCUS余额

**预期结果**:
- ✅ 5分钟专注完成奖励: **+0.5 FOCUS**
- ✅ FOCUS余额: 2100 → 2100.5
- ✅ ETH余额: 0.999 → 1.099（返还质押）
- ✅ "我的"→"专注历史"显示完成记录
- ✅ 显示交易hash

**奖励公式**:
```
creditBonus = (elapsedMinutes * baseFeeFocus) / 100
           = (5 * 10) / 100
           = 0.5 FOCUS
```

---

### 测试3: 中断会话惩罚

**目标**: 测试中断专注后扣除FOCUS

**步骤**:
1. 记录当前FOCUS余额（如2100.5 FOCUS）
2. 选择5分钟专注
3. 点击"开始专注"
4. 确认质押0.1 ETH
5. 等待1分钟
6. 点击"中断专注"
7. 确认支付10 FOCUS
8. 查看FOCUS余额

**预期结果**:
- ✅ 5分钟内中断惩罚: **-10 FOCUS**
- ✅ FOCUS余额: 2100.5 → 2090.5
- ✅ ETH余额: 返还质押
- ✅ "我的"→"专注历史"显示中断记录
- ✅ 显示惩罚金额和交易hash

**惩罚公式**:
```
fee = baseFee * (1 + 0.2 * floor(elapsedMin / 10))
   = 10 * (1 + 0.2 * 0)
   = 10 FOCUS
```

---

### 测试4: 刷新后恢复会话

**目标**: 测试刷新页面后会话状态恢复

**步骤**:
1. 开始15分钟专注
2. 等待1分钟
3. 按F5刷新页面
4. 查看倒计时

**预期结果**:
- ✅ 倒计时显示约14分钟
- ✅ "中断专注"按钮可用
- ✅ 费用显示正常
- ✅ 可以继续中断或等待完成

---

### 测试5: 专注历史记录

**目标**: 验证历史记录完整显示

**步骤**:
1. 完成上述测试后
2. 点击"我的"标签
3. 滚动到"专注历史"部分
4. 查看历史记录

**预期记录**:
- ✅ 开始会话: 目标时长、质押金额、TX
- ✅ 中断会话: 惩罚10 FOCUS、TX
- ✅ 完成会话: 奖励0.5 FOCUS、TX
- ✅ 购买记录:（如果有）
- ✅ 所有TX hash可复制

---

### 测试6: 排行榜

**目标**: 验证排行榜显示

**步骤**:
1. 点击"排行榜"标签
2. 查看排名

**预期结果**:
- ✅ 第一名是你的账户
- ✅ FOCUS积分显示正确
- ✅ 绿色高亮 + "我"标签
- ✅ 统计数据合理

---

### 测试7: 近一周统计

**目标**: 验证近一周专注时长统计

**步骤**:
1. 点击"我的"标签
2. 查看"近一周专注时长"图表

**预期结果**:
- ✅ 基于实际链上事件计算
- ✅ 如果有数据，显示实际专注时长
- ✅ 如果无数据，显示默认值

---

## 预期余额变化

| 操作 | FOCUS变化 | ETH变化 | 最终FOCUS | 最终ETH |
|------|-----------|---------|-----------|---------|
| 初始 | - | - | 2000 | 1.0 |
| 购买100 | +100 | -0.001 | 2100 | 0.999 |
| 完成5分钟 | +0.5 | +0.1 (返还) | 2100.5 | 1.099 |
| 中断5分钟 | -10 | +0.1 (返还) | 2090.5 | 1.199 |

## 调试命令

```bash
# 检查FOCUS余额
cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "balanceOf(address)" 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A --rpc-url http://127.0.0.1:8545 | xargs python3 -c "import sys; print(f'{int(sys.argv[1], 16) / 10**18:.2f} FOCUS')" --

# 检查ETH余额
cast balance 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A --rpc-url http://127.0.0.1:8545 | xargs python3 -c "import sys; print(f'{int(sys.argv[1]) / 10**18:.4f} ETH')" --

# 检查会话状态
cast call 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 "sessions(address)" 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A --rpc-url http://127.0.0.1:8545

# 检查baseFeeFocus
cast call 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 "baseFeeFocus()" --rpc-url http://127.0.0.1:8545 | xargs python3 -c "import sys; print(f'{int(sys.argv[1], 16) / 10**18:.0f} FOCUS')" --
```

## 新增功能

### ✨ 市场购买功能（新）

**合约函数**:
```solidity
function buyFocusCredits() external payable {
    uint256 focusAmount = msg.value * 100000; // 100,000 FOCUS per ETH
    focusCredit.grantCredits(msg.sender, focusAmount, "FOCUS purchase with ETH");
    // Transfer ETH to reward treasury
}
```

**前端集成**:
- Hook: `useBuyFocus()`
- 功能: 点击购买按钮 → 发送ETH → 获得FOCUS
- 状态: 显示"购买中..."loading状态
- 反馈: 成功/失败提示

## 开始测试！🚀

按照上述顺序测试所有功能，验证：
1. ✅ 市场购买功能可用
2. ✅ 完成会话获得奖励
3. ✅ 中断会话扣除惩罚
4. ✅ 刷新后状态恢复
5. ✅ 历史记录完整显示

访问: http://localhost:3000
