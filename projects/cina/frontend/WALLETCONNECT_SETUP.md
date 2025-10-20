# WalletConnect 配置说明

## 问题描述
如果遇到以下错误：
```
Missing projectId query parameter
```

这是因为WalletConnect需要配置有效的项目ID。

## 解决方案

### 1. 获取WalletConnect项目ID

1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. 注册或登录账户
3. 创建一个新项目
4. 复制项目ID

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# 钱包连接配置
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_actual_project_id_here

# 其他配置
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org
```

### 3. 重启开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

## 当前配置状态

- ✅ **Injected钱包连接器** - 支持MetaMask等浏览器钱包
- ✅ **MetaMask连接器** - 专门的MetaMask支持
- ⚠️ **WalletConnect连接器** - 需要配置项目ID才能启用

## 临时解决方案

如果暂时不需要WalletConnect功能，可以：

1. 使用MetaMask或其他浏览器钱包连接
2. 系统会自动跳过WalletConnect连接器
3. 不会影响其他钱包连接功能

## 验证配置

打开浏览器控制台，应该看到以下信息之一：

- ✅ `WalletConnect连接器已启用` - 配置成功
- ⚠️ `WalletConnect连接器未启用，请配置有效的项目ID` - 需要配置项目ID

## 注意事项

1. 项目ID是公开的，可以安全地放在前端代码中
2. 不要将项目ID提交到版本控制系统
3. 确保 `.env.local` 文件在 `.gitignore` 中
