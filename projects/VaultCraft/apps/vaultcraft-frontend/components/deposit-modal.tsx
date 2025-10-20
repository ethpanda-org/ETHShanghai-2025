"use client"

import { useState } from "react"
import { useLocale } from "@/components/locale-provider"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"

interface DepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vaultId: string
  asset?: string
  vault: {
    name: string
    unitNav: number
    lockDays: number
    performanceFee: number
  }
}

import { useWallet } from "@/hooks/use-wallet"
import { useToast } from "@/hooks/use-toast"
import { ethers } from "ethers"

const ERC20_ABI = [
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
]
const VAULT_ABI = [
  "function asset() view returns (address)",
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
]

export function DepositModal({ open, onOpenChange, vault, vaultId, asset }: DepositModalProps) {
  const [amount, setAmount] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const { connected, address, connect, ensureHyperChain, isHyper } = useWallet()
  const { t } = useLocale()
  const { toast } = useToast()

  const estimatedShares = amount ? (Number.parseFloat(amount) / vault.unitNav).toFixed(2) : "0.00"

  async function doDeposit() {
    setErr(null)
    setMsg(null)
    try {
      if (!ethers.isAddress(vaultId)) throw new Error("Invalid vault address")
      if (!connected) {
        await connect()
      }
      if (!isHyper) await ensureHyperChain()
      const eth = (window as any).ethereum
      if (!eth) throw new Error("No wallet provider")
      const provider = new ethers.BrowserProvider(eth)
      const signer = await provider.getSigner()
      const v = new ethers.Contract(vaultId, VAULT_ABI, signer)
      let assetAddr = asset
      if (!assetAddr) {
        assetAddr = await v.asset()
      }
      if (!ethers.isAddress(assetAddr)) throw new Error("Invalid asset address")
      const erc = new ethers.Contract(assetAddr, ERC20_ABI, signer)
      const decimals: number = await erc.decimals()
      const amt = ethers.parseUnits(amount || "0", decimals)
      if (amt <= 0n) throw new Error("Invalid amount")
      setBusy(true)
      // approve if needed
      const allowance: bigint = await erc.allowance(address, vaultId)
      if (allowance < amt) {
        const txa = await erc.approve(vaultId, amt)
        setMsg(`${t("deposit.status.approving", "Approving...")} ${txa.hash}`)
        await txa.wait()
      }
      const tx = await v.deposit(amt, address)
      setMsg(`${t("deposit.status.submitting", "Depositing...")} ${tx.hash}`)
      await tx.wait()
      setMsg(`${t("deposit.toast.success", "Deposit confirmed")}: ${tx.hash}`)
      toast({ title: t("deposit.toast.success", "Deposit confirmed"), description: `Tx ${tx.hash.slice(0, 10)}...` })
      onOpenChange(false)
    } catch (e: any) {
      const s = e?.shortMessage || e?.message || String(e)
      setErr(s)
      toast({ title: t("deposit.toast.error", "Deposit failed"), description: s, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("deposit.modalTitle", "Deposit to")} {vault.name}</DialogTitle>
          <DialogDescription>
            {t("deposit.description", "Enter the amount you wish to deposit. Your shares will be calculated based on the current NAV.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">{t("deposit.amountLabel", "Deposit Amount (USDC)")}</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("deposit.currentNav", "Current NAV")}</span>
              <span className="font-mono font-semibold">${vault.unitNav.toFixed(3)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("deposit.estimatedShares", "Estimated Shares")}</span>
              <span className="font-mono font-semibold">{estimatedShares}</span>
            </div>
          </div>

          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 flex gap-3">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-warning">{t("deposit.lockLabel", "Lock Period:")} {vault.lockDays} day(s)</p>
              <p className="text-muted-foreground">
                {t(
                  "deposit.lockHint",
                  "Your deposit will be locked for {days} day(s) before you can withdraw."
                ).replace("{days}", String(vault.lockDays))}
              </p>
            </div>
          </div>
        </div>

        {err && (<div className="text-sm text-destructive mb-2">{err}</div>)}
        {msg && (<div className="text-xs text-muted-foreground mb-2 break-all">{msg}</div>)}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={busy}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={() => doDeposit()} className="flex-1" disabled={busy}>
            {busy ? t("common.processing", "Processing...") : t("deposit.cta", "Confirm Deposit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
