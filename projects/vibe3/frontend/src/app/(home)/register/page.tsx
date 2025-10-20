'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { StarfieldBg } from '@/components/starfield-bg'
import { useState } from 'react'
import { register } from '@/services/vibe3_api/auth'
import { toast } from "sonner"

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [terms, setTerms] = useState(true)
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

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      setError('Please confirm your password')
      return false
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    // Terms validation
    if (!terms) {
      setError('You must agree to the Terms of Service and Privacy Policy')
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
      // Here you would typically make an API call to register the user
      console.log('Registration data:', { email, password, confirmPassword, terms })

      const response = await register(email, password)
      if (response.success) {
        console.log('Registration successful!')
        window.localStorage.setItem('vibe3_auth_token', response.data.token)
        toast.success('Registration successful!')
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)
      }
      // Redirect or show success message
      console.log('Registration successful!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Registration Form */}
      <div className="flex-1 bg-background flex flex-col justify-center px-8 lg:px-16">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="text-2xl font-bold text-green-400">
              [Vibe3]
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
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

          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
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

          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              className="h-12"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {/* Terms and Privacy */}
          <div className="mb-6">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={terms}
                onChange={() => setTerms(!terms)}
                className="mt-1 h-4 w-4 text-primary border-border rounded focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">
                I agree to our{' '}
                <Link href="#terms" className="underline hover:text-foreground">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Continue Button */}
          <Button
            type="submit"
            className="w-full h-12 bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Continue'}
          </Button>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="underline hover:text-foreground">
                Log in
              </Link>
            </span>
          </div>
        </form>
      </div>

      {/* Right Side - Background with Chat Input */}
      <div className="hidden lg:flex lg:flex-1 relative m-3 justify-center items-center">
        <StarfieldBg className='bg-gradient-to-br  from-green-500/20 to-background rounded-2xl' />
        <div className="z-10">
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
