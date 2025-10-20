import { useState } from 'react'
import { X, Wallet, Mail, AlertCircle, Copy, Check } from 'lucide-react'
import { ethers } from 'ethers'

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [loginMethod, setLoginMethod] = useState('main') // 'main', 'email', 'mnemonic'
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedWallet, setGeneratedWallet] = useState(null)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  // MetaMask登录
  const handleMetaMaskLogin = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsLoading(true)
        setError('')
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        const address = accounts[0]
        
        onLoginSuccess({
          address,
          method: 'metamask'
        })
        onClose()
      } catch (error) {
        console.error('MetaMask login error:', error)
        setError('Failed to connect MetaMask. Please try again.')
      } finally {
        setIsLoading(false)
      }
    } else {
      setError('MetaMask is not installed. Please install MetaMask extension.')
    }
  }

  // 支付宝登录（模拟）
  const handleAlipayLogin = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // 生成新钱包
      const wallet = ethers.Wallet.createRandom()
      const address = wallet.address
      const mnemonic = wallet.mnemonic.phrase
      
      // 显示助记词让用户保存
      setGeneratedWallet({
        address,
        mnemonic,
        method: 'alipay'
      })
      setLoginMethod('mnemonic')
      
    } catch (error) {
      console.error('Alipay login error:', error)
      setError('Failed to generate wallet. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // 邮箱登录并生成钱包
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      
      // 生成新钱包
      const wallet = ethers.Wallet.createRandom()
      const address = wallet.address
      const mnemonic = wallet.mnemonic.phrase
      
      // 显示助记词让用户保存
      setGeneratedWallet({
        address,
        mnemonic,
        email,
        method: 'email'
      })
      setLoginMethod('mnemonic')
      
    } catch (error) {
      console.error('Email login error:', error)
      setError('Failed to generate wallet. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // 确认已保存助记词
  const handleConfirmMnemonic = () => {
    if (generatedWallet) {
      onLoginSuccess({
        address: generatedWallet.address,
        method: generatedWallet.method,
        email: generatedWallet.email,
        isNewWallet: true
      })
      onClose()
      // 重置状态
      setGeneratedWallet(null)
      setLoginMethod('main')
      setEmail('')
    }
  }

  // 复制助记词
  const copyMnemonic = () => {
    if (generatedWallet) {
      navigator.clipboard.writeText(generatedWallet.mnemonic)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 主登录页面 */}
        {loginMethod === 'main' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Connect to Protocol Bank</h2>
                <p className="text-sm text-gray-500 mt-1">Choose your preferred login method</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-3">
              {/* MetaMask按钮 */}
              <button
                onClick={handleMetaMaskLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Wallet className="h-5 w-5 text-gray-700" />
                <span className="text-gray-900 font-medium">Connect with MetaMask</span>
              </button>

              {/* 支付宝按钮 */}
              <button
                onClick={handleAlipayLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1677FF">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span className="text-gray-900 font-medium">使用支付宝登录 (Alipay)</span>
              </button>

              {/* 分隔线 */}
              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-xs text-gray-400">or</span>
                </div>
              </div>

              {/* 邮箱登录链接 */}
              <button
                onClick={() => setLoginMethod('email')}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                Continue with Email
              </button>

              {/* 错误提示 */}
              {error && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* 非托管提示 */}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong className="text-gray-900">Non-custodial:</strong> Protocol Bank does not store your private keys or recovery phrases. You are fully responsible for securing your wallet.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-lg">
              <p className="text-xs text-gray-500 text-center">
                By connecting, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </>
        )}

        {/* 邮箱登录页面 */}
        {loginMethod === 'email' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <button
                  onClick={() => {
                    setLoginMethod('main')
                    setError('')
                    setEmail('')
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-2"
                >
                  ← Back
                </button>
                <h2 className="text-xl font-semibold text-gray-900">Email Login</h2>
                <p className="text-sm text-gray-500 mt-1">A new wallet will be created for you</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleEmailLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  required
                />
              </div>

              {/* 重要提示 */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800 leading-relaxed">
                    <strong>Important:</strong> You will receive a 12-word recovery phrase. 
                    <strong className="block mt-1">We do NOT store this phrase.</strong> 
                    You must save it securely - it's the only way to recover your wallet.
                  </div>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Wallet...' : 'Create Wallet & Login'}
              </button>
            </form>
          </>
        )}

        {/* 助记词显示页面 */}
        {loginMethod === 'mnemonic' && generatedWallet && (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Save Your Recovery Phrase</h2>
              <p className="text-sm text-gray-500 mt-1">This is the ONLY way to recover your wallet</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* 警告 */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800 leading-relaxed">
                    <strong className="block mb-1">⚠️ Critical Security Notice</strong>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>We do NOT store your recovery phrase</li>
                      <li>Write it down on paper and store it safely</li>
                      <li>Never share it with anyone</li>
                      <li>If you lose it, your funds are lost forever</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 助记词显示 */}
              <div className="relative">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {generatedWallet.mnemonic.split(' ').map((word, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-white border border-gray-200 rounded">
                        <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
                        <span className="text-sm font-mono text-gray-900">{word}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={copyMnemonic}
                    className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy to Clipboard</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 钱包地址 */}
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Your Wallet Address:</p>
                <p className="text-sm font-mono text-gray-900 break-all">{generatedWallet.address}</p>
              </div>

              {/* 确认按钮 */}
              <button
                onClick={handleConfirmMnemonic}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-lg transition-colors"
              >
                I've Saved My Recovery Phrase
              </button>

              {/* 底部提示 */}
              <p className="text-xs text-center text-gray-500">
                Make sure you've written down or copied your recovery phrase before continuing
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

