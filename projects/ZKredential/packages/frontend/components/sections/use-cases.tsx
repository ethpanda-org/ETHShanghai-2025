"use client"

import { Card } from "@/components/ui/card"
import { Building2, Shield, Users, Code2 } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

export function UseCases() {
  const { locale } = useI18n()

  const t = {
    en: {
      title: "为每个参与者创造价值",
      subtitle: "解决 RWA 平台、机构、投资者和开发者的实际痛点",
      cases: [
        {
          icon: Building2,
          title: "RWA 平台方",
          description: "即插即用的隐私升级，无需修改代币合约",
          benefits: ["真实数据永不上链", "保持现有白名单架构", "满足 GDPR/CCPA 等隐私法规"],
        },
        {
          icon: Shield,
          title: "合规机构",
          description: "复用现有 KYC 流程，签发 ZK 可验证凭证",
          benefits: ["无需改变现有业务", "增强数据隐私保护", "提供审计追踪能力"],
        },
        {
          icon: Users,
          title: "投资者",
          description: "完全隐私保护，一次 KYC 多平台通用",
          benefits: ["真实数据永不上链", "一次注册全平台互认", "无需重复 KYC 流程"],
        },
        {
          icon: Code2,
          title: "开发者",
          description: "完整 SDK 和工具链，支持自定义电路",
          benefits: ["零代码集成 ERC-3643", "灵活的复合电路配置", "完整文档和测试工具"],
        },
      ],
    },
    zh: {
      title: "为每个参与者创造价值",
      subtitle: "解决 RWA 平台、机构、投资者和开发者的实际痛点",
      cases: [
        {
          icon: Building2,
          title: "RWA 平台方",
          description: "即插即用的隐私升级，无需修改代币合约",
          benefits: ["真实数据永不上链", "保持现有白名单架构", "满足 GDPR/CCPA 等隐私法规"],
        },
        {
          icon: Shield,
          title: "合规机构",
          description: "复用现有 KYC 流程，签发 ZK 可验证凭证",
          benefits: ["无需改变现有业务", "增强数据隐私保护", "提供审计追踪能力"],
        },
        {
          icon: Users,
          title: "投资者",
          description: "完全隐私保护，一次 KYC 多平台通用",
          benefits: ["真实数据永不上链", "一次注册全平台互认", "无需重复 KYC 流程"],
        },
        {
          icon: Code2,
          title: "开发者",
          description: "完整 SDK 和工具链，支持自定义电路",
          benefits: ["零代码集成 ERC-3643", "灵活的复合电路配置", "完整文档和测试工具"],
        },
      ],
    },
  }

  const text = t[locale]

  return (
    <section className="relative py-24 lg:py-32">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            <span className="barca-gradient-text">{text.title}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{text.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {text.cases.map((useCase, index) => {
            const Icon = useCase.icon
            return (
              <Card
                key={index}
                className="p-8 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="mb-6 inline-flex p-4 rounded-2xl bg-primary/10">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">{useCase.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{useCase.description}</p>
                <ul className="space-y-2">
                  {useCase.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
