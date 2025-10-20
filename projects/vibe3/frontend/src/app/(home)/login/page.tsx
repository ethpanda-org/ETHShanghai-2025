'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { StarfieldBg } from '@/components/starfield-bg'
import { useState } from 'react'
import { login } from '@/services/vibe3_api/auth'
import { toast } from "sonner"
import { EthSigninDialog } from '@/components/dialog-eth-signin'
import { createConfig, WagmiProvider, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { createClient } from 'viem'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { WagmiProviderWrapper } from '@/providers/wagmi'


const queryClient = new QueryClient()
const wagmiConfig = createConfig({
  chains: [mainnet],
  client({ chain }) {
    return createClient({ chain, transport: http() })
  },
})

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    // Clear previous errors
    setError('')

    // Email validation
    if (!email.trim()) {
      setError('Email is required')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return false
    }

    // Password validation
    if (!password.trim()) {
      setError('Password is required')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const response = await login(email, password)
      if (response.success) {
        console.log('Login successful!')
        toast.success('Login successful!')
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Login failed. Please check your credentials and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 bg-background flex flex-col justify-center px-8 lg:px-16">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="text-2xl font-bold text-green-400">
              [Vibe3]
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
          </div>

          <WagmiProviderWrapper>
            <EthSigninDialog>
              <Button>
                <Wallet className="h-4 w-4" /> Sign in with Ethereum Wallet
              </Button>
            </EthSigninDialog>
          </WagmiProviderWrapper>

          <div className="flex items-center justify-center mt-6 text-muted-foreground">
            <span className="h-px w-full bg-input mr-3" /> or <span className="ml-3 h-px w-full bg-input" />
          </div>

          {/* Email Input */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="h-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="h-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Forgot Password Link */}
          <div className="mb-6 text-right">
            <Link href="#forgot-password" className="text-sm text-muted-foreground hover:text-foreground underline">
              Forgot your password?
            </Link>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <Button
            type="submit"
            className="w-full h-12 bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="underline hover:text-foreground">
                Sign up
              </Link>
            </span>
          </div>
        </form>
      </div>

      {/* Right Side - Background with Chat Input */}
      <div className="hidden lg:flex lg:flex-1 relative m-3 justify-center items-center">
        <StarfieldBg className='bg-gradient-to-br  from-green-500/20 to-background rounded-2xl' />
        <div className="z-10 m-10">
          <h1 className='text-4xl font-bold text-green-400 mb-2'>[Vibe3]</h1>
          <h2 className='text-3xl font-bold text-foreground mb-2'> Building Apps Easily </h2>
          <p className="text-lg text-foreground font-mono">
            Change your idea into apps in seconds via AI Assistant
          </p>
        </div>
      </div>
    </div>
  )
}
