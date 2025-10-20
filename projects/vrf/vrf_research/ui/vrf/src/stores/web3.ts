import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import { ethers, BrowserProvider, Contract } from 'ethers'

// Store contract outside reactive system
let contractInstance: Contract | null = null

export const useWeb3Store = defineStore('web3', () => {
  const provider = ref<BrowserProvider | null>(null)
  const signer = ref<ethers.Signer | null>(null)
  const account = ref<string>('')
  const chainId = ref<number>(0)
  const contractAddress = ref<string>('')
  const isContractInitialized = ref(false)

  const isConnected = computed(() => !!account.value)

  async function connectWallet() {
    if (!window.ethereum) {
      alert('Please install MetaMask!')
      return
    }

    try {
      const browserProvider = new BrowserProvider(window.ethereum)
      provider.value = browserProvider

      const accounts = await browserProvider.send('eth_requestAccounts', [])
      account.value = accounts[0]

      const network = await browserProvider.getNetwork()
      chainId.value = Number(network.chainId)

      signer.value = await browserProvider.getSigner()

      // Listen for account changes
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0 && accounts[0]) {
            account.value = accounts[0]
          } else {
            disconnectWallet()
          }
        })
      }

      // Listen for chain changes
      if (window.ethereum) {
        window.ethereum.on('chainChanged', () => {
          window.location.reload()
        })
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      throw error
    }
  }

  function disconnectWallet() {
    provider.value = null
    signer.value = null
    account.value = ''
    chainId.value = 0
    contractInstance = null
    isContractInitialized.value = false
  }

  function setContract(address: string, abi: any) {
    if (!signer.value) {
      throw new Error('Wallet not connected')
    }
    contractAddress.value = address
    // Ensure ABI is an array - handle Hardhat artifact format
    let contractAbi: any[]
    if (Array.isArray(abi)) {
      contractAbi = abi
    } else if (abi.abi && Array.isArray(abi.abi)) {
      contractAbi = abi.abi
    } else {
      throw new Error('Invalid ABI format')
    }
    
    console.log('Initializing contract with ABI:', contractAbi)
    contractInstance = new Contract(address, contractAbi, signer.value)
    isContractInitialized.value = true
    console.log('Contract initialized successfully')
  }

  function getContract(): Contract | null {
    return contractInstance
  }

  return {
    provider,
    signer,
    account,
    chainId,
    contractAddress,
    isContractInitialized,
    isConnected,
    connectWallet,
    disconnectWallet,
    setContract,
    getContract
  }
})
