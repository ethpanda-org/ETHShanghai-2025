# 🔍 余额显示调试指南

## 问题：FOCUS 代币余额不显示

我已经添加了调试日志来帮助诊断问题。

---

## 🧪 调试步骤

### 步骤 1: 打开应用和 Console

1. 访问：http://localhost:3000
2. 按 **F12** 打开开发者工具
3. 切换到 **Console** 标签

### 步骤 2: 连接钱包

1. 点击"连接 MetaMask 钱包"
2. 确认连接
3. **确保连接到 Anvil Local (Chain ID: 31337)**

### 步骤 3: 查看 Console 输出

连接后，Console 应该输出以下信息：

```javascript
📍 Contract Addresses: {
  focusBond: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  focusToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  usdc: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
}

🔍 Token Balance Debug: {
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  focusTokenAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  usdcAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
}

💰 Balance Read Result: {
  focusBalance: "500000000000000001100000000000000000000000",
  focusError: undefined,
  focusLoading: false,
  usdcBalance: "50001010000000000",
  usdcError: undefined,
  usdcLoading: false
}
```

### 步骤 4: 分析输出

#### ✅ 正常情况：
- `focusBalance` 有值（很大的数字）
- `focusError` 为 undefined
- `focusLoading` 为 false

#### ❌ 异常情况 1：找不到合约
```javascript
focusBalance: undefined
focusError: "Contract not found"
```

**解决方法：** 合约地址错误，需要检查部署

#### ❌ 异常情况 2：网络错误
```javascript
focusBalance: undefined
focusError: "Network error"
```

**解决方法：** Anvil 未运行或网络配置错误

#### ❌ 异常情况 3：一直 loading
```javascript
focusBalance: undefined
focusLoading: true
```

**解决方法：** RPC 连接问题

---

## 🔧 常见问题修复

### 问题 1: 余额为 undefined，有错误

**检查网络连接：**
```bash
# 测试 Anvil 节点
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**检查合约：**
```bash
# 查询合约余额（命令行）
cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
  "balanceOf(address)(uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --rpc-url http://127.0.0.1:8545
```

### 问题 2: Console 没有输出调试信息

**原因：** 页面可能缓存了

**解决：**
1. 按 Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows) 强制刷新
2. 或清除浏览器缓存

### 问题 3: MetaMask 显示的链不对

**检查 MetaMask：**
1. 打开 MetaMask
2. 查看当前网络
3. 应该显示 "Anvil Local" 或 "Hardhat" (Chain ID: 31337)

**切换网络：**
1. 点击网络下拉菜单
2. 选择 "Anvil Local" 或 "Hardhat"
3. 刷新页面

---

## 🎯 快速诊断

### 检查清单

运行这个命令查看所有关键信息：

```bash
echo "=== 诊断信息 ==="
echo ""
echo "1. Anvil 节点:"
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' && echo "" || echo "❌ Anvil 未运行"

echo ""
echo "2. FOCUS 代币余额:"
cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
  "balanceOf(address)(uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --rpc-url http://127.0.0.1:8545

echo ""
echo "3. 应用状态:"
lsof -i :3000 | grep LISTEN && echo "✅ 应用运行中" || echo "❌ 应用未运行"

echo ""
echo "4. 合约地址配置:"
cat apps/web/.env.local | grep TOKEN_ADDRESS
```

---

## 💡 解决方案

### 方案 1: 硬编码合约地址（推荐）

我已经将合约地址硬编码到 `lib/chain.ts` 中，应该可以直接工作。

**测试：**
1. 刷新页面（Cmd+Shift+R）
2. 连接钱包
3. 查看 Console 输出
4. 查看顶部余额

### 方案 2: 重新铸造代币

如果余额仍然不显示，重新铸造：

```bash
cd /Users/mingji/postgraduate/FocusBond-ETH/apps/web
./scripts/mint-test-tokens.sh
```

### 方案 3: 检查 wagmi 配置

确保 wagmi 连接到正确的链：

```typescript
// 在 Console 中执行
window.location.reload()
```

---

## 📊 预期的 Console 输出

连接钱包后，你应该在 Console 看到：

```
📍 Contract Addresses: {focusBond: "0x9fE...", focusToken: "0xe7f...", usdc: "0x5Fb..."}
🔍 Token Balance Debug: {address: "0xf39...", focusTokenAddress: "0xe7f...", ...}
💰 Balance Read Result: {focusBalance: "500000000000000001100000000000000000000000", ...}
```

**如果看到 `focusBalance` 有值，说明读取成功！**

那么余额应该显示在页面上。

---

## 🆘 如果还是不显示

请告诉我 Console 中的确切输出，特别是：

1. `📍 Contract Addresses` 显示的地址
2. `💰 Balance Read Result` 显示的内容
3. 是否有任何红色错误信息

我会根据具体错误帮你解决！

---

**现在请访问 http://localhost:3000 并查看 Console！** 🔍

