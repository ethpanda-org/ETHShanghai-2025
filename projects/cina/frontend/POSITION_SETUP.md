# 开仓功能配置说明

## 环境变量配置

在项目根目录创建 `.env.local` 文件，添加以下配置：

```bash
# 区块链网络配置
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# 钱包连接配置
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# 合约地址配置（需要替换为实际地址）
NEXT_PUBLIC_DIAMOND_ADDRESS=0xYourDiamondAddress
NEXT_PUBLIC_STETH_ADDRESS=0xYourStETHAddress
NEXT_PUBLIC_FXUSD_ADDRESS=0xYourFxUSDAddress
```

## 合约地址配置

在 `lib/position.ts` 文件中，需要更新以下地址：

```typescript
export const META: Meta = {
  chainId: 421614, // Arbitrum Sepolia
  diamond: '0xYourDiamondAddress' as `0x${string}`, // 替换为实际的Diamond合约地址
  tokens: { 
    STETH: '0xYourStETHAddress' as `0x${string}`, // 替换为实际的stETH地址
    FXUSD: '0xYourFxUSDAddress' as `0x${string}`  // 替换为实际的FXUSD地址
  }
};
```

## 功能说明

### 已实现的6个核心接口

1. **getMeta()** - 获取基础配置（链ID、合约地址等）
2. **ensureApprove()** - 抵押物授权（自动检查并授权stETH给Diamond合约）
3. **deadline()** - 生成交易过期时间（默认20分钟）
4. **openPositionFlashLoan()** - 发送开仓交易（支持闪电贷）
5. **watchTx()** - 等待交易回执
6. **getPositions()** - 获取用户仓位列表

### 使用流程

1. 连接钱包
2. 输入抵押物数量（stETH）
3. 设置杠杆倍数
4. 点击"开仓"按钮
5. 系统自动处理：
   - 检查stETH余额
   - 授权stETH给Diamond合约（如需要）
   - 发送开仓交易
   - 等待交易确认
   - 刷新仓位列表

### 页面访问

- 主页：`/` - 包含导航链接
- 仓位页面：`/positions` - 开仓和仓位管理

## 注意事项

1. **测试网络**：当前配置为Arbitrum Sepolia测试网
2. **代币余额**：确保钱包中有足够的stETH作为抵押物
3. **Gas费用**：交易需要支付ETH作为Gas费用
4. **滑点保护**：当前使用简化的滑点计算，生产环境建议使用quote接口
5. **健康因子**：请关注仓位健康因子，避免清算风险

## 扩展功能

后续可以添加：
- Quote接口（精确计算minMintFxUSD）
- Swap功能（FXUSD兑换USDC）
- 平仓功能
- 仓位管理（调整杠杆、添加抵押物等）

