# ✅ PayWay 数据库设置完成

## 📊 Supabase数据库已成功创建

**项目名称：** supabase-eth-shanghai-2025  
**项目ID：** ctbklunoxeoowqhjvdxc  
**区域：** us-east-1  
**状态：** ✅ ACTIVE_HEALTHY

---

## 🗄️ 已创建的数据库对象

### 1. contracts 表
```sql
✅ id (UUID, Primary Key)
✅ order_id (TEXT, UNIQUE) - 订单编号
✅ sender_address (TEXT) - 付款方地址
✅ receiver_address (TEXT) - 收款方地址
✅ amount (TEXT) - 托管金额
✅ token_address (TEXT) - 代币合约地址
✅ status (TEXT) - 状态 (PENDING/PAID/CANCELLED)
✅ verification_method (TEXT) - 验证方式
✅ verification_email (TEXT) - 验证邮箱
✅ transaction_hash (TEXT) - 交易哈希
✅ created_at (TIMESTAMPTZ) - 创建时间
✅ updated_at (TIMESTAMPTZ) - 更新时间
```

### 2. 索引
```sql
✅ idx_contracts_order_id - 订单号索引
✅ idx_contracts_sender - 付款方地址索引
✅ idx_contracts_receiver - 收款方地址索引
✅ idx_contracts_status - 状态索引
✅ idx_contracts_created_at - 创建时间索引
```

### 3. 触发器
```sql
✅ update_contracts_updated_at - 自动更新updated_at时间戳
```

### 4. RLS (Row Level Security) 策略
```sql
✅ Anyone can view contracts - 任何人可查看
✅ Anyone can insert contracts - 任何人可创建
✅ Allow updates for MVP - 允许更新（MVP阶段）
```

### 5. 辅助视图
```sql
✅ user_contracts - 用户合约视图（显示用户角色）
```

---

## 🔑 环境变量配置

请将以下配置添加到 `frontend/payway/.env.local` 文件：

```env
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://ctbklunoxeoowqhjvdxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0YmtsdW5veGVvb3dxaGp2ZHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MzM1MDMsImV4cCI6MjA3NjMwOTUwM30.xSxSvMlQF0LaOalFTNTWk9KAwrF0OKb72fIi0mxi5oM

# WalletConnect配置
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# 合约地址（需要部署后填写）
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_USDT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

---

## 📝 数据库迁移记录

| 迁移名称 | 执行时间 | 状态 |
|---------|---------|------|
| create_contracts_table | 2025-10-18 | ✅ 成功 |
| create_rls_policies | 2025-10-18 | ✅ 成功 |
| adjust_rls_for_web3 | 2025-10-18 | ✅ 成功 |

---

## 🧪 测试数据库连接

你可以运行以下命令测试数据库连接：

```typescript
// 在Next.js中测试
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase
  .from('contracts')
  .select('count')
  
console.log('连接成功！当前合约数量：', data)
```

或者在Supabase Dashboard中执行：

```sql
SELECT COUNT(*) FROM contracts;
```

---

## 🔐 RLS策略说明

### MVP阶段（当前）
- ✅ **查看：** 公开透明，任何人可查看所有合约
- ✅ **创建：** 允许创建，前端验证钱包地址
- ✅ **更新：** 允许更新（简化策略）
- ❌ **删除：** 禁止删除（保持审计追踪）

### 生产环境建议
在生产环境应该加强UPDATE策略：

```sql
-- 仅允许通过后端服务（service_role）更新
CREATE POLICY "Only backend can update"
ON contracts FOR UPDATE
TO authenticated
USING (auth.role() = 'service_role');
```

或者通过自定义JWT claims验证钱包地址：

```sql
-- 验证钱包地址匹配
CREATE POLICY "Wallet owner can update"
ON contracts FOR UPDATE
USING (
  sender_address = current_setting('request.jwt.claims')::json->>'wallet_address'
);
```

---

## 📊 数据库统计

- **表数量：** 1
- **索引数量：** 5
- **RLS策略：** 3
- **触发器：** 1
- **视图：** 1
- **当前记录数：** 0

---

## 🚀 下一步

现在数据库已准备就绪，你可以：

1. ✅ 更新 `.env.local` 文件
2. ✅ 重启开发服务器
3. ✅ 测试创建合约功能
4. ✅ 查看数据是否正确保存

---

## 📞 Supabase Dashboard访问

**Dashboard URL:** https://supabase.com/dashboard/project/ctbklunoxeoowqhjvdxc

在Dashboard中你可以：
- 查看表数据
- 执行SQL查询
- 监控性能
- 查看日志
- 管理RLS策略

---

## ✨ 数据库特性

### 自动时间戳
- `created_at` - 创建时自动设置
- `updated_at` - 更新时自动更新

### 数据验证
- `status` - 只能是 PENDING/PAID/CANCELLED
- `order_id` - 唯一约束

### 性能优化
- 为常用查询字段创建了索引
- 支持高效的地址查询
- 支持按状态和时间排序

---

**🎉 数据库设置完成！现在可以开始测试创建合约功能了！**

