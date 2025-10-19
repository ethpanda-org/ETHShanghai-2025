# Phase 3: 资金释放功能 - 配置指南

## 概述

Phase 3 实现了通过邮件指令触发自动放款的功能。本指南将帮助你完成所有必要的配置。

---

## 1. 环境变量配置

### 1.1 前端环境变量

在 `frontend/payway/.env.local` 中添加：

```bash
# 放款指令邮箱地址
NEXT_PUBLIC_RELEASE_EMAIL_ADDRESS=official@mcppayway.com
```

### 1.2 Supabase Secrets

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

**设置方法（使用 Supabase CLI）：**

```bash
cd supabase
supabase secrets set SENDGRID_API_KEY=SG.xxxxx
supabase secrets set SENDGRID_FROM_EMAIL=noreply@mcppayway.com
supabase secrets set ETH_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
supabase secrets set ESCROW_CONTRACT_ADDRESS=0x...
supabase secrets set PLATFORM_WALLET_PRIVATE_KEY=0x...
```

---

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

> **💡 提示**: API Key 只会显示一次，请妥善保存。如果丢失，需要重新创建。

### 2.3 配置域名认证（Domain Authentication）⭐ 重要

**这是推荐的方式，不需要真实邮箱！**

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
- ✅ 可以用 `noreply@mcppayway.com` 发送邮件（不需要这个邮箱真实存在）
- ✅ 可以用 `任何名字@mcppayway.com` 发送邮件
- ✅ 邮件不会进垃圾箱（有 SPF/DKIM 认证）
- ✅ 完全不需要邮箱服务器

**示例 DNS 记录（SendGrid 会提供实际值）：**

```dns
# SPF 记录
Type: TXT
Name: @ (或留空)
Value: v=spf1 include:sendgrid.net ~all

# DKIM 记录 1
Type: CNAME
Name: s1._domainkey
Value: s1.domainkey.u12345678.wl.sendgrid.net

# DKIM 记录 2
Type: CNAME
Name: s2._domainkey
Value: s2.domainkey.u12345678.wl.sendgrid.net
```

**常见 DNS 服务商配置位置：**
- **Cloudflare**: DNS > Records
- **Namecheap**: Advanced DNS
- **GoDaddy**: DNS Management
- **阿里云**: 云解析 DNS

---

**📌 SendGrid 两种验证方式对比**

| 特性 | Single Sender Verification | Domain Authentication (推荐) |
|------|---------------------------|------------------------------|
| 需要真实邮箱 | ✅ 是 | ❌ 否 |
| 验证方式 | 点击验证邮件 | DNS 记录验证 |
| 可用邮箱数量 | 1个 | 无限 |
| 邮件送达率 | 较低 | 高 |
| 适用场景 | 测试/个人 | 生产环境 |
| 是否需要邮箱服务器 | 是 | 否 |
| 推荐度 | ⚠️ 仅测试用 | ✅ 强烈推荐 |

**我们使用 Domain Authentication，因为：**
- 不需要购买邮箱服务
- 不需要配置邮箱服务器
- 只需要添加几条 DNS 记录
- 邮件不会被标记为垃圾邮件
- 可以使用任何 `@mcppayway.com` 地址

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

**为什么使用 Parsed 格式（默认）？**
- SendGrid 会自动解析邮件，提供 `from`、`subject`、`to` 等字段
- 我们只需要提取发件人和主题，不需要完整的 MIME 数据
- 代码更简洁，处理更可靠
- 减少解析复杂度和出错可能

#### 步骤 2: 配置 DNS MX 记录

在你的域名 DNS 设置中添加 MX 记录：

```
Type: MX
Host: official
Value: mx.sendgrid.net
Priority: 10
```

**完整的放款邮箱地址**: `official@mcppayway.com`

**等待 DNS 传播（通常需要 10-60 分钟）**

#### 步骤 3: 验证配置

发送测试邮件到 `official@mcppayway.com`，检查 Supabase Edge Function 日志是否收到请求。

---

## 3. 平台钱包配置

### 3.1 创建平台钱包

平台钱包用于代替用户调用智能合约的 `pay()` 函数。

**方式 1: 使用 MetaMask 创建**

1. 在 MetaMask 中创建新账户
2. 导出私钥（Settings > Security & Privacy > Show Private Key）
3. 保存私钥到环境变量

**方式 2: 使用代码生成**

```javascript
const { ethers } = require('ethers')

// 生成新钱包
const wallet = ethers.Wallet.createRandom()

console.log('Address:', wallet.address)
console.log('Private Key:', wallet.privateKey)
```

### 3.2 添加测试 ETH

平台钱包需要 ETH 支付 Gas 费用。

1. 访问 [Sepolia Faucet](https://sepoliafaucet.com/)
2. 输入平台钱包地址
3. 领取测试 ETH（至少 0.1 ETH）

### 3.3 添加钱包为合约 Admin

平台钱包需要有权限调用 `pay()` 函数。

**使用合约 Owner 账户执行：**

```javascript
const { ethers } = require('ethers')

// 合约 Owner 的钱包
const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider)

// 托管合约
const escrowContract = new ethers.Contract(
  ESCROW_CONTRACT_ADDRESS,
  ESCROW_ABI,
  ownerWallet
)

// 添加平台钱包为 admin
const tx = await escrowContract.addAdmin(PLATFORM_WALLET_ADDRESS)
await tx.wait()

console.log('Platform wallet added as admin')
```

验证权限：

```javascript
const isAdmin = await escrowContract.isAdmin(PLATFORM_WALLET_ADDRESS)
console.log('Is admin:', isAdmin) // 应该返回 true
```

---

## 4. 部署 Edge Function

### 4.1 部署方式选择

#### 方式 A：通过 Dashboard "Via Editor"（推荐）⭐

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

#### 方式 B：通过 CLI 部署

**前提条件**：
- 已安装 Supabase CLI
- 本地开发和测试

**部署步骤**：

```bash
# 登录 Supabase
supabase login

# 链接项目
supabase link --project-ref ctbklunoxeoowqhjvdxc

# 设置环境变量（Secrets）
supabase secrets set SENDGRID_API_KEY=SG.xxxxx
supabase secrets set SENDGRID_FROM_EMAIL=noreply@mcppayway.com
supabase secrets set ETH_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
supabase secrets set ESCROW_CONTRACT_ADDRESS=0x你的合约地址
supabase secrets set PLATFORM_WALLET_PRIVATE_KEY=0x你的平台钱包私钥

# 部署 Edge Function
supabase functions deploy process-release-email

# 验证部署
supabase functions list
```

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

**使用 CLI**：
```bash
supabase functions logs process-release-email --follow
```

---

## 5. 数据库检查

验证数据库表已正确创建：

```sql
-- 检查 release_requests 表
SELECT * FROM release_requests LIMIT 5;

-- 检查 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'release_requests';
```

---

## 6. 端到端测试

### 测试流程：

1. **创建托管合约**
   - 使用前端创建一笔托管合约
   - 记录订单号（如 `123456789012`）

2. **申请放款**
   - 在合约详情页点击"申请放款"
   - 查看邮件指令引导

3. **发送邮件指令**
   - 使用预留邮箱发送邮件
   - 收件人: `official@mcppayway.com`
   - 主题: `RELEASE: 123456789012`

4. **等待处理**
   - 通常 5-10 分钟内完成
   - 页面会自动更新状态
   - 查看 Supabase Edge Function 日志

5. **验证结果**
   - 合约状态更新为 "已完成"
   - 查看区块链交易
   - 收到通知邮件

### 常见问题排查：

**❓ 我没有 noreply@mcppayway.com 的邮箱怎么办？**
- ✅ 不需要！这个邮箱不需要真实存在
- SendGrid 会代表你的域名发送邮件
- 只要完成了域名认证（Domain Authentication），就可以使用任何 `@mcppayway.com` 地址
- 不需要邮箱服务器或邮箱账号

**❓ official@mcppayway.com 的邮箱在哪里创建？**
- ✅ 不需要创建！通过 MX 记录，邮件会直接路由到 SendGrid
- SendGrid 通过 Webhook 转发给你的 Edge Function
- 完全不需要真实的邮箱账号

**邮件未被接收**
- 检查 DNS MX 记录是否正确
- 确认 SendGrid Inbound Parse 配置正确
- 查看 SendGrid Dashboard 的 Activity Feed
- 等待 DNS 传播（可能需要 10-60 分钟）

**验证失败**
- 确认发件人邮箱与预留邮箱完全一致（区分大小写）
- 检查邮件主题格式（注意空格和冒号）：`RELEASE: [订单号]`
- 确认合约状态为 PENDING

**区块链交易失败**
- 确认平台钱包有足够的 ETH（至少 0.01 ETH）
- 验证平台钱包是否为合约 admin
- 检查合约状态是否为 PENDING
- 查看 Etherscan 上的交易详情

**Edge Function 错误**
- 查看 Supabase Edge Function 日志
- 确认所有环境变量已正确设置
- 检查区块链 RPC URL 是否可访问
- 验证 SendGrid API Key 是否有效

---

## 7. 监控和维护

### 7.1 平台钱包余额监控

定期检查平台钱包 ETH 余额：

```bash
# 使用 Etherscan
https://sepolia.etherscan.io/address/[PLATFORM_WALLET_ADDRESS]
```

建议设置告警：余额低于 0.05 ETH 时补充。

### 7.2 查看放款记录

```sql
-- 查看最近的放款请求
SELECT 
  order_id,
  sender_email,
  request_status,
  transaction_hash,
  created_at,
  processed_at
FROM release_requests
ORDER BY created_at DESC
LIMIT 10;

-- 统计放款成功率
SELECT 
  request_status,
  COUNT(*) as count
FROM release_requests
GROUP BY request_status;
```

### 7.3 邮件发送统计

在 SendGrid Dashboard 查看：
- **Activity Feed**: 查看所有邮件发送记录
- **Stats**: 查看发送、打开、点击率等统计

---

## 8. 安全注意事项

### ⚠️ 重要提醒：

1. **永不泄露私钥**
   - 平台钱包私钥只能存储在 Supabase Secrets
   - 不要提交到 Git 或任何公开位置

2. **限制平台钱包权限**
   - 只给予必要的 admin 权限
   - 定期审计权限使用情况

3. **监控异常活动**
   - 定期检查 release_requests 表
   - 设置告警：失败率超过阈值时通知

4. **备份和恢复**
   - 定期备份数据库
   - 记录平台钱包地址和助记词（安全存储）

5. **SendGrid API Key 保护**
   - 只使用必要权限的 API Key
   - 定期轮换 API Key

---

## 9. 完成检查清单

在将功能发布到生产环境前，确认：

**数据库配置：**
- [ ] 数据库表 `release_requests` 已创建
- [ ] 数据库 RLS 策略已配置

**SendGrid 配置：**
- [ ] SendGrid 账号已注册并验证
- [ ] SendGrid API Key 已创建并保存
- [ ] ⭐ **域名认证（Domain Authentication）已完成** - 不是 Single Sender！
- [ ] DNS SPF 记录已添加并验证通过
- [ ] DNS DKIM 记录已添加并验证通过
- [ ] Inbound Parse 已配置
- [ ] DNS MX 记录已添加并生效（`mx.sendgrid.net`）

**重要提醒：**
- ✅ 完成域名认证后，`noreply@mcppayway.com` 可以直接使用，不需要创建真实邮箱
- ✅ `official@mcppayway.com` 通过 MX 记录自动接收，不需要创建真实邮箱
- [ ] 平台钱包已创建
- [ ] 平台钱包有足够的测试 ETH
- [ ] 平台钱包已添加为合约 admin
- [ ] 所有环境变量已设置
- [ ] Edge Function 已部署
- [ ] 端到端测试通过
- [ ] 前端 UI 显示正常
- [ ] 邮件通知功能正常

---

## 10. 下一步

完成 Phase 3 后，你可以：

1. 实现 **Feature 4: 取消托管合约**
2. 添加更多验证方式（企业签名）
3. 优化用户体验（实时通知、Webhook）
4. 添加管理后台（查看所有交易）
5. 准备主网部署

---

**需要帮助？**

如果遇到问题，请查看：
- Supabase Edge Function 日志
- SendGrid Activity Feed
- 区块链浏览器交易详情

或联系技术支持团队。

