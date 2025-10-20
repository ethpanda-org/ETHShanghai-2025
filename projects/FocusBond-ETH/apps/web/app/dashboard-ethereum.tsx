'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardEthereum() {
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
        <h1 className="text-4xl font-bold mb-8">Ethereum Dashboard</h1>
        <p>Connected account: {account}</p>
        <div className="mt-8">
          <div className="card">
            <h2 className="text-2xl mb-4">Ethereum Focus Session</h2>
            <p>Ethereum-specific functionality will be implemented soon.</p>
            <p className="mt-4 text-text-secondary">
              This dashboard is for Ethereum network interactions.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
