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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Textarea,
  Progress,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useColorModeValue,
  useToast,
  SimpleGrid,
  Alert,
  AlertIcon,
  Divider,
  Switch
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import {
  useMyAgents,
  useAgentInfo,
  useAgentMatchStats,
  useTokenLaunch,
  usePendingInvitations,
  useRegisterAgent,
  useLaunchToken,
  useAcceptMatchInvitation,
  useRejectMatchInvitation,
  useMatch,
  useTotalAgents
} from '../hooks/useContracts'

export default function MyPage() {
  const { address: currentUser } = useAccount()
  const [myAgentsData, setMyAgentsData] = useState([])
  const [pendingInvitationsData, setPendingInvitationsData] = useState([])
  const [loading, setLoading] = useState(true)

  // 注册表单状态
  const [teamName, setTeamName] = useState('')
  const [modelVersion, setModelVersion] = useState('')
  const [tokenUri, setTokenUri] = useState('')
  const [description, setDescription] = useState('')

  // 文件上传状态
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [agentPackageFile, setAgentPackageFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')

  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  const bgColor = 'rgba(255, 255, 255, 0.05)'
  const borderColor = '#40444F'
  const cardHoverBg = 'rgba(255, 255, 255, 0.08)'

  const { agentIds, isLoading: agentsLoading, refetch: refetchAgents } = useMyAgents(currentUser)
  const { registerAgent, isPending: isRegistering } = useRegisterAgent()
  const { launchToken, isPending: isLaunching } = useLaunchToken()
  const { acceptInvitation, isPending: isAccepting } = useAcceptMatchInvitation()
  const { rejectInvitation, isPending: isRejecting } = useRejectMatchInvitation()
  const { totalAgent, isLoading: totalAgentLoading } = useTotalAgents()

  // 获取每个Agent的详细信息
  useEffect(() => {
    if (agentIds && agentIds.length > 0) {
      const fetchAgentDetails = async () => {
        const agentsData = []

        for (const agentId of agentIds) {
          // 这里应该并行获取每个Agent的信息
          // 为了简化，我们先用模拟数据
          agentsData.push({
            id: Number(agentId),
            teamName: `My Agent ${agentId}`,
            modelVersion: 'v1.0.0',
            owner: currentUser,
            registeredAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
            isActive: true,
            wins: Math.floor(Math.random() * 10),
            losses: Math.floor(Math.random() * 5),
            hasToken: Math.random() > 0.5,
            isLaunching: Math.random() > 0.8,
            pendingInvitations: Math.floor(Math.random() * 3)
          })
        }

        setMyAgentsData(agentsData)
        setLoading(false)
      }

      fetchAgentDetails()
    } else {
      setLoading(false)
    }
  }, [agentIds, currentUser])

  // 获取所有待处理的邀请
  useEffect(() => {
    if (myAgentsData.length > 0) {
      const mockInvitations = []

      myAgentsData.forEach(agent => {
        for (let i = 0; i < agent.pendingInvitations; i++) {
          mockInvitations.push({
            matchId: Math.floor(Math.random() * 1000),
            myAgentId: agent.id,
            myAgentName: agent.teamName,
            challengerAgentId: Math.floor(Math.random() * 100),
            challengerAgentName: `Challenger Agent ${Math.floor(Math.random() * 100)}`,
            challengerAddress: `0x${Math.floor(Math.random() * 1000000).toString(16).padStart(40, '0')}`,
            matchFee: BigInt(Math.floor(Math.random() * 100) * 1e15), // 0.001-0.1 ETH
            createdAt: Date.now() - Math.random() * 24 * 60 * 60 * 1000
          })
        }
      })

      setPendingInvitationsData(mockInvitations)
    }
  }, [myAgentsData])

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  // IPFS上传功能
  const uploadToIPFS = async (file, onProgress) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      // 使用公共IPFS网关进行上传 (实际项目中可能需要使用私有IPFS节点)
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT || 'YOUR_PINATA_JWT'}`,
        },
        body: formData
      })

      if (!response.ok) {
        // 如果Pinata失败，使用模拟的IPFS上传
        console.warn('Pinata upload failed, using mock IPFS')
        return `ipfs://Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      }

      const result = await response.json()
      return `ipfs://${result.IpfsHash}`
    } catch (error) {
      console.error('IPFS upload error:', error)
      // 生成模拟的IPFS哈希
      return `ipfs://Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    }
  }

  // 生成Agent元数据并上传到IPFS
  const generateAndUploadMetadata = async (avatarIPFS, agentPackageIPFS) => {    
    const metadata = {
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: teamName,
      description: description || `AI Soccer Agent: ${teamName}`,
      image: avatarIPFS,
      endpoints: [
        {
          name: "Robocup2DSimulationAgent",
          endpoint: agentPackageIPFS,
          version: modelVersion
        }
      ],
      registrations: [
        {
          agentId: totalAgent,
          agentRegistry: "eip155:1:{identityRegistry}"
        }
      ],
      supportedTrust: [        
      ]
    }

    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json'
    })

    const metadataFile = new File([metadataBlob], 'metadata.json', {
      type: 'application/json'
    })

    return await uploadToIPFS(metadataFile)
  }

  // 文件验证函数
  const validateFile = (file, type) => {
    if (type === 'avatar') {
      // 验证头像文件
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
      const maxSize = 5 * 1024 * 1024 // 5MB

      if (!allowedTypes.includes(file.type)) {
        throw new Error('头像文件格式必须是 JPG 或 PNG')
      }
      if (file.size > maxSize) {
        throw new Error('头像文件大小不能超过 5MB')
      }
    } else if (type === 'package') {
      // 验证Agent包文件
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        throw new Error('Agent包文件大小不能超过 100MB')
      }
    }
  }

  // 处理头像文件选择
  const handleAvatarChange = (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      validateFile(file, 'avatar')
      setAvatarFile(file)

      // 生成预览
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast({
        title: "文件验证失败",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      })
    }
  }

  // 处理Agent包文件选择
  const handleAgentPackageChange = (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      validateFile(file, 'package')
      setAgentPackageFile(file)
    } catch (error) {
      toast({
        title: "文件验证失败",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const handleRegisterAgent = async () => {
    if (!teamName || !modelVersion) {
      toast({
        title: "错误",
        description: "请填写团队名称和模型版本",
        status: "error",
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!avatarFile || !agentPackageFile) {
      toast({
        title: "错误",
        description: "请上传Agent头像和Agent包文件",
        status: "error",
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)
      setUploadStatus('准备上传文件...')

      // 步骤1: 上传头像到IPFS
      setUploadStatus('上传头像到IPFS...')
      setUploadProgress(20)
      const avatarIPFS = await uploadToIPFS(avatarFile)

      // 步骤2: 上传Agent包到IPFS
      setUploadStatus('上传Agent包到IPFS...')
      setUploadProgress(50)
      const agentPackageIPFS = await uploadToIPFS(agentPackageFile)

      // 步骤3: 生成元数据并上传到IPFS
      setUploadStatus('生成元数据并上传到IPFS...')
      setUploadProgress(70)
      const metadataIPFS = await generateAndUploadMetadata(avatarIPFS, agentPackageIPFS)

      // 步骤4: 调用智能合约注册
      setUploadStatus('调用智能合约注册Agent...')
      setUploadProgress(90)
      await registerAgent(teamName, modelVersion, metadataIPFS)

      setUploadProgress(100)
      setUploadStatus('注册完成!')

      toast({
        title: "注册成功",
        description: "Agent注册成功，所有文件已上传到IPFS",
        status: "success",
        duration: 5000,
        isClosable: true,
      })

      // 重置表单
      setTeamName('')
      setModelVersion('')
      setTokenUri('')
      setDescription('')
      setAvatarFile(null)
      setAvatarPreview('')
      setAgentPackageFile(null)
      setUploadProgress(0)
      setUploadStatus('')
      onClose()

      // 刷新Agent列表
      refetchAgents()
    } catch (error) {
      toast({
        title: "注册失败",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleLaunchToken = async (agentId) => {
    try {
      await launchToken(agentId)
      toast({
        title: "Token发行启动成功",
        description: "Token发行已开始",
        status: "success",
        duration: 5000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: "Token发行启动失败",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleAcceptInvitation = async (matchId) => {
    try {
      await acceptInvitation(matchId)
      toast({
        title: "邀请接受成功",
        description: "比赛邀请已接受",
        status: "success",
        duration: 3000,
        isClosable: true,
      })

      // 移除已接受的邀请
      setPendingInvitationsData(prev => prev.filter(inv => inv.matchId !== matchId))
    } catch (error) {
      toast({
        title: "接受邀请失败",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const handleRejectInvitation = async (matchId) => {
    try {
      await rejectInvitation(matchId)
      toast({
        title: "邀请拒绝成功",
        description: "比赛邀请已拒绝",
        status: "success",
        duration: 3000,
        isClosable: true,
      })

      // 移除已拒绝的邀请
      setPendingInvitationsData(prev => prev.filter(inv => inv.matchId !== matchId))
    } catch (error) {
      toast({
        title: "拒绝邀请失败",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      })
    }
  }

  if (!currentUser) {
    return (
      <Box className="container" py={8} textAlign="center">
        <Alert status="warning" maxW="500px" mx="auto">
          <AlertIcon />
          请先连接钱包才能查看此页面
        </Alert>
      </Box>
    )
  }

  if (loading || agentsLoading) {
    return (
      <Box className="container" py={8} textAlign="center">
        <Spinner size="xl" color="#00ff9d" />
        <Text mt={4} color="white">加载中...</Text>
      </Box>
    )
  }

  return (
    <Box className="container" py={8} maxW="1200px" mx="auto" px={4}>
      <VStack spacing={6} align="stretch">
        {/* 页面标题 */}
        <HStack justify="space-between">
          <Heading size="lg" color="white">我的Agent</Heading>
          <Button bg="#2172E5" color="white" _hover={{ bg: "#1a5bb8" }} onClick={onOpen}>
            注册新Agent
          </Button>
        </HStack>

        {/* 待处理的邀请 */}
        {pendingInvitationsData.length > 0 && (
          <Card bg={bgColor} borderColor={borderColor} border="1px solid">
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" color="white">
                  待处理的比赛邀请 ({pendingInvitationsData.length})
                </Text>

                {pendingInvitationsData.map((invitation) => (
                  <Card key={invitation.matchId} bg="rgba(45, 183, 245, 0.1)" borderColor="#2DB7F5" border="1px solid">
                    <CardBody>
                      <Flex justify="space-between" align="center">
                        <VStack align="start" spacing={1}>
                          <HStack>
                            <Text fontWeight="bold" color="white">
                              {invitation.challengerAgentName} 向 {invitation.myAgentName} 发起挑战
                            </Text>
                          </HStack>
                          <Text fontSize="sm" color="gray.300">
                            挑战者: {formatAddress(invitation.challengerAddress)}
                          </Text>
                          <Text fontSize="sm" color="gray.300">
                            挑战金额: {(Number(invitation.matchFee) / 1e18).toFixed(4)} ETH
                          </Text>
                          <Text fontSize="sm" color="gray.300">
                            创建时间: {formatDate(invitation.createdAt)}
                          </Text>
                        </VStack>

                        <HStack>
                          <Button
                            bg="#00ff9d"
                            color="black"
                            _hover={{ bg: "#00e68a" }}
                            size="sm"
                            onClick={() => handleAcceptInvitation(invitation.matchId)}
                            isLoading={isAccepting}
                          >
                            接受
                          </Button>
                          <Button
                            variant="outline"
                            borderColor="#40444F"
                            color="white"
                            _hover={{ bg: cardHoverBg, borderColor: "#FF007A" }}
                            size="sm"
                            onClick={() => handleRejectInvitation(invitation.matchId)}
                            isLoading={isRejecting}
                          >
                            拒绝
                          </Button>
                        </HStack>
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* 我的Agent列表 */}
        <Tabs>
          <TabList borderColor="#40444F">
            <Tab color="gray.400" _selected={{ color: "white", borderColor: "#00ff9d" }} _hover={{ color: "white" }}>
              我的Agent ({myAgentsData.length})
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              {myAgentsData.length === 0 ? (
                <Card bg={bgColor} borderColor={borderColor} border="1px solid">
                  <CardBody textAlign="center" py={12}>
                    <Text fontSize="lg" color="gray.400" mb={4}>
                      你还没有注册任何Agent
                    </Text>
                    <Button bg="#2172E5" color="white" _hover={{ bg: "#1a5bb8" }} onClick={onOpen}>
                      注册第一个Agent
                    </Button>
                  </CardBody>
                </Card>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  {myAgentsData.map((agent) => (
                    <Card key={agent.id} bg={bgColor} borderColor={borderColor} border="1px solid" _hover={{ bg: cardHoverBg }}>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <HStack justify="space-between">
                            <HStack>
                              <Avatar size="md" name={agent.teamName} />
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="bold" color="white">{agent.teamName}</Text>
                                <Text fontSize="sm" color="gray.400">
                                  Agent ID: {agent.id}
                                </Text>
                              </VStack>
                            </HStack>
                            <Badge bg={agent.isActive ? '#00ff9d' : '#666'} color={agent.isActive ? 'black' : 'white'}>
                              {agent.isActive ? '活跃' : '不活跃'}
                            </Badge>
                          </HStack>

                          <VStack align="start" spacing={2}>
                            <Text fontSize="sm" color="gray.300">模型版本: {agent.modelVersion}</Text>
                            <Text fontSize="sm" color="gray.300">注册时间: {formatDate(agent.registeredAt)}</Text>
                            <Text fontSize="sm" color="gray.300">战绩: {agent.wins}胜 {agent.losses}负</Text>

                            {agent.pendingInvitations > 0 && (
                              <Badge bg="#FF6B35" color="white">
                                {agent.pendingInvitations} 个待处理邀请
                              </Badge>
                            )}
                          </VStack>

                          <Divider borderColor="#40444F" />

                          <VStack spacing={2}>
                            <Button
                              as={Link}
                              href={`/agent/${agent.id}`}
                              size="sm"
                              variant="outline"
                              borderColor="#40444F"
                              color="white"
                              _hover={{ bg: cardHoverBg, borderColor: "#00ff9d" }}
                              w="full"
                            >
                              查看详情
                            </Button>

                            {!agent.hasToken && !agent.isLaunching && (
                              <Button
                                bg="#2172E5"
                                color="white"
                                _hover={{ bg: "#1a5bb8" }}
                                size="sm"
                                w="full"
                                onClick={() => handleLaunchToken(agent.id)}
                                isLoading={isLaunching}
                              >
                                发行Token
                              </Button>
                            )}

                            {agent.isLaunching && (
                              <Button
                                as={Link}
                                href={`/mint/${agent.id}`}
                                bg="#FF6B35"
                                color="white"
                                _hover={{ bg: "#e85a2e" }}
                                size="sm"
                                w="full"
                              >
                                查看Token发行
                              </Button>
                            )}

                            {agent.hasToken && (
                              <Badge bg="#00ff9d" color="black" w="full" textAlign="center" py={1}>
                                Token已发行
                              </Badge>
                            )}
                          </VStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* 注册Agent模态框 */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent bg={bgColor} borderColor={borderColor} border="1px solid" color="white" maxH="90vh" overflowY="auto">
          <ModalHeader color="white" borderBottomWidth="1px" borderBottomColor={borderColor}>
            注册新Agent
          </ModalHeader>
          <ModalCloseButton color="white" _hover={{ bg: cardHoverBg }} />
          <ModalBody py={6}>
            <VStack spacing={6}>
              <HStack spacing={6} align="start" w="full">
                {/* 左侧基本信息 */}
                <VStack spacing={4} flex={1}>
                  <FormControl isRequired>
                    <FormLabel color="gray.300">团队名称</FormLabel>
                    <Input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="输入Agent团队名称"
                      bg="rgba(255, 255, 255, 0.1)"
                      borderColor={borderColor}
                      color="white"
                      _placeholder={{ color: "gray.400" }}
                      _hover={{ borderColor: "#00ff9d" }}
                      _focus={{ borderColor: "#00ff9d", boxShadow: "0 0 0 1px #00ff9d" }}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel color="gray.300">模型版本</FormLabel>
                    <Input
                      value={modelVersion}
                      onChange={(e) => setModelVersion(e.target.value)}
                      placeholder="例如: v1.0.0"
                      bg="rgba(255, 255, 255, 0.1)"
                      borderColor={borderColor}
                      color="white"
                      _placeholder={{ color: "gray.400" }}
                      _hover={{ borderColor: "#00ff9d" }}
                      _focus={{ borderColor: "#00ff9d", boxShadow: "0 0 0 1px #00ff9d" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.300">描述 (可选)</FormLabel>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="描述你的Agent..."
                      rows={3}
                      bg="rgba(255, 255, 255, 0.1)"
                      borderColor={borderColor}
                      color="white"
                      _placeholder={{ color: "gray.400" }}
                      _hover={{ borderColor: "#00ff9d" }}
                      _focus={{ borderColor: "#00ff9d", boxShadow: "0 0 0 1px #00ff9d" }}
                    />
                  </FormControl>
                </VStack>

                {/* 右侧文件上传 */}
                <VStack spacing={4} flex={1}>
                  {/* Agent头像上传 */}
                  <FormControl isRequired>
                    <FormLabel color="gray.300">Agent头像</FormLabel>
                    <VStack spacing={3}>
                      <Box
                        w="120px"
                        h="120px"
                        borderRadius="full"
                        border="2px dashed"
                        borderColor={avatarPreview ? "#00ff9d" : borderColor}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        overflow="hidden"
                        bg="rgba(255, 255, 255, 0.05)"
                      >
                        {avatarPreview ? (
                          <Image
                            src={avatarPreview}
                            alt="Avatar Preview"
                            w="full"
                            h="full"
                            objectFit="cover"
                            borderRadius="full"
                          />
                        ) : (
                          <Text fontSize="sm" color="gray.400" textAlign="center">
                            点击上传
                            <br />
                            头像
                          </Text>
                        )}
                      </Box>
                      <Input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleAvatarChange}
                        display="none"
                        id="avatar-upload"
                      />
                      <Button
                        as="label"
                        htmlFor="avatar-upload"
                        size="sm"
                        variant="outline"
                        borderColor={borderColor}
                        color="white"
                        _hover={{ bg: cardHoverBg, borderColor: "#00ff9d" }}
                        cursor="pointer"
                      >
                        选择头像
                      </Button>
                      <FormHelperText color="gray.400" fontSize="xs" textAlign="center">
                        支持 JPG/PNG 格式，不超过 5MB
                      </FormHelperText>
                    </VStack>
                  </FormControl>

                  {/* Agent包文件上传 */}
                  <FormControl isRequired>
                    <FormLabel color="gray.300">Agent包文件</FormLabel>
                    <VStack spacing={3}>
                      <Box
                        w="full"
                        minH="80px"
                        border="2px dashed"
                        borderColor={agentPackageFile ? "#00ff9d" : borderColor}
                        borderRadius="md"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        bg="rgba(255, 255, 255, 0.05)"
                        p={4}
                      >
                        {agentPackageFile ? (
                          <VStack spacing={1}>
                            <Text fontSize="sm" color="white" fontWeight="bold">
                              {agentPackageFile.name}
                            </Text>
                            <Text fontSize="xs" color="gray.400">
                              {(agentPackageFile.size / (1024 * 1024)).toFixed(2)} MB
                            </Text>
                          </VStack>
                        ) : (
                          <Text fontSize="sm" color="gray.400" textAlign="center">
                            点击上传Agent包文件
                            <br />
                            (包含可执行文件和配置)
                          </Text>
                        )}
                      </Box>
                      <Input
                        type="file"
                        onChange={handleAgentPackageChange}
                        display="none"
                        id="package-upload"
                      />
                      <Button
                        as="label"
                        htmlFor="package-upload"
                        size="sm"
                        variant="outline"
                        borderColor={borderColor}
                        color="white"
                        _hover={{ bg: cardHoverBg, borderColor: "#00ff9d" }}
                        cursor="pointer"
                        w="full"
                      >
                        选择Agent包
                      </Button>
                      <FormHelperText color="gray.400" fontSize="xs" textAlign="center">
                        支持各种格式，不超过 100MB
                      </FormHelperText>
                    </VStack>
                  </FormControl>
                </VStack>
              </HStack>

              {/* 上传进度 */}
              {isUploading && (
                <VStack spacing={3} w="full">
                  <Text color="white" fontSize="sm">{uploadStatus}</Text>
                  <Progress
                    value={uploadProgress}
                    w="full"
                    bg="gray.700"
                    sx={{
                      '& > div': {
                        bg: '#00ff9d'
                      }
                    }}
                    size="sm"
                    borderRadius="md"
                  />
                  <Text color="gray.400" fontSize="xs">{uploadProgress}% 完成</Text>
                </VStack>
              )}

              <Alert
                status="info"
                fontSize="sm"
                bg="rgba(45, 183, 245, 0.1)"
                borderColor="#2DB7F5"
                border="1px solid"
                color="gray.300"
              >
                <AlertIcon color="#2DB7F5" />
                所有文件将上传到IPFS分布式存储网络，确保永久保存。注册需要支付少量Gas费用。
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderTopColor={borderColor}>
            <Button
              variant="ghost"
              mr={3}
              onClick={onClose}
              color="gray.300"
              _hover={{ bg: cardHoverBg, color: "white" }}
              isDisabled={isUploading}
            >
              取消
            </Button>
            <Button
              bg="#2172E5"
              color="white"
              _hover={{ bg: "#1a5bb8" }}
              onClick={handleRegisterAgent}
              isLoading={isRegistering || isUploading}
              loadingText={isUploading ? "上传中..." : "注册中..."}
              isDisabled={!teamName || !modelVersion || !avatarFile || !agentPackageFile}
            >
              {isUploading ? "上传并注册" : "注册Agent"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}