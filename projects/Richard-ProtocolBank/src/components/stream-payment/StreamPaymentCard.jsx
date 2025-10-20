import { Card, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Play, Pause, Trash2, Edit } from 'lucide-react'

export default function StreamPaymentCard({ stream, onEdit, onToggle, onDelete }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50'
      case 'paused':
        return 'text-yellow-600 bg-yellow-50'
      case 'completed':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return '运行中'
      case 'paused':
        return '已暂停'
      case 'completed':
        return '已完成'
      default:
        return '未知'
    }
  }

  return (
    <Card className="border border-gray-200 hover:border-gray-300 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900 mb-1">{stream.name}</h4>
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(stream.status)}`}>
                {getStatusText(stream.status)}
              </span>
              <span className="text-xs text-gray-500">
                创建于 {new Date(stream.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(stream)}>
              <Edit className="h-4 w-4 text-gray-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onToggle(stream)}>
              {stream.status === 'active' ? (
                <Pause className="h-4 w-4 text-gray-600" />
              ) : (
                <Play className="h-4 w-4 text-gray-600" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(stream)}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-500 mb-1">总支付</div>
            <div className="text-sm font-medium text-gray-900">
              {stream.currency} {stream.totalPaid || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">支付频率</div>
            <div className="text-sm font-medium text-gray-900">
              {stream.frequency || '每分钟'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">收款人</div>
            <div className="text-sm font-medium text-gray-900 truncate">
              {stream.recipientName || '未设置'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

