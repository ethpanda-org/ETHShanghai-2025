import { ref, computed } from 'vue'
import { ethers, BrowserProvider, Contract } from 'ethers'

// Store contract and provider outside reactive system
let contractInstance: Contract | null = null
let providerInstance: BrowserProvider | null = null
let signerInstance: ethers.Signer | null = null

const account = ref<string>('')
const chainId = ref<number>(0)
const contractAddress = ref<string>('')
const isContractInitialized = ref(false)

const isConnected = computed(() => !!account.value)

export function useWeb3() {
  async function connectWallet() {
    if (!window.ethereum) {
      alert('Please install MetaMask!')
      return
    }

    try {
      providerInstance = new BrowserProvider(window.ethereum)

      const accounts = await providerInstance.send('eth_requestAccounts', [])
      account.value = accounts[0]

      const network = await providerInstance.getNetwork()
      chainId.value = Number(network.chainId)

      signerInstance = await providerInstance.getSigner()

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
    providerInstance = null
    signerInstance = null
    account.value = ''
    chainId.value = 0
    contractInstance = null
    isContractInitialized.value = false
  }

  function setContract(address: string, abi: any) {
    if (!signerInstance) {
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
    contractInstance = new Contract(address, contractAbi, signerInstance)
    isContractInitialized.value = true
    console.log('Contract initialized successfully')
  }

  function getContract(): Contract | null {
    return contractInstance
  }

  function getProvider(): BrowserProvider | null {
    return providerInstance
  }

  function getSigner(): ethers.Signer | null {
    return signerInstance
  }

  return {
    account,
    chainId,
    contractAddress,
    isContractInitialized,
    isConnected,
    connectWallet,
    disconnectWallet,
    setContract,
    getContract,
    getProvider,
    getSigner
  }
}
