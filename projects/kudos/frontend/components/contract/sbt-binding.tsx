"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useHasSBT, useGetUserSBTInfo, useMintSBT } from "@/lib/contracts/hooks"
import { CheckCircle2, Loader2, Shield } from "lucide-react"
import { toast } from "sonner"

export function SBTBinding() {
  const { address, isConnected } = useAccount()
  const [username, setUsername] = useState("")

  const { data: hasSBT, isLoading: checkingSBT } = useHasSBT(address)
  const { data: sbtInfo } = useGetUserSBTInfo()
  const { mintSBT, isPending, isConfirming, isSuccess } = useMintSBT()

  const handleMintSBT = async () => {
    if (!address || !username.trim()) {
      toast.error("请输入用户名")
      return
    }

    try {
      // 这里可以上传用户信息到 IPFS 获取 metadataURI
      const metadataURI = `ipfs://example/${username}`

      await mintSBT(address, username, metadataURI)
      toast.success("SBT 绑定成功！")
    } catch (error) {
      console.error("[v0] SBT mint error:", error)
      toast.error("绑定失败，请重试")
    }
  }

  if (!isConnected) {
    return (
      <Card className="border-border/40 shadow-apple bg-card/50 backdrop-blur-xl">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">请先连接钱包</p>
        </CardContent>
      </Card>
    )
  }

  if (checkingSBT) {
    return (
      <Card className="border-border/40 shadow-apple bg-card/50 backdrop-blur-xl">
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (hasSBT && sbtInfo) {
    return (
      <Card className="border-border/40 shadow-apple bg-card/50 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>账号已绑定</CardTitle>
          </div>
          <CardDescription>您的 SBT 身份凭证</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">已验证身份</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">用户名</span>
              <span className="font-medium">{sbtInfo[1]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token ID</span>
              <span className="font-mono text-xs">{sbtInfo[0].toString()}</span>
            </div>
          </div>
          <Badge variant="secondary" className="w-full justify-center">
            Soulbound Token
          </Badge>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/40 shadow-apple bg-card/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>绑定 SBT 身份</CardTitle>
        </div>
        <CardDescription>铸造专属的灵魂绑定代币，永久绑定您的账号身份</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">用户名</label>
          <Input
            placeholder="输入您的用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isPending || isConfirming}
          />
        </div>
        <Button onClick={handleMintSBT} disabled={isPending || isConfirming || !username.trim()} className="w-full">
          {isPending || isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isPending ? "确认中..." : "处理中..."}
            </>
          ) : (
            "绑定 SBT"
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          SBT 是不可转移的身份凭证，一旦绑定将永久关联您的钱包地址
        </p>
      </CardContent>
    </Card>
  )
}
