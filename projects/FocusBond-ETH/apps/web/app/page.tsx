'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { formatEther, formatUnits, parseEther } from 'viem'
import DynamicBackground from '../components/DynamicBackground'
import SettingsMenu from '../components/SettingsMenu'
import { useTokenBalance } from '../lib/hooks/useTokenBalance'
import { useStartSession } from '../lib/hooks/useStartSession'
import { useBreakSession } from '../lib/hooks/useBreakSession'
import { useCompleteSession } from '../lib/hooks/useCompleteSession'
import { useHeartbeat } from '../lib/hooks/useHeartbeat'
import { useSessionHistory } from '../lib/hooks/useSessionHistory'
import { useBuyFocus } from '../lib/hooks/useBuyFocus'
import { CONTRACTS, FOCUSBOND_ABI, anvil } from '../lib/chain'

type TabType = 'focus' | 'alerts' | 'leaderboard' | 'market' | 'profile'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('focus')
  const [isFocusing, setIsFocusing] = useState(false)
  const [focusTime, setFocusTime] = useState(25) // minutes
  const [customFocusTime, setCustomFocusTime] = useState('')
  const [timeLeft, setTimeLeft] = useState(focusTime * 60)
  const [stakeAmount, setStakeAmount] = useState('0.0001') // ETH质押数量，降低门槛
  const [earnedTokens, setEarnedTokens] = useState(45)
  const [activeAlerts, setActiveAlerts] = useState<any[]>([])
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [currentAlert, setCurrentAlert] = useState<any>(null)
  
  // 地址监控相关状态
  const [monitoredAddresses, setMonitoredAddresses] = useState<string[]>([])
  const [newAddress, setNewAddress] = useState('')
  const [addressTransactions, setAddressTransactions] = useState<any[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  
  // 排行榜状态
  const [leaderboardData, setLeaderboardData] = useState<any[]>([])
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'7d' | '30d'>('7d')
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const [currentBackground, setCurrentBackground] = useState<{
    type: 'image' | 'gradient' | 'pattern'
    imageUrl?: string
    animation: 'floating' | 'pulse' | 'glow' | 'slide' | 'zoom' | 'rotate' | 'none'
    speed: 'slow' | 'medium' | 'fast'
    overlay: boolean
  }>({
    type: 'gradient',
    animation: 'pulse',
    speed: 'slow',
    overlay: true
  })

  // 从本地存储加载背景配置和主题
  useEffect(() => {
    const savedBackground = localStorage.getItem('currentBackground')
    if (savedBackground) {
      setCurrentBackground(JSON.parse(savedBackground))
    }
    
    // 应用保存的主题
    const savedTheme = localStorage.getItem('currentTheme')
    if (savedTheme) {
      const theme = JSON.parse(savedTheme)
      const root = document.documentElement
      root.style.setProperty('--color-primary', theme.colors.primary)
      root.style.setProperty('--color-secondary', theme.colors.secondary)
      root.style.setProperty('--color-accent', theme.colors.accent)
      root.style.setProperty('--color-background', theme.colors.background)
      root.style.setProperty('--color-card', theme.colors.card)
      root.style.setProperty('--color-text', theme.colors.text)
      root.style.setProperty('--color-text-secondary', theme.colors.textSecondary)
      root.style.setProperty('--color-border', theme.colors.border)
      root.style.setProperty('--color-success', theme.colors.success)
      root.style.setProperty('--color-warning', theme.colors.warning)
      root.style.setProperty('--color-error', theme.colors.error)
    }
  }, [])
  
  // 根据链上历史记录计算真实的统计数据
  const calculateStatsFromHistory = (history: any[], weeklyStats: any[]) => {
    if (!history || history.length === 0) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        totalMinutes: 0,
        successRate: 0,
        weeklyMinutes: 0,
        todayTotalMinutes: 0
      }
    }

    // 计算总数据
    const startedSessions = history.filter(h => h.type === 'started').length
    const completedSessions = history.filter(h => h.type === 'completed').length
    const brokenSessions = history.filter(h => h.type === 'broken').length
    const totalSessions = startedSessions
    const successRate = startedSessions > 0 ? completedSessions / startedSessions : 0
    
    // 计算总分钟数（基于历史记录中的目标时长）
    const totalMinutes = history
      .filter(h => h.type === 'started' && h.targetMinutes)
      .reduce((sum, session) => sum + session.targetMinutes, 0)
    
    // 计算近一周专注时间
    const weeklyMinutes = weeklyStats.reduce((sum, day) => sum + day.minutes, 0) || 0
    
    // 计算今日专注时间（基于当前日期）
    const today = new Date().toDateString()
    const todayMinutes = history
      .filter(h => {
        const sessionDate = new Date(h.timestamp * 1000).toDateString()
        return sessionDate === today && h.type === 'completed'
      })
      .reduce((sum, session) => sum + (session.targetMinutes || 0), 0)

    return {
      totalSessions: Math.max(totalSessions, 0),
      completedSessions: Math.max(completedSessions, 0),
      totalMinutes: Math.max(totalMinutes, 0),
      successRate: Math.max(successRate, 0),
      weeklyMinutes: Math.max(weeklyMinutes, 0),
      todayTotalMinutes: Math.max(todayMinutes, 0)
    }
  }

  // 用户数据 - 基于链上数据初始化
  const [userStats, setUserStats] = useState({
    todayTotalMinutes: 0,
    reputation: 0.95, // 信誉系数 0-1
    deviceFactor: 1.0, // 设备系数
    totalSessions: 0,
    successRate: 0.9
  })
  
  // 根据FOCUS积分计算近一周专注数据
  const generateWeeklyFocusData = (weeklyMinutes: number) => {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const baseMinutes = Math.floor(weeklyMinutes / 7)
    const variation = Math.floor(baseMinutes * 0.3) // 30%的波动
    
    return days.map(day => ({
      day,
      minutes: Math.max(0, baseMinutes + Math.floor(Math.random() * variation * 2 - variation))
    }))
  }

  // 计算奖励公式: R = r0 * minutes * k_device * k_rep * k_progress
  const calculateReward = (minutes: number) => {
    const r0 = 1 // 基础奖励率
    const k_device = userStats.deviceFactor
    const k_rep = userStats.reputation
    
    // 进度系数: 超过200分钟/日递减
    let k_progress = 1.0
    if (userStats.todayTotalMinutes + minutes > 200) {
      const excessMinutes = userStats.todayTotalMinutes + minutes - 200
      k_progress = Math.max(0.5, 1 - (excessMinutes / 100)) // 最低0.5
    }
    
    return Math.floor(r0 * minutes * k_device * k_rep * k_progress)
  }

  // 计算中断费用公式: F = f0 * (1 + 0.2 * floor(minutes/10))
  const calculateBreakFee = (elapsedMinutes: number) => {
    const f0 = 10 // 基础中断费用 - 从5调整为10 FOCUS
    const progressBlocks = Math.floor(elapsedMinutes / 10)
    return f0 * (1 + 0.2 * progressBlocks)
  }

  // 处理自定义时间输入
  const handleCustomTimeChange = (value: string) => {
    setCustomFocusTime(value)
    const minutes = parseInt(value)
    if (!isNaN(minutes) && minutes >= 5 && minutes <= 180) {
      setFocusTime(minutes)
      setTimeLeft(minutes * 60) // 同时更新倒计时
    }
  }

  // 地址监控功能
  const addMonitoredAddress = () => {
    if (newAddress && newAddress.length === 42 && newAddress.startsWith('0x')) {
      if (!monitoredAddresses.includes(newAddress)) {
        setMonitoredAddresses(prev => [...prev, newAddress])
        setNewAddress('')
        // 添加成功提示
        setActiveAlerts(prev => [...prev, {
          id: Date.now(),
          title: '地址监控',
          description: `已添加监控地址: ${newAddress.slice(0, 6)}...${newAddress.slice(-4)}`,
          timestamp: new Date(),
          type: 'success'
        }])
      }
    }
  }

  const removeMonitoredAddress = (address: string) => {
    setMonitoredAddresses(prev => prev.filter(addr => addr !== address))
  }

  // 模拟获取地址交易记录
  const fetchAddressTransactions = async (address: string) => {
    try {
      // 这里应该调用实际的API获取交易记录
      // 现在使用模拟数据
      const mockTransactions = [
        {
          hash: '0x' + Math.random().toString(16).substr(2, 64),
          from: address,
          to: '0x' + Math.random().toString(16).substr(2, 40),
          value: (Math.random() * 10).toFixed(4),
          timestamp: Date.now() - Math.random() * 86400000,
          type: Math.random() > 0.5 ? 'incoming' : 'outgoing'
        }
      ]
      return mockTransactions
    } catch (error) {
      console.error('获取交易记录失败:', error)
      return []
    }
  }

  // 监控地址交易变化
  const monitorAddresses = async () => {
    if (monitoredAddresses.length === 0) return
    
    for (const address of monitoredAddresses) {
      try {
        const transactions = await fetchAddressTransactions(address)
        const newTransactions = transactions.filter(tx => 
          !addressTransactions.some(existing => existing.hash === tx.hash)
        )
        
        if (newTransactions.length > 0) {
          setAddressTransactions(prev => [...prev, ...newTransactions])
          
          // 生成警报
          newTransactions.forEach(tx => {
            setActiveAlerts(prev => [...prev, {
              id: Date.now() + Math.random(),
              title: '地址活动',
              description: `监控地址 ${address.slice(0, 6)}...${address.slice(-4)} 发生交易`,
              timestamp: new Date(),
              type: 'transaction',
              transactionHash: tx.hash,
              value: tx.value
            }])
          })
        }
      } catch (error) {
        console.error(`监控地址 ${address} 失败:`, error)
      }
    }
  }

  // 获取排行榜数据
  const fetchLeaderboardData = async (period: '7d' | '30d') => {
    setIsLoadingLeaderboard(true)
    try {
      // 模拟获取排行榜数据
      // 在实际应用中，这里应该调用API获取真实的排行榜数据
      const currentFocusBalance = focusBalance && focusDecimals ? parseFloat(formatUnits(focusBalance, focusDecimals)) : 0
      
      // 前十名专注达人数据 - 调整FOCUS分数使其更合理
      const topTenUsers = [
        {
          rank: 1,
          address: '0xA1B2C3D4E5F6789012345678901234567890ABCD',
          focusBalance: 1200.5,
          totalSessions: 48,
          completedSessions: 42,
          successRate: 87.5,
          weeklyFocus: 360,
          avatar: '🏆',
          nickname: 'FocusMaster',
          isCurrentUser: false
        },
        {
          rank: 2,
          address: '0xB2C3D4E5F6789012345678901234567890ABCDE',
          focusBalance: 1100.2,
          totalSessions: 44,
          completedSessions: 38,
          successRate: 86.4,
          weeklyFocus: 330,
          avatar: '🚀',
          nickname: 'TimeWarrior',
          isCurrentUser: false
        },
        {
          rank: 3,
          address: '0xC3D4E5F6789012345678901234567890ABCDEF0',
          focusBalance: 1000.8,
          totalSessions: 40,
          completedSessions: 35,
          successRate: 87.5,
          weeklyFocus: 300,
          avatar: '⚡',
          nickname: 'FlowState',
          isCurrentUser: false
        },
        {
          rank: 4,
          address: '0xD4E5F6789012345678901234567890ABCDEF01',
          focusBalance: 900.3,
          totalSessions: 36,
          completedSessions: 30,
          successRate: 83.3,
          weeklyFocus: 270,
          avatar: '🎯',
          nickname: 'DeepFocus',
          isCurrentUser: false
        },
        {
          rank: 5,
          address: '0xE5F6789012345678901234567890ABCDEF012',
          focusBalance: 800.7,
          totalSessions: 32,
          completedSessions: 27,
          successRate: 84.4,
          weeklyFocus: 240,
          avatar: '💎',
          nickname: 'ZenMaster',
          isCurrentUser: false
        },
        {
          rank: 6,
          address: '0xF6789012345678901234567890ABCDEF0123',
          focusBalance: 700.4,
          totalSessions: 28,
          completedSessions: 23,
          successRate: 82.1,
          weeklyFocus: 210,
          avatar: '🔥',
          nickname: 'Concentrator',
          isCurrentUser: false
        },
        {
          rank: 7,
          address: '0x6789012345678901234567890ABCDEF01234',
          focusBalance: 600.9,
          totalSessions: 24,
          completedSessions: 20,
          successRate: 83.3,
          weeklyFocus: 180,
          avatar: '⭐',
          nickname: 'MindfulOne',
          isCurrentUser: false
        },
        {
          rank: 8,
          address: '0x789012345678901234567890ABCDEF012345',
          focusBalance: 500.6,
          totalSessions: 20,
          completedSessions: 17,
          successRate: 85.0,
          weeklyFocus: 150,
          avatar: '🌟',
          nickname: 'FocusNinja',
          isCurrentUser: false
        },
        {
          rank: 9,
          address: '0x89012345678901234567890ABCDEF0123456',
          focusBalance: 400.1,
          totalSessions: 16,
          completedSessions: 13,
          successRate: 81.3,
          weeklyFocus: 120,
          avatar: '💫',
          nickname: 'TaskMaster',
          isCurrentUser: false
        },
        {
          rank: 10,
          address: '0x9012345678901234567890ABCDEF01234567',
          focusBalance: 300.8,
          totalSessions: 12,
          completedSessions: 10,
          successRate: 83.3,
          weeklyFocus: 90,
          avatar: '✨',
          nickname: 'StudyGuru',
          isCurrentUser: false
        }
      ]

      // 如果用户有FOCUS余额，将用户设置为第一名
      let mockData = [...topTenUsers]
      
      if (currentFocusBalance > 0 && address) {
        // 创建用户数据 - 设置为第一名
        const userData = {
          rank: 1,
          address: address,
          focusBalance: currentFocusBalance,
          totalSessions: Math.floor(currentFocusBalance / 2.5) || 1,
          completedSessions: Math.floor((currentFocusBalance / 2.5) * 0.85) || 1,
          successRate: 85 + Math.random() * 10,
          weeklyFocus: Math.floor(currentFocusBalance * 0.3) || Math.floor(currentFocusBalance),
          avatar: '👑',
          nickname: 'You',
          isCurrentUser: true
        }
        
        // 将用户数据插入到第一位
        mockData.unshift(userData)
        
        // 调整其他用户的FOCUS分数，使其低于用户
        mockData.forEach((user, index) => {
          if (!user.isCurrentUser) {
            // 确保其他用户的分数都低于当前用户
            const maxOtherScore = Math.max(0, currentFocusBalance - 100 - (index * 50))
            user.focusBalance = Math.max(100, maxOtherScore)
            user.weeklyFocus = Math.floor(user.focusBalance * 0.3)
            user.totalSessions = Math.floor(user.focusBalance / 2.5)
            user.completedSessions = Math.floor((user.focusBalance / 2.5) * 0.8)
            user.successRate = 75 + Math.random() * 15
            user.isCurrentUser = false
          }
          user.rank = index + 1
        })
        
        // 保持只有10个用户
        mockData = mockData.slice(0, 10)
      }

      // 根据时间段过滤数据
      const filteredData = period === '7d' 
        ? mockData.map(user => ({ ...user, focusBalance: user.weeklyFocus }))
        : mockData

      setLeaderboardData(filteredData)
    } catch (error) {
      console.error('获取排行榜数据失败:', error)
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }
  
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  // 历史刷新触发器
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)
  
    // 链上数据读取 - 添加refetchInterval确保余额实时更新
    const { data: ethBalance, refetch: refetchEthBalance } = useBalance({ 
      address: address as `0x${string}`,
      query: { 
        enabled: !!address,
        refetchInterval: 60000 // 每1分钟刷新一次
      }
    })
    const { focusBalance, usdcBalance, focusDecimals, usdcDecimals, refetch: refetchTokenBalances } = useTokenBalance(address as `0x${string}`)
    const { history: sessionHistory, weeklyStats, loading: historyLoading, refetch: refetchHistory, addLocalStarted } = useSessionHistory(address as `0x${string}`, historyRefreshTrigger)
  
  // 获取统计数据 - 使用链上历史记录
  const stats = calculateStatsFromHistory(sessionHistory, weeklyStats)

  // 覆盖近一周专注时间：周一300分钟，其他天按真实数据
  const overriddenWeeklyStats = (() => {
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const todayIdx = new Date().getDay()
    const days: { day: string; minutes: number }[] = []
    
    for (let i = 6; i >= 0; i--) {
      const idx = (todayIdx - i + 7) % 7
      const dayName = dayNames[idx]
      
      // 周一固定300分钟，其他天使用真实数据
      if (dayName === '周一') {
        days.push({ day: dayName, minutes: 300 })
      } else {
        // 使用真实数据，如果没有则显示0
        const realData = weeklyStats.find(w => w.day === dayName)
        days.push({ day: dayName, minutes: realData ? realData.minutes : 0 })
      }
    }
    return days
  })()
  
  // 生成近一周专注数据 - 将在使用处定义
  
  // 链上交易hooks
  const { startSession, loading: startLoading, error: startError, transactionHash: startHash } = useStartSession()
  const { breakSession, loading: breakLoading, error: breakError, transactionHash: breakHash } = useBreakSession()
  const { completeSession, loading: completeLoading, error: completeError, transactionHash: completeHash } = useCompleteSession()
  const { sendHeartbeat, loading: heartbeatLoading } = useHeartbeat()
  const { buyFocus, loading: buyLoading, success: buySuccess, error: buyError, transactionHash: buyHash } = useBuyFocus()

  // 读取链上会话状态
  const { data: sessionData, refetch: refetchSession } = useReadContract({
    address: CONTRACTS[anvil.id].focusBond,
    abi: FOCUSBOND_ABI,
    functionName: 'sessions',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 1000, // 每秒刷新
      staleTime: 500
    }
  })

  // 等待交易确认
  const { isSuccess: startSuccess } = useWaitForTransactionReceipt({ hash: startHash as `0x${string}` })
  const { isSuccess: breakSuccess } = useWaitForTransactionReceipt({ hash: breakHash as `0x${string}` })
  const { isSuccess: completeSuccess } = useWaitForTransactionReceipt({ hash: completeHash as `0x${string}` })

  // 费用计算状态
  const [feeCalculation, setFeeCalculation] = useState<any>(null)

  // 获取费用计算
  const fetchFeeCalculation = async () => {
    if (!address) return
    
    try {
      const response = await fetch(`/api/session/calculate-fee?userAddress=${address}&tokenType=focus`)
      if (response.ok) {
        const data = await response.json()
        setFeeCalculation(data)
      }
    } catch (error) {
      console.error('获取费用计算失败:', error)
    }
  }

  // 从链上恢复会话状态（刷新页面后恢复）
  useEffect(() => {
    if (!sessionData || !address) return
    
    const [startTs, lastHeartbeatTs, depositWei, targetMinutes, isActive, watchdogClosed] = sessionData
    
    if (isActive && startTs > 0) {
      console.log('🔄 检测到活跃会话，恢复状态...', {
        startTs: Number(startTs),
        targetMinutes: Number(targetMinutes),
        isActive
      })
      
      // 恢复专注状态
      setIsFocusing(true)
      setFocusTime(Number(targetMinutes))
      
      // 计算剩余时间
      const now = Math.floor(Date.now() / 1000)
      const elapsed = now - Number(startTs)
      const totalSeconds = Number(targetMinutes) * 60
      const remaining = Math.max(0, totalSeconds - elapsed)
      
      setTimeLeft(remaining)
      
      console.log('✅ 会话状态已恢复:', {
        focusTime: Number(targetMinutes),
        timeLeft: remaining,
        elapsed: Math.floor(elapsed / 60) + '分钟'
      })
    } else if (!isActive && isFocusing) {
      // 如果链上显示没有活跃会话，但UI显示正在专注，则重置UI
      console.log('⚠️ 链上无活跃会话，重置UI状态')
      setIsFocusing(false)
      setTimeLeft(0)
    }
  }, [sessionData, address])

  // 定期更新费用计算（会话进行中）
  useEffect(() => {
    if (sessionData && sessionData[4] && address) { // isActive at index 4
      fetchFeeCalculation()
      const interval = setInterval(fetchFeeCalculation, 5000)
      return () => clearInterval(interval)
    }
  }, [address, sessionData])

  // 心跳逻辑 - 暂时禁用以避免错误
  // useEffect(() => {
  //   if (!isFocusing || !address) return
    
  //   const heartbeatInterval = setInterval(async () => {
  //     try {
  //       await sendHeartbeat()
  //       console.log('💓 心跳发送成功')
  //     } catch (error) {
  //       console.error('心跳发送失败:', error)
  //     }
  //   }, 30000) // 30秒
    
  //   return () => clearInterval(heartbeatInterval)
  // }, [isFocusing, address, sendHeartbeat])

  // 地址监控定时器
  useEffect(() => {
    if (monitoredAddresses.length === 0) return
    
    const monitoringInterval = setInterval(() => {
      monitorAddresses()
    }, 10000) // 每10秒检查一次
    
    return () => clearInterval(monitoringInterval)
  }, [monitoredAddresses, addressTransactions])


  // 监听交易成功，刷新数据和历史
  useEffect(() => {
      if (startSuccess || breakSuccess || completeSuccess || buySuccess) {
        console.log('🔄 交易成功，刷新数据...')
        refetchSession()

        // 立即刷新余额
        if (refetchTokenBalances) {
          refetchTokenBalances()
          console.log('💰 FOCUS余额已刷新')
        }
        if (refetchEthBalance) {
          refetchEthBalance()
          console.log('💰 ETH余额已刷新')
        }

        // 刷新历史记录
        setTimeout(() => {
          setHistoryRefreshTrigger(prev => prev + 1)
          if (refetchHistory) {
            refetchHistory()
          }
          console.log('📜 历史记录已刷新')
        }, 2000) // 等待2秒让事件被区块链记录
      }
    }, [startSuccess, breakSuccess, completeSuccess, buySuccess, refetchSession, refetchTokenBalances, refetchEthBalance, refetchHistory])

  // 加载排行榜数据
  useEffect(() => {
    if (address) {
      fetchLeaderboardData(leaderboardPeriod)
    }
  }, [address, leaderboardPeriod, focusBalance, focusDecimals])

  // 真正的链上会话创建
  const startFocusSession = async () => {
    if (!address || !isConnected) {
      alert('请先连接钱包')
      return
    }

    // 验证质押金额（最低0.0001 ETH）
    const stakeValue = parseFloat(stakeAmount)
    if (!stakeValue || stakeValue < 0.0001) {
      alert('质押金额不能低于0.0001 ETH')
      return
    }

    try {
      // 调用链上合约创建会话，使用用户设置的质押金额
      const depositWei = parseEther(stakeAmount)
      const txHash = await startSession(focusTime, depositWei)

      // 立即在本地历史中添加"开始会话"记录，保证专注历史即时可见
      addLocalStarted({ 
        targetMinutes: focusTime, 
        depositWei: depositWei.toString(),
        transactionHash: txHash || 'pending'
      })
      
      // 交易成功后开始UI倒计时
    setIsFocusing(true)
    setTimeLeft(focusTime * 60)
      
      // 开始计时器（UI倒计时）
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
            // 倒计时结束，自动完成会话
            handleCompleteSession()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    } catch (error) {
      console.error('创建会话失败:', error)
      alert('创建会话失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 链上中断会话
  const breakFocusSession = async () => {
    if (!address || !isConnected) {
      return
    }

    try {
      // 计算并获取费用
    const elapsedMinutes = focusTime - Math.ceil(timeLeft / 60)
    const breakFee = calculateBreakFee(elapsedMinutes)
      
      // 调用链上合约中断会话
      // 使用更合理的费用限制，避免过高的gas费用
      const maxFee = feeCalculation?.fees?.breakFee 
        ? BigInt(feeCalculation.fees.breakFee) * BigInt(120) / BigInt(100) // +20% 滑点保护，但限制在合理范围内
        : BigInt('10000000000000000000') // 10 tokens默认限制
      
      await breakSession(maxFee)
      
      // 交易成功后更新UI
    setEarnedTokens(prev => Math.max(0, prev - breakFee))
    setIsFocusing(false)
    setUserStats(prev => ({
      ...prev,
        reputation: Math.max(0.5, prev.reputation - 0.05)
      }))
      
      console.log('✅ 会话已中断，惩罚费用已支付')
    } catch (error) {
      console.error('中断会话失败:', error)
      alert('中断会话失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 链上完成会话
  const handleCompleteSession = async () => {
    if (!address || !isConnected) {
      return
    }

    try {
      console.log('🎉 准备完成会话...')
      
      // 调用链上合约完成会话
      await completeSession()
      
      // 交易成功后更新UI
      const reward = calculateReward(focusTime)
      setEarnedTokens(prev => prev + reward)
      setIsFocusing(false)
      setUserStats(prev => ({
        ...prev,
        todayTotalMinutes: prev.todayTotalMinutes + focusTime,
        totalSessions: prev.totalSessions + 1,
        reputation: Math.min(1.0, prev.reputation + 0.01)
      }))
      
      console.log('✅ 会话已完成，奖励已发放')
    } catch (error) {
      console.error('完成会话失败:', error)
      alert('完成会话失败: ' + (error instanceof Error ? error.message : '未知错误'))
      // 失败时仍然结束 UI 倒计时
      setIsFocusing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const calculateProgress = () => {
    return ((focusTime * 60 - timeLeft) / (focusTime * 60)) * 100
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4 bg-dots">
        <div className="card card-glow max-w-md w-full text-center slide-in">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full gradient-primary flex items-center justify-center floating">
              <span className="text-3xl">🎯</span>
            </div>
            <h1 className="text-4xl font-bold text-gradient mb-3">FocusForce</h1>
            <p className="text-text-secondary text-lg">通过代币激励实现深度专注</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => connect({ connector: metaMask() })}
              className="btn-primary w-full py-4 text-lg glow"
            >
              🔗 连接 MetaMask 钱包
            </button>
            
            <div className="text-sm text-text-muted">
              <p>连接钱包开始您的专注之旅</p>
            </div>
          </div>

          <div className="mt-8 p-6 rounded-2xl glass">
            <h3 className="font-semibold text-white mb-3 text-lg">✨ 应用特色</h3>
            <ul className="text-text-secondary space-y-2">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-accent-primary rounded-full mr-3"></span>
                设定专注时间，锁定干扰应用
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-accent-success rounded-full mr-3"></span>
                完成专注获得代币奖励
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-accent-warning rounded-full mr-3"></span>
                中断专注需要支付代币
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-accent-primary rounded-full mr-3"></span>
                实时链上信号监控
              </li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 relative">
      {/* 动态背景系统 - 现在通过 body 应用，只影响周围区域 */}
      <DynamicBackground backgroundConfig={currentBackground} />
      {/* 顶部状态栏 */}
      <header className="p-4 border-b border-[#0f3460]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">FocusForce</h1>
            <p className="text-sm text-[#e0e0e0]">深度专注，高效工作</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm text-[#e0e0e0]">代币余额</p>
              <p className="font-semibold text-white">
                {focusBalance && focusDecimals ? parseFloat(formatUnits(focusBalance, focusDecimals)).toFixed(2) : '0'} FOCUS
              </p>
              {ethBalance && (
                <p className="text-xs text-[#a0a0a0]">
                  {parseFloat(formatEther(ethBalance.value)).toFixed(4)} ETH
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a8ff] to-[#0097e6] flex items-center justify-center text-white font-semibold">
                {address?.slice(2, 4).toUpperCase()}
              </div>
              <button
                ref={settingsButtonRef}
                onClick={() => setShowSettingsMenu(true)}
                className="w-10 h-10 rounded-full bg-background-card border border-border-glow flex items-center justify-center text-white hover:bg-accent-primary transition-colors"
                title="设置"
              >
                ⚙️
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="p-4 max-w-md mx-auto">
        {activeTab === 'focus' && (
          <div className="space-y-6">
            {!isFocusing ? (
              // 开始专注界面
              <div className="bg-[#0f3460] rounded-2xl p-6 text-center shadow-2xl border border-[#16213e]">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#00a8ff] to-[#0097e6] flex items-center justify-center">
                  <span className="text-3xl">⏰</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">开始专注</h2>
                <p className="text-[#e0e0e0] mb-6">选择专注时长，锁定干扰应用</p>
                
                <div className="mb-6">
                  <label className="block text-[#e0e0e0] text-sm mb-3">专注时长</label>
                  <div className="flex justify-center space-x-4 mb-4">
                    {[15, 25, 45, 60].map((minutes) => (
                      <button
                        key={minutes}
                        onClick={() => {
                          setFocusTime(minutes)
                          setTimeLeft(minutes * 60)
                          setCustomFocusTime('') // 清空自定义输入
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          focusTime === minutes && !customFocusTime
                            ? 'border-[#00a8ff] bg-[#00a8ff] text-white'
                            : 'border-[#0f3460] text-[#e0e0e0] hover:border-[#00a8ff]'
                        }`}
                      >
                        {minutes}分钟
                      </button>
                    ))}
                  </div>
                  
                  {/* 自定义时间输入 */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-[#a0a0a0]">或输入自定义时间</div>
                      <div className="text-sm text-[#00a8ff] font-semibold">
                        当前选择: {focusTime}分钟
                      </div>
                    </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="5"
                      max="180"
                        placeholder="输入分钟数 (5-180)"
                      value={customFocusTime}
                      onChange={(e) => handleCustomTimeChange(e.target.value)}
                        className={`flex-1 px-4 py-2 rounded-lg border-2 bg-[#16213e] text-[#e0e0e0] placeholder-[#a0a0a0] focus:outline-none transition-all ${
                          customFocusTime && parseInt(customFocusTime) >= 5 && parseInt(customFocusTime) <= 180
                            ? 'border-[#00a8ff] bg-[#00a8ff]/10'
                            : 'border-[#0f3460] hover:border-[#00a8ff]'
                        }`}
                    />
                    <span className="text-[#e0e0e0]">分钟</span>
                    </div>
                    {customFocusTime && (parseInt(customFocusTime) < 5 || parseInt(customFocusTime) > 180) && (
                      <div className="text-xs text-[#ff4757] mt-1">请输入5-180之间的数字</div>
                    )}
                  </div>
                  
                  {/* 质押ETH设置 - 整合到专注界面 */}
                  <div className="mt-4 mb-4">
                    <label className="block text-[#e0e0e0] text-sm mb-2">💰 质押ETH数量</label>
                    <p className="text-xs text-[#a0a0a0] mb-2">质押越多，完成后奖励越高（最低0.0001 ETH）</p>
                    
                    {/* 预设质押金额 */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {['0.0001', '0.0005', '0.001', '0.0015'].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setStakeAmount(amount)}
                          className={`px-2 py-2 text-xs rounded-lg border-2 transition-all ${
                            stakeAmount === amount
                              ? 'border-[#00a8ff] bg-[#00a8ff] text-white'
                              : 'border-[#0f3460] text-[#e0e0e0] hover:border-[#00a8ff]'
                          }`}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                    
                    {/* 自定义质押金额 */}
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="number"
                        min="0.0001"
                        max="10"
                        step="0.0001"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-[#0f3460] bg-[#16213e] text-[#e0e0e0] placeholder-[#a0a0a0] focus:outline-none focus:border-[#00a8ff] transition-all"
                        placeholder="自定义金额"
                      />
                      <span className="text-[#e0e0e0] font-semibold">ETH</span>
                    </div>
                    </div>

                  {/* 奖励预览 - 整合质押奖励 */}
                  <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-[#16213e] to-[#0f3460] border-2 border-[#00a8ff]/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* 预计奖励 */}
                      <div className="text-center">
                        <div className="text-[#a0a0a0] text-xs mb-1">预计奖励</div>
                        <div className="text-[#00b894] font-bold text-lg">
                          {(() => {
                            const baseReward = focusTime * 0.1
                            const stakeValue = parseFloat(stakeAmount || '0')
                            const stakeBonus = stakeValue * 10000
                            const multiplier = 1 + (stakeValue * 200)
                            return (baseReward * multiplier + stakeBonus).toFixed(0)
                          })()} FOCUS
                  </div>
                </div>

                      {/* 信誉系数 */}
                      <div className="text-center">
                        <div className="text-[#a0a0a0] text-xs mb-1">信誉系数</div>
                        <div className="text-white font-bold text-lg">
                          {Math.min(100, Math.max(50, 100 - (parseFloat(stakeAmount || '0') * 1000))).toFixed(0)}%
                    </div>
                    </div>
                      
                      {/* 今日累计 */}
                      <div className="text-center">
                        <div className="text-[#a0a0a0] text-xs mb-1">今日累计</div>
                        <div className="text-white font-bold text-lg">
                          300 分钟
                    </div>
                    </div>
                  </div>
                    
                    {/* 详细奖励分解 */}
                    <div className="pt-4 border-t border-[#00a8ff]/30">
                      <div className="text-xs text-[#a0a0a0] space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span>• 基础奖励（{focusTime}分钟）:</span>
                          <span className="text-white font-semibold">{(focusTime * 0.1).toFixed(1)} FOCUS</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>• 质押倍数加成:</span>
                          <span className="text-[#00a8ff] font-semibold">×{(1 + parseFloat(stakeAmount || '0') * 200).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>• 质押额外奖励:</span>
                          <span className="text-[#00b894] font-semibold">+{(parseFloat(stakeAmount || '0') * 10000).toFixed(2)} FOCUS</span>
                        </div>
                        <div className="h-px bg-[#00a8ff]/30 my-1"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold">= 总预期奖励:</span>
                          <span className="text-[#00b894] font-bold text-base">
                            {(() => {
                              const baseReward = focusTime * 0.1
                              const stakeValue = parseFloat(stakeAmount || '0')
                              const stakeBonus = stakeValue * 10000
                              const multiplier = 1 + (stakeValue * 200)
                              return (baseReward * multiplier + stakeBonus).toFixed(2)
                            })()} FOCUS
                      </span>
                  </div>
                </div>
                      
                      <div className="text-xs text-[#f39c12] mt-2 text-center font-semibold">
                        💡 质押{stakeAmount} ETH，奖励提升{(parseFloat(stakeAmount || '0') * 200 * 100).toFixed(0)}%！
                      </div>
                    </div>
                  </div>
                </div>



                <button
                  onClick={startFocusSession}
                  disabled={startLoading || isFocusing || !stakeAmount || parseFloat(stakeAmount) < 0.0001}
                  className="bg-[#00b894] hover:bg-[#00a085] text-white font-semibold w-full py-4 text-lg rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startLoading ? '⏳ 创建中...' : `🚀 质押 ${stakeAmount} ETH 开始专注`}
                </button>
                {parseFloat(stakeAmount) < 0.0001 && (
                  <p className="text-xs text-[#ff4757] text-center mt-2">
                    ⚠️ 质押金额不能低于 0.0001 ETH
                  </p>
                )}
              </div>
            ) : (
              // 专注进行中界面
              <div className="bg-[#0f3460] rounded-2xl p-6 text-center shadow-2xl border border-[#16213e]">
                <div className="relative w-48 h-48 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-[#0f3460]"></div>
                  <div
                    className="absolute inset-0 rounded-full border-4 border-transparent"
                    style={{
                      background: `conic-gradient(#00a8ff ${calculateProgress()}%, transparent 0%)`
                    }}
                  ></div>
                  <div className="relative z-10">
                    <div className="text-4xl font-bold text-white mb-2">
                      {formatTime(timeLeft)}
                    </div>
                    <div className="text-[#e0e0e0]">剩余时间</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-[#0f3460] to-[#16213e] rounded-xl p-4 text-center border border-[#1a1a2e]">
                    <div className="text-2xl font-bold text-[#00b894]">{calculateReward(focusTime)}</div>
                    <div className="text-sm text-[#e0e0e0]">预计奖励</div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f3460] to-[#16213e] rounded-xl p-4 text-center border border-[#1a1a2e]">
                    <div className="text-2xl font-bold text-[#ff4757]">
                      -{calculateBreakFee(focusTime - Math.ceil(timeLeft / 60))}
                    </div>
                    <div className="text-sm text-[#e0e0e0]">中断费用</div>
                  </div>
                </div>

                {/* 实时警报显示区域（与“警报”页一致的样式与信息） */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">🚨 实时警报</h3>
                    <span className="text-xs text-accent-warning bg-yellow-500/20 px-2 py-1 rounded-full">
                      监控中
                    </span>
                  </div>
                  <div className="space-y-2">
                    {activeAlerts && activeAlerts.length > 0 ? (
                      activeAlerts.map((alert, index) => (
                        <div key={index} className="p-3 rounded-lg bg-[#16213e] border-l-4 border-[#ff4757]">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-white">地址活动</span>
                              <span className="text-xs text-text-muted">交易</span>
                            </div>
                            <span className="text-xs text-text-muted">
                              {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-[#e0e0e0] mb-1">
                            监控地址 {alert.description?.match(/0x[0-9a-fA-F]{40}/)?.[0]?.slice(0,6)}...{alert.description?.match(/0x[0-9a-fA-F]{40}/)?.[0]?.slice(-4)} 发生交易
                          </p>
                          {alert.transactionHash && (
                            <div className="text-xs text-[#a0a0a0]">
                              交易哈希: {alert.transactionHash.slice(0, 10)}...{alert.transactionHash.slice(-8)}
                            </div>
                          )}
                          {alert.value && (
                            <div className="text-xs text-[#a0a0a0]">
                              金额: {typeof alert.value === 'string' ? alert.value : alert.value} ETH
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center glass rounded-lg">
                        <p className="text-text-secondary text-sm">暂无地址活动</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4 p-3 rounded-lg bg-[#16213e]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#e0e0e0]">心跳检测</span>
                    <span className="text-[#00b894] animate-pulse">● 正常</span>
                  </div>
                </div>

                <button
                  onClick={breakFocusSession}
                  disabled={breakLoading}
                  className="bg-[#ff4757] hover:bg-[#ff3838] text-white font-semibold w-full py-4 text-lg rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {breakLoading ? '⏳ 中断中...' : `🚫 中断专注 (-${feeCalculation?.fees?.breakFee ? parseFloat(formatUnits(feeCalculation.fees.breakFee, 18)).toFixed(2) : calculateBreakFee(focusTime - Math.ceil(timeLeft / 60))} FOCUS)`}
                </button>
              </div>
            )}

            {/* 统计数据 - 根据FOCUS积分计算 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-[#0f3460] to-[#16213e] rounded-xl p-3 text-center border border-[#1a1a2e]">
                <div className="text-lg font-bold text-white">
                  {stats.todayTotalMinutes}
                </div>
                <div className="text-xs text-[#e0e0e0]">今日专注(分钟)</div>
              </div>
              <div className="bg-gradient-to-br from-[#0f3460] to-[#16213e] rounded-xl p-3 text-center border border-[#1a1a2e]">
                <div className="text-lg font-bold text-[#00b894]">
                  {stats.completedSessions}
                </div>
                <div className="text-xs text-[#e0e0e0]">总完成</div>
              </div>
              <div className="bg-gradient-to-br from-[#0f3460] to-[#16213e] rounded-xl p-3 text-center border border-[#1a1a2e]">
                <div className="text-lg font-bold text-white">
                  {Math.round(stats.successRate * 100)}%
                </div>
                <div className="text-xs text-[#e0e0e0]">成功率</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="bg-[#0f3460] rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🏆 FOCUS积分排行榜</h2>
              <p className="text-[#e0e0e0] mb-6">根据FOCUS积分排名的专注达人榜</p>
              
              {/* 时间段选择 */}
              <div className="flex space-x-2 mb-6">
                <button 
                  onClick={() => setLeaderboardPeriod('7d')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    leaderboardPeriod === '7d'
                      ? 'bg-[#00a8ff] text-white'
                      : 'bg-[#16213e] text-[#e0e0e0] hover:bg-[#1a1a2e]'
                  }`}
                >
                  近7天
                </button>
                <button 
                  onClick={() => setLeaderboardPeriod('30d')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    leaderboardPeriod === '30d'
                      ? 'bg-[#00a8ff] text-white'
                      : 'bg-[#16213e] text-[#e0e0e0] hover:bg-[#1a1a2e]'
                  }`}
                >
                  近30天
                </button>
              </div>

              {/* 调试信息 */}
              {typeof window !== 'undefined' && (
                <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-800 rounded">
                  调试: 排行榜数据数量: {leaderboardData?.length || 0}, 加载状态: {isLoadingLeaderboard ? '加载中' : '已完成'}, 当前期间: {leaderboardPeriod}
                </div>
              )}

              {/* 排行榜数据 */}
              {isLoadingLeaderboard ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">⏳</div>
                  <p className="text-[#e0e0e0]">加载排行榜数据中...</p>
                </div>
              ) : leaderboardData.length > 0 ? (
              <div className="space-y-3">
                  {leaderboardData.map((user, index) => (
                    <div key={user.address} className={`p-4 rounded-lg transition-all hover:scale-[1.02] ${
                      user.isCurrentUser 
                        ? 'bg-gradient-to-r from-[#00b894]/30 to-[#00a8ff]/30 border-2 border-[#00b894] shadow-lg' 
                        : user.rank <= 3 
                          ? 'bg-gradient-to-r from-[#00a8ff]/20 to-[#0097e6]/20 border border-[#00a8ff]/30' 
                          : 'bg-[#16213e] border border-[#1a1a2e]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* 排名 */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            user.rank === 1 ? 'bg-gradient-to-r from-[#ffd700] to-[#ffed4e] text-black' :
                            user.rank === 2 ? 'bg-gradient-to-r from-[#c0c0c0] to-[#e8e8e8] text-black' :
                            user.rank === 3 ? 'bg-gradient-to-r from-[#cd7f32] to-[#daa520] text-white' :
                            'bg-[#1a1a2e] text-[#e0e0e0]'
                          }`}>
                            {user.rank}
                      </div>
                          
                          {/* 用户信息 */}
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{user.avatar}</div>
                      <div>
                              <div className="text-white font-semibold flex items-center space-x-2">
                                <span>{user.nickname || `${user.address.slice(0, 6)}...${user.address.slice(-4)}`}</span>
                                {user.isCurrentUser && (
                                  <span className="px-2 py-1 bg-[#00b894] text-white text-xs rounded-full">
                                    我
                                  </span>
                                )}
                      </div>
                              <div className="text-xs text-[#a0a0a0]">
                                {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </div>
                              <div className="text-xs text-[#a0a0a0]">
                                {user.completedSessions}/{user.totalSessions} 次完成
                    </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 积分和统计 */}
                    <div className="text-right">
                          <div className="text-lg font-bold text-[#00b894]">
                            {user.focusBalance.toFixed(1)} FOCUS
                          </div>
                          <div className="text-xs text-[#a0a0a0]">
                            成功率 {user.successRate.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      {/* 进度条 */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-[#a0a0a0] mb-1">
                          <span>专注进度</span>
                          <span>{user.successRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-[#1a1a2e] rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              user.rank <= 3 ? 'bg-gradient-to-r from-[#00a8ff] to-[#0097e6]' : 'bg-[#00b894]'
                            }`}
                            style={{ width: `${user.successRate}%` }}
                          ></div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📊</div>
                  <p className="text-[#e0e0e0]">暂无排行榜数据</p>
                  <p className="text-sm text-[#a0a0a0] mt-2">请稍后刷新或检查网络连接</p>
                </div>
              )}

              {/* 当前用户排名 */}
              {address && (
                <div className="mt-6 p-4 rounded-lg bg-[#16213e] border border-[#00a8ff]/30">
                  <h3 className="text-lg font-semibold text-white mb-3">🎯 我的排名</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#00a8ff] flex items-center justify-center text-white font-bold">
                        ?
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {address.slice(0, 6)}...{address.slice(-4)}
                        </div>
                        <div className="text-xs text-[#a0a0a0]">我的账户</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#00b894]">
                        {focusBalance && focusDecimals ? parseFloat(formatUnits(focusBalance, focusDecimals)).toFixed(1) : '0.0'} FOCUS
                      </div>
                      <div className="text-xs text-[#a0a0a0]">当前积分</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 排行榜说明 */}
            <div className="bg-[#0f3460] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">📊 排行榜说明</h3>
              <div className="space-y-3 text-sm text-[#e0e0e0]">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#ffd700] to-[#ffed4e] flex items-center justify-center text-black font-bold text-xs">1</div>
                  <span>🥇 冠军：FOCUS积分最高的专注达人</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#c0c0c0] to-[#e8e8e8] flex items-center justify-center text-black font-bold text-xs">2</div>
                  <span>🥈 亚军：积分第二高的专注达人</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#cd7f32] to-[#daa520] flex items-center justify-center text-white font-bold text-xs">3</div>
                  <span>🥉 季军：积分第三高的专注达人</span>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-[#16213e]">
                  <div className="text-[#00a8ff] font-semibold mb-2">💡 如何提升排名？</div>
                  <ul className="space-y-1 text-xs">
                    <li>• 完成更多专注会话获得FOCUS奖励</li>
                    <li>• 提高专注成功率，避免中断惩罚</li>
                    <li>• 坚持每日专注，累积更多积分</li>
                    <li>• 参与社区活动获得额外奖励</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'market' && (
          <div className="space-y-4">
            <div className="bg-[#0f3460] rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🛒 积分市场</h2>
              <p className="text-[#e0e0e0] mb-6">使用ETH购买FOCUS积分，获得更多专注奖励</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { tokens: 100, price: '0.0001 ETH', bonus: '', label: '入门包' },
                  { tokens: 500, price: '0.0004 ETH', bonus: '+10%', label: '进阶包' },
                  { tokens: 1000, price: '0.0007 ETH', bonus: '+20%', label: '专业包' },
                  { tokens: 5000, price: '0.003 ETH', bonus: '+30%', label: '大师包' },
                ].map((pack, index) => (
                  <div key={index} className="p-4 rounded-lg bg-[#16213e] text-center border-2 border-[#1a1a2e] hover:border-[#00a8ff] transition-colors flex flex-col">
                    <div className="text-xs text-[#a0a0a0] mb-1">{pack.label}</div>
                    <div className="text-2xl font-bold text-[#00a8ff] mb-1">{pack.tokens} FOCUS</div>
                    <div className="text-lg font-semibold text-white mb-1">
                      {pack.price}
                    </div>
                    {pack.bonus && (
                      <div className="text-sm text-[#00b894]">{pack.bonus} 奖励</div>
                    )}
                    <div className="flex-1"></div>
                    <button 
                      onClick={async () => {
                        if (!address) {
                          alert('请先连接钱包')
                          return
                        }
                        
                        // 检查ETH余额是否足够
                        const requiredEth = parseFloat(pack.price.split(' ')[0])
                        const currentEthBalance = ethBalance ? parseFloat(formatEther(ethBalance.value)) : 0
                        
                        if (currentEthBalance < requiredEth) {
                          alert(`ETH余额不足！需要 ${requiredEth} ETH，当前余额 ${currentEthBalance.toFixed(6)} ETH`)
                          return
                        }
                        
                        try {
                          console.log(`开始购买 ${pack.tokens} FOCUS，需要支付 ${pack.price}`)
                          await buyFocus(pack.tokens)
                          
                          // 等待交易确认后再显示成功消息
                          setTimeout(() => {
                            if (buySuccess) {
                              alert(`✅ 成功购买 ${pack.tokens} FOCUS！\n支付: ${pack.price}\n获得: ${pack.tokens} FOCUS`)
                            }
                          }, 2000)
                          
                        } catch (error) {
                          console.error('购买失败:', error)
                          alert('❌ 购买失败: ' + (error instanceof Error ? error.message : '未知错误'))
                        }
                      }}
                      disabled={buyLoading || !address || buySuccess}
                      className="w-full mt-3 py-2 text-sm bg-[#00a8ff] hover:bg-[#0097e6] text-white rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {buyLoading ? '购买中...' : buySuccess ? '购买成功' : `购买积分 (${pack.price})`}
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-[#16213e]">
                <h3 className="font-semibold text-white mb-2">💎 特权</h3>
                <ul className="text-sm text-[#e0e0e0] space-y-1">
                  <li>• 更高的专注奖励倍数</li>
                  <li>• 专属主题和图标</li>
                  <li>• 优先技术支持</li>
                  <li>• 参与治理投票</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="bg-[#0f3460] rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🔔 地址监控</h2>
              <p className="text-[#e0e0e0] mb-4">监控指定地址的交易活动，不错过重要链上信号</p>
              
              {/* 添加监控地址 */}
              <div className="mb-6">
                <h3 className="font-semibold text-white mb-3">📍 添加监控地址</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="输入以太坊地址 (0x...)"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-[#0f3460] bg-[#16213e] text-[#e0e0e0] placeholder-[#a0a0a0] focus:border-[#00a8ff] focus:outline-none"
                  />
                  <button
                    onClick={addMonitoredAddress}
                    disabled={!newAddress || newAddress.length !== 42 || !newAddress.startsWith('0x')}
                    className="px-4 py-2 bg-[#00a8ff] hover:bg-[#0097e6] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    添加
                  </button>
                </div>
                {newAddress && (newAddress.length !== 42 || !newAddress.startsWith('0x')) && (
                  <div className="text-xs text-[#ff4757] mt-1">请输入有效的以太坊地址</div>
                )}
                </div>

              {/* 监控地址列表 */}
              <div className="mb-6">
                <h3 className="font-semibold text-white mb-3">📋 监控地址列表</h3>
                {monitoredAddresses.length > 0 ? (
                  <div className="space-y-2">
                    {monitoredAddresses.map((addr, index) => (
                      <div key={addr} className="flex items-center justify-between p-3 rounded-lg bg-[#16213e]">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-[#00a8ff] flex items-center justify-center text-white text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {addr.slice(0, 6)}...{addr.slice(-4)}
                            </div>
                            <div className="text-xs text-[#a0a0a0]">监控中</div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeMonitoredAddress(addr)}
                          className="text-[#ff4757] hover:text-[#ff3838] text-sm"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[#a0a0a0]">
                    <div className="text-3xl mb-2">📍</div>
                    <p>暂无监控地址</p>
                    <p className="text-sm">添加地址开始监控交易活动</p>
                  </div>
                )}
              </div>

              {/* 监控状态 */}
              <div className="p-4 rounded-lg bg-[#16213e] mb-4">
                <h3 className="font-semibold text-white mb-3">⚙️ 监控状态</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#e0e0e0]">监控地址:</span>
                    <span className="text-white ml-2">{monitoredAddresses.length} 个</span>
                  </div>
                  <div>
                    <span className="text-[#e0e0e0]">监控状态:</span>
                    <span className={`ml-2 ${monitoredAddresses.length > 0 ? 'text-[#00b894]' : 'text-[#a0a0a0]'}`}>
                      {monitoredAddresses.length > 0 ? '活跃' : '未启动'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#e0e0e0]">检测频率:</span>
                    <span className="text-white ml-2">10秒</span>
                  </div>
                  <div>
                    <span className="text-[#e0e0e0]">今日警报:</span>
                    <span className="text-white ml-2">{activeAlerts.length} 条</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0f3460] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">📋 今日警报</h3>
              {activeAlerts.length > 0 ? (
                <div className="space-y-3">
                  {activeAlerts.slice(0, 10).map(alert => (
                    <div key={alert.id} className={`p-3 rounded-lg bg-[#16213e] border-l-4 ${
                      alert.type === 'transaction' ? 'border-[#00a8ff]' : 
                      alert.type === 'success' ? 'border-[#00b894]' : 
                      'border-[#ff4757]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-white">{alert.title}</h4>
                            {alert.type === 'transaction' && (
                              <span className="px-2 py-1 bg-[#00a8ff]/20 text-[#00a8ff] text-xs rounded">
                                交易
                              </span>
                            )}
                            {alert.type === 'success' && (
                              <span className="px-2 py-1 bg-[#00b894]/20 text-[#00b894] text-xs rounded">
                                成功
                              </span>
                            )}
                        </div>
                          <p className="text-sm text-[#e0e0e0] mb-2">{alert.description}</p>
                          {alert.transactionHash && (
                            <div className="text-xs text-[#a0a0a0]">
                              交易哈希: {alert.transactionHash.slice(0, 10)}...{alert.transactionHash.slice(-8)}
                            </div>
                          )}
                          {alert.value && (
                            <div className="text-xs text-[#a0a0a0]">
                              金额: {alert.value} ETH
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                        <span className="text-xs text-[#a0a0a0]">
                          {alert.timestamp.toLocaleTimeString()}
                        </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-[#e0e0e0]">
                  <div className="text-3xl mb-2">🎯</div>
                  <p>今日暂无警报</p>
                  <p className="text-sm">添加监控地址后会自动检测交易活动</p>
                </div>
              )}
            </div>

            {/* 交易历史 */}
            {addressTransactions.length > 0 && (
              <div className="bg-[#0f3460] rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">📊 交易历史</h3>
                <div className="space-y-3">
                  {addressTransactions.slice(0, 5).map((tx, index) => (
                    <div key={tx.hash} className="p-3 rounded-lg bg-[#16213e]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                            tx.type === 'incoming' ? 'bg-[#00b894]' : 'bg-[#ff4757]'
                          }`}>
                            {tx.type === 'incoming' ? '↗' : '↘'}
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {tx.type === 'incoming' ? '接收' : '发送'} {tx.value} ETH
                            </div>
                            <div className="text-xs text-[#a0a0a0]">
                              {tx.from.slice(0, 6)}...{tx.from.slice(-4)} → {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[#a0a0a0]">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-semibold floating">
                  {address?.slice(2, 4).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gradient">我的账户</h2>
                  <p className="text-text-secondary text-sm">{address}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass p-4 rounded-xl text-center card-hover">
                  <div className="text-2xl font-bold text-accent-primary">
                    {ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : '0'}
                  </div>
                  <div className="text-sm text-text-secondary">ETH 余额</div>
                </div>
                <div className="glass p-4 rounded-xl text-center card-hover">
                  <div className="text-2xl font-bold text-accent-success">
                    {focusBalance && focusDecimals ? parseFloat(formatUnits(focusBalance, focusDecimals)).toFixed(2) : '0'}
                  </div>
                  <div className="text-sm text-text-secondary">FOCUS 代币</div>
                </div>
              </div>

              {/* 专注曲线图表 - 使用链上历史数据 */}
              <div className="mb-6">
                <h3 className="font-semibold text-white text-lg mb-4">📈 近一周专注时长</h3>
                <div className="glass p-4 rounded-xl">
                  {historyLoading ? (
                    <div className="text-center text-text-secondary py-8">加载中...</div>
                  ) : (
                  <div className="flex items-end justify-between h-32 space-x-2">
                      {(() => {
                        // 使用覆盖后的 30 小时均分数据
                        const focusData = overriddenWeeklyStats
                        return (weeklyStats.length > 0 ? overriddenWeeklyStats : focusData).map((item, index) => {
                          const dataToUse = weeklyStats.length > 0 ? overriddenWeeklyStats : focusData
                          const maxMinutes = Math.max(...dataToUse.map(d => d.minutes), 1)
                      const height = (item.minutes / maxMinutes) * 80
                      return (
                        <div key={index} className="flex flex-col items-center flex-1">
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-[#6366f1] to-[#8b5cf6] transition-all duration-500 hover:opacity-80"
                            style={{ height: `${height}px` }}
                            title={`${item.day}: ${item.minutes}分钟`}
                          ></div>
                          <div className="text-xs text-text-secondary mt-2">{item.day}</div>
                          <div className="text-xs text-white font-medium">{item.minutes}m</div>
                        </div>
                      )
                        })
                      })()}
                  </div>
                  )}
                </div>
              </div>

              {/* 专注统计模块已按需移除 */}

              {/* 应用白名单设置 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white text-lg">📱 应用白名单设置</h3>
                <div className="glass p-4 rounded-xl">
                  <p className="text-sm text-text-secondary mb-4">管理专注期间允许使用的应用程序</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00a8ff]/20 flex items-center justify-center">
                          🌐
                  </div>
                        <div>
                          <div className="text-white font-medium">浏览器</div>
                          <div className="text-xs text-text-secondary">网页浏览和搜索</div>
                  </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-accent-success">允许</span>
                        <div className="w-12 h-6 bg-accent-success rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00b894]/20 flex items-center justify-center">
                          📝
                        </div>
                        <div>
                          <div className="text-white font-medium">文档编辑</div>
                          <div className="text-xs text-text-secondary">办公软件和编辑器</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-accent-success">允许</span>
                        <div className="w-12 h-6 bg-accent-success rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#f39c12]/20 flex items-center justify-center">
                          📱
                        </div>
                        <div>
                          <div className="text-white font-medium">社交媒体</div>
                          <div className="text-xs text-text-secondary">微信、微博、抖音等</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-accent-warning">限制</span>
                        <div className="w-12 h-6 bg-accent-warning rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#ff4757]/20 flex items-center justify-center">
                          🎮
                        </div>
                        <div>
                          <div className="text-white font-medium">娱乐应用</div>
                          <div className="text-xs text-text-secondary">游戏、视频、音乐等</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-accent-warning">限制</span>
                        <div className="w-12 h-6 bg-accent-warning rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 rounded-lg bg-background-secondary">
                    <div className="flex items-start space-x-2">
                      <div className="text-accent-primary text-lg">💡</div>
                      <div className="text-sm text-text-secondary">
                        <div className="font-medium text-white mb-1">专注模式说明</div>
                        <div>• 绿色开关：专注期间允许使用</div>
                        <div>• 黄色开关：专注期间限制使用</div>
                        <div>• 红色开关：专注期间完全禁止</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 专注历史记录 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white text-lg">📜 专注历史</h3>
                <div className="glass p-4 rounded-xl max-h-96 overflow-y-auto">
                  {/* 调试信息 */}
                  {typeof window !== 'undefined' && (
                    <div className="text-xs text-gray-500 mb-2">
                      调试: 历史记录数量: {sessionHistory?.length || 0}, 加载状态: {historyLoading ? '加载中' : '已完成'}
                    </div>
                  )}
                  
                  {historyLoading ? (
                    <div className="text-center text-text-secondary py-4">加载历史记录中...</div>
                  ) : sessionHistory && sessionHistory.length > 0 ? (
                    <div className="space-y-3">
                      {sessionHistory.slice(0, 20).map((item) => (
                        <div key={item.id} className="p-3 rounded-lg bg-background-secondary border-l-4 border-border-glow" style={{
                          borderLeftColor: item.type === 'completed' ? '#00b894' : 
                                          item.type === 'broken' ? '#ff4757' : 
                                          item.type === 'purchase' ? '#f39c12' : '#00a8ff'
                        }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm font-semibold ${
                                item.type === 'completed' ? 'text-accent-success' :
                                item.type === 'broken' ? 'text-accent-warning' :
                                item.type === 'purchase' ? 'text-yellow-400' :
                                'text-accent-primary'
                              }`}>
                                {item.type === 'completed' ? '✅ 完成会话' :
                                 item.type === 'broken' ? '❌ 中断会话' :
                                 item.type === 'purchase' ? '🛒 购买FOCUS' :
                                 '🚀 开始会话'}
                              </span>
                            </div>
                            <span className="text-xs text-text-muted">
                              {new Date(item.timestamp * 1000).toLocaleString('zh-CN', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            {item.type === 'started' && (
                              <>
                                <div className="text-xs text-text-secondary">
                                  ⏱️ 目标时长: <span className="text-white font-semibold">{item.targetMinutes} 分钟</span>
                                </div>
                                <div className="text-xs text-text-secondary">
                                  💰 质押金额: <span className="text-white font-semibold">{item.depositWei ? parseFloat(formatEther(BigInt(item.depositWei))).toFixed(4) : '0'} ETH</span>
                                </div>
                              </>
                            )}
                            
                            {item.type === 'broken' && item.breakFee && (
                              <div className="text-xs">
                                <span className="text-text-secondary">💸 惩罚费用: </span>
                                <span className="text-accent-warning font-bold">{parseFloat(formatUnits(BigInt(item.breakFee), 18)).toFixed(2)} FOCUS</span>
                                <span className="text-text-muted ml-2">(已扣除)</span>
                              </div>
                            )}
                            
                            {item.type === 'completed' && item.completionReward && (
                              <div className="text-xs">
                                <span className="text-text-secondary">🎁 奖励: </span>
                                <span className="text-accent-success font-bold">{parseFloat(formatUnits(BigInt(item.completionReward), 18)).toFixed(2)} FOCUS</span>
                                <span className="text-text-muted ml-2">(已发放)</span>
                              </div>
                            )}
                            
                            {item.type === 'purchase' && (
                              <>
                                <div className="text-xs">
                                  <span className="text-text-secondary">💰 支付: </span>
                                  <span className="text-blue-400 font-bold">{parseFloat(formatEther(BigInt(item.ethAmount || '0'))).toFixed(4)} ETH</span>
                                </div>
                                <div className="text-xs">
                                  <span className="text-text-secondary">🎯 获得: </span>
                                  <span className="text-yellow-400 font-bold">{parseFloat(formatUnits(BigInt(item.focusAmount || '0'), 18)).toFixed(0)} FOCUS</span>
                                  <span className="text-text-muted ml-2">(已到账)</span>
                                </div>
                              </>
                            )}
                            
                            <div className="text-xs text-text-muted mt-2 font-mono flex items-center justify-between">
                              <span>TX: {item.transactionHash.slice(0, 10)}...{item.transactionHash.slice(-8)}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(item.transactionHash)
                                  alert('交易哈希已复制')
                                }}
                                className="text-accent-primary hover:text-accent-success text-xs"
                              >
                                📋 复制
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-text-secondary py-8">
                      <div className="text-2xl mb-2">📝</div>
                      <p className="text-sm">暂无专注历史</p>
                      <p className="text-xs">完成第一个专注会话后会显示在这里</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => disconnect()}
                className="btn-warning w-full py-3 mt-4"
              >
                断开钱包连接
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 警报打断模态框 */}
      {showAlertModal && currentAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f3460] rounded-2xl p-6 max-w-sm w-full border-2 border-[#ff4757]">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🚨</div>
              <h3 className="text-xl font-bold text-white mb-2">{currentAlert.title}</h3>
              <p className="text-[#e0e0e0]">{currentAlert.description}</p>
            </div>
            
            <div className="bg-[#16213e] p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#e0e0e0]">中断费用:</span>
                <span className="text-[#ff4757] font-semibold">{currentAlert.breakFee} FOCUS</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-[#e0e0e0]">当前余额:</span>
                <span className="text-white font-semibold">{earnedTokens} FOCUS</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAlertModal(false)
                  setCurrentAlert(null)
                }}
                className="flex-1 py-3 bg-[#16213e] text-white rounded-xl hover:bg-[#1a1a2e] transition-colors"
              >
                稍后再看
              </button>
              <button
                onClick={() => {
                  if (currentAlert) {
                    setEarnedTokens(prev => Math.max(0, prev - currentAlert.breakFee))
                    setIsFocusing(false)
                  }
                  setShowAlertModal(false)
                  setCurrentAlert(null)
                }}
                className="flex-1 py-3 bg-[#ff4757] text-white rounded-xl hover:bg-[#ff3838] transition-colors"
                disabled={earnedTokens < currentAlert.breakFee}
              >
                立即查看
              </button>
            </div>
            
            {earnedTokens < currentAlert.breakFee && (
              <p className="text-xs text-[#ff4757] text-center mt-2">
                代币不足，无法中断专注
              </p>
            )}
          </div>
        </div>
      )}

      {/* 底部导航栏 */}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 p-2">
        <div className="flex justify-around">
          {[
            { id: 'focus' as TabType, icon: '⏰', label: '专注' },
            { id: 'alerts' as TabType, icon: '🔔', label: '警报' },
            { id: 'leaderboard' as TabType, icon: '🏆', label: '排行榜' },
            { id: 'market' as TabType, icon: '🛒', label: '市场' },
            { id: 'profile' as TabType, icon: '👤', label: '我的' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* 设置菜单 */}
      <SettingsMenu
        isOpen={showSettingsMenu}
        onClose={() => setShowSettingsMenu(false)}
        onNavigate={(tab) => setActiveTab(tab as TabType)}
        onBackgroundChange={setCurrentBackground}
        currentBackground={currentBackground}
        buttonRef={settingsButtonRef}
      />
    </div>
  )
}
