'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  MapPin, 
  TrendingUp, 
  DollarSign,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Calculator,
  Calendar,
  Users,
  Star,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { VerificationStatusService } from '@/lib/services/verification-status-service'
import { UserVerificationStatus } from '@/lib/types/verification-status'
import { RWAAssetService, RWAAsset } from '@/lib/services/rwa-asset-service'
import { ethers } from 'ethers'

// 模拟资产数据（实际应该从API获取）
const ASSET_DATA: { [key: string]: any } = {
  'property-001': {
    id: 'property-001',
    name: '纽约曼哈顿商业大厦',
    type: '商业地产',
    location: '纽约, 美国',
    price: 2500000,
    tokenPrice: 100,
    totalTokens: 25000,
    soldTokens: 18750,
    expectedReturn: '8.5%',
    riskLevel: 'medium',
    image: '🏢',
    description: '位于曼哈顿核心商业区的甲级写字楼，租户稳定，现金流优秀。',
    highlights: ['核心地段', '稳定租户', '升值潜力'],
    minInvestment: 1000,
    platform: 'PropertyFy',
    launchDate: '2024-01-15',
    occupancyRate: 95,
    yearBuilt: 2018,
    address: '0x1234567890123456789012345678901234567890', // 模拟合约地址
    details: {
      address: '123 Wall Street, New York, NY 10005',
      totalArea: '50,000 sq ft',
      floors: 25,
      parkingSpaces: 200,
      amenities: ['24/7 Security', 'Fitness Center', 'Conference Rooms', 'Rooftop Garden'],
      tenants: ['Goldman Sachs', 'JPMorgan Chase', 'Morgan Stanley', 'BlackRock'],
      monthlyRent: '$45,000',
      propertyManager: 'Manhattan Real Estate Group',
      lastAppraisal: '$2,650,000',
      appraisalDate: '2024-01-01'
    }
  },
  'sxxa': {
    id: 'sxxa',
    name: 'SXXA商业地产项目',
    type: 'Real Estate',
    location: 'Unknown',
    price: 0.0004, // 0.0004 ETH
    tokenPrice: 0.000001, // 0.000001 ETH per token
    totalTokens: 25000000000000000000, // 25 * 10^18 tokens (25 tokens with 18 decimals)
    soldTokens: 0,
    expectedReturn: '8.5%',
    riskLevel: 'medium',
    image: '🏢',
    description: 'SXXA商业地产投资项目，基于区块链的房地产代币化投资。',
    highlights: ['区块链技术', '代币化投资', '透明管理'],
    minInvestment: 0.0001, // 0.0001 ETH
    platform: 'PropertyFy',
    launchDate: '2024-01-15',
    occupancyRate: 0,
    yearBuilt: 2024,
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', // 模拟合约地址
    details: {
      address: 'Blockchain-based Real Estate',
      totalArea: 'Digital Asset',
      floors: 'N/A',
      parkingSpaces: 'N/A',
      amenities: ['Smart Contracts', 'Transparent Transactions', 'Global Access'],
      tenants: ['Digital Investors'],
      monthlyRent: 'Variable',
      propertyManager: 'Smart Contract',
      lastAppraisal: '0.0004 ETH',
      appraisalDate: '2024-01-01'
    }
  }
}

interface InvestmentState {
  step: number
  tokenAmount: number
  investmentAmount: number
  isProcessing: boolean
  error: string | null
  txHash: string | null
  complianceChecked: boolean
  complianceResult: any
}

export default function InvestPage() {
  const router = useRouter()
  const params = useParams()
  const { address, isConnected } = useAccount()
  const assetId = params?.assetId as string
  
  const [asset, setAsset] = useState<RWAAsset | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<any>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [statusService] = useState(() => new VerificationStatusService())
  const [rwaService, setRwaService] = useState<RWAAssetService | null>(null)
  const [isLoadingAsset, setIsLoadingAsset] = useState(true)
  
  // 初始化RWA服务
  useEffect(() => {
    const initRWAService = async () => {
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const service = new RWAAssetService(provider, undefined, 11155111)
          setRwaService(service)
        }
      } catch (error) {
        console.error('❌ 初始化RWA服务失败:', error)
      }
    }
    initRWAService()
  }, [])
  
  const [investmentState, setInvestmentState] = useState<InvestmentState>({
    step: 1,
    tokenAmount: 0,
    investmentAmount: 0,
    isProcessing: false,
    error: null,
    txHash: null,
    complianceChecked: false,
    complianceResult: null
  })

  // 加载真实资产数据
  useEffect(() => {
    const loadAsset = async () => {
      if (!assetId || !rwaService) return
      
      setIsLoadingAsset(true)
      try {
        console.log('🔍 从合约加载资产数据:', { assetId })
        
        // 获取所有资产
        const allAssets = await rwaService.getDeployedAssets()
        console.log('📊 获取到所有资产:', allAssets.length)
        
        // 查找匹配的资产
        const foundAsset = allAssets.find(asset => 
          asset.address.toLowerCase() === assetId.toLowerCase()
        )
        
        if (foundAsset) {
          console.log('✅ 找到真实资产:', foundAsset.name)
          setAsset(foundAsset)
        } else {
          console.log('❌ 未找到资产，重定向到市场页面')
          router.push('/rwa-platform/marketplace')
        }
        
      } catch (error) {
        console.error('❌ 加载资产失败:', error)
        router.push('/rwa-platform/marketplace')
      } finally {
        setIsLoadingAsset(false)
      }
    }
    
    loadAsset()
  }, [assetId, rwaService])

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
        
        // 如果用户未验证，重定向到注册页面
        if (status.status !== UserVerificationStatus.VERIFIED_VALID) {
          router.push('/rwa-platform/register')
          return
        }
      } catch (error) {
        console.error('检查验证状态失败:', error)
        setVerificationStatus({ status: UserVerificationStatus.NOT_VERIFIED })
        router.push('/rwa-platform/register')
      } finally {
        setIsLoadingStatus(false)
      }
    }

    checkStatus()
  }, [address, isConnected])

  // 计算投资金额 - 根据智能合约逻辑：1 ETH = 1 代币
  useEffect(() => {
    if (asset && investmentState.tokenAmount > 0) {
      // 🔧 修正：智能合约逻辑是 1 ETH = 1 代币，所以投资金额 = 代币数量
      const amount = investmentState.tokenAmount * 1.0  // 1 ETH = 1 代币
      setInvestmentState(prev => ({
        ...prev,
        investmentAmount: amount
      }))
      
      console.log('💰 投资金额计算 (1 ETH = 1 代币):', {
        代币数量: investmentState.tokenAmount,
        智能合约比例: '1 ETH = 1 代币',
        总投资金额: amount,
        格式化显示: formatNumber(amount, 6) + ' ETH',
        说明: '按智能合约逻辑计算，不使用asset.tokenPrice'
      })
    }
  }, [investmentState.tokenAmount, asset])

  const handleTokenAmountChange = (value: string) => {
    console.log('💰 代币数量输入:', value)
    
    // 允许空值，不强制转换为0
    if (value === '') {
      setInvestmentState(prev => ({
        ...prev,
        tokenAmount: 0,
        error: null
      }))
      return
    }
    
    const amount = parseInt(value)
    if (isNaN(amount) || amount < 0) {
      console.log('❌ 无效输入:', value)
      return // 忽略无效输入
    }
    
    const maxTokens = asset ? asset.availableTokens : 0
    const minTokens = 0.01  // 🔧 修正：1 ETH = 1 代币，所以最小投资 0.01 ETH = 0.01 代币
    
    console.log('📊 投资计算:', {
      输入数量: amount,
      最小购买: minTokens,
      最大可购买: maxTokens,
      代币单价: asset?.tokenPrice,
      计算金额: amount * (asset?.tokenPrice || 0),
      满足最小投资: amount >= minTokens
    })
    
    let error = null
    if (amount > maxTokens) {
      error = `最大可购买 ${maxTokens.toLocaleString()} 个代币`
    } else if (amount < minTokens && amount > 0) {
      error = `最小投资要求 ${minTokens} 个代币 (0.01 ETH)`
    }
    
    setInvestmentState(prev => ({
      ...prev,
      tokenAmount: amount,
      error
    }))
  }

  const checkCompliance = async (event?: React.MouseEvent) => {
    // 阻止默认行为和事件冒泡
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    console.log('🔍 checkCompliance 被调用')
    setInvestmentState(prev => ({ ...prev, isProcessing: true, error: null }))
    
    try {
      console.log('📋 开始合规检查...', {
        tokenAmount: investmentState.tokenAmount,
        investmentAmount: investmentState.investmentAmount,
        userAddress: address
      })
      
      // 模拟合规检查API调用
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 模拟合规检查结果
      const complianceResult = {
        isCompliant: true,
        checks: {
          identity: { passed: true, message: 'ZK-KYC身份验证通过' },
          investment: { passed: true, message: '投资金额符合要求' },
          risk: { passed: true, message: '风险评估通过' },
          jurisdiction: { passed: true, message: '司法管辖区合规' }
        },
        riskScore: 'LOW',
        approvedAmount: investmentState.investmentAmount
      }
      
      console.log('✅ 合规检查完成:', complianceResult)
      
      setInvestmentState(prev => ({
        ...prev,
        step: 2,
        complianceChecked: true,
        complianceResult,
        isProcessing: false
      }))
    } catch (error) {
      console.error('❌ 合规检查失败:', error)
      setInvestmentState(prev => ({
        ...prev,
        error: '合规检查失败，请重试',
        isProcessing: false
      }))
    }
  }

  const executeInvestment = async (event?: React.MouseEvent) => {
    // 阻止默认行为和事件冒泡
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    console.log('🎯 executeInvestment 被调用')
    
    if (!address || !asset) {
      console.log('❌ 缺少必要参数:', { address, asset: !!asset })
      return
    }
    
    setInvestmentState(prev => ({ ...prev, isProcessing: true, error: null }))
    
    try {
      console.log('🚀 开始执行真实投资...', {
        assetAddress: asset.address,
        tokenAmount: investmentState.tokenAmount,
        userAddress: address
      })
      
      // 使用真实的RWA服务执行投资
      if (window.ethereum && isConnected) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        const rwaService = new RWAAssetService(provider, signer, 11155111)
        
        const result = await rwaService.investInAsset(
          asset.address || '',
          investmentState.tokenAmount,
          address
        )
        
        console.log('📊 投资结果:', result)
        
        if (result.success) {
          console.log('✅ 投资成功:', result.txHash)
          setInvestmentState(prev => ({
            ...prev,
            step: 3,
            txHash: result.txHash || null,
            isProcessing: false
          }))
        } else {
          throw new Error(result.error || '投资失败')
        }
      } else {
        throw new Error('请连接钱包')
      }
      
      // 更新资产的已售代币数量（模拟）
      if (asset) {
        setAsset((prev: any) => ({
          ...prev,
          soldTokens: prev.soldTokens + investmentState.tokenAmount
        }))
      }
    } catch (error: any) {
      console.error('❌ 投资失败:', error)
      setInvestmentState(prev => ({
        ...prev,
        error: error.message || '投资执行失败',
        isProcessing: false
      }))
    }
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

  // 格式化数值显示
  const formatNumber = (value: number, decimals: number = 2): string => {
    if (value === 0) return '0'
    if (value < 0.000001) return value.toExponential(2)
    if (value < 1) return value.toFixed(6)
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    })
  }

  // 格式化代币数量显示
  const formatTokenAmount = (amount: number): string => {
    if (amount === 0) return '0'
    if (amount >= 1e18) {
      return (amount / 1e18).toLocaleString() + ' (×10¹⁸)'
    }
    if (amount >= 1e9) {
      return (amount / 1e9).toLocaleString() + 'B'
    }
    if (amount >= 1e6) {
      return (amount / 1e6).toLocaleString() + 'M'
    }
    if (amount >= 1e3) {
      return (amount / 1e3).toLocaleString() + 'K'
    }
    return amount.toLocaleString()
  }

  const getProgressPercentage = (circulatingSupply: number, totalSupply: number) => {
    // 🔧 修正：销售进度 = 已发行代币 / 最大供应量
    if (totalSupply <= 0) return 0
    const percentage = (circulatingSupply / totalSupply) * 100
    console.log('📊 销售进度计算:', {
      已发行代币: circulatingSupply,
      最大供应量: totalSupply,
      销售进度: percentage.toFixed(2) + '%'
    })
    return Math.min(percentage, 100) // 确保不超过100%
  }

  if (isLoadingStatus || isLoadingAsset || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {isLoadingAsset ? '加载资产数据中...' : '加载中...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">投资 {asset.name}</h1>
              <p className="text-gray-600">使用ZK-KYC身份验证安全投资</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：资产信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 资产概览 */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">🏢</div>
                    <div>
                      <CardTitle className="text-xl">{asset.name}</CardTitle>
                      <div className="flex items-center gap-2 text-gray-600 mt-1">
                        <MapPin className="w-4 h-4" />
                        {asset.location || '未知位置'}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge className={getRiskColor(asset.riskLevel || 'medium')}>
                          {getRiskText(asset.riskLevel || 'medium')}
                        </Badge>
                        <Badge variant="outline">{asset.assetType}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* 关键指标 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{asset.expectedReturn}%</div>
                    <div className="text-sm text-gray-600">预期年化收益</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatNumber(asset.tokenPrice, 6)} ETH</div>
                    <div className="text-sm text-gray-600">代币价格</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatNumber(asset.totalValue, 2)} ETH</div>
                    <div className="text-sm text-gray-600">总价值</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{new Date(asset.deployedAt).getFullYear()}</div>
                    <div className="text-sm text-gray-600">部署年份</div>
                  </div>
                </div>

                <Separator />

                {/* 销售进度 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">销售进度</span>
                    <span className="text-sm text-gray-600">
                      {asset.circulatingSupply.toLocaleString()} / {asset.totalSupply.toLocaleString()} 代币已售出
                    </span>
                  </div>
                  <Progress value={getProgressPercentage(asset.circulatingSupply, asset.totalSupply)} className="h-3" />
                  <div className="text-sm text-gray-600 mt-1">
                    剩余 {asset.availableTokens.toLocaleString()} 代币可购买
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    💡 销售进度: {getProgressPercentage(asset.circulatingSupply, asset.totalSupply).toFixed(1)}%
                  </div>
                </div>

                <Separator />

                {/* 资产详情 */}
                <div>
                  <h3 className="font-semibold mb-3">资产详情</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">合约地址:</span>
                      <div className="font-medium font-mono text-xs">
                        {asset.address.substring(0, 10)}...{asset.address.substring(-8)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">资产类型:</span>
                      <div className="font-medium">{asset.assetType}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">平台:</span>
                      <div className="font-medium">{asset.platform}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">部署者:</span>
                      <div className="font-medium font-mono text-xs">
                        {asset.deployer.substring(0, 10)}...{asset.deployer.substring(-8)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">总筹集:</span>
                      <div className="font-medium text-green-600">{formatNumber(asset.totalRaised, 6)} ETH</div>
                    </div>
                    <div>
                      <span className="text-gray-600">总分红:</span>
                      <div className="font-medium">{formatNumber(asset.totalDividends, 6)} ETH</div>
                    </div>
                  </div>

                  {/* 描述 */}
                  <div className="mt-4">
                    <span className="text-gray-600">描述:</span>
                    <div className="mt-2 text-sm text-gray-700">
                      {asset.description}
                    </div>
                  </div>

                  {/* 状态标识 */}
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant={asset.isActive ? "default" : "secondary"} className="text-xs">
                      {asset.isActive ? "🟢 活跃" : "🔴 非活跃"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      📊 真实合约数据
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：投资流程 */}
          <div className="space-y-6">
            {/* 投资步骤指示器 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">投资流程</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`flex items-center gap-3 ${investmentState.step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      investmentState.step >= 1 ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      1
                    </div>
                    <span>设置投资金额</span>
                  </div>
                  <div className={`flex items-center gap-3 ${investmentState.step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      investmentState.step >= 2 ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      2
                    </div>
                    <span>合规检查</span>
                  </div>
                  <div className={`flex items-center gap-3 ${investmentState.step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      investmentState.step >= 3 ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      3
                    </div>
                    <span>完成投资</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 投资表单 */}
            {investmentState.step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    投资计算器
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 最小投资提醒 */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">最小投资要求</span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      智能合约要求最小投资金额为 0.01 ETH，请至少购买 0.01 个代币 (1 ETH = 1 代币)
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      购买代币数量
                    </label>
                    <Input
                      type="number"
                      placeholder="输入代币数量"
                      value={investmentState.tokenAmount === 0 ? '' : investmentState.tokenAmount}
                      onChange={(e) => handleTokenAmountChange(e.target.value)}
                      min="1"
                      max={asset ? asset.availableTokens : 0}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      最小投资: 0.01 代币 (0.01 ETH，1 ETH = 1 代币)
                    </div>
                  </div>

                  {investmentState.tokenAmount > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span>代币数量:</span>
                        <span className="font-medium">{formatTokenAmount(investmentState.tokenAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>单价:</span>
                        <span className="font-medium">{formatNumber(asset.tokenPrice, 6)} ETH</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-semibold">
                        <span>总投资金额:</span>
                        <span className="text-blue-600">{formatNumber(investmentState.investmentAmount, 6)} ETH</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        预期年收益: {formatNumber(investmentState.investmentAmount * asset.expectedReturn / 100, 6)} ETH
                      </div>
                    </div>
                  )}

                  {investmentState.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{investmentState.error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    onClick={(e) => checkCompliance(e)}
                    disabled={investmentState.tokenAmount < 0.01 || investmentState.isProcessing}
                    className="w-full"
                    type="button"
                  >
                    {investmentState.isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        检查合规性...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        开始合规检查
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 合规检查结果 */}
            {investmentState.step === 2 && investmentState.complianceResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    合规检查结果
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 mb-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">合规检查通过</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {Object.entries(investmentState.complianceResult.checks).map(([key, check]: [string, any]) => (
                        <div key={key} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{check.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>风险评级:</span>
                        <Badge className="bg-green-100 text-green-800">
                          {investmentState.complianceResult.riskScore}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>批准投资金额:</span>
                        <span className="font-semibold">
                          ${investmentState.complianceResult.approvedAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={(e) => executeInvestment(e)}
                    disabled={investmentState.isProcessing}
                    className="w-full"
                    type="button"
                  >
                    {investmentState.isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        执行投资...
                      </>
                    ) : (
                      <>
                        <DollarSign className="mr-2 h-4 w-4" />
                        确认投资
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 投资成功 */}
            {investmentState.step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    投资成功
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      投资已成功执行！
                    </h3>
                    <p className="text-green-700 text-sm">
                      您已成功购买 {formatTokenAmount(investmentState.tokenAmount)} 个代币，
                      总投资金额 {formatNumber(investmentState.investmentAmount, 6)} ETH
                    </p>
                  </div>

                  {investmentState.txHash && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm">
                        <div className="font-medium mb-2">交易详情:</div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">交易哈希:</span>
                          <code className="text-xs bg-white px-2 py-1 rounded">
                            {investmentState.txHash.substring(0, 10)}...{investmentState.txHash.substring(-8)}
                          </code>
                          <Button variant="ghost" size="sm" className="p-1">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => router.push('/dashboard')}
                      className="flex-1"
                    >
                      查看投资组合
                    </Button>
                    <Button 
                      onClick={() => router.push('/rwa-platform/marketplace')}
                      variant="outline"
                      className="flex-1"
                    >
                      继续投资
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
