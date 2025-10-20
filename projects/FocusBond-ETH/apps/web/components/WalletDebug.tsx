"use client"

import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { CONTRACTS } from '../lib/chain'
import { useTokenBalance } from '../lib/hooks/useTokenBalance'

export function WalletDebug() {
  const { address, isConnected, chainId } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: ethBalance } = useBalance({ address: address as `0x${string}` })
  const { focusBalance, focusDecimals } = useTokenBalance(address as `0x${string}`)

  const handleConnect = async () => {
    try {
      await connect({ connector: metaMask() })
    } catch (error) {
      console.error('连接失败:', error)
    }
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg text-white">
      <h3 className="text-lg font-bold mb-4">🔍 钱包调试信息</h3>
      
      <div className="space-y-2">
        <div>
          <strong>连接状态:</strong> {isConnected ? '✅ 已连接' : '❌ 未连接'}
        </div>
        
        <div>
          <strong>地址:</strong> {address || '无'}
        </div>
        
        <div>
          <strong>链ID:</strong> {chainId || '无'}
        </div>
        
        <div>
          <strong>ETH余额:</strong> {ethBalance ? `${ethBalance.formatted} ETH` : '无'}
        </div>
        
        <div>
          <strong>FOCUS余额:</strong> {
            focusBalance && focusDecimals 
              ? `${(Number(focusBalance) / Math.pow(10, focusDecimals)).toFixed(2)} FOCUS`
              : '无'
          }
        </div>
        
        <div>
          <strong>合约地址:</strong>
          <div className="ml-4 text-sm">
            <div>FocusBond: {CONTRACTS.focusBond}</div>
            <div>FocusToken: {CONTRACTS.focusToken}</div>
            <div>USDC: {CONTRACTS.usdc}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 space-x-2">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            连接钱包
          </button>
        ) : (
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
          >
            断开连接
          </button>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-300">
        <p>测试账户私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</p>
        <p>测试账户地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</p>
      </div>
    </div>
  )
}
