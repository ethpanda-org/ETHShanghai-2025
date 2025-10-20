"use client"

import { useState, useEffect } from "react"
import { Lock, Unlock, ShoppingCart, Coins, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAccount, useChainId } from "wagmi"
import { useTokenBalance, useApproveToken, usePurchaseProduct, useHasPurchasedProduct } from "@/lib/contracts/hooks"
import { getContractAddress } from "@/lib/contracts/addresses"
import { formatUnits, parseUnits } from "viem"
import { toast } from "sonner"
import type { Product } from "@/lib/mock-data"

interface ProductCardInPostProps {
  product: Product
}

export function ProductCardInPost({ product }: ProductCardInPostProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [purchaseStep, setPurchaseStep] = useState<"idle" | "approving" | "purchasing">("idle")
  const [showContent, setShowContent] = useState(false)

  const productId = BigInt(product.id.replace("p", ""))
  const marketplaceAddress = getContractAddress("MARKETPLACE", chainId)

  const { data: tokenBalance } = useTokenBalance()
  const { data: hasPurchased } = useHasPurchasedProduct(productId)
  const { approve, isPending: isApproving, isSuccess: approveSuccess } = useApproveToken()
  const { purchaseProduct, isPending: isPurchasing, isSuccess: purchaseSuccess } = usePurchaseProduct()

  useEffect(() => {
    if (approveSuccess && purchaseStep === "approving") {
      console.log("[v0] Approval successful, proceeding to purchase")
      setPurchaseStep("purchasing")
      handlePurchase()
    }
  }, [approveSuccess, purchaseStep])

  useEffect(() => {
    if (purchaseSuccess) {
      console.log("[v0] Purchase successful")
      toast.success("购买成功！内容已解锁")
      setPurchaseStep("idle")
      setShowContent(true)
    }
  }, [purchaseSuccess])

  const handleApproveAndPurchase = async () => {
    if (!address || !marketplaceAddress) {
      toast.error("请先连接钱包")
      return
    }

    if (product.isFree) {
      setShowContent(true)
      toast.success("已获取免费内容")
      return
    }

    try {
      console.log("[v0] Starting approval process")
      setPurchaseStep("approving")
      const amount = parseUnits(product.price.toString(), 18)
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
      console.log("[v0] Executing purchase for product:", productId)
      await purchaseProduct(productId, 1n)
    } catch (error) {
      console.error("[v0] Purchase error:", error)
      toast.error("购买失败，请重试")
      setPurchaseStep("idle")
    }
  }

  const isAcquired = hasPurchased || showContent
  const balance = tokenBalance ? formatUnits(tokenBalance as bigint, 18) : "0"
  const hasEnoughBalance = product.isFree || (tokenBalance && tokenBalance >= parseUnits(product.price.toString(), 18))

  return (
    <Card className={`transition-apple ${isAcquired ? "border-green-500/50 bg-green-50/5" : "border-border/40"}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold text-sm">{product.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
          </div>
          {isAcquired ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Unlock className="mr-1 h-3 w-3" />
              已获取
            </Badge>
          ) : (
            <Badge variant="outline">
              <Lock className="mr-1 h-3 w-3" />
              未获取
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {product.isFree ? (
              <div className="text-lg font-bold text-green-600">免费</div>
            ) : (
              <div className="space-y-0.5">
                <div className="text-lg font-bold flex items-center gap-1">
                  <Coins className="h-4 w-4 text-yellow-600" />
                  {product.price} USDT
                </div>
                {isConnected && (
                  <div className="text-xs text-muted-foreground">
                    余额: {Number.parseFloat(balance).toFixed(2)} USDT
                  </div>
                )}
              </div>
            )}
            {product.stockLimit && <p className="text-xs text-muted-foreground">剩余 {product.stockRemaining} 份</p>}
          </div>

          {isAcquired ? (
            <Button size="sm" variant="outline" onClick={() => setShowContent(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              查看内容
            </Button>
          ) : !isConnected ? (
            <Button size="sm" variant="outline" disabled>
              连接钱包购买
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleApproveAndPurchase}
              disabled={!hasEnoughBalance || isApproving || isPurchasing || purchaseStep !== "idle"}
            >
              {isApproving || purchaseStep === "approving" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  授权中
                </>
              ) : isPurchasing || purchaseStep === "purchasing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  购买中
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {product.isFree ? "获取" : "购买"}
                </>
              )}
            </Button>
          )}
        </div>

        {!product.isFree && isConnected && !hasEnoughBalance && !isAcquired && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded">
            余额不足，需要 {product.price} USDT
          </div>
        )}

        {isAcquired && showContent && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/40">
            <div className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
              <Unlock className="h-3 w-3" />
              已解锁内容
            </div>
            <div className="text-sm space-y-2">
              {product.contentType === "text" && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground">
                    这是 {product.title} 的完整内容。包含专业的 AI 绘画工作流程模板、提示词技巧和最佳实践。
                  </p>
                  <ul className="text-xs space-y-1 mt-2">
                    <li>✓ 50+ 专业提示词模板</li>
                    <li>✓ 完整工作流程指南</li>
                    <li>✓ 实战案例分析</li>
                    <li>✓ 终身更新支持</li>
                  </ul>
                </div>
              )}
              {product.contentType === "file" && (
                <Button size="sm" variant="outline" className="w-full bg-transparent">
                  下载文件
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
