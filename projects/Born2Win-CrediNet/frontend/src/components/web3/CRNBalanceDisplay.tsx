/**
 * CRN Token 余额展示组件
 * 从智能合约读取并展示 CRN 余额和奖励
 */

import { useCRNToken } from '../../hooks'
import { useAccount } from 'wagmi'
import { Coins, TrendingUp } from 'lucide-react'
import { formatTokenAmount } from '../../utils'

const CRNBalanceDisplay = () => {
  const { isConnected } = useAccount()
  const {
    balance,
    pendingRewards,
    claimRewards,
    isClaiming,
    refetchBalance,
    refetchPendingRewards,
  } = useCRNToken()

  const handleClaim = async () => {
    await claimRewards()
    // 领取成功后刷新余额
    setTimeout(() => {
      refetchBalance()
      refetchPendingRewards()
    }, 2000)
  }

  if (!isConnected) {
    return (
      <div className="glass-card p-6">
        <p className="text-gray-400 text-center">请先连接钱包查看 CRN 余额</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Coins className="text-cyan-400" size={24} />
        <h3 className="text-lg font-semibold text-white">CRN Token 余额</h3>
      </div>

      {/* 余额显示 */}
      <div className="space-y-4">
        {/* 当前余额 */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
          <p className="text-xs text-gray-400 mb-1">当前余额</p>
          <p className="text-3xl font-bold text-gradient">{formatTokenAmount(balance, 2)} CRN</p>
        </div>

        {/* 待领取奖励 */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-amber-400" size={16} />
              <p className="text-xs text-gray-400">待领取奖励</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400 mb-3">
            {formatTokenAmount(pendingRewards, 2)} CRN
          </p>

          {/* 领取按钮 */}
          <button
            onClick={handleClaim}
            disabled={isClaiming || pendingRewards === 0}
            className={`w-full py-2 px-4 rounded-lg font-semibold transition-all duration-300 ${
              pendingRewards > 0 && !isClaiming
                ? 'bg-gradient-primary hover:scale-105 text-white'
                : 'bg-dark-border text-gray-500 cursor-not-allowed'
            }`}
          >
            {isClaiming ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                领取中...
              </span>
            ) : pendingRewards > 0 ? (
              '领取奖励'
            ) : (
              '暂无可领取奖励'
            )}
          </button>
        </div>
      </div>

      {/* 说明 */}
      <div className="text-xs text-gray-500 text-center">
        💡 通过贡献数据和授权使用赚取 CRN 奖励
      </div>
    </div>
  )
}

export default CRNBalanceDisplay

