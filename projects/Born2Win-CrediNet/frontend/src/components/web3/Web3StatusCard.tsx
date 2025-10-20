/**
 * Web3 状态卡片组件
 * 展示钱包连接状态和基本信息
 */

import { useAccount, useBalance, useChainId } from 'wagmi'
import { shortenAddress } from '../../utils'

const Web3StatusCard = () => {
  const { address, isConnected, isConnecting } = useAccount()
  const chainId = useChainId()
  const { data: balance } = useBalance({ address })

  const getChainName = (id: number) => {
    const chains: Record<number, string> = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet',
      137: 'Polygon',
      80001: 'Polygon Mumbai',
      42161: 'Arbitrum',
      10: 'Optimism',
    }
    return chains[id] || `Chain ${id}`
  }

  if (isConnecting) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">连接钱包中...</span>
        </div>
      </div>
    )
  }

  if (!isConnected || !address) {
    return (
      <div className="glass-card p-6">
        <div className="text-center text-gray-400">
          <p className="text-sm">请先连接钱包以使用 Web3 功能</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">钱包信息</h3>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="space-y-3">
        {/* 地址 */}
        <div>
          <p className="text-xs text-gray-500 mb-1">地址</p>
          <p className="text-sm text-gray-300 font-mono">{shortenAddress(address, 10, 8)}</p>
        </div>

        {/* 网络 */}
        <div>
          <p className="text-xs text-gray-500 mb-1">网络</p>
          <p className="text-sm text-gray-300">{getChainName(chainId)}</p>
        </div>

        {/* 余额 */}
        {balance && (
          <div>
            <p className="text-xs text-gray-500 mb-1">余额</p>
            <p className="text-sm text-gray-300">
              {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Web3StatusCard

