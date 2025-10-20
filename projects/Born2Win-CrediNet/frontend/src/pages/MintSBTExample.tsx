import { useState } from 'react'
import { useAccount } from 'wagmi'
import { motion } from 'framer-motion'
import { useSBTMint } from '@/hooks/useSBTMint'
import { useCrediNet } from '@/hooks/useCrediNet'
import SBTMintAnimation from '@/components/animations/SBTMintAnimation'
import { StarBorder } from '@/components/StarBorder'
import sbtService from '@/services/sbt.service'

/**
 * SBT 铸造示例页面
 * 展示如何在铸造 SBT 时触发动画
 */
const MintSBTExample = () => {
  const { address, isConnected } = useAccount()
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
  const [requestHash, setRequestHash] = useState<string>('0x0000000000000000000000000000000000000000000000000000000000000000')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [permitStatus, setPermitStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle')

  /**
   * 处理铸造流程
   * 1. 生成元数据
   * 2. 上传到 IPFS（或使用动态 Agent）
   * 3. 如果无 MINTER_ROLE，从后端获取签名
   * 4. 调用合约铸造
   * 5. 显示动画
   */
  const handleMint = async () => {
    if (!address) {
      setErrorMsg('请先连接钱包')
      return
    }

    try {
      setErrorMsg('')
      setPermitStatus('idle')
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

      let permitOpts: any = undefined

      // 如果没有 MINTER_ROLE，从后端获取签名
      if (!hasMinterRole) {
        try {
          setPermitStatus('fetching')
          console.log('🔐 正在从后端获取签名...')

          const permitResponse = await sbtService.getMintPermit(
            address,
            1, // badge_type
            tokenURI,
            trimmed === '' ? ('0x' + '0'.repeat(64)) : trimmed
          )

          if (!permitResponse.success) {
            throw new Error('签名获取失败')
          }

          console.log('✅ 签名获取成功:', permitResponse)
          setPermitStatus('success')

          permitOpts = {
            issuer: permitResponse.issuer as `0x${string}`,
            deadline: BigInt(permitResponse.deadline),
            signature: permitResponse.signature as `0x${string}`,
          }
        } catch (error) {
          console.error('❌ 签名获取失败:', error)
          setPermitStatus('error')
          setErrorMsg('签名获取失败，请检查登录状态或联系管理员')
          setUploadStatus('idle')
          return
        }
      }

      // 调用铸造
      await mintSBT(1, tokenURI, trimmed === '' ? undefined : (trimmed as `0x${string}`), permitOpts)
      console.log('✅ SBT 铸造完成！元数据将由 DynamicSBTAgent 动态生成')
    } catch (error) {
      console.error('❌ 铸造失败:', error)
      setUploadStatus('idle')
      setPermitStatus('idle')
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
              铸造权限：{hasMinterRole ? <span className="text-emerald-400">✅ MINTER_ROLE</span> : <span className="text-blue-400">🔐 自动签名授权</span>}
            </div>
            <div className="space-y-6">
              <div className="text-gray-300 text-sm">
                <p className="mb-2">🎯 Soulbound Token (SBT) 是不可转移的身份凭证</p>
                <p className="mb-2">✨ 根据您的五维信用评分动态生成</p>
                <p>🔒 永久绑定到您的钱包地址</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-gray-400">验证哈希（可选修改）</label>
                <input
                  value={requestHash}
                  onChange={(e) => setRequestHash(e.target.value)}
                  placeholder="0x 开头的 64 位十六进制"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                />
                <div className="text-xs text-gray-500">
                  💡 默认使用全零哈希，可直接铸造。如需自定义验证，请修改此值。
                </div>
                {errorMsg && (
                  <div className="text-sm text-red-400">{errorMsg}</div>
                )}
              </div>
              {!hasMinterRole && (
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300 mb-2">
                    <strong>🔐 自动签名授权</strong>
                  </div>
                  <div className="text-xs text-gray-400">
                    由于您的钱包没有 MINTER_ROLE 权限，系统将自动从后端获取授权签名完成铸造。
                  </div>
                  {permitStatus === 'fetching' && (
                    <div className="text-xs text-blue-400 mt-2">⏳ 正在获取签名...</div>
                  )}
                  {permitStatus === 'success' && (
                    <div className="text-xs text-emerald-400 mt-2">✅ 签名获取成功！</div>
                  )}
                  {permitStatus === 'error' && (
                    <div className="text-xs text-red-400 mt-2">❌ 签名获取失败</div>
                  )}
                </div>
              )}
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
