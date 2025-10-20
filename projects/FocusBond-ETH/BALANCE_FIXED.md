# ✅ 余额显示问题已修复

## 问题描述
用户反馈前端显示的FOCUS余额不正确，显示为 `8000 * 10^18` 而不是 `2000.00 FOCUS`。

## 根本原因
MockFOCUS合约的 `mint` 函数会自动将输入金额乘以 `10**18`：

```solidity
function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount * 10**18);  // 这里会自动乘以10^18
}
```

当我们调用 `mint(address, 2000000000000000000000)` 时，实际上铸造了 `2000000000000000000000 * 10**18` 个代币，导致余额异常大。

## 解决方案
1. **重新部署合约**：停止Anvil，重新启动，并重新部署所有合约
2. **使用正确的mint方式**：调用 `mint(address, 2000)` 而不是 `mint(address, 2000000000000000000000)`
3. **更新前端合约地址**：确保前端使用最新的合约地址

## 执行步骤

### 1. 重新部署合约
```bash
./scripts/deploy-and-mint.sh
```

**部署结果**：
- FocusBond: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- FocusToken: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- USDC: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### 2. 更新前端配置
更新 `/Users/mingji/postgraduate/FocusBond-ETH/apps/web/lib/chain.ts`：

```typescript
export const CONTRACTS = {
  focusBond: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`,
  focusToken: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`,
  usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
} as const
```

### 3. 给用户地址发放代币
```bash
# 转账1 ETH
cast send 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A \
  --value 1ether \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 铸造2000 FOCUS（注意：传入2000，合约会自动乘以10^18）
cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
  "mint(address,uint256)" \
  0x891402c216Dbda3eD7BEB0f95Dd89b010523642A \
  2000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 4. 验证余额
```bash
# 检查FOCUS余额
cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
  "balanceOf(address)" \
  0x891402c216Dbda3eD7BEB0f95Dd89b010523642A \
  --rpc-url http://127.0.0.1:8545
```

**验证结果**：
- 余额 (hex): `0x00000000000000000000000000000000000000000000006c6b935b8bbd400000`
- 余额 (dec): `2000000000000000000000`
- 余额 (FOCUS): `2000.00` ✅

## 前端余额显示逻辑
前端使用 `formatUnits` 函数正确处理余额显示：

```typescript
// apps/web/app/page.tsx
{focusBalance && focusDecimals ? 
  parseFloat(formatUnits(focusBalance, focusDecimals)).toFixed(2) : '0'} FOCUS
```

其中：
- `focusBalance`: BigInt类型，值为 `2000000000000000000000n`
- `focusDecimals`: 18
- `formatUnits(focusBalance, 18)`: 将 `2000000000000000000000` 除以 `10^18`，得到 `"2000.0"`
- `parseFloat().toFixed(2)`: 格式化为 `"2000.00"`

## 测试账户信息
- **地址**: `0x891402c216Dbda3eD7BEB0f95Dd89b010523642A`
- **ETH余额**: ~1 ETH
- **FOCUS余额**: 2000 FOCUS

## 下一步
1. ✅ 重新部署合约并给正确的地址发放2000 FOCUS代币
2. 🔄 验证前端余额显示是否正确（应该显示2000.00 FOCUS，而不是科学计数法）
3. ⏳ 测试完整的创建会话、中断、完成流程，确保历史记录正确显示

## 测试步骤
1. 打开浏览器访问 http://localhost:3000
2. 连接钱包（使用地址 `0x891402c216Dbda3eD7BEB0f95Dd89b010523642A`）
3. 检查顶部是否显示 `2000.00 FOCUS`
4. 检查"我的"页面是否显示 `2000 FOCUS 代币`
5. 测试创建专注会话、中断、完成功能
6. 检查历史记录是否正确显示在"我的"页面

