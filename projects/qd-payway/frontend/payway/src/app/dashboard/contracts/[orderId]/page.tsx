'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ContractDetails } from '@/components/contract/ContractDetails'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { getContractByOrderId, ContractWithCamelCase as Contract } from '@/lib/db'

export default function ContractDetailPage() {
  const params = useParams()
  const orderId = params.orderId as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    async function loadContract() {
      try {
        setIsLoading(true)
        setError(undefined)
        const data = await getContractByOrderId(orderId)
        setContract(data)
      } catch (err) {
        console.error('Error loading contract:', err)
        setError(err instanceof Error ? err.message : '加载订单信息失败')
      } finally {
        setIsLoading(false)
      }
    }

    if (orderId) {
      loadContract()
    }
  }, [orderId])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* 加载中 */}
          {isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 错误状态 */}
          {error && !isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>加载失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 未找到 */}
          {!isLoading && !error && !contract && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>未找到订单</AlertTitle>
              <AlertDescription>
                订单号 {orderId} 对应的订单不存在
              </AlertDescription>
            </Alert>
          )}

          {/* 订单详情 */}
          {!isLoading && !error && contract && (
            <ContractDetails contract={contract} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

