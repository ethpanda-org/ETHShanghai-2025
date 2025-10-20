/**
 * 调试信息组件
 * 显示详细的合约连接和状态信息
 */

import { useAccount } from 'wagmi'
import { useCrediNet } from '../../hooks'
import { getContractAddresses } from '../../contracts/addresses'
import { Copy, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react'
import { runBrowserTest, type ContractTestResult } from '../../utils/testContractConnection'
import { useState } from 'react'

type LoadingState = { loading: true }

const isLoadingState = (value: unknown): value is LoadingState =>
  typeof value === 'object' && value !== null && 'loading' in value

const isContractResult = (value: unknown): value is ContractTestResult =>
  typeof value === 'object' && value !== null && 'success' in value

const DebugInfo = () => {
  const { address, chainId, isConnected } = useAccount()
  const { creditScore, isLoading, error, contractAddress } = useCrediNet()
  const [testResult, setTestResult] = useState<ContractTestResult | LoadingState | null>(null)
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  const runContractTest = async () => {
    if (!address) return
    
    console.log('🧪 开始合约测试...')
    setTestResult({ loading: true })
    
    try {
      const result = await runBrowserTest(address)
      setTestResult(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '测试失败'
      setTestResult({
        success: false,
        error: message,
      })
    }
  }

  if (!isConnected) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="text-yellow-400" size={20} />
          <h3 className="text-white font-medium">调试信息</h3>
        </div>
        <p className="text-gray-400 text-sm">请先连接钱包</p>
      </div>
    )
  }

  const addresses = chainId ? getContractAddresses(chainId) : null

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="text-blue-400" size={20} />
        <h3 className="text-white font-medium">调试信息</h3>
      </div>
      
      <div className="space-y-3 text-sm">
        {/* 钱包信息 */}
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">钱包地址:</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-mono text-xs">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                onClick={() => copyToClipboard(address || '')}
                className="p-1 hover:bg-white/10 rounded"
                aria-label="复制钱包地址"
              >
                <Copy size={12} className="text-gray-400" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-400">网络:</span>
            <span className="text-white">
              {chainId === 11155111 ? 'Sepolia' : `Chain ${chainId}`}
            </span>
          </div>
        </div>

        {/* 合约地址 */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 mb-2">合约地址配置:</div>
          {addresses ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">CrediNetCore:</span>
                <div className="flex items-center gap-2">
                  {addresses.CrediNetCore === '0x0000000000000000000000000000000000000000' ? (
                    <XCircle className="text-red-400" size={14} />
                  ) : (
                    <CheckCircle className="text-green-400" size={14} />
                  )}
                  <span className="text-white font-mono text-xs">
                    {addresses.CrediNetCore.slice(0, 6)}...{addresses.CrediNetCore.slice(-4)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">SBTRegistry:</span>
                <div className="flex items-center gap-2">
                  {addresses.SBTRegistry === '0x0000000000000000000000000000000000000000' ? (
                    <XCircle className="text-red-400" size={14} />
                  ) : (
                    <CheckCircle className="text-green-400" size={14} />
                  )}
                  <span className="text-white font-mono text-xs">
                    {addresses.SBTRegistry.slice(0, 6)}...{addresses.SBTRegistry.slice(-4)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <span className="text-red-400">无法获取地址配置</span>
          )}
        </div>

        {/* 状态信息 */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 mb-2">查询状态:</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">加载状态:</span>
              <span className={isLoading ? 'text-yellow-400' : 'text-green-400'}>
                {isLoading ? '加载中' : '已完成'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400">数据状态:</span>
              <span className={creditScore ? 'text-green-400' : 'text-yellow-400'}>
                {creditScore ? '有数据' : '无数据'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">当前合约地址:</span>
              <span className="text-white font-mono text-xs">
                {contractAddress ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : '未设置'}
              </span>
            </div>
            
            {error && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">错误:</span>
                <span className="text-red-400 text-xs">
                  {error.message?.slice(0, 30)}...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 原始数据 */}
        {creditScore && (
          <div className="border-t border-gray-700 pt-3">
            <div className="text-gray-400 mb-2">信用数据:</div>
            <div className="bg-black/30 p-2 rounded text-xs font-mono">
              <div>总分: {creditScore.total}</div>
              <div>基石: {creditScore.dimensions.keystone}</div>
              <div>能力: {creditScore.dimensions.ability}</div>
              <div>财富: {creditScore.dimensions.finance}</div>
              <div>健康: {creditScore.dimensions.health}</div>
              <div>行为: {creditScore.dimensions.behavior}</div>
            </div>
          </div>
        )}

        {/* 合约测试 */}
        <div className="border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">合约测试:</span>
            <button
              onClick={runContractTest}
              disabled={isLoadingState(testResult)}
              className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs transition-colors disabled:opacity-50"
            >
              <Play size={12} />
              {isLoadingState(testResult) ? '测试中...' : '运行测试'}
            </button>
          </div>
          
          {testResult && (
            <div className="bg-black/30 p-2 rounded text-xs">
              {isLoadingState(testResult) ? (
                <div className="text-yellow-400">测试中...</div>
              ) : isContractResult(testResult) && testResult.success ? (
                <div>
                  <div className={`text-sm mb-1 ${testResult.hasData ? 'text-green-400' : 'text-yellow-400'}`}>
                    {testResult.hasData ? '✅ 有数据' : '⚠️ 无数据'}
                  </div>
                  {testResult.totalScore !== undefined && (
                    <div className="font-mono">
                      总分: {testResult.totalScore}
                    </div>
                  )}
                </div>
              ) : isContractResult(testResult) ? (
                <div className="text-red-400">❌ 测试失败: {testResult.error}</div>
              ) : (
                <div className="text-red-400">❌ 测试失败</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DebugInfo
