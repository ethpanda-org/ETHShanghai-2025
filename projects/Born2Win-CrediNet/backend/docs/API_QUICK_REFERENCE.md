# CrediNet API 快速参考卡

> 📋 前端开发者速查表 - 快速找到您需要的API

## 🚀 基础配置

```javascript
// API基础URL
const API_BASE = 'http://127.0.0.1:8080/api';

// 请求头配置
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
};
```

## 🔑 认证相关

| API | 方法 | 端点 | 说明 |
|-----|------|------|------|
| 发送验证码 | POST | `/auth/send_code` | `{contact: "email"}` |
| 登录 | POST | `/auth/login` | `{contact, code}` → 返回tokens |
| 刷新Token | POST | `/auth/refresh` | `{refresh_token}` → 新access_token |
| 登出 | POST | `/auth/logout` | `{refresh_token}` |

**返回格式**（登录）：
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user_id": "xxx",
  "expires_in": 3600
}
```

## 🆔 DID管理

| API | 方法 | 端点 | 说明 |
|-----|------|------|------|
| 创建DID | POST | `/did/create` | 自动为用户创建 |
| 获取DID | GET | `/did/:did` | 查询DID信息 |
| 获取文档 | GET | `/did/:did/document` | DID Document |
| 更新文档 | PUT | `/did/:did/document` | `{document}` |
| 链上注册 | POST | `/did/:did/register` | 区块链注册 |

## 👤 身份验证

### World ID
```javascript
POST /user/verify/worldcoin
{
  "proof": "0x...",
  "merkle_root": "0x...",
  "nullifier_hash": "0x..."
}
```

### OAuth绑定
```javascript
POST /user/bind/social
{
  "provider": "github|twitter|facebook|wechat",
  "code": "oauth_code",
  "redirect_uri": "https://..."
}
```

### 钱包连接
```javascript
POST /user/wallet/connect
{
  "address": "0x...",
  "chain_type": "ethereum|polygon|bsc|solana",
  "signature": "0x...",  // 可选
  "message": "..."       // 可选
}
```

### 设置主钱包
```javascript
PUT /user/wallet/primary
{
  "address": "0x..."
}
```

### 查询绑定
```javascript
GET /user/bindings
// 返回所有绑定的账户
```

## 🔐 用户授权

| API | 方法 | 端点 | 说明 |
|-----|------|------|------|
| 授权数据源 | POST | `/authorization/grant` | `{data_sources: [...]}` |
| 撤销授权 | POST | `/authorization/revoke` | `{data_source: "github"}` |
| 获取状态 | GET | `/authorization/status` | 所有授权状态 |
| 查看日志 | GET | `/authorization/logs` | 授权变更历史 |

**数据源类型**：`github`, `wallet`, `twitter`, `worldcoin`, `facebook`, `wechat`

## 📊 信用评分

### 核心API

| API | 方法 | 端点 | 说明 |
|-----|------|------|------|
| 计算评分 | POST | `/credit/score/calculate` | `{force_refresh: bool}` |
| 获取评分 | GET | `/credit/score` | 最新评分（缓存） |
| 评分历史 | GET | `/credit/score/history` | `?limit=10` |
| 信用画像 | GET | `/credit/profile` | 完整画像 |
| 数据源状态 | GET | `/credit/data-sources/status` | 数据抓取状态 |

### 评分结果格式
```json
{
  "total_score": 750,
  "level": "B",
  "breakdown": {
    "technical": {
      "score": 80,
      "weight": 0.3,
      "contribution": 24
    },
    "financial": { "score": 70, "weight": 0.3, "contribution": 21 },
    "social": { "score": 60, "weight": 0.2, "contribution": 12 },
    "identity": { "score": 90, "weight": 0.2, "contribution": 18 }
  },
  "labels": ["code_contributor", "active_trader", "verified_identity"],
  "version": "1.0",
  "calculated_at": "2025-10-12T10:00:00Z"
}
```

### 评分等级
- **S级**: 900-1000（卓越）
- **A级**: 800-899（优秀）
- **B级**: 700-799（良好）
- **C级**: 600-699（一般）
- **D级**: <600（较差）

## 🎁 SBT发放

### 核心API

| API | 方法 | 端点 | 说明 |
|-----|------|------|------|
| 自动发放 | POST | `/sbt/auto-issue` | 基于信用画像 |
| 手动发放 | POST | `/sbt/issue` | `{sbt_type, wallet_address?}` |
| 我的SBT | GET | `/sbt/my-sbts` | `?status=confirmed` |
| SBT详情 | GET | `/sbt/:id` | 详细信息 |
| 符合条件 | GET | `/sbt/eligible` | 可发放的SBT |
| 统计信息 | GET | `/sbt/statistics` | SBT统计 |

### SBT类型（10+种）
- `HighCreditUser` - 高信用用户（>750分）
- `TopCreditUser` - 顶级信用用户（>900分）
- `CodeContributor` - 代码贡献者（GitHub 500+ commits）
- `ActiveDeveloper` - 活跃开发者（GitHub 100+ repos）
- `DeFiExpert` - DeFi专家（100+ DeFi交易）
- `ActiveTrader` - 活跃交易者（200+ 交易）
- `WhaleUser` - 大户（资产>$50k）
- `SocialInfluencer` - 社交影响者（1000+ followers）
- `VerifiedIdentity` - 已验证身份（World ID）
- `EarlyAdopter` - 早期用户

### SBT状态
- `pending` - 待确认（交易已提交）
- `confirmed` - 已确认（上链成功）
- `failed` - 失败（交易失败）

## 📈 完整用户流程

```javascript
// Step 1: 登录
const loginData = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({contact: 'user@example.com', code: '123456'})
}).then(r => r.json());

localStorage.setItem('access_token', loginData.access_token);

// Step 2: 创建DID
await fetch(`${API_BASE}/did/create`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${loginData.access_token}`,
    'Content-Type': 'application/json'
  }
});

// Step 3: 绑定钱包
await fetch(`${API_BASE}/user/wallet/connect`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${loginData.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    address: '0x...',
    chain_type: 'ethereum'
  })
});

// Step 4: 授权数据源
await fetch(`${API_BASE}/authorization/grant`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${loginData.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data_sources: ['github', 'wallet']
  })
});

// Step 5: 计算信用评分
const scoreData = await fetch(`${API_BASE}/credit/score/calculate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${loginData.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({force_refresh: true})
}).then(r => r.json());

console.log('信用评分:', scoreData.total_score);

// Step 6: 发放SBT
const sbtData = await fetch(`${API_BASE}/sbt/auto-issue`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${loginData.access_token}`,
    'Content-Type': 'application/json'
  }
}).then(r => r.json());

console.log('已发放SBT:', sbtData.eligible_sbts.length);
```

## ❌ 错误码

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 0 | 成功 | - |
| 1001 | 未授权 | 跳转登录 |
| 1002 | 凭证无效 | 重新登录 |
| 1003 | Token过期 | 刷新Token |
| 1004 | 验证码错误 | 提示用户重新输入 |
| 2009 | 请求过多 | 显示限流提示 |
| 3001 | 数据不存在 | 提示用户 |
| 3003 | SBT发放失败 | 检查余额/重试 |

## 🔄 Token刷新机制

```javascript
// 自动刷新Token（拦截器）
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken
        });
        localStorage.setItem('access_token', data.access_token);
        // 重试原请求
        error.config.headers.Authorization = `Bearer ${data.access_token}`;
        return axios(error.config);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

## 📱 常用工具函数

```javascript
// API Client
class CrediNetAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token');
  }
  
  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
    
    const options = {
      method,
      headers,
      ...(data && {body: JSON.stringify(data)})
    };
    
    const response = await fetch(url, options);
    return response.json();
  }
  
  // 认证
  async login(contact, code) {
    const data = await this.request('POST', '/auth/login', {contact, code});
    this.token = data.access_token;
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  }
  
  // 信用评分
  async getCreditScore() {
    return this.request('GET', '/credit/score');
  }
  
  async calculateCreditScore(forceRefresh = false) {
    return this.request('POST', '/credit/score/calculate', {
      force_refresh: forceRefresh
    });
  }
  
  // SBT
  async autoIssueSBT() {
    return this.request('POST', '/sbt/auto-issue');
  }
  
  async getMySBTs(status = null) {
    const query = status ? `?status=${status}` : '';
    return this.request('GET', `/sbt/my-sbts${query}`);
  }
}

// 使用
const api = new CrediNetAPI('http://127.0.0.1:8080/api');
await api.login('user@example.com', '123456');
const score = await api.getCreditScore();
```

## 🎯 关键提示

### 安全
✅ **必须使用HTTPS**（生产环境）  
✅ **Token存储在localStorage**  
✅ **每个请求携带Authorization头**  
✅ **处理401错误自动刷新Token**

### 性能
✅ **信用评分默认缓存1小时**  
✅ **使用`force_refresh: false`节省资源**  
✅ **批量操作使用单次API调用**

### 用户体验
✅ **显示加载状态**  
✅ **友好的错误提示**  
✅ **SBT交易状态实时监控**

---

## 📚 更多资源

- 📖 [完整API文档](FRONTEND_API_GUIDE.md) - 1700+行详细文档
- 🎓 [快速开始](QUICK_START.md) - 5分钟上手
- 📊 [API索引](README.md) - 所有API导航

**最后更新**: 2025-10-12 | **版本**: v2.0

