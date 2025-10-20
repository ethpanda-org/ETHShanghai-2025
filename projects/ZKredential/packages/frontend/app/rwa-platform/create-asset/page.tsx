'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Building, 
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { RWAAssetService, AssetCreationParams } from '@/lib/services/rwa-asset-service'
import { VerificationStatusService } from '@/lib/services/verification-status-service'
import { UserVerificationStatus } from '@/lib/types/verification-status'
import { ethers } from 'ethers'

export default function CreateAssetPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [isCreating, setIsCreating] = useState(false)
  const [isCheckingIdentity, setIsCheckingIdentity] = useState(true)
  const [hasValidIdentity, setHasValidIdentity] = useState(false)
  const [result, setResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null)
  
  const [formData, setFormData] = useState<AssetCreationParams>({
    name: '',
    symbol: '',
    platform: 'PropertyFy',
    assetInfo: {
      name: '',
      location: '',
      totalValue: '',
      assetType: '商业地产',
      expectedReturn: 850,
      description: ''
    },
    tokenPrice: '0.1',
    maxSupply: '25000'
  })

  // 检查用户身份验证状态
  useEffect(() => {
    const checkIdentity = async () => {
      if (!isConnected || !address) {
        setIsCheckingIdentity(false)
        return
      }

      try {
        const statusService = new VerificationStatusService()
        const status = await statusService.checkCompleteVerificationStatus(address)
        setHasValidIdentity(status.status === UserVerificationStatus.VERIFIED_VALID)
      } catch (error) {
        console.error('检查身份验证状态失败:', error)
        setHasValidIdentity(false)
      } finally {
        setIsCheckingIdentity(false)
      }
    }

    checkIdentity()
  }, [isConnected, address])

  const handleInputChange = (field: string, value: string | number) => {
    if (field.startsWith('assetInfo.')) {
      const assetField = field.replace('assetInfo.', '')
      setFormData(prev => ({
        ...prev,
        assetInfo: {
          ...prev.assetInfo,
          [assetField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleCreateAsset = async () => {
    if (!isConnected || !address) {
      setResult({ success: false, error: '请先连接钱包' })
      return
    }

    if (!hasValidIdentity) {
      setResult({ success: false, error: '请先完成ZK-KYC身份验证' })
      return
    }

    if (!formData.name || !formData.assetInfo.name || !formData.assetInfo.totalValue) {
      setResult({ success: false, error: '请填写所有必填字段' })
      return
    }

    setIsCreating(true)
    setResult(null)

    try {
      if (!window.ethereum) {
        throw new Error('请安装MetaMask钱包')
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const rwaService = new RWAAssetService(provider, signer, 11155111)
      const result = await rwaService.createAsset(formData, address)
      
      setResult(result)
      
      if (result.success) {
        // 重置表单
        setFormData({
          name: '',
          symbol: '',
          platform: 'PropertyFy',
          assetInfo: {
            name: '',
            location: '',
            totalValue: '',
            assetType: '商业地产',
            expectedReturn: 850,
            description: ''
          },
          tokenPrice: '0.1',
          maxSupply: '25000'
        })
      }
    } catch (error: any) {
      console.error('创建资产失败:', error)
      setResult({ success: false, error: error.message })
    } finally {
      setIsCreating(false)
    }
  }

  // 加载中
  if (isCheckingIdentity) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-xl mx-auto text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>检查验证状态...</p>
        </div>
      </div>
    )
  }

  // 未连接钱包
  if (!isConnected) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-xl mx-auto text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">请连接钱包</h2>
          <Button onClick={() => router.push('/rwa-platform')}>返回平台</Button>
        </div>
      </div>
    )
  }

  // 未验证
  if (!hasValidIdentity) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-xl mx-auto text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">需要身份验证</h2>
          <p className="text-muted-foreground mb-6">创建RWA资产需要完成ZK-KYC验证</p>
          <div className="space-y-3">
            <Button onClick={() => router.push('/rwa-platform/register')}>前往验证</Button>
            <Button variant="outline" onClick={() => router.push('/rwa-platform')}>返回平台</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 页面头部 */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/rwa-platform/marketplace')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回市场
          </Button>
          
          <div className="text-center mb-6">
            <Building className="w-10 h-10 text-primary mx-auto mb-3" />
            <h1 className="text-3xl font-bold mb-2">创建 RWA 资产（演示）</h1>
            <p className="text-muted-foreground">将真实资产代币化</p>
            
            <Badge className="mt-3 bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              已通过 ZK-KYC 验证
            </Badge>
          </div>
        </div>

        {/* 表单 */}
        <Card>
          <CardHeader>
            <CardTitle>资产信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 代币信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">代币名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Manhattan Tower"
                />
              </div>
              <div>
                <Label htmlFor="symbol">代币符号 *</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                  placeholder="MT"
                  maxLength={10}
                />
              </div>
            </div>

            {/* 资产信息 */}
            <div>
              <Label htmlFor="assetName">资产名称 *</Label>
              <Input
                id="assetName"
                value={formData.assetInfo.name}
                onChange={(e) => handleInputChange('assetInfo.name', e.target.value)}
                placeholder="纽约曼哈顿商业大厦"
              />
            </div>

            <div>
              <Label htmlFor="location">位置</Label>
              <Input
                id="location"
                value={formData.assetInfo.location}
                onChange={(e) => handleInputChange('assetInfo.location', e.target.value)}
                placeholder="纽约, 美国"
              />
            </div>

            <div>
              <Label htmlFor="totalValue">总价值 (ETH) *</Label>
              <Input
                id="totalValue"
                type="number"
                step="0.1"
                value={formData.assetInfo.totalValue}
                onChange={(e) => handleInputChange('assetInfo.totalValue', e.target.value)}
                placeholder="2500"
              />
            </div>

            <div>
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.assetInfo.description}
                onChange={(e) => handleInputChange('assetInfo.description', e.target.value)}
                placeholder="资产描述..."
                rows={3}
              />
            </div>

            {/* 结果显示 */}
            {result && (
              <Alert className={result.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                <AlertDescription>
                  {result.success ? (
                    <div>
                      <p className="text-green-700 font-medium">✅ 资产创建成功！</p>
                      <div className="mt-2 space-x-2">
                        <Button 
                          size="sm"
                          onClick={() => router.push('/rwa-platform/marketplace')}
                        >
                          查看市场
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-red-700">❌ {result.error}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* 创建按钮 */}
            <Button 
              onClick={handleCreateAsset}
              disabled={!isConnected || isCreating}
              className="w-full"
              size="lg"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建资产'
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              💡 这是演示功能，用于展示 RWA 资产创建流程
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
