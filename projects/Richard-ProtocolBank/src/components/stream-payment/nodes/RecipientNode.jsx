import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { User } from 'lucide-react'

export default memo(({ data, selected }) => {
  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px] ${
      selected ? 'border-purple-500' : 'border-purple-200'
    }`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500"
      />
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <User className="h-4 w-4 text-purple-600" />
        </div>
        <div className="font-medium text-sm text-gray-900">收款人</div>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        {data.name && <div className="font-medium">{data.name}</div>}
        {data.address && (
          <div className="text-gray-500 truncate">
            {data.address.slice(0, 8)}...{data.address.slice(-6)}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  )
})

