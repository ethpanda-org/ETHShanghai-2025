'use client'

import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ExternalLink, 
  Mail, 
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { ContractWithCamelCase as Contract } from '@/lib/db'
import { 
  OrderStatus, 
  OrderStatusText,
  getTransactionUrl
} from '@/lib/contracts'
import { AddressDisplay } from './AddressDisplay'
import { ReleaseInstructionsDialog } from './ReleaseInstructionsDialog'
import { ReleaseStatus } from './ReleaseStatus'

interface ContractDetailsProps {
  contract: Contract
}

export function ContractDetails({ contract }: ContractDetailsProps) {
  const { address } = useAccount()

  // 判断当前用户是否为付款方
  const isSender = address?.toLowerCase() === contract.senderAddress.toLowerCase()

  // 格式化时间
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 渲染状态标签
  const renderStatusBadge = () => {
    const statusEnum = contract.status as unknown as OrderStatus
    
    if (contract.status === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors bg-amber-500 text-white hover:bg-amber-600">
          <Clock className="h-3.5 w-3.5" />
          {OrderStatusText[statusEnum]}
        </span>
      )
    }
    
    if (contract.status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors bg-emerald-500 text-white hover:bg-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {OrderStatusText[statusEnum]}
        </span>
      )
    }
    
    if (contract.status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors bg-slate-500 text-white hover:bg-slate-600">
          <XCircle className="h-3.5 w-3.5" />
          {OrderStatusText[statusEnum]}
        </span>
      )
    }
    
    return null
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">托管订单详情</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-gray-600 font-mono">#{contract.orderId}</span>
          {renderStatusBadge()}
        </div>
      </div>

      {/* Grid Layout: Info (Left) + Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        {/* Left: Main Info */}
        <div className="space-y-6">
          {/* 交易信息 */}
          <Card>
            <CardHeader>
              <CardTitle>交易信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 付款方 */}
              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">付款方</div>
                <AddressDisplay address={contract.senderAddress} />
                {isSender && (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 mt-1">
                    您
                  </span>
                )}
              </div>

              <Separator />

              {/* 收款方 */}
              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">收款方</div>
                <AddressDisplay address={contract.receiverAddress} />
              </div>

              <Separator />

              {/* 托管金额 */}
              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">托管金额</div>
                <div className="text-2xl font-bold text-gray-900">
                  {parseFloat(contract.amount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}
                  <span className="ml-2 text-lg font-normal text-gray-500">USDT</span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  ≈ ${parseFloat(contract.amount).toFixed(2)} USD
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 验证信息 */}
          <Card>
            <CardHeader>
              <CardTitle>验证信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">验证方式</div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>邮箱验证</span>
                </div>
              </div>

              {contract.verificationEmail && (
                <>
                  <Separator />
                  <div>
                    <div className="mb-1 text-sm font-medium text-gray-600">验证邮箱</div>
                    <div className="text-gray-900">{contract.verificationEmail}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 区块链信息 */}
          <Card>
            <CardHeader>
              <CardTitle>区块链信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">网络</div>
                <div>Ethereum Sepolia 测试网</div>
              </div>

              {contract.transactionHash && (
                <>
                  <Separator />
                  <div>
                    <div className="mb-1 text-sm font-medium text-gray-600">交易哈希</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-gray-100 px-2 py-1 text-sm">
                        {contract.transactionHash.slice(0, 10)}...{contract.transactionHash.slice(-8)}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={getTransactionUrl(contract.transactionHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">创建时间</div>
                <div>{formatDate(contract.createdAt)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Status & Actions */}
        <div className="space-y-6">
          {/* 放款状态追踪 - 显示给所有用户 */}
          {contract.status === 'PENDING' && (
            <ReleaseStatus orderId={contract.orderId} />
          )}

          {/* 操作按钮 - 仅付款方可见且状态为 PENDING */}
          {isSender && contract.status === 'PENDING' && (
            <Card className="border-teal-200 bg-teal-50/50">
              <CardHeader>
                <CardTitle>操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 申请放款按钮 - 使用新的对话框组件 */}
                <ReleaseInstructionsDialog
                  orderId={contract.orderId}
                  userEmail={contract.verificationEmail || ''}
                >
                  <Button className="w-full h-12">
                    <Mail className="mr-2 h-4 w-4" />
                    申请放款
                  </Button>
                </ReleaseInstructionsDialog>

                <Separator />

                {/* 取消订单按钮 */}
                <Button 
                  variant="outline"
                  className="w-full h-12 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  取消订单
                </Button>
                <p className="text-xs text-center text-gray-600">
                  取消后资金将退还到您的钱包
                </p>
              </CardContent>
            </Card>
          )}

          {/* 提示信息 - 非付款方 */}
          {!isSender && contract.status === 'PENDING' && (
            <Alert className="border-teal-200 bg-teal-50">
              <AlertCircle className="h-4 w-4 text-teal-600" />
              <AlertDescription className="text-teal-800">
                您是本订单的收款方。请等待付款方完成履约验证后，资金将自动转入您的钱包。
              </AlertDescription>
            </Alert>
          )}

          {/* 已完成提示 */}
          {contract.status === 'PAID' && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                <strong>托管已完成</strong> - 资金已成功转入收款方钱包
              </AlertDescription>
            </Alert>
          )}

          {/* 已取消提示 */}
          {contract.status === 'CANCELLED' && (
            <Alert className="border-gray-200 bg-gray-50">
              <XCircle className="h-4 w-4 text-gray-600" />
              <AlertDescription className="text-gray-800">
                <strong>订单已取消</strong> - 资金已退还到付款方钱包
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
