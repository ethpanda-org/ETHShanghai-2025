# 快速部署指南：通过 Supabase Dashboard 部署

## 📋 前提条件

- [x] 已完成 SendGrid 域名认证
- [x] 已配置 SendGrid Inbound Parse（指向 Edge Function URL）
- [x] 已准备平台钱包（有足够的 Gas）
- [x] 平台钱包已添加为合约 admin

---

## 🚀 部署步骤

### 步骤 1：进入 Edge Functions

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目 **ctbklunoxeoowqhjvdxc**
3. 左侧菜单点击 **Edge Functions**
4. 点击 **Create a new function**
5. 选择 **Via Editor**

---

### 步骤 2：创建函数

输入函数名称：`process-release-email`

点击 **Create function**

---

### 步骤 3：创建三个文件

在编辑器中，你会看到默认的 `index.ts`。你需要创建 3 个平级文件：

#### 文件 1: `index.ts` ✅（默认已存在）

**操作**：删除默认内容，复制以下文件的内容：
```
supabase/functions/process-release-email/index.ts
```

**这个文件做什么**：
- 接收 SendGrid Webhook（邮件通知）
- 验证发件人和订单状态
- 调用区块链和邮件模块
- 更新数据库状态

---

#### 文件 2: `blockchain.ts` ➕（需要创建）

**操作**：
1. 在编辑器中找到 **添加文件** 或 **New File** 按钮
2. 文件名输入：`blockchain.ts`
3. 复制以下文件的内容：
```
supabase/functions/process-release-email/blockchain.ts
```

**这个文件做什么**：
- 连接以太坊网络（Sepolia）
- 初始化平台钱包
- 调用智能合约的 `pay()` 函数
- 处理交易确认

---

#### 文件 3: `email.ts` ➕（需要创建）

**操作**：
1. 再次点击 **添加文件** 或 **New File**
2. 文件名输入：`email.ts`
3. 复制以下文件的内容：
```
supabase/functions/process-release-email/email.ts
```

**这个文件做什么**：
- 通过 SendGrid API 发送邮件
- 提供成功通知邮件模板
- 提供失败通知邮件模板

---

### 步骤 4：配置环境变量（Secrets）

在 Supabase Dashboard 中：

1. 进入 **Project Settings**
2. 找到 **Edge Functions** 或 **Secrets** 部分
3. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `SENDGRID_API_KEY` | `SG.xxxxx` | SendGrid API 密钥 |
| `SENDGRID_FROM_EMAIL` | `noreply@mcppayway.com` | 发件人邮箱 |
| `ETH_RPC_URL` | `https://ethereum-sepolia-rpc.publicnode.com` | 以太坊 RPC URL |
| `ESCROW_CONTRACT_ADDRESS` | `0x你的合约地址` | 托管合约地址 |
| `PLATFORM_WALLET_PRIVATE_KEY` | `0x你的私钥` | 平台钱包私钥 ⚠️ 保密 |

**注意**：
- `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 会自动提供
- 私钥绝对不要提交到代码仓库

---

### 步骤 5：部署

1. 检查三个文件的代码是否正确
2. 确认导入路径：
   ```typescript
   // index.ts 中
   import { releasePayment } from './blockchain.ts'
   import { sendReleaseSuccessEmail, sendReleaseFailureEmail } from './email.ts'
   ```
3. 点击 **Deploy** 按钮
4. 等待部署完成（通常 10-30 秒）

---

### 步骤 6：获取 Function URL

部署成功后，你的 Edge Function URL 是：

```
https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email
```

✅ 这个 URL 就是在 SendGrid Inbound Parse 中配置的 **Destination URL**！

---

### 步骤 7：在 SendGrid 配置 Webhook

1. 登录 [SendGrid Dashboard](https://app.sendgrid.com/)
2. 进入 **Settings** > **Inbound Parse**
3. 点击 **Add Host & URL**
4. 配置：
   - **Subdomain**: `official`
   - **Domain**: `mcppayway.com`（需要先完成域名认证）
   - **Destination URL**: `https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email`
5. 勾选：
   - ☑️ **Check incoming emails for spam**
   - ☐ **POST the raw, full MIME message** ← ❌ 不要勾选
6. 点击 **Add**
7. 复制 MX 记录信息

---

### 步骤 8：添加 DNS MX 记录

在你的域名 DNS 管理后台（如 Cloudflare、阿里云等）：

```dns
类型: MX
主机记录: official
记录值: mx.sendgrid.net
优先级: 10
```

等待 DNS 传播（10-60 分钟）。

---

## ✅ 测试部署

### 测试 1：直接调用 Function

```bash
curl -X POST https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "from=test@example.com&subject=RELEASE: 123456789012&to=official@mcppayway.com"
```

### 测试 2：发送真实邮件

1. 从你的个人邮箱（如 Gmail）发送邮件
2. **收件人**: `official@mcppayway.com`
3. **主题**: `RELEASE: 实际的订单号`
4. 发件人必须是合约中预留的邮箱

### 测试 3：查看日志

在 Supabase Dashboard:
1. 进入 **Edge Functions**
2. 选择 `process-release-email`
3. 点击 **Logs** 标签
4. 查看实时日志输出

---

## 📊 检查清单

部署完成后，确认以下事项：

- [ ] 三个文件都已创建（index.ts, blockchain.ts, email.ts）
- [ ] 所有环境变量都已配置
- [ ] Edge Function 部署成功
- [ ] SendGrid Inbound Parse 配置正确
- [ ] DNS MX 记录已添加并生效
- [ ] 平台钱包有足够的 Gas（至少 0.01 ETH）
- [ ] 平台钱包是合约的 admin
- [ ] 测试邮件能触发放款流程

---

## 🔍 常见问题

### Q1: 在哪里创建新文件？

**A**: 在 Dashboard 编辑器中，通常有以下方式：
- 文件列表旁边的 **+** 按钮
- 右键菜单中的 **New File**
- 顶部工具栏的 **Add File**

### Q2: 导入路径应该怎么写？

**A**: 使用相对路径 `./`：
```typescript
import { xxx } from './blockchain.ts'  // ✅ 正确
import { xxx } from 'blockchain.ts'    // ❌ 错误
import { xxx } from '../_shared/blockchain.ts'  // ❌ 错误（没有 _shared 文件夹）
```

### Q3: 环境变量在哪里配置？

**A**: 
1. 方式一：**Project Settings** > **Edge Functions** > **Secrets**
2. 方式二：**Edge Functions** 页面 > 点击函数 > **Secrets** 标签

### Q4: 如何知道部署成功？

**A**: 
- 编辑器右上角显示 ✅ **Deployed**
- 日志中没有错误信息
- Function URL 可以访问（返回 CORS 相关响应）

### Q5: SendGrid 配置的重点是什么？

**A**: 
- ✅ 域名认证（Domain Authentication）必须完成
- ✅ MX 记录必须正确添加
- ❌ 不要勾选 "POST the raw, full MIME message"
- ✅ Destination URL 必须是你的 Edge Function URL

---

## 📚 相关文档

- 详细配置指南：`PHASE3_SETUP_GUIDE.md`
- 完整功能说明：`PHASE3_COMPLETE.md`
- SendGrid 配置：`PHASE3_SETUP_GUIDE.md` 第 2 节

---

**部署完成！** 🎉

现在你的用户可以通过发送邮件来触发资金释放了！

