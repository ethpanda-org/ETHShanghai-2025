import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import { LocaleProvider } from "@/components/locale-provider"

export const metadata: Metadata = {
  title: "VaultCraft - Verifiable Human Trader Vaults",
  description:
    "Professional vault platform for verified traders with transparent public and private investment options",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <LocaleProvider>
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  )
}
