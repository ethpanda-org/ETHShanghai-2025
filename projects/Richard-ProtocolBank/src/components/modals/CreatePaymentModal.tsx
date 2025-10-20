import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useStreamPayment, useSuppliers, useSupplier } from '@/hooks/useStreamPayment';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreatePaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePaymentModal({ onClose, onSuccess }: CreatePaymentModalProps) {
  const { createPayment } = useStreamPayment();
  const { supplierAddresses } = useSuppliers();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    to: '',
    category: '',
    amount: '',
  });

  const selectedSupplier = useSupplier(formData.to as `0x${string}` | undefined);

  const categories = [
    '技术服务',
    '云计算',
    '原材料',
    '物流运输',
    '咨询服务',
    '设计服务',
    '营销推广',
    '其他',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.to || !formData.category || !formData.amount) {
      toast.error('请填写所有字段');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('金额必须大于 0');
      return;
    }

    try {
      setLoading(true);
      const hash = await createPayment(
        formData.to as `0x${string}`,
        formData.category,
        formData.amount
      );
      
      toast.success('支付创建成功!', {
        description: `交易哈希: ${hash.slice(0, 10)}...`,
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast.error('支付失败', {
        description: error.message || '请检查钱包余额和网络',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">创建支付</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              选择供应商 *
            </label>
            <select
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              disabled={loading}
            >
              <option value="">请选择供应商</option>
              {supplierAddresses.map((addr) => (
                <option key={addr} value={addr}>
                  {addr.slice(0, 6)}...{addr.slice(-4)}
                </option>
              ))}
            </select>
            {selectedSupplier && (
              <p className="text-xs text-cyan-400 mt-1">
                {selectedSupplier.name} - {selectedSupplier.brand}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              支付类别 *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              disabled={loading}
            >
              <option value="">请选择类别</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              支付金额 (ETH) *
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="例如: 0.5"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              输入要支付的 ETH 数量
            </p>
          </div>

          {formData.amount && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">支付金额:</span>
                <span className="text-white font-medium">{formData.amount} ETH</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              disabled={loading}
              variant="outline"
              className="flex-1 border-gray-700"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  支付中...
                </>
              ) : (
                '确认支付'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

