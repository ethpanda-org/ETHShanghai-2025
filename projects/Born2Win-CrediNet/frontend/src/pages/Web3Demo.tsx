/**
 * Web3 功能演示页面
 * 展示如何使用智能合约交互
 */

import { useAccount } from 'wagmi'
import { Web3StatusCard, CreditScoreDisplay, CRNBalanceDisplay } from '../components/web3'
import DebugInfo from '../components/web3/DebugInfo'
import { useSBTRegistry, useDataMarketplace } from '../hooks'
import { ExternalLink, Shield, Award, CheckCircle, XCircle } from 'lucide-react'
import SBTDynamicDisplay from '../components/sbt/SBTDynamicDisplay'
import { testContractAddresses, getConnectionSummary } from '../utils/contractTest'
import { runBrowserTest } from '../utils/testContractConnection'
import { useState, useEffect } from 'react'
const Web3Demo = () => {
  const { isConnected, chainId, address } = useAccount()
  const { badges } = useSBTRegistry()
  const { authorizedApps } = useDataMarketplace()
  // const { creditScore, updateScore, isUpdating } = useCrediNet()
  // const { mintSBT, isMinting, showAnimation } = useSBTMint()
  
  // 合约连接测试状态
  const [contractTestResults, setContractTestResults] = useState<any[]>([])
  const [connectionSummary, setConnectionSummary] = useState<any>(null)
  const [testResult, setTestResult] = useState<any>(null)

  // 测试合约连接
  useEffect(() => {
    if (chainId) {
      const results = testContractAddresses(chainId)
      const summary = getConnectionSummary(chainId)
      setContractTestResults(results)
      setConnectionSummary(summary)
    }
  }, [chainId])

  // 运行合约测试
  const handleRunTest = async () => {
    if (!address) return
    
    console.log('🧪 开始运行合约测试...')
    setTestResult({ loading: true })
    
    try {
      const result = await runBrowserTest(address)
      setTestResult(result)
    } catch (error) {
      let errorMsg = '测试失败';
      if (error instanceof Error && error.message) {
        errorMsg = error.message;
      }
      setTestResult({ 
        success: false, 
        error: errorMsg 
      });
    }
  }

  return (
    <div className="min-h-screen py-24 px-6">
      <div className="container mx-auto max-w-7xl">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            Web3 功能演示
          </h1>
          <p className="text-gray-400 text-lg">
            展示前端直接调用智能合约的各项功能
          </p>
        </div>

        {/* 提示信息 */}
        {!isConnected && (
          <div className="glass-card p-6 mb-8 border-l-4 border-cyan-500">
            <div className="flex items-start gap-3">
              <Shield className="text-cyan-400 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="text-white font-semibold mb-1">连接钱包开始体验</h3>
                <p className="text-gray-400 text-sm">
                  请点击右上角的 "Connect Wallet" 按钮连接钱包，体验 Web3 功能
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 第一行：基础信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Web3StatusCard />
          <CreditScoreDisplay />
          <CRNBalanceDisplay />
        </div>

        {/* 调试信息 */}
        {isConnected && (
          <div className="mb-8">
            <DebugInfo />
          </div>
        )}

        {/* 合约连接状态 */}
        {isConnected && chainId && (
          <div className="mb-8">
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="text-emerald-400" size={24} />
                <h3 className="text-lg font-semibold text-white">合约连接状态</h3>
                {connectionSummary && (
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    connectionSummary.connected === connectionSummary.total 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {connectionSummary.connected}/{connectionSummary.total}
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                {contractTestResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      {result.isValid ? (
                        <CheckCircle className="text-emerald-400" size={16} />
                      ) : (
                        <XCircle className="text-red-400" size={16} />
                      )}
                      <span className="text-white font-medium">{result.contract}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-300 font-mono">{result.address}</div>
                      {result.error && (
                        <div className="text-xs text-red-400">{result.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {connectionSummary && (
                <div className="mt-4 p-3 rounded-lg bg-white/5">
                  <div className="text-sm text-gray-300">
                    {connectionSummary.summary}
                  </div>
                </div>
              )}

              {/* 合约测试按钮和结果 */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={handleRunTest}
                  disabled={testResult?.loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {testResult?.loading ? '测试中...' : '运行合约测试'}
                </button>
                
                {testResult && !testResult.loading && (
                  <div className="mt-3 p-3 rounded-lg bg-white/5">
                    <div className={`text-sm ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {testResult.success ? '✅ 测试成功' : '❌ 测试失败'}
                    </div>
                    {testResult.error && (
                      <div className="text-xs text-red-400 mt-1">{testResult.error}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 动态SBT展示 */}
        {isConnected && (
          <div className="mb-8">
            <SBTDynamicDisplay />
          </div>
        )}

        {/* 第二行：SBT 和授权 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* SBT 列表 */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-purple-400" size={24} />
              <h3 className="text-lg font-semibold text-white">我的 SBT 勋章</h3>
            </div>

            {!isConnected ? (
              <p className="text-gray-400 text-center py-8">请先连接钱包</p>
            ) : badges.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">暂无 SBT 勋章</p>
                <p className="text-sm text-gray-500">完成任务获得你的第一个勋章！</p>
              </div>
            ) : (
              <div className="space-y-3">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">{badge.name}</h4>
                        <p className="text-sm text-gray-400">{badge.description}</p>
                      </div>
                      <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                        {badge.rarity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 授权应用列表 */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-emerald-400" size={24} />
              <h3 className="text-lg font-semibold text-white">授权应用</h3>
            </div>

            {!isConnected ? (
              <p className="text-gray-400 text-center py-8">请先连接钱包</p>
            ) : !authorizedApps || authorizedApps.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">暂无授权应用</p>
                <p className="text-sm text-gray-500">
                  前往市场页面授权应用使用你的数据
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {authorizedApps.map((appAddress: string, index: number) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-mono text-sm">
                          {appAddress.slice(0, 6)}...{appAddress.slice(-4)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">已授权应用</p>
                      </div>
                      <button className="text-xs text-emerald-400 hover:text-emerald-300">
                        查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 第三行：说明和链接 */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📚 开发者资源</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Web3 集成指南',
                desc: '完整的智能合约交互文档',
                link: '/WEB3_INTEGRATION_GUIDE.md',
              },
              {
                title: '快速开始',
                desc: '5 分钟快速上手 Web3',
                link: '/WEB3_QUICKSTART.md',
              },
              {
                title: '部署清单',
                desc: '项目部署前检查清单',
                link: '/DEPLOYMENT_CHECKLIST.md',
              },
            ].map((item) => (
              <a
                key={item.title}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-medium">{item.title}</h4>
                  <ExternalLink
                    size={16}
                    className="text-gray-400 group-hover:text-cyan-400 transition-colors"
                  />
                </div>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </a>
            ))}
          </div>
        </div>

        {/* 代码示例 */}
        <div className="mt-8 glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">💻 代码示例</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-2">查询用户信用数据：</p>
              <pre className="bg-black/30 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm text-gray-300">
{`import { useCrediNet } from '@/hooks'

function MyComponent() {
  const { creditScore, userDID } = useCrediNet()
  
  return (
    <div>
      <p>DID: {userDID}</p>
      <p>C-Score: {creditScore?.total}</p>
    </div>
  )
}`}
                </code>
              </pre>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">领取 CRN 奖励：</p>
              <pre className="bg-black/30 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm text-gray-300">
{`import { useCRNToken } from '@/hooks'

function ClaimButton() {
  const { claimRewards, isClaiming } = useCRNToken()
  
  return (
    <button onClick={claimRewards} disabled={isClaiming}>
      {isClaiming ? '领取中...' : '领取奖励'}
    </button>
  )
}`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Web3Demo

