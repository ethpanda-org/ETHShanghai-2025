'use client'

import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ExternalLink, 
  Copy, 
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
  OrderStatusColor,
  getTransactionUrl,
  getAddressUrl 
} from '@/lib/contracts'
import { AddressDisplay } from './AddressDisplay'
import { toast } from 'sonner'
import { useState } from 'react'

interface ContractDetailsProps {
  contract: Contract
}

export function ContractDetails({ contract }: ContractDetailsProps) {
  const { address } = useAccount()
  const [showReleaseInstructions, setShowReleaseInstructions] = useState(false)

  // 判断当前用户是否为付款方
  const isSender = address?.toLowerCase() === contract.senderAddress.toLowerCase()

  // 状态图标
  const StatusIcon = {
    [OrderStatus.PENDING]: Clock,
    [OrderStatus.PAID]: CheckCircle2,
    [OrderStatus.CANCELLED]: XCircle,
  }

  const Icon = StatusIcon[contract.status as unknown as OrderStatus] || Clock

  // 格式化时间
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 复制订单号
  const copyOrderId = () => {
    navigator.clipboard.writeText(contract.orderId)
    toast.success('订单号已复制')
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">托管合约详情</h1>
          <Badge 
            className={OrderStatusColor[contract.status as unknown as OrderStatus]}
            variant="outline"
          >
            <Icon className="mr-1 h-3 w-3" />
            {OrderStatusText[contract.status as unknown as OrderStatus]}
          </Badge>
        </div>
      </div>

      {/* 订单号 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>订单编号</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyOrderId}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-bold text-gray-900">
            {contract.orderId}
          </div>
        </CardContent>
      </Card>

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
              <Badge variant="secondary" className="mt-1">
                您
              </Badge>
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

      {/* 操作按钮 - 仅付款方可见 */}
      {isSender && contract.status === 'PENDING' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 申请放款按钮 */}
            <Button 
              className="w-full"
              onClick={() => setShowReleaseInstructions(!showReleaseInstructions)}
            >
              申请放款
            </Button>

            {/* 放款说明 */}
            {showReleaseInstructions && (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">如何放款？</p>
                    <p className="text-sm">
                      请使用您预留的邮箱 <strong>{contract.verificationEmail}</strong>
                    </p>
                    <p className="text-sm">
                      向我们的指令邮箱 <strong>release@payway.com</strong> 发送邮件
                    </p>
                    <p className="text-sm">
                      邮件标题为：<code className="rounded bg-gray-100 px-2 py-1">
                        RELEASE: {contract.orderId}
                      </code>
                    </p>
                    <p className="text-xs text-gray-600">
                      我们将在收到邮件并验证通过后的数分钟内为您自动执行链上放款。
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* 取消合约按钮 */}
            <Button 
              variant="outline"
              className="w-full text-red-600 hover:bg-red-50"
            >
              <XCircle className="mr-2 h-4 w-4" />
              取消合约
            </Button>
            <p className="text-xs text-center text-gray-600">
              取消后资金将退还到您的钱包
            </p>
          </CardContent>
        </Card>
      )}

      {/* 提示信息 - 非付款方 */}
      {!isSender && contract.status === 'PENDING' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            您是本合约的收款方。请等待付款方完成履约验证后，资金将自动转入您的钱包。
          </AlertDescription>
        </Alert>
      )}

      {/* 已完成提示 */}
      {contract.status === 'PAID' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>托管已完成</strong> - 资金已成功转入收款方钱包
          </AlertDescription>
        </Alert>
      )}

      {/* 已取消提示 */}
      {contract.status === 'CANCELLED' && (
        <Alert>
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>合约已取消</strong> - 资金已退还到付款方钱包
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

