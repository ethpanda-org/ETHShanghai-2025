# 邮件监控配置指南

## 概述

通过邮件指令触发自动放款的功能。本指南将帮助你完成所有必要的配置。

---

## 1. 环境变量配置

### 1.1 Supabase Secrets

使用 Supabase CLI 或 Dashboard 设置以下环境变量：

```bash
# SendGrid API密钥（用于发送通知邮件）
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# 发件人邮箱
SENDGRID_FROM_EMAIL=noreply@mcppayway.com

# 以太坊 RPC URL（Sepolia测试网）
ETH_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# 托管合约地址
ESCROW_CONTRACT_ADDRESS=0x...

# 平台钱包私钥（用于调用智能合约）
PLATFORM_WALLET_PRIVATE_KEY=0x...
```


## 2. SendGrid 配置

### 2.1 创建 SendGrid 账号

1. 访问 [SendGrid.com](https://sendgrid.com)
2. 注册免费账号（免费套餐支持每天 100 封邮件）
3. 完成邮箱验证

### 2.2 创建 API Key

1. 登录 SendGrid Dashboard
2. 进入 **Settings** > **API Keys**
3. 点击 **Create API Key**
4. 选择 **Full Access**
5. 复制生成的 API Key（形如 `SG.xxxxx`）
6. 保存到环境变量 `SENDGRID_API_KEY`

### 2.3 配置域名认证（Domain Authentication）⭐ 重要

1. 进入 **Settings** > **Sender Authentication**
2. 点击 **Authenticate Your Domain**（⚠️ 不是 Single Sender Verification）
3. 选择你的 DNS 服务商（如 Cloudflare、Namecheap、GoDaddy 等）
4. 输入你的域名：**`mcppayway.com`**
5. SendGrid 会生成一组 DNS 记录（SPF、DKIM）
6. 复制这些 DNS 记录到你的域名 DNS 配置中
7. 等待 DNS 传播（通常 10-60 分钟）
8. 返回 SendGrid，点击 **Verify** 按钮
9. 验证成功！

**验证成功后：**
- ✅ 可以用 `noreply@mcppayway.com` 发送邮件
- ✅ 可以用 `任何名字@mcppayway.com` 发送邮件
- ✅ 邮件不会进垃圾箱（有 SPF/DKIM 认证）
- ✅ 完全不需要邮箱服务器

---

### 2.4 配置 Inbound Parse（接收邮件）

SendGrid Inbound Parse 允许你的应用接收邮件：

#### 步骤 1: 配置子域名

1. 进入 **Settings** > **Inbound Parse**
2. 点击 **Add Host & URL**
3. 配置：
   - **Subdomain**: `official`
   - **Domain**: `mcppayway.com`
   - **Destination URL**: `https://ctbklunoxeoowqhjvdxc.supabase.co/functions/v1/process-release-email`
   
**重要配置选项**：
- ☑️ **Check incoming emails for spam** - 建议勾选，过滤垃圾邮件
- ☐ **POST the raw, full MIME message** - ❌ 不要勾选！使用默认的 Parsed 格式更简单

#### 步骤 2: 配置 DNS MX 记录

在你的域名 DNS 设置中添加 MX 记录：

```
Type: MX
Host: official
Value: mx.sendgrid.net
Priority: 10
```

**完整的放款邮箱地址**: `noreply@official.mcppayway.com`

**等待 DNS 传播（通常需要 10-60 分钟）**

#### 步骤 3: 验证配置

发送测试邮件到 `noreply@official.mcppayway.com`，检查 Supabase Edge Function 日志是否收到请求。

---

## 4. 部署 Edge Function

### 4.1 部署方式选择

#### 方式：通过 Dashboard "Via Editor"（推荐）⭐

**优点**：
- ✅ 无需安装 CLI
- ✅ 可视化界面，简单直观
- ✅ 直接在浏览器中编辑和部署

**文件结构**：
```
process-release-email/
├── index.ts           (主函数入口)
├── blockchain.ts      (区块链交互)
└── email.ts           (邮件发送)
```

**详细步骤**：参考 `SUPABASE_EDGE_FUNCTION_DEPLOY_GUIDE.md`

---

### 4.2 本地测试（可选）

如果使用 CLI 方式，可以本地测试：

```bash
cd supabase

# 启动本地 Edge Function
supabase functions serve process-release-email --env-file .env.local

# 测试
curl -X POST http://localhost:54321/functions/v1/process-release-email \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "from=user@example.com&subject=RELEASE: 123456789012"
```

---

### 4.3 检查日志

**在 Dashboard 中**（推荐）：
1. 进入 **Edge Functions**
2. 选择 `process-release-email`
3. 查看 **Logs** 标签
