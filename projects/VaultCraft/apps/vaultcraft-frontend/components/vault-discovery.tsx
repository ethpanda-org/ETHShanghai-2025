"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpRight, Lock, Eye, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { getVaults } from "@/lib/api"
import { useLocale } from "@/components/locale-provider"

// Mock data (fallback)
const fallbackVaults = [
  {
    id: "0x1234...5678",
    name: "Demo Momentum Vault",
    type: "public",
    aum: 2_300_000,
    sharpe: 2.1,
    annualReturn: 18.5,
    volatility: 11.2,
    maxDrawdown: -6.8,
    performanceFee: 10,
    managerStake: 8.5,
    isNew: true,
  },
  {
    id: "0x8765...4321",
    name: "Demo Market Neutral",
    type: "private",
    aum: 1_150_000,
    sharpe: 3.0,
    annualReturn: 22.4,
    volatility: 8.4,
    maxDrawdown: -4.1,
    performanceFee: 12,
    managerStake: 10.0,
    isNew: false,
  },
]

export function VaultDiscovery() {
  const [filter, setFilter] = useState<"all" | "public" | "private">("all")
  const [sortBy, setSortBy] = useState<"sharpe" | "aum" | "return">("sharpe")
  const [q, setQ] = useState("")

  const [vaults, setVaults] = useState(fallbackVaults)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { t } = useLocale()

  useEffect(() => {
    let alive = true
    getVaults()
      .then((v) => {
        if (!alive) return
         setLoadError(null)
        // merge minimal API data into display-friendly mock-like shape with defaults
        const enriched = v.map((x) => {
          const id = x.id
          const displayName =
            typeof x.name === "string" && x.name.trim().length
              ? x.name.trim()
              : `Vault-${id?.slice(2, 6)?.toUpperCase()}`
          return {
            id,
            name: displayName,
            type: x.type,
            aum: x.aum ?? 1_000_000,
            sharpe: 1.8,
            annualReturn: 20.0,
            volatility: 12.0,
            maxDrawdown: -8.0,
            performanceFee: 10,
            managerStake: 10.0,
            isNew: false,
          }
        })
        setVaults(enriched)
      })
      .catch((err) => {
        // ignore; keep fallback
        if (!alive) return
        setLoadError(
          "Backend API未响应，当前展示为示例金库。请确认 FastAPI 服务已启动，并在 .env 中配置 NEXT_PUBLIC_BACKEND_URL 指向后端。"
        )
        console.warn("VaultDiscovery fallback due to API error", err)
      })
    return () => {
      alive = false
    }
  }, [])

  const filteredVaults = vaults
    .filter((vault) => filter === "all" || vault.type === filter)
    .filter((v) => {
      if (!q) return true
      const s = q.toLowerCase()
      return v.name.toLowerCase().includes(s) || v.id.toLowerCase().includes(s)
    })
    .sort((a, b) => {
      if (sortBy === "sharpe") return b.sharpe - a.sharpe
      if (sortBy === "aum") return b.aum - a.aum
      return b.annualReturn - a.annualReturn
    })

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <h2 className="text-3xl font-bold mb-2">{t("discovery.title", "Discover Vaults")}</h2>
          <p className="text-muted-foreground">
            {t("discovery.subtitle", "Verified trader vaults with transparent performance metrics")}
          </p>
          {loadError && (
            <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
              {loadError}
            </div>
          )}
        </div>

        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">{t("discovery.filter.all", "All")}</TabsTrigger>
              <TabsTrigger value="public">{t("discovery.filter.public", "Public")}</TabsTrigger>
              <TabsTrigger value="private">{t("discovery.filter.private", "Private")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("discovery.searchPlaceholder", "Search by name or address")}
              className="bg-transparent border rounded px-2 py-1 w-64"
            />
            <Button variant={sortBy === "sharpe" ? "secondary" : "ghost"} size="sm" onClick={() => setSortBy("sharpe")}>
              {t("discovery.sort.sharpe", "Sharpe")}
            </Button>
            <Button variant={sortBy === "aum" ? "secondary" : "ghost"} size="sm" onClick={() => setSortBy("aum")}>
              {t("discovery.sort.aum", "AUM")}
            </Button>
            <Button variant={sortBy === "return" ? "secondary" : "ghost"} size="sm" onClick={() => setSortBy("return")}>
              {t("discovery.sort.return", "Return")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVaults.map((vault) => (
            <Card key={vault.id} className="p-5 gradient-card hover:border-primary/30 transition-smooth group">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{vault.name}</h3>
                    {vault.isNew && (
                      <Badge variant="secondary" className="text-xs">
                        {t("discovery.card.new", "New")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {vault.type === "public" ? <Eye className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    <span className="capitalize">
                      {vault.type === "public"
                        ? t("discovery.filter.public", "Public")
                        : t("discovery.filter.private", "Private")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("discovery.card.aum", "AUM")}</span>
                  <span className="font-semibold font-mono text-sm">${(vault.aum / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("discovery.card.return", "Return")}</span>
                  <span className="font-semibold text-success flex items-center gap-1 text-sm">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {vault.annualReturn.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("discovery.card.sharpe", "Sharpe")}</span>
                  <span className="font-semibold font-mono text-sm">{vault.sharpe.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("discovery.card.drawdown", "Drawdown")}</span>
                  <span className="font-semibold text-destructive flex items-center gap-1 text-sm">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {vault.maxDrawdown.toFixed(1)}%
                  </span>
                </div>
              </div>

              <Link href={`/vault/${vault.id}`}>
                <Button className="w-full gap-2 group-hover:bg-primary/90 transition-smooth" size="sm">
                  {t("discovery.card.view", "View Details")}
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
