'use client'

import { useAccount } from 'wagmi'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Plus, Wallet } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()

  // 未连接钱包状态
  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle>需要连接钱包</CardTitle>
              <CardDescription>
                请先连接您的钱包以访问控制台
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600">
                点击页面右上角的"连接钱包"按钮，使用 MetaMask 或其他支持的钱包登录。
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
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">我的合约</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Wallet className="h-4 w-4" />
              <span>已连接: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
          </div>

          {/* Welcome Card */}
          <Card className="mb-8 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle>欢迎使用 PayWay 👋</CardTitle>
              <CardDescription>
                您已成功连接钱包，可以开始创建和管理您的托管合约
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="gap-2">
                <Link href="/dashboard/create">
                  <Plus className="h-4 w-4" />
                  创建托管合约
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Contracts List - Empty State */}
          <Card>
            <CardHeader>
              <CardTitle>合约列表</CardTitle>
              <CardDescription>
                您参与的所有托管合约将显示在这里
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
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
                  暂无合约
                </h3>
                <p className="mb-6 text-sm text-gray-600">
                  点击上方按钮创建您的第一个托管合约
                </p>
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/dashboard/create">
                    <Plus className="h-4 w-4" />
                    创建合约
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>作为付款方</CardDescription>
                <CardTitle className="text-3xl">0</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>作为收款方</CardDescription>
                <CardTitle className="text-3xl">0</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>总交易金额</CardDescription>
                <CardTitle className="text-3xl">0 USDT</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

