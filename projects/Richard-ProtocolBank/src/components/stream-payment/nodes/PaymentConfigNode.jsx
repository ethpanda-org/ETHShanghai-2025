import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { DollarSign } from 'lucide-react'

export default memo(({ data, selected }) => {
  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px] ${
      selected ? 'border-green-500' : 'border-green-200'
    }`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500"
      />
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-green-600" />
        </div>
        <div className="font-medium text-sm text-gray-900">支付配置</div>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <div>金额: {data.amount || '0'} {data.currency || 'USD'}</div>
        <div>频率: {data.frequency || '每分钟'}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  )
})

