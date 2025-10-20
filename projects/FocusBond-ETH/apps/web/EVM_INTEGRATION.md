# FocusBond EVM 功能整合文档

## 概述

本次更新将旧版本 (`apps-stage1/web-evm`) 的所有功能整合到了新版本 (`apps/web`) 中，保持了新版本的界面设置，只修改了代码逻辑以整合交易功能。

## 已整合的功能

### 1. 连接钱包
- 使用 RainbowKit + wagmi 进行钱包连接
- 支持 MetaMask 等多种钱包
- 配置了 Anvil 本地测试网络 (Chain ID: 31337)

### 2. 合约部署
- FocusBond 合约地址: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- MockUSDC 合约地址: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- FocusCredit 合约地址: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

### 3. 创建会话
- 支持设置专注时长 (1-65535分钟)
- 支持设置质押金额 (最少 0.001 ETH)
- 实时验证参数有效性
- 显示交易状态和交易哈希

### 4. 启动定时器和中断监控
- 实时倒计时显示 (HH:MM:SS 格式)
- 心跳监控 (每2分钟检测一次)
- 心跳警告提示
- 自动刷新会话状态 (每秒更新)

### 5. 中断惩罚
- 动态计算中断费用 (每10分钟增加20%)
- 显示当前费用倍数
- 使用专注积分 (FCRED) 支付费用
- 确认弹窗显示详细费用信息
- 费用滑点保护 (+10%)

### 6. 完成奖励
- 显示完成会话可获得的奖励
- ETH 奖励 (质押金额的5%)
- 质押金全额返还
- 确认弹窗显示详细奖励信息

### 7. 代币余额显示
- ETH 余额实时显示
- USDC 余额显示
- FCRED (专注积分) 余额显示
- 基础费用信息展示

### 8. 费用计算 API
- `/api/session/calculate-fee` - 实时计算会话费用
- 返回会话信息、时间信息、费用信息、奖励信息
- 每5秒自动更新一次

## 新增文件

### Components
- `/components/FocusBondApp.tsx` - 主要功能组件
- `/components/EVMDashboard.tsx` - EVM Dashboard 组件
- `/components/ConnectButton.tsx` - 钱包连接按钮
- `/components/ui/card.tsx` - Card UI 组件
- `/components/ui/button.tsx` - Button UI 组件
- `/components/ui/input.tsx` - Input UI 组件
- `/components/ui/label.tsx` - Label UI 组件
- `/components/ui/badge.tsx` - Badge UI 组件

### Hooks
- `/lib/hooks/useStartSession.ts` - 创建会话 Hook (已更新)
- `/lib/hooks/useBreakSession.ts` - 中断会话 Hook (已更新)
- `/lib/hooks/useCompleteSession.ts` - 完成会话 Hook (已更新)
- `/lib/hooks/useHeartbeat.ts` - 心跳检测 Hook (新增)

### Configuration
- `/lib/wagmi.ts` - wagmi 配置文件
- `/app/providers-evm.tsx` - EVM Providers

### API Routes
- `/app/api/session/calculate-fee/route.ts` - 费用计算 API

### Pages
- `/app/dashboard-evm/page.tsx` - EVM Dashboard 页面
- `/app/dashboard-evm/layout.tsx` - EVM Dashboard 布局

## 使用方法

### 1. 安装依赖
```bash
cd apps/web
pnpm install
```

### 2. 启动开发服务器
```bash
pnpm dev
```

### 3. 访问 EVM Dashboard
打开浏览器访问: `http://localhost:3000/dashboard-evm`

### 4. 连接钱包
- 点击 "Connect Wallet" 按钮
- 选择 MetaMask
- 确保连接到 Anvil Local 网络 (Chain ID: 31337)
- 使用测试私钥导入账户 (如果需要)

### 5. 创建专注会话
1. 输入专注时长 (分钟)
2. 输入质押金额 (ETH)
3. 确保有足够的 FCRED 余额支付潜在费用
4. 点击 "创建会话" 按钮
5. 在 MetaMask 中确认交易

### 6. 管理会话
- **发送心跳**: 点击 "💓 心跳" 按钮保持会话活跃
- **中断会话**: 点击 "中断会话" 按钮提前结束 (需支付费用)
- **完成会话**: 倒计时结束后点击 "完成会话" 按钮获得奖励

## 技术栈

- **框架**: Next.js 15
- **钱包连接**: wagmi 2.5.7 + RainbowKit 2.0.0
- **以太坊交互**: viem 2.7.10
- **状态管理**: @tanstack/react-query 5.24.1
- **UI**: React + Tailwind CSS
- **类型检查**: TypeScript 5.9.3

## 注意事项

1. **本地开发**: 确保 Anvil 本地节点正在运行 (`http://127.0.0.1:8545`)
2. **合约地址**: 合约地址已硬编码在配置文件中，如需更新请修改 `/lib/wagmi.ts`
3. **测试网络**: 当前仅支持 Anvil Local 网络
4. **心跳检测**: 建议每2分钟发送一次心跳以保持会话活跃
5. **费用管理**: 确保账户有足够的 FCRED 余额支付中断费用

## 旧版本代码

旧版本代码保存在 `/apps-stage1/web-evm` 目录下，未做任何修改。

## 后续优化建议

1. 添加自动心跳功能
2. 支持多链切换
3. 添加会话历史记录
4. 优化移动端体验
5. 添加通知提醒功能

