'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Dashboard() {
  const { address: account, isConnected } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  if (!isConnected) {
    return null
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
        <p>Connected account: {account}</p>
        <div className="mt-8">
          <div className="card">
            <h2 className="text-2xl mb-4">Focus Session</h2>
            <p>Dashboard functionality will be implemented soon.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
