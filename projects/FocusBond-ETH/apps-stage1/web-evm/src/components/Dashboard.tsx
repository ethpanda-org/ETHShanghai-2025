'use client'

import { useAccount, useChainId } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { FocusBondApp } from './FocusBondApp'
import { getContracts } from '@/lib/wagmi'

export function Dashboard() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const contracts = chainId ? getContracts(chainId) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">FocusBond EVM</h1>
          <p className="text-lg text-gray-600">Stake ETH to stay focused. Break early and pay a fee.</p>
          <div className="mt-6">
            <ConnectButton />
          </div>
        </div>

        {isConnected ? (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>🎉 钱包已连接!</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    <strong>连接的钱包地址:</strong> {address}
                  </p>
                  {contracts && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">合约地址 (链ID: {chainId}):</h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li><strong>FocusBond:</strong> {contracts.focusBond}</li>
                        <li><strong>MockUSDC:</strong> {contracts.usdc}</li>
                        <li><strong>FocusCredit:</strong> {contracts.focus}</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* FocusBond 功能界面 */}
            <FocusBondApp />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>欢迎使用 FocusBond EVM</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">
                  请连接您的钱包开始使用 FocusBond 专注协议
                </p>
                <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">网络配置:</h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li><strong>网络名称:</strong> Anvil Local</li>
                    <li><strong>RPC URL:</strong> http://127.0.0.1:8545</li>
                    <li><strong>Chain ID:</strong> 31337</li>
                    <li><strong>货币符号:</strong> ETH</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">测试私钥 (仅用于本地测试):</h3>
                  <div className="text-xs text-blue-800 font-mono break-all">
                    0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    对应地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}