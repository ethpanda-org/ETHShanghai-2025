"use client"

import { useAccount } from "wagmi"
import { useHasIdentity, useMintIdentity, useWatchIdentityMinted } from "@/lib/contracts/hooks/use-identity"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Loader2, Shield } from "lucide-react"
import { useState } from "react"

export function IdentityCard() {
  const { address } = useAccount()
  const { data: hasIdentity, isLoading: checkingIdentity } = useHasIdentity(address)
  const { mintIdentity, isPending, isConfirming, isSuccess } = useMintIdentity()
  const [justMinted, setJustMinted] = useState(false)

  useWatchIdentityMinted((account, tokenId) => {
    if (account === address) {
      setJustMinted(true)
    }
  })

  const handleMint = async () => {
    try {
      // In production, this would upload metadata to IPFS
      const metadataURI = `ipfs://QmExample/${address}`
      await mintIdentity(metadataURI)
    } catch (error) {
      console.error("[v0] Failed to mint identity:", error)
    }
  }

  if (checkingIdentity) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/40">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">检查身份状态...</span>
        </div>
      </Card>
    )
  }

  if (hasIdentity || justMinted || isSuccess) {
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-xl border-primary/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">身份已验证</h3>
            <p className="text-sm text-muted-foreground">您已拥有平台身份 NFT</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/40">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Shield className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">铸造身份 NFT</h3>
          <p className="text-sm text-muted-foreground mb-4">获取您的唯一身份凭证，开始在平台上的创作之旅</p>
          <Button onClick={handleMint} disabled={isPending || isConfirming} className="w-full sm:w-auto">
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isPending ? "等待确认..." : "铸造中..."}
              </>
            ) : (
              "铸造身份 NFT"
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
