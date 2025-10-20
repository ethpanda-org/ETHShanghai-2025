'use client'

import { useAccount, useChainId, useBalance } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getContracts } from '@/lib/wagmi'
import { formatEther, formatUnits } from 'viem'

export default function TestPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const contracts = chainId ? getContracts(chainId) : null

  // 获取ETH余额
  const { data: ethBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
  })

  // 获取FCRED余额
  const { data: fcredBalance } = useBalance({
    address: address,
    token: contracts?.focus,
    query: { enabled: !!address && !!contracts }
  })

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">🎯 FocusBond-ETH 测试页面</h1>
        <p className="text-lg text-gray-600">合规的去中心化专注协议测试环境</p>
      </div>

      {/* 连接状态 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔗 连接状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="font-semibold">钱包连接</p>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "✅ 已连接" : "❌ 未连接"}
              </Badge>
            </div>
            <div>
              <p className="font-semibold">网络</p>
              <Badge variant={chainId === 31337 ? "default" : "destructive"}>
                {chainId === 31337 ? "✅ Anvil (31337)" : `❌ 错误网络 (${chainId})`}
              </Badge>
            </div>
            <div>
              <p className="font-semibold">合约</p>
              <Badge variant={contracts ? "default" : "secondary"}>
                {contracts ? "✅ 已加载" : "❌ 未加载"}
              </Badge>
            </div>
          </div>
          
          {address && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-mono break-all">
                <strong>地址:</strong> {address}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 余额信息 */}
      {isConnected && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>💰 账户余额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900">ETH 余额</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {ethBalance ? formatEther(ethBalance.value) : '0'} ETH
                </p>
                <p className="text-sm text-blue-700">用于质押创建会话</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900">专注积分</h3>
                <p className="text-3xl font-bold text-green-600">
                  {fcredBalance ? formatUnits(fcredBalance.value, fcredBalance.decimals) : '0'} FCRED
                </p>
                <p className="text-sm text-green-700">用于支付服务费</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 合约地址 */}
      {contracts && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📜 合约地址</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">FocusBond (主合约)</p>
                <p className="font-mono text-sm break-all">{contracts.focusBond}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">FocusCredit (不可转让积分)</p>
                <p className="font-mono text-sm break-all">{contracts.focus}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">MockUSDC (测试代币)</p>
                <p className="font-mono text-sm break-all">{contracts.usdc}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 测试说明 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🧪 测试说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">⚠️ 合规声明</h4>
              <p className="text-sm text-yellow-800">
                FCRED是不可转让的专注积分，仅用于应用内服务费折扣，无投资价值。
                本系统完全合规，无ICO风险。
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 测试步骤</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. 连接MetaMask钱包</li>
                  <li>2. 切换到Anvil网络 (31337)</li>
                  <li>3. 返回主页面测试功能</li>
                  <li>4. 创建专注会话</li>
                  <li>5. 测试中断/完成会话</li>
                </ol>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">🔧 网络配置</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p><strong>网络名称:</strong> Anvil Local</p>
                  <p><strong>RPC URL:</strong> http://127.0.0.1:8545</p>
                  <p><strong>链ID:</strong> 31337</p>
                  <p><strong>货币符号:</strong> ETH</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="text-center space-x-4">
        <Button 
          onClick={() => window.location.href = '/'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          🎯 开始测试 FocusBond
        </Button>
        
        <Button 
          onClick={() => window.open('http://127.0.0.1:8545', '_blank')}
          variant="outline"
        >
          🔗 Anvil RPC
        </Button>
      </div>
    </div>
  )
}
import { useAccount, useChainId, useBalance } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getContracts } from '@/lib/wagmi'
import { formatEther, formatUnits } from 'viem'

export default function TestPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const contracts = chainId ? getContracts(chainId) : null

  // 获取ETH余额
  const { data: ethBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
  })

  // 获取FCRED余额
  const { data: fcredBalance } = useBalance({
    address: address,
    token: contracts?.focus,
    query: { enabled: !!address && !!contracts }
  })

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">🎯 FocusBond-ETH 测试页面</h1>
        <p className="text-lg text-gray-600">合规的去中心化专注协议测试环境</p>
      </div>

      {/* 连接状态 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔗 连接状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="font-semibold">钱包连接</p>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "✅ 已连接" : "❌ 未连接"}
              </Badge>
            </div>
            <div>
              <p className="font-semibold">网络</p>
              <Badge variant={chainId === 31337 ? "default" : "destructive"}>
                {chainId === 31337 ? "✅ Anvil (31337)" : `❌ 错误网络 (${chainId})`}
              </Badge>
            </div>
            <div>
              <p className="font-semibold">合约</p>
              <Badge variant={contracts ? "default" : "secondary"}>
                {contracts ? "✅ 已加载" : "❌ 未加载"}
              </Badge>
            </div>
          </div>
          
          {address && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-mono break-all">
                <strong>地址:</strong> {address}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 余额信息 */}
      {isConnected && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>💰 账户余额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900">ETH 余额</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {ethBalance ? formatEther(ethBalance.value) : '0'} ETH
                </p>
                <p className="text-sm text-blue-700">用于质押创建会话</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900">专注积分</h3>
                <p className="text-3xl font-bold text-green-600">
                  {fcredBalance ? formatUnits(fcredBalance.value, fcredBalance.decimals) : '0'} FCRED
                </p>
                <p className="text-sm text-green-700">用于支付服务费</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 合约地址 */}
      {contracts && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📜 合约地址</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">FocusBond (主合约)</p>
                <p className="font-mono text-sm break-all">{contracts.focusBond}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">FocusCredit (不可转让积分)</p>
                <p className="font-mono text-sm break-all">{contracts.focus}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">MockUSDC (测试代币)</p>
                <p className="font-mono text-sm break-all">{contracts.usdc}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 测试说明 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🧪 测试说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">⚠️ 合规声明</h4>
              <p className="text-sm text-yellow-800">
                FCRED是不可转让的专注积分，仅用于应用内服务费折扣，无投资价值。
                本系统完全合规，无ICO风险。
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 测试步骤</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. 连接MetaMask钱包</li>
                  <li>2. 切换到Anvil网络 (31337)</li>
                  <li>3. 返回主页面测试功能</li>
                  <li>4. 创建专注会话</li>
                  <li>5. 测试中断/完成会话</li>
                </ol>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">🔧 网络配置</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p><strong>网络名称:</strong> Anvil Local</p>
                  <p><strong>RPC URL:</strong> http://127.0.0.1:8545</p>
                  <p><strong>链ID:</strong> 31337</p>
                  <p><strong>货币符号:</strong> ETH</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="text-center space-x-4">
        <Button 
          onClick={() => window.location.href = '/'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          🎯 开始测试 FocusBond
        </Button>
        
        <Button 
          onClick={() => window.open('http://127.0.0.1:8545', '_blank')}
          variant="outline"
        >
          🔗 Anvil RPC
        </Button>
      </div>
    </div>
  )
}