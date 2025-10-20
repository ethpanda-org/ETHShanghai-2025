"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, TrendingUp, TrendingDown, HelpCircle, Loader2 } from "lucide-react"
import { Empty } from "@/components/ui/empty"
import { useAccount } from "wagmi"
import { useTokenBalance } from "@/lib/contracts/hooks"
import { formatUnits } from "viem"
import { useState, useEffect } from "react"

interface WalletTabProps {
  userId: string
}

interface Transaction {
  id: string
  type: "income" | "expense"
  amount: string
  description: string
  date: string
  hash?: string
}

export function WalletTab({ userId }: WalletTabProps) {
  const { address, isConnected } = useAccount()
  const { data: balance, isLoading: isLoadingBalance } = useTokenBalance()
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    if (address) {
      const storedTxs = localStorage.getItem(`transactions_${address}`)
      if (storedTxs) {
        setTransactions(JSON.parse(storedTxs))
      }
    }
  }, [address])

  const formattedBalance = balance ? formatUnits(balance, 6) : "0.00"

  const handleWithdraw = () => {
    alert("提现功能即将上线")
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">请先连接钱包</p>
        <p className="text-sm text-muted-foreground">连接钱包后即可查看余额和交易记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/40 shadow-apple overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            USDT 余额
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoadingBalance ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">加载中...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-5xl font-bold text-foreground tracking-tight">
                {formattedBalance} <span className="text-2xl text-muted-foreground">USDT</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleWithdraw}
                  className="flex-1 h-12 text-base font-semibold shadow-apple hover:shadow-apple-lg transition-apple"
                >
                  提现
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 border-border/40 hover:border-primary/40 transition-apple bg-transparent"
                  onClick={() => window.open("https://example.com/withdraw-guide", "_blank")}
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </div>

              <div className="pt-4 border-t border-border/40">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                  钱包地址: {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-apple">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">Web3 支付</p>
                <p className="text-sm text-muted-foreground">更多支付方式即将上线</p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">敬请期待</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-apple">
        <CardHeader>
          <CardTitle className="text-lg">交易记录</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <Empty title="暂无交易记录" description="您的购买和收入记录将显示在这里" />
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/40 hover:border-primary/20 hover:shadow-apple transition-apple group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === "income" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {tx.type === "income" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{tx.date}</p>
                      {tx.hash && (
                        <p className="text-xs text-muted-foreground mt-1">交易哈希: {tx.hash.slice(0, 10)}...</p>
                      )}
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "income" ? "+" : "-"}
                    {tx.amount} USDT
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
