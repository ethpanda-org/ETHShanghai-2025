'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2, 
  TrendingUp, 
  DollarSign,
  PieChart,
  Calendar,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { VerificationStatusService } from '@/lib/services/verification-status-service'
import { UserVerificationStatus } from '@/lib/types/verification-status'

// 模拟用户投资组合数据
const MOCK_PORTFOLIO = {
  totalValue: 125000,
  totalInvested: 100000,
  totalReturn: 25000,
  returnPercentage: 25.0,
  monthlyIncome: 850,
  investments: [
    {
      id: 'inv-001',
      assetId: 'property-001',
      assetName: '纽约曼哈顿商业大厦',
      assetType: '商业地产',
      location: '纽约, 美国',
      image: '🏢',
      tokensOwned: 150,
      tokenPrice: 100,
      currentValue: 16500,
      investedAmount: 15000,
      unrealizedGain: 1500,
      unrealizedGainPercent: 10.0,
      monthlyDividend: 127.5,
      dividendYield: 8.5,
      purchaseDate: '2024-01-15',
      platform: 'PropertyFy',
      status: 'active'
    },
    {
      id: 'inv-002',
      assetId: 'property-002',
      assetName: '洛杉矶豪华公寓',
      assetType: '住宅地产',
      location: '洛杉矶, 美国',
      image: '🏠',
      tokensOwned: 800,
      tokenPrice: 50,
      currentValue: 42000,
      investedAmount: 40000,
      unrealizedGain: 2000,
      unrealizedGainPercent: 5.0,
      monthlyDividend: 226.7,
      dividendYield: 6.8,
      purchaseDate: '2024-02-01',
      platform: 'RealT',
      status: 'active'
    },
    {
      id: 'inv-003',
      assetId: 'property-004',
      assetName: '芝加哥工业园区',
      assetType: '工业地产',
      location: '芝加哥, 美国',
      image: '🏭',
      tokensOwned: 1200,
      tokenPrice: 25,
      currentValue: 31500,
      investedAmount: 30000,
      unrealizedGain: 1500,
      unrealizedGainPercent: 5.0,
      monthlyDividend: 180.0,
      dividendYield: 7.2,
      purchaseDate: '2024-02-15',
      platform: 'RealT',
      status: 'active'
    },
    {
      id: 'inv-004',
      assetId: 'property-005',
      assetName: '德州奥斯汀科技园',
      assetType: '商业地产',
      location: '奥斯汀, 美国',
      image: '💼',
      tokensOwned: 187,
      tokenPrice: 80,
      currentValue: 16445,
      investedAmount: 15000,
      unrealizedGain: 1445,
      unrealizedGainPercent: 9.6,
      monthlyDividend: 113.8,
      dividendYield: 9.1,
      purchaseDate: '2024-03-01',
      platform: 'PropertyFy',
      status: 'active'
    }
  ],
  transactions: [
    {
      id: 'tx-001',
      type: 'purchase',
      assetName: '德州奥斯汀科技园',
      amount: 15000,
      tokens: 187,
      date: '2024-03-01',
      txHash: '0x1234...5678'
    },
    {
      id: 'tx-002',
      type: 'dividend',
      assetName: '纽约曼哈顿商业大厦',
      amount: 127.5,
      date: '2024-03-01',
      txHash: '0x2345...6789'
    },
    {
      id: 'tx-003',
      type: 'dividend',
      assetName: '洛杉矶豪华公寓',
      amount: 226.7,
      date: '2024-03-01',
      txHash: '0x3456...7890'
    }
  ]
}

export default function PortfolioPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  
  const [portfolio, setPortfolio] = useState(MOCK_PORTFOLIO)
  const [verificationStatus, setVerificationStatus] = useState<any>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [statusService] = useState(() => new VerificationStatusService())

  // 检查用户验证状态
  useEffect(() => {
    const checkStatus = async () => {
      if (!address) {
        router.push('/rwa-platform/register')
        return
      }

      try {
        const status = await statusService.checkCompleteVerificationStatus(address)
        setVerificationStatus(status)
        
        if (status.status !== UserVerificationStatus.VERIFIED_VALID) {
          router.push('/rwa-platform/register')
          return
        }
      } catch (error) {
        console.error('检查验证状态失败:', error)
        router.push('/rwa-platform/register')
      } finally {
        setIsLoadingStatus(false)
      }
    }

    checkStatus()
  }, [address, isConnected])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  }

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case '商业地产': return 'bg-blue-100 text-blue-800'
      case '住宅地产': return 'bg-green-100 text-green-800'
      case '工业地产': return 'bg-purple-100 text-purple-800'
      case '酒店地产': return 'bg-orange-100 text-orange-800'
      case '零售地产': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoadingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载投资组合...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">我的投资组合</h1>
              <p className="text-gray-600 mt-2">
                管理您的RWA投资，追踪收益表现
              </p>
            </div>
            <Button onClick={() => router.push('/rwa-platform/marketplace')}>
              <Building2 className="mr-2 h-4 w-4" />
              继续投资
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 投资组合概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总投资价值</p>
                  <p className="text-2xl font-bold">{formatCurrency(portfolio.totalValue)}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600 font-medium">
                  {formatPercentage(portfolio.returnPercentage)}
                </span>
                <span className="text-gray-600 ml-1">总收益</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">已投资金额</p>
                  <p className="text-2xl font-bold">{formatCurrency(portfolio.totalInvested)}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-600">
                  分布在 {portfolio.investments.length} 项资产中
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">未实现收益</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(portfolio.totalReturn)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <PieChart className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600 font-medium">
                  {formatPercentage(portfolio.returnPercentage)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">月收入</p>
                  <p className="text-2xl font-bold">{formatCurrency(portfolio.monthlyIncome)}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-600">来自分红收益</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详细信息 */}
        <Tabs defaultValue="investments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="investments">投资明细</TabsTrigger>
            <TabsTrigger value="transactions">交易记录</TabsTrigger>
          </TabsList>

          {/* 投资明细 */}
          <TabsContent value="investments">
            <div className="grid gap-6">
              {portfolio.investments.map((investment) => (
                <Card key={investment.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{investment.image}</div>
                        <div>
                          <h3 className="text-lg font-semibold">{investment.assetName}</h3>
                          <p className="text-gray-600">{investment.location}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getAssetTypeColor(investment.assetType)}>
                              {investment.assetType}
                            </Badge>
                            <Badge variant="outline">{investment.platform}</Badge>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/rwa-platform/asset/${investment.assetId}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        查看详情
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">持有代币</p>
                        <p className="font-semibold">{investment.tokensOwned.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">当前价值</p>
                        <p className="font-semibold">{formatCurrency(investment.currentValue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">投资成本</p>
                        <p className="font-semibold">{formatCurrency(investment.investedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">未实现收益</p>
                        <p className={`font-semibold ${investment.unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(investment.unrealizedGain)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">收益率</p>
                        <p className={`font-semibold ${investment.unrealizedGainPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentage(investment.unrealizedGainPercent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">月分红</p>
                        <p className="font-semibold text-blue-600">{formatCurrency(investment.monthlyDividend)}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-600">
                      <span>购买日期: {new Date(investment.purchaseDate).toLocaleDateString()}</span>
                      <span>分红收益率: {investment.dividendYield}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 交易记录 */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>最近交易</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolio.transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'purchase' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {transaction.type === 'purchase' ? (
                            <Building2 className={`w-5 h-5 ${transaction.type === 'purchase' ? 'text-blue-600' : 'text-green-600'}`} />
                          ) : (
                            <DollarSign className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {transaction.type === 'purchase' ? '购买资产' : '分红收益'}
                          </p>
                          <p className="text-sm text-gray-600">{transaction.assetName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.type === 'purchase' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'purchase' ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
