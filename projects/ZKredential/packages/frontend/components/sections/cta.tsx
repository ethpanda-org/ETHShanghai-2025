"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Github, BookOpen } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

export function CTA() {
  const { locale } = useI18n()

  const t = {
    en: {
      title: "为 RWA 平台提供即插即用的隐私升级",
      description: "保持现有架构，真实数据永不上链。一次 ZK 验证，终身隐私保护。",
      videoDemo: "视频演示",
      viewGithub: "查看 GitHub",
      readDocs: "技术文档",
    },
    zh: {
      title: "为 RWA 平台提供即插即用的隐私升级",
      description: "保持现有架构，真实数据永不上链。一次 ZK 验证，终身隐私保护。",
      videoDemo: "视频演示",
      viewGithub: "查看 GitHub",
      readDocs: "技术文档",
    },
  }

  const text = t[locale]

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#004e98]/8 via-[#eebd01]/5 to-transparent" />

      <div className="container relative z-10 mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">{text.title}</h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-12 text-pretty">{text.description}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#video-demo" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="btn-barca-primary group px-8">
                {text.videoDemo}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <a href="https://github.com/janebirkey/ZKredential" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="btn-barca-secondary px-8">
                <Github className="mr-2 h-4 w-4" />
                {text.viewGithub}
              </Button>
            </a>
            <a href="https://github.com/janebirkey/ZKredential#readme" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="btn-barca-gold px-8">
                <BookOpen className="mr-2 h-4 w-4" />
                {text.readDocs}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
