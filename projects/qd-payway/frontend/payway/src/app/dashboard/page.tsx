'use client'

import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Plus, Wallet, ArrowUpRight, Clock, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { getContractsByAddress, ContractWithCamelCase as Contract } from '@/lib/db'
import { OrderStatus, OrderStatusText } from '@/lib/contracts'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()

  // 查询合约列表
  const { data: contracts, isLoading, error } = useQuery<Contract[], Error>({
    queryKey: ['contracts', address],
    queryFn: () => getContractsByAddress(address!),
    enabled: !!address && isConnected,
  })

  // 计算统计数据
  const stats = {
    asSender: contracts?.filter(c => c.senderAddress.toLowerCase() === address?.toLowerCase()).length || 0,
    asReceiver: contracts?.filter(c => c.receiverAddress.toLowerCase() === address?.toLowerCase()).length || 0,
    totalAmount: contracts?.reduce((sum, c) => sum + parseFloat(c.amount), 0).toFixed(2) || '0.00',
  }

  // 渲染状态标签
  const renderStatusBadge = (status: string) => {
    const statusEnum = status as unknown as OrderStatus
    
    if (status === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors bg-amber-500 text-white hover:bg-amber-600">
          <Clock className="h-3.5 w-3.5" />
          {OrderStatusText[statusEnum]}
        </span>
      )
    }
    
    if (status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors bg-emerald-500 text-white hover:bg-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {OrderStatusText[statusEnum]}
        </span>
      )
    }
    
    if (status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors bg-slate-500 text-white hover:bg-slate-600">
          <XCircle className="h-3.5 w-3.5" />
          {OrderStatusText[statusEnum]}
        </span>
      )
    }
    
    return null
  }

  // 未连接钱包状态
  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
                <AlertCircle className="h-8 w-8 text-teal-600" />
              </div>
              <CardTitle>需要连接钱包</CardTitle>
              <CardDescription>
                请先连接您的钱包以访问控制台
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600">
                点击页面右上角的&ldquo;连接钱包&rdquo;按钮，使用 MetaMask 或其他支持的钱包登录。
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  // 已连接钱包状态
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">我的订单</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Wallet className="h-4 w-4" />
                <span>已连接: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
            </div>
            <Button asChild className="gap-2 h-12">
              <Link href="/dashboard/create">
                <Plus className="h-4 w-4" />
                创建订单
              </Link>
            </Button>
          </div>

          {/* Contracts List */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>订单列表</CardTitle>
              <CardDescription>
                您参与的所有托管订单
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                // 加载状态
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 flex-1" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                // 错误状态
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">加载失败</h3>
                  <p className="text-sm text-gray-600">{error.message}</p>
                </div>
              ) : !contracts || contracts.length === 0 ? (
                // 空状态
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                    <svg
                      className="h-10 w-10 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    暂无订单
                  </h3>
                  <p className="mb-6 text-sm text-gray-600">
                    点击右上角按钮创建您的第一个托管订单
                  </p>
                </div>
              ) : (
                // 表格样式合约列表
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-3 text-sm font-medium text-gray-600">订单号</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">状态</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">金额</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">交易对手</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">创建时间</th>
                        <th className="pb-3 text-sm font-medium text-gray-600"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((contract) => (
                        <tr 
                          key={contract.id}
                          className="border-b last:border-b-0 transition-colors hover:bg-teal-50/30"
                        >
                          <td className="py-4">
                            <Link 
                              href={`/dashboard/contracts/${contract.orderId}`}
                              className="font-mono text-sm font-medium text-gray-900 hover:text-teal-600"
                            >
                              #{contract.orderId}
                            </Link>
                          </td>
                          <td className="py-4">
                            {renderStatusBadge(contract.status)}
                          </td>
                          <td className="py-4">
                            <span className="font-semibold text-gray-900">{contract.amount} USDT</span>
                          </td>
                          <td className="py-4">
                            <span className="text-sm text-gray-600">
                              {contract.senderAddress.toLowerCase() === address?.toLowerCase() 
                                ? `付款给 ${contract.receiverAddress.slice(0, 6)}...${contract.receiverAddress.slice(-4)}`
                                : `收款自 ${contract.senderAddress.slice(0, 6)}...${contract.senderAddress.slice(-4)}`
                              }
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="text-sm text-gray-500">
                              {contract.createdAt && new Date(contract.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <Link 
                              href={`/dashboard/contracts/${contract.orderId}`}
                              className="inline-flex items-center text-sm text-gray-500 hover:text-teal-600"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>作为付款方</CardDescription>
                <CardTitle className="text-3xl text-teal-600">
                  {isLoading ? <Skeleton className="h-9 w-12" /> : stats.asSender}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>作为收款方</CardDescription>
                <CardTitle className="text-3xl text-teal-600">
                  {isLoading ? <Skeleton className="h-9 w-12" /> : stats.asReceiver}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>总交易金额</CardDescription>
                <CardTitle className="text-2xl text-teal-600">
                  {isLoading ? (
                    <Skeleton className="h-9 w-24" />
                  ) : (
                    `${stats.totalAmount} USDT`
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

