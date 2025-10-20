# DynamicSBTAgent 集成指南

> 本文档提供 DynamicSBTAgent 与 CrediNetSBT 的完整集成说明

---

## 🎯 快速开始

### 1. 编译合约

```bash
cd credinet-contract
npm install
npx hardhat compile
```

### 2. 运行测试

```bash
# 运行所有测试
npx hardhat test

# 只运行集成测试
npx hardhat test test/DynamicSBTAgent.integration.test.js
```

### 3. 部署到测试网

```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env 填入私钥和RPC URL

# 部署到 Sepolia
npx hardhat run scripts/deploy-with-agent.js --network sepolia

# 或部署可升级版本
npx hardhat run scripts/deploy-upgradeable-with-agent.js --network sepolia
```

---

## 📋 部署后配置

### 1. 保存合约地址

部署脚本会输出以下地址，请保存：

```
DynamicSBTAgent: 0x...
CrediNetSBT: 0x...
```

### 2. 配置前端

更新 `src/contracts/addresses.ts`:

```typescript
export const SEPOLIA_ADDRESSES: ContractAddresses = {
  // ...
  SBTRegistry: '0x...',        // CrediNetSBT地址
  DynamicSBTAgent: '0x...',    // DynamicSBTAgent地址
}
```

### 3. 配置Agent服务

更新 `agent-service/.env`:

```bash
DYNAMIC_AGENT_ADDRESS=0x...
SBT_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...  # Oracle角色的私钥
```

---

## 🔧 合约使用

### Owner操作

```solidity
// 1. 设置DynamicAgent地址（只需一次）
await sbt.setDynamicAgent(agentAddress);

// 2. 授予SBT合约UPDATER_ROLE
const UPDATER_ROLE = await agent.UPDATER_ROLE();
await agent.grantRole(UPDATER_ROLE, sbtAddress);

// 3. 授予Oracle角色（用于链下Agent服务）
const ORACLE_ROLE = await agent.ORACLE_ROLE();
await agent.grantRole(ORACLE_ROLE, oracleAddress);
```

### 用户操作

```solidity
// 铸造SBT（会自动注册到Agent并初始化默认评分）
await sbt.mintBadge(userAddress, badgeType, "");

// 查询tokenURI（返回动态生成的Base64 JSON）
string memory uri = await sbt.tokenURI(tokenId);
```

### Oracle操作

```solidity
// 单个用户评分更新
await agent.updateCreditScore(
  userAddress,
  800,  // keystone
  850,  // ability
  700,  // wealth
  900,  // health
  750   // behavior
);

// 批量更新（更省Gas）
await agent.batchUpdateCreditScores(
  [addr1, addr2],  // users
  [800, 700],      // keystones
  [850, 750],      // abilities
  [700, 800],      // wealths
  [900, 850],      // healths
  [750, 700]       // behaviors
);
```

---

## 💻 前端使用

### 1. 铸造SBT

```tsx
import { useSBTMint } from '@/hooks/useSBTMint'
import { SBTMintAnimation } from '@/components/animations/SBTMintAnimation'

function MintPage() {
  const { 
    mintSBT, 
    showAnimation, 
    mintedSBTData,
    isMinting 
  } = useSBTMint()
  
  const handleMint = async () => {
    // badgeType=1, tokenURI=''（使用动态元数据）
    await mintSBT(1, '')
  }
  
  return (
    <>
      <button 
        onClick={handleMint}
        disabled={isMinting}
      >
        {isMinting ? '铸造中...' : '铸造 SBT'}
      </button>
      
      {/* 铸造动画会在交易确认后自动显示 */}
      <SBTMintAnimation
        isVisible={showAnimation}
        sbtData={mintedSBTData}
      />
    </>
  )
}
```

### 2. 显示动态SBT

```tsx
import { SBTDynamicDisplay } from '@/components/sbt/SBTDynamicDisplay'
import { useDynamicSBT } from '@/hooks/useDynamicSBT'

function ProfilePage() {
  const { creditInfo, showUpgradeAnimation } = useDynamicSBT()
  
  return (
    <>
      {/* 自动监听评分更新并刷新显示 */}
      <SBTDynamicDisplay />
      
      {/* 稀有度升级时会自动显示升级动画 */}
    </>
  )
}
```

### 3. 手动监听事件

```tsx
import { useContractEvent } from 'wagmi'
import { DynamicSBTAgentABI } from '@/contracts/abis'

useContractEvent({
  address: DYNAMIC_AGENT_ADDRESS,
  abi: DynamicSBTAgentABI,
  eventName: 'ScoreUpdated',
  listener(logs) {
    const { user, totalScore } = logs[0].args
    console.log(`用户 ${user} 的评分更新为 ${totalScore}`)
    // 刷新UI...
  }
})
```

---

## 🤖 Agent服务实现

### 基础结构

```javascript
// agent-service/src/scheduler.js
import { DynamicAgentContract } from './contracts/dynamicAgent.js'
import { collectAllScores } from './collectors/index.js'

class CreditScoreScheduler {
  async updateUser(userAddress) {
    // 1. 采集五维数据
    const scores = await collectAllScores(userAddress)
    
    // 2. 更新到合约
    const agent = DynamicAgentContract.getInstance()
    const tx = await agent.updateCreditScore(
      userAddress,
      scores.keystone,
      scores.ability,
      scores.wealth,
      scores.health,
      scores.behavior
    )
    
    await tx.wait()
    console.log(`✅ 用户 ${userAddress} 评分已更新`)
  }
  
  async updateAllUsers() {
    const users = await getAllSBTHolders()
    for (const user of users) {
      await this.updateUser(user)
    }
  }
}

// 每小时运行一次
setInterval(() => {
  scheduler.updateAllUsers()
}, 3600000)
```

### 数据采集示例

```javascript
// collectors/keystoneCollector.js
export async function collectKeystoneScore(userAddress) {
  let score = 500 // 基础分
  
  // 检查ENS
  const ensName = await provider.lookupAddress(userAddress)
  if (ensName) score += 100
  
  // 检查账户年龄
  const txCount = await provider.getTransactionCount(userAddress)
  if (txCount > 1000) score += 150
  else if (txCount > 100) score += 100
  else if (txCount > 10) score += 50
  
  return Math.min(score, 1000)
}
```

---

## 📊 数据流程图

```
用户铸造SBT
    ↓
CrediNetSBT.mintBadge()
    ↓
自动调用 DynamicSBTAgent.registerSBT()
    ↓
初始化默认评分（500, 500, 500, 500, 500）
    ↓
前端监听 BadgeMinted 事件
    ↓
触发铸造动画
    ↓
定时任务（Agent服务）
    ↓
采集链上数据 → 计算五维评分
    ↓
调用 agent.updateCreditScore()
    ↓
触发 ScoreUpdated 事件
    ↓
前端监听事件 → 刷新UI
    ↓
用户看到动态更新的SBT
```

---

## 🧪 测试验证

### 1. 合约测试

```bash
npx hardhat test test/DynamicSBTAgent.integration.test.js
```

测试内容：
- ✅ 铸造时自动注册
- ✅ 动态元数据生成
- ✅ 评分更新
- ✅ 稀有度变化
- ✅ 事件触发
- ✅ 批量更新
- ✅ 权限控制

### 2. 前端测试

```bash
# 开发环境
npm run dev

# 访问测试页面
http://localhost:5173/mint-sbt
http://localhost:5173/profile
```

验证要点：
- ✅ 铸造动画在交易确认后触发
- ✅ 显示正确的tokenId
- ✅ 五维评分显示正常
- ✅ 稀有度颜色正确
- ✅ 雷达图正常渲染

---

## 🚨 常见问题

### Q1: 铸造后tokenURI返回空？

**A**: 检查是否设置了DynamicAgent地址：
```solidity
await sbt.setDynamicAgent(agentAddress)
```

### Q2: 评分更新不生效？

**A**: 检查Oracle角色权限：
```solidity
const ORACLE_ROLE = await agent.ORACLE_ROLE()
const hasRole = await agent.hasRole(ORACLE_ROLE, oracleAddress)
console.log('Has Oracle Role:', hasRole)
```

### Q3: 前端读取不到数据？

**A**: 检查合约地址配置：
```typescript
// src/contracts/addresses.ts
console.log(getContractAddresses(chainId))
```

### Q4: 动画不触发？

**A**: 检查事件监听和交易状态：
```typescript
const { isSuccess, receipt } = useWaitForTransactionReceipt({ hash })
console.log('Transaction success:', isSuccess)
console.log('Receipt:', receipt)
```

---

## 📚 相关链接

- [Hardhat文档](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [wagmi文档](https://wagmi.sh/)
- [viem文档](https://viem.sh/)

---

## 🎉 总结

集成完成后，您将拥有：

✅ **完全自动化的SBT系统**
- 铸造时自动注册
- 自动初始化评分
- 自动生成动态元数据

✅ **实时的前端反馈**
- 铸造动画
- 评分更新提示
- 稀有度升级动画

✅ **可扩展的Agent服务**
- 定时更新
- 数据采集
- 批量处理

---
