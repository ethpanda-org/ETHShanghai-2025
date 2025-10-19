'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { TransactionStep } from './TransactionProgress'
import { getTransactionUrl } from '@/lib/contracts'

interface TransactionStatusPanelProps {
  amount?: string
  currentStep: TransactionStep
  transactionHash?: string
  error?: string
  isCreating: boolean
  isSuccess: boolean
  onSubmit: () => void
  onViewContract?: () => void
}

export function TransactionStatusPanel({
  amount,
  currentStep,
  transactionHash,
  error,
  isCreating,
  isSuccess,
  onSubmit,
  onViewContract,
}: TransactionStatusPanelProps) {
  // 渲染步骤1：Approve USDT
  const renderStep1 = () => {
    const isActive = currentStep === TransactionStep.APPROVING
    const isCompleted = [
      TransactionStep.APPROVED,
      TransactionStep.DEPOSITING,
      TransactionStep.COMPLETED,
    ].includes(currentStep)

    return (
      <div className="flex items-start gap-3">
        {isCompleted ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        ) : isActive ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-semibold text-white">
            1
          </span>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
            1
          </span>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium text-gray-900">授权 USDT</div>
            {isActive && <Loader2 className="h-4 w-4 animate-spin text-teal-600" />}
            {isCompleted && (
              <Badge className="bg-emerald-500 text-white border-emerald-500">成功</Badge>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {isActive && '等待区块链确认...'}
            {isCompleted && '授权成功'}
            {!isActive && !isCompleted && '授权合约转移您的 USDT'}
          </div>
          {isActive && transactionHash && (
            <a
              href={getTransactionUrl(transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-teal-600 hover:underline mt-1"
            >
              在 Etherscan 查看
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    )
  }

  // 渲染步骤2：Deposit Funds
  const renderStep2 = () => {
    const isActive = currentStep === TransactionStep.DEPOSITING
    const isCompleted = currentStep === TransactionStep.COMPLETED

    return (
      <div className="flex items-start gap-3">
        {isCompleted ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        ) : isActive ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-semibold text-white">
            2
          </span>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
            2
          </span>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium text-gray-900">存入托管</div>
            {isActive && <Loader2 className="h-4 w-4 animate-spin text-teal-600" />}
            {isCompleted && (
              <Badge className="bg-emerald-500 text-white border-emerald-500">成功</Badge>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {isActive && '等待区块链确认...'}
            {isCompleted && '资金已存入'}
            {!isActive && !isCompleted && '在钱包中确认存入'}
          </div>
          {isActive && transactionHash && (
            <a
              href={getTransactionUrl(transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-teal-600 hover:underline mt-1"
            >
              在 Etherscan 查看
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    )
  }

  // 渲染按钮
  const renderActionButton = () => {
    if (isSuccess || currentStep === TransactionStep.COMPLETED) {
      return (
        <Button onClick={onViewContract} className="w-full h-12 text-base" size="lg">
          查看订单详情 →
        </Button>
      )
    }

    if (currentStep === TransactionStep.APPROVED) {
      return (
        <Button
          onClick={onSubmit}
          className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
          size="lg"
        >
          存入资金
        </Button>
      )
    }

    if (isCreating || currentStep === TransactionStep.APPROVING || currentStep === TransactionStep.DEPOSITING) {
      return (
        <Button disabled className="w-full h-12 text-base" size="lg">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          处理中...
        </Button>
      )
    }

    return (
      <Button onClick={onSubmit} className="w-full h-12 text-base" size="lg">
        创建并授权
      </Button>
    )
  }

  return (
    <div className="sticky top-24">
      <Card>
        <CardHeader>
          <CardTitle>交易状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 支付金额显示 */}
          <div className="border-b pb-4">
            <p className="text-sm text-gray-600 mb-2">支付金额</p>
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg p-4">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-bold text-gray-900">
                  {amount || '0.00'}
                </span>
                <span className="text-xl font-semibold text-gray-600">USDT</span>
              </div>
            </div>
          </div>

          {/* 交易进度 */}
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4 border-b pb-4">
              {renderStep1()}
              {renderStep2()}
            </div>
          )}

          {/* 操作按钮 */}
          <div>{renderActionButton()}</div>

          {/* 警告提示 */}
          {!isSuccess && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-sm">
                请仔细核对收款方的钱包地址。区块链上的交易是不可逆的。
              </AlertDescription>
            </Alert>
          )}

          {/* 成功提示 */}
          {isSuccess && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800 text-sm">
                🎉 托管订单创建成功！资金已安全锁定在智能合约中。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

