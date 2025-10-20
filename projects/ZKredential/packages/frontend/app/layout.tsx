import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Web3Provider } from "@/components/providers/web3-provider"
import { I18nProvider } from "@/lib/i18n-context"
import { Header } from "@/components/layout/header"
import { BackgroundStyle } from "./background-style"
import { ForceBackground } from "./force-background"
import { ErrorOverlayFix } from "./error-overlay-fix"
import "./globals.compiled.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "ZKredential - Privacy-First Compliance Infrastructure for RWA",
  description:
    "为 RWA 平台提供即插即用的零知识合规基础设施。保持高效的白名单架构，真实数据永不上链。",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/barca-background.css" />
        <link rel="stylesheet" href="/hide-errors.css" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased min-h-screen`}>
        <ErrorOverlayFix />
        <ForceBackground />
        <BackgroundStyle />
        <Suspense fallback={null}>
          <I18nProvider>
            <Web3Provider>
              <Header />
              <div className="pt-16">
                {children}
              </div>
            </Web3Provider>
          </I18nProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
