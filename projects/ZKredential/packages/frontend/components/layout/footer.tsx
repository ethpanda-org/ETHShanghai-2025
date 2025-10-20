"use client"

import { Github, Twitter, MessageCircle } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

export function Footer() {
  const { locale } = useI18n()

  const t = {
    en: {
      product: "Product",
      features: "Features",
      howItWorks: "How It Works",
      useCases: "Use Cases",
      pricing: "Pricing",
      developers: "Developers",
      documentation: "Documentation",
      apiReference: "API Reference",
      sdk: "SDK",
      github: "GitHub",
      company: "Company",
      about: "About",
      blog: "Blog",
      careers: "Careers",
      contact: "Contact",
      legal: "Legal",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      tagline: "Privacy-First Compliance Infrastructure for RWA Platforms",
      rights: "All rights reserved.",
    },
    zh: {
      product: "产品",
      features: "功能特性",
      howItWorks: "工作原理",
      useCases: "应用场景",
      pricing: "价格",
      developers: "开发者",
      documentation: "文档",
      apiReference: "API 参考",
      sdk: "SDK",
      github: "GitHub",
      company: "公司",
      about: "关于我们",
      blog: "博客",
      careers: "招聘",
      contact: "联系我们",
      legal: "法律",
      privacy: "隐私政策",
      terms: "服务条款",
      tagline: "为 RWA 平台提供隐私保护的合规基础设施",
      rights: "保留所有权利。",
    },
  }

  const text = t[locale]

  const footerLinks = {
    product: [
      { label: text.features, href: "#features" },
      { label: text.howItWorks, href: "#how-it-works" },
      { label: text.useCases, href: "#use-cases" },
      { label: text.pricing, href: "#pricing" },
    ],
    developers: [
      { label: text.documentation, href: "https://github.com/janebirkey/ZKredential#readme" },
      { label: text.apiReference, href: "https://github.com/janebirkey/ZKredential#api-reference" },
      { label: text.sdk, href: "https://github.com/janebirkey/ZKredential#sdk" },
      { label: text.github, href: "https://github.com/janebirkey/ZKredential" },
    ],
    company: [
      { label: text.about, href: "#about" },
      { label: text.blog, href: "#blog" },
      { label: text.careers, href: "#careers" },
      { label: text.contact, href: "#contact" },
    ],
    legal: [
      { label: text.privacy, href: "#privacy" },
      { label: text.terms, href: "#terms" },
    ],
  }

  return (
    <footer className="relative border-t border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#004e98] via-[#a40142] to-[#dc0036] shadow-lg" />
              <span className="text-xl font-bold barca-gradient-text">ZKredential</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">{text.tagline}</p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/janebirkey/ZKredential"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com/ZKredential"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://discord.gg/zkredential"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">{text.product}</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{text.developers}</h3>
            <ul className="space-y-3">
              {footerLinks.developers.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{text.company}</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{text.legal}</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground text-center" suppressHydrationWarning>
            © {new Date().getFullYear()} ZKredential. {text.rights}
          </p>
        </div>
      </div>
    </footer>
  )
}
