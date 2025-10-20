import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Play } from 'lucide-react'

export default memo(({ data, selected }) => {
  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px] ${
      selected ? 'border-gray-500' : 'border-gray-200'
    }`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-500"
      />
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <Play className="h-4 w-4 text-gray-600" />
        </div>
        <div className="font-medium text-sm text-gray-900">执行器</div>
      </div>
      <div className="text-xs text-gray-600">
        {data.status === 'active' ? '运行中' : '待执行'}
      </div>
      {data.totalPaid && (
        <div className="text-xs text-gray-500 mt-1">
          已支付: ${data.totalPaid}
        </div>
      )}
    </div>
  )
})

