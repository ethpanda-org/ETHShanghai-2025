import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { localhost } from 'viem/chains'

// Anvil 本地链配置
const anvil = {
  ...localhost,
  id: 31337,
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
}

const publicClient = createPublicClient({
  chain: anvil,
  transport: http('http://127.0.0.1:8545')
})

const FOCUSBOND_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "calculateBreakFee",
    "outputs": [{"internalType": "uint256", "name": "fee", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
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
  }
] as const

const FOCUSBOND_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`
const USDC_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`
const FOCUS_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}` // FocusCredit (non-transferable)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userAddress = searchParams.get('userAddress')
  const tokenType = searchParams.get('tokenType') || 'focus' // 'usdc' or 'focus'

  if (!userAddress) {
    return NextResponse.json(
      { error: '缺少用户地址参数' },
      { status: 400 }
    )
  }

  try {
    // 读取会话信息
    const session = await publicClient.readContract({
      address: FOCUSBOND_ADDRESS,
      abi: FOCUSBOND_ABI,
      functionName: 'sessions',
      args: [userAddress as `0x${string}`]
    })

    const [startTs, lastHeartbeatTs, depositWei, targetMinutes, isActive, watchdogClosed] = session

    if (!isActive) {
      return NextResponse.json(
        { error: '没有活跃会话' },
        { status: 400 }
      )
    }

    // 计算中断费用
    const tokenAddress = tokenType === 'focus' ? FOCUS_ADDRESS : USDC_ADDRESS
    const breakFee = await publicClient.readContract({
      address: FOCUSBOND_ADDRESS,
      abi: FOCUSBOND_ABI,
      functionName: 'calculateBreakFee',
      args: [userAddress as `0x${string}`, tokenAddress]
    })

    // 计算时间相关信息
    const now = Math.floor(Date.now() / 1000)
    const elapsedMinutes = Math.floor((now - Number(startTs)) / 60)
    const endTime = Number(startTs) + Number(targetMinutes) * 60
    const timeLeft = Math.max(0, endTime - now)
    const completionPercentage = Math.min(100, (elapsedMinutes / Number(targetMinutes)) * 100)
    
    // 费用计算调试信息
    const feeStepMin = 10 // 从合约中获取，目前硬编码
    const feeMultiplier = 100 + (20 * Math.floor(elapsedMinutes / feeStepMin))
    
    console.log('Fee calculation debug:', {
      elapsedMinutes,
      feeStepMin,
      feeSteps: Math.floor(elapsedMinutes / feeStepMin),
      feeMultiplier,
      breakFee: breakFee.toString()
    })

    // 计算奖励（如果完成会话）
    // 这里假设完成会话可以获得质押金额的5%作为奖励
    const completionReward = (depositWei * BigInt(5)) / BigInt(100) // 5% 奖励

    return NextResponse.json({
      session: {
        startTs: Number(startTs),
        lastHeartbeatTs: Number(lastHeartbeatTs),
        depositWei: depositWei.toString(),
        targetMinutes: Number(targetMinutes),
        isActive,
        watchdogClosed
      },
      timing: {
        elapsedMinutes,
        timeLeft,
        completionPercentage: Math.round(completionPercentage * 100) / 100
      },
      fees: {
        breakFee: breakFee.toString(),
        tokenType,
        tokenAddress,
        decimals: tokenType === 'focus' ? 18 : 6
      },
      rewards: {
        completionReward: completionReward.toString(),
        canComplete: timeLeft <= 0
      }
    })

  } catch (error) {
    console.error('计算费用失败:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}

