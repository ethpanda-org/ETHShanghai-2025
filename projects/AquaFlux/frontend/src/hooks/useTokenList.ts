import { useState, useCallback, useMemo, useEffect } from 'react'
import { useChainId } from 'wagmi'
import { ALL_SEPOLIA_TOKENS, POPULAR_SEPOLIA_TOKENS, SEPOLIA_CHAIN_ID } from '../constants/tokens'
import { CustomTokenStorage } from '../utils/customTokenStorage'

// Types
interface Token {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

interface UseTokenListReturn {
  tokens: Token[]
  customTokens: Token[]
  allTokens: Token[]
  popularTokens: Token[]
  filteredTokens: Token[]
  searchQuery: string
  addCustomToken: (token: Token) => boolean
  removeCustomToken: (address: string) => boolean
  setSearchQuery: (query: string) => void
  isTokenAdded: (address: string) => boolean
  isCustomToken: (address: string) => boolean
  refreshCustomTokens: () => void
}

export const useTokenList = (): UseTokenListReturn => {
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [customTokens, setCustomTokens] = useState<Token[]>([])

  const chainId = useChainId()

  // 获取官方代币列表
  const tokens = useMemo(() => {
    // 只在 Sepolia 网络显示官方 token
    return chainId === SEPOLIA_CHAIN_ID ? ALL_SEPOLIA_TOKENS : []
  }, [chainId])

  // 从本地存储加载自定义代币
  const loadCustomTokens = useCallback(() => {
    if (!chainId) return

    const storedTokens = CustomTokenStorage.getByChainId(chainId)
    setCustomTokens(storedTokens.map(({ addedAt, ...token }: any) => token))
  }, [chainId])

  // 初始化和链切换时加载自定义代币
  useEffect(() => {
    loadCustomTokens()
  }, [loadCustomTokens])

  // 合并所有代币
  const allTokens = useMemo(() => {
    return [...tokens, ...customTokens]
  }, [tokens, customTokens])

  // 常用代币
  const popularTokens = useMemo(() => {
    return chainId === SEPOLIA_CHAIN_ID ? POPULAR_SEPOLIA_TOKENS : []
  }, [chainId])

  // 过滤代币列表
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return allTokens

    const query = searchQuery.toLowerCase()
    return allTokens.filter(token =>
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.address.toLowerCase().includes(query)
    )
  }, [allTokens, searchQuery])

  // 添加自定义代币
  const addCustomToken = useCallback((token: Token): boolean => {
    if (!chainId) return false

    const success = CustomTokenStorage.add({
      ...token,
      chainId
    })

    if (success) {
      loadCustomTokens() // 重新加载自定义代币列表
    }

    return success
  }, [chainId, loadCustomTokens])

  // 移除自定义代币
  const removeCustomToken = useCallback((address: string): boolean => {
    if (!chainId) return false

    const success = CustomTokenStorage.remove(address, chainId)

    if (success) {
      loadCustomTokens() // 重新加载自定义代币列表
    }

    return success
  }, [chainId, loadCustomTokens])

  // 检查代币是否已添加
  const isTokenAdded = useCallback((address: string): boolean => {
    if (!chainId) return false

    // 检查是否在官方代币列表中
    const isOfficialToken = tokens.some(token =>
      token.address.toLowerCase() === address.toLowerCase()
    )

    if (isOfficialToken) return true

    // 检查是否在自定义代币列表中
    return CustomTokenStorage.exists(address, chainId)
  }, [chainId, tokens])

  // 检查是否为自定义代币
  const isCustomToken = useCallback((address: string): boolean => {
    if (!chainId) return false
    return CustomTokenStorage.exists(address, chainId)
  }, [chainId])

  // 刷新自定义代币列表
  const refreshCustomTokens = useCallback(() => {
    loadCustomTokens()
  }, [loadCustomTokens])

  return {
    tokens,
    customTokens,
    allTokens,
    popularTokens,
    filteredTokens,
    searchQuery,
    addCustomToken,
    removeCustomToken,
    setSearchQuery,
    isTokenAdded,
    isCustomToken,
    refreshCustomTokens
  }
}