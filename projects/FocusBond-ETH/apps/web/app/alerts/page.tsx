'use client'

import { useState } from 'react'

type AlertType = 'priorityA' | 'priorityB'
type AlertStatus = 'pending' | 'dismissed' | 'viewed'

interface Alert {
  id: string
  type: AlertType
  title: string
  description: string
  timestamp: Date
  status: AlertStatus
  actionRequired?: boolean
  breakFee?: number
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'priorityA',
      title: '🚨 白名单地址活动',
      description: '你关注的 KOL 地址 0x742... 执行了 500 ETH 的 Swap 操作',
      timestamp: new Date(),
      status: 'pending',
      actionRequired: true,
      breakFee: 5
    },
    {
      id: '2',
      type: 'priorityA',
      title: '🆕 新池创建',
      description: 'Uniswap V3 创建了新交易对 ETH/USDC，流动性 2M',
      timestamp: new Date(Date.now() - 300000),
      status: 'pending',
      actionRequired: true,
      breakFee: 3
    },
    {
      id: '3',
      type: 'priorityB',
      title: '📊 市场波动',
      description: 'ETH 价格在 15 分钟内波动 2.3%',
      timestamp: new Date(Date.now() - 900000),
      status: 'pending'
    }
  ])

  const [settings, setSettings] = useState({
    priorityAEnabled: true,
    priorityBEnabled: true,
    breakFee: 5,
    refundCoupons: 2,
    whitelistAddresses: ['0x742d35Cc6634C0532925a3b8D'],
    keywords: ['meme', 'airdrop', 'launch'],
    minAmount: 100000, // 100K USD
    maxSlippage: 5 // 5%
  })

  const handleAlertAction = (alertId: string, action: 'dismiss' | 'view') => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: action === 'dismiss' ? 'dismissed' : 'viewed' }
        : alert
    ))
  }

  const addWhitelistAddress = (address: string) => {
    if (address && !settings.whitelistAddresses.includes(address)) {
      setSettings(prev => ({
        ...prev,
        whitelistAddresses: [...prev.whitelistAddresses, address]
      }))
    }
  }

  const removeWhitelistAddress = (address: string) => {
    setSettings(prev => ({
      ...prev,
      whitelistAddresses: prev.whitelistAddresses.filter(addr => addr !== address)
    }))
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔔 专注打 Meme</h1>
          <p className="text-[#e0e0e0]">两层通知体系，不错过重要链上信号</p>
        </div>

        {/* 实时警报 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">🚨 实时警报</h2>
          <div className="space-y-4">
            {alerts.filter(alert => alert.status === 'pending').map(alert => (
              <div 
                key={alert.id}
                className={`p-4 rounded-xl border-2 ${
                  alert.type === 'priorityA' 
                    ? 'bg-[#ff4757] bg-opacity-10 border-[#ff4757]' 
                    : 'bg-[#00a8ff] bg-opacity-10 border-[#00a8ff]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{alert.title}</h3>
                    <p className="text-[#e0e0e0] mb-2">{alert.description}</p>
                    <span className="text-sm text-[#a0a0a0]">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {alert.type === 'priorityA' && alert.actionRequired && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleAlertAction(alert.id, 'dismiss')}
                        className="px-4 py-2 bg-[#16213e] text-white rounded-lg hover:bg-[#0f3460] transition-colors"
                      >
                        稍后再看
                      </button>
                      <button
                        onClick={() => handleAlertAction(alert.id, 'view')}
                        className="px-4 py-2 bg-[#00b894] text-white rounded-lg hover:bg-[#00a085] transition-colors"
                      >
                        立即查看 {alert.breakFee && `(-${alert.breakFee} FOCUS)`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {alerts.filter(alert => alert.status === 'pending').length === 0 && (
              <div className="text-center py-8 text-[#e0e0e0]">
                <div className="text-4xl mb-2">🎯</div>
                <p>暂无新警报</p>
                <p className="text-sm">专注模式中，重要信号会实时推送</p>
              </div>
            )}
          </div>
        </div>

        {/* 设置面板 */}
        <div className="bg-[#0f3460] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6">⚙️ 监控设置</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* 通知类型设置 */}
            <div>
              <h3 className="font-semibold mb-4">通知类型</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.priorityAEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, priorityAEnabled: e.target.checked }))}
                    className="w-4 h-4 text-[#00a8ff] bg-[#16213e] border-[#00a8ff] rounded"
                  />
                  <span>优先级 A - 即刻打断型</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.priorityBEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, priorityBEnabled: e.target.checked }))}
                    className="w-4 h-4 text-[#00a8ff] bg-[#16213e] border-[#00a8ff] rounded"
                  />
                  <span>优先级 B - 汇总 Digest</span>
                </label>
              </div>
            </div>

            {/* 中断费用设置 */}
            <div>
              <h3 className="font-semibold mb-4">中断设置</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">中断费用 (FOCUS)</label>
                  <input
                    type="number"
                    value={settings.breakFee}
                    onChange={(e) => setSettings(prev => ({ ...prev, breakFee: parseInt(e.target.value) }))}
                    className="w-full p-2 bg-[#16213e] border border-[#00a8ff] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">返还券数量</label>
                  <input
                    type="number"
                    value={settings.refundCoupons}
                    onChange={(e) => setSettings(prev => ({ ...prev, refundCoupons: parseInt(e.target.value) }))}
                    className="w-full p-2 bg-[#16213e] border border-[#00a8ff] rounded-lg text-white"
                  />
                </div>
              </div>
            </div>

            {/* 白名单地址 */}
            <div>
              <h3 className="font-semibold mb-4">白名单地址</h3>
              <div className="space-y-2">
                {settings.whitelistAddresses.map(address => (
                  <div key={address} className="flex items-center justify-between bg-[#16213e] p-2 rounded">
                    <span className="text-sm font-mono">{address}</span>
                    <button
                      onClick={() => removeWhitelistAddress(address)}
                      className="text-[#ff4757] hover:text-[#ff3838]"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  placeholder="添加新地址 (0x...)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addWhitelistAddress((e.target as HTMLInputElement).value)
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }}
                  className="w-full p-2 bg-[#16213e] border border-[#00a8ff] rounded-lg text-white text-sm"
                />
              </div>
            </div>

            {/* 关键词监控 */}
            <div>
              <h3 className="font-semibold mb-4">关键词监控</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">监控关键词</label>
                  <input
                    type="text"
                    value={settings.keywords.join(', ')}
                    onChange={(e) => setSettings(prev => ({ ...prev, keywords: e.target.value.split(', ') }))}
                    className="w-full p-2 bg-[#16213e] border border-[#00a8ff] rounded-lg text-white"
                    placeholder="meme, airdrop, launch"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">最小金额阈值 (USD)</label>
                  <input
                    type="number"
                    value={settings.minAmount}
                    onChange={(e) => setSettings(prev => ({ ...prev, minAmount: parseInt(e.target.value) }))}
                    className="w-full p-2 bg-[#16213e] border border-[#00a8ff] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">最大滑点 (%)</label>
                  <input
                    type="number"
                    value={settings.maxSlippage}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxSlippage: parseInt(e.target.value) }))}
                    className="w-full p-2 bg-[#16213e] border border-[#00a8ff] rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="mt-6 text-center">
            <button className="bg-[#00a8ff] hover:bg-[#0097e6] text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300">
              保存设置
            </button>
          </div>
        </div>

        {/* 历史记录 */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">📋 历史警报</h2>
          <div className="space-y-2">
            {alerts.filter(alert => alert.status !== 'pending').map(alert => (
              <div key={alert.id} className="p-3 bg-[#16213e] rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{alert.title}</h4>
                  <p className="text-sm text-[#e0e0e0]">{alert.description}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm ${
                    alert.status === 'viewed' ? 'text-[#00b894]' : 'text-[#ff4757]'
                  }`}>
                    {alert.status === 'viewed' ? '已查看' : '已忽略'}
                  </span>
                  <div className="text-xs text-[#a0a0a0]">
                    {alert.timestamp.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}