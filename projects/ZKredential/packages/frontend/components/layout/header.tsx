"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Globe } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

export function Header() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { locale, setLocale } = useI18n()

  const toggleLocale = () => {
    setLocale(locale === "en" ? "zh" : "en")
  }

  const t = {
    en: {
      verification: "Verification",
      generateProof: "Generate Proof",
      verify: "Verify",
      issuer: "Issuer",
      admin: "Admin",
      kycAdmin: "KYC Admin",
      zkAdmin: "ZK Admin",
      connect: "Connect Wallet",
      disconnect: "Disconnect",
    },
    zh: {
      verification: "身份验证",
      generateProof: "生成证明",
      verify: "验证",
      issuer: "签发机构",
      admin: "管理员",
      kycAdmin: "KYC管理",
      zkAdmin: "ZK管理",
      connect: "连接钱包",
      disconnect: "断开连接",
    },
  }

  const text = t[locale]

  return (
    <header className="barca-header">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#004e98] via-[#a40142] to-[#dc0036] shadow-lg" />
              <span className="font-mono text-xl font-bold bg-gradient-to-r from-[#dc0036] to-[#004e98] bg-clip-text text-transparent">
                ZKredential
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/proof-generation"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                🎯 生成证明
              </Link>
              <Link
                href="/rwa-platform"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                🏢 RWA平台
              </Link>
              <Link
                href="/rwa-platform/verify-proof"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                ✅ 本地验证
              </Link>
              <Link
                href="/rwa-platform/register"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                🔗 链上注册
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                📊 投资面板
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLocale}
              className="text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-5 w-5" />
            </Button>

            {isConnected && address ? (
              <Button variant="outline" onClick={() => disconnect()} className="font-mono text-sm">
                {address.slice(0, 6)}...{address.slice(-4)}
              </Button>
            ) : (
              <Button
                onClick={() => connectors[0] && connect({ connector: connectors[0] })}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {text.connect}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
