import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Send, ArrowDownLeft, Clock, CheckCircle, XCircle, DollarSign, Euro, PoundSterling, Waves } from 'lucide-react'
import StreamPaymentPage from './StreamPaymentPage.jsx'
import NetworkPaymentPage from './NetworkPaymentPage.jsx'

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('regular') // 'regular' or 'stream'
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')

  const currencies = [
    { code: 'USD', name: 'US Dollar', icon: DollarSign, flag: '🇺🇸', network: 'Fedwire/CHIPS' },
    { code: 'EUR', name: 'Euro', icon: Euro, flag: '🇪🇺', network: 'TARGET2' },
    { code: 'GBP', name: 'British Pound', icon: PoundSterling, flag: '🇬🇧', network: 'CHAPS' },
    { code: 'CNY', name: 'Chinese Yuan', icon: DollarSign, flag: '🇨🇳', network: 'CIPS' }
  ]

  const recentPayments = [
    { id: 1, recipient: 'ABC Corporation', amount: 25000, currency: 'USD', status: 'completed', time: '2 hours ago', network: 'Fedwire' },
    { id: 2, recipient: 'European Supplier Ltd', amount: 18500, currency: 'EUR', status: 'pending', time: '5 hours ago', network: 'TARGET2' },
    { id: 3, recipient: 'UK Trading Co', amount: 12300, currency: 'GBP', status: 'completed', time: 'Yesterday', network: 'CHAPS' },
    { id: 4, recipient: 'Shanghai Import Export', amount: 45000, currency: 'CNY', status: 'completed', time: '2 days ago', network: 'CIPS' },
    { id: 5, recipient: 'Global Tech Inc', amount: 8900, currency: 'USD', status: 'failed', time: '3 days ago', network: 'CHIPS' }
  ]

  const handleSendPayment = () => {
    if (!amount || !recipient) {
      alert('Please fill in all fields')
      return
    }
    alert(`Sending ${selectedCurrency} ${amount} to ${recipient} via ${currencies.find(c => c.code === selectedCurrency)?.network}`)
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />
      default: return null
    }
  }

  // If stream tab is active, show StreamPaymentPage
  if (activeTab === 'stream') {
    return <StreamPaymentPage />
  }

  // If network tab is active, show NetworkPaymentPage
  if (activeTab === 'network') {
    return <NetworkPaymentPage />
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('regular')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'regular'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>常规支付</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('stream')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'stream'
                ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Waves className="h-4 w-4" />
              <span>流支付</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'network'
                ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Waves className="h-4 w-4" />
              <span>网络支付</span>
            </div>
          </button>
        </nav>
      </div>

      <div>
        <h2 className="text-2xl font-normal text-gray-900 mb-2">Cross-Border Payments</h2>
        <p className="text-sm text-gray-500">Send and receive payments globally with real-time settlement</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Payment Form */}
        <div className="lg:col-span-2">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Send className="h-5 w-5 text-gray-700" />
                <h3 className="text-lg font-medium text-gray-900">Send Payment</h3>
              </div>

              {/* Currency Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Currency & Network</label>
                <div className="grid grid-cols-2 gap-3">
                  {currencies.map((currency) => {
                    const Icon = currency.icon
                    return (
                      <button
                        key={currency.code}
                        onClick={() => setSelectedCurrency(currency.code)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedCurrency === currency.code
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{currency.flag}</span>
                            <Icon className="h-4 w-4 text-gray-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{currency.code}</span>
                        </div>
                        <div className="text-xs text-gray-500">{currency.name}</div>
                        <div className="text-xs text-gray-400 mt-1">via {currency.network}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
                    {selectedCurrency === 'USD' ? '$' : selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'GBP' ? '£' : '¥'}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-lg"
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Transaction fee: 0.1% • Estimated time: 2-5 minutes
                </div>
              </div>

              {/* Recipient Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter recipient name or account"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <Button 
                onClick={handleSendPayment}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Payment
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Payment Stats */}
        <div className="space-y-4">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-sm text-gray-500 mb-1">Total Sent (30 days)</div>
              <div className="text-2xl font-light text-gray-900">$284,500</div>
              <div className="text-xs text-green-600 mt-1">↑ 23% from last month</div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-sm text-gray-500 mb-1">Total Received</div>
              <div className="text-2xl font-light text-gray-900">$156,200</div>
              <div className="text-xs text-green-600 mt-1">↑ 15% from last month</div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-sm text-gray-500 mb-1">Avg. Settlement Time</div>
              <div className="text-2xl font-light text-gray-900">3.2 min</div>
              <div className="text-xs text-gray-500 mt-1">vs 2-5 days traditional</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Payments */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Payments</h3>
          <div className="space-y-3">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(payment.status)}
                  <div>
                    <div className="font-medium text-gray-900">{payment.recipient}</div>
                    <div className="text-sm text-gray-500">{payment.network} • {payment.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    {payment.currency === 'USD' ? '$' : payment.currency === 'EUR' ? '€' : payment.currency === 'GBP' ? '£' : '¥'}
                    {payment.amount.toLocaleString()}
                  </div>
                  <div className={`text-sm capitalize ${
                    payment.status === 'completed' ? 'text-green-600' :
                    payment.status === 'pending' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {payment.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

