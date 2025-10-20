import { ethers } from 'ethers'

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, callback: (...args: any[]) => void) => void
      removeListener: (event: string, callback: (...args: any[]) => void) => void
      selectedAddress?: string
    }
  }
}

export {}
