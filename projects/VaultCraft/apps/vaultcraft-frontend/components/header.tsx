"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLocale } from "@/components/locale-provider"

export function Header() {
  const { connected, address, connect, isHyper } = useWallet()
  const { t } = useLocale()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-primary-foreground"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-lg font-semibold">VaultCraft</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/browse" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
              {t("nav.browse", "Browse")}
            </Link>
            <Link
              href="/portfolio"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
            >
              {t("nav.portfolio", "Portfolio")}
            </Link>
            <Link
              href="/manager"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
            >
              {t("nav.manager", "Manager")}
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
            >
              {t("nav.about", "About")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:block" />
          <Button variant="ghost" size="sm" className="hidden sm:flex">
            {t("nav.docs", "Documentation")}
          </Button>
          {connected ? (
            <Button size="sm" variant={isHyper ? "default" : "destructive"} className="gap-2" disabled>
              <Wallet className="h-4 w-4" />
              {address?.slice(0, 6)}...{address?.slice(-4)}{" "}
              {isHyper ? "" : t("nav.connectedSuffix", "(Wrong Network)")}
            </Button>
          ) : (
            <Button size="sm" className="gap-2" onClick={() => connect()}>
              <Wallet className="h-4 w-4" />
              {t("nav.connect", "Connect Wallet")}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
