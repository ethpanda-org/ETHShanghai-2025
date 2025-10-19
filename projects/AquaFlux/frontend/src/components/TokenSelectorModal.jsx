import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useBalance, useReadContract } from 'wagmi'
import { isValidTokenAddress, formatTokenAmount } from '../constants/tokens'
import { useTokenList } from '../hooks/useTokenList'
import { cx } from '../utils/helpers'

// ERC20 ABI for token info and balance
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
]

// Token item with balance component
function TokenItem({ token, onSelect, isCustom = false, balance }) {
  // 使用改进后的 formatTokenAmount 函数
  const displayBalance = useMemo(() => {
    return formatTokenAmount(balance, token?.decimals || 18, 6)
  }, [balance, token?.decimals])

  return (
    <div
      className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors duration-200 border-b border-slate-100 last:border-b-0"
      onClick={() => onSelect(token)}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
          {token.symbol.slice(0, 2)}
        </div>
        <div>
          <div className="font-medium text-slate-900">{token.symbol}</div>
          <div className="text-sm text-slate-600">{token.name}</div>
          {isCustom && (
            <div className="text-xs text-slate-500 font-mono">
              {token.address.slice(0, 6)}...{token.address.slice(-4)}
            </div>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium text-slate-900">{displayBalance}</div>
        {isCustom && (
          <div className="text-xs text-blue-600 font-medium">Custom Token</div>
        )}
      </div>
    </div>
  )
}

// Custom token info hook using wagmi v2
function useCustomTokenInfo(tokenAddress) {
  const { address: userAddress } = useAccount()

  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'name',
    query: { enabled: !!tokenAddress && isValidTokenAddress(tokenAddress) }
  })

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress && isValidTokenAddress(tokenAddress) }
  })

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress && isValidTokenAddress(tokenAddress) }
  })

  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
    query: { enabled: !!tokenAddress && !!userAddress && isValidTokenAddress(tokenAddress) }
  })

  return useMemo(() => {
    if (!tokenAddress || !name || !symbol || decimals === undefined) {
      return { token: null, balance: null, isLoading: false, error: null }
    }

    const token = {
      chainId: 11155111, // Sepolia
      address: tokenAddress,
      name: name,
      symbol: symbol,
      decimals: Number(decimals),
      logoURI: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${tokenAddress}/logo.png`
    }

    return {
      token,
      balance: balance ? balance.toString() : '0',
      isLoading: false,
      error: null
    }
  }, [tokenAddress, name, symbol, decimals, balance])
}

// Token balance hook
function useTokenBalance(token) {
  const { address: userAddress } = useAccount()

  // For ETH (native token)
  const { data: ethBalance } = useBalance({
    address: userAddress,
    query: { enabled: !!userAddress && token?.symbol === 'ETH' }
  })

  // For ERC20 tokens
  const { data: erc20Balance } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
    query: {
      enabled: !!userAddress && !!token && token.symbol !== 'ETH' && isValidTokenAddress(token.address)
    }
  })

  return useMemo(() => {
    if (token?.symbol === 'ETH') {
      return ethBalance?.formatted || '0'
    }

    if (erc20Balance) {
      // 直接返回原始字符串，让 TokenItem 处理格式化
      return erc20Balance.toString()
    }

    return '0'
  }, [token, ethBalance, erc20Balance])
}

export default function TokenSelectorModal({ isOpen, onClose, onSelectToken, selectedToken }) {
  // 使用 useTokenList hook
  const {
    allTokens,
    popularTokens,
    filteredTokens,
    searchQuery,
    setSearchQuery,
    addCustomToken,
    removeCustomToken,
    isTokenAdded,
    isCustomToken
  } = useTokenList()

  // Get custom token info if search looks like an address
  const { token: customToken, balance: customBalance, error: customError } = useCustomTokenInfo(
    isValidTokenAddress(searchQuery) ? searchQuery : null
  )

  // Handle token selection
  const handleTokenSelect = (token) => {
    onSelectToken(token)
    onClose()
    setSearchQuery('')
  }

  // Handle adding custom token
  const handleAddCustomToken = () => {
    if (customToken && !isTokenAdded(customToken.address)) {
      const success = addCustomToken(customToken)
      if (success) {
        handleTokenSelect(customToken)
      }
    } else if (customToken) {
      handleTokenSelect(customToken)
    }
  }

  // Handle removing custom token
  const handleRemoveCustomToken = (address, event) => {
    event.stopPropagation() // 阻止事件冒泡
    removeCustomToken(address)
  }

  // Handle popular token click
  const handlePopularTokenClick = (token) => {
    handleTokenSelect(token)
  }

  // Handle search change
  const handleSearchChange = (value) => {
    setSearchQuery(value)
  }

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Clear search on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen, setSearchQuery])

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={handleOverlayClick}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">Select Token</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors duration-200"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search name, symbol or paste address"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-200"
            />
          </div>
        </div>

        {/* Custom Token Display */}
        {customToken && (
          <div className="p-4 border-b border-slate-200 bg-blue-50">
            <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {customToken.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="font-medium text-slate-900">{customToken.symbol}</div>
                  <div className="text-sm text-slate-600">{customToken.name}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    {customToken.address.slice(0, 6)}...{customToken.address.slice(-4)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleAddCustomToken}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors duration-200"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {customError && (
          <div className="p-4 border-b border-slate-200">
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              {customError}
            </div>
          </div>
        )}

        {/* Popular Tokens */}
        {!searchQuery && (
          <div className="p-4 border-b border-slate-200">
            <div className="text-sm font-medium text-slate-700 mb-3">Popular Tokens</div>
            <div className="grid grid-cols-4 gap-2">
              {popularTokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => handlePopularTokenClick(token)}
                  className={cx(
                    "p-2 rounded-xl border text-sm font-medium transition-all duration-200",
                    selectedToken?.address === token.address
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 hover:border-blue-400 hover:bg-blue-50"
                  )}
                >
                  {token.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Token List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTokens.map((token) => (
            <TokenItemWithBalance
              key={token.address}
              token={token}
              onSelect={handleTokenSelect}
              isCustom={isCustomToken(token.address)}
              onRemove={handleRemoveCustomToken}
            />
          ))}

          {filteredTokens.length === 0 && searchQuery && !customToken && (
            <div className="p-8 text-center text-slate-500">
              <div className="text-lg font-medium mb-2">No tokens found</div>
              <div className="text-sm">
                Try searching with a different term or paste a token contract address
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

// Wrapper component that adds balance to TokenItem
function TokenItemWithBalance({ token, onSelect, isCustom, onRemove }) {
  const balance = useTokenBalance(token)

  return (
    <div className="relative group">
      <TokenItem
        token={token}
        onSelect={onSelect}
        isCustom={isCustom}
        balance={balance}
      />
      {isCustom && onRemove && (
        <button
          onClick={(e) => onRemove(token.address, e)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-xs"
          title="Remove custom token"
        >
          ×
        </button>
      )}
    </div>
  )
}