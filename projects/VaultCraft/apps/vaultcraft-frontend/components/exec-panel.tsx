"use client"

import { useState, useEffect, useCallback } from "react"
import { BACKEND_URL } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function ExecPanel({ vaultId }: { vaultId: string }) {
  const [symbol, setSymbol] = useState("ETH")
  const [size, setSize] = useState("0.1")
  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reduceOnly, setReduceOnly] = useState(false)
  const [leverage, setLeverage] = useState<string>("")
  const [minNotional, setMinNotional] = useState<number | null>(null)
  const [levRange, setLevRange] = useState<[number, number] | null>(null)
  const { toast } = useToast()

  // Load risk hints from backend status for UX prompts
  const loadRisk = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/status`, { cache: "no-store" })
      if (!r.ok) return
      const b = await r.json()
      const mn = b?.flags?.exec_min_notional_usd
      if (typeof mn === 'number') setMinNotional(mn)
      const minL = b?.flags?.exec_min_leverage, maxL = b?.flags?.exec_max_leverage
      if (typeof minL === 'number' && typeof maxL === 'number') setLevRange([minL, maxL])
    } catch {}
  }, [])

  useEffect(() => {
    void loadRisk()
  }, [loadRisk])

  function mapPretradeError(s: string | undefined): string {
    if (!s) return "Pretrade check failed"
    const t = s.toLowerCase()
    if (t.includes("symbol") && t.includes("not allowed")) return "Symbol not in allowlist"
    if (t.includes("leverage")) return "Leverage out of bounds"
    if (t.includes("below minimum")) return "Notional below minimum ($10)"
    if (t.includes("size") || t.includes("notional")) return "Size exceeds risk limit"
    if (t.includes("side")) return "Invalid side"
    return s
  }

  function extractAckError(body: any): string | null {
    try {
      const ack = body?.payload?.ack ?? body?.ack ?? body
      const js = typeof ack === 'string' ? ack : JSON.stringify(ack)
      const s = js.toLowerCase()
      if (s.includes('order must have minimum value')) return 'Notional below minimum ($10)'
      if (s.includes('too far from oracle')) return 'Close rejected by price band. Try again shortly.'
      if (s.includes('no position')) return 'No position to close'
      if (s.includes('error')) return 'Exchange rejected the order'
      return null
    } catch { return null }
  }

  async function send(path: string) {
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      // pretrade check
      const pre = new URLSearchParams()
      pre.set("symbol", symbol)
      pre.set("size", size)
      pre.set("side", path.includes("open") ? side : "close")
      if (reduceOnly) pre.set("reduce_only", "true")
      if (leverage) pre.set("leverage", leverage)
      const preUrl = `${BACKEND_URL}/api/v1/pretrade?${pre.toString()}`
      const pr = await fetch(preUrl)
      const pj = await pr.json()
      if (!pj.ok) {
        setError(mapPretradeError(pj.error))
        return
      }
      const params = new URLSearchParams()
      params.set("vault", vaultId)
      params.set("symbol", symbol)
      if (path.includes("open")) {
        params.set("size", size)
        params.set("side", side)
        if (reduceOnly) params.set("reduce_only", "true")
        if (leverage) params.set("leverage", leverage)
      } else {
        params.set("size", size)
      }
      const url = `${BACKEND_URL}${path}?${params.toString()}`
      const r = await fetch(url, { method: "POST" })
      const body = await r.json()
      const ackErr = extractAckError(body)
      if (ackErr) {
        setError(ackErr)
        toast({ title: "Execution warning", description: ackErr, variant: "destructive" })
      }
      const attempts = typeof body?.attempts === "number" ? body.attempts : 1
      if (!ackErr && attempts > 1) {
        toast({ title: "Retried", description: `Exchange accepted on attempt ${attempts}.`, variant: "default" })
      }
      setMsg(JSON.stringify(body, null, 2))
      if (body?.ok && !ackErr) {
        toast({ title: path.includes("open") ? "Order sent" : "Close sent", description: body.dry_run ? "Dry-run payload generated" : "Check events feed for fills." })
      } else if (body?.error) {
        toast({ title: "Execution failed", description: body.error, variant: "destructive" })
      }
    } catch (e: any) {
      setError(e?.message || String(e))
      toast({ title: "Execution error", description: e?.message || String(e), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 rounded-md border border-border/40">
      <div className="text-sm text-muted-foreground mb-2">Demo Exec (dry-run unless enabled)</div>
      <div className="flex gap-2 items-center mb-2">
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="bg-transparent border rounded px-2 py-1">
          <option>ETH</option>
          <option>BTC</option>
        </select>
        <input value={size} onChange={(e) => setSize(e.target.value)} className="bg-transparent border rounded px-2 py-1 w-24" />
        <select value={side} onChange={(e) => setSide(e.target.value as any)} className="bg-transparent border rounded px-2 py-1">
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <input placeholder="Leverage" value={leverage} onChange={(e)=>setLeverage(e.target.value)} className="bg-transparent border rounded px-2 py-1 w-24" />
        <label className="text-xs flex items-center gap-1">
          <input type="checkbox" checked={reduceOnly} onChange={(e)=>setReduceOnly(e.target.checked)} /> reduce-only
        </label>
        <Button size="sm" disabled={busy} onClick={() => send("/api/v1/exec/open")}>{busy ? "Sending..." : "Open"}</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => send("/api/v1/exec/close")}>{busy ? "Sending..." : "Close"}</Button>
      </div>
      {(minNotional != null || levRange) && (
        <div className="text-xs text-muted-foreground mb-2">{minNotional != null ? `Min notional $${minNotional}` : ''} {levRange ? ` · Lev ${levRange[0]}–${levRange[1]}x` : ''}</div>
      )}
      {error && (
        <div className="text-xs text-destructive mb-2">{error}</div>
      )}
      {msg && (
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">{msg}</pre>
      )}
    </div>
  )
}
