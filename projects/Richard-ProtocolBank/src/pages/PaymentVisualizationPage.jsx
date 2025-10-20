import { useState, useEffect } from 'react';
import { Wallet, RefreshCw, Users, Send, ExternalLink, AlertCircle } from 'lucide-react';
import PaymentNetworkGraph from '../components/payment-visualization/PaymentNetworkGraph';
import { useWeb3 } from '../hooks/useWeb3';
import { useStreamContract } from '../hooks/useStreamContract';

export default function PaymentVisualizationPage() {
  const {
    account,
    provider,
    signer,
    chainId,
    isConnected,
    isConnecting,
    error: walletError,
    isMetaMaskInstalled,
    isSepolia,
    connect,
    disconnect,
    switchToSepolia,
  } = useWeb3();

  const {
    loading: contractLoading,
    registerSupplier,
    createPayment,
    getSuppliers,
    getSupplier,
    getPayments,
    getStatistics,
  } = useStreamContract(signer, provider);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: '0',
    supplierCount: 0,
    averagePayment: '0',
  });
  const [loading, setLoading] = useState(false);

  // 加载数据
  const loadData = async () => {
    if (!isConnected || !isSepolia) return;

    setLoading(true);
    try {
      // 获取统计数据
      const statsData = await getStatistics();
      setStats(statsData);

      // 获取供应商列表
      const supplierAddresses = await getSuppliers();
      const suppliersData = await Promise.all(
        supplierAddresses.map(async (addr) => {
          const supplier = await getSupplier(addr);
          return { address: addr, ...supplier };
        })
      );
      setSuppliers(suppliersData.filter((s) => s !== null));

      // 获取支付记录
      const paymentsData = await getPayments();
      setPayments(paymentsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && isSepolia) {
      loadData();
    }
  }, [isConnected, isSepolia]);

  // 处理注册供应商
  const handleRegisterSupplier = async (formData) => {
    try {
      await registerSupplier(
        formData.name,
        formData.brand,
        formData.category,
        parseFloat(formData.profitMargin)
      );
      setShowRegisterModal(false);
      await loadData();
      return true;
    } catch (error) {
      console.error('注册供应商失败:', error);
      throw error;
    }
  };

  // 处理创建支付
  const handleCreatePayment = async (formData) => {
    try {
      await createPayment(formData.to, formData.category, formData.amount);
      setShowPaymentModal(false);
      await loadData();
      return true;
    } catch (error) {
      console.error('创建支付失败:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Payment Visualization</h1>
              <p className="text-sm text-gray-500 mt-1">Real-time payment network on Sepolia</p>
            </div>
            
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  {isSepolia ? (
                    <>
                      <button
                        onClick={() => setShowRegisterModal(true)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Users className="w-4 h-4 inline mr-2" />
                        Register Supplier
                      </button>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <Send className="w-4 h-4 inline mr-2" />
                        Create Payment
                      </button>
                      <button
                        onClick={loadData}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={switchToSepolia}
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                    >
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Switch to Sepolia
                    </button>
                  )}
                  <button
                    onClick={disconnect}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </button>
                </>
              ) : (
                <button
                  onClick={connect}
                  disabled={isConnecting || !isMetaMaskInstalled}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Wallet className="w-4 h-4 inline mr-2" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!isMetaMaskInstalled ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">需要安装 MetaMask</h2>
              <p className="text-gray-600 mb-6">
                请安装 MetaMask 浏览器扩展以使用支付可视化功能
              </p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg"
              >
                安装 MetaMask
              </a>
            </div>
          </div>
        ) : !isConnected ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-6">
                Please connect your MetaMask wallet to use the payment visualization system
              </p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        ) : !isSepolia ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Wrong Network</h2>
              <p className="text-gray-600 mb-6">
                Please switch to Sepolia Test Network to continue
              </p>
              <button
                onClick={switchToSepolia}
                className="px-6 py-3 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg"
              >
                Switch to Sepolia
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-sm text-gray-500 mb-1">Total Payments</div>
                <div className="text-3xl font-semibold text-gray-900">{stats.totalPayments}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-sm text-gray-500 mb-1">Total Amount</div>
                <div className="text-3xl font-semibold text-gray-900">
                  {parseFloat(stats.totalAmount).toFixed(4)} ETH
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-sm text-gray-500 mb-1">Suppliers</div>
                <div className="text-3xl font-semibold text-gray-900">{stats.supplierCount}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-sm text-gray-500 mb-1">Average Payment</div>
                <div className="text-3xl font-semibold text-gray-900">
                  {parseFloat(stats.averagePayment).toFixed(4)} ETH
                </div>
              </div>
            </div>

            {/* Visualization */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Network</h2>
              {suppliers.length > 0 ? (
                <PaymentNetworkGraph
                  mainWallet={account}
                  suppliers={suppliers}
                  payments={payments}
                />
              ) : (
                <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">No suppliers registered yet</p>
                    <button
                      onClick={() => setShowRegisterModal(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      Register First Supplier
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Suppliers List */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Suppliers ({suppliers.length})
              </h2>
              <div className="space-y-3">
                {suppliers.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No suppliers registered</p>
                ) : (
                  suppliers.map((supplier) => (
                    <div
                      key={supplier.address}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-sm text-gray-500">
                          {supplier.brand} • {supplier.category}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-1">
                          {supplier.address}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {parseFloat(supplier.totalReceived).toFixed(4)} ETH
                        </div>
                        <div className="text-sm text-gray-500">
                          Profit: {supplier.profitMargin}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
                <p className="text-sm text-gray-500 mt-1">{payments.length} transactions</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        From
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tx
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          No payment records yet
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">#{payment.id}</td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-600">
                            {payment.from.slice(0, 6)}...{payment.from.slice(-4)}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-600">
                            {payment.to.slice(0, 6)}...{payment.to.slice(-4)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {parseFloat(payment.amount).toFixed(4)} ETH
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{payment.category}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(payment.timestamp * 1000).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                payment.status === 'Completed'
                                  ? 'bg-green-100 text-green-800'
                                  : payment.status === 'Failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href={`https://sepolia.etherscan.io/tx/${payment.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TODO: Add modals for register supplier and create payment */}
    </div>
  );
}

