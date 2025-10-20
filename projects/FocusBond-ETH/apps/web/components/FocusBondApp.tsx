'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useBalance } from 'wagmi'
import { parseEther, formatEther, formatUnits } from 'viem'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { getContracts } from '../lib/wagmi'
import { useStartSession } from '../lib/hooks/useStartSession'
import { useBreakSession } from '../lib/hooks/useBreakSession'
import { useCompleteSession } from '../lib/hooks/useCompleteSession'
import { useHeartbeat } from '../lib/hooks/useHeartbeat'

// FocusBond ABI - 使用不可转让的专注积分
const FOCUSBOND_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "sessions",
    "outputs": [
      {"internalType": "uint64", "name": "startTs", "type": "uint64"},
      {"internalType": "uint64", "name": "lastHeartbeatTs", "type": "uint64"},
      {"internalType": "uint96", "name": "depositWei", "type": "uint96"},
      {"internalType": "uint16", "name": "targetMinutes", "type": "uint16"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
      {"internalType": "bool", "name": "watchdogClosed", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "baseFeeUsdc",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "baseFeeFocus",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function FocusBondApp() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [duration, setDuration] = useState('60')
  const [stakeAmount, setStakeAmount] = useState('0.1')
  const [feeCalculation, setFeeCalculation] = useState<any>(null)
  const [transactionResult, setTransactionResult] = useState<any>(null)

  const contracts = chainId ? getContracts(chainId) : null

  // Hooks
  const { startSession, loading: startLoading, error: startError, transactionHash: startHash } = useStartSession()
  const { breakSession, loading: breakLoading, error: breakError, transactionHash: breakHash } = useBreakSession()
  const { completeSession, loading: completeLoading, error: completeError, transactionHash: completeHash } = useCompleteSession()
  const { sendHeartbeat, loading: heartbeatLoading, transactionHash: heartbeatHash } = useHeartbeat()

  // 读取用户会话
  const { data: userSession, refetch: refetchSessions } = useReadContract({
    address: contracts?.focusBond,
    abi: FOCUSBOND_ABI,
    functionName: 'sessions',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address && !!contracts,
      refetchInterval: 1000,
      staleTime: 500
    }
  })

  // 读取基础费用
  const { data: baseFeeUsdc } = useReadContract({
    address: contracts?.focusBond,
    abi: FOCUSBOND_ABI,
    functionName: 'baseFeeUsdc',
    query: { enabled: !!contracts }
  })

  const { data: baseFeeFocus } = useReadContract({
    address: contracts?.focusBond,
    abi: FOCUSBOND_ABI,
    functionName: 'baseFeeFocus',
    query: { enabled: !!contracts }
  })

  // 读取ETH余额
  const { data: ethBalance } = useBalance({
    address: address as `0x${string}`,
    query: { enabled: !!address }
  })

  // 读取代币余额
  const { data: usdcBalance } = useReadContract({
    address: contracts?.usdc,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contracts }
  })

  const { data: focusBalance } = useReadContract({
    address: contracts?.focus,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contracts }
  })

  // 状态管理
  const [transactionStatus, setTransactionStatus] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // 等待交易确认
  const { isLoading: startConfirming, isSuccess: startSuccess } = useWaitForTransactionReceipt({ hash: startHash as `0x${string}` })
  const { isLoading: breakConfirming, isSuccess: breakSuccess } = useWaitForTransactionReceipt({ hash: breakHash as `0x${string}` })
  const { isLoading: completeConfirming, isSuccess: completeSuccess } = useWaitForTransactionReceipt({ hash: completeHash as `0x${string}` })
  const { isLoading: heartbeatConfirming, isSuccess: heartbeatSuccess } = useWaitForTransactionReceipt({ hash: heartbeatHash as `0x${string}` })

  const isPending = startLoading || breakLoading || completeLoading || heartbeatLoading
  const isConfirming = startConfirming || breakConfirming || completeConfirming || heartbeatConfirming

  // 创建会话
  const createSession = async () => {
    if (!contracts) {
      setErrorMessage('合约地址未找到')
      return
    }
    
    try {
      setErrorMessage('')
      setTransactionStatus('准备创建会话...')
      
      const durationMinutes = parseInt(duration)
      const stakeAmountWei = parseEther(stakeAmount)
      
      if (isNaN(durationMinutes) || durationMinutes <= 0 || durationMinutes > 65535) {
        setErrorMessage('持续时间必须是1-65535分钟之间的有效数字')
        return
      }
      
      const stakeAmountNum = parseFloat(stakeAmount)
      if (isNaN(stakeAmountNum) || stakeAmountNum <= 0) {
        setErrorMessage('质押金额必须是大于0的有效数字')
        return
      }
      
      if (stakeAmountNum < 0.001) {
        setErrorMessage('质押金额不能少于0.001 ETH')
        return
      }
      
      setTransactionStatus('等待用户确认交易...')
      await startSession(durationMinutes, stakeAmountWei, contracts.focusBond)
    } catch (error) {
      console.error('创建会话失败:', error)
      setErrorMessage(`创建会话失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setTransactionStatus('')
    }
  }

  // 中断会话
  const handleBreakSession = async () => {
    if (!contracts || !feeCalculation) return
    
    const currentFee = feeCalculation.fees.breakFee
    const tokenType = feeCalculation.fees.tokenType
    
    const calculatedFee = BigInt(currentFee)
    const maxFee = calculatedFee + (calculatedFee * BigInt(10)) / BigInt(100)
    
    setTransactionResult({
      type: 'break',
      expectedFee: currentFee,
      tokenType,
      timestamp: Date.now()
    })
    
    try {
      await breakSession(maxFee, contracts.focusBond)
    } catch (error) {
      console.error('中断会话失败:', error)
    }
  }

  // 完成会话
  const handleCompleteSession = async () => {
    if (!contracts || !feeCalculation) return
    
    setTransactionResult({
      type: 'complete',
      expectedReward: feeCalculation.rewards.completionReward,
      depositReturn: feeCalculation.session.depositWei,
      timestamp: Date.now()
    })
    
    try {
      await completeSession(contracts.focusBond)
    } catch (error) {
      console.error('完成会话失败:', error)
    }
  }

  // 发送心跳
  const handleHeartbeat = async () => {
    if (!contracts) return
    try {
      await sendHeartbeat(contracts.focusBond)
    } catch (error) {
      console.error('发送心跳失败:', error)
    }
  }

  // 监听交易状态变化
  useEffect(() => {
    if (isPending) {
      setTransactionStatus('交易已提交，等待确认...')
    } else if (isConfirming) {
      setTransactionStatus('交易确认中...')
    } else if (startSuccess || breakSuccess || completeSuccess) {
      setTransactionStatus('交易成功！')
      refetchSessions()
      
      if (transactionResult) {
        if (transactionResult.type === 'break') {
          setTransactionStatus(`会话已中断！惩罚费用: ${formatUnits(transactionResult.expectedFee, transactionResult.tokenType === 'focus' ? 18 : 6)} ${transactionResult.tokenType.toUpperCase()}`)
        } else if (transactionResult.type === 'complete') {
          setTransactionStatus(`会话完成！获得奖励: ${formatEther(transactionResult.expectedReward)} ETH，质押金已返还: ${formatEther(transactionResult.depositReturn)} ETH`)
        }
        
        setFeeCalculation(null)
        
        setTimeout(() => {
          setTransactionResult(null)
          setTransactionStatus('')
        }, 3000)
      } else {
        setTimeout(() => {
          setTransactionStatus('')
        }, 3000)
      }
    } else if (heartbeatSuccess) {
      setTransactionStatus('心跳发送成功！')
      setTimeout(() => {
        setTransactionStatus('')
      }, 2000)
    }
  }, [isPending, isConfirming, startSuccess, breakSuccess, completeSuccess, heartbeatSuccess, refetchSessions, transactionResult])

  // 监听错误
  useEffect(() => {
    const currentError = startError || breakError || completeError
    if (currentError) {
      setErrorMessage(`交易失败: ${currentError}`)
      setTransactionStatus('')
    }
  }, [startError, breakError, completeError])

  // 获取费用计算
  const fetchFeeCalculation = async () => {
    if (!address) return
    
    try {
      const response = await fetch(`/api/session/calculate-fee?userAddress=${address}&tokenType=focus`)
      if (response.ok) {
        const data = await response.json()
        setFeeCalculation(data)
      } else {
        setFeeCalculation(null)
      }
    } catch (error) {
      console.error('获取费用计算失败:', error)
      setFeeCalculation(null)
    }
  }

  // 定期更新费用计算
  useEffect(() => {
    if (userSession && userSession[4]) {
      fetchFeeCalculation()
      const interval = setInterval(fetchFeeCalculation, 5000)
      return () => clearInterval(interval)
    } else {
      setFeeCalculation(null)
    }
  }, [address, userSession])

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>请先连接钱包</CardTitle>
        </CardHeader>
        <CardContent>
          <p>请连接您的钱包以使用 FocusBond 功能</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 余额显示 */}
      <Card>
        <CardHeader>
          <CardTitle>账户余额</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div>
            <Label>ETH 余额</Label>
            <p className="text-2xl font-bold text-blue-600">
              {ethBalance ? formatEther(ethBalance.value) : '0'} ETH
            </p>
            <p className="text-xs text-gray-500">用于质押创建专注会话</p>
          </div>
          <div>
            <Label>专注积分</Label>
            <p className="text-xl font-semibold text-green-600">
              {focusBalance ? formatUnits(focusBalance as bigint, 18) : '0'} FCRED
            </p>
            <p className="text-xs text-gray-500">用于抵扣服务费用</p>
          </div>
        </CardContent>
      </Card>

      {/* 专注积分说明 */}
      <Card>
        <CardHeader>
          <CardTitle>专注积分系统 🎯</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 如何获得积分:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 完成专注会话获得积分奖励</li>
              <li>• 积分可用于抵扣服务费用</li>
              <li>• 积分不可转让，仅限个人使用</li>
              <li>• 积分无投资价值，仅为应用内功能</li>
            </ul>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ 合规声明:</h4>
            <p className="text-sm text-yellow-800">
              专注积分(FCRED)是不可转让的应用内积分，不构成投资产品。
              本应用不进行任何代币销售、预售或募资活动。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 创建新会话 */}
      <Card>
        <CardHeader>
          <CardTitle>创建专注会话</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="duration">持续时间 (分钟)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="65535"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
            />
            <p className="text-xs text-gray-500 mt-1">最少1分钟，最多65535分钟</p>
          </div>
          
          <div>
            <Label htmlFor="stake">质押金额 (ETH)</Label>
            <Input
              id="stake"
              type="number"
              step="0.01"
              min="0.001"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">最少0.001 ETH</p>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="font-semibold text-orange-900 mb-2">💡 服务费信息:</h4>
            <p className="text-sm text-orange-800">
              基础服务费: {baseFeeFocus ? formatUnits(baseFeeFocus as bigint, 18) : '100'} FCRED
            </p>
            <p className="text-sm text-orange-800">
              提前结束将支付递增服务费 (每10分钟增加20%)
            </p>
            <p className="text-sm text-orange-700 font-semibold">
              ⚠️ 确保有足够的专注积分支付潜在服务费
            </p>
          </div>

          {/* 状态显示 */}
          {transactionStatus && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">{transactionStatus}</p>
            </div>
          )}

          {/* 错误显示 */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* 交易哈希显示 */}
          {(startHash || breakHash || completeHash) && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-700 text-sm">
                交易哈希: <span className="font-mono text-xs break-all">{startHash || breakHash || completeHash}</span>
              </p>
            </div>
          )}

          <Button 
            onClick={createSession} 
            disabled={isPending || isConfirming || (userSession && userSession[4])}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isPending ? '确认中...' : isConfirming ? '处理中...' : '创建会话'}
          </Button>
        </CardContent>
      </Card>

      {/* 活跃会话列表 */}
      <Card>
        <CardHeader>
          <CardTitle>我的会话</CardTitle>
        </CardHeader>
        <CardContent>
          {userSession && userSession[4] ? (
            <SessionCard 
              userAddress={address!}
              session={userSession}
              contracts={contracts}
              feeCalculation={feeCalculation}
              onBreak={handleBreakSession}
              onComplete={handleCompleteSession}
              onHeartbeat={handleHeartbeat}
            />
          ) : (
            <p className="text-gray-500">暂无活跃会话</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 会话卡片组件
function SessionCard({ 
  userAddress,
  session,
  contracts,
  feeCalculation,
  onBreak, 
  onComplete, 
  onHeartbeat 
}: { 
  userAddress: string
  session: any
  contracts: any
  feeCalculation: any
  onBreak: () => void
  onComplete: () => void
  onHeartbeat: () => void
}) {
  const [countdown, setCountdown] = useState<number>(0)
  const [heartbeatWarning, setHeartbeatWarning] = useState<boolean>(false)

  if (!session) return null

  const [startTs, lastHeartbeatTs, depositWei, targetMinutes, isActive, watchdogClosed] = session
  
  const now = Math.floor(Date.now() / 1000)
  const endTime = Number(startTs) + Number(targetMinutes) * 60
  const timeLeft = Math.max(0, endTime - now)
  const heartbeatGap = now - Number(lastHeartbeatTs)

  // 倒计时更新
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      const newTimeLeft = Math.max(0, endTime - Math.floor(Date.now() / 1000))
      setCountdown(newTimeLeft)
      
      const currentHeartbeatGap = Math.floor(Date.now() / 1000) - Number(lastHeartbeatTs)
      setHeartbeatWarning(currentHeartbeatGap > 120)
    }, 1000)

    return () => clearInterval(timer)
  }, [endTime, lastHeartbeatTs])

  // 初始化倒计时
  useEffect(() => {
    setCountdown(timeLeft)
    setHeartbeatWarning(heartbeatGap > 120)
  }, [timeLeft, heartbeatGap])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatus = () => {
    if (watchdogClosed) return { text: '看门狗关闭', color: 'bg-red-500' }
    if (!isActive) return { text: '已结束', color: 'bg-gray-500' }
    if (timeLeft <= 0) return { text: '可完成', color: 'bg-blue-500' }
    return { text: '进行中', color: 'bg-yellow-500' }
  }

  const status = getStatus()
  const displayTimeLeft = countdown > 0 ? countdown : timeLeft

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">专注会话</h3>
          <p className="text-sm text-gray-600">
            质押: {formatEther(depositWei)} ETH
          </p>
          <p className="text-sm text-gray-600">
            持续时间: {Number(targetMinutes)} 分钟
          </p>
          <p className="text-sm text-gray-600">
            开始时间: {new Date(Number(startTs) * 1000).toLocaleString()}
          </p>
        </div>
        <Badge className={`${status.color} text-white`}>
          {status.text}
        </Badge>
      </div>

      {isActive && (
        <div className="text-center">
          <p className={`text-2xl font-mono font-bold ${displayTimeLeft < 300 ? 'text-red-600' : 'text-blue-600'}`}>
            {formatTime(displayTimeLeft)}
          </p>
          <p className="text-sm text-gray-500">剩余时间</p>
          
          {heartbeatWarning && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800 text-xs">⚠️ 需要发送心跳信号</p>
            </div>
          )}
          
          <div className="mt-2 text-xs text-gray-500">
            <p>上次心跳: {Math.floor(heartbeatGap / 60)}分钟前</p>
          </div>
          
          {feeCalculation && (
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 text-sm">📊 会话信息</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-800 mt-2">
                  <div>运行时间: {feeCalculation.timing.elapsedMinutes}分钟</div>
                  <div>完成度: {feeCalculation.timing.completionPercentage.toFixed(1)}%</div>
                  <div>剩余时间: {Math.max(0, Math.floor(feeCalculation.timing.timeLeft / 60))}分钟</div>
                  <div>质押金额: {formatEther(feeCalculation.session.depositWei)} ETH</div>
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-900 text-sm">💸 中断惩罚</h4>
                <p className="text-red-800 text-lg font-bold">
                  {formatUnits(feeCalculation.fees.breakFee, feeCalculation.fees.decimals)} {feeCalculation.fees.tokenType.toUpperCase()}
                </p>
                <div className="text-red-700 text-xs mt-1 space-y-1">
                  <p>⚠️ 费用每10分钟增加20%</p>
                  <p>当前费用倍数: {(100 + 20 * Math.floor(feeCalculation.timing.elapsedMinutes / 10)) / 100}x</p>
                </div>
              </div>
              
              {feeCalculation.rewards.canComplete && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 text-sm">🎉 完成奖励</h4>
                  <p className="text-green-800 text-lg font-bold">
                    +{formatEther(feeCalculation.rewards.completionReward)} ETH
                  </p>
                  <p className="text-green-800 text-sm">
                    质押返还: {formatEther(feeCalculation.session.depositWei)} ETH
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {isActive && (
          <>
            <Button 
              onClick={onHeartbeat}
              className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              💓 心跳
            </Button>
            <Button 
              onClick={() => {
                if (feeCalculation) {
                  const fee = formatUnits(feeCalculation.fees.breakFee, feeCalculation.fees.decimals)
                  const token = feeCalculation.fees.tokenType.toUpperCase()
                  if (confirm(`确认中断会话？\n\n惩罚费用: ${fee} ${token}\n完成度: ${feeCalculation.timing.completionPercentage}%`)) {
                    onBreak()
                  }
                } else {
                  onBreak()
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              中断会话
            </Button>
          </>
        )}
        
        {displayTimeLeft <= 0 && isActive && (
          <Button 
            onClick={() => {
              if (feeCalculation) {
                const reward = formatEther(feeCalculation.rewards.completionReward)
                const deposit = formatEther(feeCalculation.session.depositWei)
                if (confirm(`确认完成会话？\n\n获得奖励: ${reward} ETH\n质押返还: ${deposit} ETH`)) {
                  onComplete()
                }
              } else {
                onComplete()
              }
            }}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            完成会话
          </Button>
        )}
      </div>
    </div>
  )
}

