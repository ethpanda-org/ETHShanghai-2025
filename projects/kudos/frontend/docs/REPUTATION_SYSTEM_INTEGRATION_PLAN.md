# 链上声誉系统集成计划

## 概述

本文档提供将完整的链上声誉系统集成到超次平台的详细计划。该系统基于 EIP-4973（账户绑定 NFT）和 EIP-5114（灵魂绑定代币）标准，提供透明、不可篡改的创作者声誉机制。

## 当前状态分析

### 已实现功能
- ✅ 基础钱包连接（Wagmi + RainbowKit）
- ✅ 简单的 SBT 合约接口（`lib/contracts/abis.ts`）
- ✅ USDT 代币支付功能
- ✅ 基础的产品购买流程
- ✅ 交易记录存储（localStorage）

### 待集成功能
- ❌ IdentityToken（身份 NFT）系统
- ❌ ReputationBadge（声誉徽章）系统
- ❌ BadgeRuleRegistry（徽章规则）管理
- ❌ Marketplace 完整功能（作品上架、签名验证）
- ❌ ReputationDataFeed（数据聚合）
- ❌ 被动徽章自动颁发
- ❌ 主动徽章批量颁发
- ❌ 徽章展示与查询

## 集成架构

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                        前端应用层                              │
├─────────────────────────────────────────────────────────────┤
│  发布页面  │  发现页面  │  个人资料  │  资产页面  │  徽章展示   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      React Hooks 层                          │
├─────────────────────────────────────────────────────────────┤
│  useIdentity  │  useBadges  │  useMarketplace  │  useRules  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      智能合约层                               │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ IdentityToken│ReputationBadge│BadgeRuleReg │  Marketplace   │
│              │              │              │ReputationDataFeed│
└──────────────┴──────────────┴──────────────┴────────────────┘
\`\`\`

## 集成阶段规划

### 第一阶段：核心合约 ABI 集成（1-2 天）

#### 1.1 更新合约 ABI 定义

**文件：** `lib/contracts/abis.ts`

**任务：**
- 导入所有 5 个合约的完整 ABI
- 定义 TypeScript 类型
- 添加合约地址配置

**输入数据：**
\`\`\`typescript
// 从提供的 JSON 文件导入
- IdentityToken.abi.json
- ReputationBadge.abi.json
- BadgeRuleRegistry.abi.json
- Marketplace.abi.json
- ReputationDataFeed.abi.json
\`\`\`

**输出：**
\`\`\`typescript
export const IDENTITY_TOKEN_ABI = [...] as const
export const REPUTATION_BADGE_ABI = [...] as const
export const BADGE_RULE_REGISTRY_ABI = [...] as const
export const MARKETPLACE_ABI = [...] as const
export const REPUTATION_DATA_FEED_ABI = [...] as const
\`\`\`

**依赖：**
- 合约已部署到测试网
- 获取所有合约地址

#### 1.2 更新合约地址配置

**文件：** `lib/contracts/addresses.ts`

**任务：**
\`\`\`typescript
export const CONTRACT_ADDRESSES = {
  IDENTITY_TOKEN: {
    [sepolia.id]: "0x...", // 待部署后填入
  },
  REPUTATION_BADGE: {
    [sepolia.id]: "0x...",
  },
  BADGE_RULE_REGISTRY: {
    [sepolia.id]: "0x...",
  },
  MARKETPLACE: {
    [sepolia.id]: "0x...",
  },
  REPUTATION_DATA_FEED: {
    [sepolia.id]: "0x...",
  },
  USDT: {
    [sepolia.id]: "0x...", // 现有
  },
}
\`\`\`

**前置条件：**
- 所有合约已部署
- 合约之间的依赖关系已正确配置
- 运营者地址已设置权限

### 第二阶段：身份系统集成（2-3 天）

#### 2.1 IdentityToken Hooks

**文件：** `lib/contracts/hooks/use-identity.ts`

**核心功能：**

1. **检查身份状态**
\`\`\`typescript
export function useHasIdentity(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.IDENTITY_TOKEN[chainId],
    abi: IDENTITY_TOKEN_ABI,
    functionName: 'hasIdentity',
    args: [address],
  })
}
\`\`\`

**输入：** 用户钱包地址
**输出：** `boolean` - 是否已铸造身份 NFT

2. **获取身份 Token ID**
\`\`\`typescript
export function useIdentityTokenId(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.IDENTITY_TOKEN[chainId],
    abi: IDENTITY_TOKEN_ABI,
    functionName: 'tokenIdOf',
    args: [address],
  })
}
\`\`\`

**输入：** 用户钱包地址
**输出：** `bigint` - Token ID

3. **铸造身份 NFT**
\`\`\`typescript
export function useMintIdentity() {
  return useWriteContract({
    address: CONTRACT_ADDRESSES.IDENTITY_TOKEN[chainId],
    abi: IDENTITY_TOKEN_ABI,
    functionName: 'mintSelf',
  })
}
\`\`\`

**输入：** `metadataURI: string` - IPFS 元数据链接
**输出：** 交易哈希，成功后返回 `tokenId`

**元数据结构：**
\`\`\`json
{
  "name": "超次用户身份",
  "description": "超次平台唯一身份凭证",
  "image": "ipfs://...",
  "attributes": [
    {
      "trait_type": "注册时间",
      "value": "2025-01-20"
    },
    {
      "trait_type": "用户名",
      "value": "username"
    }
  ]
}
\`\`\`

#### 2.2 身份绑定 UI 组件

**文件：** `components/identity/identity-binding.tsx`

**功能：**
- 检测用户是否已有身份 NFT
- 显示铸造按钮（如未铸造）
- 显示身份信息（如已铸造）
- 处理铸造交易流程

**集成位置：**
- 个人资料页面顶部
- 首次购买时的引导流程

**测试要点：**
- ✓ 未连接钱包时的提示
- ✓ 已有身份时不显示铸造按钮
- ✓ 铸造交易成功后更新 UI
- ✓ 交易失败时的错误处理

### 第三阶段：徽章系统集成（3-4 天）

#### 3.1 ReputationBadge Hooks

**文件：** `lib/contracts/hooks/use-badges.ts`

**核心功能：**

1. **查询用户徽章**
\`\`\`typescript
export function useUserBadges(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.REPUTATION_BADGE[chainId],
    abi: REPUTATION_BADGE_ABI,
    functionName: 'badgesOf',
    args: [address],
  })
}
\`\`\`

**输入：** 用户地址
**输出：** 
\`\`\`typescript
{
  ruleIds: bigint[]    // [1n, 3n, 5n]
  badgeIds: bigint[]   // [101n, 203n, 305n]
}
\`\`\`

2. **检查特定徽章**
\`\`\`typescript
export function useHasBadge(address?: Address, ruleId?: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.REPUTATION_BADGE[chainId],
    abi: REPUTATION_BADGE_ABI,
    functionName: 'hasBadge',
    args: [address, ruleId],
  })
}
\`\`\`

**输入：** 用户地址 + 规则 ID
**输出：** `boolean`

3. **获取徽章元数据**
\`\`\`typescript
export function useBadgeURI(badgeId?: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.REPUTATION_BADGE[chainId],
    abi: REPUTATION_BADGE_ABI,
    functionName: 'badgeURI',
    args: [badgeId],
  })
}
\`\`\`

**输入：** 徽章 ID
**输出：** `string` - IPFS URI

**元数据结构：**
\`\`\`json
{
  "name": "首次购买徽章",
  "description": "完成第一次作品购买",
  "image": "ipfs://Qm.../badge-1.png",
  "attributes": [
    {
      "trait_type": "类型",
      "value": "被动徽章"
    },
    {
      "trait_type": "稀有度",
      "value": "普通"
    },
    {
      "trait_type": "获得时间",
      "value": "2025-01-20"
    }
  ]
}
\`\`\`

#### 3.2 BadgeRuleRegistry Hooks

**文件：** `lib/contracts/hooks/use-badge-rules.ts`

**核心功能：**

1. **获取规则详情**
\`\`\`typescript
export function useBadgeRule(ruleId?: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.BADGE_RULE_REGISTRY[chainId],
    abi: BADGE_RULE_REGISTRY_ABI,
    functionName: 'getRule',
    args: [ruleId],
  })
}
\`\`\`

**输入：** 规则 ID
**输出：**
\`\`\`typescript
{
  ruleId: bigint
  trigger: 0 | 1        // 0=Passive, 1=Active
  target: 0 | 1         // 0=Buyer, 1=Creator
  threshold: bigint     // 触发阈值
  metadataURI: string   // 规则描述
  enabled: boolean      // 是否启用
}
\`\`\`

2. **获取所有规则**
\`\`\`typescript
export function useAllBadgeRules() {
  const { data: count } = useReadContract({
    address: CONTRACT_ADDRESSES.BADGE_RULE_REGISTRY[chainId],
    abi: BADGE_RULE_REGISTRY_ABI,
    functionName: 'ruleCount',
  })
  
  // 批量查询所有规则
  // 实现分页逻辑
}
\`\`\`

**输出：** 规则数组

#### 3.3 徽章展示组件

**文件：** `components/badges/badge-display.tsx`

**功能：**
- 网格展示用户所有徽章
- 徽章卡片（图片、名称、描述）
- 未获得徽章显示为灰色/锁定状态
- 点击查看详情（获得时间、条件等）

**集成位置：**
- 个人资料页面新增"徽章"Tab
- 用户悬停头像时显示徽章预览

**文件：** `components/badges/badge-progress.tsx`

**功能：**
- 显示距离下一个徽章的进度
- 例如："再购买 2 次即可获得'三次购买'徽章"
- 进度条可视化

**测试要点：**
- ✓ 正确显示已获得徽章
- ✓ 未获得徽章显示锁定状态
- ✓ 徽章元数据正确加载（IPFS）
- ✓ 进度计算准确

### 第四阶段：市场合约集成（4-5 天）

#### 4.1 作品上架功能

**文件：** `lib/contracts/hooks/use-marketplace.ts`

**核心功能：**

1. **EIP-712 签名生成**
\`\`\`typescript
export function useListWorkSignature() {
  const { signTypedDataAsync } = useSignTypedData()
  
  return async (workData: {
    workId: string
    price: bigint
    nonce: bigint
    metadataURI: string
  }) => {
    const domain = {
      name: 'Chaoci Marketplace',
      version: '1',
      chainId: sepolia.id,
      verifyingContract: CONTRACT_ADDRESSES.MARKETPLACE[sepolia.id],
    }
    
    const types = {
      Listing: [
        { name: 'creator', type: 'address' },
        { name: 'price', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'metadataURI', type: 'string' },
      ],
    }
    
    const signature = await signTypedDataAsync({
      domain,
      types,
      primaryType: 'Listing',
      message: workData,
    })
    
    return signature
  }
}
\`\`\`

**输入：**
\`\`\`typescript
{
  workId: bytes32      // keccak256(creator + timestamp + nonce)
  creator: address     // 创作者地址
  price: bigint        // USDT 价格（wei）
  nonce: bigint        // 防重放
  metadataURI: string  // 作品元数据
}
\`\`\`

**输出：** `bytes` - EIP-712 签名

2. **上架作品**
\`\`\`typescript
export function useListWork() {
  return useWriteContract({
    address: CONTRACT_ADDRESSES.MARKETPLACE[chainId],
    abi: MARKETPLACE_ABI,
    functionName: 'listWork',
  })
}
\`\`\`

**输入：**
- `workId: bytes32`
- `listing: Listing` 结构体
- `signature: bytes`

**输出：** 交易哈希

**事件监听：**
\`\`\`typescript
export function useWorkListedEvent() {
  return useWatchContractEvent({
    address: CONTRACT_ADDRESSES.MARKETPLACE[chainId],
    abi: MARKETPLACE_ABI,
    eventName: 'WorkListed',
    onLogs(logs) {
      // 处理上架成功事件
      logs.forEach(log => {
        const { workId, creator, price, metadataURI } = log.args
        // 更新本地状态
      })
    },
  })
}
\`\`\`

3. **下架作品**
\`\`\`typescript
export function useDeactivateWork() {
  return useWriteContract({
    address: CONTRACT_ADDRESSES.MARKETPLACE[chainId],
    abi: MARKETPLACE_ABI,
    functionName: 'deactivateWork',
  })
}
\`\`\`

**输入：** `workId: bytes32`
**输出：** 交易哈希

#### 4.2 购买流程更新

**当前流程：**
1. 用户点击购买
2. 授权 USDT
3. 调用简单的 `purchase` 函数

**新流程：**
1. 检查用户是否有身份 NFT → 没有则自动铸造
2. 授权 USDT 给 Marketplace 合约
3. 调用 `Marketplace.purchase(workId)`
4. 合约内部：
   - 验证作品状态
   - 转账 USDT
   - 更新买家/创作者统计
   - 同步 ReputationDataFeed
   - 调用 `_handlePurchase` 检查被动徽章
   - 自动颁发符合条件的徽章
5. 监听 `PurchaseCompleted` 和 `BadgeIssued` 事件
6. 更新 UI 显示新徽章

**文件更新：** `components/product/product-card-in-post.tsx`

**新增逻辑：**
\`\`\`typescript
// 监听徽章颁发事件
useWatchContractEvent({
  address: CONTRACT_ADDRESSES.MARKETPLACE[chainId],
  abi: MARKETPLACE_ABI,
  eventName: 'BadgeIssued',
  onLogs(logs) {
    logs.forEach(log => {
      const { account, ruleId, badgeId } = log.args
      if (account === userAddress) {
        // 显示徽章获得通知
        toast.success(`🎉 恭喜获得新徽章！`)
      }
    })
  },
})
\`\`\`

#### 4.3 统计数据查询

**文件：** `lib/contracts/hooks/use-marketplace-stats.ts`

1. **买家统计**
\`\`\`typescript
export function useBuyerStats(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.MARKETPLACE[chainId],
    abi: MARKETPLACE_ABI,
    functionName: 'getBuyerStat',
    args: [address],
  })
}
\`\`\`

**输出：**
\`\`\`typescript
{
  totalPurchases: bigint   // 总购买次数
  totalSpend: bigint       // 总消费金额（USDT wei）
  lastPurchaseAt: bigint   // 最后购买时间戳
}
\`\`\`

2. **创作者统计**
\`\`\`typescript
export function useCreatorStats(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.MARKETPLACE[chainId],
    abi: MARKETPLACE_ABI,
    functionName: 'getCreatorStat',
    args: [address],
  })
}
\`\`\`

**输出：**
\`\`\`typescript
{
  totalSales: bigint       // 总销售次数
  totalVolume: bigint      // 总成交额（USDT wei）
  lastSaleAt: bigint       // 最后成交时间
}
\`\`\`

3. **作品信息**
\`\`\`typescript
export function useWorkInfo(workId?: `0x${string}`) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.MARKETPLACE[chainId],
    abi: MARKETPLACE_ABI,
    functionName: 'getWork',
    args: [workId],
  })
}
\`\`\`

**输出：**
\`\`\`typescript
{
  creator: Address
  price: bigint
  active: boolean
  totalSold: bigint
  metadataURI: string
}
\`\`\`

#### 4.4 发布页面集成

**文件：** `components/publish/publish-editor.tsx`

**更新内容：**

1. 生成 `workId`：
\`\`\`typescript
const workId = keccak256(
  encodePacked(
    ['address', 'uint256', 'uint256'],
    [creatorAddress, BigInt(Date.now()), nonce]
  )
)
\`\`\`

2. 创建签名：
\`\`\`typescript
const signature = await signListingData({
  workId,
  creator: creatorAddress,
  price: parseUnits(price, 6), // USDT 6 decimals
  nonce,
  metadataURI: ipfsURI,
})
\`\`\`

3. 调用 `listWork`：
\`\`\`typescript
await listWork({
  args: [
    workId,
    {
      creator: creatorAddress,
      price: parseUnits(price, 6),
      nonce,
      metadataURI: ipfsURI,
    },
    signature,
  ],
})
\`\`\`

**测试要点：**
- ✓ 签名生成正确
- ✓ workId 唯一性
- ✓ 上架交易成功
- ✓ 事件正确触发
- ✓ 元数据正确存储

### 第五阶段：数据聚合集成（2-3 天）

#### 5.1 ReputationDataFeed Hooks

**文件：** `lib/contracts/hooks/use-reputation-data.ts`

**核心功能：**

1. **查询聚合数据**
\`\`\`typescript
export function useAggregatedBuyerStats(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.REPUTATION_DATA_FEED[chainId],
    abi: REPUTATION_DATA_FEED_ABI,
    functionName: 'getBuyerStat',
    args: [address],
  })
}

export function useAggregatedCreatorStats(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.REPUTATION_DATA_FEED[chainId],
    abi: REPUTATION_DATA_FEED_ABI,
    functionName: 'getCreatorStat',
    args: [address],
  })
}
\`\`\`

**说明：**
- 这些数据由 Marketplace 合约自动同步
- 前端只需读取，无需写入
- 可用于展示用户成就、排行榜等

#### 5.2 个人资料页面集成

**文件：** `app/profile/[username]/page.tsx`

**新增统计卡片：**

\`\`\`typescript
<div className="grid grid-cols-2 gap-4">
  <StatCard
    title="购买次数"
    value={buyerStats?.totalPurchases}
    icon={<ShoppingBag />}
  />
  <StatCard
    title="总消费"
    value={formatUnits(buyerStats?.totalSpend || 0n, 6)}
    unit="USDT"
    icon={<DollarSign />}
  />
  <StatCard
    title="销售次数"
    value={creatorStats?.totalSales}
    icon={<TrendingUp />}
  />
  <StatCard
    title="总收入"
    value={formatUnits(creatorStats?.totalVolume || 0n, 6)}
    unit="USDT"
    icon={<Wallet />}
  />
</div>
\`\`\`

### 第六阶段：主动徽章系统（3-4 天）

#### 6.1 运营脚本开发

**文件：** `scripts/issue-monthly-badges.ts`

**功能：**
- 每月定时执行
- 读取链上创作者列表
- 分页调用 `issueMonthlyBadges`
- 记录颁发结果

**实现：**

\`\`\`typescript
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY!
const RPC_URL = process.env.RPC_URL!

async function issueMonthlyBadges(ruleId: bigint) {
  const account = privateKeyToAccount(OPERATOR_PRIVATE_KEY as `0x${string}`)
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  })
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  })
  
  // 1. 获取创作者总数
  const totalCreators = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.MARKETPLACE[sepolia.id],
    abi: MARKETPLACE_ABI,
    functionName: 'creatorRegistryLength',
  })
  
  console.log(`Total creators: ${totalCreators}`)
  
  // 2. 分批处理
  const BATCH_SIZE = 50n
  let startIndex = 0n
  
  while (startIndex < totalCreators) {
    console.log(`Processing batch: ${startIndex} - ${startIndex + BATCH_SIZE}`)
    
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.MARKETPLACE[sepolia.id],
      abi: MARKETPLACE_ABI,
      functionName: 'issueMonthlyBadges',
      args: [ruleId, startIndex, BATCH_SIZE],
    })
    
    console.log(`Transaction hash: ${hash}`)
    
    // 等待确认
    await publicClient.waitForTransactionReceipt({ hash })
    
    startIndex += BATCH_SIZE
  }
  
  console.log('Monthly badge issuance completed!')
}

// 执行
const RULE_ID = 6n // 月度最佳创作者
issueMonthlyBadges(RULE_ID)
\`\`\`

**部署：**
- 使用 GitHub Actions 或 Vercel Cron Jobs
- 每月 1 号自动执行
- 发送通知给获奖创作者

#### 6.2 Merkle 证明升级（可选，第二阶段）

**优势：**
- 减少链上遍历成本
- 提高去信任化程度
- 用户自助领取徽章

**实现步骤：**

1. **生成 Merkle Tree**
\`\`\`typescript
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'

// 获奖名单
const winners = [
  ['0x1234...', 6n], // [address, ruleId]
  ['0x5678...', 6n],
]

const tree = StandardMerkleTree.of(winners, ['address', 'uint256'])
const root = tree.root

console.log('Merkle Root:', root)

// 为每个获奖者生成证明
for (const [i, v] of tree.entries()) {
  const proof = tree.getProof(i)
  console.log('Address:', v[0])
  console.log('Proof:', proof)
}
\`\`\`

2. **更新合约根值**
\`\`\`typescript
await walletClient.writeContract({
  address: CONTRACT_ADDRESSES.MARKETPLACE[sepolia.id],
  abi: MARKETPLACE_ABI,
  functionName: 'setMerkleRoot',
  args: [ruleId, period, root],
})
\`\`\`

3. **用户领取徽章**
\`\`\`typescript
export function useClaimBadge() {
  return useWriteContract({
    address: CONTRACT_ADDRESSES.MARKETPLACE[chainId],
    abi: MARKETPLACE_ABI,
    functionName: 'claimBadgeWithProof',
  })
}

// 使用
await claimBadge({
  args: [ruleId, period, userAddress, proof],
})
\`\`\`

### 第七阶段：UI/UX 完善（2-3 天）

#### 7.1 徽章通知系统

**文件：** `components/notifications/badge-notification.tsx`

**功能：**
- 实时监听 `BadgeIssued` 事件
- 显示动画通知
- 播放音效（可选）
- 引导用户查看新徽章

**实现：**
\`\`\`typescript
export function BadgeNotificationListener() {
  const { address } = useAccount()
  
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.MARKETPLACE[chainId],
    abi: MARKETPLACE_ABI,
    eventName: 'BadgeIssued',
    onLogs(logs) {
      logs.forEach(async (log) => {
        const { account, ruleId, badgeId } = log.args
        
        if (account === address) {
          // 获取徽章信息
          const rule = await getBadgeRule(ruleId)
          
          // 显示通知
          toast.custom((t) => (
            <BadgeEarnedToast
              badge={rule}
              onView={() => {
                router.push('/profile?tab=badges')
                toast.dismiss(t.id)
              }}
            />
          ), {
            duration: 5000,
          })
        }
      })
    },
  })
  
  return null
}
\`\`\`

#### 7.2 徽章展示页面

**文件：** `app/profile/[username]/page.tsx` - 新增 Badges Tab

**布局：**
\`\`\`
┌─────────────────────────────────────────┐
│          徽章墙 (Badge Wall)              │
├─────────────────────────────────────────┤
│  [已获得徽章]                              │
│  ┌───┐ ┌───┐ ┌───┐                      │
│  │ 🏆│ │ 🎖️│ │ ⭐│                      │
│  └───┘ └───┘ └───┘                      │
│                                          │
│  [未获得徽章]                              │
│  ┌───┐ ┌───┐ ┌───┐                      │
│  │ 🔒│ │ 🔒│ │ 🔒│                      │
│  └───┘ └───┘ └───┘                      │
│                                          │
│  [进度追踪]                                │
│  距离下一个徽章：                           │
│  ████████░░ 80% (再购买 1 次)            │
└─────────────────────────────────────────┘
\`\`\`

**组件：**
- `<BadgeGrid />` - 徽章网格
- `<BadgeCard />` - 单个徽章卡片
- `<BadgeProgress />` - 进度条
- `<BadgeDetail />` - 徽章详情弹窗

#### 7.3 排行榜页面

**文件：** `app/leaderboard/page.tsx`

**功能：**
- 创作者销量排行
- 买家消费排行
- 徽章收集排行
- 月度最佳创作者

**数据来源：**
- 链上 `ReputationDataFeed` 数据
- 链下索引（The Graph 子图）

## 测试策略

### 单元测试

**文件：** `__tests__/contracts/`

1. **Hooks 测试**
\`\`\`typescript
// use-identity.test.ts
describe('useHasIdentity', () => {
  it('should return false for address without identity', async () => {
    const { result } = renderHook(() => useHasIdentity('0x...'))
    await waitFor(() => expect(result.current.data).toBe(false))
  })
  
  it('should return true for address with identity', async () => {
    // Mock contract response
    const { result } = renderHook(() => useHasIdentity('0x...'))
    await waitFor(() => expect(result.current.data).toBe(true))
  })
})
\`\`\`

2. **签名测试**
\`\`\`typescript
// eip712-signature.test.ts
describe('EIP-712 Listing Signature', () => {
  it('should generate valid signature', async () => {
    const signature = await signListingData({...})
    expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/)
  })
  
  it('should verify signature on-chain', async () => {
    // Call contract to verify
  })
})
\`\`\`

### 集成测试

**文件：** `__tests__/integration/`

1. **完整购买流程**
\`\`\`typescript
describe('Purchase Flow with Badge Issuance', () => {
  it('should mint identity, purchase work, and issue badge', async () => {
    // 1. Connect wallet
    // 2. Mint identity NFT
    // 3. Approve USDT
    // 4. Purchase work
    // 5. Verify badge issued
    // 6. Check stats updated
  })
})
\`\`\`

2. **作品上架流程**
\`\`\`typescript
describe('Work Listing Flow', () => {
  it('should sign and list work on-chain', async () => {
    // 1. Generate workId
    // 2. Create EIP-712 signature
    // 3. Call listWork
    // 4. Verify WorkListed event
    // 5. Query work info
  })
})
\`\`\`

### E2E 测试

**工具：** Playwright

**场景：**

1. **新用户首次购买**
\`\`\`typescript
test('new user first purchase journey', async ({ page }) => {
  // 1. 连接钱包
  await page.click('[data-testid="connect-wallet"]')
  
  // 2. 浏览作品
  await page.goto('/post/1')
  
  // 3. 点击购买
  await page.click('[data-testid="purchase-button"]')
  
  // 4. 确认铸造身份 NFT
  await page.click('[data-testid="mint-identity"]')
  await page.waitForSelector('[data-testid="identity-minted"]')
  
  // 5. 授权 USDT
  await page.click('[data-testid="approve-usdt"]')
  await page.waitForSelector('[data-testid="usdt-approved"]')
  
  // 6. 确认购买
  await page.click('[data-testid="confirm-purchase"]')
  
  // 7. 验证徽章通知
  await page.waitForSelector('[data-testid="badge-notification"]')
  expect(await page.textContent('[data-testid="badge-name"]')).toBe('首次购买徽章')
  
  // 8. 查看个人资料
  await page.goto('/profile/me?tab=badges')
  await page.waitForSelector('[data-testid="badge-card-1"]')
})
\`\`\`

2. **创作者发布作品**
\`\`\`typescript
test('creator publishes work', async ({ page }) => {
  // 1. 进入发布页面
  await page.goto('/publish')
  
  // 2. 填写表单
  await page.fill('[data-testid="title-input"]', 'AI 提示词包')
  await page.fill('[data-testid="price-input"]', '10')
  
  // 3. 上传图片
  await page.setInputFiles('[data-testid="image-upload"]', 'test-image.jpg')
  
  // 4. 选择标签
  await page.click('[data-testid="tag-ai"]')
  
  // 5. 启用付费内容
  await page.click('[data-testid="paid-content-toggle"]')
  
  // 6. 发布
  await page.click('[data-testid="publish-button"]')
  
  // 7. 签名确认
  await page.click('[data-testid="sign-listing"]')
  
  // 8. 等待上链
  await page.waitForSelector('[data-testid="work-listed"]')
  
  // 9. 验证作品显示
  await page.goto('/')
  await page.waitForSelector(`[data-testid="post-${workId}"]`)
})
\`\`\`

### 性能测试

**指标：**
- 合约调用响应时间 < 3s
- 徽章查询响应时间 < 1s
- 页面加载时间 < 2s
- 批量颁发徽章 gas 消耗 < 5M per batch

**工具：**
- Lighthouse
- Web Vitals
- Hardhat Gas Reporter

## 依赖与前置条件

### 智能合约部署

**部署顺序：**
1. IdentityToken
2. ReputationBadge
3. BadgeRuleRegistry
4. ReputationDataFeed
5. Marketplace（需要前 4 个合约地址）

**配置步骤：**
```solidity
// 1. 部署 IdentityToken
const identityToken = await deploy('IdentityToken')

// 2. 部署 ReputationBadge
const badge = await deploy('ReputationBadge')

// 3. 部署 BadgeRuleRegistry
const registry = await deploy('BadgeRuleRegistry')

// 4. 创建初始规则
await registry.createRule({
  ruleId: 1,
  trigger: 0, // Passive
  target: 0,  // Buyer
  threshold: 1,
  metadataURI: 'ipfs://...',
  enabled: true,
})
// ... 创建规则 2-6

// 5. 部署 ReputationDataFeed
const dataFeed = await deploy('ReputationDataFeed')

// 6. 部署 Marketplace
const marketplace = await deploy('Marketplace', [
  identityToken.address,
  badge.address,
  registry.address,
  dataFeed.address,
  usdtAddress,
])

// 7. 授权
await badge.grantRole(ISSUER_ROLE, marketplace.address)
await identityToken.grantRole(ATTESTER_ROLE, marketplace.address)
await dataFeed.setMarketplace(marketplace.address)
