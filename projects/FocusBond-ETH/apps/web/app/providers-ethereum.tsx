'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ethers } from 'ethers'

interface EthereumContextType {
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  account: string | null
  connect: () => Promise<void>
  disconnect: () => void
  isConnected: boolean
}

const EthereumContext = createContext<EthereumContextType | undefined>(undefined)

export function useEthereum() {
  const context = useContext(EthereumContext)
  if (context === undefined) {
    throw new Error('useEthereum must be used within an EthereumProvider')
  }
  return context
}

interface EthereumProviderProps {
  children: ReactNode
}

export function EthereumProvider({ children }: EthereumProviderProps) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Check if already connected
    if (typeof window !== 'undefined' && window.ethereum) {
      checkConnection()
    }
  }, [])

  const checkConnection = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.listAccounts()
      
      if (accounts.length > 0) {
        const signer = await provider.getSigner()
        setProvider(provider)
        setSigner(signer)
        setAccount(accounts[0].address)
        setIsConnected(true)
      }
    } catch (error) {
      console.error('Error checking connection:', error)
    }
  }

  const connect = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not detected')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      
      // Request account access
      await provider.send("eth_requestAccounts", [])
      
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      
      setProvider(provider)
      setSigner(signer)
      setAccount(address)
      setIsConnected(true)
    } catch (error) {
      console.error('Error connecting to MetaMask:', error)
      throw error
    }
  }

  const disconnect = () => {
    setProvider(null)
    setSigner(null)
    setAccount(null)
    setIsConnected(false)
  }

  return (
    <EthereumContext.Provider
      value={{
        provider,
        signer,
        account,
        connect,
        disconnect,
        isConnected,
      }}
    >
      {children}
    </EthereumContext.Provider>
  )
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any
  }
}
