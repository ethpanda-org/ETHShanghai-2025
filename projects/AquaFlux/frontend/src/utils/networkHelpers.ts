/**
 * Network utility functions for blockchain interactions
 */

/**
 * Get network name from chain ID
 * @param chainId - The blockchain chain ID
 * @returns The display name for the blockchain explorer
 */
export const getNetworkName = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return 'Etherscan'
    case 56:
      return 'BscScan'
    case 97:
      return 'BscScan Testnet'
    case 688688:
      return 'Pharosscan'
    default:
      return 'Block Explorer'
  }
}

/**
 * Get block explorer URL from chain ID
 * @param chainId - The blockchain chain ID
 * @returns The base URL for the blockchain explorer transaction page
 */
export const getExplorerUrl = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return 'https://etherscan.io/tx/'
    case 56:
      return 'https://bscscan.com/tx/'
    case 97:
      return 'https://testnet.bscscan.com/tx/'
    case 688688:
      return 'https://testnet.pharosscan.xyz/tx/'
    default:
      return 'https://testnet.bscscan.com/tx/' // fallback
  }
}

/**
 * Get full explorer URL for a specific transaction
 * @param chainId - The blockchain chain ID
 * @param txHash - The transaction hash
 * @returns The complete URL to view the transaction
 */
export const getTransactionUrl = (chainId: number, txHash: string): string => {
  return `${getExplorerUrl(chainId)}${txHash}`
}