import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { 
  Wallet, 
  RefreshCw, 
  Activity, 
  DollarSign, 
  Users, 
  TrendingUp,
  Building2,
  ExternalLink,
  ArrowUpDown,
  Plus,
  AlertCircle
} from 'lucide-react'
import PaymentNetworkGraph from '../components/payment-visualization/PaymentNetworkGraph.jsx'
import { useWeb3Wallet } from '../hooks/useWeb3Wallet.js'
import { useStreamPaymentContract } from '../hooks/useStreamPaymentContract.js'
import CreateSupplierModal from '../components/payment-visualization/CreateSupplierModal.jsx'
import CreatePaymentModal from '../components/payment-visualization/CreatePaymentModal.jsx'

// Contract address - will be set after deployment
const CONTRACT_ADDRESS = import.meta.env.VITE_STREAM_PAYMENT_CONTRACT || null

export default function PaymentVisualizationPage() {
  // Web3 wallet state
  const {
    account,
    signer,
    chainId,
    isConnecting,
    error: walletError,
    isConnected,
    isMetaMaskInstalled,
    isSepolia,
    connect,
    disconnect,
    switchToSepolia
  } = useWeb3Wallet()

  // Contract state
  const {
    loading: contractLoading,
    error: contractError,
    registerSupplier,
    createPayment,
    getSuppliers,
    getPayments,
    getStatistics,
    listenToEvents
  } = useStreamPaymentContract(signer, CONTRACT_ADDRESS)

  // UI state
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: '0.0000 ETH',
    supplierCount: 0,
    averagePayment: '0.0000 ETH'
  })
  const [suppliers, setSuppliers] = useState([])
  const [payments, setPayments] = useState([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Load data from contract
  const loadData = async () => {
    if (!signer || !CONTRACT_ADDRESS) return

    try {
      setIsRefreshing(true)

      // Load statistics
      const statsData = await getStatistics()
      if (statsData) {
        setStats({
          totalPayments: statsData.totalPayments,
          totalAmount: `${parseFloat(statsData.totalAmount).toFixed(4)} ETH`,
          supplierCount: statsData.supplierCount,
          averagePayment: `${parseFloat(statsData.averagePayment).toFixed(4)} ETH`
        })
      }

      // Load suppliers
      const suppliersData = await getSuppliers()
      if (suppliersData && suppliersData.length > 0) {
        const totalAmount = suppliersData.reduce((sum, s) => sum + parseFloat(s.totalReceived), 0)
        
        const formattedSuppliers = suppliersData.map((s, index) => ({
          id: index + 1,
          name: s.name,
          brand: s.brand,
          category: s.category,
          address: `${s.address.slice(0, 6)}...${s.address.slice(-4)}`,
          fullAddress: s.address,
          amount: `${parseFloat(s.totalReceived).toFixed(4)} ETH`,
          percentage: totalAmount > 0 ? (parseFloat(s.totalReceived) / totalAmount) * 100 : 0,
          paymentCount: 0, // Will be calculated from payments
          profitMargin: s.profitMargin
        }))
        setSuppliers(formattedSuppliers)
      }

      // Load payments
      const paymentsData = await getPayments()
      if (paymentsData && paymentsData.length > 0) {
        const formattedPayments = paymentsData.map((p, index) => {
          const supplier = suppliersData.find(s => s.address.toLowerCase() === p.to.toLowerCase())
          return {
            id: index + 1,
            supplier: supplier ? supplier.name : 'Unknown',
            brand: supplier ? supplier.brand : 'N/A',
            amount: `${parseFloat(p.amount).toFixed(4)} ETH`,
            category: p.category,
            status: p.status,
            timestamp: new Date(p.timestamp).toLocaleString('zh-CN'),
            txHash: `${p.paymentId.toString(16).padStart(4, '0')}...`,
            fullTxHash: p.paymentId
          }
        })
        setPayments(formattedPayments)

        // Update payment counts for suppliers
        const paymentCounts = {}
        paymentsData.forEach(p => {
          const addr = p.to.toLowerCase()
          paymentCounts[addr] = (paymentCounts[addr] || 0) + 1
        })

        setSuppliers(prev => prev.map(s => ({
          ...s,
          paymentCount: paymentCounts[s.fullAddress.toLowerCase()] || 0
        })))
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Load data when connected
  useEffect(() => {
    if (isConnected && isSepolia && CONTRACT_ADDRESS) {
      loadData()
    }
  }, [isConnected, isSepolia, CONTRACT_ADDRESS])

  // Listen to contract events
  useEffect(() => {
    if (!signer || !CONTRACT_ADDRESS) return

    const cleanup = listenToEvents(
      // On supplier registered
      () => {
        console.log('New supplier registered, reloading data...')
        loadData()
      },
      // On payment created
      () => {
        console.log('New payment created, reloading data...')
        loadData()
      }
    )

    return cleanup
  }, [signer, CONTRACT_ADDRESS])

  // Handle supplier creation
  const handleCreateSupplier = async (supplierData) => {
    const receipt = await registerSupplier(
      supplierData.name,
      supplierData.brand,
      supplierData.category,
      Math.round(supplierData.profitMargin * 100) // Convert to basis points
    )

    if (receipt) {
      setShowSupplierModal(false)
      await loadData()
    }
  }

  // Handle payment creation
  const handleCreatePayment = async (paymentData) => {
    const receipt = await createPayment(
      paymentData.toAddress,
      paymentData.category,
      paymentData.amount
    )

    if (receipt) {
      setShowPaymentModal(false)
      await loadData()
    }
  }

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{label}</span>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  )

  // Show MetaMask installation prompt
  if (!isMetaMaskInstalled) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">需要安装 MetaMask</h2>
            <p className="text-gray-600 mb-6">
              请安装 MetaMask 浏览器扩展以使用支付可视化功能
            </p>
            <Button
              onClick={() => window.open('https://metamask.io/download/', '_blank')}
              className="bg-gray-900 hover:bg-gray-800"
            >
              安装 MetaMask
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show contract not deployed message
  if (!CONTRACT_ADDRESS) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">智能合约未部署</h2>
            <p className="text-gray-600 mb-4">
              请先部署 StreamPayment 智能合约到 Sepolia 测试网
            </p>
            <p className="text-sm text-gray-500">
              部署后,请在环境变量中设置 VITE_STREAM_PAYMENT_CONTRACT
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-normal text-gray-900 mb-2">支付可视化</h2>
          <p className="text-sm text-gray-500">实时追踪企业支付网络和资金流向</p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <>
              <Button 
                variant="outline" 
                onClick={loadData}
                disabled={isRefreshing || contractLoading}
                className="border-gray-200"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                刷新数据
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSupplierModal(true)}
                className="border-gray-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                注册供应商
              </Button>
              <Button
                onClick={() => setShowPaymentModal(true)}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建支付
              </Button>
            </>
          )}
          {!isConnected ? (
            <Button 
              onClick={connect} 
              disabled={isConnecting}
              className="bg-gray-900 hover:bg-gray-800"
            >
              <Wallet className="w-4 h-4 mr-2" />
              {isConnecting ? '连接中...' : '连接钱包'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {!isSepolia && (
                <Button
                  variant="outline"
                  onClick={switchToSepolia}
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                >
                  切换到 Sepolia
                </Button>
              )}
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-700">
                {account?.slice(0, 6)}...{account?.slice(-4)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnect}
                className="text-gray-500"
              >
                断开
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error messages */}
      {(walletError || contractError) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{walletError || contractError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network warning */}
      {isConnected && !isSepolia && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">请切换到 Sepolia 测试网以使用此功能</span>
            </div>
          </CardContent>
        </Card>
      )}

      {isConnected && isSepolia && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={Activity} 
              label="总支付次数" 
              value={stats.totalPayments}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard 
              icon={DollarSign} 
              label="总支付金额" 
              value={stats.totalAmount}
              color="bg-green-50 text-green-600"
            />
            <StatCard 
              icon={Users} 
              label="供应商数量" 
              value={stats.supplierCount}
              color="bg-purple-50 text-purple-600"
            />
            <StatCard 
              icon={TrendingUp} 
              label="平均支付" 
              value={stats.averagePayment}
              color="bg-yellow-50 text-yellow-600"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visualization */}
            <div className="lg:col-span-2">
              <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-gray-900">
                    支付网络图
                  </CardTitle>
                  <p className="text-sm text-gray-500">主钱包到供应商的资金流向</p>
                </CardHeader>
                <CardContent>
                  {suppliers.length > 0 ? (
                    <PaymentNetworkGraph suppliers={suppliers} />
                  ) : (
                    <div className="flex items-center justify-center h-[600px] text-gray-500">
                      <div className="text-center">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>暂无供应商数据</p>
                        <p className="text-sm mt-2">点击"注册供应商"开始</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Supplier List */}
            <div className="lg:col-span-1">
              <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    供应商列表
                  </CardTitle>
                  <p className="text-sm text-gray-500">共 {suppliers.length} 个供应商</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {suppliers.length > 0 ? (
                      suppliers.map((supplier, index) => (
                        <div key={supplier.id} className="p-4 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">#{index + 1}</span>
                                <h3 className="font-medium text-gray-900">{supplier.name}</h3>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">品牌: {supplier.brand}</p>
                              <p className="text-xs text-gray-500 mt-1">{supplier.category}</p>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">{supplier.amount}</div>
                              <div className="text-xs text-gray-500">{supplier.percentage.toFixed(2)}%</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                            <span>地址: <span className="text-gray-900 font-mono">{supplier.address}</span></span>
                            <div className="flex items-center gap-3">
                              <span>支付: <span className="text-gray-900">{supplier.paymentCount}</span></span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                <span className="text-yellow-600">{supplier.profitMargin}%</span>
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-500"
                              style={{ width: `${supplier.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">暂无供应商</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Payment Table */}
          <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium text-gray-900">支付详情</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">共 {payments.length} 笔支付记录</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200">
                      <tr className="text-left">
                        <th className="pb-3 text-sm font-medium text-gray-600">供应商</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">品牌</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">金额</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">类别</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">状态</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3">
                            <div className="font-medium text-gray-900">{payment.supplier}</div>
                          </td>
                          <td className="py-3 text-gray-600">{payment.brand}</td>
                          <td className="py-3">
                            <span className="font-semibold text-green-600">{payment.amount}</span>
                          </td>
                          <td className="py-3 text-gray-600">{payment.category}</td>
                          <td className="py-3">
                            <span className={`font-medium ${
                              payment.status === 'Completed' ? 'text-green-600' :
                              payment.status === 'Pending' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-600">{payment.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无支付记录</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modals */}
      {showSupplierModal && (
        <CreateSupplierModal
          onClose={() => setShowSupplierModal(false)}
          onSubmit={handleCreateSupplier}
          isLoading={contractLoading}
        />
      )}

      {showPaymentModal && (
        <CreatePaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handleCreatePayment}
          suppliers={suppliers}
          isLoading={contractLoading}
        />
      )}
    </div>
  )
}

