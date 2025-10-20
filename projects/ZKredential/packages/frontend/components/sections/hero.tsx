"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Lock } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"
import Link from "next/link"

export function Hero() {
  const { locale } = useI18n()

  const t = {
    en: {
      badge: "Plug-and-Play Privacy Upgrade for RWA",
      title: "Privacy-First Compliance",
      titleHighlight: "Infrastructure for RWA",
      description:
        "为 RWA 平台提供即插即用的 ZK 隐私升级基础设施。保持高效的白名单架构，真实数据永不上链。",
      videoDemo: "视频演示",
      viewGithub: "查看 GitHub",
      viewDocs: "技术文档",
      trustedBy: "为 RWA 平台提供零信任隐私合规方案",
    },
    zh: {
      badge: "RWA 即插即用隐私升级",
      title: "隐私优先的合规",
      titleHighlight: "基础设施",
      description: "为 RWA 平台提供即插即用的 ZK 隐私升级基础设施。保持高效的白名单架构，真实数据永不上链。",
      videoDemo: "视频演示",
      viewGithub: "查看 GitHub",
      viewDocs: "技术文档",
      trustedBy: "为 RWA 平台提供零信任隐私合规方案",
    },
  }

  const text = t[locale]

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 barca-glow-bg" />
      <div className="absolute inset-0 barca-grid-bg opacity-30" />

      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="container relative z-10 mx-auto px-4 lg:px-8 pt-24 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#004e98]/10 border border-[#004e98]/20 mb-8">
            <Shield className="h-4 w-4 text-[#004e98]" />
            <span className="text-sm font-medium text-[#004e98]">{text.badge}</span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-balance leading-tight">
            <span className="barca-gradient-text">ZKredential</span>
            <br />
            <span className="text-foreground">{text.titleHighlight}</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 text-pretty leading-relaxed">
            {text.description}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="#video-demo" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="btn-barca-primary group px-8">
                {text.videoDemo}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <a href="https://github.com/janebirkey/ZKredential" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="btn-barca-secondary px-8">
                {text.viewGithub}
              </Button>
            </a>
            <a href="https://github.com/janebirkey/ZKredential#readme" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="btn-barca-gold px-8">
                {text.viewDocs}
              </Button>
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-col items-center gap-6">
            <p className="text-sm text-muted-foreground">{text.trustedBy}</p>
            <div className="flex items-center gap-8 opacity-50">
              <div className="h-8 w-24 rounded bg-muted" />
              <div className="h-8 w-24 rounded bg-muted" />
              <div className="h-8 w-24 rounded bg-muted" />
              <div className="h-8 w-24 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute top-1/3 left-10 animate-float">
        <div className="p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
          <Lock className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="absolute bottom-1/3 right-10 animate-float delay-500">
        <div className="p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
          <Shield className="h-6 w-6 text-accent" />
        </div>
      </div>
    </section>
  )
}
