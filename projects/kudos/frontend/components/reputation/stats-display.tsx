"use client"

import type React from "react"

import { useAccount } from "wagmi"
import { useBuyerStats, useCreatorStats } from "@/lib/contracts/hooks/use-marketplace-v2"
import { Card } from "@/components/ui/card"
import { ShoppingBag, TrendingUp, DollarSign, Wallet, Loader2 } from "lucide-react"
import { formatUnits } from "viem"

function StatCard({
  title,
  value,
  unit,
  icon: Icon,
}: {
  title: string
  value?: string | number
  unit?: string
  icon: React.ElementType
}) {
  return (
    <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/40 hover:shadow-apple-lg transition-apple">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">
            {value !== undefined ? value : "-"}
            {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  )
}

export function StatsDisplay() {
  const { address } = useAccount()
  const { data: buyerStats, isLoading: loadingBuyer } = useBuyerStats(address)
  const { data: creatorStats, isLoading: loadingCreator } = useCreatorStats(address)

  if (loadingBuyer || loadingCreator) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="购买次数" value={buyerStats?.totalPurchases?.toString() || "0"} icon={ShoppingBag} />
      <StatCard
        title="总消费"
        value={buyerStats ? formatUnits(buyerStats.totalSpend, 6) : "0"}
        unit="USDT"
        icon={DollarSign}
      />
      <StatCard title="销售次数" value={creatorStats?.totalSales?.toString() || "0"} icon={TrendingUp} />
      <StatCard
        title="总收入"
        value={creatorStats ? formatUnits(creatorStats.totalVolume, 6) : "0"}
        unit="USDT"
        icon={Wallet}
      />
    </div>
  )
}
