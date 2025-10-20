import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { motion } from 'framer-motion'
import { getContractAddresses } from '@/contracts/addresses'
import { SBTRegistryABI } from '@/contracts/abis'
import SBTMintAnimation from '@/components/animations/SBTMintAnimation'
import { StarBorder } from '@/components/StarBorder'

/**
 * 简化版 SBT 铸造页面
 * 直接调用合约，无需后端 API
 */
const MintSBTSimple = () => {
  const { address, isConnected, chainId } = useAccount()
  const [showAnimation, setShowAnimation] = useState(false)

  // 获取合约地址
  const contractAddress = chainId
    ? getContractAddresses(chainId).SBTRegistry
    : undefined

  // 写入合约
  const { writeContractAsync, isPending: isMinting } = useWriteContract()

  // 等待交易确认
  const { data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: hash,
  })

  /**
   * 处理铸造 - 直接调用合约 mintBadge 函数
   */
  const handleMint = async () => {
    if (!address || !contractAddress) {
      alert('请先连接钱包')
      return
    }

    try {
      console.log('🚀 开始铸造 SBT...')
      console.log('合约地址:', contractAddress)
      console.log('接收地址:', address)

      // 直接调用 mintBadgeWithValidation 函数
      const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
      const tx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: SBTRegistryABI,
        functionName: 'mintBadgeWithValidation',
        args: [address, 1, '', zeroHash], // to, badgeType, tokenURI, requestHash
        gas: 5000000n, // Set reasonable gas limit for Hardhat
      })

      console.log('✅ 交易已提交:', tx)

      // 显示动画
      setShowAnimation(true)

      // 3秒后自动关闭动画
      setTimeout(() => {
        setShowAnimation(false)
      }, 3000)
    } catch (error: any) {
      console.error('❌ 铸造失败:', error)
      alert(`铸造失败: ${error.message || '未知错误'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          铸造您的信用 SBT
        </h1>

        <div className="grid md:grid-cols-1 gap-8">
          {/* 铸造操作 */}
          <StarBorder starCount={10} speed={0.6} starColor="#ec4899" glowColor="#db2777">
            <motion.div
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-4">铸造 SBT</h2>

              <div className="space-y-6">
                <div className="text-gray-300 text-sm">
                  <p className="mb-2">🎯 Soulbound Token (SBT) 是不可转移的身份凭证</p>
                  <p className="mb-2">✨ 根据您的五维信用评分动态生成</p>
                  <p>🔒 永久绑定到您的钱包地址</p>
                </div>

                {isConnected && address && (
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="text-sm text-green-300">
                      <strong>✅ 钱包已连接</strong>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 font-mono">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleMint}
                  disabled={!isConnected || isMinting || isConfirming}
                  className={`
                    w-full py-4 px-6 rounded-xl font-bold text-lg
                    transition-all duration-300 transform
                    ${!isConnected || isMinting || isConfirming
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-105 hover:shadow-2xl'
                    }
                    text-white
                  `}
                >
                  {isMinting ? '铸造中...' : isConfirming ? '确认中...' : (!isConnected ? '请先连接钱包' : '铸造 SBT')}
                </button>

                {isSuccess && (
                  <div className="text-center text-green-400 text-sm">🎉 SBT 铸造成功！</div>
                )}

                <div className="mt-8 p-4 bg-slate-800/50 rounded-lg text-sm text-gray-400">
                  <h3 className="font-bold text-white mb-2">🤖 DynamicSBTAgent 技术</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>✅ 铸造时自动注册到 Agent</li>
                    <li>✅ 初始化默认评分（500分）</li>
                    <li>✅ 链上动态生成 Base64 元数据</li>
                    <li>✅ 评分更新后自动刷新形象</li>
                    <li>✅ 根据总分自动升级稀有度</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </StarBorder>
        </div>
      </div>

      {/* SBT 铸造动画 */}
      <SBTMintAnimation
        isVisible={showAnimation}
        onComplete={() => setShowAnimation(false)}
        sbtData={{
          name: 'CrediNet Badge',
          image: '/planets/badge-common.svg',
          rarity: 'common'
        }}
      />
    </div>
  )
}

export default MintSBTSimple
