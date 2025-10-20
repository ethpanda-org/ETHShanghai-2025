'use client'

import { useEthereum } from './providers-ethereum'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { isConnected, connect } = useEthereum()
  const router = useRouter()

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard')
    }
  }, [isConnected, router])

  const handleConnect = async () => {
    try {
      await connect()
    } catch (error) {
      console.error('Failed to connect:', error)
      alert('Failed to connect to MetaMask. Please make sure MetaMask is installed.')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8">
          FocusBond = Time-Bonded Attention
        </h1>
      </div>

      <div className="relative flex place-items-center">
        <button
          onClick={handleConnect}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Connect MetaMask
        </button>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left mt-16">
        <div className="group rounded-lg border border-transparent px-5 py-4">
          <h2 className="mb-3 text-2xl font-semibold">
            Commit
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Set your focus time and stake ETH
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4">
          <h2 className="mb-3 text-2xl font-semibold">
            Focus
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Complete your session or pay a break fee
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4">
          <h2 className="mb-3 text-2xl font-semibold">
            Earn
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Build reputation and earn rewards
          </p>
        </div>
      </div>
    </main>
  )
}
