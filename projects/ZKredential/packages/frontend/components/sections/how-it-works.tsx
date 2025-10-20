"use client"

import { Card } from "@/components/ui/card"
import { ArrowRight, UserCheck, FileKey, Shield, CheckCircle } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

export function HowItWorks() {
  const { locale } = useI18n()

  const t = {
    en: {
      title: "两阶段验证架构",
      subtitle: "Phase 1 一次验证，Phase 2 持续低成本 - 兼顾隐私与效率",
      steps: [
        {
          icon: UserCheck,
          title: "链下 KYC",
          description: "用户完成传统 KYC，获取签名凭证（Polygon ID / zkPass / 传统机构）",
        },
        {
          icon: FileKey,
          title: "Phase 1: ZK 注册",
          description: "用户本地生成 ZK 证明，链上验证后加入多平台注册表白名单（~300k gas，一次性）",
        },
        {
          icon: Shield,
          title: "Phase 2: 高效查询",
          description: "RWA 平台交易时，仅查询注册表状态（~5k gas），与传统白名单一致的低成本",
        },
        {
          icon: CheckCircle,
          title: "多平台复用",
          description: "注册一次，全平台互认。用户无需重复 KYC，RWA 平台零代码集成",
        },
      ],
    },
    zh: {
      title: "两阶段验证架构",
      subtitle: "Phase 1 一次验证，Phase 2 持续低成本 - 兼顾隐私与效率",
      steps: [
        {
          icon: UserCheck,
          title: "链下 KYC",
          description: "用户完成传统 KYC，获取签名凭证（Polygon ID / zkPass / 传统机构）",
        },
        {
          icon: FileKey,
          title: "Phase 1: ZK 注册",
          description: "用户本地生成 ZK 证明，链上验证后加入多平台注册表白名单（~300k gas，一次性）",
        },
        {
          icon: Shield,
          title: "Phase 2: 高效查询",
          description: "RWA 平台交易时，仅查询注册表状态（~5k gas），与传统白名单一致的低成本",
        },
        {
          icon: CheckCircle,
          title: "多平台复用",
          description: "注册一次，全平台互认。用户无需重复 KYC，RWA 平台零代码集成",
        },
      ],
    },
  }

  const text = t[locale]

  return (
    <section className="relative py-24 lg:py-32 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            <span className="barca-gradient-text">{text.title}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{text.subtitle}</p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {text.steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="relative">
                  <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 h-full hover:border-primary/50 transition-all duration-300">
                    <div className="mb-4">
                      <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-3">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-sm font-semibold text-primary mb-2">Step {index + 1}</div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                  </Card>
                  {index < text.steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ArrowRight className="h-6 w-6 text-primary/50" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
