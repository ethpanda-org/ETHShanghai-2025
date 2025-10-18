'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function HeroSection() {
  const { isConnected } = useAccount()

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white py-20 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute left-1/2 top-0 -z-10 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 opacity-20 blur-[128px]" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            ⚡ 基于智能合约的去中心化托管
          </div>

          {/* Title */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            PayWay
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              无需技术背景的智能托管支付
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-10 text-lg text-gray-600 sm:text-xl">
            让企业能够安全、高效地利用稳定币完成贸易结算，
            <br className="hidden sm:block" />
            将商业信任从依赖"人"转变为依赖"代码"
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isConnected ? (
              <Button asChild size="lg" className="group">
                <Link href="/dashboard">
                  前往控制台
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
                👆 点击右上角"连接钱包"开始使用
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-gray-200 pt-8">
            <div>
              <div className="text-3xl font-bold text-gray-900">100%</div>
              <div className="mt-1 text-sm text-gray-600">去中心化</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">0</div>
              <div className="mt-1 text-sm text-gray-600">平台不托管资金</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">自动</div>
              <div className="mt-1 text-sm text-gray-600">智能合约执行</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

