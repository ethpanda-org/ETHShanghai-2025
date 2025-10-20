# 链上功能整合状态报告

## ✅ 已完成的工作 (方案B)

### 1. 基础设施 ✅

**配置文件:**
- ✅ `.env.local.example` - 环境变量示例
- ✅ `.env.local` - 实际环境变量 (已创建)
- ✅ `lib/chain.ts` - 链配置和合约地址
- ✅ `lib/wagmi.ts` - Wagmi配置 (使用环境变量)

**合约配置:**
```typescript
// 所有合约地址从环境变量读取
NEXT_PUBLIC_FOCUS_CONTRACT=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NEXT_PUBLIC_TOKEN_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_USDC_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 2. Hooks ✅

所有hooks已更新使用环境变量中的合约地址：

- ✅ `lib/hooks/useStartSession.ts` - 创建会话
- ✅ `lib/hooks/useBreakSession.ts` - 中断会话
- ✅ `lib/hooks/useCompleteSession.ts` - 完成会话
- ✅ `lib/hooks/useHeartbeat.ts` - 心跳检测
- ✅ `lib/hooks/useTokenBalance.ts` - 代币余额读取

### 3. ABI 定义 ✅

`lib/chain.ts` 包含：
- ✅ FOCUSBOND_ABI - 主合约ABI
- ✅ ERC20_ABI - 代币合约ABI

### 4. 文档 ✅

- ✅ `README-ONCHAIN.md` - 详细使用说明
- ✅ `INTEGRATION_STATUS.md` - 本文档

---

## 🔄 待完成的工作

### 主页面整合

需要在 `app/page.tsx` 中整合链上逻辑，**保持UI完全不变**：

#### 1. 顶部钱包区域 (第227-245行)

**当前代码:**
```tsx
<div className="flex items-center space-x-3">
  <div className="text-right">
    <p className="text-sm text-[#e0e0e0]">代币余额</p>
    <p className="font-semibold text-white">{earnedTokens} FOCUS</p>
  </div>
  ...
</div>
```

**需要添加:**
- 导入 `useBalance` 和 `useTokenBalance`
- 读取链上ETH余额和FCRED余额
- 将 `{earnedTokens}` 替换为真实链上余额
- **不改变任何className或结构**

#### 2. 专注会话按钮 (第335-340行)

**当前代码:**
```tsx
<button
  onClick={startFocusSession}
  className="bg-[#00b894] hover:bg-[#00a085] ..."
>
  🚀 开始专注会话
</button>
```

**需要修改:**
- 将 `startFocusSession` 改为调用 `useStartSession` hook
- 添加交易确认和等待逻辑
- 保留原有的模拟计时器作为fallback
- **不改变按钮样式**

#### 3. 中断按钮 (第420-425行)

**当前代码:**
```tsx
<button
  onClick={breakFocusSession}
  className="bg-[#ff4757] hover:bg-[#ff3838] ..."
>
  🚫 中断专注 (-{calculateBreakFee(...)} FOCUS)
</button>
```

**需要修改:**
- 调用 `useBreakSession` hook
- 添加链上费用查询
- 交易确认后更新状态
- **保持按钮样式不变**

#### 4. "我的"页面钱包显示 (第617-625行)

**当前代码:**
```tsx
<div className="flex items-center space-x-4 mb-6">
  <div className="w-20 h-20 rounded-full gradient-primary ...">
    {address?.slice(2, 4).toUpperCase()}
  </div>
  <div>
    <h2 className="text-2xl font-bold text-gradient">我的账户</h2>
    <p className="text-text-secondary text-sm">{address}</p>
  </div>
</div>
```

**需要添加:**
- 显示完整余额信息 (ETH + FCRED)
- 添加刷新按钮
- **不改变头像和标题样式**

---

## 📝 整合原则

### ✅ 严格遵守

1. **UI完全不变**
   - 不修改任何 className
   - 不改变 DOM 结构
   - 不调整布局和颜色
   - 保持所有现有样式

2. **仅添加逻辑**
   - 在现有 onClick 事件中添加链上调用
   - 读取链上数据替换模拟数据
   - 添加交易状态管理
   - 保留模拟逻辑作为fallback

3. **SSR兼容**
   - 使用 'use client' 标记
   - Hooks仅在mounted后调用
   - 防止hydration错误

4. **错误处理**
   - 显示交易错误
   - 提供retry机制
   - 网络切换提示

---

## 🔧 实施步骤

### Step 1: 更新Providers (如果需要)

检查 `app/providers.tsx` 是否已包含 Wagmi 配置。

### Step 2: 整合到主页面

在 `app/page.tsx` 顶部添加必要的imports：

```typescript
import { useBalance, useReadContract } from 'wagmi'
import { useTokenBalance } from '../lib/hooks/useTokenBalance'
import { useStartSession } from '../lib/hooks/useStartSession'
import { useBreakSession } from '../lib/hooks/useBreakSession'
import { useCompleteSession } from '../lib/hooks/useCompleteSession'
import { useHeartbeat } from '../lib/hooks/useHeartbeat'
import { CONTRACTS, FOCUSBOND_ABI } from '../lib/chain'
import { formatEther, formatUnits, parseEther } from 'viem'
```

### Step 3: 在组件中添加hooks调用

```typescript
// 在 Home() 函数组件内
const { data: ethBalance } = useBalance({ address: address as `0x${string}` })
const { focusBalance } = useTokenBalance(address as `0x${string}`)
const { startSession, loading: startLoading } = useStartSession()
const { breakSession } = useBreakSession()
const { completeSession } = useCompleteSession()
const { sendHeartbeat } = useHeartbeat()

// 读取会话状态
const { data: sessionData } = useReadContract({
  address: CONTRACTS.focusBond,
  abi: FOCUSBOND_ABI,
  functionName: 'sessions',
  args: address ? [address] : undefined,
  query: { enabled: !!address, refetchInterval: 1000 }
})
```

### Step 4: 更新事件处理

将现有的模拟函数改为调用真实的链上交易：

```typescript
const handleStartSession = async () => {
  try {
    const depositWei = parseEther('0.1') // 或从用户输入读取
    await startSession(focusTime, depositWei)
    // 成功后原有逻辑...
    setIsFocusing(true)
    setTimeLeft(focusTime * 60)
  } catch (error) {
    console.error(error)
    // Fallback到模拟逻辑
    startFocusSession()
  }
}
```

### Step 5: 更新余额显示

将硬编码的 `earnedTokens` 替换为真实余额：

```typescript
<p className="font-semibold text-white">
  {focusBalance ? formatUnits(focusBalance, 18) : '0'} FOCUS
</p>
```

---

## ✅ 验收清单

完成后需要满足：

- [ ] 主页面可以正常加载，无hydration错误
- [ ] 连接钱包后，顶部显示真实的ETH和FCRED余额
- [ ] 点击"开始专注会话"触发链上交易
- [ ] 交易确认后，倒计时开始
- [ ] 会话进行中，可以发送心跳
- [ ] 点击"中断专注"触发链上交易并支付FCRED
- [ ] 点击完成后触发链上交易并获得奖励
- [ ] 所有UI样式保持完全不变
- [ ] 无console错误
- [ ] 交易失败有错误提示

---

## 📦 已保留的文件

按照用户要求，以下文件已保留但不使用：

- `app/dashboard-evm/` - 独立的EVM Dashboard (之前创建的)
- `components/FocusBondApp.tsx` - 独立的FocusBond组件
- `components/EVMDashboard.tsx` - EVM Dashboard组件

这些文件作为参考保留，实际应用使用主页面 `app/page.tsx`。

---

## 🎯 下一步

用户需要手动完成 `app/page.tsx` 的整合，或者我可以继续帮助完成。

**建议的实施顺序：**
1. 先整合余额显示 (最简单，风险最小)
2. 然后整合开始会话
3. 再整合中断/完成功能
4. 最后添加心跳逻辑

**测试建议：**
- 每完成一步就测试
- 确保不破坏现有UI
- 检查console无错误
- 验证交易正确执行

---

**状态**: 🟡 基础设施完成，等待主页面整合
**更新时间**: $(date)

