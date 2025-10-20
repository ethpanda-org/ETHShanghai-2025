"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lock, Eye, TrendingUp, TrendingDown, ArrowUpRight, Wallet } from "lucide-react"
import { PerformanceChart } from "@/components/performance-chart"
import { DepositModal } from "@/components/deposit-modal"
import { WithdrawModal } from "@/components/withdraw-modal"
import { useEffect, useMemo, useState } from "react"
import { getVault } from "@/lib/api"
import { useOnchainVault } from "@/hooks/use-onchain-vault"
import { ExecPanel } from "@/components/exec-panel"
import { EventsFeed } from "@/components/events-feed"
import { useNavSeries } from "@/hooks/use-nav-series"
import { PositionsHistory } from "@/components/positions-history"
import { useWallet } from "@/hooks/use-wallet"
import { Input } from "@/components/ui/input"
import { ethers } from "ethers"
import { BACKEND_URL } from "@/lib/config"
import { useLocale } from "@/components/locale-provider"

type UIState = {
  id: string
  name: string
  type: "public" | "private"
  aum: number
  sharpe: number
  annualReturn: number
  volatility: number
  maxDrawdown: number
  recoveryDays: number
  performanceFee: number
  managementFee: number
  lockDays: number
  managerStake: number
  unitNav: number
  totalShares: number
}

const fallbackVault: UIState = {
  id: "0x1234...5678",
  name: "Alpha Momentum Strategy",
  type: "public",
  aum: 4250000,
  sharpe: 2.34,
  annualReturn: 24.5,
  volatility: 12.3,
  maxDrawdown: -8.2,
  recoveryDays: 45,
  performanceFee: 10,
  managementFee: 0,
  lockDays: 1,
  managerStake: 8.5,
  unitNav: 1.245,
  totalShares: 3414634,
}

export function VaultDetail({ vaultId }: { vaultId: string }) {
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [vault, setVault] = useState<UIState>(fallbackVault)
  const [asset, setAsset] = useState<string | null>(null)
  const chain = useOnchainVault(vaultId)
  const nav = useNavSeries(vaultId, 5000, 180)
  const [risk, setRisk] = useState<{ minLev?: number; maxLev?: number; maxNotional?: number; symbols?: string } | null>(null)
  const { connected } = useWallet()
  const validVault = ethers.isAddress(vaultId)
  const { t } = useLocale()

  useEffect(() => {
    let alive = true
    getVault(vaultId)
      .then((v) => {
        if (!alive) return
        const ui: UIState = {
          id: v.id,
          name: v.name,
          type: v.type,
          aum: v.aum ?? 1_000_000,
          sharpe: v.metrics?.sharpe ?? 0,
          annualReturn: (v.metrics?.ann_return ?? 0) * 100,
          volatility: (v.metrics?.ann_vol ?? 0) * 100,
          maxDrawdown: (v.metrics?.mdd ?? 0) * 100,
          recoveryDays: v.metrics?.recovery_days ?? 0,
          performanceFee: v.performanceFee,
          managementFee: v.managementFee,
          lockDays: v.lockDays,
          managerStake: 10,
          unitNav: v.unitNav,
          totalShares: v.totalShares,
        }
        setVault(ui)
        if (v.asset) setAsset(v.asset)
      })
      .catch(() => {})
    // load risk flags from backend status
    fetch(`${BACKEND_URL}/api/v1/status`).then(async (r) => {
      try {
        const b = await r.json()
        setRisk({
          minLev: b?.flags?.exec_min_leverage,
          maxLev: b?.flags?.exec_max_leverage,
          maxNotional: b?.flags?.exec_max_notional_usd,
          symbols: b?.flags?.allowed_symbols,
        })
      } catch {}
    }).catch(() => {})
    return () => {
      alive = false
    }
  }, [vaultId])

  const chartPoints = useMemo(() => {
    if (nav.series.length) {
      return nav.series.map((p) => ({
        date: new Date(p.ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        nav: p.nav,
      }))
    }
    // fallback deterministic curve
    return Array.from({ length: 90 }, (_, i) => ({
      date: `Day ${i + 1}`,
      nav: Number((1.0 + i * 0.003 + Math.sin(i / 8) * 0.02).toFixed(4)),
    }))
  }, [nav.series])

  const drawdown = useMemo(() => {
    let max = 0
    let dd = 0
    for (const p of nav.series) {
      if (p.nav > max) max = p.nav
      if (max > 0) {
        const cur = (max - p.nav) / max
        if (cur > dd) dd = cur
      }
    }
    return dd
  }, [nav.series])

  return (
    <>
      <section className="py-12 border-b border-border/40">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-3xl font-bold">{vault.name}</h1>
              <Badge variant="secondary" className="gap-1.5">
                {vault.type === "public" ? <Eye className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                <span className="capitalize">
                  {vault.type === "public" ? t("discovery.filter.public", "Public") : t("discovery.filter.private", "Private")}
                </span>
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono text-sm">{vault.id}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 gradient-card border-border/40">
              <div className="text-sm text-muted-foreground mb-1">{t("vault.metric.aum", "Total AUM")}</div>
              <div className="text-2xl font-bold font-mono">${(((chain.aum ?? vault.aum) as number) / 1_000_000).toFixed(2)}M</div>
            </Card>
            <Card className="p-4 gradient-card border-border/40">
              <div className="text-sm text-muted-foreground mb-1">{t("vault.metric.nav", "Unit NAV")}</div>
              <div className="text-2xl font-bold font-mono">${(chain.unitNav ?? vault.unitNav).toFixed(3)}</div>
            </Card>
            <Card className="p-4 gradient-card border-border/40">
              <div className="text-sm text-muted-foreground mb-1">{t("vault.metric.return", "Annual Return")}</div>
              <div className="text-2xl font-bold text-success flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {vault.annualReturn.toFixed(1)}%
              </div>
            </Card>
            <Card className="p-4 gradient-card border-border/40">
              <div className="text-sm text-muted-foreground mb-1">{t("vault.metric.sharpe", "Sharpe Ratio")}</div>
              <div className="text-2xl font-bold font-mono">{vault.sharpe.toFixed(2)}</div>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="gap-2" onClick={() => setShowDeposit(true)} disabled={!validVault}>
              <Wallet className="h-4 w-4" />
              {t("vault.actions.deposit", "Deposit")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={() => setShowWithdraw(true)}
              disabled={!validVault}
            >
              {t("vault.actions.withdraw", "Withdraw")}
            </Button>
            <Button size="lg" variant="ghost" className="gap-2">
              {t("vault.actions.explorer", "View on Explorer")}
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
          {!validVault && (
            <p className="text-xs text-muted-foreground mt-2">
              {t(
                "vault.placeholder.disabled",
                "Demo vault addresses use placeholders. Deploy or register a real vault (see Manager console) to enable deposit / withdraw actions."
              )}
            </p>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="performance">{t("vault.tabs.overview", "Overview")}</TabsTrigger>
              <TabsTrigger value="holdings">{t("vault.tabs.holdings", "Holdings")}</TabsTrigger>
              <TabsTrigger value="transactions">{t("vault.tabs.transactions", "Transactions")}</TabsTrigger>
              <TabsTrigger value="info">{t("vault.tabs.info", "Info")}</TabsTrigger>
              {process.env.NEXT_PUBLIC_ENABLE_DEMO_TRADING === "1" && (
                <TabsTrigger value="exec">{t("vault.actions.exec", "Exec")}</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="performance" className="space-y-6">
              <Card className="p-6 gradient-card border-border/40">
                <h3 className="text-lg font-semibold mb-6">NAV / PnL Curve</h3>
                {drawdown > 0.1 && (
                  <div className="mb-3 text-sm text-destructive">Alert: Drawdown {(drawdown * 100).toFixed(1)}% exceeds threshold</div>
                )}
                <PerformanceChart data={chartPoints} />
                <div className="mt-4 flex items-center gap-3">
                  <Button size="sm" variant="outline" onClick={() => {
                    // simulate a -10% shock by adding a snapshot
                    const last = nav.series.length ? nav.series[nav.series.length - 1].nav : vault.unitNav
                    const shock = Math.max(0, last * 0.9)
                    fetch(`${BACKEND_URL}/api/v1/nav/snapshot/${vaultId}?nav=${shock}`, { method: 'POST' })
                      .then(() => nav.refresh())
                      .catch(() => {})
                  }}>
                    {t("vault.actions.shock", "Simulate -10% Shock")}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t("vault.actions.shockHint", "Use to demonstrate alerting/drawdown handling")}
                  </span>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4 gradient-card border-border/40">
                  <div className="text-sm text-muted-foreground mb-2">{t("vault.metric.volatility", "Annual Volatility")}</div>
                  <div className="text-xl font-bold font-mono">{vault.volatility.toFixed(1)}%</div>
                </Card>
                <Card className="p-4 gradient-card border-border/40">
                  <div className="text-sm text-muted-foreground mb-2">{t("vault.metric.mdd", "Max Drawdown")}</div>
                  <div className="text-xl font-bold text-destructive flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    {vault.maxDrawdown.toFixed(1)}%
                  </div>
                </Card>
                <Card className="p-4 gradient-card border-border/40">
                  <div className="text-sm text-muted-foreground mb-2">{t("vault.metric.recovery", "Recovery Period")}</div>
                  <div className="text-xl font-bold font-mono">{vault.recoveryDays} days</div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="holdings">
                {vault.type === "public" ? (
                <Card className="p-6 gradient-card border-border/40">
                  <h3 className="text-lg font-semibold mb-4">{t("vault.holdings.title", "Current Holdings")}</h3>
                  <p className="text-muted-foreground mb-4">{t("vault.holdings.public", "Public vaults display holdings and history (derived from events).")}</p>
                  <PositionsHistory vaultId={vaultId} />
                </Card>
              ) : (
                <Card className="p-6 gradient-card border-border/40 text-center">
                  <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("vault.private.title", "Private Vault")}</h3>
                  <p className="text-muted-foreground">
                    {t("vault.private.placeholder", "Holdings are not disclosed for private vaults. Only NAV and performance metrics are visible.")}
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="transactions">
              <Card className="p-6 gradient-card border-border/40">
                <h3 className="text-lg font-semibold mb-4">{t("vault.events.title", "Recent Events")}</h3>
                <EventsFeed vaultId={vaultId} />
              </Card>
            </TabsContent>

            <TabsContent value="info">
              <Card className="p-6 gradient-card border-border/40">
                <h3 className="text-lg font-semibold mb-6">{t("vault.info.title", "Vault Information")}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border/40">
                    <span className="text-muted-foreground">{t("vault.info.performanceFee", "Performance Fee")}</span>
                    <span className="font-semibold">{vault.performanceFee}%</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/40">
                    <span className="text-muted-foreground">{t("vault.info.managementFee", "Management Fee")}</span>
                    <span className="font-semibold">{vault.managementFee}%</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/40">
                    <span className="text-muted-foreground">{t("vault.info.lock", "Minimum Lock Period")}</span>
                    <span className="font-semibold">{(chain.lockDays ?? vault.lockDays)} day(s)</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/40">
                    <span className="text-muted-foreground">{t("vault.info.managerStake", "Manager Stake")}</span>
                    <span className="font-semibold">{vault.managerStake.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground">{t("vault.info.totalShares", "Total Shares")}</span>
                    <span className="font-semibold font-mono">{(chain.totalSupply ?? vault.totalShares).toLocaleString()}</span>
                  </div>
                  {risk && (
                    <>
                      <div className="pt-4 border-t border-border/40" />
                      <div className="text-sm font-semibold">{t("vault.status.risk", "Risk Controls (Exec Service)")}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center justify-between py-2"><span className="text-muted-foreground">{t("vault.status.symbols", "Allowed Symbols")}</span><span className="font-mono">{risk.symbols}</span></div>
                        <div className="flex items-center justify-between py-2"><span className="text-muted-foreground">{t("vault.status.leverage", "Leverage Range")}</span><span className="font-mono">{risk.minLev} - {risk.maxLev}x</span></div>
                        <div className="flex items-center justify-between py-2"><span className="text-muted-foreground">{t("vault.status.maxNotional", "Max Notional")}</span><span className="font-mono">${risk.maxNotional?.toLocaleString()}</span></div>
                      </div>
                    </>
                  )}
                  {vault.type === 'private' && (
                    <>
                      <div className="pt-4 border-t border-border/40" />
                      <div className="text-sm font-semibold mb-2">{t("vault.private.joinTitle", "Join Private Vault")}</div>
                      <JoinPrivate vaultId={vaultId} enabled={connected} />
                    </>
                  )}
                </div>
              </Card>
            </TabsContent>

            {process.env.NEXT_PUBLIC_ENABLE_DEMO_TRADING === '1' && (
              <TabsContent value="exec">
                <ExecPanel vaultId={vaultId} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </section>

      <DepositModal open={showDeposit} onOpenChange={setShowDeposit} vault={vault} vaultId={vaultId} asset={asset || undefined} />
      <WithdrawModal open={showWithdraw} onOpenChange={setShowWithdraw} vaultId={vaultId} />
    </>
  )
}

function JoinPrivate({ vaultId, enabled }: { vaultId: string; enabled: boolean }) {
  const [code, setCode] = useState("")
  const [ok, setOk] = useState<boolean>(false)
  const [msg, setMsg] = useState<string | null>(null)
  const { t } = useLocale()
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
      <Input
        placeholder={t("vault.private.placeholderInput", "Invite code")}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-64"
      />
      <Button
        size="sm"
        disabled={!enabled || !code}
        onClick={() => {
          setOk(true)
          setMsg(
            t(
              "vault.private.joinSuccess",
              "Invite accepted (demo). Please deposit with wallet; on-chain whitelist must be configured beforehand."
            )
          )
        }}
      >
        {t("vault.private.join", "Join")}
      </Button>
      {ok && <span className="text-xs text-green-400">{t("vault.private.joined", "Joined (demo)")}</span>}
      {msg && <div className="text-xs text-muted-foreground">{msg}</div>}
    </div>
  )
}
