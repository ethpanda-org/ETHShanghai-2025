# 测试账户信息

## 🎯 自动配置的测试账户

部署脚本会自动为以下测试账户分配代币：

### 测试账户 1
```
地址: 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A
初始余额:
  - 1 ETH
  - 1000 FOCUS 代币
```

**说明：**
- 此账户在运行 `DeployCompliant.s.sol` 部署脚本时自动获得代币
- 无需手动添加测试代币
- 可以直接使用此账户测试 FocusBond 功能

## 🔧 如何使用

### 1. 在 MetaMask 中导入账户

如果您有此账户的私钥，可以在 MetaMask 中导入：
1. 打开 MetaMask
2. 点击账户图标 → "导入账户"
3. 输入私钥
4. 切换到 Anvil 网络 (Chain ID: 31337)

### 2. 验证余额

```bash
# 检查 ETH 余额
cast balance 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A --rpc-url http://127.0.0.1:8545

# 检查 FOCUS 余额（使用实际部署的 FocusCredit 合约地址）
cast call <FocusCredit地址> "balanceOf(address)" 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A --rpc-url http://127.0.0.1:8545
```

## 📝 添加更多测试账户

如果需要为其他地址添加测试代币，可以修改 `script/DeployCompliant.s.sol`：

```solidity
// 添加更多测试账户
address testAccount2 = 0x你的地址;

// 发送 ETH
(bool success2, ) = payable(testAccount2).call{value: 1 ether}("");
require(success2, "ETH transfer failed");

// 发送 FOCUS
focusCredit.grantCredits(testAccount2, 1000 * 10**18, "Initial test credits");
```

然后重新部署合约即可。

## 🎮 开始测试

有了测试代币后，您可以：

1. **创建专注会话**
   - 质押 ETH（最少 0.001 ETH）
   - 设置会话时长（最少 15 分钟）

2. **测试中断会话**
   - 使用 FOCUS 代币支付服务费
   - 费用随时间递增

3. **测试完成会话**
   - 完成后获得质押金额返还
   - 可能获得额外的 FOCUS 奖励

## ⚠️ 注意事项

- 每次重启 Anvil 区块链，所有数据都会清空
- 重新部署合约后，需要重新获得测试代币
- 测试账户的代币仅在本地 Anvil 网络有效

