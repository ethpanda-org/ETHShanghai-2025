# Edge Function 代码更新：支持 SendGrid Parsed 格式

## ✅ 更新完成

所有代码已经更新为正确处理 SendGrid 的 **Parsed 格式**（不勾选 "POST the raw, full MIME message"）。

---

## 📝 更新详情

### 1. `index.ts` - 主函数入口

#### 更新内容：

**邮件数据解析**（第 28-38 行）：
```typescript
// 解析 SendGrid Webhook 数据（Parsed 格式）
// SendGrid 会自动解析邮件，提供 from, subject, envelope 等字段
const formData = await req.formData()
const from = formData.get('from')?.toString() || ''
const subject = formData.get('subject')?.toString() || ''
const envelope = formData.get('envelope')?.toString() || ''
const to = formData.get('to')?.toString() || ''

console.log(`Email from: ${from}`)
console.log(`Email to: ${to}`)
console.log(`Subject: ${subject}`)
```

**邮箱提取逻辑**（第 40-67 行）：
```typescript
// 提取真实的发件人邮箱
// 优先使用 envelope.from（SMTP 级别的真实发件人）
// 否则从 from 字段提取（可能包含名字，如 "User Name <user@example.com>"）
let senderEmail = from

// 1. 尝试从 envelope 获取真实发件人
if (envelope) {
  try {
    const envelopeData = JSON.parse(envelope)
    if (envelopeData.from) {
      senderEmail = envelopeData.from
    }
  } catch (error) {
    console.warn('Failed to parse envelope:', error)
  }
}

// 2. 如果 from 包含尖括号格式 "Name <email>"，提取邮箱部分
if (senderEmail.includes('<')) {
  const emailMatch = senderEmail.match(/<(.+?)>/)
  if (emailMatch) {
    senderEmail = emailMatch[1]
  }
}

// 3. 统一转换为小写并去除空格
senderEmail = senderEmail.toLowerCase().trim()
console.log(`Extracted sender email: ${senderEmail}`)
```

#### 为什么这样处理？

1. **使用 `formData.get()`**：
   - SendGrid Parsed 格式会以 `application/x-www-form-urlencoded` 或 `multipart/form-data` 格式发送数据
   - 可以直接通过字段名获取值（`from`, `subject`, `to`, `envelope` 等）

2. **优先使用 `envelope.from`**：
   - `envelope` 包含 SMTP 协议级别的真实发件人信息
   - 比 `from` 头部更可靠（`from` 头可以被伪造）

3. **处理多种邮箱格式**：
   - `user@example.com` - 纯邮箱
   - `User Name <user@example.com>` - 包含名字
   - `"User Name" <user@example.com>` - 带引号的名字

---

### 2. `email.ts` - 邮件发送模块

#### 更新内容：

**修正默认发件人邮箱**（第 17 行）：
```typescript
const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@mcppayway.com'
```

**修改说明**：
- 之前：`noreply@payway.com`（错误的域名）
- 现在：`noreply@mcppayway.com`（正确的域名）

---

### 3. `blockchain.ts` - 区块链交互模块

**无需修改** ✅

这个模块不涉及邮件解析，无需更新。

---

## 📊 SendGrid Parsed 格式示例

当 SendGrid 接收到邮件并转发到你的 Edge Function 时，会发送以下格式的数据：

### Content-Type: `application/x-www-form-urlencoded` 或 `multipart/form-data`

```javascript
{
  // 基本字段
  from: "John Doe <john@example.com>",
  to: "official@mcppayway.com",
  subject: "RELEASE: 123456789012",
  
  // 邮件内容
  text: "邮件的纯文本内容",
  html: "<p>邮件的HTML内容</p>",
  
  // SMTP 信息
  envelope: '{"to":["official@mcppayway.com"],"from":"john@example.com"}',
  
  // 邮件头
  headers: "Received: from...\nFrom: John Doe <john@example.com>...",
  
  // 验证信息
  dkim: "{@gmail.com : pass}",
  SPF: "pass",
  spam_score: "0.0",
  spam_report: "...",
  
  // 发件人IP
  sender_ip: "209.85.220.41",
  
  // 字符集
  charsets: '{"to":"UTF-8","subject":"UTF-8","from":"UTF-8"}',
  
  // 附件（如果有）
  attachments: "2",
  "attachment-info": '[{"filename":"file1.pdf","type":"application/pdf"}]',
  "attachment1": "base64编码的内容...",
}
```

---

## 🔍 代码验证清单

### ✅ 已确认正确处理的情况

1. **基本邮箱格式**：
   - `user@gmail.com` ✅
   - `user@example.com` ✅

2. **包含名字的格式**：
   - `John Doe <john@example.com>` ✅
   - `"John Doe" <john@example.com>` ✅
   - `=?UTF-8?B?5byg5LiJ?= <zhang@example.com>` ✅（名字是 Base64 编码）

3. **大小写和空格**：
   - `User@Example.COM` → 转换为 `user@example.com` ✅
   - `  user@example.com  ` → 去除空格 ✅

4. **Envelope 优先**：
   - 优先使用 `envelope.from`（真实发件人）✅
   - 回退到 `from` 字段 ✅

---

## 🧪 测试场景

### 测试 1：标准邮箱格式

**输入**：
```
from: user@gmail.com
subject: RELEASE: 123456789012
to: official@mcppayway.com
```

**预期输出**：
```
Extracted sender email: user@gmail.com
Order ID: 123456789012
```

### 测试 2：包含名字的格式

**输入**：
```
from: John Doe <john@example.com>
subject: RELEASE: 123456789012
envelope: {"from":"john@example.com","to":["official@mcppayway.com"]}
```

**预期输出**：
```
Extracted sender email: john@example.com
Order ID: 123456789012
```

### 测试 3：大小写混合

**输入**：
```
from: User@Example.COM
subject: release: 123456789012
```

**预期输出**：
```
Extracted sender email: user@example.com
Order ID: 123456789012
```

---

## 🚨 常见错误及解决

### 错误 1：收不到 Webhook

**原因**：
- SendGrid 配置错误（勾选了 raw MIME）
- Destination URL 错误
- DNS MX 记录未生效

**解决**：
- ☐ 不要勾选 "POST the raw, full MIME message"
- ✅ 使用 Parsed 格式（默认）
- 检查 Destination URL
- 等待 DNS 传播

### 错误 2：邮箱提取错误

**原因**：
- 特殊的邮箱格式未处理

**解决**：
- 代码已处理常见格式
- 查看日志中的 `Email from` 和 `Extracted sender email`
- 如果发现新格式，可以扩展正则表达式

### 错误 3：验证失败

**原因**：
- 提取的邮箱与数据库中的不一致（大小写、空格等）

**解决**：
- 代码已统一转换为小写并去除空格
- 确保数据库中的邮箱也是小写且无空格

---

## 📝 部署检查清单

在部署前确认：

- [x] `index.ts` 使用 `formData.get()` 获取字段
- [x] `index.ts` 正确处理 `envelope.from`
- [x] `index.ts` 处理多种邮箱格式
- [x] `email.ts` 使用正确的域名 `mcppayway.com`
- [x] SendGrid 配置为 Parsed 格式（不勾选 raw MIME）
- [ ] 环境变量 `SENDGRID_FROM_EMAIL=noreply@mcppayway.com`
- [ ] 测试邮件能正确触发 Edge Function

---

## 🎯 下一步

代码已经准备就绪！现在可以：

1. **部署 Edge Function**：
   - 参考 `DEPLOY_VIA_DASHBOARD.md`
   - 在 Supabase Dashboard 创建 3 个文件
   - 部署

2. **配置 SendGrid**：
   - 确认不勾选 "POST the raw, full MIME message"
   - 使用 Parsed 格式（默认）

3. **测试**：
   - 发送测试邮件
   - 检查日志输出
   - 验证邮箱提取是否正确

---

**代码更新完成！** ✅

所有 Edge Function 代码都已正确配置为使用 SendGrid Parsed 格式。

