'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function HeroSection() {
  const { isConnected } = useAccount()

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700">
            ⚡ 基于智能合约的去中心化托管
          </div>

          {/* Title */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            PayWay
            <span className="block bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
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
              <Button asChild size="lg" className="group h-12">
                <Link href="/dashboard">
                  前往控制台
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            ) : (
              <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-700">
                👆 点击右上角"连接钱包"开始使用
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-12 border-t border-gray-200 pt-12">
            <div>
              <div className="text-3xl font-bold text-teal-600">100%</div>
              <div className="mt-2 text-sm text-gray-600">去中心化</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-600">0</div>
              <div className="mt-2 text-sm text-gray-600">平台不托管资金</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-teal-600">自动</div>
              <div className="mt-2 text-sm text-gray-600">智能合约执行</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

