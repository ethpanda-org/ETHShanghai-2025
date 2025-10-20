import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { X } from 'lucide-react'

export default function ConfigPanel({ node, onClose, onSave }) {
  const [formData, setFormData] = useState(node?.data || {})

  useEffect(() => {
    setFormData(node?.data || {})
  }, [node])

  if (!node) return null

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    onSave(node.id, formData)
    onClose()
  }

  const renderFields = () => {
    switch (node.type) {
      case 'trigger':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">触发类型</label>
              <select
                value={formData.triggerType || 'time'}
                onChange={(e) => handleChange('triggerType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="time">时间触发</option>
                <option value="event">事件触发</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
              <input
                type="datetime-local"
                value={formData.startTime || ''}
                onChange={(e) => handleChange('startTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )
      
      case 'payment':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">支付金额</label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">币种</label>
              <select
                value={formData.currency || 'USD'}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CNY">CNY</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">支付频率</label>
              <select
                value={formData.frequency || 'per_minute'}
                onChange={(e) => handleChange('frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="per_second">每秒</option>
                <option value="per_minute">每分钟</option>
                <option value="per_hour">每小时</option>
                <option value="per_day">每天</option>
              </select>
            </div>
          </>
        )
      
      case 'recipient':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">收款人名称</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="输入收款人名称"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">收款地址</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </>
        )
      
      case 'condition':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">条件类型</label>
              <select
                value={formData.conditionType || 'total_amount'}
                onChange={(e) => handleChange('conditionType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="total_amount">总金额达到</option>
                <option value="time_expire">时间到期</option>
                <option value="manual_stop">手动停止</option>
                <option value="balance_low">余额不足</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">条件值</label>
              <input
                type="text"
                value={formData.value || ''}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="输入条件值"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </>
        )
      
      case 'executor':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
            <select
              value={formData.status || 'pending'}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <option value="pending">待执行</option>
              <option value="active">运行中</option>
              <option value="paused">已暂停</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-white border-l border-gray-200 shadow-lg z-10">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">节点配置</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
        {renderFields()}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <Button onClick={handleSave} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white">
            保存
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            取消
          </Button>
        </div>
      </div>
    </div>
  )
}

