'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { getTransactionUrl } from '@/lib/contracts'
import { Button } from '@/components/ui/button'

export enum TransactionStep {
  IDLE = 'idle',
  APPROVING = 'approving',
  APPROVED = 'approved',
  DEPOSITING = 'depositing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

interface TransactionProgressProps {
  step: TransactionStep
  transactionHash?: string
  error?: string
}

export function TransactionProgress({ 
  step, 
  transactionHash,
  error 
}: TransactionProgressProps) {
  // 错误状态
  if (step === TransactionStep.ERROR) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>交易失败</AlertTitle>
        <AlertDescription>
          {error || '交易过程中出现错误，请重试'}
        </AlertDescription>
      </Alert>
    )
  }

  // 完成状态
  if (step === TransactionStep.COMPLETED) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">创建成功！🎉</AlertTitle>
        <AlertDescription className="text-green-800">
          <p className="mb-2">
            托管合约已成功创建，资金已安全锁定在智能合约中。
          </p>
          {transactionHash && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              asChild
            >
              <a
                href={getTransactionUrl(transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                在区块浏览器中查看
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // 进行中状态
  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      <AlertTitle className="text-blue-900">交易进行中</AlertTitle>
      <AlertDescription className="text-blue-800">
        <div className="space-y-3">
          {/* 步骤1: Approve */}
          <div className="flex items-center gap-3">
            {step === TransactionStep.APPROVING && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
            {(step === TransactionStep.APPROVED || 
              step === TransactionStep.DEPOSITING || 
              step === TransactionStep.COMPLETED) && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            {step === TransactionStep.IDLE && (
              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
            )}
            <div>
              <div className="font-medium">
                步骤 1: 授权 USDT
              </div>
              <div className="text-sm text-blue-700">
                {step === TransactionStep.APPROVING && '请在钱包中确认授权交易...'}
                {(step === TransactionStep.APPROVED || 
                  step === TransactionStep.DEPOSITING || 
                  step === TransactionStep.COMPLETED) && '授权成功 ✓'}
              </div>
            </div>
          </div>

          {/* 步骤2: Deposit */}
          <div className="flex items-center gap-3">
            {step === TransactionStep.DEPOSITING && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
            {step === TransactionStep.COMPLETED && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            {(step === TransactionStep.IDLE || 
              step === TransactionStep.APPROVING || 
              step === TransactionStep.APPROVED) && (
              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
            )}
            <div>
              <div className="font-medium">
                步骤 2: 创建托管合约
              </div>
              <div className="text-sm text-blue-700">
                {step === TransactionStep.DEPOSITING && '请在钱包中确认创建交易...'}
                {step === TransactionStep.COMPLETED && '创建成功 ✓'}
                {(step === TransactionStep.IDLE || 
                  step === TransactionStep.APPROVING || 
                  step === TransactionStep.APPROVED) && '等待授权完成...'}
              </div>
            </div>
          </div>

          {/* 交易哈希 */}
          {transactionHash && (
            <div className="mt-2 pt-2 border-t border-blue-200">
              <a
                href={getTransactionUrl(transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 hover:underline"
              >
                查看交易详情
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

