# AI Soccer On Crypto - Frontend Implementation Guide

## 📁 文件结构

```
frontend/
├── app/
│   ├── components/
│   │   ├── header/                 # 已存在
│   │   ├── AgentCard.js           # Agent卡片组件
│   │   ├── MatchCard.js           # 比赛卡片组件
│   │   ├── TokenLaunchCard.js     # Token发行卡片
│   │   ├── StatsOverview.js       # 统计概览组件
│   │   ├── MatchInvitationCard.js # 比赛邀约卡片
│   │   └── FeedbackCard.js        # 反馈卡片
│   ├── hooks/
│   │   ├── useContracts.js        # ✅ 已创建 - 合约交互hooks
│   │   └── useAgentData.js        # Agent数据聚合hook
│   ├── utils/
│   │   ├── format.js              # 格式化工具函数
│   │   ├── constants.js           # 常量定义
│   │   └── helpers.js             # 辅助函数
│   ├── agent/
│   │   └── [id]/
│   │       └── page.js            # Agent详情页
│   ├── mint/
│   │   └── [agentId]/
│   │       └── page.js            # Mint页面
│   ├── profile/
│   │   └── page.js                # 我的页面
│   ├── match/
│   │   └── [id]/
│   │       └── page.js            # 比赛详情页
│   ├── contracts/                 # 已存在 - ABI文件
│   ├── page.js                    # 首页
│   └── layout.js                  # 已存在
```

## 🔧 核心功能实现

### 1. 工具函数 (utils/)

#### format.js - 格式化函数
```javascript
// 格式化地址显示
export const formatAddress = (address) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 格式化时间
export const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN')
}

// 格式化Token数量
export const formatTokenAmount = (amount, decimals = 18) => {
  if (!amount) return '0'
  const value = BigInt(amount) / BigInt(10 ** decimals)
  return value.toLocaleString()
}

// 格式化ETH
export const formatEther = (wei) => {
  if (!wei) return '0'
  return (Number(wei) / 1e18).toFixed(4)
}

// 计算倒计时
export const getCountdown = (endTime) => {
  const now = Math.floor(Date.now() / 1000)
  const remaining = Number(endTime) - now
  
  if (remaining <= 0) return '已结束'
  
  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

// 计算mint进度
export const calculateMintProgress = (totalMinted, targetAmount) => {
  if (!totalMinted || !targetAmount) return 0
  return Math.min((Number(totalMinted) / Number(targetAmount)) * 100, 100)
}
```

#### constants.js - 常量定义
```javascript
export const MATCH_STATES = {
  0: '等待响应',
  1: '已接受',
  2: '进行中',
  3: '已完成',
  4: '已拒绝',
  5: '已取消',
  6: '失败'
}

export const MATCH_RESULT = {
  0: '输',
  1: '平',
  2: '赢'
}

export const MINT_CONSTANTS = {
  TOKENS_PER_BATCH: 1000,
  PRICE_PER_BATCH: '0.001', // ETH
  MIN_BATCHES: 1,
  MAX_BATCHES: 100,
  MINT_DURATION: 3 * 24 * 60 * 60, // 3 days in seconds
  TARGET_SUPPLY: '50000000' // 50M tokens
}

export const ETHERSCAN_BASE_URL = 'https://sepolia.etherscan.io'
export const UNISWAP_BASE_URL = 'https://app.uniswap.org'
```

### 2. 组件实现

#### components/AgentCard.js
```javascript
import { Box, Flex, Text, Badge, Button, Image, Link } from '@chakra-ui/react'
import { formatAddress } from '../utils/format'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'

export default function AgentCard({ agent }) {
  const { agentId, teamName, owner, stats, tokenLaunch } = agent
  
  return (
    <Box 
      borderWidth="1px" 
      borderRadius="lg" 
      p={4} 
      _hover={{ shadow: 'lg' }}
      transition="all 0.3s"
    >
      <Flex justify="space-between" align="start" mb={2}>
        <Text fontSize="xl" fontWeight="bold">{teamName}</Text>
        {tokenLaunch?.isCompleted && (
          <Badge colorScheme="green">已发行</Badge>
        )}
        {tokenLaunch && !tokenLaunch.isCompleted && !tokenLaunch.isFailed && (
          <Badge colorScheme="blue">Minting</Badge>
        )}
      </Flex>

      <Text fontSize="sm" color="gray.600" mb={2}>
        Owner: {formatAddress(owner)}
      </Text>

      {stats && (
        <Flex gap={4} mb={3}>
          <Text fontSize="sm">积分: {Number(stats.totalSelfScore)}</Text>
          <Text fontSize="sm" color="green.500">胜: {Number(stats.wins)}</Text>
          <Text fontSize="sm" color="gray.500">平: {Number(stats.draws)}</Text>
          <Text fontSize="sm" color="red.500">负: {Number(stats.losses)}</Text>
        </Flex>
      )}

      {tokenLaunch?.tokenAddress && (
        <Flex gap={2} mb={3} align="center">
          <Text fontSize="xs">Token:</Text>
          <Link 
            href={`https://sepolia.etherscan.io/token/${tokenLaunch.tokenAddress}`}
            isExternal
            fontSize="xs"
          >
            {formatAddress(tokenLaunch.tokenAddress)} <ExternalLinkIcon mx="2px" />
          </Link>
        </Flex>
      )}

      <Flex gap={2}>
        <Button 
          as={NextLink} 
          href={`/agent/${agentId}`}
          size="sm" 
          colorScheme="blue"
          flex={1}
        >
          详情
        </Button>
        
        {tokenLaunch && !tokenLaunch.isCompleted && !tokenLaunch.isFailed && (
          <Button 
            as={NextLink}
            href={`/mint/${agentId}`}
            size="sm"
            colorScheme="purple"
            flex={1}
          >
            Mint
          </Button>
        )}
        
        {tokenLaunch?.isCompleted && tokenLaunch?.uniswapPool && (
          <Button
            as={Link}
            href={`https://app.uniswap.org/#/swap?chain=sepolia&outputCurrency=${tokenLaunch.tokenAddress}`}
            isExternal
            size="sm"
            colorScheme="pink"
            flex={1}
          >
            交易
          </Button>
        )}
      </Flex>
    </Box>
  )
}
```

#### components/MatchCard.js
```javascript
import { Box, Flex, Text, Image, Progress } from '@chakra-ui/react'
import { formatTime } from '../utils/format'

export default function MatchCard({ match, leftAgent, rightAgent }) {
  return (
    <Box 
      borderWidth="1px" 
      borderRadius="lg" 
      p={6}
      _hover={{ shadow: 'xl' }}
      cursor="pointer"
    >
      <Flex justify="space-between" align="center" mb={4}>
        {/* 左边队伍 */}
        <Flex direction="column" align="center" flex={1}>
          <Image 
            src="/images/agent-icon.png" 
            alt={leftAgent.teamName}
            boxSize="60px"
            mb={2}
          />
          <Text fontWeight="bold">{leftAgent.teamName}</Text>
          <Text fontSize="2xl" color="blue.500">
            {leftAgent.score || 0}
          </Text>
        </Flex>

        {/* VS */}
        <Flex direction="column" align="center" px={4}>
          <Text fontSize="3xl" fontWeight="bold" color="gray.400">
            VS
          </Text>
          <Text fontSize="xs" color="gray.500" mt={2}>
            进行中
          </Text>
        </Flex>

        {/* 右边队伍 */}
        <Flex direction="column" align="center" flex={1}>
          <Image 
            src="/images/agent-icon.png" 
            alt={rightAgent.teamName}
            boxSize="60px"
            mb={2}
          />
          <Text fontWeight="bold">{rightAgent.teamName}</Text>
          <Text fontSize="2xl" color="red.500">
            {rightAgent.score || 0}
          </Text>
        </Flex>
      </Flex>

      <Progress value={50} size="sm" colorScheme="green" mb={2} />
      <Text fontSize="xs" color="gray.600" textAlign="center">
        开始时间: {formatTime(match.startedAt)}
      </Text>
    </Box>
  )
}
```

#### components/StatsOverview.js
```javascript
import { SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Box } from '@chakra-ui/react'

export default function StatsOverview({ stats }) {
  const { totalAgents, totalMatches, ongoingMatches, totalTokens } = stats
  
  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6} mb={8}>
      <Stat>
        <Box 
          p={6} 
          borderWidth="1px" 
          borderRadius="lg"
          bg="blue.50"
        >
          <StatLabel>注册Agent</StatLabel>
          <StatNumber>{totalAgents}</StatNumber>
          <StatHelpText>总数量</StatHelpText>
        </Box>
      </Stat>

      <Stat>
        <Box 
          p={6} 
          borderWidth="1px" 
          borderRadius="lg"
          bg="green.50"
        >
          <StatLabel>比赛数量</StatLabel>
          <StatNumber>{totalMatches}</StatNumber>
          <StatHelpText>已发起</StatHelpText>
        </Box>
      </Stat>

      <Stat>
        <Box 
          p={6} 
          borderWidth="1px" 
          borderRadius="lg"
          bg="purple.50"
        >
          <StatLabel>进行中</StatLabel>
          <StatNumber>{ongoingMatches}</StatNumber>
          <StatHelpText>比赛</StatHelpText>
        </Box>
      </Stat>

      <Stat>
        <Box 
          p={6} 
          borderWidth="1px" 
          borderRadius="lg"
          bg="pink.50"
        >
          <StatLabel>发行Token</StatLabel>
          <StatNumber>{totalTokens}</StatNumber>
          <StatHelpText>已发行</StatHelpText>
        </Box>
      </Stat>
    </SimpleGrid>
  )
}
```

### 3. 页面实现

#### app/page.js - 首页
```javascript
'use client'
import { Box, Container, Heading, SimpleGrid, VStack, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useMatchQueue, useTotalMatches } from './hooks/useContracts'
import StatsOverview from './components/StatsOverview'
import AgentCard from './components/AgentCard'
import MatchCard from './components/MatchCard'
import TokenLaunchCard from './components/TokenLaunchCard'

export default function Home() {
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalMatches: 0,
    ongoingMatches: 0,
    totalTokens: 0
  })

  const { queue: matchQueue } = useMatchQueue()
  const { total: totalMatches } = useTotalMatches()

  useEffect(() => {
    // 更新统计数据
    setStats(prev => ({
      ...prev,
      totalMatches: Number(totalMatches || 0),
      ongoingMatches: matchQueue?.length || 0
    }))
  }, [totalMatches, matchQueue])

  return (
    <Container maxW="container.xl" py={8}>
      {/* 统计概览 */}
      <StatsOverview stats={stats} />

      {/* 内容区域 */}
      <Tabs variant="soft-rounded" colorScheme="blue">
        <TabList mb={4}>
          <Tab>进行中的比赛</Tab>
          <Tab>所有Agent</Tab>
          <Tab>正在Mint</Tab>
        </TabList>

        <TabPanels>
          {/* 进行中的比赛 */}
          <TabPanel>
            <Heading size="md" mb={4}>进行中的比赛</Heading>
            {matchQueue && matchQueue.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {matchQueue.map((matchId) => (
                  <MatchCardWrapper key={matchId} matchId={matchId} />
                ))}
              </SimpleGrid>
            ) : (
              <Box textAlign="center" py={10} color="gray.500">
                暂无进行中的比赛
              </Box>
            )}
          </TabPanel>

          {/* 所有Agent */}
          <TabPanel>
            <Heading size="md" mb={4}>所有Agent</Heading>
            <AgentListContainer />
          </TabPanel>

          {/* 正在Mint */}
          <TabPanel>
            <Heading size="md" mb={4}>正在发行Token</Heading>
            <TokenLaunchListContainer />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}

// Helper components would be defined here or in separate files
```

#### app/agent/[id]/page.js - Agent详情页
```javascript
'use client'
import { useParams } from 'next/navigation'
import { 
  Box, Container, Heading, Text, Flex, Button, 
  Tabs, TabList, TabPanels, Tab, TabPanel,
  SimpleGrid, Badge, VStack, Divider
} from '@chakra-ui/react'
import { 
  useAgentInfo, 
  useAgentMatchStats, 
  useAgentMatches,
  useTokenLaunch,
  usePendingInvitations
} from '../../hooks/useContracts'
import { formatAddress, formatTime } from '../../utils/format'

export default function AgentDetailPage() {
  const params = useParams()
  const agentId = params.id

  const { agentInfo, owner, tokenUri, isLoading: infoLoading } = useAgentInfo(agentId)
  const { stats, isLoading: statsLoading } = useAgentMatchStats(agentId)
  const { matches, isLoading: matchesLoading } = useAgentMatches(agentId)
  const { tokenLaunch, isLoading: tokenLoading } = useTokenLaunch(agentId)
  const { invitations } = usePendingInvitations(agentId)

  if (infoLoading) return <Container>加载中...</Container>

  return (
    <Container maxW="container.xl" py={8}>
      {/* Agent基本信息 */}
      <Box borderWidth="1px" borderRadius="lg" p={6} mb={6}>
        <Flex justify="space-between" align="start">
          <VStack align="start" spacing={2}>
            <Heading size="xl">{agentInfo?.teamName}</Heading>
            <Text color="gray.600">Agent ID: #{agentId}</Text>
            <Text>Owner: {formatAddress(owner)}</Text>
            <Text>版本: {agentInfo?.modelVersion}</Text>
            <Text>注册时间: {formatTime(agentInfo?.registeredAt)}</Text>
          </VStack>

          <VStack>
            {agentInfo?.isActive && (
              <Badge colorScheme="green" fontSize="md">Active</Badge>
            )}
          </VStack>
        </Flex>

        <Divider my={4} />

        {/* 统计数据 */}
        {stats && (
          <SimpleGrid columns={4} spacing={4}>
            <Box textAlign="center">
              <Text fontSize="2xl" fontWeight="bold">{Number(stats.totalMatches)}</Text>
              <Text color="gray.600">总场次</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                {Number(stats.wins)}
              </Text>
              <Text color="gray.600">胜</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="gray.500">
                {Number(stats.draws)}
              </Text>
              <Text color="gray.600">平</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="red.500">
                {Number(stats.losses)}
              </Text>
              <Text color="gray.600">负</Text>
            </Box>
          </SimpleGrid>
        )}
      </Box>

      {/* 详情标签页 */}
      <Tabs>
        <TabList>
          <Tab>历史比赛</Tab>
          <Tab>Token信息</Tab>
          <Tab>待处理邀约 ({invitations?.length || 0})</Tab>
          <Tab>反馈评论</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {/* 历史比赛列表 */}
            <MatchHistoryList matches={matches} />
          </TabPanel>

          <TabPanel>
            {/* Token信息 */}
            <TokenInfoPanel tokenLaunch={tokenLaunch} agentId={agentId} />
          </TabPanel>

          <TabPanel>
            {/* 待处理邀约 */}
            <InvitationsList invitations={invitations} agentId={agentId} />
          </TabPanel>

          <TabPanel>
            {/* 反馈评论 */}
            <FeedbackList agentId={agentId} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}
```

## 🚀 快速开始

### 1. 安装依赖
```bash
cd frontend
npm install
```

### 2. 运行开发服务器
```bash
npm run dev
```

### 3. 访问应用
打开浏览器访问 http://localhost:3000

## 📝 开发注意事项

1. **合约地址**: 确保 `app/contracts/*.json` 文件中的地址正确
2. **网络配置**: 在 `wagmiConfig.js` 中配置正确的网络
3. **实时数据**: 使用 `refetch` 和 `useEffect` 定时刷新数据
4. **错误处理**: 添加适当的错误提示和加载状态
5. **响应式设计**: 使用 Chakra UI 的响应式属性

## 🔄 下一步

1. 实现所有组件的完整功能
2. 添加图表和数据可视化（使用 recharts 或 chart.js）
3. 实现比赛重播功能
4. 添加通知和实时更新
5. 优化性能和用户体验
6. 添加单元测试

## 📚 技术栈

- **Framework**: Next.js 13
- **UI Library**: Chakra UI
- **Web3**: wagmi + viem
- **Wallet**: RainbowKit
- **State**: React Query (内置在 wagmi)

---

**需要帮助?** 查看文档或提交 Issue

