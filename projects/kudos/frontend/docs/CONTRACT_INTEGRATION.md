# 合约集成指南

## 概述

本项目已完成 Web3 合约集成的前置准备工作，支持在以太坊测试网上与智能合约交互。

## 已完成的工作

### 1. 测试网配置
- ✅ Sepolia (以太坊测试网)
- ✅ Polygon Amoy (Polygon 测试网)
- ✅ BSC Testnet (币安智能链测试网)

### 2. 合约 ABI 定义
位置: `lib/contracts/abis.ts`

已定义的合约接口:
- **ERC20_ABI**: 标准 ERC20 代币合约
- **CHAOCI_PLATFORM_ABI**: 炒词平台主合约
  - 创建内容 (createContent)
  - 购买内容 (purchaseContent)
  - 查询内容 (getContent)
  - 检查购买状态 (hasPurchased)
  - 查询创作者收益 (getCreatorEarnings)
  - 提取收益 (withdrawEarnings)
- **BUSINESS_CARD_NFT_ABI**: 名片 NFT 合约
  - 铸造 NFT (mint)
  - 查询所有者 (ownerOf)
  - 查询余额 (balanceOf)
  - 查询元数据 (tokenURI)

### 3. 合约地址管理
位置: `lib/contracts/addresses.ts`

提供了统一的合约地址管理:
\`\`\`typescript
const address = getContractAddress("CHAOCI_PLATFORM", chainId)
\`\`\`

### 4. React Hooks
位置: `lib/contracts/hooks.ts`

已封装的合约交互 Hooks:
- `useGetContent(contentId)` - 读取内容信息
- `useHasPurchased(contentId)` - 检查购买状态
- `useGetCreatorEarnings()` - 查询创作者收益
- `useCreateContent()` - 创建内容
- `usePurchaseContent()` - 购买内容
- `useWithdrawEarnings()` - 提取收益
- `useMintBusinessCard()` - 铸造名片 NFT
- `useBusinessCardBalance()` - 查询 NFT 余额

### 5. 工具函数
位置: `lib/contracts/utils.ts`

提供的工具函数:
- `formatEthAmount()` - 格式化 ETH 金额
- `parseEthAmount()` - 解析 ETH 金额
- `formatTokenAmount()` - 格式化代币金额
- `parseTokenAmount()` - 解析代币金额
- `shortenAddress()` - 缩短地址显示
- `formatTxHash()` - 格式化交易哈希
- `getExplorerUrl()` - 获取区块浏览器链接
- `isValidAddress()` - 验证地址格式

### 6. 示例组件
位置: `components/contract/contract-interaction-demo.tsx`

提供了完整的合约交互示例，包括:
- 账户信息展示
- 创建内容
- 购买内容
- 提取收益
- 交易状态跟踪

## 下一步工作

### 1. 部署智能合约
需要在测试网上部署以下合约:
- 炒词平台主合约
- 名片 NFT 合约
- (可选) 平台代币合约

### 2. 更新合约地址
部署完成后，更新 `lib/contracts/addresses.ts` 中的合约地址。

### 3. 配置环境变量
复制 `.env.example` 为 `.env.local` 并填写:
\`\`\`bash
cp .env.example .env.local
\`\`\`

必需的环境变量:
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: 从 https://cloud.walletconnect.com/ 获取

### 4. 测试合约交互
1. 连接钱包到测试网
2. 获取测试网代币 (从水龙头)
3. 使用示例组件测试合约功能

### 5. 集成到业务逻辑
将合约交互集成到实际的业务流程中:
- 发布内容时调用 `createContent`
- 购买内容时调用 `purchaseContent`
- 个人中心显示收益并支持提取

## 测试网水龙头

获取测试网代币:
- **Sepolia**: https://sepoliafaucet.com/
- **Polygon Amoy**: https://faucet.polygon.technology/
- **BSC Testnet**: https://testnet.bnbchain.org/faucet-smart

## 区块浏览器

查看交易和合约:
- **Sepolia**: https://sepolia.etherscan.io/
- **Polygon Amoy**: https://amoy.polygonscan.com/
- **BSC Testnet**: https://testnet.bscscan.com/

## 注意事项

1. **安全性**: 
   - 永远不要在前端代码中暴露私钥
   - 使用环境变量管理敏感信息
   - 在生产环境中启用合约验证

2. **Gas 优化**:
   - 批量操作以减少交易次数
   - 使用事件监听而不是轮询
   - 合理设置 gas limit

3. **错误处理**:
   - 所有合约调用都应该有错误处理
   - 向用户展示友好的错误信息
   - 记录错误日志用于调试

4. **用户体验**:
   - 显示交易状态 (pending, confirming, success)
   - 提供区块浏览器链接
   - 支持交易取消和加速

## 参考资源

- [Wagmi 文档](https://wagmi.sh/)
- [Viem 文档](https://viem.sh/)
- [WalletConnect 文档](https://docs.walletconnect.com/)
- [Solidity 文档](https://docs.soliditylang.org/)
