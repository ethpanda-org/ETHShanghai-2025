'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2, 
  MapPin, 
  TrendingUp, 
  DollarSign,
  Users,
  Calendar,
  Star,
  ArrowLeft,
  ExternalLink,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { VerificationStatusService } from '@/lib/services/verification-status-service'
import { UserVerificationStatus } from '@/lib/types/verification-status'

// 扩展的资产数据
const DETAILED_ASSETS: { [key: string]: any } = {
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
    description: '位于曼哈顿核心商业区的甲级写字楼，租户稳定，现金流优秀。这栋25层的现代化办公大楼拥有优越的地理位置，毗邻华尔街金融中心，是投资级商业地产的典型代表。',
    highlights: ['核心地段', '稳定租户', '升值潜力', '现代化设施'],
    minInvestment: 1000,
    platform: 'propertyfy',
    launchDate: '2024-01-15',
    occupancyRate: 95,
    yearBuilt: 2018,
    details: {
      address: '123 Wall Street, New York, NY 10005',
      totalArea: '50,000 sq ft',
      floors: 25,
      parkingSpaces: 200,
      amenities: ['24/7 Security', 'Fitness Center', 'Conference Rooms', 'Rooftop Garden', 'High-Speed Elevators', 'HVAC System'],
      tenants: [
        { name: 'Goldman Sachs', floors: '20-25', lease: '10 years' },
        { name: 'JPMorgan Chase', floors: '15-19', lease: '8 years' },
        { name: 'Morgan Stanley', floors: '10-14', lease: '7 years' },
        { name: 'BlackRock', floors: '5-9', lease: '5 years' }
      ],
      monthlyRent: 45000,
      propertyManager: 'Manhattan Real Estate Group',
      lastAppraisal: 2650000,
      appraisalDate: '2024-01-01',
      insurance: 'Comprehensive Commercial Insurance',
      taxes: 125000,
      maintenance: 35000,
      netOperatingIncome: 415000
    },
    financials: {
      grossRent: 540000,
      operatingExpenses: 125000,
      netOperatingIncome: 415000,
      capRate: 16.6,
      cashOnCashReturn: 8.5,
      irr: 12.3,
      projectedAppreciation: 3.2
    },
    riskFactors: [
      'Market volatility in NYC commercial real estate',
      'Interest rate changes affecting property values',
      'Tenant turnover risk',
      'Economic downturn impact on rental rates'
    ],
    documents: [
      { name: 'Property Appraisal Report', type: 'PDF', size: '2.3 MB' },
      { name: 'Lease Agreements', type: 'PDF', size: '1.8 MB' },
      { name: 'Financial Statements', type: 'PDF', size: '945 KB' },
      { name: 'Property Management Agreement', type: 'PDF', size: '1.2 MB' },
      { name: 'Insurance Documentation', type: 'PDF', size: '756 KB' }
    ]
  }
}

export default function AssetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { address, isConnected } = useAccount()
  const assetId = params?.assetId as string
  
  const [asset, setAsset] = useState<any>(null)
  const [verificationStatus, setVerificationStatus] = useState<any>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [statusService] = useState(() => new VerificationStatusService())

  // 加载资产数据
  useEffect(() => {
    if (assetId && DETAILED_ASSETS[assetId]) {
      setAsset(DETAILED_ASSETS[assetId])
    } else {
      router.push('/rwa-platform/marketplace')
    }
  }, [assetId])

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

  const handleInvest = () => {
    if (verificationStatus?.status !== UserVerificationStatus.VERIFIED_VALID) {
      router.push('/rwa-platform/register')
      return
    }
    
    router.push(`/rwa-platform/invest/${asset.id}`)
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

  const getProgressPercentage = (soldTokens: number, totalTokens: number) => {
    return (soldTokens / totalTokens) * 100
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载资产详情...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="text-4xl">{asset.image}</div>
              <div>
                <h1 className="text-3xl font-bold">{asset.name}</h1>
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <MapPin className="w-4 h-4" />
                  {asset.location}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge className={getRiskColor(asset.riskLevel)}>
              {getRiskText(asset.riskLevel)}
            </Badge>
            <Badge variant="outline">{asset.type}</Badge>
            <Badge variant="outline">{asset.platform}</Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：详细信息 */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="financials">财务</TabsTrigger>
                <TabsTrigger value="tenants">租户</TabsTrigger>
                <TabsTrigger value="documents">文档</TabsTrigger>
              </TabsList>

              {/* 概览 */}
              <TabsContent value="overview">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>资产描述</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed">{asset.description}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>资产详情</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <span className="text-sm text-gray-600">地址</span>
                            <p className="font-medium">{asset.details.address}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">总面积</span>
                            <p className="font-medium">{asset.details.totalArea}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">楼层数</span>
                            <p className="font-medium">{asset.details.floors}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">停车位</span>
                            <p className="font-medium">{asset.details.parkingSpaces}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <span className="text-sm text-gray-600">建成年份</span>
                            <p className="font-medium">{asset.yearBuilt}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">入住率</span>
                            <p className="font-medium text-green-600">{asset.occupancyRate}%</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">物业管理</span>
                            <p className="font-medium">{asset.details.propertyManager}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">最新估值</span>
                            <p className="font-medium">{formatCurrency(asset.details.lastAppraisal)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>设施与服务</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {asset.details.amenities.map((amenity: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>风险因素</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {asset.riskFactors.map((risk: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{risk}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 财务信息 */}
              <TabsContent value="financials">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>收入与支出</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-gray-600">年总租金收入</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(asset.financials.grossRent)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">运营费用</span>
                            <span className="font-semibold text-red-600">
                              -{formatCurrency(asset.financials.operatingExpenses)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-medium">净运营收入</span>
                            <span className="font-bold text-blue-600">
                              {formatCurrency(asset.financials.netOperatingIncome)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-gray-600">资本化率</span>
                            <span className="font-semibold">{asset.financials.capRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">现金收益率</span>
                            <span className="font-semibold">{asset.financials.cashOnCashReturn}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">内部收益率</span>
                            <span className="font-semibold">{asset.financials.irr}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">预期年增值</span>
                            <span className="font-semibold">{asset.financials.projectedAppreciation}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 租户信息 */}
              <TabsContent value="tenants">
                <Card>
                  <CardHeader>
                    <CardTitle>主要租户</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {asset.details.tenants.map((tenant: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-semibold">{tenant.name}</h4>
                            <p className="text-sm text-gray-600">楼层: {tenant.floors}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{tenant.lease}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 文档 */}
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>相关文档</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {asset.documents.map((doc: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                              <ExternalLink className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-gray-600">{doc.type} • {doc.size}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* 右侧：投资信息 */}
          <div className="space-y-6">
            {/* 投资概览 */}
            <Card>
              <CardHeader>
                <CardTitle>投资概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{asset.expectedReturn}</div>
                    <div className="text-sm text-gray-600">预期年化收益</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">${asset.tokenPrice}</div>
                    <div className="text-sm text-gray-600">代币价格</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    最小投资: {formatCurrency(asset.minInvestment)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 销售进度 */}
            <Card>
              <CardHeader>
                <CardTitle>销售进度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {getProgressPercentage(asset.soldTokens, asset.totalTokens).toFixed(1)}%
                  </div>
                  <Progress value={getProgressPercentage(asset.soldTokens, asset.totalTokens)} className="h-3" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">已售代币</span>
                    <div className="font-semibold">{asset.soldTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">总代币数</span>
                    <div className="font-semibold">{asset.totalTokens.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="text-center text-sm text-gray-600">
                  剩余 {(asset.totalTokens - asset.soldTokens).toLocaleString()} 代币可购买
                </div>
              </CardContent>
            </Card>

            {/* 投资按钮 */}
            <Card>
              <CardContent className="pt-6">
                {verificationStatus?.status === UserVerificationStatus.VERIFIED_VALID ? (
                  <Button onClick={handleInvest} className="w-full" size="lg">
                    <DollarSign className="mr-2 h-5 w-5" />
                    立即投资
                  </Button>
                ) : (
                  <Button 
                    onClick={() => router.push('/rwa-platform/register')} 
                    variant="outline" 
                    className="w-full" 
                    size="lg"
                  >
                    <Shield className="mr-2 h-5 w-5" />
                    完成身份验证
                  </Button>
                )}
                
                <div className="mt-4 space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => router.push('/rwa-platform/marketplace')}
                  >
                    返回市场
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 平台信息 */}
            <Card>
              <CardHeader>
                <CardTitle>平台信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">投资平台</span>
                    <span className="font-medium">{asset.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">上线日期</span>
                    <span className="font-medium">
                      {new Date(asset.launchDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">合规状态</span>
                    <Badge className="bg-green-100 text-green-800">已验证</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
