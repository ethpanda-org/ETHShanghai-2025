import React, { useState } from 'react';
import { ArrowPathIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useRingVRM } from '@/hooks/useRingVRM';
import { RangeDisplay } from '@/components/privacy/RangeDisplay';

interface RingVRMOrderFormProps {
  onSubmit?: (order: any) => void;
  className?: string;
}

export function RingVRMOrderForm({ onSubmit, className = '' }: RingVRMOrderFormProps) {
  const [formData, setFormData] = useState({
    symbol: 'ETH-USD',
    side: 'buy' as 'buy' | 'sell',
    amount: '',
    priceRange: { min: '', max: '' },
    useMixing: true,
    mixDepth: 3,
    privateKey: ''
  });

  const [outputAddresses, setOutputAddresses] = useState(['', '']);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { submitOrderWithRingVRM, isMixing, privacyScore, activePool } = useRingVRM({
    enableMixing: formData.useMixing
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount) {
      alert('Please enter an amount');
      return;
    }

    try {
      const result = await submitOrderWithRingVRM({
        symbol: formData.symbol,
        side: formData.side,
        amount: formData.amount,
        priceRange: formData.priceRange.min && formData.priceRange.max ? formData.priceRange : undefined,
        privateKey: formData.useMixing ? formData.privateKey : undefined
      });

      if (result) {
        onSubmit?.(result);

        // Reset form
        setFormData(prev => ({
          ...prev,
          amount: '',
          priceRange: { min: '', max: '' },
          privateKey: ''
        }));
        setOutputAddresses(['', '']);
      }
    } catch (error) {
      console.error('Order submission failed:', error);
    }
  };

  const handleAddOutputAddress = () => {
    setOutputAddresses([...outputAddresses, '']);
  };

  const handleRemoveOutputAddress = (index: number) => {
    setOutputAddresses(outputAddresses.filter((_, i) => i !== index));
  };

  const handleOutputAddressChange = (index: number, value: string) => {
    const newAddresses = [...outputAddresses];
    newAddresses[index] = value;
    setOutputAddresses(newAddresses);
  };

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-800 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <ShieldCheckIcon className="h-6 w-6 text-blue-500 mr-2" />
          Ring VRM Protected Order
        </h2>
        {privacyScore > 60 && (
          <span className="text-sm text-green-400">
            Privacy Score: {privacyScore}%
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trading Pair
            </label>
            <select
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ETH-USD">ETH-USD</option>
              <option value="BTC-USD">BTC-USD</option>
              <option value="USDC-USD">USDC-USD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Order Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="buy"
                  checked={formData.side === 'buy'}
                  onChange={(e) => setFormData({ ...formData, side: 'buy' })}
                  className="mr-2 text-blue-500"
                />
                <span className="text-green-400">Buy</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="sell"
                  checked={formData.side === 'sell'}
                  onChange={(e) => setFormData({ ...formData, side: 'sell' })}
                  className="mr-2 text-blue-500"
                />
                <span className="text-red-400">Sell</span>
              </label>
            </div>
          </div>
        </div>

        {/* Amount with Range Display */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            {formData.amount && (
              <div className="absolute right-3 top-2.5">
                <RangeDisplay
                  value={formData.amount}
                  unit="ETH"
                  precision="medium"
                />
              </div>
            )}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Price Range (Optional)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={formData.priceRange.min}
              onChange={(e) => setFormData({
                ...formData,
                priceRange: { ...formData.priceRange, min: e.target.value }
              })}
              placeholder="Min"
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={formData.priceRange.max}
              onChange={(e) => setFormData({
                ...formData,
                priceRange: { ...formData.priceRange, max: e.target.value }
              })}
              placeholder="Max"
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Ring VRM Toggle */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-medium">Enable Ring VRM Mixing</h3>
              <p className="text-sm text-gray-400">
                Protect your transaction with ring signatures
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, useMixing: !formData.useMixing })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.useMixing ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.useMixing ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {formData.useMixing && (
            <div className="space-y-4">
              {activePool && (
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-400">
                      ✓ Pool {activePool.id.slice(0, 8)}... ready
                    </span>
                    <span className="text-xs text-gray-400">
                      {activePool.anonymitySet.length} members
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mix Depth
                </label>
                <select
                  value={formData.mixDepth}
                  onChange={(e) => setFormData({ ...formData, mixDepth: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>Level 1 (Fast)</option>
                  <option value={2}>Level 2 (Balanced)</option>
                  <option value={3}>Level 3 (Recommended)</option>
                  <option value={4}>Level 4 (High Privacy)</option>
                  <option value={5}>Level 5 (Maximum)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Private Key (for ring signature)
                </label>
                <input
                  type="password"
                  value={formData.privateKey}
                  onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                  placeholder="Enter your private key"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Your key never leaves your browser and is used only for signing
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>

          {showAdvanced && formData.useMixing && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Output Addresses (for mixed funds)
                </label>
                {outputAddresses.map((address, index) => (
                  <div key={index} className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => handleOutputAddressChange(index, e.target.value)}
                      placeholder={`Output address ${index + 1}`}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    {outputAddresses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOutputAddress(index)}
                        className="px-3 py-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900/70 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOutputAddress}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  + Add Output Address
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            {formData.useMixing && (
              <>
                <ShieldCheckIcon className="h-4 w-4 text-green-400" />
                <span>Ring VRM Protected</span>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={isMixing || !formData.amount || (formData.useMixing && !formData.privateKey)}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isMixing ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                <span>Mixing...</span>
              </>
            ) : (
              <span>Place Order</span>
            )}
          </button>
        </div>

        {/* Warning */}
        {formData.useMixing && !formData.privateKey && (
          <div className="flex items-start space-x-2 text-yellow-400 text-sm">
            <ExclamationTriangleIcon className="h-5 w-5 mt-0.5" />
            <p>
              Private key is required for Ring VRM protection. Your key is used locally to generate ring signatures and never transmitted.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}