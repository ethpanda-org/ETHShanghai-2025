# 🎊 Oracle Service 最终配置

## ✅ 完整数据源（6个）

| 数据源 | 权重 | API | 需要 API Key | 状态 |
|--------|------|-----|-------------|------|
| **Gitcoin Passport** | 35% | Gitcoin API | 可选 | ✅ 正常 |
| **ENS** | 20% | 主网 RPC | 否 | ✅ 正常 |
| **Farcaster** | 15% | Neynar API | 是 | ✅ 正常 |
| **On-Chain Activity** | 10% | RPC + Alchemy | 可选 | ✅ 正常 |
| **POAP** | 10% | GitPOAP Public API | **否** | ✅ 正常 |
| **Nouns DAO** | 10% | Alchemy NFT API | 使用 Alchemy | ✅ 正常 |
| **总计** | **100%** | | | ✅ |

## 🎨 数据源详情

### 1. Gitcoin Passport (35%)

**作用**: 人类验证，最重要的信用指标

**评分逻辑**:
```
基础分：200（有效 Passport）
分数加成：Passport 分数 × 8（最高 800）
总分：最高 1000
```

**API**: Gitcoin Scorer API
- 可选 API Key（无 Key 时返回 0）

### 2. ENS (20%)

**作用**: Web3 身份标识

**评分逻辑**:
```
基础分：500（拥有 ENS）
主域名：+200
到期时间：最高 +200
总分：最高 1000
```

**API**: 主网 RPC
- 无需 API Key

### 3. Farcaster (15%)

**作用**: 社交活跃度

**评分逻辑**:
```
基础分：300（有 Profile）
关注者：log10(n+1) × 150（最高 300）
Cast 数：n × 2（最高 250）
关注数：log10(n+1) × 50（最高 150）
总分：最高 1000
```

**API**: Neynar API
- 需要 API Key

### 4. On-Chain Activity (10%)

**作用**: 链上交易历史

**评分逻辑**:
```
账户年龄：days × 0.5（最高 400）
交易数量：log10(n+1) × 100（最高 300）
合约部署：n × 100（最高 200）
独特交互：log10(n+1) × 50（最高 100）
总分：最高 1000
```

**API**: RPC + Alchemy
- Alchemy API Key 可选

### 5. POAP (10%) ✨ NEW

**作用**: 事件参与和社区贡献

**评分逻辑**:
```
基础分：200（拥有 POAP）
总数：n × 10（最高 300）
独特事件：n × 15（最高 300）
历史悠久：days × 0.3（最高 150）
近期活跃：n × 20（最高 150）
总分：最高 1000
```

**API**: GitPOAP Public API
- **完全免费，无需 API Key** ✨
- 端点：`https://public-api.gitpoap.io/v1/address/:address/gitpoaps`

### 6. Nouns DAO (10%) ✨ NEW

**作用**: 高价值 NFT 持有

**评分逻辑**:
```
基础分：400（持有 Nouns NFT）
NFT 数量：n × 150（最高 300）
参与度：基于数量（最高 300）
总分：最高 1000
```

**API**: Alchemy NFT API
- 使用已有的 Alchemy API Key
- 合约：`0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03`

## 📊 评分示例

### 测试地址：0x2536c09E5F5691498805884fa37811Be3b2BDdb4

```json
{
  "totalScore": 241,
  "breakdown": {
    "gitcoin": 0,      // 无 Gitcoin Passport
    "ens": 500,        // 有 ENS 域名
    "farcaster": 0,    // 无 Farcaster
    "onChain": 565,    // 链上活跃
    "poap": 0,         // 无 GitPOAP
    "nounsDAO": 850    // 持有 1 个 Nouns NFT ✨
  },
  "interpretation": "Fair - Emerging Web3 user"
}
```

**分数计算**:
```
总分 = 241
= 0×35% + 500×20% + 0×15% + 565×10% + 0×10% + 850×10%
= 0 + 100 + 0 + 56.5 + 0 + 85
= 241.5 ≈ 241 ✅
```

## 🔧 配置

### 环境变量 (.env)

```bash
# RPC URLs
RPC_URL=http://localhost:8545
MAINNET_RPC_URL=https://eth.llamarpc.com

# API Keys (可选)
GITCOIN_API_KEY=your_gitcoin_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
NEYNAR_API_KEY=your_neynar_api_key

# Score Weights (总计必须 = 100)
WEIGHT_GITCOIN=35
WEIGHT_ENS=20
WEIGHT_FARCASTER=15
WEIGHT_ONCHAIN=10
WEIGHT_POAP=10
WEIGHT_NOUNS_DAO=10
```

### 必需的 API Keys

| API Key | 必需 | 用途 |
|---------|------|------|
| `NEYNAR_API_KEY` | ✅ 是 | Farcaster 数据 |
| `GITCOIN_API_KEY` | ⚠️ 可选 | Gitcoin Passport（无则返回 0） |
| `ALCHEMY_API_KEY` | ⚠️ 可选 | On-Chain + Nouns DAO（无则功能受限） |

## 🚀 启动服务

### 测试模式（跳过链上验证）

```bash
TEST_MODE=true npm run dev
```

### 生产模式

```bash
npm run dev
```

## 📝 API 端点

### 计算分数（不更新链上）

```bash
GET /score/:address

# 示例
curl http://localhost:3001/score/0x2536c09E5F5691498805884fa37811Be3b2BDdb4 | jq
```

### 检查 Web3 存在

```bash
GET /presence/:address

# 示例
curl http://localhost:3001/presence/vitalik.eth | jq
```

### 健康检查

```bash
GET /health

# 示例
curl http://localhost:3001/health | jq
```

## 🎯 评级标准

| 分数范围 | 评级 | 说明 |
|---------|------|------|
| 800-1000 | Excellent | 顶级 Web3 建设者 |
| 600-799 | Very Good | 成熟的 Web3 存在 |
| 400-599 | Good | 活跃的 Web3 参与者 |
| 200-399 | Fair | 新兴 Web3 用户 |
| 0-199 | Low | Web3 新手或活动有限 |

## ✅ 优势

### 1. 无需额外成本

- ✅ GitPOAP Public API 完全免费
- ✅ Nouns DAO 使用已有 Alchemy Key
- ✅ ENS 使用公共 RPC

### 2. 快速可靠

- ✅ 所有 API 都经过测试
- ✅ 并行查询，速度快
- ✅ 错误处理完善

### 3. 全面覆盖

- ✅ 人类验证（Gitcoin）
- ✅ 身份标识（ENS）
- ✅ 社交活跃（Farcaster）
- ✅ 链上历史（On-Chain）
- ✅ 事件参与（POAP）
- ✅ NFT 持有（Nouns DAO）

### 4. 易于维护

- ✅ 清晰的代码结构
- ✅ 完善的文档
- ✅ 灵活的权重配置

## ⚠️ 注意事项

### 响应时间

某些地址可能需要较长时间：
- vitalik.eth 等知名地址：10-20 秒
- 普通地址：2-5 秒

**原因**：
- 大量链上交易需要查询
- 多个 API 并行调用
- 某些 API 响应较慢

**优化建议**：
- 使用缓存（未实现）
- 增加超时时间
- 异步处理

### API 限制

- Neynar API：有速率限制
- Alchemy API：免费层有限制
- GitPOAP API：公共 API，可能有限制

## 📚 相关文档

- `NOUNS_WITH_ALCHEMY.md` - Nouns DAO 实现说明
- `SIMPLIFIED_DATA_SOURCES.md` - 简化版配置
- `NEW_DATA_SOURCES.md` - 新数据源说明
- `ADD_API_KEYS.md` - API Key 配置指南

## 🎊 总结

你的 Oracle Service 现在拥有：

- ✅ **6 个完整数据源**
- ✅ **100% 权重分配**
- ✅ **无需额外 API Key**（GitPOAP 免费）
- ✅ **所有功能正常工作**
- ✅ **编译成功，测试通过**

这是一个完整、可靠、易于维护的 Web3 信用评分系统！🚀
