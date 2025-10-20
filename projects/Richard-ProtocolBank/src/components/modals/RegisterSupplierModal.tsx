import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useStreamPayment } from '@/hooks/useStreamPayment';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RegisterSupplierModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegisterSupplierModal({ onClose, onSuccess }: RegisterSupplierModalProps) {
  const { registerSupplier } = useStreamPayment();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    profitMargin: '',
  });

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
    
    if (!formData.name || !formData.brand || !formData.category || !formData.profitMargin) {
      toast.error('请填写所有字段');
      return;
    }

    const margin = parseFloat(formData.profitMargin);
    if (isNaN(margin) || margin < 0 || margin > 100) {
      toast.error('利润率必须在 0-100 之间');
      return;
    }

    try {
      setLoading(true);
      const hash = await registerSupplier(
        formData.name,
        formData.brand,
        formData.category,
        margin
      );
      
      toast.success('供应商注册成功!', {
        description: `交易哈希: ${hash.slice(0, 10)}...`,
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error registering supplier:', error);
      toast.error('注册失败', {
        description: error.message || '请检查钱包连接和网络',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">注册供应商</h2>
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
              供应商名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="例如: 科技供应商 A"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              品牌名称 *
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="例如: TechBrand"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              业务类别 *
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
              利润率 (%) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.profitMargin}
              onChange={(e) => setFormData({ ...formData, profitMargin: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="例如: 15.00"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              输入 0-100 之间的数值
            </p>
          </div>

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
                  注册中...
                </>
              ) : (
                '注册供应商'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

