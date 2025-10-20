'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect, useState } from 'react'

export function SimpleWalletConnect() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connectors, connect, error } = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (isConnected && address) {
    return (
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-green-800 mb-1">🎉 钱包已连接!</h3>
            <p className="text-sm text-green-700 font-mono break-all">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
            <p className="text-xs text-green-600 mt-1">完整地址: {address}</p>
          </div>
          <button
            onClick={() => disconnect()}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            断开连接
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-3">连接钱包</h3>
      
      {isConnecting && (
        <div className="mb-3 p-2 bg-blue-50 text-blue-700 rounded">
          正在连接钱包...
        </div>
      )}
      
      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">
          连接失败: {error.message}
        </div>
      )}
      
      <div className="space-y-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isConnecting}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isConnecting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                连接中...
              </div>
            ) : (
              `连接 ${connector.name}`
            )}
          </button>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <p className="text-yellow-800 font-semibold mb-1">📝 使用说明:</p>
        <ol className="text-yellow-700 space-y-1 text-xs">
          <li>1. 确保已安装MetaMask浏览器扩展</li>
          <li>2. 添加Anvil本地网络 (Chain ID: 31337)</li>
          <li>3. 导入测试私钥或使用现有账户</li>
          <li>4. 点击上方"连接 Injected"按钮</li>
        </ol>
      </div>
    </div>
  )
}
