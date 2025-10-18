'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CreateContractForm } from '@/components/contract/CreateContractForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CreateContractPage() {
  const { isConnected } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (!isConnected) {
      router.push('/dashboard')
    }
  }, [isConnected, router])

  if (!isConnected) {
    return null // 重定向中...
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">创建托管合约</h1>
            <p className="text-gray-600">
              填写以下信息创建一个新的资金托管合约。资金将被安全地锁定在智能合约中，直到满足放款条件。
            </p>
          </div>

          {/* Info Card */}
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                工作流程
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    1
                  </span>
                  <span>填写表单并点击"创建并支付"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    2
                  </span>
                  <span>在钱包中授权（Approve）合约可以转移您的USDT</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    3
                  </span>
                  <span>确认第二笔交易，将USDT存入托管合约</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>合约信息</CardTitle>
              <CardDescription>请仔细填写以下信息，确保准确无误</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateContractForm />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}

