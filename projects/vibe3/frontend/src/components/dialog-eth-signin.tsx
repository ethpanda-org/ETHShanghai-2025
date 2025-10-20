'use client'

import { useState } from 'react'
import { useConnect, useAccount, useSignMessage, useDisconnect } from 'wagmi'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Wallet, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface EthSigninDialogProps {
  children: React.ReactNode
  onLoginSuccess?: (userData: any) => void
}

export function EthSigninDialog({ children, onLoginSuccess }: EthSigninDialogProps) {
  const [open, setOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { connect, connectors, isPending: isConnectPending } = useConnect()
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()

  const handleConnect = async (connector: any) => {
    setIsConnecting(true)
    setError(null)
    
    try {
      await connect({ connector })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSignIn = async () => {
    if (!address || !signMessageAsync) {
      setError('Please connect wallet first')
      return
    }

    setIsSigning(true)
    setError(null)

    try {
      // 1. 获取nonce
      const { getNonce, generateSignatureMessage, signInWithEth } = await import('@/services/vibe3_api/auth')
      const nonceResponse = await getNonce()
      
      if (!nonceResponse.success) {
        throw new Error('Failed to get nonce')
      }

      const nonce = nonceResponse.data.nonce

      // 2. 生成签名消息
      const signatureMessage = generateSignatureMessage(nonce, address)

      // 3. 请求用户签名
      const signature = await signMessageAsync({ message: signatureMessage })

      // 4. 使用签名登录
      const response = await signInWithEth(address, signature, nonce, signatureMessage)
      
      if (response.success) {
        setSuccess(true)
        onLoginSuccess?.(response.data)
        
        // 延迟关闭对话框并跳转到首页，让用户看到成功状态
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          // 跳转到首页
          window.location.href = '/'
        }, 1500)
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed, please try again'
      setError(errorMessage)
    } finally {
      setIsSigning(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setError(null)
    setSuccess(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // 关闭对话框时重置状态
      setError(null)
      setSuccess(false)
      setIsConnecting(false)
      setIsSigning(false)
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Ethereum Wallet
          </DialogTitle>
          <DialogDescription>
            Choose your wallet to connect and login to Vibe3
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isConnected ? (
            // 钱包连接界面
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Choose your wallet:</p>
              {connectors.map((connector) => (
                <Button
                  key={connector.uid}
                  variant="outline"
                  className="w-full justify-start h-12"
                  onClick={() => handleConnect(connector)}
                  disabled={isConnecting || isConnectPending}
                >
                  {isConnecting && isConnectPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wallet className="h-4 w-4 mr-2" />
                  )}
                  {connector.name}
                </Button>
              ))}
            </div>
          ) : (
            // 已连接状态
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Connected wallet:</p>
                <p className="font-mono text-sm break-all">{address}</p>
              </div>

              {success ? (
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 dark:text-green-200">Login successful!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    onClick={handleSignIn}
                    disabled={isSigning}
                    className="w-full"
                  >
                    {isSigning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Logging in...
                      </>
                    ) : (
                      'Login with Ethereum'
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleDisconnect}
                    variant="outline"
                    className="w-full"
                    disabled={isSigning}
                  >
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
