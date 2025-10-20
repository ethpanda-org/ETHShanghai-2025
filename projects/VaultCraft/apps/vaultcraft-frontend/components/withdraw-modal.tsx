"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { useToast } from "@/hooks/use-toast"
import { ethers } from "ethers"

const VAULT_ABI = [
  "function ps() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function nextRedeemAllowed(address) view returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256 assetsOut)",
]

export function WithdrawModal({ open, onOpenChange, vaultId }: { open: boolean; onOpenChange: (o: boolean) => void; vaultId: string }) {
  const [shares, setShares] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [ps, setPs] = useState<number>(1)
  const { connected, address, connect, ensureHyperChain, isHyper } = useWallet()
  const { toast } = useToast()

  useEffect(() => {
    let alive = true
    async function readLock() {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
        const v = new ethers.Contract(vaultId, VAULT_ABI, provider)
        const [psRaw, lockTs] = await Promise.all([
          v.ps(),
          address ? v.nextRedeemAllowed(address) : Promise.resolve(0n),
        ])
        if (!alive) return
        setPs(Number(psRaw) / 1e18)
        setLockedUntil(Number(lockTs))
      } catch {}
    }
    readLock()
    return () => { alive = false }
  }, [vaultId, address])

  const canRedeem = lockedUntil ? (Date.now() / 1000 >= lockedUntil) : true

  async function doWithdraw() {
    setErr(null)
    setMsg(null)
    try {
      if (!ethers.isAddress(vaultId)) throw new Error("Invalid vault address")
      if (!connected) await connect()
      if (!isHyper) await ensureHyperChain()
      const eth = (window as any).ethereum
      if (!eth) throw new Error("No wallet provider")
      const provider = new ethers.BrowserProvider(eth)
      const signer = await provider.getSigner()
      const v = new ethers.Contract(vaultId, VAULT_ABI, signer)
      const decShares = ethers.parseUnits(shares || "0", 18)
      if (decShares <= 0n) throw new Error("Invalid share amount")
      const tx = await v.redeem(decShares, address, address)
      setMsg(`Redeeming... ${tx.hash}`)
      await tx.wait()
      setMsg(`Redeem confirmed: ${tx.hash}`)
      toast({ title: "Withdraw confirmed", description: `Tx ${tx.hash.slice(0, 10)}...` })
      onOpenChange(false)
    } catch (e: any) {
      const s = e?.shortMessage || e?.message || String(e)
      setErr(s)
      toast({ title: "Withdraw failed", description: s, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw</DialogTitle>
          <DialogDescription>Redeem your shares for underlying assets.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shares">Shares</Label>
            <Input id="shares" type="number" placeholder="0.00" value={shares} onChange={(e) => setShares(e.target.value)} />
          </div>

          {!canRedeem && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 flex gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-warning">Still Locked</p>
                <p className="text-muted-foreground">Redeem allowed after {lockedUntil && new Date(lockedUntil * 1000).toLocaleString()}.</p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current NAV</span>
              <span className="font-mono font-semibold">${ps.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {err && (<div className="text-sm text-destructive mb-2">{err}</div>)}
        {msg && (<div className="text-xs text-muted-foreground mb-2 break-all">{msg}</div>)}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={busy}>Cancel</Button>
          <Button onClick={() => doWithdraw()} className="flex-1" disabled={busy || !canRedeem}>{busy ? "Processing..." : "Confirm Withdraw"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
