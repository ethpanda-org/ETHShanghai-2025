'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Shield, 
  Key, 
  Link as LinkIcon,
  ExternalLink,
  RefreshCw,
  Users,
  TrendingUp,
  FileCheck,
  Wallet
} from 'lucide-react'
import { VCStorageService } from '@/lib/services/vc-storage-service'
import { TransactionHistory } from '@/components/dashboard/transaction-history'

interface DashboardState {
  isLoading: boolean
  error: string | null
  vcStatus: {
    hasVC: boolean
    isValid: boolean
    isExpired: boolean
    createdAt?: number
    lastUsed?: number
    usageCount?: number
    expiresAt?: number
    vcId?: string
    provider?: string
  }
  onChainStatus: {
    isRegistered: boolean
    txHash?: string
    blockNumber?: string
    registeredAt?: number
    commitment?: string
    nullifierHash?: string
    provider?: string
    expiresAt?: number
    isActive?: boolean
    isRevoked?: boolean
    error?: string
    message?: string
  }
  platformCompliance: {
    [platform: string]: {
      isCompliant: boolean
      lastChecked: number
      reason?: string
      error?: string
      details?: {
        ageCheck?: { required: number; actual: number; passed: boolean }
        assetsCheck?: { required: number; actual: number; passed: boolean }
        nationalityCheck?: { actual: string; allowed: string[]; passed: boolean }
        kycLevelCheck?: { actual: string; passed: boolean }
        vcExpiryCheck?: { expiresAt: string; passed: boolean }
        hasVC?: boolean
        vcStatus?: string
      }
      vcInfo?: {
        provider: string
        issuedAt: string
        expiresAt: string
        usageCount: number
      }
    }
  }
}

const SUPPORTED_PLATFORMS = [
  { name: 'RealT', description: '房地产代币化平台', minAge: 18, minAssets: 10000 },
  { name: 'PropertyFy', description: '房产投资平台', minAge: 21, minAssets: 50000 },
  { name: 'RealestateIO', description: '房地产 DeFi 平台', minAge: 18, minAssets: 1000 }
]

export default function DashboardPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  
  const [state, setState] = useState<DashboardState>({
    isLoading: true,
    error: null,
    vcStatus: {
      hasVC: false,
      isValid: false,
      isExpired: false
    },
    onChainStatus: {
      isRegistered: false
    },
    platformCompliance: {}
  })

  // 页面加载时检查状态
  useEffect(() => {
    if (isConnected && address) {
      loadDashboardData()
    } else {
      router.push('/rwa-platform/register')
    }
  }, [isConnected, address])

  const loadDashboardData = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 1. 检查 VC 状态
      const vcStorageService = new VCStorageService()
      const vcStatus = vcStorageService.checkVCStatus(address!)

      // 2. 检查链上状态（模拟）
      const onChainStatus = await checkOnChainStatus()

      // 3. 检查平台合规状态
      const platformCompliance = await checkPlatformCompliance()

      setState(prev => ({
        ...prev,
        isLoading: false,
        vcStatus,
        onChainStatus,
        platformCompliance
      }))

      console.log('📊 仪表板数据加载完成:', {
        vcStatus,
        onChainStatus,
        platformCompliance
      })
    } catch (error: any) {
      console.error('❌ 仪表板数据加载失败:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || '数据加载失败'
      }))
    }
  }

  const checkOnChainStatus = async (): Promise<any> => {
    try {
      console.log('🔍 检查链上身份状态...')
      
      // 动态导入以避免SSR问题
      const { ethers } = await import('ethers')
      const { createZKRWARegistryContract } = await import('@/lib/contracts/zkrwa-registry-ethers')
      
      // 检查是否有window.ethereum
      if (!window.ethereum) {
        console.log('⚠️ 未检测到MetaMask')
        return { 
          isRegistered: false, 
          message: '未检测到Web3钱包' 
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const registry = await createZKRWARegistryContract(provider, undefined, 11155111)
      
      console.log('📡 查询用户身份状态:', address)
      const hasValidIdentity = await registry.hasValidIdentity(address!)
      
      if (hasValidIdentity) {
        console.log('✅ 找到链上身份记录')
        
        // 查询注册交易信息
        let txHash = '已注册'
        let blockNumber = '-'
        
        try {
          const events = await registry.getRegistrationEvents(address!, -10000)
          
          if (events.length > 0) {
            const latestEvent = events[events.length - 1]
            txHash = latestEvent.transactionHash
            blockNumber = latestEvent.blockNumber?.toString()
            console.log('📜 找到注册事件:', { txHash, blockNumber })
          }
        } catch (eventError) {
          console.warn('⚠️ 查询注册事件失败:', eventError)
        }
        
        return {
          isRegistered: true,
          txHash,
          blockNumber,
          message: '身份已注册',
          isActive: true
        }
      } else {
        console.log('❌ 未找到链上身份记录')
        return { 
          isRegistered: false,
          message: '未在链上找到身份记录'
        }
      }
      
    } catch (error: any) {
      console.error('❌ 检查链上状态失败:', error)
      return { 
        isRegistered: false, 
        message: '查询链上状态失败：' + (error.message || '未知错误')
      }
    }
  }

  const checkPlatformCompliance = async (): Promise<any> => {
    const compliance: any = {}
    
    console.log('🔍 检查平台合规状态...')
    
    try {
      // 获取用户的真实VC数据
      const vcStorageService = new VCStorageService()
      const userVCData = vcStorageService.getVCStorage(address!)
      
      if (!userVCData?.vc) {
        console.log('❌ 未找到VC数据，所有平台都不合规')
        // 没有VC数据，所有平台都不合规
        for (const platform of SUPPORTED_PLATFORMS) {
          compliance[platform.name] = {
            isCompliant: false,
            lastChecked: Date.now(),
            reason: '未找到身份验证凭证',
            details: {
              hasVC: false,
              vcStatus: '未验证'
            }
          }
        }
        return compliance
      }
      
      const vcData = userVCData.vc.credentialSubject
      console.log('📋 基于VC数据检查合规性:', {
        age: vcData.age,
        nationality: vcData.nationality,
        netWorth: vcData.netWorth,
        kycLevel: vcData.kycLevel
      })
      
      for (const platform of SUPPORTED_PLATFORMS) {
        // 基于真实VC数据检查合规性
        const ageCompliant = vcData.age >= platform.minAge
        const assetsCompliant = (vcData.netWorth || 0) >= platform.minAssets
        
        // 检查国家合规性（这里可以根据平台要求调整）
        const allowedCountries = ['CN', 'US', 'UK', 'DE', 'FR', 'JP', 'SG'] // 支持的国家列表
        const nationalityCompliant = allowedCountries.includes(vcData.nationality || '')
        
        // 检查KYC等级
        const kycLevelCompliant = vcData.kycLevel === 'basic' || vcData.kycLevel === 'advanced'
        
        // 检查VC是否过期
        const vcNotExpired = userVCData.expiresAt > Date.now()
        
        const isCompliant = ageCompliant && assetsCompliant && nationalityCompliant && kycLevelCompliant && vcNotExpired
        
        compliance[platform.name] = {
          isCompliant,
          lastChecked: Date.now(),
          details: {
            ageCheck: { 
              required: platform.minAge, 
              actual: vcData.age, 
              passed: ageCompliant 
            },
            assetsCheck: { 
              required: platform.minAssets, 
              actual: vcData.netWorth, 
              passed: assetsCompliant 
            },
            nationalityCheck: { 
              actual: vcData.nationality,
              allowed: allowedCountries,
              passed: nationalityCompliant 
            },
            kycLevelCheck: {
              actual: vcData.kycLevel,
              passed: kycLevelCompliant
            },
            vcExpiryCheck: {
              expiresAt: new Date(userVCData.expiresAt).toISOString(),
              passed: vcNotExpired
            }
          },
          vcInfo: {
            provider: vcData.verificationMethod,
            issuedAt: new Date(userVCData.createdAt).toISOString(),
            expiresAt: new Date(userVCData.expiresAt).toISOString(),
            usageCount: userVCData.usageCount
          }
        }
        
        console.log(`🏢 ${platform.name} 合规检查:`, {
          isCompliant,
          ageCheck: ageCompliant,
          assetsCheck: assetsCompliant,
          nationalityCheck: nationalityCompliant,
          kycLevelCheck: kycLevelCompliant,
          vcNotExpired
        })
      }
      
      return compliance
      
    } catch (error: any) {
      console.error('❌ 平台合规检查失败:', error)
      
      // 发生错误时，标记所有平台为不合规
      for (const platform of SUPPORTED_PLATFORMS) {
        compliance[platform.name] = {
          isCompliant: false,
          lastChecked: Date.now(),
          error: error.message || '合规检查失败',
          reason: '系统错误，无法验证合规性'
        }
      }
      
      return compliance
    }
  }

  const refreshData = () => {
    loadDashboardData()
  }

  const goToVerification = () => {
    router.push('/rwa-platform/register')
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    const hours = Math.floor(diff / (60 * 60 * 1000))
    const minutes = Math.floor(diff / (60 * 1000))

    if (days > 0) return `${days} 天前`
    if (hours > 0) return `${hours} 小时前`
    if (minutes > 0) return `${minutes} 分钟前`
    return '刚刚'
  }

  if (!isConnected) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">请连接钱包</h2>
          <p className="text-gray-600 mb-4">
            请连接您的钱包以查看身份验证状态
          </p>
          <Button onClick={() => router.push('/rwa-platform/register')}>
            前往链上注册
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">身份验证仪表板</h1>
          <p className="text-gray-600">
            查看您的身份验证状态和平台合规情况
          </p>
        </div>
        <Button onClick={refreshData} disabled={state.isLoading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${state.isLoading ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* 错误提示 */}
      {state.error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {state.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：身份验证状态 */}
        <div className="lg:col-span-2 space-y-6">
          {/* VC 状态卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                身份凭证状态
              </CardTitle>
              <CardDescription>
                您的 W3C 可验证凭证信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              {state.vcStatus.hasVC ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {state.vcStatus.isValid && !state.vcStatus.isExpired ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          有效
                        </Badge>
                      </>
                    ) : state.vcStatus.isExpired ? (
                      <>
                        <Clock className="w-5 h-5 text-orange-500" />
                        <Badge variant="destructive">
                          已过期
                        </Badge>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <Badge variant="destructive">
                          无效
                        </Badge>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">凭证ID</div>
                      <div className="font-mono">
                        {state.vcStatus.vcId?.substring(0, 20)}...
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">使用次数</div>
                      <div>{state.vcStatus.usageCount || 0} 次</div>
                    </div>
                    <div>
                      <div className="text-gray-500">创建时间</div>
                      <div>
                        {state.vcStatus.createdAt 
                          ? formatDate(state.vcStatus.createdAt)
                          : '未知'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">过期时间</div>
                      <div>
                        {state.vcStatus.expiresAt 
                          ? formatDate(state.vcStatus.expiresAt)
                          : '未知'
                        }
                      </div>
                    </div>
                  </div>

                  {state.vcStatus.isExpired && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-700">
                        您的身份凭证已过期，请重新进行身份验证。
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-medium mb-2">未找到身份凭证</h3>
                  <p className="text-gray-600 mb-4">
                    您还没有完成身份验证，请先进行 KYC 验证。
                  </p>
                  <Button onClick={goToVerification}>
                    开始身份验证
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 链上状态卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                链上注册状态
              </CardTitle>
              <CardDescription>
                您的身份在区块链上的注册情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              {state.onChainStatus.isRegistered ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      已注册
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">交易哈希</div>
                      <div className="font-mono flex items-center gap-2">
                        {state.onChainStatus.txHash?.substring(0, 20)}...
                        <a
                          href={`https://sepolia.etherscan.io/tx/${state.onChainStatus.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                          title="在 Etherscan 上查看交易"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">区块号</div>
                      <div>{state.onChainStatus.blockNumber}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">注册时间</div>
                      <div>
                        {state.onChainStatus.registeredAt 
                          ? formatRelativeTime(state.onChainStatus.registeredAt)
                          : '未知'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-medium mb-2">未注册到区块链</h3>
                  <p className="text-gray-600 mb-4">
                    您的身份还没有注册到区块链上。
                  </p>
                  <Button onClick={goToVerification} variant="outline">
                    完成注册
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：平台合规状态 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                平台合规状态
              </CardTitle>
              <CardDescription>
                您在各 RWA 平台的合规情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {SUPPORTED_PLATFORMS.map((platform) => {
                  const compliance = state.platformCompliance[platform.name]
                  const isCompliant = compliance?.isCompliant || false

                  return (
                    <div key={platform.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{platform.name}</h4>
                        {isCompliant ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            合规
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            不合规
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {platform.description}
                      </p>

                      <div className="text-xs text-gray-500 space-y-1">
                        <div>最小年龄: {platform.minAge} 岁</div>
                        <div>最小资产: ${platform.minAssets.toLocaleString()}</div>
                        {compliance && (
                          <div>
                            检查时间: {formatRelativeTime(compliance.lastChecked)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                快速操作
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={goToVerification} 
                  className="w-full"
                  variant="outline"
                >
                  重新验证身份
                </Button>
                
                <Button 
                  onClick={refreshData} 
                  disabled={state.isLoading}
                  className="w-full"
                  variant="outline"
                >
                  刷新合规状态
                </Button>

                <Button 
                  onClick={() => router.push('/rwa-platforms')} 
                  className="w-full"
                  variant="outline"
                >
                  浏览 RWA 平台
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 交易历史 */}
      {address && (
        <div className="mt-8">
          <TransactionHistory userAddress={address} />
        </div>
      )}
    </div>
  )
}



