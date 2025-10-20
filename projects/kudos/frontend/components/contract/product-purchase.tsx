"use client"

import { useState, useEffect } from "react"
import { useAccount, useChainId } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTokenBalance, useApproveToken, usePurchaseProduct, useHasPurchasedProduct } from "@/lib/contracts/hooks"
import { getContractAddress } from "@/lib/contracts/addresses"
import { Loader2, ShoppingCart, CheckCircle2, Coins } from "lucide-react"
import { toast } from "sonner"
import { formatUnits, parseUnits } from "viem"

interface ProductPurchaseProps {
  productId: bigint
  productName: string
  price: string // 价格（代币数量）
  onPurchaseSuccess?: () => void
}

export function ProductPurchase({ productId, productName, price, onPurchaseSuccess }: ProductPurchaseProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [purchaseStep, setPurchaseStep] = useState<"idle" | "approving" | "purchasing">("idle")

  const marketplaceAddress = getContractAddress("MARKETPLACE", chainId)
  const { data: tokenBalance } = useTokenBalance()
  const { data: hasPurchased } = useHasPurchasedProduct(productId)
  const { approve, isPending: isApproving, isSuccess: approveSuccess } = useApproveToken()
  const { purchaseProduct, isPending: isPurchasing, isSuccess: purchaseSuccess } = usePurchaseProduct()

  // 监听授权成功后自动购买
  useEffect(() => {
    if (approveSuccess && purchaseStep === "approving") {
      setPurchaseStep("purchasing")
      handlePurchase()
    }
  }, [approveSuccess, purchaseStep])

  // 监听购买成功
  useEffect(() => {
    if (purchaseSuccess) {
      toast.success("购买成功！")
      setPurchaseStep("idle")
      onPurchaseSuccess?.()
    }
  }, [purchaseSuccess])

  const handleApproveAndPurchase = async () => {
    if (!address || !marketplaceAddress) {
      toast.error("请先连接钱包")
      return
    }

    try {
      setPurchaseStep("approving")
      const amount = parseUnits(price, 18) // 假设代币是 18 位小数
      await approve(marketplaceAddress, amount)
    } catch (error) {
      console.error("[v0] Approve error:", error)
      toast.error("授权失败，请重试")
      setPurchaseStep("idle")
    }
  }

  const handlePurchase = async () => {
    if (!address) return

    try {
      await purchaseProduct(productId, 1n) // 购买数量为 1
    } catch (error) {
      console.error("[v0] Purchase error:", error)
      toast.error("购买失败，请重试")
      setPurchaseStep("idle")
    }
  }

  if (!isConnected) {
    return (
      <Card className="border-border/40 shadow-apple bg-card/50 backdrop-blur-xl">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">请先连接钱包以购买</p>
        </CardContent>
      </Card>
    )
  }

  if (hasPurchased) {
    return (
      <Card className="border-border/40 shadow-apple bg-card/50 backdrop-blur-xl">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">已购买</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const balance = tokenBalance ? formatUnits(tokenBalance as bigint, 18) : "0"
  const hasEnoughBalance = tokenBalance && tokenBalance >= parseUnits(price, 18)

  return (
    <Card className="border-border/40 shadow-apple bg-card/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          购买产品
        </CardTitle>
        <CardDescription>{productName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">价格</span>
            <span className="font-medium flex items-center gap-1">
              <Coins className="h-4 w-4" />
              {price} TEST
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">您的余额</span>
            <span className={`font-medium ${!hasEnoughBalance ? "text-red-500" : ""}`}>
              {Number.parseFloat(balance).toFixed(4)} TEST
            </span>
          </div>
        </div>

        {!hasEnoughBalance && (
          <Badge variant="destructive" className="w-full justify-center">
            余额不足
          </Badge>
        )}

        <Button
          onClick={handleApproveAndPurchase}
          disabled={!hasEnoughBalance || isApproving || isPurchasing || purchaseStep !== "idle"}
          className="w-full"
        >
          {isApproving || purchaseStep === "approving" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              授权中...
            </>
          ) : isPurchasing || purchaseStep === "purchasing" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              购买中...
            </>
          ) : (
            "购买"
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">购买需要两步：1. 授权代币使用 2. 完成购买</p>
      </CardContent>
    </Card>
  )
}
