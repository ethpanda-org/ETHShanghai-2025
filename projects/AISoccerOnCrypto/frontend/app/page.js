'use client'

import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Avatar,
  Flex,
  Spinner,
  Progress,
  IconButton,
  useColorModeValue
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  useTotalMatches,
  useMatchQueue,
  useContracts
} from './hooks/useContracts'
import { useReadContract } from 'wagmi'

// 主页组件
export default function Home() {
  const [allAgents, setAllAgents] = useState([])
  const [activeTokenLaunches, setActiveTokenLaunches] = useState([])
  const [ongoingMatches, setOngoingMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const contracts = useContracts()
  const { total: totalMatches } = useTotalMatches()
  const { queue: matchQueue } = useMatchQueue()

  const bgColor = 'rgba(255, 255, 255, 0.05)'
  const borderColor = '#40444F'
  const cardHoverBg = 'rgba(255, 255, 255, 0.08)'

  // 获取总体统计数据
  const { data: totalTokenLaunches } = useReadContract({
    address: contracts.LaunchPad.address,
    abi: contracts.LaunchPad.abi,
    functionName: 'TOTAL_SUPPLY'
  })

  // 模拟获取所有Agent数据 - 实际项目中应该通过事件日志或后端API获取
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 模拟数据 - 在实际项目中，你需要通过合约事件或后端API获取
        const mockAgents = []
        for (let i = 1; i <= 10; i++) {
          mockAgents.push({
            id: i,
            teamName: `Agent Team ${i}`,
            owner: `0x${(i * 123456789).toString(16).padStart(40, '0')}`,
            wins: Math.floor(Math.random() * 10),
            losses: Math.floor(Math.random() * 5),
            points: Math.floor(Math.random() * 100),
            isActive: true,
            hasToken: Math.random() > 0.5,
            tokenAddress: Math.random() > 0.5 ? `0x${(i * 987654321).toString(16).padStart(40, '0')}` : null,
            isMinting: Math.random() > 0.7
          })
        }

        const mockTokenLaunches = []
        for (let i = 1; i <= 3; i++) {
          mockTokenLaunches.push({
            agentId: i,
            tokenAddress: `0x${(i * 987654321).toString(16).padStart(40, '0')}`,
            totalMinted: BigInt(Math.floor(Math.random() * 1000000)),
            mintEndTime: Date.now() + (i * 24 * 60 * 60 * 1000), // i days from now
            isCompleted: false,
            isFailed: false
          })
        }

        const mockOngoingMatches = []
        for (let i = 1; i <= 4; i++) {
          mockOngoingMatches.push({
            matchId: i,
            challengerAgent: mockAgents[i - 1],
            opponentAgent: mockAgents[i % mockAgents.length],
            challengerScore: Math.floor(Math.random() * 5),
            opponentScore: Math.floor(Math.random() * 5),
            state: 2 // Started
          })
        }

        setAllAgents(mockAgents)
        setActiveTokenLaunches(mockTokenLaunches)
        setOngoingMatches(mockOngoingMatches)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTimeRemaining = (endTime) => {
    const now = Date.now()
    const remaining = endTime - now
    if (remaining <= 0) return '已结束'

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

    return `${days}天${hours}小时`
  }

  if (loading) {
    return (
      <Box className="container" py={8} textAlign="center">
        <Spinner size="xl" color="#00ff9d" />
        <Text mt={4} color="white">加载中...</Text>
      </Box>
    )
  }

  return (
    <Box className="container" py={8} maxW="1200px" mx="auto" px={4}>
      {/* 总体数据统计 */}
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={6} textAlign="center" color="white">AI足球平台概览</Heading>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
            <Card bg={bgColor} borderColor={borderColor} border="1px solid" _hover={{ bg: cardHoverBg }}>
              <CardBody>
                <Stat>
                  <StatLabel color="gray.300">注册Agent总数</StatLabel>
                  <StatNumber color="white">{allAgents.length}</StatNumber>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={bgColor} borderColor={borderColor} border="1px solid" _hover={{ bg: cardHoverBg }}>
              <CardBody>
                <Stat>
                  <StatLabel color="gray.300">总比赛数量</StatLabel>
                  <StatNumber color="white">{totalMatches ? totalMatches.toString() : '0'}</StatNumber>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={bgColor} borderColor={borderColor} border="1px solid" _hover={{ bg: cardHoverBg }}>
              <CardBody>
                <Stat>
                  <StatLabel color="gray.300">进行中比赛</StatLabel>
                  <StatNumber color="white">{ongoingMatches.length}</StatNumber>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={bgColor} borderColor={borderColor} border="1px solid" _hover={{ bg: cardHoverBg }}>
              <CardBody>
                <Stat>
                  <StatLabel color="gray.300">Token合约数量</StatLabel>
                  <StatNumber color="white">{allAgents.filter(a => a.hasToken).length}</StatNumber>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* 正在进行的比赛 */}
        <Box>
          <Heading size="md" mb={4} color="white">🏆 正在进行的比赛</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {ongoingMatches.map((match) => (
              <Card key={match.matchId} bg={bgColor} borderColor={borderColor} border="1px solid" _hover={{ bg: cardHoverBg, transform: 'translateY(-2px)' }} transition="all 0.2s">
                <CardBody>
                  <VStack spacing={4}>
                    <HStack justify="space-between" w="full">
                      <VStack align="center" spacing={2}>
                        <Avatar size="md" name={match.challengerAgent.teamName} />
                        <Text fontSize="sm" fontWeight="bold" textAlign="center" color="white">
                          {match.challengerAgent.teamName}
                        </Text>
                        <Text fontSize="2xl" fontWeight="bold" color="#00ff9d">
                          {match.challengerScore}
                        </Text>
                      </VStack>

                      <VStack spacing={1}>
                        <Text fontSize="lg" fontWeight="bold" color="white">VS</Text>
                        <Badge colorScheme="green" bg="#00ff9d" color="black">进行中</Badge>
                      </VStack>

                      <VStack align="center" spacing={2}>
                        <Avatar size="md" name={match.opponentAgent.teamName} />
                        <Text fontSize="sm" fontWeight="bold" textAlign="center" color="white">
                          {match.opponentAgent.teamName}
                        </Text>
                        <Text fontSize="2xl" fontWeight="bold" color="#FF007A">
                          {match.opponentScore}
                        </Text>
                      </VStack>
                    </HStack>

                    <Button
                      as={Link}
                      href={`/match/${match.matchId}`}
                      size="sm"
                      bg="#2172E5"
                      color="white"
                      w="full"
                      _hover={{ bg: "#1a5bb8" }}
                    >
                      观看比赛
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* 所有已注册的Agent */}
        <Box>
          <Heading size="md" mb={4} color="white">🤖 已注册的Agent</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {allAgents.map((agent) => (
              <Card key={agent.id} bg={bgColor} borderColor={borderColor} border="1px solid" _hover={{ bg: cardHoverBg, transform: 'translateY(-2px)' }} transition="all 0.2s">
                <CardBody>
                  <VStack align="start" spacing={3}>
                    <HStack justify="space-between" w="full">
                      <Avatar size="sm" name={agent.teamName} />
                      <Badge bg={agent.isActive ? '#00ff9d' : '#666'} color={agent.isActive ? 'black' : 'white'}>
                        {agent.isActive ? '活跃' : '不活跃'}
                      </Badge>
                    </HStack>

                    <VStack align="start" spacing={1} w="full">
                      <Text fontWeight="bold" color="white">{agent.teamName}</Text>
                      <Text fontSize="sm" color="gray.400">
                        Owner: {formatAddress(agent.owner)}
                      </Text>
                      <Text fontSize="sm" color="gray.300">
                        积分: <Text as="span" fontWeight="bold" color="#00ff9d">{agent.points}</Text>
                      </Text>
                      <Text fontSize="sm" color="gray.300">
                        战绩: {agent.wins}胜 {agent.losses}负
                      </Text>
                    </VStack>

                    {agent.hasToken && (
                      <VStack align="start" spacing={1} w="full">
                        <Text fontSize="xs" color="gray.400">Token地址:</Text>
                        <HStack>
                          <Text fontSize="xs" fontFamily="mono" color="gray.300">
                            {formatAddress(agent.tokenAddress)}
                          </Text>
                          <Button
                            size="xs"
                            bg="#2172E5"
                            color="white"
                            variant="solid"
                            as="a"
                            href={`https://sepolia.etherscan.io/token/${agent.tokenAddress}`}
                            target="_blank"
                            _hover={{ bg: "#1a5bb8" }}
                          >
                            查看
                          </Button>
                        </HStack>

                        {agent.isMinting ? (
                          <Button
                            size="sm"
                            bg="#FF6B35"
                            color="white"
                            variant="solid"
                            leftIcon={<Box w={2} h={2} bg="#FF6B35" borderRadius="full" />}
                            as={Link}
                            href={`/mint/${agent.id}`}
                            _hover={{ bg: "#e85a2e" }}
                          >
                            正在Mint
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            bg="#00ff9d"
                            color="black"
                            variant="solid"
                            as="a"
                            href={`https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${agent.tokenAddress}`}
                            target="_blank"
                            _hover={{ bg: "#00e68a" }}
                          >
                            交易
                          </Button>
                        )}
                      </VStack>
                    )}

                    <Button
                      as={Link}
                      href={`/agent/${agent.id}`}
                      size="sm"
                      variant="outline"
                      borderColor="#40444F"
                      color="white"
                      w="full"
                      _hover={{ bg: cardHoverBg, borderColor: "#00ff9d" }}
                    >
                      查看详情
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* 正在发行Token的Agent */}
        <Box>
          <Heading size="md" mb={4} color="white">🚀 正在发行Token的Agent</Heading>
          <VStack spacing={4}>
            {activeTokenLaunches.map((launch) => {
              const agent = allAgents.find(a => a.id === launch.agentId)
              const progress = Number(launch.totalMinted) / 1000000 * 100 // 假设目标是100万

              return (
                <Card key={launch.agentId} w="full" bg={bgColor} borderColor={borderColor} border="1px solid" _hover={{ bg: cardHoverBg }}>
                  <CardBody>
                    <Flex direction={{ base: 'column', md: 'row' }} align="center" gap={4}>
                      <VStack align="start" flex={1}>
                        <HStack>
                          <Text fontWeight="bold" color="white">Agent ID: {launch.agentId}</Text>
                          <Badge bg="#2172E5" color="white">发行中</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.400">
                          Token: {formatAddress(launch.tokenAddress)}
                        </Text>
                        <Text fontSize="sm" color="gray.300">
                          已Mint: {Number(launch.totalMinted).toLocaleString()} Token
                        </Text>
                        <Progress value={progress} w="full" bg="gray.700" sx={{
                          '& > div': {
                            bg: '#00ff9d'
                          }
                        }} />
                        <Text fontSize="xs" color="gray.400">
                          进度: {progress.toFixed(1)}%
                        </Text>
                      </VStack>

                      <VStack align="end" spacing={2}>
                        <Text fontSize="sm" fontWeight="bold" color="#FF007A">
                          {formatTimeRemaining(launch.mintEndTime)}
                        </Text>
                        <Button
                          as={Link}
                          href={`/mint/${launch.agentId}`}
                          bg="#2172E5"
                          color="white"
                          size="sm"
                          _hover={{ bg: "#1a5bb8" }}
                        >
                          进入Mint
                        </Button>
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card>
              )
            })}
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}