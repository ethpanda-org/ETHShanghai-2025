'use client';

import { useState } from 'react';

interface GridConfig {
  trading_pair: string;
  exchange: string;
  upper_price: number;
  lower_price: number;
  grid_count: number;
  total_amount: number;
  private_key: string;
}

interface TradingFormProps {
  onSubmit: (config: GridConfig) => void;
  isLoading: boolean;
}

export default function TradingForm({ onSubmit, isLoading }: TradingFormProps) {
  const [formData, setFormData] = useState<GridConfig>({
    trading_pair: 'ETH/USDC',
    exchange: 'uniswap',
    upper_price: 3000,
    lower_price: 2000,
    grid_count: 10,
    total_amount: 1000,
    private_key: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof GridConfig, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof GridConfig, string>> = {};

    if (!formData.trading_pair.trim()) {
      newErrors.trading_pair = '交易对不能为空';
    }
    if (!formData.private_key.trim()) {
      newErrors.private_key = '私钥不能为空';
    }
    if (formData.upper_price <= formData.lower_price) {
      newErrors.upper_price = '上限价格必须大于下限价格';
    }
    if (formData.grid_count <= 0) {
      newErrors.grid_count = '网格数量必须大于0';
    }
    if (formData.total_amount <= 0) {
      newErrors.total_amount = '总投资额必须大于0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof GridConfig, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 交易所选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            交易所选择
          </label>
          <select
            value={formData.exchange}
            onChange={(e) => handleInputChange('exchange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="uniswap">Uniswap V3</option>
            <option value="pancakeswap">PancakeSwap</option>
            <option value="sushiswap">SushiSwap</option>
          </select>
        </div>

        {/* 交易对 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            交易对
          </label>
          <input
            type="text"
            value={formData.trading_pair}
            onChange={(e) => handleInputChange('trading_pair', e.target.value)}
            placeholder="例如: ETH/USDC"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.trading_pair ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.trading_pair && (
            <p className="mt-1 text-sm text-red-600">{errors.trading_pair}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 价格区间 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            下限价格
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.lower_price}
            onChange={(e) => handleInputChange('lower_price', parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.lower_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.lower_price && (
            <p className="mt-1 text-sm text-red-600">{errors.lower_price}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            上限价格
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.upper_price}
            onChange={(e) => handleInputChange('upper_price', parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.upper_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.upper_price && (
            <p className="mt-1 text-sm text-red-600">{errors.upper_price}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 网格数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            网格数量
          </label>
          <input
            type="number"
            min="2"
            value={formData.grid_count}
            onChange={(e) => handleInputChange('grid_count', parseInt(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.grid_count ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.grid_count && (
            <p className="mt-1 text-sm text-red-600">{errors.grid_count}</p>
          )}
        </div>

        {/* 总投资额 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            总投资额
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.total_amount}
            onChange={(e) => handleInputChange('total_amount', parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.total_amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.total_amount && (
            <p className="mt-1 text-sm text-red-600">{errors.total_amount}</p>
          )}
        </div>
      </div>

      {/* 私钥 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          私钥 (用于交易签名)
        </label>
        <input
          type="password"
          value={formData.private_key}
          onChange={(e) => handleInputChange('private_key', e.target.value)}
          placeholder="请输入您的私钥"
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors.private_key ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {errors.private_key && (
          <p className="mt-1 text-sm text-red-600">{errors.private_key}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          ⚠️ 私钥仅用于本地交易签名，不会上传到服务器
        </p>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '启动中...' : '启动策略'}
        </button>
      </div>
    </form>
  );
}
