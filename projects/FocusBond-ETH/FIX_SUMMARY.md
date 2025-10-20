# 🔧 问题修复总结

## 已修复的问题

### 1. ✅ 合约地址引用修复

**问题**: 合约地址结构从`CONTRACTS.focusToken`改为`CONTRACTS[anvil.id].focus`后，`useTokenBalance` hook未更新

**修复**:
- 更新`useTokenBalance.ts`使用新的合约地址结构
- 添加`contracts`常量获取当前链的合约地址

```typescript
const contracts = CONTRACTS[anvil.id]
const focusBalance = useBalance({ token: contracts.focus })
const usdcBalance = useBalance({ token: contracts.usdc })
```

### 2. ✅ FOCUS余额显示修复

**问题**: 余额显示不正确或不更新

**原因**: 合约地址引用错误

**现状**: 
- 当前FOCUS余额: 7990 FOCUS（经过多次测试）
- 已正确配置权限
- `focusBond`地址已设置在`FocusCredit`合约中
- `MINTER_ROLE`已授予`FocusBond`合约

## 需要测试的功能

### 1. 中断会话扣费

**测试步骤**:
1. 开始一个专注会话（质押0.1 ETH）
2. 等待5分钟
3. 点击中断按钮
4. 检查FOCUS余额是否减少10 FOCUS

**预期行为**:
- 合约调用`focusCredit.redeemCredits(user, fee, "Session break fee")`
- 用户FOCUS余额减少
- 返回0.1 ETH质押

### 2. 完成会话奖励

**测试步骤**:
1. 开始一个5分钟专注会话
2. 等待5分钟完成
3. 自动或手动完成会话
4. 检查FOCUS余额是否增加0.5 FOCUS

**预期行为**:
- 合约调用`focusCredit.grantCredits(user, creditBonus, "Session completion bonus")`
- 用户FOCUS余额增加
- 返回0.1 ETH质押

## 市场购买功能实现建议

### 当前状态

市场界面已更新：
- 兑换比例: 100,000 FOCUS = 1 ETH
- 购买选项: 100/500/1000/5000 FOCUS
- 价格: 0.001/0.004/0.007/0.03 ETH

### 问题

`FocusBond`合约没有购买FOCUS的函数。目前只能通过admin手动发放。

### 解决方案

**方案A: 添加购买函数到合约**（推荐）

在`FocusBond.sol`中添加：

```solidity
function buyFocusCredits() external payable {
    require(msg.value > 0, "Must send ETH");
    
    // 计算FOCUS数量: 100,000 FOCUS per ETH
    uint256 focusAmount = (msg.value * 100000 * 10**18) / 1 ether;
    
    // 发放FOCUS
    focusCredit.grantCredits(msg.sender, focusAmount, "FOCUS purchase");
    
    // ETH转到rewardTreasury
    (bool success, ) = payable(rewardTreasury).call{value: msg.value}("");
    require(success, "Transfer failed");
    
    emit FocusPurchased(msg.sender, msg.value, focusAmount);
}
```

**方案B: 使用当前方案**（临时）

保持当前设置，购买功能显示"请联系管理员"，用户通过Discord/Telegram联系admin手动发放。

**方案C: 实现前端调用admin**（中间方案）

1. 创建一个后端API接收购买请求
2. 验证用户ETH支付
3. 后端使用admin私钥调用`grantCredits`
4. 返回交易哈希给用户

### 推荐实现步骤

1. **更新合约**（如果选择方案A）:
   ```bash
   # 修改 contracts/FocusBond.sol
   # 添加 buyFocusCredits 函数
   # 重新部署合约
   ```

2. **创建购买hook**:
   ```typescript
   // apps/web/lib/hooks/useBuyFocus.ts
   export function useBuyFocus() {
     const buyFocus = async (focusAmount: number) => {
       const ethAmount = focusAmount * 0.00001 // 100,000 FOCUS = 1 ETH
       await writeContract({
         address: contracts.focusBond,
         abi: FOCUSBOND_ABI,
         functionName: 'buyFocusCredits',
         value: parseEther(ethAmount.toString())
       })
     }
   }
   ```

3. **更新市场界面**:
   ```typescript
   const { buyFocus, loading } = useBuyFocus()
   
   <button onClick={() => buyFocus(pack.tokens)}>
     {loading ? '购买中...' : '购买'}
   </button>
   ```

## 测试清单

- [ ] 连接钱包成功
- [ ] FOCUS余额正确显示（当前7990 FOCUS）
- [ ] ETH余额正确显示
- [ ] 开始专注会话
- [ ] 中断会话 → FOCUS余额减少
- [ ] 完成会话 → FOCUS余额增加
- [ ] 近一周统计正确显示
- [ ] 排行榜正确显示
- [ ] 市场界面正确显示

## 下一步

1. **测试中断和完成功能**
   - 开始一个会话
   - 测试中断扣费
   - 测试完成奖励
   - 验证余额变化

2. **决定市场购买方案**
   - 方案A: 添加合约函数（需要重新部署）
   - 方案B: 保持手动发放
   - 方案C: 实现后端API

3. **清理测试数据**（可选）
   - 当前余额7990 FOCUS
   - 如需重置到2000，需要手动调整

## 快速测试命令

```bash
# 检查余额
cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "balanceOf(address)" 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A --rpc-url http://127.0.0.1:8545

# 检查会话状态
cast call 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 "sessions(address)" 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A --rpc-url http://127.0.0.1:8545

# 检查baseFeeFocus
cast call 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 "baseFeeFocus()" --rpc-url http://127.0.0.1:8545
```

## 预期行为

### 中断会话（5分钟内）
- 扣除: 10 FOCUS
- 余额变化: 7990 → 7980 FOCUS

### 完成会话（5分钟）
- 奖励: 0.5 FOCUS
- 余额变化: 7990 → 7990.5 FOCUS

### 完成会话（25分钟）
- 奖励: 2.5 FOCUS
- 余额变化: 7990 → 7992.5 FOCUS

