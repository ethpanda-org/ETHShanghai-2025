'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { metaMask, walletConnect, injected } from 'wagmi/connectors'

export default function WalletButtonSafe() {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, isPending, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      setError(connectError.message)
      console.error('Connection error:', connectError)
    }
  }, [connectError])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  if (!mounted) return null

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-3">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Connection Error:</strong> {error}
          </div>
        )}
        
        <h3 className="text-lg font-semibold text-gray-800">Connect Wallet</h3>
        
        <button
          onClick={() => connect({ connector: metaMask() })}
          disabled={isPending}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>🔷</span>
          Connect MetaMask
          {isPending && <span className="animate-spin">⟳</span>}
        </button>
        
        <button
          onClick={() => connect({ connector: injected({ target: 'phantom' }) })}
          disabled={isPending}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>👻</span>
          Connect Phantom
          {isPending && <span className="animate-spin">⟳</span>}
        </button>
        
        <button
          onClick={() => connect({ connector: walletConnect({
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'
          }) })}
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>📱</span>
          Connect WalletConnect
          {isPending && <span className="animate-spin">⟳</span>}
        </button>

        <div className="text-sm text-gray-600 mt-2">
          <p>💡 <strong>Tips:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>Ensure you have a wallet extension installed</li>
            <li>Make sure Hardhat local node is running on port 8545</li>
            <li>Try refreshing the page if connection fails</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded">
        <strong>Connected:</strong> {connector?.name}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        <button
          onClick={() => disconnect()}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  )
}
