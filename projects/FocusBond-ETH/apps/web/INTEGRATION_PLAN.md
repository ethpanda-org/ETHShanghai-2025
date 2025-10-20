# FocusBond EVM 前端整合计划

## 📋 当前状态分析

### 已发现的问题

1. **合约地址硬编码问题**
   - 自定义Hook中硬编码了合约地址 `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
   - 应该使用 [`wagmi.ts`](lib/wagmi.ts:42) 中的 `getContracts` 函数动态获取

2. **不完整的合约ABI定义**
   - 当前版本的 [`FocusBondApp.tsx`](components/FocusBondApp.tsx:18) 缺少关键的合约函数定义
   - 需要整合旧版本中完整的ABI定义

3. **功能逻辑不完整**
   - 缺少中断会话和完成会话的完整实现
   - 费用计算和奖励显示功能需要完善

## 🎯 整合目标

保持当前版本界面完全不变，只修复底层逻辑问题，整合旧版本的所有功能：

- ✅ 连接钱包功能
- ✅ 部署合约交互
- ✅ 创建会话功能
- ✅ 启动定时器和中断监控
- ✅ 代币的中断惩罚机制
- ✅ 完成奖励系统

## 🔧 具体修复步骤

### 步骤1: 修复合约地址硬编码问题

**文件**: [`lib/hooks/useStartSession.ts`](lib/hooks/useStartSession.ts)
**问题**: 第17行硬编码合约地址
**修复**: 使用 [`getContracts`](lib/wagmi.ts:42) 函数动态获取

**文件**: [`lib/hooks/useBreakSession.ts`](lib/hooks/useBreakSession.ts)
**问题**: 第17行硬编码合约地址
**修复**: 使用 [`getContracts`](lib/wagmi.ts:42) 函数动态获取

**文件**: [`lib/hooks/useCompleteSession.ts`](lib/hooks/useCompleteSession.ts)
**问题**: 第17行硬编码合约地址
**修复**: 使用 [`getContracts`](lib/wagmi.ts:42) 函数动态获取

**文件**: [`lib/hooks/useHeartbeat.ts`](lib/hooks/useHeartbeat.ts)
**问题**: 第17行硬编码合约地址
**修复**: 使用 [`getContracts`](lib/wagmi.ts:42) 函数动态获取

### 步骤2: 整合完整的合约ABI

**文件**: [`components/FocusBondApp.tsx`](components/FocusBondApp.tsx:18)
**当前ABI**: 不完整，只包含查询函数
**需要整合**: 从旧版本的 [`FocusBondApp.tsx`](apps-stage1/web-evm/src/components/FocusBondApp.tsx:14) 复制完整的ABI定义

### 步骤3: 实现完整的会话管理逻辑

**需要整合的功能**:
- 会话创建、中断、完成的完整流程
- 实时倒计时和状态更新
- 心跳机制和监控
- 费用计算和奖励显示

### 步骤4: 完善费用计算API

**文件**: [`app/api/session/calculate-fee/route.ts`](app/api/session/calculate-fee/route.ts)
**需要**: 确保费用计算逻辑与旧版本一致

## 📁 文件修改清单

### 需要修改的文件:

1. [`lib/hooks/useStartSession.ts`](lib/hooks/useStartSession.ts)
2. [`lib/hooks/useBreakSession.ts`](lib/hooks/useBreakSession.ts)
3. [`lib/hooks/useCompleteSession.ts`](lib/hooks/useCompleteSession.ts)
4. [`lib/hooks/useHeartbeat.ts`](lib/hooks/useHeartbeat.ts)
5. [`components/FocusBondApp.tsx`](components/FocusBondApp.tsx)
6. [`components/EVMDashboard.tsx`](components/EVMDashboard.tsx) (如果需要)

### 需要保持原样的文件:

- 所有UI组件文件
- 样式配置文件
- 布局文件

## 🔄 整合策略

### 保持界面不变
- 不修改任何UI组件
- 不改变样式和布局
- 只修改业务逻辑和合约交互

### 功能完整性
- 确保所有旧版本功能在新版本中正常工作
- 保持用户体验一致
- 维护相同的错误处理机制

## 🧪 测试计划

### 功能测试清单
- [ ] 钱包连接功能
- [ ] 会话创建功能
- [ ] 实时倒计时
- [ ] 心跳机制
- [ ] 中断会话功能
- [ ] 完成会话功能
- [ ] 费用计算显示
- [ ] 余额显示更新

### 集成测试
- [ ] 端到端交易流程
- [ ] 错误处理场景
- [ ] 网络切换测试

## ⏱️ 实施时间预估

| 任务 | 预估时间 | 优先级 |
|------|----------|--------|
| 修复合约地址硬编码 | 1小时 | 高 |
| 整合完整ABI | 1小时 | 高 |
| 实现会话管理逻辑 | 2小时 | 高 |
| 测试和验证 | 1小时 | 中 |
| 文档更新 | 0.5小时 | 低 |

**总预估时间**: 5.5小时

## 🚀 下一步行动

建议切换到 Code 模式来实施这些修复：

1. 首先修复合约地址硬编码问题
2. 然后整合完整的合约ABI定义
3. 最后实现完整的会话管理逻辑
4. 进行功能测试验证

## 📞 风险控制

### 已知风险
- 合约地址配置不一致可能导致交易失败
- ABI不匹配可能导致函数调用错误
- 界面逻辑修改可能影响用户体验

### 缓解措施
- 逐个文件修改，及时测试
- 保持界面组件完全不变
- 详细记录每次修改的内容

---

**创建时间**: 2025-10-19  
**状态**: 计划制定完成，等待实施