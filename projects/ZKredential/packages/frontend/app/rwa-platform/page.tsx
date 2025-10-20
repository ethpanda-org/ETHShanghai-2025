'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Shield, 
  ArrowRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { VerificationStatusService } from '@/lib/services/verification-status-service'
import { UserVerificationStatus } from '@/lib/types/verification-status'

// RWA平台数据（演示用）
const RWA_PLATFORMS = [
  {
    id: 'propertyfy',
    name: 'PropertyFy',
    description: '高端房产投资平台',
    logo: '🏢',
    minAge: 21,
    minAssets: 50000,
  },
  {
    id: 'realt',
    name: 'RealT',
    description: '房地产代币化平台',
    logo: '🏠',
    minAge: 18,
    minAssets: 10000,
  },
  {
    id: 'realestateio',
    name: 'RealestateIO',
    description: '房地产 DeFi 平台',
    logo: '🌆',
    minAge: 18,
    minAssets: 1000,
  }
]

export default function RWAPlatformPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [verificationStatus, setVerificationStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusService] = useState(() => new VerificationStatusService())

  // 检查用户验证状态
  useEffect(() => {
    const checkStatus = async () => {
      if (!address) {
        setVerificationStatus({ status: UserVerificationStatus.NOT_CONNECTED })
        setIsLoading(false)
        return
      }

      try {
        const status = await statusService.checkCompleteVerificationStatus(address)
        setVerificationStatus(status)
      } catch (error) {
        console.error('检查验证状态失败:', error)
        setVerificationStatus({ status: UserVerificationStatus.NOT_VERIFIED })
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()
  }, [address, isConnected])

  const handlePlatformAccess = (platform: any) => {
    if (!isConnected) {
      router.push('/rwa-platform/register')
      return
    }

    if (verificationStatus?.status !== UserVerificationStatus.VERIFIED_VALID) {
      router.push('/rwa-platform/register')
      return
    }

    router.push(`/rwa-platform/marketplace?platform=${platform.id}`)
  }

  const isVerified = verificationStatus?.status === UserVerificationStatus.VERIFIED_VALID

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-12 max-w-6xl bg-transparent">
        {/* 标题 */}
        <div className="text-center mb-12">
          <div className="barca-badge-blue mb-4">
            <Shield className="w-4 h-4" />
            演示：基于 ZKredential 的 RWA 平台
          </div>
          
          <h1 className="text-4xl font-bold mb-4">
            <span className="barca-gradient-text">RWA 投资平台演示</span>
          </h1>
          
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            这是一个演示应用，展示如何使用 ZKredential 基础设施实现隐私保护的合规验证。
            一次验证，即可访问多个 RWA 平台。
          </p>

          {/* 用户状态 */}
          <div className="mt-6">
            {isLoading ? (
              <Badge variant="outline" className="text-base py-2 px-4">检查验证状态...</Badge>
            ) : isVerified ? (
              <div className="status-verified inline-flex">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">已验证 - 可访问所有平台</span>
              </div>
            ) : (
              <div className="status-pending inline-flex">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">需要完成身份验证</span>
              </div>
            )}
          </div>

          {/* 快速操作 */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button 
              onClick={() => router.push('/rwa-platform/marketplace')}
              className="btn-barca-primary px-6"
            >
              <Building2 className="w-4 h-4 mr-2" />
              浏览资产
            </Button>
            
            {!isVerified && (
              <Button 
                onClick={() => router.push('/rwa-platform/register')}
                className="btn-barca-gold px-6"
              >
                <Shield className="w-4 h-4 mr-2" />
                完成验证
              </Button>
            )}
            
            {isVerified && (
              <Button 
                onClick={() => router.push('/rwa-platform/create-asset')}
                className="btn-barca-secondary px-6"
              >
                创建资产
              </Button>
            )}
          </div>
        </div>

        {/* 平台列表 */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-8 text-center">
            <span className="barca-gradient-text">支持的 RWA 平台</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {RWA_PLATFORMS.map((platform) => (
              <Card key={platform.id} className="barca-card barca-card-glow group">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-4xl">{platform.logo}</div>
                    <div>
                      <CardTitle className="text-xl">{platform.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{platform.description}</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* 投资要求 */}
                  <div className="bg-[#004e98]/5 border border-[#004e98]/20 rounded-lg p-4">
                    <div className="font-semibold mb-2 text-[#004e98]">投资要求</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>• 最小年龄: {platform.minAge} 岁</div>
                      <div>• 最小资产: ${platform.minAssets.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <Button 
                    onClick={() => handlePlatformAccess(platform)}
                    className={`w-full ${isVerified ? 'btn-barca-primary' : 'btn-barca-gold'}`}
                  >
                    {isVerified ? (
                      <>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        进入平台
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        需要验证
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 说明 */}
        <Card className="mt-8 border-[#eebd01]/30 bg-[#eebd01]/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">💡</span>
              <span className="barca-gradient-gold">演示说明</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• 这是一个演示应用，用于展示 ZKredential 合规基础设施的集成方式</p>
            <p>• 完成一次 ZK 验证后，可以访问所有支持的 RWA 平台</p>
            <p>• 实际的 RWA 项目可以参考这个实现来集成 ZK 合规功能</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
