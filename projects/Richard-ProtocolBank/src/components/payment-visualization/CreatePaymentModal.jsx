import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { X, AlertCircle } from 'lucide-react'

export default function CreatePaymentModal({ onClose, onSubmit, suppliers, isLoading }) {
  const [formData, setFormData] = useState({
    toAddress: '',
    category: '',
    amount: ''
  })

  const [errors, setErrors] = useState({})

  const categories = [
    '技术服务',
    '云计算',
    '原材料',
    '物流运输',
    '咨询服务',
    '设计服务',
    '营销推广',
    '其他'
  ]

  const validate = () => {
    const newErrors = {}

    if (!formData.toAddress) {
      newErrors.toAddress = '请选择供应商'
    }

    if (!formData.category) {
      newErrors.category = '请选择类别'
    }

    if (!formData.amount) {
      newErrors.amount = '请输入支付金额'
    } else {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = '支付金额必须大于 0'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validate()) return

    onSubmit({
      toAddress: formData.toAddress,
      category: formData.category,
      amount: parseFloat(formData.amount)
    })
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const selectedSupplier = suppliers.find(s => s.fullAddress === formData.toAddress)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium text-gray-900">
            创建支付
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">还没有注册的供应商</p>
              <p className="text-sm text-gray-500">请先注册供应商后再创建支付</p>
              <Button
                onClick={onClose}
                className="mt-4 bg-gray-900 hover:bg-gray-800"
              >
                关闭
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择供应商 *
                </label>
                <select
                  value={formData.toAddress}
                  onChange={(e) => handleChange('toAddress', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                    errors.toAddress ? 'border-red-500' : 'border-gray-200'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">请选择供应商</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.fullAddress}>
                      {supplier.name} ({supplier.brand})
                    </option>
                  ))}
                </select>
                {errors.toAddress && (
                  <p className="text-sm text-red-600 mt-1">{errors.toAddress}</p>
                )}
                {selectedSupplier && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>品牌: <span className="text-gray-900">{selectedSupplier.brand}</span></div>
                      <div>类别: <span className="text-gray-900">{selectedSupplier.category}</span></div>
                      <div>地址: <span className="text-gray-900 font-mono">{selectedSupplier.address}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  支付类别 *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                    errors.category ? 'border-red-500' : 'border-gray-200'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">请选择类别</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-sm text-red-600 mt-1">{errors.category}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  支付金额 (ETH) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                    errors.amount ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="例如: 1.5"
                  disabled={isLoading}
                />
                {errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  请确保钱包中有足够的 ETH 和 Gas 费用
                </p>
              </div>

              {/* Warning */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-700">
                    <p className="font-medium mb-1">注意事项:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>此操作将从您的钱包扣除 ETH</li>
                      <li>交易需要支付 Gas 费用</li>
                      <li>交易确认后无法撤销</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gray-900 hover:bg-gray-800"
                >
                  {isLoading ? '支付中...' : '确认支付'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

