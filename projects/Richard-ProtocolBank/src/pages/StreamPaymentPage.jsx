import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Plus, ArrowLeft } from 'lucide-react'
import StreamPaymentCard from '@/components/stream-payment/StreamPaymentCard.jsx'
import FlowEditor from '@/components/stream-payment/FlowEditor.jsx'

export default function StreamPaymentPage() {
  const [view, setView] = useState('list') // 'list' or 'editor'
  const [streams, setStreams] = useState([
    {
      id: '1',
      name: '员工工资流支付',
      status: 'active',
      createdAt: Date.now() - 86400000 * 7,
      totalPaid: 25000,
      currency: 'USD',
      frequency: '每月',
      recipientName: 'John Doe',
      nodes: [],
      edges: [],
    },
    {
      id: '2',
      name: '供应商定期付款',
      status: 'paused',
      createdAt: Date.now() - 86400000 * 3,
      totalPaid: 8500,
      currency: 'EUR',
      frequency: '每周',
      recipientName: 'ABC Supplier',
      nodes: [],
      edges: [],
    },
  ])
  const [editingStream, setEditingStream] = useState(null)

  const handleCreateNew = () => {
    setEditingStream({
      id: `stream_${Date.now()}`,
      name: '新流支付',
      status: 'paused',
      createdAt: Date.now(),
      totalPaid: 0,
      currency: 'USD',
      frequency: '每分钟',
      recipientName: '',
      nodes: [],
      edges: [],
    })
    setView('editor')
  }

  const handleEdit = (stream) => {
    setEditingStream(stream)
    setView('editor')
  }

  const handleToggle = (stream) => {
    setStreams(streams.map(s => 
      s.id === stream.id 
        ? { ...s, status: s.status === 'active' ? 'paused' : 'active' }
        : s
    ))
  }

  const handleDelete = (stream) => {
    if (confirm(`确定要删除流支付"${stream.name}"吗？`)) {
      setStreams(streams.filter(s => s.id !== stream.id))
    }
  }

  const handleSaveFlow = (flowData) => {
    if (editingStream) {
      const updatedStream = {
        ...editingStream,
        nodes: flowData.nodes,
        edges: flowData.edges,
      }

      // Extract info from nodes
      const paymentNode = flowData.nodes.find(n => n.type === 'payment')
      const recipientNode = flowData.nodes.find(n => n.type === 'recipient')

      if (paymentNode) {
        updatedStream.currency = paymentNode.data.currency || 'USD'
        const freqMap = {
          per_second: '每秒',
          per_minute: '每分钟',
          per_hour: '每小时',
          per_day: '每天',
        }
        updatedStream.frequency = freqMap[paymentNode.data.frequency] || '每分钟'
      }

      if (recipientNode) {
        updatedStream.recipientName = recipientNode.data.name || '未设置'
      }

      // Check if it's a new stream or update
      const existingIndex = streams.findIndex(s => s.id === editingStream.id)
      if (existingIndex >= 0) {
        setStreams(streams.map(s => s.id === editingStream.id ? updatedStream : s))
      } else {
        setStreams([...streams, updatedStream])
      }

      alert('流支付已保存！')
      setView('list')
      setEditingStream(null)
    }
  }

  const handleBackToList = () => {
    if (confirm('确定要返回列表吗？未保存的更改将丢失。')) {
      setView('list')
      setEditingStream(null)
    }
  }

  if (view === 'editor') {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handleBackToList}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-medium text-gray-900">
                {editingStream?.name || '新流支付'}
              </h2>
              <p className="text-sm text-gray-500">配置流支付规则和参数</p>
            </div>
          </div>
        </div>
        <div className="flex-1 relative">
          <FlowEditor
            initialNodes={editingStream?.nodes || []}
            initialEdges={editingStream?.edges || []}
            onSave={handleSaveFlow}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-normal text-gray-900 mb-2">流支付管理</h2>
          <p className="text-sm text-gray-500">创建和管理自动化的连续支付流</p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建流支付
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">活跃流支付</div>
          <div className="text-2xl font-light text-gray-900">
            {streams.filter(s => s.status === 'active').length}
          </div>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">总支付金额</div>
          <div className="text-2xl font-light text-gray-900">
            ${streams.reduce((sum, s) => sum + (s.totalPaid || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">总流支付数</div>
          <div className="text-2xl font-light text-gray-900">{streams.length}</div>
        </div>
      </div>

      {/* Stream List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">我的流支付</h3>
        {streams.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 rounded-lg">
            <p className="text-gray-500 mb-4">还没有创建任何流支付</p>
            <Button onClick={handleCreateNew} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              创建第一个流支付
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {streams.map(stream => (
              <StreamPaymentCard
                key={stream.id}
                stream={stream}
                onEdit={handleEdit}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

