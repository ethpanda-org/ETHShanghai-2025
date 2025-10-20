# 前端与合约集成指�?

## 概述

本文档说明前端如何与智能合约集成，包括评分机制、SBT 铸造和动态更新功能�?

## 已完成的集成

### 1. 合约地址配置

**文件**: `src/contracts/addresses.ts`

- �?配置�?Sepolia 测试网的合约地址
- �?CrediNetCore 指向 DynamicSBTAgent (0xD395aD6F33Ac2cDE368429f3A3DeC3FC3B70C099)
- �?SBTRegistry 地址 (0xFb1D71967EeDFDa27EF2038f6b8CcB35286Dc791)
- �?DynamicSBTAgent 地址 (0xD395aD6F33Ac2cDE368429f3A3DeC3FC3B70C099)

### 2. 评分机制集成

**文件**: `src/hooks/useCrediNet.ts`

- �?使用 DynamicSBTAgent �?`getUserCreditInfo` 函数
- �?支持五维信用评分查询 (keystone, ability, wealth, health, behavior)
- �?支持手动更新评分 (需�?Oracle 权限)
- �?实时数据刷新功能

**文件**: `src/components/web3/CreditScoreDisplay.tsx`

- �?显示从合约读取的真实信用评分
- �?五维评分可视化展�?
- �?手动刷新功能

### 3. 动�?SBT 展示

**文件**: `src/hooks/useDynamicSBT.ts`

- �?实时读取用户信用信息
- �?监听评分更新事件
- �?稀有度升级动画
- �?自动刷新机制 (30秒间�?

**文件**: `src/components/sbt/SBTDynamicDisplay.tsx`

- �?动�?SBT 卡片展示
- �?稀有度等级显示 (COMMON, RARE, EPIC, LEGENDARY)
- �?五维评分雷达�?
- �?升级动画效果

### 4. SBT 铸造功�?

**文件**: `src/hooks/useSBTMint.ts`

- �?支持铸造信�?SBT
- �?权限检�?(MINTER_ROLE)
- �?铸造动画触�?
- �?事件解析和数据获�?

### 5. 页面集成

**文件**: `src/pages/Dashboard.tsx`

- �?连接钱包时显示真实合约数�?
- �?未连接时显示模拟数据
- �?集成动�?SBT 展示组件

**文件**: `src/pages/Web3Demo.tsx`

- �?合约连接状态检�?
- �?实时显示所有合约地址状�?
- �?完整�?Web3 功能演示

## 测试方法

### 1. 启动前端

```bash
cd frontend
npm run dev
```

访问 http://localhost:3001

### 2. 连接钱包

1. 点击右上�?"Connect Wallet"
2. 选择 MetaMask 或其他钱�?
3. 切换�?Sepolia 测试�?

### 3. 测试功能

#### 查看合约连接状�?
- 访问 Web3Demo 页面
- 查看 "合约连接状�? 卡片
- 确认所有合约地址显示�?�?

#### 查看信用评分
- 访问 Dashboard 页面
- 查看动�?SBT 展示
- 查看信用评分显示组件

#### 测试评分更新
- 需�?Oracle 权限才能手动更新评分
- 可以通过 Agent 服务自动更新

## 合约地址说明

### Sepolia 测试�?

- **CrediNetCore**: `0xD395aD6F33Ac2cDE368429f3A3DeC3FC3B70C099` (使用 DynamicSBTAgent)
- **SBTRegistry**: `0xFb1D71967EeDFDa27EF2038f6b8CcB35286Dc791`
- **DynamicSBTAgent**: `0xD395aD6F33Ac2cDE368429f3A3DeC3FC3B70C099`
- **CRNToken**: `0x0000000000000000000000000000000000000000` (未部�?
- **DataMarketplace**: `0x0000000000000000000000000000000000000000` (未部�?

## 注意事项

1. **网络要求**: 需要连接到 Sepolia 测试�?
2. **权限要求**: 某些功能需要特定角色权�?
3. **数据更新**: 评分更新需要通过 Oracle �?Agent 服务
4. **Gas 费用**: 测试网需�?Sepolia ETH

## 故障排除

### 常见问题

1. **合约地址显示�?0x000...**
   - 检查网络是否正�?(Sepolia)
   - 确认合约地址配置正确

2. **无法读取信用数据**
   - 确认钱包已连�?
   - 检查网络连�?
   - 确认合约已部�?

3. **铸�?SBT 失败**
   - 检查是否有 MINTER_ROLE 权限
   - 确认 Gas 费用充足
   - 检查合约状�?

### 调试工具

使用浏览器开发者工具查看：
- 控制台错误信�?
- 网络请求状�?
- 合约调用日志

## 下一�?

1. 部署 CRNToken 合约
2. 实现数据市场功能
3. 完善 Agent 服务集成
4. 添加更多测试用例
