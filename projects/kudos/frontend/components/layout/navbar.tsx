"use client"

import Link from "next/link"
import { Search, Copy, LogOut, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAccount, useDisconnect } from "wagmi"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"

export function Navbar() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast.success("地址已复制")
    }
  }

  const handleDisconnect = () => {
    disconnect()
    toast.success("已断开连接")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-effect shadow-apple">
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-apple transition-apple group-hover:shadow-apple-lg group-hover:scale-105 active-press">
              <span className="text-white font-bold text-base">炒</span>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">炒词</span>
          </Link>

          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                type="search"
                placeholder="搜索炒词、达人、话题..."
                className="w-full pl-11 pr-4 h-11 bg-muted/40 border-border/40 rounded-xl focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {isConnected && address ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 px-4 rounded-xl border-border/40 hover:bg-accent/60 transition-apple gap-3 bg-transparent"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {address.slice(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-mono text-sm">{formatAddress(address)}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                  <p className="text-xs text-muted-foreground mb-1">钱包地址</p>
                  <p className="text-sm font-mono">{formatAddress(address)}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
                  <Copy className="mr-2 h-4 w-4" />
                  复制地址
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/AI_Creator_Pro">我的主页</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/AI_Creator_Pro?tab=wallet">我的资产</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDisconnect} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  断开连接
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 h-11 font-medium shadow-apple hover:shadow-apple-lg transition-apple active-press"
              asChild
            >
              <Link href="/login">登录解锁更多名片</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
