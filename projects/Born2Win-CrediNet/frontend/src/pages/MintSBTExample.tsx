import { useState } from 'react'
import { useAccount } from 'wagmi'
import { motion } from 'framer-motion'
import { useSBTMint } from '@/hooks/useSBTMint'
import { useCrediNet } from '@/hooks/useCrediNet'
import SBTMintAnimation from '@/components/animations/SBTMintAnimation'
import { StarBorder } from '@/components/StarBorder'

/**
 * SBT 铸造示例页面
 * 展示如何在铸造 SBT 时触发动画
 */
const MintSBTExample = () => {
  const { isConnected } = useAccount()
  const { creditScore } = useCrediNet()
  const { 
    mintSBT, 
    showAnimation, 
    setShowAnimation,
    isMinting,
    isConfirming,
    isSuccess,
    hasMinterRole,
  } = useSBTMint()

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'uploaded'>('idle')
  const [requestHash, setRequestHash] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  // 许可式铸造（无 MINTER_ROLE 场景）
  const [issuer, setIssuer] = useState<string>('')
  const [deadline, setDeadline] = useState<string>('')
  const [signature, setSignature] = useState<string>('')

  /**
   * 处理铸造流程
   * 1. 生成元数据
   * 2. 上传到 IPFS
   * 3. 调用合约铸造
   * 4. 显示动画
   */
  const handleMint = async () => {
    try {
      setErrorMsg('')
      setUploadStatus('uploading')
      // 使用动态 Agent 模式：tokenURI 传空字符串
      const tokenURI = ''
      setUploadStatus('uploaded')
      // 校验可选 requestHash（允许留空，留空时由 Hook 使用全零哈希）
      const trimmed = requestHash.trim()
      const valid = trimmed === '' || /^0x[0-9a-fA-F]{64}$/.test(trimmed)
      if (!valid) {
        setErrorMsg('requestHash 格式不正确，应为 0x 开头的 64 位十六进制')
        setUploadStatus('idle')
        return
      }
      // 许可式参数处理（全部填则走 mintWithPermit，否则尝试直接铸造）
      const hasPermit = issuer && deadline && signature
      const permitOpts = hasPermit
        ? {
            issuer: issuer as `0x${string}`,
            deadline: BigInt(deadline),
            signature: signature as `0x${string}`,
          }
        : undefined

      await mintSBT(1, tokenURI, trimmed === '' ? undefined : (trimmed as `0x${string}`), permitOpts)
      console.log('✅ SBT 铸造完成！元数据将由 DynamicSBTAgent 动态生成')
    } catch (error) {
      console.error('❌ 铸造失败:', error)
      setUploadStatus('idle')
      setErrorMsg('铸造失败，请检查钱包权限与网络后重试')
    }
  }

  // 获取稀有度
  const getRarity = (score: number): 'common' | 'rare' | 'epic' | 'legendary' => {
    if (score >= 900) return 'legendary'
    if (score >= 800) return 'epic'
    if (score >= 700) return 'rare'
    return 'common'
  }

  const rarity = creditScore ? getRarity(creditScore.total) : 'common'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          铸造您的信用 SBT
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 左侧：当前信用数据 */}
          <StarBorder starCount={8} speed={0.5} starColor="#a78bfa" glowColor="#8b5cf6">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6"
            >
            <h2 className="text-2xl font-bold text-white mb-4">当前信用数据</h2>
            {creditScore ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-purple-400 mb-2">
                    {creditScore.total}
                  </div>
                  <div className="text-gray-400">C-Score</div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">基石 K</span>
                    <span className="text-white font-semibold">{creditScore.dimensions.keystone}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">能力 A</span>
                    <span className="text-white font-semibold">{creditScore.dimensions.ability}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">财富 F</span>
                    <span className="text-white font-semibold">{creditScore.dimensions.finance}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">健康 H</span>
                    <span className="text-white font-semibold">{creditScore.dimensions.health}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">行为 B</span>
                    <span className="text-white font-semibold">{creditScore.dimensions.behavior}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">稀有度</span>
                    <span className="text-purple-400 font-bold uppercase">{rarity}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">请先连接钱包</div>
            )}
            </motion.div>
          </StarBorder>

          {/* 右侧：铸造操作 */}
          <StarBorder starCount={10} speed={0.6} starColor="#ec4899" glowColor="#db2777">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6"
            >
            <h2 className="text-2xl font-bold text-white mb-2">铸造 SBT</h2>
            <div className="text-xs text-gray-400 mb-4">
              铸造权限：{hasMinterRole ? <span className="text-emerald-400">MINTER_ROLE</span> : <span className="text-yellow-400">需要 issuer 签名</span>}
            </div>
            <div className="space-y-6">
              <div className="text-gray-300 text-sm">
                <p className="mb-2">🎯 Soulbound Token (SBT) 是不可转移的身份凭证</p>
                <p className="mb-2">✨ 根据您的五维信用评分动态生成</p>
                <p>🔒 永久绑定到您的钱包地址</p>
              </div>
              <div>
                <button
                  type="button"
                  className="px-3 py-2 text-xs rounded bg-slate-700 hover:bg-slate-600 text-white"
                  onClick={() => setRequestHash('0x8f17fa27955a33340ad3a5d41db4e4d0ec44c9abf2798a3961ab6fdd269bb092')}
                >
                  使用演示 requestHash
                </button>
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-gray-400">可选：requestHash</label>
                <input
                  value={requestHash}
                  onChange={(e) => setRequestHash(e.target.value)}
                  placeholder="0x 开头的 64 位十六进制（留空将使用全零哈希）"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {errorMsg && (
                  <div className="text-sm text-red-400">{errorMsg}</div>
                )}
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-700/50">
                <div className="text-sm text-gray-400">无 MINTER_ROLE? 也可使用 issuer 签名（mintWithPermit）</div>
                <input
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="issuer（签名者地址）0x..."
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="deadline（秒级时间戳，如 1739558400）"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="signature（EIP-712 签名 0x...）"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={handleMint}
                disabled={!isConnected || !creditScore || isMinting || isConfirming}
                className={`
                  w-full py-4 px-6 rounded-xl font-bold text-lg
                  transition-all duration-300 transform
                  ${!isConnected || !creditScore || isMinting || isConfirming
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-105 hover:shadow-2xl'
                  }
                  text-white
                `}
              >
                {isMinting ? '铸造中...' : isConfirming ? '确认中...' : (!isConnected ? '请先连接钱包' : '铸造 SBT')}
              </button>

              {uploadStatus === 'uploading' && (
                <div className="text-center text-yellow-400 text-sm">⏳ 正在上传元数据到 IPFS...</div>
              )}
              {uploadStatus === 'uploaded' && (
                <div className="text-center text-green-400 text-sm">✅ 元数据上传完成</div>
              )}
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
        sbtData={creditScore ? {
          name: `CrediNet Badge - ${rarity.toUpperCase()}`,
          image: `/planets/badge-${rarity}.svg`,
          rarity: rarity
        } : undefined}
      />
    </div>
  )
}

export default MintSBTExample
