"use client"

import { useState } from "react"
import { useAccount, useChainId } from "wagmi"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  useGetCreatorEarnings,
  useCreateContent,
  usePurchaseContent,
  useWithdrawEarnings,
  useBusinessCardBalance,
} from "@/lib/contracts/hooks"
import { formatEthAmount, shortenAddress, getExplorerUrl } from "@/lib/contracts/utils"
import { Loader2, ExternalLink, Wallet, TrendingUp, ShoppingCart, Download } from "lucide-react"

export function ContractInteractionDemo() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { toast } = useToast()

  const [contentId, setContentId] = useState("")
  const [price, setPrice] = useState("")
  const [metadataURI, setMetadataURI] = useState("")

  // 读取数据
  const { data: earnings } = useGetCreatorEarnings()
  const { data: nftBalance } = useBusinessCardBalance()

  // 写入操作
  const {
    createContent,
    isPending: isCreating,
    isConfirming: isCreatingConfirming,
    isSuccess: isCreated,
    hash: createHash,
  } = useCreateContent()
  const {
    purchaseContent,
    isPending: isPurchasing,
    isConfirming: isPurchasingConfirming,
    isSuccess: isPurchased,
    hash: purchaseHash,
  } = usePurchaseContent()
  const {
    withdrawEarnings,
    isPending: isWithdrawing,
    isConfirming: isWithdrawingConfirming,
    isSuccess: isWithdrawn,
    hash: withdrawHash,
  } = useWithdrawEarnings()

  const handleCreateContent = async () => {
    if (!contentId || !price || !metadataURI) {
      toast({
        title: "错误",
        description: "请填写所有字段",
        variant: "destructive",
      })
      return
    }

    try {
      await createContent(BigInt(contentId), price, metadataURI)
      toast({
        title: "交易已提交",
        description: "正在等待确认...",
      })
    } catch (error: any) {
      toast({
        title: "交易失败",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handlePurchaseContent = async () => {
    if (!contentId || !price) {
      toast({
        title: "错误",
        description: "请填写内容ID和价格",
        variant: "destructive",
      })
      return
    }

    try {
      await purchaseContent(BigInt(contentId), price)
      toast({
        title: "交易已提交",
        description: "正在等待确认...",
      })
    } catch (error: any) {
      toast({
        title: "交易失败",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleWithdraw = async () => {
    try {
      await withdrawEarnings()
      toast({
        title: "交易已提交",
        description: "正在提取收益...",
      })
    } catch (error: any) {
      toast({
        title: "交易失败",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">连接钱包</h3>
        <p className="text-sm text-muted-foreground">请先连接钱包以使用合约功能</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 账户信息 */}
      <Card className="p-6 glass-effect">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          账户信息
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">钱包地址:</span>
            <span className="font-mono">{shortenAddress(address || "")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">创作者收益:</span>
            <span className="font-semibold text-primary">
              {earnings ? formatEthAmount(earnings as bigint) : "0"} ETH
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">名片 NFT 数量:</span>
            <span className="font-semibold">{nftBalance?.toString() || "0"}</span>
          </div>
        </div>

        {earnings && earnings > 0n && (
          <Button onClick={handleWithdraw} disabled={isWithdrawing || isWithdrawingConfirming} className="w-full mt-4">
            {isWithdrawing || isWithdrawingConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提取中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                提取收益
              </>
            )}
          </Button>
        )}
      </Card>

      {/* 创建内容 */}
      <Card className="p-6 glass-effect">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          创建内容
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="contentId">内容 ID</Label>
            <Input
              id="contentId"
              type="number"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              placeholder="输入内容ID"
            />
          </div>
          <div>
            <Label htmlFor="price">价格 (ETH)</Label>
            <Input id="price" type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.01" />
          </div>
          <div>
            <Label htmlFor="metadataURI">元数据 URI</Label>
            <Input
              id="metadataURI"
              type="text"
              value={metadataURI}
              onChange={(e) => setMetadataURI(e.target.value)}
              placeholder="ipfs://..."
            />
          </div>
          <Button onClick={handleCreateContent} disabled={isCreating || isCreatingConfirming} className="w-full">
            {isCreating || isCreatingConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              "创建内容"
            )}
          </Button>
          {createHash && (
            <a
              href={getExplorerUrl(chainId, "tx", createHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              查看交易 <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </Card>

      {/* 购买内容 */}
      <Card className="p-6 glass-effect">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          购买内容
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="purchaseContentId">内容 ID</Label>
            <Input
              id="purchaseContentId"
              type="number"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              placeholder="输入要购买的内容ID"
            />
          </div>
          <div>
            <Label htmlFor="purchasePrice">价格 (ETH)</Label>
            <Input
              id="purchasePrice"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.01"
            />
          </div>
          <Button onClick={handlePurchaseContent} disabled={isPurchasing || isPurchasingConfirming} className="w-full">
            {isPurchasing || isPurchasingConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                购买中...
              </>
            ) : (
              "购买内容"
            )}
          </Button>
          {purchaseHash && (
            <a
              href={getExplorerUrl(chainId, "tx", purchaseHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              查看交易 <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </Card>
    </div>
  )
}
