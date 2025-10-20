import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import NetworkGraphD3 from '../components/network-payment/NetworkGraphD3';
import { Button } from '@/components/ui/button.jsx';

export default function NetworkPaymentPage() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 示例数据 - 1个中心节点 + 20个收款人
  const [recipients, setRecipients] = useState([
    { id: 'payer', name: 'My Company', type: 'payer', amount: 0, status: 'active' },
    { id: '1', name: 'Supplier A', type: 'recipient', amount: 5000, status: 'active', frequency: 'daily', token: 'USDT' },
    { id: '2', name: 'Supplier B', type: 'recipient', amount: 3200, status: 'active', frequency: 'weekly', token: 'ETH' },
    { id: '3', name: 'Supplier C', type: 'recipient', amount: 8500, status: 'active', frequency: 'monthly', token: 'USDC' },
    { id: '4', name: 'Supplier D', type: 'recipient', amount: 2100, status: 'paused', frequency: 'daily', token: 'DAI' },
    { id: '5', name: 'Supplier E', type: 'recipient', amount: 6700, status: 'active', frequency: 'weekly', token: 'USDT' },
    { id: '6', name: 'Supplier F', type: 'recipient', amount: 4300, status: 'active', frequency: 'monthly', token: 'ETH' },
    { id: '7', name: 'Supplier G', type: 'recipient', amount: 9200, status: 'active', frequency: 'daily', token: 'USDC' },
    { id: '8', name: 'Supplier H', type: 'recipient', amount: 1800, status: 'pending', frequency: 'weekly', token: 'USDT' },
    { id: '9', name: 'Supplier I', type: 'recipient', amount: 7600, status: 'active', frequency: 'monthly', token: 'DAI' },
    { id: '10', name: 'Supplier J', type: 'recipient', amount: 3900, status: 'active', frequency: 'daily', token: 'ETH' },
    { id: '11', name: 'Supplier K', type: 'recipient', amount: 5500, status: 'active', frequency: 'weekly', token: 'USDC' },
    { id: '12', name: 'Supplier L', type: 'recipient', amount: 2700, status: 'paused', frequency: 'monthly', token: 'USDT' },
    { id: '13', name: 'Supplier M', type: 'recipient', amount: 8100, status: 'active', frequency: 'daily', token: 'DAI' },
    { id: '14', name: 'Supplier N', type: 'recipient', amount: 4600, status: 'active', frequency: 'weekly', token: 'ETH' },
    { id: '15', name: 'Supplier O', type: 'recipient', amount: 6200, status: 'active', frequency: 'monthly', token: 'USDC' },
    { id: '16', name: 'Supplier P', type: 'recipient', amount: 3400, status: 'pending', frequency: 'daily', token: 'USDT' },
    { id: '17', name: 'Supplier Q', type: 'recipient', amount: 7800, status: 'active', frequency: 'weekly', token: 'DAI' },
    { id: '18', name: 'Supplier R', type: 'recipient', amount: 2300, status: 'active', frequency: 'monthly', token: 'ETH' },
    { id: '19', name: 'Supplier S', type: 'recipient', amount: 9500, status: 'active', frequency: 'daily', token: 'USDC' },
    { id: '20', name: 'Supplier T', type: 'recipient', amount: 4100, status: 'active', frequency: 'weekly', token: 'USDT' },
  ]);

  // 构建图数据
  const graphData = {
    nodes: recipients,
    links: recipients
      .filter(r => r.type === 'recipient')
      .map(r => ({
        source: 'payer',
        target: r.id,
        value: r.amount
      }))
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  // 统计数据
  const stats = {
    active: recipients.filter(r => r.status === 'active' && r.type === 'recipient').length,
    totalAmount: recipients.filter(r => r.type === 'recipient').reduce((sum, r) => sum + r.amount, 0),
    totalRecipients: recipients.filter(r => r.type === 'recipient').length,
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">活跃流支付</div>
          <div className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.active}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">总支付金额</div>
          <div className="text-3xl font-semibold text-gray-900 dark:text-gray-100">${(stats.totalAmount / 1000).toFixed(1)}k</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">收款人数量</div>
          <div className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.totalRecipients}</div>
        </div>
      </div>

      {/* 控制栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="搜索收款人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64 dark:text-gray-100"
            />
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          添加收款人
        </Button>
      </div>

      {/* 网络图 */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <NetworkGraphD3
          data={graphData}
          onNodeClick={handleNodeClick}
          selectedNode={selectedNode}
        />
      </div>

      {/* 节点详情（如果有选中的节点）*/}
      {selectedNode && selectedNode.type === 'recipient' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{selectedNode.name}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">支付金额</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">${selectedNode.amount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">支付频率</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{selectedNode.frequency}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">代币类型</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{selectedNode.token}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">状态</div>
              <div className={`text-xl font-semibold ${
                selectedNode.status === 'active' ? 'text-green-600' :
                selectedNode.status === 'paused' ? 'text-yellow-600' : 'text-blue-600'
              }`}>
                {selectedNode.status === 'active' ? '活跃中' :
                 selectedNode.status === 'paused' ? '已暂停' : '待启动'}
              </div>
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <Button variant="outline" className="dark:border-gray-600 dark:text-gray-300">编辑</Button>
            <Button variant="outline" className="dark:border-gray-600 dark:text-gray-300">
              {selectedNode.status === 'active' ? '暂停' : '启动'}
            </Button>
            <Button variant="outline" className="text-red-600 dark:text-red-400 dark:border-gray-600">删除</Button>
          </div>
        </div>
      )}
    </div>
  );
}

