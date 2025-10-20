'use client'

import {
  Box,
  Heading,
  SimpleGrid,
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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  useToast
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import {
  useAgentInfo,
  useAgentMatches,
  useAgentMatchStats,
  useTokenLaunch,
  usePendingInvitations,
  useCreateMatchInvitation
} from '../../hooks/useContracts'

export default function AgentDetail() {
  const { id } = useParams()
  const { address: currentUser } = useAccount()
  const [agentData, setAgentData] = useState(null)
  const [matchHistory, setMatchHistory] = useState([])
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [challengeValue, setChallengeValue] = useState('0.001')
  const [showingMatchVideo, setShowingMatchVideo] = useState(null)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [isModalMaximized, setIsModalMaximized] = useState(false)

  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isVideoOpen, onOpen: onVideoOpen, onClose: onVideoClose } = useDisclosure()
  const toast = useToast()

  const bgColor = 'rgba(255, 255, 255, 0.05)'
  const borderColor = '#40444F'
  const cardHoverBg = 'rgba(255, 255, 255, 0.08)'

  const { agentInfo, owner, isLoading: agentLoading, error: agentError } = useAgentInfo(id)
  const { matches, isLoading: matchesLoading } = useAgentMatches(id)
  const { stats, isLoading: statsLoading } = useAgentMatchStats(id)
  const { tokenLaunch, isLoading: tokenLoading } = useTokenLaunch(id)
  const { invitations, isLoading: invitationsLoading } = usePendingInvitations(id)
  const { createInvitation, isPending: isCreatingInvitation } = useCreateMatchInvitation()

  // 初始化效果 - 如果ID改变，重置loading状态
  useEffect(() => {
    setLoading(true)
    setAgentData(null)
  }, [id])

  useEffect(() => {
    // 生成模拟数据的函数
    const generateMockData = () => {
      setAgentData({
        id: Number(id),
        teamName: `Agent Team ${id}`,
        modelVersion: "v1.0.0",
        registeredAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        isActive: true,
        owner: currentUser || `0x${Math.floor(Math.random() * 1000000).toString(16).padStart(40, '0')}`,
        description: "这是一个高级AI足球Agent，使用最新的机器学习算法训练。",
        version: "v2.1.0",
        totalMatches: Math.floor(Math.random() * 20),
        wins: Math.floor(Math.random() * 10),
        losses: Math.floor(Math.random() * 5),
        points: Math.floor(Math.random() * 100)
      })

      // 模拟历史比赛数据
      const mockMatches = []
      for (let i = 0; i < 10; i++) {
        mockMatches.push({
          id: i + 1,
          opponent: `Agent ${Math.floor(Math.random() * 100)}`,
          result: Math.random() > 0.5 ? 'win' : 'loss',
          score: `${Math.floor(Math.random() * 5)}-${Math.floor(Math.random() * 5)}`,
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          replayUrl: `https://www.youtube.com/embed/oj_SdlmGt6Q?si=OvZIf0QAJGw55_YU`,
          videoUrl: `https://www.youtube.com/embed/oj_SdlmGt6Q?si=OvZIf0QAJGw55_YU`
        })
      }
      setMatchHistory(mockMatches)

      // 模拟反馈数据
      const mockFeedback = []
      for (let i = 0; i < 5; i++) {
        mockFeedback.push({
          id: i + 1,
          user: `0x${Math.floor(Math.random() * 1000000).toString(16).padStart(40, '0')}`,
          rating: Math.floor(Math.random() * 5) + 1,
          comment: `这个Agent表现很好，策略很有趣。比赛${i + 1}`,
          date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
          replies: []
        })
      }
      setFeedback(mockFeedback)
      setLoading(false)
    }

    // 立即生成模拟数据，不等待合约数据
    if (loading && !agentData) {
      generateMockData()
    }

    // 如果有真实合约数据，更新为合约数据
    if (!agentLoading && agentInfo) {
      setAgentData(prev => ({
        ...prev,
        teamName: agentInfo.teamName,
        modelVersion: agentInfo.modelVersion,
        registeredAt: Number(agentInfo.registeredAt),
        isActive: agentInfo.isActive,
        owner: owner,
        totalMatches: matches?.length || 0,
        wins: stats?.[1] ? Number(stats[1]) : 0,
        losses: stats?.[3] ? Number(stats[3]) : 0,
      }))
    }
  }, [id, agentInfo, matches, stats, owner, agentLoading, agentError, currentUser, loading, agentData])

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-CN')
  }

  const isOwner = currentUser && owner && currentUser.toLowerCase() === owner.toLowerCase()

  // 将YouTube URL转换为嵌入格式
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null

    // 如果已经是embed格式，直接返回
    if (url.includes('embed/')) {
      return url
    }

    // 处理普通YouTube URL
    const videoId = url.includes('watch?v=')
      ? url.split('watch?v=')[1]?.split('&')[0]
      : url.split('/').pop()

    return `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=0&controls=1&rel=0`
  }

  const handleWatchHistoricalMatch = (match) => {
    setSelectedMatch(match)
    setShowingMatchVideo(match.id)
    setIsModalMaximized(false)
    onVideoOpen()
  }

  const handleCloseVideo = () => {
    setShowingMatchVideo(null)
    setSelectedMatch(null)
    setIsModalMaximized(false)
    onVideoClose()
  }

  const toggleMaximize = () => {
    setIsModalMaximized(!isModalMaximized)
  }

  const handleCreateChallenge = async (opponentAgentId) => {
    try {
      const value = BigInt(parseFloat(challengeValue) * 1e18) // Convert ETH to wei
      await createInvitation(Number(id), opponentAgentId, value)
      toast({
        title: "挑战发起成功",
        description: "等待对方接受挑战",
        status: "success",
        duration: 3000,
        isClosable: true,
      })
      onClose()
    } catch (error) {
      toast({
        title: "挑战发起失败",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      })
    }
  }

  if (loading || agentLoading) {
    return (
      <Box className="container" py={8} textAlign="center">
        <Spinner size="xl" color="#00ff9d" />
        <Text mt={4} color="white">加载中...</Text>
      </Box>
    )
  }

  if (!agentData) {
    return (
      <Box className="container" py={8} textAlign="center">
        <Text color="white">Agent不存在</Text>
      </Box>
    )
  }

  return (
    <Box className="container" py={8} maxW="1200px" mx="auto" px={4}>
      <VStack spacing={6} align="stretch">
        {/* Agent基本信息 */}
        <Card bg={bgColor} borderColor={borderColor} border="1px solid">
          <CardBody>
            <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
              <VStack align="center" spacing={4}>
                <Avatar size="2xl" name={agentData.teamName} />
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color="white">{agentData.teamName}</Text>
                  <Badge bg={agentData.isActive ? '#00ff9d' : '#666'} color={agentData.isActive ? 'black' : 'white'}>
                    {agentData.isActive ? '活跃' : '不活跃'}
                  </Badge>
                </VStack>
              </VStack>

              <VStack align="start" flex={1} spacing={4}>
                <VStack align="start" spacing={2} w="full">
                  <Text fontSize="lg" fontWeight="bold" color="white">基本信息</Text>
                  <Text color="gray.300">Agent ID: {agentData.id}</Text>
                  <Text color="gray.300">Owner: {formatAddress(agentData.owner)}</Text>
                  <Text color="gray.300">模型版本: {agentData.modelVersion}</Text>
                  <Text color="gray.300">注册时间: {formatDate(agentData.registeredAt * 1000)}</Text>
                  <Text color="gray.300">描述: {agentData.description}</Text>
                </VStack>

                <SimpleGrid columns={3} spacing={4} w="full">
                  <Stat>
                    <StatLabel color="gray.400">总比赛</StatLabel>
                    <StatNumber color="white">{agentData.totalMatches}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel color="gray.400">胜场</StatLabel>
                    <StatNumber color="#00ff9d">{agentData.wins}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel color="gray.400">负场</StatLabel>
                    <StatNumber color="#FF007A">{agentData.losses}</StatNumber>
                  </Stat>
                </SimpleGrid>

                {!isOwner && currentUser && (
                  <Button bg="#2172E5" color="white" _hover={{ bg: "#1a5bb8" }} onClick={onOpen}>
                    向此Agent发起挑战
                  </Button>
                )}
              </VStack>
            </Flex>
          </CardBody>
        </Card>

        {/* Token信息 */}
        {tokenLaunch && (
          <Card bg={bgColor} borderColor={borderColor}>
            <CardBody>
              <VStack align="start" spacing={3}>
                <Text fontSize="lg" fontWeight="bold">Token信息</Text>
                <Text>Token地址: {formatAddress(tokenLaunch.tokenAddress)}</Text>
                <Text>已发行: {Number(tokenLaunch.totalMinted).toLocaleString()} Token</Text>
                <Text>状态: {tokenLaunch.isCompleted ? '发行完成' : tokenLaunch.isFailed ? '发行失败' : '发行中'}</Text>
                {!tokenLaunch.isCompleted && !tokenLaunch.isFailed && (
                  <Button
                    as={Link}
                    href={`/mint/${id}`}
                    colorScheme="blue"
                    size="sm"
                  >
                    参与Mint
                  </Button>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* 待处理的邀请 (仅Agent所有者可见) */}
        {isOwner && invitations && invitations.length > 0 && (
          <Card bg={bgColor} borderColor={borderColor}>
            <CardBody>
              <VStack align="start" spacing={4}>
                <Text fontSize="lg" fontWeight="bold">待处理的比赛邀请</Text>
                {invitations.map((invitationId) => (
                  <HStack key={invitationId} justify="space-between" w="full" p={3} bg="blue.50" borderRadius="md">
                    <Text>邀请 #{Number(invitationId)}</Text>
                    <HStack>
                      <Button size="sm" colorScheme="green">接受</Button>
                      <Button size="sm" variant="outline">拒绝</Button>
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Tabs */}
        <Tabs>
          <TabList borderColor="#40444F">
            <Tab color="gray.400" _selected={{ color: "white", borderColor: "#00ff9d" }} _hover={{ color: "white" }}>
              历史比赛
            </Tab>
            <Tab color="gray.400" _selected={{ color: "white", borderColor: "#00ff9d" }} _hover={{ color: "white" }}>
              反馈评论
            </Tab>
          </TabList>

          <TabPanels>
            {/* 历史比赛 */}
            <TabPanel px={0}>
              <VStack spacing={4}>
                {matchHistory.map((match) => (
                  <Card key={match.id} w="full" bg={bgColor} borderColor={borderColor} border="1px solid">
                    <CardBody>
                      <Flex justify="space-between" align="center">
                        <VStack align="start" spacing={1}>
                          <HStack>
                            <Text fontWeight="bold" color="white">vs {match.opponent}</Text>
                            <Badge bg={match.result === 'win' ? '#00ff9d' : '#FF007A'} color={match.result === 'win' ? 'black' : 'white'}>
                              {match.result === 'win' ? '胜' : '负'}
                            </Badge>
                          </HStack>
                          <Text fontSize="sm" color="gray.400">
                            比分: {match.score} | {formatDate(match.date)}
                          </Text>
                        </VStack>
                        <Button
                          size="sm"
                          variant="outline"
                          borderColor="#40444F"
                          color="white"
                          _hover={{ bg: cardHoverBg, borderColor: "#00ff9d" }}
                          onClick={() => handleWatchHistoricalMatch(match)}
                        >
                          观看历史比赛
                        </Button>
                      </Flex>
                    </CardBody>
                  </Card>
                ))}

              </VStack>
            </TabPanel>

            {/* 反馈评论 */}
            <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                {feedback.map((item) => (
                  <Card key={item.id} bg={bgColor} borderColor={borderColor} border="1px solid">
                    <CardBody>
                      <VStack align="start" spacing={3}>
                        <HStack justify="space-between" w="full">
                          <HStack>
                            <Avatar size="sm" />
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="bold" color="white">
                                {formatAddress(item.user)}
                              </Text>
                              <Text fontSize="xs" color="gray.400">
                                {formatDate(item.date)}
                              </Text>
                            </VStack>
                          </HStack>
                          <HStack>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Text
                                key={star}
                                color={star <= item.rating ? 'yellow.400' : 'gray.600'}
                              >
                                ⭐
                              </Text>
                            ))}
                          </HStack>
                        </HStack>
                        <Text color="gray.300">{item.comment}</Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          color="gray.400"
                          _hover={{ color: "white", bg: cardHoverBg }}
                        >
                          回复
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}

                {/* 发表新评论 */}
                {currentUser && !isOwner && (
                  <Card bg={bgColor} borderColor={borderColor} border="1px solid">
                    <CardBody>
                      <VStack spacing={4}>
                        <Text fontWeight="bold" color="white">发表评论</Text>
                        <Textarea
                          placeholder="写下你的评论..."
                          bg="rgba(255, 255, 255, 0.1)"
                          borderColor={borderColor}
                          color="white"
                          _placeholder={{ color: "gray.400" }}
                          _hover={{ borderColor: "#00ff9d" }}
                          _focus={{ borderColor: "#00ff9d", boxShadow: "0 0 0 1px #00ff9d" }}
                        />
                        <Button
                          bg="#2172E5"
                          color="white"
                          _hover={{ bg: "#1a5bb8" }}
                          size="sm"
                          alignSelf="end"
                        >
                          发表
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* 历史比赛视频播放模态框 */}
      <Modal isOpen={isVideoOpen} onClose={handleCloseVideo} size={isModalMaximized ? "full" : "6xl"}>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(10px)" />
        <ModalContent
          bg={bgColor}
          borderColor={borderColor}
          border="1px solid"
          color="white"
          maxW={isModalMaximized ? "100vw" : "90vw"}
          maxH={isModalMaximized ? "100vh" : "85vh"}
          m={isModalMaximized ? 0 : 4}
        >
          <ModalHeader
            color="white"
            borderBottomWidth="1px"
            borderBottomColor={borderColor}
            py={3}
          >
            <HStack justify="space-between" w="full">
              <VStack align="start" spacing={1}>
                <Text fontSize="lg" fontWeight="bold">
                  🎥 历史比赛回放
                </Text>
                {selectedMatch && (
                  <Text fontSize="sm" color="gray.400">
                    vs {selectedMatch.opponent} | {selectedMatch.score} | {formatDate(selectedMatch.date)}
                  </Text>
                )}
              </VStack>
              <HStack spacing={2}>
                <Button
                  size="sm"
                  variant="ghost"
                  color="white"
                  _hover={{ bg: cardHoverBg }}
                  onClick={toggleMaximize}
                  title={isModalMaximized ? "恢复窗口" : "最大化"}
                >
                  {isModalMaximized ? "🗗" : "🗖"}
                </Button>
                <ModalCloseButton
                  color="white"
                  _hover={{ bg: cardHoverBg }}
                  position="relative"
                  right="0"
                  top="0"
                />
              </HStack>
            </HStack>
          </ModalHeader>

          <ModalBody p={0}>
            {selectedMatch && (
              <Box
                w="full"
                h={isModalMaximized ? "calc(100vh - 120px)" : "70vh"}
                position="relative"
              >
                <Box
                  as="iframe"
                  position="absolute"
                  top="0"
                  left="0"
                  width="100%"
                  height="100%"
                  src={getYouTubeEmbedUrl(selectedMatch.videoUrl)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  border="none"
                />
              </Box>
            )}
          </ModalBody>

          <ModalFooter borderTopWidth="1px" borderTopColor={borderColor} py={3}>
            <HStack justify="space-between" w="full">
              <Text fontSize="sm" color="gray.400">
                历史比赛精彩回放，展示AI Agent的策略和表现
              </Text>
              <HStack spacing={3}>
                {selectedMatch && (
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="#40444F"
                    color="white"
                    _hover={{ bg: cardHoverBg, borderColor: "#00ff9d" }}
                    as="a"
                    href={selectedMatch.videoUrl}
                    target="_blank"
                  >
                    在YouTube观看
                  </Button>
                )}
                <Button
                  variant="ghost"
                  color="gray.300"
                  _hover={{ bg: cardHoverBg, color: "white" }}
                  onClick={handleCloseVideo}
                >
                  关闭
                </Button>
              </HStack>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 发起挑战模态框 */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent bg={bgColor} borderColor={borderColor} border="1px solid" color="white">
          <ModalHeader color="white" borderBottomWidth="1px" borderBottomColor={borderColor}>
            发起比赛挑战
          </ModalHeader>
          <ModalCloseButton color="white" _hover={{ bg: cardHoverBg }} />
          <ModalBody py={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel color="gray.300">挑战金额 (ETH)</FormLabel>
                <Input
                  type="number"
                  step="0.001"
                  value={challengeValue}
                  onChange={(e) => setChallengeValue(e.target.value)}
                  placeholder="0.001"
                  bg="rgba(255, 255, 255, 0.1)"
                  borderColor={borderColor}
                  color="white"
                  _placeholder={{ color: "gray.400" }}
                  _hover={{ borderColor: "#00ff9d" }}
                  _focus={{ borderColor: "#00ff9d", boxShadow: "0 0 0 1px #00ff9d" }}
                />
              </FormControl>
              <Text fontSize="sm" color="gray.400">
                向 {agentData.teamName} 发起挑战，需要支付挑战金额
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderTopColor={borderColor}>
            <Button
              variant="ghost"
              mr={3}
              onClick={onClose}
              color="gray.300"
              _hover={{ bg: cardHoverBg, color: "white" }}
            >
              取消
            </Button>
            <Button
              bg="#2172E5"
              color="white"
              _hover={{ bg: "#1a5bb8" }}
              onClick={() => handleCreateChallenge(Number(id))}
              isLoading={isCreatingInvitation}
              loadingText="发起中..."
            >
              发起挑战
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}