# CrediNet 数据一致性指南

## 📋 概述

本文档说明如何确保 CrediNet Demo 前端所有页面和组件的数据保持同步和一致。

## 🎯 核心原则

### 1. 单一数据源原则
- **所有数据必须来自** `src/mock/data.ts`
- **禁止在组件中硬编码数据**
- **统一通过** `src/mock/index.ts` 导出和导入

### 2. 数据导入规范

✅ **正确做法：**
```typescript
// 从统一导出文件导入
import { mockCRNBalance, getFormattedCRNBalance } from '@/mock/data'
```

❌ **错误做法：**
```typescript
// 不要硬编码数据
const balance = 1234.56 // ❌ 禁止
const score = 782 // ❌ 禁止
```

### 3. 数据格式化规范

对于需要格式化的数据，使用统一的格式化函数：

```typescript
// CRN余额格式化
import { getFormattedCRNBalance } from '@/mock/data'
const balanceStr = getFormattedCRNBalance(2) // "1234.56"

// 信用分数格式化
import { getFormattedCreditScore } from '@/mock/data'
const scoreStr = getFormattedCreditScore() // "782"
```

## 📊 关键数据说明

### CRN余额 (mockCRNBalance)

```typescript
{
  balance: 1234.56,      // 当前余额 ⚠️ 必须在所有地方一致
  change30d: 182.4,      // 30天变化
  earned: 1500.00,       // 累计赚取
  withdrawn: 265.44      // 已提取
}
```

**使用位置：**
- Dashboard 页面 - CRNBalanceCard 组件
- Profile 页面 - 积分与成就卡片
- 所有需要显示余额的地方

### 信用分数 (mockCreditScore)

```typescript
{
  total: 782,            // 总分 ⚠️ 必须在所有地方一致
  change: 12,            // 变化值
  dimensions: {
    keystone: 85,        // 基石 K ⚠️ 五维数据必须一致
    ability: 78,         // 能力 A
    finance: 72,         // 财富 F
    health: 68,          // 健康 H
    behavior: 81         // 行为 B
  },
  lastUpdated: '2025-10-10 14:20'
}
```

**使用位置：**
- Dashboard 页面 - 顶部卡片、雷达图
- Profile 页面 - 顶部信息卡片
- 所有需要显示信用分数的地方

### 用户信息 (mockUser)

```typescript
{
  did: 'did:cred:0x12...9a4',     // DID
  address: '0xA1B2...C3D4',       // 地址
  joinedDate: '2025-01-13',       // 加入日期
  lastSync: '2025-10-10',         // 最后同步
  displayName: 'CrediNet User'    // 显示名称
}
```

## 🔍 数据验证

### 开发环境自动检查

在开发环境下，`src/mock/data.ts` 会自动在控制台输出数据统计信息：

```
📊 CrediNet 数据统计:
├─ CRN余额: 1234.56
├─ 信用分数: 782
├─ 已连接数据源: 3/4
├─ SBT勋章数量: 3
├─ 使用记录数量: 5
├─ 累计收益记录: 11.60 CRN
└─ 活跃应用: 6/8
```

### 手动验证步骤

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **打开浏览器控制台**，查看数据统计输出

3. **检查关键页面**：
   - Dashboard - 查看 CRN 余额和信用分数
   - Profile - 确认 CRN 余额与 Dashboard 一致
   - Data - 确认数据源状态一致

4. **验证数据同步**：
   - CRN 余额在所有页面应该显示为 **1234.56**
   - 信用分数在所有页面应该显示为 **782**
   - 五维数据（基石85、能力78、财富72、健康68、行为81）应该一致

## 📦 数据统计 API

可以使用 `dataStats` 对象获取统计信息：

```typescript
import { dataStats } from '@/mock/data'

console.log(dataStats.crnBalance)              // 1234.56
console.log(dataStats.creditTotal)             // 782
console.log(dataStats.connectedDataSources)    // 3
console.log(dataStats.totalSBTBadges)          // 3
console.log(dataStats.totalUsageRecords)       // 5
console.log(dataStats.totalRewardsFromRecords) // 11.6
```

## 🚨 常见问题

### Q1: 如何修改演示数据？

**A:** 只需修改 `src/mock/data.ts` 中的对应数据，所有引用该数据的地方会自动同步。

```typescript
// 修改 CRN 余额
export const mockCRNBalance: CRNBalance = {
  balance: 2468.12,  // 修改这里
  change30d: 182.4,
  earned: 1500.00,
  withdrawn: 265.44
}
```

### Q2: 为什么要使用格式化函数？

**A:** 确保数字格式在所有地方一致，例如小数位数、千位分隔符等。

### Q3: 如何添加新的数据？

**A:** 
1. 在 `src/types/index.ts` 中定义类型
2. 在 `src/mock/data.ts` 中添加数据
3. 在 `src/mock/index.ts` 中导出
4. 在组件中导入使用

### Q4: 数据不一致怎么办？

**A:** 
1. 检查是否有硬编码的数据
2. 确认所有组件都从 `@/mock/data` 导入
3. 查看浏览器控制台的数据统计输出
4. 重启开发服务器清除缓存

## ✅ 检查清单

在提交代码前，请确保：

- [ ] 所有数据都来自 `src/mock/data.ts`
- [ ] 没有硬编码的数字或数据
- [ ] 使用了统一的格式化函数
- [ ] CRN 余额在所有页面显示为 **1234.56**
- [ ] 信用分数在所有页面显示为 **782**
- [ ] 五维数据保持一致
- [ ] 浏览器控制台无数据一致性警告

## 📝 组件数据使用映射

| 组件/页面 | 使用的数据 | 验证项 |
|----------|-----------|--------|
| Dashboard | mockCRNBalance, mockCreditScore | CRN余额、信用分数 |
| Profile | mockCRNBalance, mockCreditScore, mockSBTBadges | CRN余额与Dashboard一致 |
| Data | mockDataSources, mockUsageRecords | 数据源状态 |
| Marketplace | mockEcoApps | 应用数量 |
| CRNBalanceCard | mockCRNBalance | 余额格式化 |
| CreditRadarChart | mockCreditScore | 五维数据一致 |

## 🔧 维护建议

1. **定期检查**：每次修改数据后，运行完整的页面检查
2. **文档更新**：添加新数据时，同步更新本文档
3. **代码审查**：PR 时重点检查是否有硬编码数据
4. **自动化测试**：考虑添加数据一致性的自动化测试

---

**最后更新**: 2025-10-19
**维护者**: CrediNet 开发团队

