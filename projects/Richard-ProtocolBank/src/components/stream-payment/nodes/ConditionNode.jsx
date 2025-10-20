import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { AlertCircle } from 'lucide-react'

export default memo(({ data, selected }) => {
  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px] ${
      selected ? 'border-yellow-500' : 'border-yellow-200'
    }`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-yellow-500"
      />
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
        </div>
        <div className="font-medium text-sm text-gray-900">条件</div>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <div>{data.conditionType || '停止条件'}</div>
        {data.value && <div className="text-gray-500">{data.value}</div>}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-yellow-500"
      />
    </div>
  )
})

