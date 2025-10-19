'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ExternalLink,
  AlertCircle
} from 'lucide-react'
import { getTransactionUrl } from '@/lib/contracts'

interface ReleaseStatusProps {
  orderId: string
}

interface ReleaseRequest {
  id: string
  order_id: string
  sender_email: string
  request_status: 'pending' | 'processing' | 'completed' | 'failed'
  transaction_hash: string | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}

export function ReleaseStatus({ orderId }: ReleaseStatusProps) {
  // 查询最新的放款请求
  const { data: releaseRequest, isLoading } = useQuery<ReleaseRequest | null>({
    queryKey: ['release-request', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_requests')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching release request:', error)
        return null
      }

      return data
    },
    // 如果状态是 processing，每 10 秒轮询一次
    refetchInterval: (data) => {
      if (data?.request_status === 'processing' || data?.request_status === 'pending') {
        return 10000 // 10 seconds
      }
      return false
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>放款状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // 如果没有放款请求
  if (!releaseRequest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>放款状态</CardTitle>
          <CardDescription>
            暂无放款请求记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <AlertCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <p>
              请先发送放款指令邮件。我们将在收到邮件后开始处理您的放款请求。
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 状态图标和颜色映射
  const statusConfig = {
    pending: {
      icon: <Clock className="h-5 w-5" />,
      color: 'bg-teal-100 text-teal-800 border-teal-200',
      label: '待处理',
      description: '已收到您的放款指令，正在进行验证...',
    },
    processing: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      label: '处理中',
      description: '验证通过，正在执行链上交易...',
    },
    completed: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      label: '已完成',
      description: '放款成功！资金已转至收款方账户。',
    },
    failed: {
      icon: <XCircle className="h-5 w-5" />,
      color: 'bg-red-100 text-red-800 border-red-200',
      label: '失败',
      description: '放款处理失败，请查看错误信息并重新尝试。',
    },
  }

  const config = statusConfig[releaseRequest.request_status]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>放款状态</CardTitle>
          <Badge variant="outline" className={`${config.color}`}>
            {config.icon}
            <span className="ml-2">{config.label}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 状态描述 */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.color.replace('text-', 'bg-').replace('border-', 'bg-')}`}>
            {config.icon}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {config.description}
            </p>
            <p className="text-xs text-gray-500">
              请求时间: {new Date(releaseRequest.created_at).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        {/* 错误信息 */}
        {releaseRequest.request_status === 'failed' && releaseRequest.error_message && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm font-medium text-red-900 mb-1">错误原因：</p>
            <p className="text-sm text-red-700">{releaseRequest.error_message}</p>
          </div>
        )}

        {/* 交易哈希 */}
        {releaseRequest.transaction_hash && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
            <p className="text-sm font-medium text-gray-700 mb-2">交易哈希：</p>
            <a
              href={getTransactionUrl(releaseRequest.transaction_hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-mono break-all"
            >
              {releaseRequest.transaction_hash.slice(0, 10)}...
              {releaseRequest.transaction_hash.slice(-8)}
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
            </a>
          </div>
        )}

        {/* 处理时间 */}
        {releaseRequest.processed_at && (
          <p className="text-xs text-gray-500">
            处理完成时间: {new Date(releaseRequest.processed_at).toLocaleString('zh-CN')}
          </p>
        )}

        {/* 处理中提示 */}
        {(releaseRequest.request_status === 'pending' || 
          releaseRequest.request_status === 'processing') && (
          <div className="rounded-lg bg-teal-50 border border-teal-200 p-3">
            <p className="text-sm text-teal-800">
              ⏱️ 正在处理中，预计需要 5-10 分钟。页面将自动更新状态，请耐心等待。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

