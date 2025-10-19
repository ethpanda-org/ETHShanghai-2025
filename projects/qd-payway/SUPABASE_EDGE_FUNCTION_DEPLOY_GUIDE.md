# Supabase Edge Function 部署指南

## 使用 Dashboard "Via Editor" 部署

Supabase Dashboard 的 Via Editor 不支持文件夹（如 `_shared/`），但支持**多个平级文件**。

我们的文件结构：
```
process-release-email/
├── index.ts           (主函数入口)
├── blockchain.ts      (区块链交互辅助函数)
└── email.ts           (邮件发送辅助函数)
```

---

## 第一步：进入 Edge Functions

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目（ctbklunoxeoowqhjvdxc）
3. 左侧菜单选择 **Edge Functions**
4. 点击 **Create a new function**
5. 选择 **Via Editor**

---

## 第二步：创建函数

**函数名称**: `process-release-email`

---

## 第三步：创建三个文件

在 Dashboard 编辑器中，你需要创建 3 个平级文件：

### 文件 1: `index.ts` (主函数)

将 `supabase/functions/process-release-email/index.ts` 的内容复制到这里。

这是主入口文件，包含：
- ✅ SendGrid Webhook 接收和解析（Parsed 格式）
- ✅ 邮箱验证和合约状态检查
- ✅ 放款流程编排
- ✅ 数据库状态更新

### 文件 2: `blockchain.ts` (区块链辅助函数)

将 `supabase/functions/process-release-email/blockchain.ts` 的内容复制到这里。

这个文件包含：
- ✅ 以太坊 Provider 初始化
- ✅ 平台钱包创建
- ✅ 智能合约调用（`pay()` 函数）
- ✅ 交易确认和错误处理

### 文件 3: `email.ts` (邮件辅助函数)

将 `supabase/functions/process-release-email/email.ts` 的内容复制到这里。

这个文件包含：
- ✅ SendGrid API 邮件发送
- ✅ 成功通知邮件模板
- ✅ 失败通知邮件模板

**导入路径说明**：
```typescript
// 在 index.ts 中导入同级文件
import { releasePayment } from './blockchain.ts'
import { sendReleaseSuccessEmail, sendReleaseFailureEmail } from './email.ts'
```

---

## 第四步：配置环境变量

在 Supabase Dashboard 中配置环境变量（Secrets）：

### 方式 1：通过 Dashboard UI

1. 进入 **Project Settings** > **Edge Functions**
2. 找到 **Secrets** 或 **Environment Variables** 部分
3. 添加以下变量：

```bash
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@mcppayway.com
ETH_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ESCROW_CONTRACT_ADDRESS=0x你的合约地址
PLATFORM_WALLET_PRIVATE_KEY=0x你的平台钱包私钥
```

### 方式 2：通过 CLI（如果有安装）

```bash
supabase secrets set SENDGRID_API_KEY=SG.xxxxx
supabase secrets set SENDGRID_FROM_EMAIL=noreply@mcppayway.com
supabase secrets set ETH_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
supabase secrets set ESCROW_CONTRACT_ADDRESS=0x...
supabase secrets set PLATFORM_WALLET_PRIVATE_KEY=0x...
```

**注意**：
- `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 会自动提供
- 不需要手动添加

---

## 第五步：部署函数

1. 检查代码无误
2. 点击 **Deploy** 按钮
3. 等待部署完成（通常 10-30 秒）

---

## 第六步：获取 Function URL

部署成功后，你的 Edge Function URL 是：

```
https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email
```

**这个 URL 就是要在 SendGrid Inbound Parse 中配置的 Destination URL！**

---

## 第七步：在 SendGrid 配置 Webhook

1. 登录 [SendGrid Dashboard](https://app.sendgrid.com/)
2. 进入 **Settings** > **Inbound Parse**
3. 点击 **Add Host & URL**
4. 配置：
   - **Subdomain**: `official`
   - **Domain**: `mcppayway.com`
   - **Destination URL**: `https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email`
5. 勾选：
   - ☑️ Check incoming emails for spam
   - ☐ POST the raw, full MIME message ← **不要勾选！**
6. 点击 **Add**
7. 复制 SendGrid 显示的 MX 记录信息

---

## 第八步：添加 DNS MX 记录

在你的域名 DNS 管理后台添加 MX 记录：

```dns
Type: MX
Host: official
Value: mx.sendgrid.net
Priority: 10
```

等待 DNS 传播（通常 10-60 分钟）。

---

## 测试 Edge Function

### 方法 1：使用 Dashboard 测试

1. 在 Edge Functions 页面，点击你的函数
2. 点击 **Invoke** 或 **Test** 标签
3. 发送测试请求：

**Body**（选择 `application/x-www-form-urlencoded`）:
```
from=test@example.com&subject=RELEASE: 123456789012&to=official@mcppayway.com
```

### 方法 2：使用 curl

```bash
curl -X POST https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "from=user@example.com&subject=RELEASE: 123456789012&to=official@mcppayway.com"
```

### 方法 3：发送真实邮件测试

```
1. 从你的个人邮箱（如 Gmail）发送邮件
2. 收件人: official@mcppayway.com
3. 主题: RELEASE: 实际的订单号
```

---

## 查看日志

### 在 Dashboard 中查看

1. 在 Edge Functions 页面
2. 选择你的函数 `process-release-email`
3. 点击 **Logs** 标签
4. 查看实时日志输出

### 日志内容包括

- ✅ 接收到的邮件信息（from, subject）
- ✅ 订单查询结果
- ✅ 验证过程
- ✅ 区块链交易哈希
- ✅ 数据库更新结果
- ✅ 错误信息（如果有）

---

## 故障排查

### 问题 1: 函数未收到 Webhook

**可能原因**:
- DNS MX 记录未生效
- SendGrid Inbound Parse 配置错误
- Webhook URL 错误

**解决方法**:
```bash
# 检查 DNS MX 记录
dig MX official.mcppayway.com

# 或使用在线工具
https://mxtoolbox.com/
```

### 问题 2: 邮箱验证失败

**可能原因**:
- 发件人邮箱与预留邮箱不一致
- 邮箱格式解析错误

**解决方法**:
- 查看日志中的 `Sender email` 和 `verification_email`
- 确认完全一致（包括大小写）

### 问题 3: 区块链交易失败

**可能原因**:
- 平台钱包 Gas 不足
- 平台钱包不是合约 admin
- 合约状态不是 PENDING
- RPC URL 无法访问

**解决方法**:
```bash
# 检查平台钱包余额
https://sepolia.etherscan.io/address/[PLATFORM_WALLET_ADDRESS]

# 检查是否为 admin
# 使用 ethers.js 调用 isAdmin() 函数
```

### 问题 4: 环境变量未配置

**错误信息**:
```
PLATFORM_WALLET_PRIVATE_KEY not configured
ESCROW_CONTRACT_ADDRESS not configured
```

**解决方法**:
- 检查 Supabase Secrets 是否正确配置
- 重新部署函数后环境变量才会生效

---

## SendGrid Parsed 格式说明

我们使用 SendGrid 的 **Parsed 格式**（默认），不勾选 "POST the raw, full MIME message"。

### Parsed 格式提供的字段

```javascript
{
  from: "user@gmail.com" 或 "User Name <user@gmail.com>",
  to: "official@mcppayway.com",
  subject: "RELEASE: 123456789012",
  text: "邮件纯文本内容",
  html: "<p>邮件HTML内容</p>",
  headers: "完整的邮件头信息",
  envelope: '{"to":["official@mcppayway.com"],"from":"user@gmail.com"}',
  dkim: "验证信息",
  SPF: "pass",
  spam_score: "0.0",
  // ... 其他字段
}
```

### 为什么使用 Parsed 格式？

✅ **优点**:
- SendGrid 已经解析好所有字段
- 直接获取 `from`、`subject`，无需自己解析
- 代码简洁、可靠
- 我们只需要这两个字段，足够了

❌ **Raw MIME 的缺点**:
- 需要自己解析复杂的 MIME 格式
- 代码量大，容易出错
- 处理附件、编码等复杂情况
- 我们用不到这些完整信息

---

## 代码结构说明

我们的 Edge Function 采用模块化设计，分为三个文件：

### `index.ts` - 主入口（约 180 行）
```typescript
import { releasePayment } from './blockchain.ts'
import { sendReleaseSuccessEmail, sendReleaseFailureEmail } from './email.ts'

serve(async (req) => {
  // 1. 接收 SendGrid Webhook
  // 2. 解析邮件（from, subject）
  // 3. 验证订单和邮箱
  // 4. 调用 releasePayment()
  // 5. 更新数据库
  // 6. 发送通知邮件
})
```

### `blockchain.ts` - 区块链交互（约 130 行）
```typescript
export function getProvider() {...}
export function getPlatformWallet() {...}
export async function releasePayment(orderId: string) {
  // 连接钱包
  // 调用合约 pay() 函数
  // 等待交易确认
  // 返回交易哈希
}
```

### `email.ts` - 邮件发送（约 290 行）
```typescript
export async function sendEmail(to, subject, html) {...}
export async function sendReleaseSuccessEmail(...) {...}
export async function sendReleaseFailureEmail(...) {...}
```

**为什么使用多文件？**
- ✅ 代码模块化，职责清晰
- ✅ 便于维护和调试
- ✅ 辅助函数可复用
- ✅ 符合软件工程最佳实践

---

## 安全检查清单

部署前确认：

- [ ] 所有环境变量已正确配置
- [ ] 平台钱包私钥安全存储在 Secrets 中
- [ ] 平台钱包有足够的测试 ETH（至少 0.01 ETH）
- [ ] 平台钱包已添加为合约 admin
- [ ] SendGrid API Key 有效
- [ ] SendGrid 域名认证已完成
- [ ] Inbound Parse 配置正确（不勾选 raw MIME）
- [ ] DNS MX 记录已添加并生效
- [ ] 合约地址正确无误

---

## 下一步

完成部署后：

1. **测试端到端流程**
   - 创建测试合约
   - 发送放款邮件
   - 验证状态更新

2. **监控日志**
   - 查看 Edge Function 日志
   - 检查 SendGrid Activity Feed
   - 监控平台钱包余额

3. **完善功能**
   - 实现取消合约功能
   - 添加更多通知渠道
   - 优化用户体验

---

**部署完成！** 🎉

如有问题，查看：
- Supabase Edge Function 日志
- SendGrid Activity Feed
- Sepolia Etherscan 交易详情

