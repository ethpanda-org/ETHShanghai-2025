'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Building2, 
  MapPin, 
  TrendingUp, 
  DollarSign,
  Users,
  Calendar,
  Filter,
  Search,
  ArrowRight,
  Star,
  Shield,
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react'
import { VerificationStatusService } from '@/lib/services/verification-status-service'
import { UserVerificationStatus } from '@/lib/types/verification-status'
import { RWAAssetService, RWAAsset } from '@/lib/services/rwa-asset-service'
import { ethers } from 'ethers'

// 🚫 已移除所有假数据，现在只使用真实合约数据

export default function MarketplacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { address, isConnected } = useAccount()

  
  const [assets, setAssets] = useState<RWAAsset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<RWAAsset[]>([])
  const [verificationStatus, setVerificationStatus] = useState<any>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [statusService] = useState(() => new VerificationStatusService())
  const [rwaService, setRwaService] = useState<RWAAssetService | null>(null)
  
  // 筛选状态
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    riskLevel: 'all',
    platform: searchParams?.get('platform') || 'all',
    minReturn: '',
    maxPrice: ''
  })

  // 初始化RWA服务
  useEffect(() => {
    const initializeServices = async () => {
      if (window.ethereum && isConnected) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const signer = await provider.getSigner()
          const service = new RWAAssetService(provider, signer, 11155111)
          setRwaService(service)
        } catch (error) {
          console.error('初始化RWA服务失败:', error)
          // 使用只读模式
          const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL)
          const service = new RWAAssetService(provider, undefined, 11155111)
          setRwaService(service)
        }
      } else {
        // 使用只读模式
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL)
        const service = new RWAAssetService(provider, undefined, 11155111)
        setRwaService(service)
      }
    }

    initializeServices()
  }, [isConnected])

  // 检查用户验证状态
  useEffect(() => {
    const checkStatus = async () => {
      if (!address) {
        setVerificationStatus({ status: UserVerificationStatus.NOT_CONNECTED })
        setIsLoadingStatus(false)
        return
      }

      try {
        const status = await statusService.checkCompleteVerificationStatus(address)
        setVerificationStatus(status)
      } catch (error) {
        console.error('检查验证状态失败:', error)
        setVerificationStatus({ status: UserVerificationStatus.NOT_VERIFIED })
      } finally {
        setIsLoadingStatus(false)
      }
    }

    checkStatus()
  }, [address, isConnected])

  // 加载真实资产数据
  useEffect(() => {
    const loadAssets = async () => {
      if (!rwaService) return

      setIsLoadingAssets(true)
      try {
        console.log('🔄 加载真实RWA资产数据...')
        
        // 尝试从合约加载真实数据
        const realAssets = await rwaService.getDeployedAssets()
        
        console.log('✅ 加载到真实资产:', realAssets.length)
        console.log('📊 真实资产详情:', realAssets.map(asset => ({
          name: asset.name,
          address: asset.address,
          platform: asset.platform,
          isRealData: true
        })))
        
        setAssets(realAssets)
        
        // 如果没有真实资产，显示空状态而不是假数据
        if (realAssets.length === 0) {
          console.log('📭 暂无真实资产，显示空状态')
          console.log('🚫 不使用假数据，保持空状态')
        }
      } catch (error) {
        console.error('❌ 加载资产失败，显示空状态:', error)
        // 出错时显示空状态，不使用假数据
        setAssets([])
      } finally {
        setIsLoadingAssets(false)
      }
    }

    loadAssets()
  }, [rwaService])

  // 应用筛选
  useEffect(() => {
    let filtered = assets

    // 搜索筛选
    if (filters.search) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        asset.location.toLowerCase().includes(filters.search.toLowerCase()) ||
        asset.description.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    // 类型筛选
    if (filters.type !== 'all') {
      filtered = filtered.filter(asset => asset.assetType === filters.type)
    }

    // 风险等级筛选
    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter(asset => asset.riskLevel && asset.riskLevel === filters.riskLevel)
    }

    // 平台筛选 (不区分大小写)
    if (filters.platform !== 'all') {
      filtered = filtered.filter(asset => 
        asset.platform?.toLowerCase() === filters.platform.toLowerCase() ||
        asset.platform?.toLowerCase().includes(filters.platform.toLowerCase())
      )
      
      console.log('🔍 平台筛选调试:', {
        筛选平台: filters.platform,
        原始资产数: assets.length,
        筛选后数量: filtered.length,
        资产平台列表: assets.map(a => ({ name: a.name, platform: a.platform }))
      })
    }

    // 最小收益筛选
    if (filters.minReturn) {
      const minReturn = parseFloat(filters.minReturn)
      filtered = filtered.filter(asset => asset.expectedReturn >= minReturn)
    }

    // 最大价格筛选
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice)
      filtered = filtered.filter(asset => asset.tokenPrice <= maxPrice)
    }

    setFilteredAssets(filtered)
  }, [filters, assets])

  const handleInvest = (asset: RWAAsset, event?: React.MouseEvent) => {
    // 强化事件阻止机制
    if (event) {
      event.preventDefault()
      event.stopPropagation()
      event.nativeEvent?.preventDefault?.()
      event.nativeEvent?.stopImmediatePropagation?.()
    }
    
    console.log('🎯 投资按钮点击:', {
      assetId: asset.address,
      assetName: asset.name,
      verificationStatus: verificationStatus?.status,
      完整asset对象: asset
    })
    
    // 使用setTimeout确保事件处理完成后再跳转
    setTimeout(() => {
      if (verificationStatus?.status !== UserVerificationStatus.VERIFIED_VALID) {
        console.log('🔄 用户未验证，跳转到注册页面')
        router.push('/rwa-platform/register')
        return
      }
      
      const targetUrl = `/rwa-platform/invest/${asset.address}`
      console.log('✅ 跳转到投资页面:', {
        assetAddress: asset.address,
        targetUrl: targetUrl,
        currentUrl: window.location.href
      })
      router.push(targetUrl)
    }, 50) // 保留小延迟确保事件处理完成
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRiskText = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return '低风险'
      case 'medium': return '中风险'
      case 'high': return '高风险'
      default: return '未知'
    }
  }

  const getProgressPercentage = (circulatingSupply: number, totalSupply: number) => {
    return (circulatingSupply / totalSupply) * 100
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount)
  }

  const formatETH = (amount: number) => {
    return `${amount.toFixed(6)} ETH`
  }

  return (
    <div 
      className="min-h-screen bg-gray-50"
    >
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">RWA 资产市场</h1>
              <p className="text-gray-600 mt-2">
                发现优质房地产投资机会，使用ZK-KYC身份验证安全投资
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  📊 仅显示真实合约数据
                </Badge>
                <Badge variant="outline" className="text-xs">
                  🔗 链上资产: {assets.length}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  🔍 筛选后: {filteredAssets.length}
                </Badge>
                {filters.platform !== 'all' && (
                  <Badge variant="outline" className="text-xs text-blue-600">
                    📱 平台: {filters.platform}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-gray-300"
              >
                🔄 刷新数据
              </Button>
              <Button 
                onClick={() => setFilters(prev => ({ ...prev, platform: 'all' }))}
                variant="outline"
                className="border-blue-300 text-blue-600"
              >
                📋 显示所有资产
              </Button>
              {verificationStatus?.hasValidIdentity && (
                <Button 
                  onClick={() => router.push('/rwa-platform/create-asset')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  创建资产
                </Button>
              )}
            </div>
            
            {/* 验证状态 */}
            {!isLoadingStatus && (
              <div className="flex items-center gap-2">
                {verificationStatus?.status === UserVerificationStatus.VERIFIED_VALID ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Shield className="w-3 h-3 mr-1" />
                    已验证
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-600">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    需要验证
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 筛选器 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              筛选条件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 搜索 */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索资产..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>

              {/* 资产类型 */}
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="资产类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有类型</SelectItem>
                  <SelectItem value="商业地产">商业地产</SelectItem>
                  <SelectItem value="住宅地产">住宅地产</SelectItem>
                  <SelectItem value="工业地产">工业地产</SelectItem>
                  <SelectItem value="酒店地产">酒店地产</SelectItem>
                  <SelectItem value="零售地产">零售地产</SelectItem>
                </SelectContent>
              </Select>

              {/* 风险等级 */}
              <Select value={filters.riskLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="风险等级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有风险</SelectItem>
                  <SelectItem value="low">低风险</SelectItem>
                  <SelectItem value="medium">中风险</SelectItem>
                  <SelectItem value="high">高风险</SelectItem>
                </SelectContent>
              </Select>

              {/* 平台 */}
              <Select value={filters.platform} onValueChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="投资平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有平台</SelectItem>
                  <SelectItem value="propertyfy">PropertyFy</SelectItem>
                  <SelectItem value="realt">RealT</SelectItem>
                  <SelectItem value="realestateio">RealestateIO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 高级筛选 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                placeholder="最小年化收益率 (%)"
                value={filters.minReturn}
                onChange={(e) => setFilters(prev => ({ ...prev, minReturn: e.target.value }))}
                type="number"
              />
              <Input
                placeholder="最大代币价格 ($)"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                type="number"
              />
            </div>
          </CardContent>
        </Card>

        {/* 加载状态 */}
        {isLoadingAssets && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">加载资产数据中...</p>
            </div>
          </div>
        )}

        {/* 资产列表 */}
        {!isLoadingAssets && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => {
              const progressPercentage = getProgressPercentage(asset.circulatingSupply, asset.totalSupply)
            
            return (
              <Card 
                key={asset.address} 
                className="hover:shadow-lg transition-shadow"
                onClick={(e) => {
                  // 阻止Card的默认点击行为
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">🏢</div>
                      <div>
                        <CardTitle className="text-lg">{asset.name}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <MapPin className="w-3 h-3" />
                          {asset.location}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                            📊 真实合约数据
                          </Badge>
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                            🔗 {asset.address.substring(0, 8)}...
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {asset.assetType}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">代币价格</div>
                      <div className="font-semibold text-lg">{formatETH(asset.tokenPrice)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">预期收益</div>
                      <div className="font-semibold text-lg text-green-600">{asset.expectedReturn.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500">总价值</div>
                      <div className="font-semibold">{formatETH(asset.totalValue)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">平台</div>
                      <div className="font-semibold">{asset.platform}</div>
                    </div>
                  </div>

                  {/* 销售进度 */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>销售进度</span>
                      <span>{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {asset.circulatingSupply.toLocaleString()} / {asset.totalSupply.toLocaleString()} 代币已售
                    </div>
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-gray-600">{asset.description}</p>

                  {/* 统计信息 */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      已筹集: {formatETH(asset.totalRaised)}
                    </Badge>
                    {asset.totalDividends > 0 && (
                      <Badge variant="outline" className="text-xs">
                        已分红: {formatETH(asset.totalDividends)}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      可用: {asset.availableTokens.toLocaleString()} 代币
                    </Badge>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={(e) => handleInvest(asset, e)}
                      className="flex-1"
                      disabled={verificationStatus?.status !== UserVerificationStatus.VERIFIED_VALID}
                      type="button"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      {verificationStatus?.status === UserVerificationStatus.VERIFIED_VALID ? '立即投资' : '需要验证'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        router.push(`/rwa-platform/asset/${asset.address}`)
                      }}
                      type="button"
                    >
                      详情
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          </div>
        )}

        {/* 无结果提示 */}
        {filteredAssets.length === 0 && !isLoadingAssets && (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">未找到匹配的资产</h3>
              <p className="text-gray-600 mb-4">
                {assets.length === 0 
                  ? "暂无真实合约资产，请先创建资产" 
                  : "请尝试调整筛选条件或搜索关键词"
                }
              </p>
              
              {/* 调试信息 */}
              {assets.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                  <h4 className="font-semibold mb-2">🔍 调试信息:</h4>
                  <div className="text-sm space-y-1">
                    <p>总资产数: {assets.length}</p>
                    <p>当前筛选: 平台={filters.platform}</p>
                    <p>可用平台: {Array.from(new Set(assets.map(a => a.platform))).join(', ')}</p>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={() => setFilters({
                  search: '',
                  type: 'all',
                  riskLevel: 'all',
                  platform: 'all',
                  minReturn: '',
                  maxPrice: ''
                })}
                variant="outline"
              >
                清除筛选
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
