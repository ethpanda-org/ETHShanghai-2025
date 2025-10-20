# 📋 CrediNet 部署清单

> 确保部署前所有配置都已完成

---

## ✅ 部署前检查清单

### 1. 环境配置

- [ ] `.env` 文件已创建
- [ ] `VITE_WALLETCONNECT_PROJECT_ID` 已配置
- [ ] 其他环境变量已根据需要配置

### 2. 合约地址配置

- [ ] 已从合约团队获取部署的合约地址
- [ ] `src/contracts/addresses.ts` 中的 Sepolia 地址已更新
  - [ ] SBTRegistry (CrediNetSBT)
  - [ ] DynamicSBTAgent
  - [ ] CRNToken（如有）
  - [ ] CrediNetCore（如有）
  - [ ] DataMarketplace（如有）

### 3. 合约 ABI

- [ ] DynamicSBTAgent ABI 已提取
- [ ] CrediNetSBT ABI 已提取
- [ ] 所有 ABI 文件在 `src/contracts/abis/` 目录

### 4. 功能测试

- [ ] 钱包连接正常
- [ ] 合约读取功能正常
- [ ] 合约写入功能正常
- [ ] SBT 铸造动画正常
- [ ] 动态 SBT 更新正常
- [ ] 稀有度升级动画正常

---

## 🚀 部署步骤

### 方法 1: Vercel 部署（推荐）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署
vercel

# 4. 配置环境变量
# 在 Vercel Dashboard 中添加：
# VITE_WALLETCONNECT_PROJECT_ID=你的PROJECT_ID

# 5. 重新部署
vercel --prod
```

### 方法 2: Netlify 部署

```bash
# 1. 构建项目
npm run build

# 2. 安装 Netlify CLI
npm i -g netlify-cli

# 3. 登录 Netlify
netlify login

# 4. 部署
netlify deploy --prod --dir=dist

# 5. 配置环境变量
# 在 Netlify Dashboard 中添加
```

### 方法 3: 自托管

```bash
# 1. 构建
npm run build

# 2. 测试构建产物
npm run preview

# 3. 部署 dist/ 目录到服务器
# 使用 nginx/apache 等 Web 服务器
```

---

## 🔍 部署后验证

### 基础功能

- [ ] 网站可访问
- [ ] 所有页面路由正常
- [ ] 静态资源加载正常
- [ ] 响应式布局正常

### Web3 功能

- [ ] 钱包连接按钮显示
- [ ] 可以连接 MetaMask
- [ ] 网络切换正常
- [ ] 合约地址正确显示

### 核心功能

- [ ] Dashboard 数据显示正常
- [ ] 铸造 SBT 功能正常
- [ ] SBT 动画触发正常
- [ ] 动态更新监听正常

---

## 🛠️ 常见部署问题

### 问题 1: 环境变量不生效

**解决方案**:
```bash
# 确保环境变量以 VITE_ 开头
VITE_WALLETCONNECT_PROJECT_ID=...

# 重新构建
npm run build
```

### 问题 2: 路由 404 错误

**解决方案**:
```bash
# Vercel: vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}

# Netlify: _redirects
/*  /index.html  200
```

### 问题 3: 合约调用失败

**解决方案**:
```typescript
// 检查合约地址配置
console.log(getContractAddresses(chainId))

// 检查网络是否正确
console.log('Current chainId:', chainId)
```

---

## 📊 性能优化

### 构建优化

```bash
# 分析打包体积
npm run build -- --mode analyze

# 启用代码分割（已默认配置）
# 使用动态 import()

# 压缩图片资源
# 使用 WebP 格式
```

### 运行时优化

- [ ] 启用 React Query 缓存
- [ ] 合约调用使用防抖
- [ ] 图片懒加载
- [ ] 路由懒加载

---

## 🔒 安全检查

- [ ] 私钥不在代码中
- [ ] API 密钥使用环境变量
- [ ] CORS 配置正确
- [ ] 合约地址验证
- [ ] 输入数据校验

---

## 📈 监控配置

### 错误监控（可选）

```bash
# 集成 Sentry
npm install @sentry/react @sentry/vite-plugin
```

### 分析工具（可选）

```bash
# Google Analytics
# 添加到 index.html
```

---

## 🎯 部署后任务

### 立即执行

1. [ ] 测试所有核心功能
2. [ ] 检查控制台错误
3. [ ] 验证钱包连接
4. [ ] 测试合约交互

### 1天内

1. [ ] 监控错误日志
2. [ ] 收集用户反馈
3. [ ] 性能优化
4. [ ] 修复已知问题

### 1周内

1. [ ] 完善文档
2. [ ] 添加测试用例
3. [ ] 优化用户体验
4. [ ] 准备下个版本

---

## 📝 回滚计划

如果部署出现问题：

```bash
# Vercel 回滚到上一个版本
vercel rollback

# Netlify 回滚
# 在 Dashboard 中选择之前的部署

# 自托管
# 恢复之前的 dist/ 目录备份
```

---

## 🎉 部署完成

部署成功后：

1. ✅ 通知团队成员
2. ✅ 更新文档链接
3. ✅ 分享演示地址
4. ✅ 收集反馈意见

---

**部署地址**: `https://your-domain.vercel.app`
