"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ethers } from "ethers"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { StatusBar } from "@/components/status-bar"
import { ExecPanel } from "@/components/exec-panel"
import { useWallet } from "@/hooks/use-wallet"
import { BACKEND_URL, DEFAULT_ASSET_ADDRESS } from "@/lib/config"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

type VaultSummary = {
  id: string
  name?: string
  type?: string
  asset?: string
  tag?: string
}

const MGMT_ABI = [
  "function setWhitelist(address u, bool allowed)",
  "function setLockMinDays(uint256 daysMin)",
  "function setPerformanceFee(uint256 pBps)",
  "function pause()",
  "function unpause()",
  "function asset() view returns (address)",
  "function admin() view returns (address)",
  "function manager() view returns (address)",
  "function guardian() view returns (address)",
  "function performanceFeeP() view returns (uint256)",
  "function lockMinSeconds() view returns (uint256)",
  "function adapterAllowed(address) view returns (bool)",
]

const shorten = (value: string, prefix = 6, suffix = 4) => {
  if (!value) return ""
  if (value.length <= prefix + suffix + 3) return value
  return `${value.slice(0, prefix)}...${value.slice(-suffix)}`
}
export default function ManagerPage() {
  const [activeTab, setActiveTab] = useState<"launch" | "execute" | "settings">("launch")
  const { connect, isHyper, address, ensureHyperChain } = useWallet()
  const [asset, setAsset] = useState(DEFAULT_ASSET_ADDRESS)
  const [slug] = useState(() => Date.now().toString(36).toUpperCase())
  const [name, setName] = useState(() => `Vault-${slug}`)
  const [symbol, setSymbol] = useState(() => `V${slug.slice(-4)}`)
  const [isPrivate, setIsPrivate] = useState(false)
  const [pBps, setPBps] = useState("1000")
  const [lockDays, setLockDays] = useState("1")
  const [deployMsg, setDeployMsg] = useState<string | null>(null)
  const [deployErr, setDeployErr] = useState<string | null>(null)
  const [vaultAddr, setVaultAddr] = useState("")
  const [mgmtMsg, setMgmtMsg] = useState<string | null>(null)
  const [adapterAddr, setAdapterAddr] = useState("")
  const [newManager, setNewManager] = useState("")
  const [newGuardian, setNewGuardian] = useState("")
  const [readInfo, setReadInfo] = useState<any | null>(null)
  const [devMsg, setDevMsg] = useState<string | null>(null)
  const [assetInfo, setAssetInfo] = useState<{ symbol?: string; decimals?: number } | null>(null)
  const [assetBalance, setAssetBalance] = useState<string | null>(null)
  const [assetLoading, setAssetLoading] = useState(false)
  const [lastDeployed, setLastDeployed] = useState<string | null>(null)
  const [vaults, setVaults] = useState<VaultSummary[]>([])
  const [vaultsLoading, setVaultsLoading] = useState(false)
  const [vaultsError, setVaultsError] = useState<string | null>(null)
  const [advancedLaunch, setAdvancedLaunch] = useState(false)
  const [advancedManage, setAdvancedManage] = useState(false)

  const validVault = ethers.isAddress(vaultAddr)

  useEffect(() => {
    let cancelled = false
    async function loadMeta(currentAsset: string) {
      if (!ethers.isAddress(currentAsset)) {
        setAssetInfo(null)
        setAssetBalance(null)
        return
      }
      try {
        setAssetLoading(true)
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
        const contract = new ethers.Contract(
          currentAsset,
          [
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function balanceOf(address) view returns (uint256)",
          ],
          provider
        )
        const [sym, decimalsRaw] = await Promise.all([
          contract.symbol().catch(() => ""),
          contract.decimals().catch(() => 18),
        ])
        let bal: string | null = null
        const decimals = Number(decimalsRaw)
        if (address) {
          try {
            const owned = await contract.balanceOf(address)
            bal = ethers.formatUnits(owned, decimals)
          } catch {
            bal = null
          }
        }
        if (!cancelled) {
          setAssetInfo({ symbol: sym || undefined, decimals })
          setAssetBalance(bal)
        }
      } catch {
        if (!cancelled) {
          setAssetInfo(null)
          setAssetBalance(null)
        }
      } finally {
        if (!cancelled) setAssetLoading(false)
      }
    }
    void loadMeta(asset)
    return () => {
      cancelled = true
    }
  }, [asset, address])

  const loadVaults = useCallback(async () => {
    setVaultsLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/vaults`)
      const body = await res.json().catch(() => ({}))
      const list = Array.isArray(body?.vaults) ? body.vaults : []
      const seen = new Set<string>()
      const normalized: VaultSummary[] = []
      for (const item of list) {
        if (typeof item?.id !== "string") continue
        const id = item.id
        const key = id.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        let displayName = typeof item?.name === "string" && item.name.trim().length ? item.name.trim() : `Vault-${id.slice(2, 6).toUpperCase()}`
        if (displayName === "VaultCraft (Hyper Testnet)") {
          displayName = `Vault-${id.slice(2, 6).toUpperCase()}`
        }
        normalized.push({
          id,
          name: displayName,
          type: item?.type,
          asset: item?.asset,
        })
      }
      setVaults(normalized)
      setVaultsError(null)
      if (!DEFAULT_ASSET_ADDRESS) {
        setAsset((prev) => {
          if (prev) return prev
          const fallback = normalized.find(
            (item) => typeof item.asset === "string" && ethers.isAddress(item.asset)
          )?.asset
          return fallback ?? prev
        })
      }
    } catch {
      setVaultsError("无法读取已部署的 Vault 列表，请确认后端 /api/v1/vaults 可访问。")
    } finally {
      setVaultsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVaults()
  }, [loadVaults])

  useEffect(() => {
    if (lastDeployed) {
      setVaultAddr(lastDeployed)
    }
  }, [lastDeployed])

  const vaultOptions = useMemo(() => {
    const map = new Map<string, VaultSummary>()
    for (const v of vaults) {
      map.set(v.id.toLowerCase(), { ...v })
    }
    if (lastDeployed) {
      const key = lastDeployed.toLowerCase()
      const existing = map.get(key)
      map.set(key, { ...(existing ?? { id: lastDeployed }), tag: "最近部署" })
    }
    return Array.from(map.values())
  }, [vaults, lastDeployed])

  const selectedVaultValue = useMemo(() => {
    if (!vaultAddr) return ""
    const match = vaultOptions.find((v) => v.id.toLowerCase() === vaultAddr.toLowerCase())
    return match ? match.id : ""
  }, [vaultAddr, vaultOptions])

  const vaultPlaceholder = "选择一个已部署的 Vault"

  async function deploy() {
    setDeployErr(null)
    setDeployMsg(null)
    try {
      await connect()
      await ensureHyperChain?.()
      if (!isHyper) throw new Error("请切换到 Hyper Testnet (chain 998)")
      if (!ethers.isAddress(asset)) throw new Error("请输入合法的资产地址（例如 Hyper Testnet USDC）")
      const res = await fetch(`${BACKEND_URL}/api/v1/artifacts/vault`, { headers: { Accept: "application/json" } })
      let artifact: any = null
      try {
        artifact = await res.json()
      } catch {
        artifact = null
      }
      if (!res.ok) {
        const statusMsg = artifact?.error || `Artifact fetch failed (status ${res.status})`
        throw new Error(statusMsg)
      }
      if (!artifact?.bytecode || !artifact?.abi) {
        throw new Error(artifact?.error || "Artifact not available. Run `npx hardhat compile` then restart backend.")
      }
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const admin = await signer.getAddress()
      const args = [asset, name, symbol, admin, admin, admin, isPrivate, BigInt(pBps), BigInt(lockDays)]
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)
      const tx = await factory.deploy(...args)
      setDeployMsg("部署进行中…")
      const deployed = await tx.waitForDeployment()
      const addr = await deployed.getAddress()
      setLastDeployed(addr)
      setDeployMsg(`部署成功：${addr}`)
      try {
        const params = new URLSearchParams({ vault: addr })
        if (asset) params.set("asset", asset)
        params.set("type", isPrivate ? "private" : "public")
        params.set("name", name || `Vault-${addr.slice(2, 6)}`)
        await fetch(`${BACKEND_URL}/api/v1/register_deployment?${params.toString()}`, { method: "POST" })
        setVaults((prev) => {
          const existing = new Map<string, VaultSummary>()
          const nextEntry: VaultSummary = { id: addr, name, type: isPrivate ? "private" : "public", asset }
          existing.set(addr.toLowerCase(), { ...nextEntry, tag: "最近部署" })
          for (const v of prev) {
            if (!existing.has(v.id.toLowerCase())) {
              existing.set(v.id.toLowerCase(), v)
            }
          }
          return Array.from(existing.values())
        })
        void loadVaults()
      } catch {
        // registry failure is non-blocking
      }
    } catch (err: any) {
      const raw = err?.shortMessage || err?.message || String(err)
      if (typeof raw === "string" && raw.includes("Failed to fetch")) {
        setDeployErr("无法访问后端 API。请确认 FastAPI 服务运行中，并在 .env 配置 NEXT_PUBLIC_BACKEND_URL。")
      } else {
        setDeployErr(raw)
      }
    }
  }

  async function call(fn: string, ...params: any[]) {
    if (!validVault) {
      setMgmtMsg("请输入有效的 Vault 地址")
      return
    }
    setMgmtMsg(null)
    try {
      await connect()
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(vaultAddr, MGMT_ABI, signer)
      // @ts-ignore dynamic call
      const tx = await contract[fn](...params)
      setMgmtMsg(`${fn} 提交中…`)
      const receipt = await tx.wait()
      setMgmtMsg(`${fn} confirmed: ${receipt?.transactionHash ?? tx.hash}`)
    } catch (err: any) {
      setMgmtMsg(err?.shortMessage || err?.message || String(err))
    }
  }

  async function readBack() {
    if (!validVault) {
      setMgmtMsg("请输入有效的 Vault 地址")
      return
    }
    setMgmtMsg(null)
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const contract = new ethers.Contract(vaultAddr, MGMT_ABI, provider)
      const [assetAddr, admin, manager, guardian, perf, lock] = await Promise.all([
        contract.asset(),
        contract.admin(),
        contract.manager(),
        contract.guardian(),
        contract.performanceFeeP(),
        contract.lockMinSeconds(),
      ])
      let adapterAllowed = false
      if (ethers.isAddress(adapterAddr)) {
        try {
          adapterAllowed = await contract.adapterAllowed(adapterAddr)
        } catch {
          adapterAllowed = false
        }
      }
      setReadInfo({
        asset: assetAddr,
        admin,
        manager,
        guardian,
        performanceFeeP: Number(perf),
        lockDays: Math.floor(Number(lock) / 86400),
        adapterAllowed,
      })
    } catch (err: any) {
      setMgmtMsg(err?.shortMessage || err?.message || String(err))
    }
  }

  async function deployMockAsset() {
    setDevMsg(null)
    try {
      await connect()
      const res = await fetch(`${BACKEND_URL}/api/v1/artifacts/mockerc20`, { headers: { Accept: "application/json" } })
      let artifact: any = null
      try {
        artifact = await res.json()
      } catch {
        artifact = null
      }
      if (!res.ok) {
        throw new Error(artifact?.error || `MockERC20 artifact fetch failed (status ${res.status})`)
      }
      if (!artifact?.bytecode || !artifact?.abi) {
        throw new Error(artifact?.error || "MockERC20 artifact not available. Run `npx hardhat compile` then restart backend.")
      }
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)
      const tx = await factory.deploy("USD Stable", "USDS")
      setDevMsg("部署 MockERC20 中…")
      const deployed = await tx.waitForDeployment()
      const addressMock = await deployed.getAddress()
      const contract = new ethers.Contract(addressMock, artifact.abi, signer)
      const mintTx = await contract.mint(await signer.getAddress(), ethers.parseEther("1000000"))
      setDevMsg("正在向经理地址铸造测试余额…")
      await mintTx.wait()
      setAsset(addressMock)
      setDevMsg(`MockERC20 已部署并发放余额：${addressMock}`)
      void loadVaults()
    } catch (err: any) {
      const raw = err?.shortMessage || err?.message || String(err)
      if (typeof raw === "string" && raw.includes("Failed to fetch")) {
        setDevMsg("无法访问后端 API。请确认 FastAPI 服务运行中，或配置 NEXT_PUBLIC_BACKEND_URL 指向后端地址。")
      } else {
        setDevMsg(raw)
      }
    }
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <StatusBar />
      <main className="flex-1">
        <section className="py-12">
          <div className="container mx-auto px-4 space-y-8">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="launch">创建金库</TabsTrigger>
                <TabsTrigger value="execute">仓位执行</TabsTrigger>
                <TabsTrigger value="settings">金库管理</TabsTrigger>
              </TabsList>

              <TabsContent value="launch">
                <Card className="p-6 gradient-card border-border/40 space-y-4">
                  <h2 className="text-lg font-semibold">Launch Checklist</h2>
                  <div className="grid gap-3">
                    <Label>资产地址（ERC20）</Label>
                    <Input value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="0x..." />
                    {assetLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    ) : assetInfo ? (
                      <div className="rounded border border-border/40 bg-muted/20 p-3 text-xs space-y-1">
                        <div>Symbol: {assetInfo.symbol ?? "?"}</div>
                        <div>Decimals: {assetInfo.decimals ?? "?"}</div>
                        <div>
                          我的余额：{assetBalance ?? "unknown"} {assetInfo.symbol ?? ""}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        无法读取 token metadata。请确认地址正确或在 <code>.env</code> 配置 <code>NEXT_PUBLIC_DEFAULT_ASSET_ADDRESS</code>。
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Symbol</Label>
                      <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded border border-border/40 bg-muted/20 px-4 py-3">
                    <Switch id="launch-private" checked={isPrivate} onCheckedChange={(checked) => setIsPrivate(checked)} />
                    <div className="space-y-1">
                      <Label htmlFor="launch-private" className="text-sm font-medium">Private Vault</Label>
                      <p className="text-xs text-muted-foreground">
                        私募 vault 仅向白名单披露绩效，公募 vault 与 Hyper 一样完全透明。
                      </p>
                    </div>
                  </div>
                  <Collapsible open={advancedLaunch} onOpenChange={setAdvancedLaunch}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">高级参数</h3>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">{advancedLaunch ? "收起" : "展开"}</Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="space-y-3 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>绩效费 (bps)</Label>
                          <Input value={pBps} onChange={(e) => setPBps(e.target.value)} placeholder="1000" />
                        </div>
                        <div>
                          <Label>最短锁定期 (天)</Label>
                          <Input value={lockDays} onChange={(e) => setLockDays(e.target.value)} placeholder="1" />
                        </div>
                      </div>
                      <div className="rounded border border-dashed border-border/40 p-4 space-y-3 text-xs text-muted-foreground">
                        <div className="text-sm font-semibold text-foreground">Dev helper</div>
                        <p>测试时可一键部署 MockERC20 并铸造余额。</p>
                        <Button size="sm" variant="outline" onClick={deployMockAsset}>Dev: Deploy MockERC20 + Mint</Button>
                        {devMsg && <div className="text-xs text-muted-foreground break-all">{devMsg}</div>}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  <Separator />
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>✅ 推荐经理自投 ≥5%</p>
                    <p>✅ 部署后立即可申购/赎回</p>
                    <p>✅ 公募默认透明，私募需白名单</p>
                    {lastDeployed && (
                      <p>
                        最近部署：
                        <Link href={/vault/} className="text-primary underline">
                          {shorten(lastDeployed)}
                        </Link>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Button variant="outline" onClick={() => loadVaults()} disabled={vaultsLoading}>
                      {vaultsLoading ? "刷新中..." : "刷新已部署列表"}
                    </Button>
                    <Button onClick={deploy}>Deploy Vault</Button>
                  </div>
                  {deployErr && <div className="text-sm text-destructive">{deployErr}</div>}
                  {deployMsg && <div className="text-xs text-muted-foreground break-all">{deployMsg}</div>}
                </Card>
              </TabsContent>

              <TabsContent value="execute">
                <Card className="p-6 gradient-card border-border/40 space-y-4">
                  <h2 className="text-lg font-semibold">Perps Execution (Manager)</h2>
                  <div className="space-y-3">
                    <Label>Vault Address</Label>
                    <Select
                      value={selectedVaultValue}
                      onValueChange={(value) => {
                        setVaultAddr(value)
                        setReadInfo(null)
                      }}
                    >
                      <SelectTrigger disabled={vaultsLoading && vaultOptions.length === 0}>
                        <SelectValue placeholder={vaultPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {vaultsLoading && vaultOptions.length === 0 ? (
                          <div className="space-y-2 p-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        ) : (
                          <>
                            {vaultOptions.map((opt) => {
                              const label = opt.name && opt.name.length ? opt.name : shorten(opt.id)
                              const meta: string[] = []
                              if (opt.tag) meta.push(opt.tag)
                              meta.push(shorten(opt.id))
                              if (opt.type) meta.push(opt.type)
                              if (opt.asset) meta.push(`asset ${shorten(opt.asset)}`)
                              return (
                                <SelectItem key={opt.id} value={opt.id}>
                                  <div className="flex flex-col">
                                    <span>{label}</span>
                                    <span className="text-xs text-muted-foreground">{meta.join(" · ")}</span>
                                  </div>
                                </SelectItem>
                              )
                            })}
                            {vaultAddr && !selectedVaultValue && (
                              <SelectItem value={vaultAddr}>{vaultAddr}（手动输入）</SelectItem>
                            )}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <Input value={vaultAddr} onChange={(e) => setVaultAddr(e.target.value)} placeholder="或手动输入 0x..." />
                    <Button variant="outline" size="sm" onClick={() => loadVaults()} disabled={vaultsLoading}>
                      {vaultsLoading ? "刷新中..." : "刷新列表"}
                    </Button>
                    {vaultsError && <div className="text-xs text-destructive">{vaultsError}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={readBack} disabled={!validVault}>
                      Read Current
                    </Button>
                    {readInfo && (
                      <div className="text-xs text-muted-foreground grid gap-1">
                        <div>Asset {readInfo.asset}</div>
                        <div>Admin {readInfo.admin}</div>
                        <div>Manager {readInfo.manager}</div>
                        <div>Guardian {readInfo.guardian}</div>
                        <div>Perf Fee {readInfo.performanceFeeP} bps</div>
                        <div>Lock {readInfo.lockDays} day(s)</div>
                        {ethers.isAddress(adapterAddr) && <div>Adapter allowed: {String(readInfo.adapterAllowed)}</div>}
                      </div>
                    )}
                  </div>
                  {!validVault ? (
                    <div className="text-sm text-muted-foreground">请输入有效的 Vault 地址以启用执行面板。</div>
                  ) : (
                    <ExecPanel vaultId={vaultAddr} />
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card className="p-6 gradient-card border-border/40 space-y-4">
                  <h2 className="text-lg font-semibold">Manage Vault</h2>
                  <div className="space-y-3">
                    <Label>Vault Address</Label>
                    <Select
                      value={selectedVaultValue}
                      onValueChange={(value) => {
                        setVaultAddr(value)
                        setReadInfo(null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={vaultPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {vaultOptions.map((opt) => {
                          const label = opt.name && opt.name.length ? opt.name : shorten(opt.id)
                          const meta: string[] = []
                          if (opt.tag) meta.push(opt.tag)
                          meta.push(shorten(opt.id))
                          if (opt.type) meta.push(opt.type)
                          if (opt.asset) meta.push(`asset ${shorten(opt.asset)}`)
                          return (
                            <SelectItem key={opt.id} value={opt.id}>
                              <div className="flex flex-col">
                                <span>{label}</span>
                                <span className="text-xs text-muted-foreground">{meta.join(" · ")}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                        {vaultAddr && !selectedVaultValue && (
                          <SelectItem value={vaultAddr}>{vaultAddr}（手动输入）</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Input value={vaultAddr} onChange={(e) => setVaultAddr(e.target.value)} placeholder="或手动输入 0x..." />
                    {validVault && (
                      <Button size="sm" variant="outline" onClick={readBack}>
                        Read Current
                      </Button>
                    )}
                    {readInfo && (
                      <div className="text-xs text-muted-foreground grid gap-1">
                        <div>Asset {readInfo.asset}</div>
                        <div>Admin {readInfo.admin}</div>
                        <div>Manager {readInfo.manager}</div>
                        <div>Guardian {readInfo.guardian}</div>
                        <div>Perf Fee {readInfo.performanceFeeP} bps</div>
                        <div>Lock {readInfo.lockDays} day(s)</div>
                        {ethers.isAddress(adapterAddr) && <div>Adapter allowed: {String(readInfo.adapterAllowed)}</div>}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => call("pause")}>Pause</Button>
                    <Button variant="outline" onClick={() => call("unpause")}>Unpause</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div className="col-span-2">
                      <Label>Whitelist Address</Label>
                      <Input id="wl" placeholder="0x..." />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => {
                        const el = document.getElementById("wl") as HTMLInputElement
                        call("setWhitelist", el.value, true)
                      }}>Allow</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        const el = document.getElementById("wl") as HTMLInputElement
                        call("setWhitelist", el.value, false)
                      }}>Revoke</Button>
                    </div>
                  </div>
                  <Collapsible open={advancedManage} onOpenChange={setAdvancedManage}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">高级参数</h3>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">{advancedManage ? "收起" : "展开"}</Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="space-y-3 pt-3">
                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <Label>Perf Fee (bps)</Label>
                          <Input id="pf" placeholder="1000" />
                        </div>
                        <Button onClick={() => {
                          const el = document.getElementById("pf") as HTMLInputElement
                          call("setPerformanceFee", BigInt(el.value || "0"))
                        }}>Update</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <Label>Lock Days</Label>
                          <Input id="ld" placeholder="1" />
                        </div>
                        <Button onClick={() => {
                          const el = document.getElementById("ld") as HTMLInputElement
                          call("setLockMinDays", BigInt(el.value || "0"))
                        }}>Update</Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div className="col-span-2">
                          <Label>Adapter Address</Label>
                          <Input value={adapterAddr} onChange={(e)=>setAdapterAddr(e.target.value)} placeholder="0x..." />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => call("setAdapter", adapterAddr, true)}>Allow</Button>
                          <Button size="sm" variant="outline" onClick={() => call("setAdapter", adapterAddr, false)}>Revoke</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <Label>New Manager</Label>
                          <Input value={newManager} onChange={(e)=>setNewManager(e.target.value)} placeholder="0x..." />
                        </div>
                        <Button onClick={()=> call("setManager", newManager)}>Update Manager</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <Label>New Guardian</Label>
                          <Input value={newGuardian} onChange={(e)=>setNewGuardian(e.target.value)} placeholder="0x..." />
                        </div>
                        <Button onClick={()=> call("setGuardian", newGuardian)}>Update Guardian</Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  {mgmtMsg && <div className="text-xs text-muted-foreground break-all">{mgmtMsg}</div>}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
