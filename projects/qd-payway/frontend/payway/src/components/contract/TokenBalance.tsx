'use client'

import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/contracts'
import usdtAbi from '@/lib/usdt-abi.json'
import { Wallet, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

interface TokenBalanceProps {
  address: `0x${string}`
  inline?: boolean
}

export function TokenBalance({ address, inline = false }: TokenBalanceProps) {
  const { data: balance, isLoading, isError } = useReadContract({
    address: CONTRACTS.USDT_SEPOLIA as `0x${string}`,
    abi: usdtAbi,
    functionName: 'balanceOf',
    args: [address],
  })

  // 格式化余额（USDT通常是6位小数）
  const formattedBalance = balance
    ? formatUnits(balance as bigint, 6)
    : '0'

  const balanceNumber = parseFloat(formattedBalance)

  // Inline模式：只显示余额数字
  if (inline) {
    if (isLoading) {
      return <Skeleton className="h-4 w-24 inline-block" />
    }

    if (isError) {
      return <span className="text-sm text-red-600">加载失败</span>
    }

    return (
      <span className="text-gray-600">
        余额: <span className="font-medium text-teal-600">
          {parseFloat(formattedBalance).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })} USDT
        </span>
      </span>
    )
  }

  // 完整模式
  if (isLoading) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">USDT 余额</span>
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          无法获取余额信息，请检查网络连接
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">USDT 余额</span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {parseFloat(formattedBalance).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
            <span className="ml-1 text-sm font-normal text-gray-500">USDT</span>
          </div>
          <div className="text-xs text-gray-500">
            ≈ ${balanceNumber.toFixed(2)} USD
          </div>
        </div>
      </div>

      {/* 余额不足警告 */}
      {balanceNumber === 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-800">
            您的USDT余额为0。请先获取一些Sepolia测试网的USDT代币才能创建托管合约。
          </AlertDescription>
        </Alert>
      )}

      {balanceNumber > 0 && balanceNumber < 1 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-800">
            您的USDT余额较少，请确保有足够的金额创建托管合约。
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

