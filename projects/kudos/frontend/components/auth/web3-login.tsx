"use client"

import { useState } from "react"
import { useConnect, useAccount, useDisconnect, useChainId, useSwitchChain } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Wallet, Check, ChevronDown, LogOut, Copy, ExternalLink } from "lucide-react"
import { supportedChains } from "@/lib/web3-config"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function Web3Login() {
  const { connectors, connect, isPending } = useConnect()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async (connectorId: string) => {
    setIsConnecting(true)
    try {
      const connector = connectors.find((c) => c.id === connectorId)
      if (connector) {
        await connect({ connector })
        toast.success("钱包连接成功！")
      }
    } catch (error) {
      toast.error("连接失败，请重试")
      console.error(error)
    } finally {
      setIsConnecting(false)
    }
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast.success("地址已复制")
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const currentChain = supportedChains.find((c) => c.id === chainId)

  if (isConnected && address) {
    return (
      <Card className="w-full max-w-md p-8 space-y-6 shadow-apple bg-card/80 backdrop-blur-xl border-border/40">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">钱包已连接</h2>
          <p className="text-sm text-muted-foreground">欢迎来到炒词社区</p>
        </div>

        <div className="space-y-4">
          {/* 地址显示 */}
          <div className="p-4 rounded-xl bg-muted/30 space-y-2">
            <p className="text-xs text-muted-foreground">钱包地址</p>
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono">{formatAddress(address)}</code>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={copyAddress} className="h-8 w-8 p-0">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                  <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* 网络切换 */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">当前网络</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{currentChain?.icon}</span>
                    {currentChain?.name || "未知网络"}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                {supportedChains.map((chain) => (
                  <DropdownMenuItem
                    key={chain.id}
                    onClick={() => switchChain({ chainId: chain.id })}
                    className="cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{chain.icon}</span>
                      {chain.name}
                      {chainId === chain.id && <Check className="w-4 h-4 ml-auto text-primary" />}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 断开连接 */}
          <Button variant="outline" className="w-full bg-transparent" onClick={() => disconnect()}>
            <LogOut className="w-4 h-4 mr-2" />
            断开连接
          </Button>

          {/* 进入应用 */}
          <Button className="w-full" size="lg" asChild>
            <a href="/">进入应用</a>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md p-8 space-y-6 shadow-apple bg-card/80 backdrop-blur-xl border-border/40">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Wallet className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">连接钱包</h2>
        <p className="text-sm text-muted-foreground">选择你的钱包以连接到炒词平台</p>
      </div>

      <div className="space-y-3">
        {connectors.map((connector) => (
          <Button
            key={connector.id}
            variant="outline"
            className="w-full h-14 text-base justify-start gap-3 hover-lift transition-apple bg-transparent"
            onClick={() => handleConnect(connector.id)}
            disabled={isPending || isConnecting}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="flex-1 text-left">{connector.name === "Injected" ? "MetaMask" : connector.name}</span>
          </Button>
        ))}
      </div>

      <div className="pt-4 border-t border-border/40">
        <p className="text-xs text-center text-muted-foreground">
          支持 Ethereum、Polygon、BSC、Arbitrum、Optimism、Base 等 EVM 链
        </p>
      </div>
    </Card>
  )
}
