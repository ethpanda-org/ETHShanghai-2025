"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { getVaults } from "@/lib/api"
import { ethers } from "ethers"
import { WithdrawModal } from "@/components/withdraw-modal"

type Position = {
  vaultId: string
  vaultName: string
  shares: number
  unitNav: number
  currentValue: number
  unlockDate: Date | null
  assetSymbol?: string
  walletBalance?: number | null
  assetAddress?: string
}

export function PortfolioView() {
  const { connected, address } = useWallet()
  const [positions, setPositions] = useState<Position[]>([])
  const [walletBalances, setWalletBalances] = useState<{ symbol: string; amount: number }[]>([])
  const [wdOpen, setWdOpen] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const list = await getVaults()
        if (!list.length || !address) {
          if (alive) {
            setPositions([])
            setWalletBalances([])
          }
          return
        }
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
        const VAULT_ABI = [
          "function balanceOf(address) view returns (uint256)",
          "function ps() view returns (uint256)",
          "function nextRedeemAllowed(address) view returns (uint256)",
          "function asset() view returns (address)",
        ]
        const ERC20_ABI = [
          "function decimals() view returns (uint8)",
          "function symbol() view returns (string)",
          "function balanceOf(address) view returns (uint256)",
        ]
        const out: Position[] = []
        const walletMap = new Map<string, { symbol: string; amount: number }>()

        for (const v of list) {
          const c = new ethers.Contract(v.id, VAULT_ABI, provider)
          try {
            const [bal, ps, lock, assetAddr] = await Promise.all([
              c.balanceOf(address),
              c.ps(),
              c.nextRedeemAllowed(address),
              c.asset(),
            ])
            const shares = Number(ethers.formatUnits(bal, 18))
            if (shares <= 0) continue
            let assetSymbol: string | undefined
            let walletBalance: number | null = null
            let assetDecimals = 18
            if (ethers.isAddress(assetAddr)) {
              try {
                const token = new ethers.Contract(assetAddr, ERC20_ABI, provider)
                const [decimals, symbol, walletBal] = await Promise.all([
                  token.decimals(),
                  token.symbol(),
                  token.balanceOf(address),
                ])
                assetDecimals = Number(decimals)
                assetSymbol = symbol || undefined
                walletBalance = Number(ethers.formatUnits(walletBal, assetDecimals))
                const key = ethers.getAddress(assetAddr)
                walletMap.set(key, {
                  symbol: assetSymbol || key.slice(0, 6),
                  amount: walletBalance,
                })
              } catch (err) {
                if (process.env.NODE_ENV !== "production") {
                  console.warn("[PortfolioView] asset lookup failed", err)
                }
              }
            }
            const unitNav = Number(ethers.formatUnits(ps, 18))
            out.push({
              vaultId: v.id,
              vaultName: v.name,
              shares,
              unitNav,
              currentValue: shares * unitNav,
              unlockDate: Number(lock) > 0 ? new Date(Number(lock) * 1000) : null,
              assetSymbol,
              walletBalance,
              assetAddress: ethers.isAddress(assetAddr) ? ethers.getAddress(assetAddr) : undefined,
            })
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[PortfolioView] vault load failed", err)
            }
          }
        }
        if (alive) {
          setPositions(out)
          setWalletBalances(Array.from(walletMap.values()))
        }
      } catch {}
    }
    load()
    const id = setInterval(load, 15000)
    return () => { alive = false; clearInterval(id) }
  }, [address])

  const totalValue = useMemo(() => positions.reduce((s, p) => s + p.currentValue, 0), [positions])
  const totalCost = useMemo(() => positions.reduce((s, p) => s + p.shares * 1.0, 0), [positions])
  const totalPnL = totalValue - totalCost
  const totalPnLPercent = totalCost > 0 ? (totalValue / totalCost - 1) * 100 : 0
  const primaryWalletBalance = walletBalances.length ? walletBalances[0] : null

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3">My Portfolio</h1>
          <p className="text-muted-foreground">Track your vault positions and performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 gradient-card border-border/40">
            <div className="text-sm text-muted-foreground mb-2">Total Value</div>
            <div className="text-3xl font-bold font-mono">${totalValue.toFixed(2)}</div>
          </Card>
          <Card className="p-6 gradient-card border-border/40">
            <div className="text-sm text-muted-foreground mb-2">Total Cost</div>
            <div className="text-3xl font-bold font-mono">${totalCost.toFixed(2)}</div>
          </Card>
          <Card className="p-6 gradient-card border-border/40">
            <div className="text-sm text-muted-foreground mb-2">Total P&L</div>
            <div
              className={`text-3xl font-bold flex items-center gap-2 ${totalPnL >= 0 ? "text-success" : "text-destructive"}`}
            >
              {totalPnL >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}$
              {Math.abs(totalPnL).toFixed(2)} ({totalPnLPercent >= 0 ? "+" : ""}
              {totalPnLPercent.toFixed(2)}%)
            </div>
          </Card>
          {primaryWalletBalance && (
            <Card className="p-6 gradient-card border-border/40">
              <div className="text-sm text-muted-foreground mb-2">Wallet Balance ({primaryWalletBalance.symbol})</div>
              <div className="text-3xl font-bold font-mono">{primaryWalletBalance.amount.toFixed(2)}</div>
            </Card>
          )}
        </div>

        {walletBalances.length > 1 && (
          <div className="mb-8 text-sm text-muted-foreground flex flex-wrap gap-3">
            {walletBalances.map((wb) => (
              <span key={wb.symbol} className="px-3 py-1 rounded-full border border-border/40 bg-muted/40 font-mono">
                {wb.symbol}: {wb.amount.toFixed(2)}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {positions.map((position) => {
            const isLocked = position.unlockDate ? (position.unlockDate > new Date()) : false

            return (
              <Card key={position.vaultId} className="p-6 gradient-card border-border/40">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{position.vaultName}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{position.vaultId}</p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Shares</div>
                      <div className="font-semibold font-mono">{position.shares.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Current Value</div>
                      <div className="font-semibold font-mono">${position.currentValue.toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">NAV × Shares</div>
                    </div>
                    {position.assetSymbol && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Wallet Balance</div>
                        <div className="font-semibold font-mono">
                          {position.walletBalance != null ? `${position.walletBalance.toFixed(2)} ${position.assetSymbol}` : "—"}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Status</div>
                      {isLocked ? (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Locked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-success border-success/40">
                          Unlocked
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/vault/${position.vaultId}`}>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        View
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button size="sm" disabled={isLocked} onClick={() => setWdOpen(position.vaultId)}>Withdraw</Button>
                  </div>
                </div>
                {wdOpen === position.vaultId && (
                  <WithdrawModal open={true} onOpenChange={(o) => { if (!o) setWdOpen(null) }} vaultId={position.vaultId} />
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
