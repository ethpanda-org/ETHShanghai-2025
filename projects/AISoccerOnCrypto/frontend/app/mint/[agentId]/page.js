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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormHelperText,
  Textarea,
  useColorModeValue,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Alert,
  AlertIcon,
  Link as ChakraLink
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import {
  useAgentInfo,
  useTokenLaunch,
  useMintToken,
  useContracts
} from '../../hooks/useContracts'
import { useReadContract } from 'wagmi'

export default function MintPage() {
  const { agentId } = useParams()
  const { address: currentUser } = useAccount()
  const [mintData, setMintData] = useState(null)
  const [batches, setBatches] = useState(1)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const toast = useToast()
  const bgColor = 'rgba(255, 255, 255, 0.05)'
  const borderColor = '#40444F'
  const cardHoverBg = 'rgba(255, 255, 255, 0.08)'

  const contracts = useContracts()
  const { agentInfo, isLoading: agentLoading } = useAgentInfo(agentId)
  const { tokenLaunch, isLoading: tokenLoading } = useTokenLaunch(agentId)
  const { mintToken, isPending: isMinting } = useMintToken()

  // 获取LaunchPad常量
  const { data: TOKENS_PER_BATCH } = useReadContract({
    address: contracts.LaunchPad.address,
    abi: contracts.LaunchPad.abi,
    functionName: 'TOKENS_PER_BATCH'
  })

  const { data: PRICE_PER_BATCH } = useReadContract({
    address: contracts.LaunchPad.address,
    abi: contracts.LaunchPad.abi,
    functionName: 'PRICE_PER_BATCH'
  })

  const { data: MIN_BATCHES } = useReadContract({
    address: contracts.LaunchPad.address,
    abi: contracts.LaunchPad.abi,
    functionName: 'MIN_BATCHES'
  })

  const { data: MAX_BATCHES } = useReadContract({
    address: contracts.LaunchPad.address,
    abi: contracts.LaunchPad.abi,
    functionName: 'MAX_BATCHES'
  })

  const { data: MINT_DURATION } = useReadContract({
    address: contracts.LaunchPad.address,
    abi: contracts.LaunchPad.abi,
    functionName: 'MINT_DURATION'
  })

  const { data: PUBLIC_MINT_SUPPLY } = useReadContract({
    address: contracts.LaunchPad.address,
    abi: contracts.LaunchPad.abi,
    functionName: 'PUBLIC_MINT_SUPPLY'
  })

  // 获取用户已mint信息
  const { data: userMintInfo } = useReadContract({
    address: contracts.LaunchPad.address,
    abi: contracts.LaunchPad.abi,
    functionName: 'getUserMintInfo',
    args: [tokenLaunch?.tokenAddress, currentUser],
    enabled: !!(tokenLaunch?.tokenAddress && currentUser)
  })

  useEffect(() => {
    if (!agentLoading && !tokenLoading && agentInfo && tokenLaunch) {
      const mintEndTime = Number(tokenLaunch.startTime) + Number(MINT_DURATION || 0)
      const now = Math.floor(Date.now() / 1000)
      const isActive = !tokenLaunch.isCompleted && !tokenLaunch.isFailed && now < mintEndTime

      setMintData({
        agentId: Number(agentId),
        agentName: agentInfo.teamName,
        tokenAddress: tokenLaunch.tokenAddress,
        startTime: Number(tokenLaunch.startTime),
        endTime: mintEndTime,
        totalMinted: Number(tokenLaunch.totalMinted),
        totalFees: Number(tokenLaunch.totalFees),
        isCompleted: tokenLaunch.isCompleted,
        isFailed: tokenLaunch.isFailed,
        isActive,
        tokensPerBatch: Number(TOKENS_PER_BATCH || 0),
        pricePerBatch: Number(PRICE_PER_BATCH || 0),
        minBatches: Number(MIN_BATCHES || 1),
        maxBatches: Number(MAX_BATCHES || 10),
        publicMintSupply: Number(PUBLIC_MINT_SUPPLY || 0),
        userMintedTokens: userMintInfo ? Number(userMintInfo[1]) : 0,
        userMintedFees: userMintInfo ? Number(userMintInfo[0]) : 0
      })
      setLoading(false)
    }
  }, [agentId, agentInfo, tokenLaunch, agentLoading, tokenLoading, TOKENS_PER_BATCH, PRICE_PER_BATCH, MIN_BATCHES, MAX_BATCHES, MINT_DURATION, PUBLIC_MINT_SUPPLY, userMintInfo])

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTimeRemaining = (endTime) => {
    const now = Math.floor(Date.now() / 1000)
    const remaining = endTime - now
    if (remaining <= 0) return '已结束'

    const days = Math.floor(remaining / (24 * 60 * 60))
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((remaining % (60 * 60)) / 60)

    if (days > 0) return `${days}天${hours}小时`
    if (hours > 0) return `${hours}小时${minutes}分钟`
    return `${minutes}分钟`
  }

  const calculateTotalCost = () => {
    if (!mintData) return 0
    return batches * mintData.pricePerBatch
  }

  const calculateTokensToReceive = () => {
    if (!mintData) return 0
    return batches * mintData.tokensPerBatch
  }

  const handleMint = async () => {
    if (!mintData || !currentUser) {
      toast({
        title: "错误",
        description: "请先连接钱包",
        status: "error",
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (batches < mintData.minBatches || batches > mintData.maxBatches) {
      toast({
        title: "错误",
        description: `批次数量必须在 ${mintData.minBatches} 到 ${mintData.maxBatches} 之间`,
        status: "error",
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      const value = BigInt(calculateTotalCost())
      await mintToken(Number(agentId), batches, message, value)

      toast({
        title: "Mint成功",
        description: `成功mint ${calculateTokensToReceive()} 个token`,
        status: "success",
        duration: 5000,
        isClosable: true,
      })

      // 重置表单
      setBatches(mintData.minBatches)
      setMessage('')
    } catch (error) {
      toast({
        title: "Mint失败",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      })
    }
  }

  if (loading || agentLoading || tokenLoading) {
    return (
      <Box className="container" py={8} textAlign="center">
        <Spinner size="xl" color="#00ff9d" />
        <Text mt={4} color="white">加载中...</Text>
      </Box>
    )
  }

  if (!mintData) {
    return (
      <Box className="container" py={8} textAlign="center">
        <Text color="white">Token发行不存在或已结束</Text>
        <Button as={Link} href="/" mt={4} bg="#2172E5" color="white" _hover={{ bg: "#1a5bb8" }}>
          返回首页
        </Button>
      </Box>
    )
  }

  const progressPercentage = (mintData.totalMinted / mintData.publicMintSupply) * 100

  return (
    <Box className="container" py={8} maxW="800px" mx="auto" px={4}>
      <VStack spacing={6} align="stretch">
        {/* 页面标题 */}
        <VStack spacing={2}>
          <Heading size="lg" color="white">Token Mint</Heading>
          <Text color="gray.400">参与 {mintData.agentName} 的Token发行</Text>
        </VStack>

        {/* Token发行状态 */}
        <Card bg={bgColor} borderColor={borderColor} border="1px solid">
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <HStack>
                  <Avatar size="md" name={mintData.agentName} />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="bold" color="white">{mintData.agentName}</Text>
                    <Text fontSize="sm" color="gray.400">
                      Agent ID: {mintData.agentId}
                    </Text>
                  </VStack>
                </HStack>
                <Badge
                  bg={
                    mintData.isCompleted ? '#00ff9d' :
                    mintData.isFailed ? '#FF007A' :
                    mintData.isActive ? '#2172E5' : '#666'
                  }
                  color={mintData.isCompleted ? 'black' : 'white'}
                  size="lg"
                >
                  {mintData.isCompleted ? '发行完成' :
                   mintData.isFailed ? '发行失败' :
                   mintData.isActive ? '发行中' : '已结束'}
                </Badge>
              </HStack>

              <Divider />

              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text color="white">Token地址:</Text>
                  <ChakraLink
                    href={`https://sepolia.etherscan.io/token/${mintData.tokenAddress}`}
                    isExternal
                    color="#2172E5"
                    _hover={{ color: "#1a5bb8" }}
                  >
                    {formatAddress(mintData.tokenAddress)}
                  </ChakraLink>
                </HStack>

                <HStack justify="space-between">
                  <Text color="white">发行进度:</Text>
                  <VStack align="end" spacing={1}>
                    <Text fontSize="sm" color="gray.400">
                      {progressPercentage.toFixed(1)}%
                    </Text>
                    <Progress
                      value={progressPercentage}
                      w="200px"
                      bg="gray.700"
                      sx={{
                        '& > div': {
                          bg: '#00ff9d'
                        }
                      }}
                      size="sm"
                    />
                  </VStack>
                </HStack>

                <HStack justify="space-between">
                  <Text color="white">已mint数量:</Text>
                  <Text fontWeight="bold" color="white">
                    {mintData.totalMinted.toLocaleString()} / {mintData.publicMintSupply.toLocaleString()}
                  </Text>
                </HStack>

                {mintData.isActive && (
                  <HStack justify="space-between">
                    <Text color="white">剩余时间:</Text>
                    <Text fontWeight="bold" color="#FF007A">
                      {formatTimeRemaining(mintData.endTime)}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        {/* 用户mint信息 */}
        {currentUser && (
          <Card bg={bgColor} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Text fontWeight="bold">我的Mint记录</Text>
                <HStack justify="space-between">
                  <Text>已mint Token:</Text>
                  <Text fontWeight="bold">{mintData.userMintedTokens.toLocaleString()}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text>已支付费用:</Text>
                  <Text fontWeight="bold">{(mintData.userMintedFees / 1e18).toFixed(4)} ETH</Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Mint表单 */}
        {mintData.isActive ? (
          <Card bg={bgColor} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={6}>
                <Text fontSize="lg" fontWeight="bold">参与Mint</Text>

                <FormControl>
                  <FormLabel>Mint批次数量</FormLabel>
                  <NumberInput
                    value={batches}
                    onChange={(valueString) => setBatches(parseInt(valueString) || 1)}
                    min={mintData.minBatches}
                    max={mintData.maxBatches}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <FormHelperText>
                    每批次包含 {mintData.tokensPerBatch.toLocaleString()} 个Token，
                    最少 {mintData.minBatches} 批次，最多 {mintData.maxBatches} 批次
                  </FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>留言 (可选)</FormLabel>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="为这次mint留下你的留言..."
                    maxLength={200}
                  />
                  <FormHelperText>最多200个字符</FormHelperText>
                </FormControl>

                <Card w="full" bg="blue.50" borderColor="blue.200">
                  <CardBody>
                    <VStack spacing={2}>
                      <HStack justify="space-between" w="full">
                        <Text>将获得Token:</Text>
                        <Text fontWeight="bold" color="blue.600">
                          {calculateTokensToReceive().toLocaleString()}
                        </Text>
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <Text>需支付:</Text>
                        <Text fontWeight="bold" color="blue.600">
                          {(calculateTotalCost() / 1e18).toFixed(4)} ETH
                        </Text>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>

                {!currentUser ? (
                  <Alert status="warning">
                    <AlertIcon />
                    请先连接钱包才能参与mint
                  </Alert>
                ) : (
                  <Button
                    colorScheme="blue"
                    size="lg"
                    w="full"
                    onClick={handleMint}
                    isLoading={isMinting}
                    loadingText="Minting..."
                  >
                    Mint Token
                  </Button>
                )}
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <Alert status="info">
            <AlertIcon />
            {mintData.isCompleted && "Token发行已完成"}
            {mintData.isFailed && "Token发行已失败"}
            {!mintData.isActive && !mintData.isCompleted && !mintData.isFailed && "Token发行已结束"}
          </Alert>
        )}

        {/* 发行规则说明 */}
        <Card bg={bgColor} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={3} align="start">
              <Text fontWeight="bold">发行规则说明</Text>
              <Text fontSize="sm">• 每批次价格: {(mintData.pricePerBatch / 1e18).toFixed(4)} ETH</Text>
              <Text fontSize="sm">• 每批次Token数量: {mintData.tokensPerBatch.toLocaleString()}</Text>
              <Text fontSize="sm">• 最少购买批次: {mintData.minBatches}</Text>
              <Text fontSize="sm">• 最多购买批次: {mintData.maxBatches}</Text>
              <Text fontSize="sm">• 公开发行总量: {mintData.publicMintSupply.toLocaleString()}</Text>
              <Text fontSize="sm">• 发行期限: {(Number(MINT_DURATION) / (24 * 60 * 60)).toFixed(0)} 天</Text>
            </VStack>
          </CardBody>
        </Card>

        <Button as={Link} href="/" variant="outline">
          返回首页
        </Button>
      </VStack>
    </Box>
  )
}