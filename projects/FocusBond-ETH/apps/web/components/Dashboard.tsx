'use client'

import { useAccount, useBalance, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import WalletButtonSafe from './ClientWalletButton'
import { useEffect, useRef, useState } from 'react'
import { logClientError } from '../lib/logClientError'
import { useStartSession } from '../lib/hooks/useStartSession'
import { useBreakSession } from '../lib/hooks/useBreakSession'
import { useCompleteSession } from '../lib/hooks/useCompleteSession'
import FocusBondABI from '../src/contracts/FocusBond.json'

const CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'

interface Session {
  user: string
  targetMinutes: number
  depositWei: bigint
  startTime: bigint
  status: number
}

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const { data: balanceData } = useBalance({ address })
  const { startSession, loading: startLoading, error: startError, transactionHash: startHash } = useStartSession()
  const { breakSession, loading: breakLoading, error: breakError, transactionHash: breakHash } = useBreakSession()
  const { completeSession, loading: completeLoading, error: completeError, transactionHash: completeHash } = useCompleteSession()

  const [targetMinutes, setTargetMinutes] = useState(30)
  const [depositAmount, setDepositAmount] = useState(0.01)
  const [mounted, setMounted] = useState(false)
  const [sessionStartAt, setSessionStartAt] = useState<number | null>(null)
  const [remainingSec, setRemainingSec] = useState<number>(0)
  const [showCompleteHint, setShowCompleteHint] = useState(false)
  const [isActiveSession, setIsActiveSession] = useState(false)
  const [showCompleteBanner, setShowCompleteBanner] = useState(false)
  const [completeSignature, setCompleteSignature] = useState<string | null>(null)
  const autoCompleteRef = useRef(false)

  // Read session data from contract
  const { data: sessionData } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: FocusBondABI.abi as any,
    functionName: 'getSession',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 15000, // Poll every 15 seconds
    },
  }) as { data?: Session }

  // Wait for transaction confirmations
  const { isLoading: startConfirming } = useWaitForTransactionReceipt({ hash: startHash as `0x${string}` })
  const { isLoading: breakConfirming } = useWaitForTransactionReceipt({ hash: breakHash as `0x${string}` })
  const { isLoading: completeConfirming } = useWaitForTransactionReceipt({ hash: completeHash as `0x${string}` })

  // Update session state based on contract data
  useEffect(() => {
    if (sessionData) {
      const isActive = sessionData.status === 1 // Assuming 1 means active
      setIsActiveSession(isActive)
      
      if (isActive && sessionData.startTime) {
        const startTime = Number(sessionData.startTime) * 1000 // Convert to milliseconds
        const targetMs = sessionData.targetMinutes * 60 * 1000
        const now = Date.now()
        const elapsed = now - startTime
        const remain = Math.max(0, Math.floor((targetMs - elapsed) / 1000))
        
        setSessionStartAt(startTime)
        setRemainingSec(remain)
        setShowCompleteHint(remain === 0)
      } else {
        setSessionStartAt(null)
        setRemainingSec(0)
        setShowCompleteHint(false)
      }
    } else {
      setIsActiveSession(false)
      setSessionStartAt(null)
      setRemainingSec(0)
      setShowCompleteHint(false)
    }
  }, [sessionData])

  // Component mount state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Countdown timer for active sessions
  useEffect(() => {
    if (!sessionStartAt) return
    
    const tick = () => {
      const elapsed = Math.floor((Date.now() - sessionStartAt) / 1000)
      const totalSec = targetMinutes * 60
      const remain = Math.max(0, totalSec - elapsed)
      setRemainingSec(remain)
      
      if (remain === 0) {
        setShowCompleteHint(true)
        if (!showCompleteBanner) {
          setCompleteSignature(null)
          setShowCompleteBanner(true)
        }
        
        // Auto complete when time is up
        if (isActiveSession && !autoCompleteRef.current) {
          autoCompleteRef.current = true
          handleAutoComplete()
        }
      }
    }
    
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [sessionStartAt, targetMinutes, isActiveSession, showCompleteBanner])

  const handleStart = async () => {
    if (!isConnected || !address) {
      setError('Wallet not connected')
      return
    }

    try {
      const depositWei = BigInt(Math.round(depositAmount * 1e18)) // Convert ETH to wei
      await startSession(targetMinutes, depositWei)
      // Session state will update automatically via polling
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleBreak = async () => {
    if (!isConnected || !address) {
      setError('Wallet not connected')
      return
    }

    try {
      await breakSession()
      // Session state will update automatically via polling
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleComplete = async () => {
    if (!isConnected || !address) {
      setError('Wallet not connected')
      return
    }

    try {
      await completeSession()
      setCompleteSignature(completeHash)
      setShowCompleteBanner(true)
      setTimeout(() => setShowCompleteBanner(false), 8000)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleAutoComplete = async () => {
    if (!isConnected || !address) return
    
    try {
      await completeSession()
      setCompleteSignature(completeHash)
      setShowCompleteBanner(true)
      setTimeout(() => setShowCompleteBanner(false), 8000)
    } catch (error: any) {
      // Auto-complete failed, user can manually complete
      console.error('Auto-complete failed:', error)
    }
  }

  // Error state management
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const currentError = startError || breakError || completeError
    setError(currentError)
  }, [startError, breakError, completeError])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-between text-sm">
          <div className="flex items-center justify-center">
            <div className="text-4xl font-bold">FocusBond Dashboard</div>
          </div>
          <div className="flex items-center justify-center mt-8">
            <div className="text-white/60">Loading...</div>
          </div>
        </div>
      </main>
    )
  }

  const isLoading = startLoading || breakLoading || completeLoading || startConfirming || breakConfirming || completeConfirming
  const currentTransactionHash = startHash || breakHash || completeHash

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold">FocusBond Dashboard</h1>
          <div className="flex items-center gap-4">
            {isConnected && (
              <div className="text-sm text-white/80">
                Balance: {balanceData?.formatted ? `${parseFloat(balanceData.formatted).toFixed(4)} ETH` : '—'}
              </div>
            )}
            <WalletButtonSafe />
          </div>
        </div>

        {!isConnected ? (
          <div className="bg-white/5 p-8 rounded-lg text-center">
            <h2 className="text-2xl mb-4">Connect Your Wallet</h2>
            <p className="text-white/60 mb-4">Please connect your wallet to start a focus session</p>
            <WalletButtonSafe />
          </div>
        ) : (
          <>
            <div className="bg-white/5 p-8 rounded-lg mb-8">
              <h2 className="text-2xl mb-4">Start New Session</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block mb-2">Target Minutes</label>
                  <input
                    type="number"
                    value={targetMinutes}
                    onChange={(e) => setTargetMinutes(Number(e.target.value))}
                    className="bg-white/10 p-2 rounded w-full"
                    min={15}
                  />
                </div>
                <div>
                  <label className="block mb-2">Deposit Amount (ETH)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="bg-white/10 p-2 rounded w-full"
                    min={0.001}
                    step={0.001}
                  />
                </div>
                <button
                  onClick={handleStart}
                  disabled={isLoading || !isConnected || isActiveSession}
                  className="bg-blue-500 p-3 rounded hover:bg-blue-600 disabled:opacity-50 w-full"
                >
                  {isLoading ? 'Starting...' : isActiveSession ? 'Session Active' : 'Start Session'}
                </button>
              </div>
            </div>

            <div className="bg-white/5 p-8 rounded-lg mb-8">
              <h2 className="text-2xl mb-4">Active Session</h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  Remaining Time: {Math.floor(remainingSec / 60)}:{`${remainingSec % 60}`.padStart(2, '0')}
                </div>
                {showCompleteHint && (
                  <div className="text-yellow-300 text-sm">Time is up, please click Complete to finish session</div>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleBreak}
                  disabled={isLoading || !isConnected}
                  className="bg-red-500 p-3 rounded hover:bg-red-600 disabled:opacity-50 flex-1"
                >
                  {isLoading ? 'Breaking...' : 'Break Session'}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isLoading || !isConnected}
                  className="bg-green-500 p-3 rounded hover:bg-green-600 disabled:opacity-50 flex-1"
                >
                  {isLoading ? 'Completing...' : 'Complete Session'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 p-4 rounded mb-4">
                {error}
              </div>
            )}

            {showCompleteBanner && (
              <div className="bg-green-500/10 border border-green-500 p-4 rounded mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Complete Session Finished</div>
                    {completeSignature ? (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${completeSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-300 hover:text-green-200 break-all"
                      >
                        View Transaction
                      </a>
                    ) : (
                      <div className="text-green-300 text-sm">Submitting to blockchain, please wait...</div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowCompleteBanner(false)}
                    className="text-green-300 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {currentTransactionHash && (
              <div className="bg-white/5 p-4 rounded">
                <h3 className="text-lg mb-2">Last Transaction</h3>
                <a
                  href={`https://sepolia.etherscan.io/tx/${currentTransactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 break-all"
                >
                  {currentTransactionHash}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
