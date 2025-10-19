// Types
interface Token {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

interface StoredToken extends Token {
  addedAt: number
}

const CUSTOM_TOKENS_KEY = 'sepolia_custom_tokens'

/**
 * 自定义代币本地存储管理器
 */
export class CustomTokenStorage {
  /**
   * 获取所有存储的自定义代币
   */
  static getAll(): StoredToken[] {
    try {
      const stored = localStorage.getItem(CUSTOM_TOKENS_KEY)
      if (!stored) return []

      const tokens: StoredToken[] = JSON.parse(stored)
      return tokens.sort((a, b) => b.addedAt - a.addedAt) // 按添加时间倒序
    } catch (error) {
      console.error('读取自定义代币失败:', error)
      return []
    }
  }

  /**
   * 获取指定链的自定义代币
   */
  static getByChainId(chainId: number): StoredToken[] {
    return this.getAll().filter(token => token.chainId === chainId)
  }

  /**
   * 添加自定义代币
   */
  static add(token: Token): boolean {
    try {
      const existingTokens = this.getAll()

      // 检查是否已存在
      const exists = existingTokens.some(t =>
        t.chainId === token.chainId &&
        t.address.toLowerCase() === token.address.toLowerCase()
      )

      if (exists) {
        console.warn('代币已存在:', token.symbol)
        return false
      }

      const storedToken: StoredToken = {
        ...token,
        addedAt: Date.now()
      }

      const updatedTokens = [storedToken, ...existingTokens]
      localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(updatedTokens))

      console.log('✅ 代币已添加到本地存储:', token.symbol)
      return true
    } catch (error) {
      console.error('❌ 保存自定义代币失败:', error)
      return false
    }
  }

  /**
   * 删除自定义代币
   */
  static remove(address: string, chainId: number): boolean {
    try {
      const existingTokens = this.getAll()
      const filteredTokens = existingTokens.filter(token =>
        !(token.chainId === chainId && token.address.toLowerCase() === address.toLowerCase())
      )

      localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(filteredTokens))
      console.log('✅ 代币已从本地存储删除:', address)
      return true
    } catch (error) {
      console.error('❌ 删除自定义代币失败:', error)
      return false
    }
  }

  /**
   * 检查代币是否已添加
   */
  static exists(address: string, chainId: number): boolean {
    const tokens = this.getAll()
    return tokens.some(token =>
      token.chainId === chainId &&
      token.address.toLowerCase() === address.toLowerCase()
    )
  }

  /**
   * 获取单个代币信息
   */
  static get(address: string, chainId: number): StoredToken | null {
    const tokens = this.getAll()
    return tokens.find(token =>
      token.chainId === chainId &&
      token.address.toLowerCase() === address.toLowerCase()
    ) || null
  }

  /**
   * 清空所有自定义代币（谨慎使用）
   */
  static clear(): boolean {
    try {
      localStorage.removeItem(CUSTOM_TOKENS_KEY)
      console.log('✅ 所有自定义代币已清空')
      return true
    } catch (error) {
      console.error('❌ 清空自定义代币失败:', error)
      return false
    }
  }
}