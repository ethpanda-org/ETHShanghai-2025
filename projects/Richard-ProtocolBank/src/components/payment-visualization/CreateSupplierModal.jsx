import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { X } from 'lucide-react'

export default function CreateSupplierModal({ onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    profitMargin: ''
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

    if (!formData.name.trim()) {
      newErrors.name = '请输入供应商名称'
    }

    if (!formData.brand.trim()) {
      newErrors.brand = '请输入品牌名称'
    }

    if (!formData.category) {
      newErrors.category = '请选择类别'
    }

    if (!formData.profitMargin) {
      newErrors.profitMargin = '请输入利润率'
    } else {
      const margin = parseFloat(formData.profitMargin)
      if (isNaN(margin) || margin < 0 || margin > 100) {
        newErrors.profitMargin = '利润率必须在 0-100 之间'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validate()) return

    onSubmit({
      name: formData.name.trim(),
      brand: formData.brand.trim(),
      category: formData.category,
      profitMargin: parseFloat(formData.profitMargin)
    })
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium text-gray-900">
            注册供应商
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                供应商名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.name ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="例如: 科技供应商 A"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                品牌名称 *
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.brand ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="例如: TechBrand"
                disabled={isLoading}
              />
              {errors.brand && (
                <p className="text-sm text-red-600 mt-1">{errors.brand}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                业务类别 *
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

            {/* Profit Margin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                利润率 (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.profitMargin}
                onChange={(e) => handleChange('profitMargin', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.profitMargin ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="例如: 15.00"
                disabled={isLoading}
              />
              {errors.profitMargin && (
                <p className="text-sm text-red-600 mt-1">{errors.profitMargin}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                输入 0-100 之间的数值,例如 15 表示 15%
              </p>
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
                {isLoading ? '注册中...' : '注册供应商'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

