import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { TrendingUp, Droplet, Vote, ArrowRightLeft, Lock } from 'lucide-react'

export default function DeFiPage() {
  const [stakeAmount, setStakeAmount] = useState('')
  const [selectedPool, setSelectedPool] = useState(null)

  const stakingPools = [
    { id: 1, name: 'PBX Staking', apy: 12.5, tvl: '45.2M', token: 'PBX', risk: 'Low' },
    { id: 2, name: 'USDC-PBX LP', apy: 24.8, tvl: '28.5M', token: 'LP Token', risk: 'Medium' },
    { id: 3, name: 'SOL-PBX LP', apy: 35.2, tvl: '18.3M', token: 'LP Token', risk: 'High' }
  ]

  const liquidityPools = [
    { pair: 'USDC/PBX', liquidity: '$28.5M', volume24h: '$2.4M', apy: 24.8, yourShare: 0.15 },
    { pair: 'SOL/PBX', liquidity: '$18.3M', volume24h: '$1.8M', apy: 35.2, yourShare: 0.08 },
    { pair: 'ETH/PBX', liquidity: '$12.7M', volume24h: '$980K', apy: 18.5, yourShare: 0 }
  ]

  const governance = [
    { id: 1, title: 'Reduce transaction fees to 0.08%', status: 'active', votes: 12500, ends: '2 days' },
    { id: 2, title: 'Add support for Japanese Yen (JPY)', status: 'active', votes: 8900, ends: '5 days' },
    { id: 3, title: 'Increase staking rewards by 2%', status: 'passed', votes: 15600, ends: 'Ended' }
  ]

  const crossChainAssets = [
    { name: 'Wrapped Bitcoin', symbol: 'WBTC', chain: 'Ethereum', balance: 0.5, value: 21500 },
    { name: 'Wrapped Ethereum', symbol: 'WETH', chain: 'Solana', balance: 2.3, value: 4800 },
    { name: 'USD Coin', symbol: 'USDC', chain: 'Multi-chain', balance: 15000, value: 15000 }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-normal text-gray-900 mb-2">DeFi Services</h2>
        <p className="text-sm text-gray-500">Stake, provide liquidity, and participate in governance</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Total Value Locked</div>
            <div className="text-2xl font-light text-gray-900">$92.0M</div>
            <div className="text-xs text-green-600 mt-1">↑ 18% this month</div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Your Staked</div>
            <div className="text-2xl font-light text-gray-900">$12,450</div>
            <div className="text-xs text-gray-500 mt-1">Earning 12.5% APY</div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Rewards Earned</div>
            <div className="text-2xl font-light text-gray-900">$1,245</div>
            <div className="text-xs text-green-600 mt-1">+$45 this week</div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Governance Power</div>
            <div className="text-2xl font-light text-gray-900">2,500</div>
            <div className="text-xs text-gray-500 mt-1">PBX tokens</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staking */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="h-5 w-5 text-gray-700" />
              <h3 className="text-lg font-medium text-gray-900">Staking Pools</h3>
            </div>

            <div className="space-y-3 mb-6">
              {stakingPools.map((pool) => (
                <div 
                  key={pool.id}
                  onClick={() => setSelectedPool(pool.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedPool === pool.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-900">{pool.name}</div>
                      <div className="text-sm text-gray-500">{pool.token}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-green-600">{pool.apy}% APY</div>
                      <div className="text-xs text-gray-500">Risk: {pool.risk}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">TVL: ${pool.tvl}</div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Stake</label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                <Lock className="h-4 w-4 mr-2" />
                Stake Tokens
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liquidity Pools */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Droplet className="h-5 w-5 text-gray-700" />
              <h3 className="text-lg font-medium text-gray-900">Liquidity Pools</h3>
            </div>

            <div className="space-y-3">
              {liquidityPools.map((pool, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{pool.pair}</div>
                      <div className="text-sm text-gray-500">Liquidity: {pool.liquidity}</div>
                    </div>
                    <div className="text-lg font-medium text-green-600">{pool.apy}% APY</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">24h Volume</div>
                      <div className="font-medium text-gray-900">{pool.volume24h}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Your Share</div>
                      <div className="font-medium text-gray-900">{pool.yourShare}%</div>
                    </div>
                  </div>
                  <Button className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-900">
                    {pool.yourShare > 0 ? 'Manage Position' : 'Add Liquidity'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Governance */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Vote className="h-5 w-5 text-gray-700" />
            <h3 className="text-lg font-medium text-gray-900">Governance Proposals</h3>
          </div>

          <div className="space-y-3">
            {governance.map((proposal) => (
              <div key={proposal.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">{proposal.title}</div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{proposal.votes.toLocaleString()} votes</span>
                      <span>•</span>
                      <span className={proposal.status === 'active' ? 'text-green-600' : 'text-gray-500'}>
                        {proposal.status === 'active' ? `Ends in ${proposal.ends}` : proposal.ends}
                      </span>
                    </div>
                  </div>
                  {proposal.status === 'active' && (
                    <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                      Vote
                    </Button>
                  )}
                  {proposal.status === 'passed' && (
                    <div className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      Passed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-Chain Assets */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <ArrowRightLeft className="h-5 w-5 text-gray-700" />
            <h3 className="text-lg font-medium text-gray-900">Cross-Chain Assets</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {crossChainAssets.map((asset, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium text-gray-900">{asset.symbol}</div>
                    <div className="text-sm text-gray-500">{asset.name}</div>
                  </div>
                  <div className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    {asset.chain}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Balance</div>
                  <div className="font-medium text-gray-900">{asset.balance} {asset.symbol}</div>
                  <div className="text-sm text-gray-500">${asset.value.toLocaleString()}</div>
                </div>
                <Button className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-900">
                  Bridge
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

