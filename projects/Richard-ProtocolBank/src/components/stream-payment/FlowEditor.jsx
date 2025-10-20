import { useState, useCallback, useRef } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button.jsx'
import { Clock, DollarSign, User, AlertCircle, Play, Save } from 'lucide-react'
import TriggerNode from './nodes/TriggerNode.jsx'
import PaymentConfigNode from './nodes/PaymentConfigNode.jsx'
import RecipientNode from './nodes/RecipientNode.jsx'
import ConditionNode from './nodes/ConditionNode.jsx'
import ExecutorNode from './nodes/ExecutorNode.jsx'
import ConfigPanel from './ConfigPanel.jsx'

const nodeTypes = {
  trigger: TriggerNode,
  payment: PaymentConfigNode,
  recipient: RecipientNode,
  condition: ConditionNode,
  executor: ExecutorNode,
}

let nodeId = 0
const getId = () => `node_${nodeId++}`

export default function FlowEditor({ initialNodes = [], initialEdges = [], onSave }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState(null)
  const reactFlowWrapper = useRef(null)

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const addNode = useCallback((type) => {
    const newNode = {
      id: getId(),
      type,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: getDefaultNodeData(type),
    }
    setNodes((nds) => nds.concat(newNode))
  }, [setNodes])

  const getDefaultNodeData = (type) => {
    switch (type) {
      case 'trigger':
        return { triggerType: 'time', startTime: '' }
      case 'payment':
        return { amount: '', currency: 'USD', frequency: 'per_minute' }
      case 'recipient':
        return { name: '', address: '' }
      case 'condition':
        return { conditionType: 'total_amount', value: '' }
      case 'executor':
        return { status: 'pending', totalPaid: 0 }
      default:
        return {}
    }
  }

  const handleConfigSave = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } }
        }
        return node
      })
    )
  }, [setNodes])

  const handleSaveFlow = () => {
    const flowData = {
      nodes,
      edges,
    }
    onSave(flowData)
  }

  return (
    <div className="relative w-full h-full">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md p-2 space-y-2">
        <div className="text-xs font-medium text-gray-500 px-2 mb-2">添加节点</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addNode('trigger')}
          className="w-full justify-start space-x-2"
        >
          <Clock className="h-4 w-4 text-blue-600" />
          <span>触发器</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addNode('payment')}
          className="w-full justify-start space-x-2"
        >
          <DollarSign className="h-4 w-4 text-green-600" />
          <span>支付配置</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addNode('recipient')}
          className="w-full justify-start space-x-2"
        >
          <User className="h-4 w-4 text-purple-600" />
          <span>收款人</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addNode('condition')}
          className="w-full justify-start space-x-2"
        >
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span>条件</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addNode('executor')}
          className="w-full justify-start space-x-2"
        >
          <Play className="h-4 w-4 text-gray-600" />
          <span>执行器</span>
        </Button>
      </div>

      {/* Save Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={handleSaveFlow}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          保存流程
        </Button>
      </div>

      {/* React Flow Canvas */}
      <div ref={reactFlowWrapper} className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Config Panel */}
      {selectedNode && (
        <ConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSave={handleConfigSave}
        />
      )}
    </div>
  )
}

