'use client'

import {
  Box,
  Heading,
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
  useColorModeValue,
  Alert,
  AlertIcon,
  Divider
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useMatch } from '../../hooks/useContracts'

export default function MatchPage() {
  const { id } = useParams()
  const [matchData, setMatchData] = useState(null)
  const [liveScore, setLiveScore] = useState({ home: 0, away: 0 })
  const [gameTime, setGameTime] = useState(0)
  const [gameEvents, setGameEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [customStreamUrl, setCustomStreamUrl] = useState('')
  const [showStreamControls, setShowStreamControls] = useState(false)

  const bgColor = 'rgba(255, 255, 255, 0.05)'
  const borderColor = '#40444F'
  const cardHoverBg = 'rgba(255, 255, 255, 0.08)'

  const { match, isLoading: matchLoading } = useMatch(id)

  useEffect(() => {
    // 立即生成模拟数据，不等待合约数据
    if (loading && !matchData) {
      setMatchData({
        matchId: Number(id),
        challengerAgent: {
          id: Number(id),
          name: `Agent Team ${id}`,
          owner: `0x${Math.floor(Math.random() * 1000000).toString(16).padStart(40, '0')}`
        },
        opponentAgent: {
          id: Number(id) + 1,
          name: `Agent Team ${Number(id) + 1}`,
          owner: `0x${Math.floor(Math.random() * 1000000).toString(16).padStart(40, '0')}`
        },
        state: 2, // Started
        startedAt: Math.floor(Date.now() / 1000) - 1800, // 30分钟前开始
        matchFee: BigInt(Math.floor(Math.random() * 100) * 1e15), // 0.001-0.1 ETH
        server: `0x${Math.floor(Math.random() * 1000000).toString(16).padStart(40, '0')}`,
        // 添加YouTube直播链接
        liveStreamUrl: `https://www.youtube.com/embed/YUmnXWTu9u0?si=Dhrm3cj0qwwGllQP`,
        isLive: true
      })

      // 模拟比赛事件
      const mockEvents = [
        { time: 5, type: 'goal', team: 'home', player: 'Agent AI Forward', description: '精彩进球！AI完美预判' },
        { time: 12, type: 'yellow', team: 'away', player: 'Agent ML Midfielder', description: '算法判断犯规' },
        { time: 23, type: 'goal', team: 'away', player: 'Agent DL Striker', description: '深度学习反击！' },
        { time: 34, type: 'substitution', team: 'home', player: 'Agent 策略调整', description: 'AI策略优化' },
        { time: 45, type: 'goal', team: 'home', player: 'Agent NN Midfielder', description: '神经网络远射！' }
      ]
      setGameEvents(mockEvents)
      setLoading(false)
    }

    // 如果有真实合约数据，更新为合约数据
    if (!matchLoading && match) {
      setMatchData(prev => ({
        ...prev,
        challengerAgent: {
          id: Number(match.challengerAgentId),
          name: `Agent ${match.challengerAgentId}`,
          owner: match.challenger
        },
        opponentAgent: {
          id: Number(match.opponentAgentId),
          name: `Agent ${match.opponentAgentId}`,
          owner: match.opponent
        },
        state: Number(match.state),
        startedAt: Number(match.startedAt),
        matchFee: Number(match.matchFee),
        server: match.assignedServer
      }))
    }
  }, [id, match, matchLoading, loading, matchData])

  // 生成随机YouTube视频ID的函数
  const generateRandomYouTubeId = () => {
    // 一些示例的足球/体育相关YouTube直播视频ID
    const sampleIds = [
      'jfKfPfyJRdk', // 示例直播ID
      'aqz-KE-bpKQ', // 示例直播ID
      'hHW1oY26kxQ'  // 示例直播ID
    ]
    return sampleIds[Math.floor(Math.random() * sampleIds.length)]
  }

  // 将YouTube URL转换为嵌入格式
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null

    const videoId = url.includes('watch?v=')
      ? url.split('watch?v=')[1]?.split('&')[0]
      : url.split('/').pop()

    return `https://www.youtube.com/embed/YUmnXWTu9u0?si=Dhrm3cj0qwwGllQP`
  }

  // 更新直播链接
  const updateStreamUrl = () => {
    if (customStreamUrl && matchData) {
      setMatchData(prev => ({
        ...prev,
        liveStreamUrl: customStreamUrl,
        isLive: true
      }))
      setCustomStreamUrl('')
      setShowStreamControls(false)
    }
  }

  // 验证YouTube URL格式
  const isValidYouTubeUrl = (url) => {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/
    return regex.test(url)
  }

  // 模拟实时比分更新
  useEffect(() => {
    if (matchData && matchData.state === 2) { // Started
      const interval = setInterval(() => {
        setGameTime(prev => {
          const newTime = prev + 1

          // 随机更新比分
          if (Math.random() < 0.02) { // 2% chance per second
            if (Math.random() > 0.5) {
              setLiveScore(prev => ({ ...prev, home: prev.home + 1 }))
            } else {
              setLiveScore(prev => ({ ...prev, away: prev.away + 1 }))
            }
          }

          // 比赛时长限制为90分钟
          if (newTime >= 90 * 60) {
            clearInterval(interval)
            return 90 * 60
          }

          return newTime
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [matchData])

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatGameTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStateText = (state) => {
    switch (state) {
      case 0: return '已创建'
      case 1: return '已接受'
      case 2: return '进行中'
      case 3: return '已完成'
      case 4: return '已失败'
      default: return '未知'
    }
  }

  const getStateColor = (state) => {
    switch (state) {
      case 0: return 'gray'
      case 1: return 'blue'
      case 2: return 'green'
      case 3: return 'purple'
      case 4: return 'red'
      default: return 'gray'
    }
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'goal': return '⚽'
      case 'yellow': return '🟨'
      case 'red': return '🟥'
      case 'substitution': return '🔄'
      default: return '📝'
    }
  }

  if (loading || matchLoading) {
    return (
      <Box className="container" py={8} textAlign="center">
        <Spinner size="xl" color="#00ff9d" />
        <Text mt={4} color="white">加载比赛数据中...</Text>
      </Box>
    )
  }

  if (!matchData) {
    return (
      <Box className="container" py={8} textAlign="center">
        <Alert status="error" maxW="500px" mx="auto">
          <AlertIcon />
          比赛不存在或数据加载失败
        </Alert>
        <Button as={Link} href="/" mt={4}>
          返回首页
        </Button>
      </Box>
    )
  }

  return (
    <Box className="container" py={8} maxW="1000px" mx="auto" px={4}>
      <VStack spacing={6} align="stretch">
        {/* 比赛头部信息 */}
        <Card bg={bgColor} borderColor={borderColor} border="1px solid">
          <CardBody>
            <VStack spacing={4}>
              <HStack justify="space-between" w="full">
                <Text fontSize="lg" fontWeight="bold" color="white">
                  比赛 #{matchData.matchId}
                </Text>
                <Badge
                  bg={
                    matchData.state === 0 ? '#666' :
                    matchData.state === 1 ? '#2172E5' :
                    matchData.state === 2 ? '#00ff9d' :
                    matchData.state === 3 ? '#8B5CF6' : '#FF007A'
                  }
                  color={matchData.state === 2 ? 'black' : 'white'}
                  size="lg"
                >
                  {getStateText(matchData.state)}
                </Badge>
              </HStack>

              {matchData.state === 2 && (
                <VStack spacing={2}>
                  <Text fontSize="2xl" fontWeight="bold" color="#00ff9d">
                    {formatGameTime(gameTime)} ⏱️
                  </Text>
                  <Badge bg="#00ff9d" color="black" variant="solid">
                    LIVE 🔴
                  </Badge>
                </VStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* 比分板 */}
        <Card bg={bgColor} borderColor={borderColor} border="1px solid">
          <CardBody>
            <Flex justify="space-between" align="center" py={8}>
              {/* 主队 */}
              <VStack align="center" spacing={4} flex={1}>
                <Avatar size="2xl" name={matchData.challengerAgent.name} />
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" textAlign="center" color="white">
                    {matchData.challengerAgent.name}
                  </Text>
                  <Text fontSize="sm" color="gray.400">
                    ID: {matchData.challengerAgent.id}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatAddress(matchData.challengerAgent.owner)}
                  </Text>
                </VStack>
                <Text fontSize="6xl" fontWeight="bold" color="#00ff9d">
                  {liveScore.home}
                </Text>
              </VStack>

              {/* VS */}
              <VStack spacing={2} px={8}>
                <Text fontSize="3xl" fontWeight="bold" color="gray.400">
                  VS
                </Text>
                <Text fontSize="sm" color="gray.400">
                  挑战金额: {(Number(matchData.matchFee) / 1e18).toFixed(4)} ETH
                </Text>
              </VStack>

              {/* 客队 */}
              <VStack align="center" spacing={4} flex={1}>
                <Avatar size="2xl" name={matchData.opponentAgent.name} />
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" textAlign="center" color="white">
                    {matchData.opponentAgent.name}
                  </Text>
                  <Text fontSize="sm" color="gray.400">
                    ID: {matchData.opponentAgent.id}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatAddress(matchData.opponentAgent.owner)}
                  </Text>
                </VStack>
                <Text fontSize="6xl" fontWeight="bold" color="#FF007A">
                  {liveScore.away}
                </Text>
              </VStack>
            </Flex>
          </CardBody>
        </Card>

        {/* 直播视频区域 */}
        {matchData && matchData.liveStreamUrl && (
          <Card bg={bgColor} borderColor={borderColor} border="1px solid">
            <CardBody>
              <VStack spacing={4}>
                <HStack justify="space-between" w="full">
                  <Text fontSize="lg" fontWeight="bold" color="white">🔴 比赛直播</Text>
                  {matchData.isLive && (
                    <Badge bg="#FF0000" color="white" variant="solid">
                      LIVE
                    </Badge>
                  )}
                </HStack>

                <Box w="full" position="relative" paddingBottom="56.25%" height="0" overflow="hidden">
                  <Box
                    as="iframe"
                    position="absolute"
                    top="0"
                    left="0"
                    width="100%"
                    height="100%"
                    src={getYouTubeEmbedUrl(matchData.liveStreamUrl)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    border="none"
                    borderRadius="8px"
                  />
                </Box>

                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.400">
                    直播画面展示AI Agent比赛实况
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="#40444F"
                    color="white"
                    _hover={{ bg: cardHoverBg, borderColor: "#00ff9d" }}
                    as="a"
                    href={matchData.liveStreamUrl}
                    target="_blank"
                  >
                    在YouTube观看
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* 比赛事件 */}
        {gameEvents.length > 0 && (
          <Card bg={bgColor} borderColor={borderColor} border="1px solid">
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" color="white">比赛事件</Text>
                <VStack spacing={3} align="stretch">
                  {gameEvents.map((event, index) => (
                    <HStack
                      key={index}
                      justify="space-between"
                      p={3}
                      bg="rgba(255, 255, 255, 0.08)"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="rgba(255, 255, 255, 0.1)"
                      _hover={{ bg: "rgba(255, 255, 255, 0.12)" }}
                    >
                      <HStack>
                        <Text fontSize="lg">{getEventIcon(event.type)}</Text>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold" color="white">{event.player}</Text>
                          <Text fontSize="sm" color="gray.300">{event.description}</Text>
                        </VStack>
                      </HStack>
                      <VStack align="end" spacing={0}>
                        <Text fontWeight="bold" color="white">{event.time}'</Text>
                        <Badge
                          size="sm"
                          bg={event.team === 'home' ? '#2172E5' : '#FF007A'}
                          color="white"
                        >
                          {event.team === 'home' ? matchData.challengerAgent.name : matchData.opponentAgent.name}
                        </Badge>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* 比赛信息 */}
        <Card bg={bgColor} borderColor={borderColor} border="1px solid">
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="lg" fontWeight="bold" color="white">比赛信息</Text>
              <HStack justify="space-between">
                <Text color="white">服务器:</Text>
                <Text fontFamily="mono" color="gray.300">{formatAddress(matchData.server)}</Text>
              </HStack>
              {matchData.startedAt > 0 && (
                <HStack justify="space-between">
                  <Text color="white">开始时间:</Text>
                  <Text color="gray.300">{new Date(matchData.startedAt * 1000).toLocaleString('zh-CN')}</Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* 操作按钮 */}
        <HStack justify="center" spacing={4}>
          <Button
            as={Link}
            href="/"
            variant="outline"
            borderColor="#40444F"
            color="white"
            _hover={{ bg: cardHoverBg, borderColor: "#00ff9d" }}
          >
            返回首页
          </Button>
          <Button
            as={Link}
            href={`/agent/${matchData.challengerAgent.id}`}
            variant="outline"
            borderColor="#2172E5"
            color="#2172E5"
            _hover={{ bg: "rgba(33, 114, 229, 0.1)", borderColor: "#1a5bb8" }}
          >
            查看 {matchData.challengerAgent.name}
          </Button>
          <Button
            as={Link}
            href={`/agent/${matchData.opponentAgent.id}`}
            variant="outline"
            borderColor="#FF007A"
            color="#FF007A"
            _hover={{ bg: "rgba(255, 0, 122, 0.1)", borderColor: "#cc0061" }}
          >
            查看 {matchData.opponentAgent.name}
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}