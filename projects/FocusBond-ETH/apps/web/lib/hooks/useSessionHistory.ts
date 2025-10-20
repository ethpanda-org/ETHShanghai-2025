"use client"

import { useState, useEffect } from 'react'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { anvil } from '../chain'

const publicClient = createPublicClient({
  chain: anvil,
  transport: http(anvil.rpcUrls.default.http[0])
})

const FOCUSBOND_ADDRESS = (process.env.NEXT_PUBLIC_FOCUS_CONTRACT || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0') as `0x${string}`

export interface SessionHistoryItem {
  id: string
  type: 'started' | 'broken' | 'completed' | 'purchase'
  timestamp: number
  targetMinutes?: number
  depositWei?: string
  breakFee?: string
  completionReward?: string
  focusAmount?: string
  ethAmount?: string
  transactionHash: string
  blockNumber: bigint
}

export function useSessionHistory(userAddress?: `0x${string}`, refreshTrigger?: number) {
  const [history, setHistory] = useState<SessionHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [weeklyStats, setWeeklyStats] = useState<{ day: string; minutes: number }[]>([])

  useEffect(() => {
    if (!userAddress) return

    const fetchHistory = async () => {
      setLoading(true)
      try {
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock - BigInt(100000) // 最近10万个块

        // 获取 SessionStarted 事件
        const startedLogs = await publicClient.getLogs({
          address: FOCUSBOND_ADDRESS,
          event: parseAbiItem('event SessionStarted(address indexed user, uint16 targetMinutes, uint96 depositWei, uint64 timestamp)'),
          args: { user: userAddress },
          fromBlock,
          toBlock: currentBlock
        })

        // 获取 SessionBroken 事件
        const brokenLogs = await publicClient.getLogs({
          address: FOCUSBOND_ADDRESS,
          event: parseAbiItem('event SessionBroken(address indexed user, uint256 breakFee, uint256 timestamp)'),
          args: { user: userAddress },
          fromBlock,
          toBlock: currentBlock
        })

        // 获取 SessionCompleted 事件
        const completedLogs = await publicClient.getLogs({
          address: FOCUSBOND_ADDRESS,
          event: parseAbiItem('event SessionCompleted(address indexed user, uint256 completionReward, uint256 timestamp)'),
          args: { user: userAddress },
          fromBlock,
          toBlock: currentBlock
        })

        // 获取购买事件 - 使用ConfigUpdated事件来识别购买
        const allConfigLogs = await publicClient.getLogs({
          address: FOCUSBOND_ADDRESS,
          event: parseAbiItem('event ConfigUpdated(string indexed key, uint256 value)'),
          fromBlock,
          toBlock: currentBlock
        })
        
        // 过滤出购买相关的事件，并获取交易详情来确定购买者
        const purchaseLogs = []
        for (const log of allConfigLogs) {
          try {
            const decoded = decodeEventLog({
              abi: [parseAbiItem('event ConfigUpdated(string indexed key, uint256 value)')],
              data: log.data,
              topics: log.topics
            })
            
            if (decoded.args.key === 'focusPurchase') {
              // 获取交易详情来确定购买者
              const tx = await publicClient.getTransaction({ hash: log.transactionHash })
              if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
                const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
                purchaseLogs.push({
                  ...log,
                  args: {
                    focusAmount: decoded.args.value,
                    timestamp: Number(block.timestamp)
                  },
                  from: tx.from,
                  value: tx.value
                })
              }
            }
          } catch (error) {
            console.warn('Failed to decode ConfigUpdated event:', error)
          }
        }

        // 合并所有事件
        const allEvents: SessionHistoryItem[] = [
          ...startedLogs.map(log => ({
            id: log.transactionHash,
            type: 'started' as const,
            timestamp: Number(log.args.timestamp || 0),
            targetMinutes: Number(log.args.targetMinutes || 0),
            depositWei: log.args.depositWei?.toString() || '0',
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber
          })),
          ...brokenLogs.map(log => ({
            id: log.transactionHash,
            type: 'broken' as const,
            timestamp: Number(log.args.timestamp || 0),
            breakFee: log.args.breakFee?.toString() || '0',
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber
          })),
          ...completedLogs.map(log => ({
            id: log.transactionHash,
            type: 'completed' as const,
            timestamp: Number(log.args.timestamp || 0),
            completionReward: log.args.completionReward?.toString() || '0',
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber
          })),
          ...purchaseLogs.map(log => ({
            id: log.transactionHash,
            type: 'purchase' as const,
            timestamp: Number(log.args.timestamp || 0),
            focusAmount: log.args.focusAmount?.toString() || '0',
            ethAmount: log.value?.toString() || '0',
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber
          }))
        ]

        // 按时间排序（最新的在前）
        allEvents.sort((a, b) => b.timestamp - a.timestamp)
        
        // 调试信息
        if (typeof window !== 'undefined') {
          console.log('📜 Session History Fetched:', {
            total: allEvents.length,
            started: startedLogs.length,
            broken: brokenLogs.length,
            completed: completedLogs.length,
            purchases: purchaseLogs.length,
            events: allEvents.slice(0, 5) // 显示前5个事件
          })
        }
        
        setHistory(allEvents)

        // 计算近一周统计
        calculateWeeklyStats(allEvents)
      } catch (error) {
        console.error('获取历史失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [userAddress, refreshTrigger])

  const calculateWeeklyStats = (events: SessionHistoryItem[]) => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    
    // 过滤最近7天的完成/中断事件
    const recentEvents = events.filter(e => 
      e.timestamp * 1000 >= weekAgo && 
      (e.type === 'completed' || e.type === 'broken')
    )
    
    // 按天分组
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const stats: { day: string; minutes: number }[] = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime() / 1000
      const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime() / 1000
      
      // 找到这一天的所有事件
      const dayEvents = recentEvents.filter(e => 
        e.timestamp >= dayStart && e.timestamp <= dayEnd
      )
      
      // 计算总分钟数（从started事件中获取）
      let totalMinutes = 0
      for (const event of dayEvents) {
        // 找到对应的started事件
        const startedEvent = events.find(e => 
          e.type === 'started' && 
          e.timestamp <= event.timestamp &&
          e.timestamp >= event.timestamp - 10000 // 在完成/中断前10000秒内开始
        )
        if (startedEvent && startedEvent.targetMinutes) {
          totalMinutes += startedEvent.targetMinutes
        }
      }
      
      const dayOfWeek = date.getDay()
      stats.push({
        day: dayNames[dayOfWeek],
        minutes: totalMinutes
      })
    }
    
    setWeeklyStats(stats)
  }

  // 手动刷新函数
  const refetch = () => {
    if (address) {
      fetchEvents()
    }
  }

  // 立即在本地追加一条"开始会话"的历史记录，用于优化 UX
  const addLocalStarted = (params: { targetMinutes: number; depositWei?: string; transactionHash?: string }) => {
    const nowTs = Math.floor(Date.now() / 1000)
    const localItem: SessionHistoryItem = {
      id: `local-started-${nowTs}`,
      type: 'started',
      timestamp: nowTs,
      targetMinutes: params.targetMinutes,
      depositWei: params.depositWei || '0',
      transactionHash: params.transactionHash || 'pending',
      blockNumber: 0n
    }
    setHistory(prev => [localItem, ...prev])
  }

  return { history, loading, weeklyStats, refetch, addLocalStarted }
}

