'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CreateContractForm, FormValues } from '@/components/contract/CreateContractForm'
import { TransactionStatusPanel } from '@/components/contract/TransactionStatusPanel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateEscrow } from '@/hooks/useCreateEscrow'
import { generateOrderId } from '@/lib/contracts'

export default function CreateContractPage() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const [orderId, setOrderId] = useState(generateOrderId())
  const [amount, setAmount] = useState('')

  const {
    createEscrow,
    isCreating,
    currentStep,
    error,
    transactionHash,
    isSuccess,
  } = useCreateEscrow()

  useEffect(() => {
    if (!isConnected) {
      router.push('/dashboard')
    }
  }, [isConnected, router])

  if (!isConnected) {
    return null // 重定向中...
  }

  // 处理表单提交
  const handleSubmit = async (values: FormValues) => {
    console.log('Form values:', values)
    setOrderId(values.orderId) // 更新orderId状态
    setAmount(values.amount) // 更新支付金额状态
    await createEscrow({
      orderId: values.orderId,
      receiver: values.receiver as `0x${string}`,
      amount: values.amount,
      email: values.email,
    })
  }

  // 查看合约详情
  const handleViewContract = () => {
    router.push(`/dashboard/contracts/${orderId}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">创建托管订单</h1>
            <p className="text-gray-600">
              填写以下信息创建一个新的资金托管订单
            </p>
          </div>

          {/* Grid Layout: Form (Left) + Transaction Status (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
            {/* Left: Form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>订单信息</CardTitle>
                  <CardDescription>请仔细填写以下信息，确保准确无误</CardDescription>
                </CardHeader>
                <CardContent>
                  <CreateContractForm 
                    onSubmit={handleSubmit} 
                    isCreating={isCreating}
                    orderId={orderId}
                    onOrderIdChange={setOrderId}
                    onAmountChange={setAmount}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: Transaction Status Panel */}
            <div>
              <TransactionStatusPanel
                amount={amount}
                currentStep={currentStep}
                transactionHash={transactionHash}
                error={error}
                isCreating={isCreating}
                isSuccess={isSuccess}
                onSubmit={() => {
                  // 触发表单提交
                  const form = document.querySelector('form')
                  if (form) {
                    form.requestSubmit()
                  }
                }}
                onViewContract={handleViewContract}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
