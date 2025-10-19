/**
 * 获取网络名称
 * @param chainId - 链 ID
 * @returns 网络名称
 */
export const getNetworkName = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return 'Etherscan'
    case 11155111:
      return 'Sepolia Etherscan'
    case 137:
      return 'Polygonscan'
    case 56:
      return 'BSCScan'
    case 43114:
      return 'Snowtrace'
    case 42161:
      return 'Arbiscan'
    case 10:
      return 'Optimistic Etherscan'
    default:
      return 'Block Explorer'
  }
}

/**
 * 获取区块浏览器 URL
 * @param chainId - 链 ID
 * @returns 区块浏览器 URL
 */
export const getExplorerUrl = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return 'https://etherscan.io/tx/'
    case 11155111:
      return 'https://sepolia.etherscan.io/tx/'
    case 137:
      return 'https://polygonscan.com/tx/'
    case 56:
      return 'https://bscscan.com/tx/'
    case 43114:
      return 'https://snowtrace.io/tx/'
    case 42161:
      return 'https://arbiscan.io/tx/'
    case 10:
      return 'https://optimistic.etherscan.io/tx/'
    default:
      return '#'
  }
}