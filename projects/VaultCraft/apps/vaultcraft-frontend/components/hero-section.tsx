"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@/hooks/use-wallet"
import { useLocale } from "@/components/locale-provider"

export function HeroSection() {
  const { connect } = useWallet()
  const { t } = useLocale()

  return (
    <section className="relative overflow-hidden gradient-hero py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-balance md:text-6xl lg:text-7xl">
            {t("hero.title", "Verifiable Trader ")}
            <span className="text-primary">{t("hero.titleHighlight", "Vaults")}</span>
          </h1>

          <p className="mb-10 text-lg text-muted-foreground text-balance max-w-xl mx-auto leading-relaxed">
            {t(
              "hero.subtitle",
              "Transparent performance. On-chain execution. Performance-based fees with high-water mark protection."
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/browse">
              <Button size="lg" className="gap-2">
                {t("hero.cta.primary", "Explore Vaults")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" onClick={() => connect()}>
              {t("hero.cta.secondary", "Connect Wallet")}
            </Button>
          </div>

          <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">$24.5M</div>
              <div className="text-sm text-muted-foreground">{t("hero.stats.aum", "Total AUM")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">156</div>
              <div className="text-sm text-muted-foreground">{t("hero.stats.vaults", "Active Vaults")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">18.4%</div>
              <div className="text-sm text-muted-foreground">{t("hero.stats.return", "Avg Return")}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
