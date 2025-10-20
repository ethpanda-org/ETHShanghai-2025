# WalletConnect 完整配置指南

## 什么是WalletConnect？

WalletConnect是一个开源协议，允许移动钱包与桌面DApp安全连接。用户可以在手机上扫描二维码，使用移动钱包与桌面应用交互。

## 为什么需要ProjectId？

- **安全连接**: 确保连接的安全性
- **移动钱包支持**: 支持MetaMask Mobile、Trust Wallet等
- **跨平台交互**: 桌面应用 ↔ 移动钱包

## 获取ProjectId的详细步骤

### 步骤1: 访问WalletConnect Cloud
```
https://cloud.walletconnect.com/
```

### 步骤2: 注册账户
1. 点击 "Sign In"
2. 选择 "Sign in with GitHub" 或 "Sign in with Email"
3. 完成注册流程

### 步骤3: 创建新项目
1. 登录后，点击 "Create Project"
2. 填写项目信息：

```
Project Name: VoteAI Trading Platform
Description: DeFi trading platform with leverage positions
Homepage URL: http://localhost:3000
App Type: Web App
```

### 步骤4: 获取ProjectId
创建成功后，你会看到：
```
Project ID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**重要**: 复制这个Project ID，稍后需要用到。

## 配置到项目中

### 方法1: 环境变量配置（推荐）

#### 1. 创建环境变量文件
在项目根目录创建 `.env.local` 文件：

```bash
# WalletConnect配置
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的实际项目ID

# 区块链配置
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org

# 合约地址配置
NEXT_PUBLIC_DIAMOND_ADDRESS=0x2F1Cdbad93806040c353Cc87a5a48142348B6AfD
NEXT_PUBLIC_STETH_ADDRESS=0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84
NEXT_PUBLIC_FXUSD_ADDRESS=0x085a1b6da46ae375b35dea9920a276ef571e209c
NEXT_PUBLIC_WBTC_ADDRESS=0x29f2D40B0605204364af54EC677bD022dA425d03
NEXT_PUBLIC_WRMB_ADDRESS=0x795751385c9ab8f832fda7f69a83e3804ee1d7f3
```

#### 2. 重启开发服务器
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

### 方法2: 直接配置（临时方案）

如果暂时无法获取ProjectId，可以修改 `lib/wagmi.ts`：

```typescript
// 临时配置 - 替换为你的实际ProjectId
const walletConnectProjectId = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
```

## 验证配置

### 1. 检查控制台输出
打开浏览器控制台，应该看到：
```
✅ WalletConnect连接器已启用
```

而不是：
```
⚠️ WalletConnect连接器未启用，请配置有效的项目ID
```

### 2. 测试连接
1. 打开应用
2. 点击"连接钱包"
3. 选择"WalletConnect"选项
4. 应该显示二维码供移动钱包扫描

## 支持的钱包

配置成功后，用户可以使用以下移动钱包：

- **MetaMask Mobile**
- **Trust Wallet**
- **Coinbase Wallet**
- **Rainbow**
- **Argent**
- **imToken**
- 等等...

## 故障排除

### 问题1: "Missing projectId query parameter"
**解决方案**: 确保环境变量正确设置并重启服务器

### 问题2: 二维码不显示
**解决方案**: 检查ProjectId是否正确，确保网络连接正常

### 问题3: 移动钱包无法连接
**解决方案**: 
1. 确保移动钱包支持WalletConnect
2. 检查网络连接
3. 尝试重新生成二维码

## 生产环境配置

### 更新Homepage URL
在WalletConnect Cloud中更新项目信息：
```
Homepage URL: https://your-domain.com
```

### 环境变量配置
```bash
# 生产环境
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的生产环境项目ID
NEXT_PUBLIC_CHAIN_ID=1  # 主网
NEXT_PUBLIC_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

## 安全注意事项

1. **ProjectId是公开的**: 可以安全地放在前端代码中
2. **不要提交到Git**: 确保 `.env.local` 在 `.gitignore` 中
3. **定期更新**: 建议定期检查WalletConnect Cloud中的项目状态

## 总结

配置WalletConnect后，你的应用将支持：
- ✅ 桌面钱包连接（MetaMask、Coinbase Wallet等）
- ✅ 移动钱包连接（通过二维码扫描）
- ✅ 跨平台无缝体验
- ✅ 更好的用户体验
