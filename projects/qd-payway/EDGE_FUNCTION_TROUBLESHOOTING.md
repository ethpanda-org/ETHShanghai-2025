# Edge Function 故障排查指南

## 🔍 你遇到的问题

### 问题 1: 真实邮件触发时出现 401 错误
- 日志中完全没有输出
- Invocations 显示 401 Unauthorized

### 问题 2: curl 测试提示 "Body can not be decoded as form data"
- 可以看到日志
- 但是 formData 解析失败

---

## 🛠️ 解决方案

### 解决方案 1: 修复 401 错误（Supabase Function 认证问题）

Supabase Edge Functions 默认需要认证。SendGrid Webhook 无法提供 Supabase 的认证令牌，所以会被拦截。

#### 方法 A: 在 Supabase Dashboard 设置 Function 为公开访问（推荐）

1. 进入 Supabase Dashboard
2. 选择你的项目
3. 进入 **Edge Functions**
4. 点击 `process-release-email` 函数
5. 查找 **Settings** 或 **Configuration** 标签
6. 找到 **Verify JWT** 或 **Authentication** 设置
7. **关闭** JWT 验证（设置为公开访问）

**注意**：这会让函数公开可访问，但我们在代码中有邮箱验证和订单验证，所以是安全的。

#### 方法 B: 通过代码绕过认证检查

如果 Dashboard 没有设置选项，我们可以在代码中跳过 Supabase 的 JWT 验证。

**修改**：在创建 Supabase 客户端时，使用匿名访问模式（我们已经在用 service role key，应该没问题）。

---

### 解决方案 2: 修复 curl 测试的 form data 错误

#### 问题原因

你的 curl 命令可能使用了错误的 Content-Type 或格式。

#### 正确的 curl 测试命令

```bash
# 测试 1: 使用 -d 参数（自动设置 Content-Type: application/x-www-form-urlencoded）
curl -X POST https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email \
  -d "from=user@example.com" \
  -d "subject=RELEASE: 123456789012" \
  -d "to=official@mcppayway.com"

# 测试 2: 明确指定 Content-Type
curl -X POST https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "from=user@example.com&subject=RELEASE: 123456789012&to=official@mcppayway.com"

# 测试 3: 使用 multipart/form-data（模拟 SendGrid）
curl -X POST https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email \
  -F "from=user@example.com" \
  -F "subject=RELEASE: 123456789012" \
  -F "to=official@mcppayway.com"
```

#### ❌ 错误的 curl 命令（会导致解析失败）

```bash
# 错误 1: 使用 JSON 格式（Edge Function 期望 form data）
curl -X POST https://xxx.supabase.co/functions/v1/process-release-email \
  -H "Content-Type: application/json" \
  -d '{"from":"user@example.com","subject":"RELEASE: 123456789012"}'

# 错误 2: 没有 Content-Type，且数据格式不对
curl -X POST https://xxx.supabase.co/functions/v1/process-release-email \
  --data-raw "some text data"
```

---

## 🧪 完整测试步骤

### 步骤 1: 更新代码

我已经更新了 `index.ts`，添加了：
- ✅ 更详细的日志输出（请求方法、headers）
- ✅ formData 解析的错误处理
- ✅ 缺失字段的检查
- ✅ 显示所有 formData keys（便于调试）

**请重新部署 Edge Function**。

---

### 步骤 2: 测试 Function 是否可访问

```bash
# 测试 1: 检查 Function 是否存在（OPTIONS 请求）
curl -X OPTIONS https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email

# 预期结果: 200 OK

# 测试 2: 发送简单的 POST 请求
curl -X POST https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email \
  -d "from=test@example.com" \
  -d "subject=RELEASE: 123456789012" \
  -v

# 预期结果: 
# - 如果是 401: 需要设置为公开访问
# - 如果是 400 with "Contract not found": 说明解析成功，但订单不存在（这是正常的）
# - 如果是 200: 完美！
```

---

### 步骤 3: 检查日志

在 Supabase Dashboard:
1. 进入 **Edge Functions** > `process-release-email`
2. 点击 **Logs** 标签
3. 发送测试请求
4. 查看日志输出

**预期日志输出**：
```
=== Processing release email request ===
Request method: POST
Request headers: { ... }
Email from: test@example.com
Email to: official@mcppayway.com
Subject: RELEASE: 123456789012
Extracted sender email: test@example.com
Order ID: 123456789012
Contract not found: {...}
```

---

### 步骤 4: 使用真实订单测试

```bash
# 使用数据库中实际存在的订单号
curl -X POST https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email \
  -F "from=your-verified-email@gmail.com" \
  -F "subject=RELEASE: 你的真实订单号" \
  -F "to=official@mcppayway.com"
```

---

## 🔍 诊断检查清单

### 检查 1: Function URL 是否正确

```bash
https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email
                                                              ^^^^^^^^^^^^^^^^^^^^
                                                              函数名称必须完全一致
```

### 检查 2: Function 是否部署成功

在 Supabase Dashboard:
- Edge Functions 列表中能看到 `process-release-email`
- 状态显示为 **Deployed** 或 **Active**
- 最后部署时间是最近的

### 检查 3: 环境变量是否配置

在 Supabase Dashboard > Project Settings > Edge Functions > Secrets:
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `ETH_RPC_URL`
- `ESCROW_CONTRACT_ADDRESS`
- `PLATFORM_WALLET_PRIVATE_KEY`

### 检查 4: SendGrid 配置

在 SendGrid Dashboard > Settings > Inbound Parse:
- Subdomain: `official`
- Domain: `mcppayway.com`
- Destination URL: 你的 Edge Function URL
- ☐ 不要勾选 "POST the raw, full MIME message"

### 检查 5: DNS MX 记录

```bash
# 检查 MX 记录是否生效
dig MX official.mcppayway.com

# 或使用在线工具
# https://mxtoolbox.com/SuperTool.aspx?action=mx%3aofficial.mcppayway.com
```

---

## 🚨 常见错误及解决

### 错误 1: 401 Unauthorized

**原因**: Supabase Function 需要认证，SendGrid 无法提供。

**解决**: 
1. 在 Dashboard 设置 Function 为公开访问
2. 或检查代码中是否正确使用了 service role key

### 错误 2: Body can not be decoded as form data

**原因**: 请求的 Content-Type 不对，或者数据格式不是 form data。

**解决**: 
- 使用 `-d` 参数（自动设置 application/x-www-form-urlencoded）
- 或使用 `-F` 参数（设置 multipart/form-data）
- 不要使用 `-H "Content-Type: application/json"`

### 错误 3: Missing required fields

**原因**: formData 中缺少 `from` 或 `subject` 字段。

**解决**: 
- 检查 curl 命令是否正确传递参数
- 查看日志中的 "All form data keys" 输出
- 确认 SendGrid 配置正确

### 错误 4: Contract not found

**原因**: 数据库中不存在该订单。

**解决**: 
- 使用真实存在的订单号测试
- 检查订单号格式是否正确（纯数字）

### 错误 5: Email verification failed

**原因**: 发件人邮箱与合约预留邮箱不一致。

**解决**: 
- 检查日志中的 `Extracted sender email` 和合约中的 `verification_email`
- 确保完全一致（包括大小写）
- 从预留的邮箱发送测试邮件

---

## 📊 SendGrid Webhook 验证

### 如何确认 SendGrid 是否成功调用了你的 Function？

#### 方法 1: 查看 SendGrid Activity Feed

1. 登录 SendGrid Dashboard
2. 进入 **Activity**
3. 查找你发送的测试邮件
4. 检查是否有 "Inbound Parse" 相关的事件

#### 方法 2: 查看 Supabase Function Invocations

1. Supabase Dashboard > Edge Functions > `process-release-email`
2. 查看 **Invocations** 标签
3. 每次 SendGrid 调用都会显示一条记录
4. 点击查看详细信息（状态码、错误信息等）

#### 方法 3: 临时 Webhook 测试工具

如果你不确定 SendGrid 发送的数据格式，可以使用：

```bash
# 使用 webhook.site 获取一个临时 URL
# 1. 访问 https://webhook.site/
# 2. 复制你的 unique URL
# 3. 在 SendGrid Inbound Parse 中临时使用这个 URL
# 4. 发送测试邮件
# 5. 在 webhook.site 查看 SendGrid 发送的完整数据
```

---

## 🎯 下一步行动

### 立即执行：

1. **重新部署 Edge Function**
   - 使用更新后的 `index.ts` 代码
   - 包含更详细的日志和错误处理

2. **设置 Function 为公开访问**
   - 在 Supabase Dashboard 中关闭 JWT 验证
   - 或确认 Function 不需要 Authorization header

3. **使用正确的 curl 命令测试**
   ```bash
   curl -X POST https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email \
     -F "from=test@example.com" \
     -F "subject=RELEASE: 123456789012" \
     -F "to=official@mcppayway.com"
   ```

4. **查看日志确认**
   - Dashboard > Edge Functions > Logs
   - 应该能看到详细的请求信息

5. **测试真实邮件**
   - 从 Gmail 发送邮件到 `official@mcppayway.com`
   - 主题: `RELEASE: [真实订单号]`
   - 发件人必须是合约中预留的邮箱

---

## 📞 如果还是不行

请提供以下信息：

1. **curl 测试的完整输出**（使用 `-v` 参数）
2. **Supabase Function Logs 的截图或文本**
3. **Invocations 中的错误详情**
4. **SendGrid Activity Feed 的状态**

我会根据这些信息进一步诊断问题。

---

**更新代码后，立即重新部署并测试！** 🚀

