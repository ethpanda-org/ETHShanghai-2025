import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Wallet, Shield, Zap, Globe } from 'lucide-react'
import protocolBankLogo from '../assets/new-protocol-bank-logo.png'
import { BrowserProvider } from 'ethers'

export default function LoginPage({ onLogin }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')

  const connectMetaMask = async () => {
    setIsConnecting(true)
    setError('')

    try {
      // 检查是否安装了MetaMask
      if (typeof window.ethereum === 'undefined') {
        setError('Please install MetaMask to continue')
        setIsConnecting(false)
        return
      }

      // 请求连接MetaMask
      const provider = new BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      
      if (accounts.length > 0) {
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        const network = await provider.getNetwork()
        
        // 调用父组件的登录回调
        onLogin({
          address,
          network: network.name,
          chainId: network.chainId.toString()
        })
      }
    } catch (err) {
      console.error('MetaMask connection error:', err)
      if (err.code === 4001) {
        setError('Connection request rejected. Please try again.')
      } else {
        setError('Failed to connect to MetaMask. Please try again.')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="space-y-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-3">
            <img src={protocolBankLogo} alt="Protocol Bank" className="h-12 w-12" />
            <span className="text-3xl font-medium text-gray-900">Protocol Bank</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-medium text-gray-900 leading-tight">
            Welcome to the Future of Global Payments
          </h1>
          
          <p className="text-lg text-gray-600">
            Your SWIFT alternative for seamless cross-border transactions. Connect your wallet to get started.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-8">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                <Wallet className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900">Dual Currency</h3>
              <p className="text-sm text-gray-600">Fiat & Crypto support</p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900">Instant Transfer</h3>
              <p className="text-sm text-gray-600">Real-time settlements</p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900">Secure</h3>
              <p className="text-sm text-gray-600">Bank-grade security</p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                <Globe className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900">Global Network</h3>
              <p className="text-sm text-gray-600">Worldwide access</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Card */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md glass-card border-0 shadow-sm">
            <CardHeader className="space-y-1 text-center pb-6">
              <CardTitle className="text-2xl font-medium">Connect Your Wallet</CardTitle>
              <CardDescription className="text-base">
                Connect with MetaMask to access your Protocol Bank account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Button 
                onClick={connectMetaMask}
                disabled={isConnecting}
                className="w-full h-12 text-sm font-normal bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isConnecting ? (
                  <span className="flex items-center space-x-2">
                    <span className="animate-spin">⏳</span>
                    <span>Connecting...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5" />
                    <span>Connect Wallet</span>
                  </span>
                )}
              </Button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}

              <div className="pt-4 space-y-3">
                <p className="text-xs text-gray-500 text-center">
                  Don't have MetaMask?{' '}
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Install it here
                  </a>
                </p>
                
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    By connecting, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

