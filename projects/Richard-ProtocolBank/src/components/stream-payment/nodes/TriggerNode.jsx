import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Clock } from 'lucide-react'

export default memo(({ data, selected }) => {
  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px] ${
      selected ? 'border-blue-500' : 'border-blue-200'
    }`}>
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <Clock className="h-4 w-4 text-blue-600" />
        </div>
        <div className="font-medium text-sm text-gray-900">触发器</div>
      </div>
      <div className="text-xs text-gray-600">
        {data.triggerType === 'time' ? '时间触发' : '事件触发'}
      </div>
      {data.startTime && (
        <div className="text-xs text-gray-500 mt-1">
          {new Date(data.startTime).toLocaleString('zh-CN')}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500"
      />
    </div>
  )
})

