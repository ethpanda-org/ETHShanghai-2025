'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header() {
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            PayWay
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 hover:text-teal-600 transition-colors"
          >
            首页
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-700 hover:text-teal-600 transition-colors"
          >
            控制台
          </Link>
        </nav>

        {/* Connect Button */}
        <div className="flex items-center">
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}

