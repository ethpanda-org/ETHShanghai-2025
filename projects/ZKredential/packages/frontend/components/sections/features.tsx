"use client"

import { Card } from "@/components/ui/card"
import { Shield, Zap, Lock, Code, FileCheck, BarChart3 } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

export function Features() {
  const { locale } = useI18n()

  const t = {
    en: {
      title: "三大核心技术",
      subtitle: "为 RWA 平台提供隐私合规技术基础设施",
      features: [
        {
          icon: Code,
          title: "复合条件 ZK 电路",
          description:
            "使用 Circom 将多个合规条件（KYC + 资产 + AML）在电路层面组合为单一匿名证明。支持复杂合规场景的证明生成。",
        },
        {
          icon: Zap,
          title: "ERC-3643 标准集成",
          description: "实现标准 ICompliance 接口，通过 token.setCompliance(zkModule) 完成集成。兼容现有 ERC-3643 代币合约。",
        },
        {
          icon: Shield,
          title: "高效两阶段验证架构",
          description:
            "Phase 1: 一次性 ZK 验证 (~300k gas)，Phase 2: 后续查询白名单 (~5k gas)。与传统 RWA 一致的低成本，但隐私泄露风险降为 0。",
        },
        {
          icon: Lock,
          title: "统一身份适配层",
          description: "支持 Polygon ID、zkPass 等多种 ZK 身份源，RWA 平台对接一次，支持所有主流协议。屏蔽底层差异，降低集成复杂度。",
        },
        {
          icon: FileCheck,
          title: "多平台注册表",
          description: "用户一次注册，多平台互认。ZK 身份可在不同 RWA 平台间复用，无需重复 KYC，提升用户体验。",
        },
        {
          icon: BarChart3,
          title: "完整开发者工具",
          description: "提供 SDK、API、测试工具和完整文档。支持自定义电路、合规规则配置、实时监控和审计追踪。",
        },
      ],
    },
    zh: {
      title: "三大核心技术",
      subtitle: "为 RWA 平台提供隐私合规技术基础设施",
      features: [
        {
          icon: Code,
          title: "复合条件 ZK 电路",
          description:
            "使用 Circom 将多个合规条件（KYC + 资产 + AML）在电路层面组合为单一匿名证明。支持复杂合规场景的证明生成。",
        },
        {
          icon: Zap,
          title: "ERC-3643 标准集成",
          description: "实现标准 ICompliance 接口，通过 token.setCompliance(zkModule) 完成集成。兼容现有 ERC-3643 代币合约。",
        },
        {
          icon: Shield,
          title: "高效两阶段验证架构",
          description:
            "Phase 1: 一次性 ZK 验证 (~300k gas)，Phase 2: 后续查询白名单 (~5k gas)。与传统 RWA 一致的低成本，但隐私泄露风险降为 0。",
        },
        {
          icon: Lock,
          title: "统一身份适配层",
          description: "支持 Polygon ID、zkPass 等多种 ZK 身份源，RWA 平台对接一次，支持所有主流协议。屏蔽底层差异，降低集成复杂度。",
        },
        {
          icon: FileCheck,
          title: "多平台注册表",
          description: "用户一次注册，多平台互认。ZK 身份可在不同 RWA 平台间复用，无需重复 KYC，提升用户体验。",
        },
        {
          icon: BarChart3,
          title: "完整开发者工具",
          description: "提供 SDK、API、测试工具和完整文档。支持自定义电路、合规规则配置、实时监控和审计追踪。",
        },
      ],
    },
  }

  const text = t[locale]

  return (
    <section className="relative py-24 lg:py-32">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            <span className="barca-gradient-text">{text.title}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{text.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {text.features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={index}
                className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:border-[#004e98]/50 transition-all duration-300 hover:shadow-barca-blue"
              >
                <div className="mb-4 inline-flex p-3 rounded-xl bg-[#004e98]/10">
                  <Icon className="h-6 w-6 text-[#004e98]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
