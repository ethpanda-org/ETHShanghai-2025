import { formatEther, parseEther, formatUnits, parseUnits } from "viem"

// 格式化 ETH 金额
export function formatEthAmount(value: bigint, decimals = 4): string {
  const formatted = formatEther(value)
  const num = Number.parseFloat(formatted)
  return num.toFixed(decimals)
}

// 解析 ETH 金额
export function parseEthAmount(value: string): bigint {
  return parseEther(value)
}

// 格式化代币金额
export function formatTokenAmount(value: bigint, decimals = 18, displayDecimals = 4): string {
  const formatted = formatUnits(value, decimals)
  const num = Number.parseFloat(formatted)
  return num.toFixed(displayDecimals)
}

// 解析代币金额
export function parseTokenAmount(value: string, decimals = 18): bigint {
  return parseUnits(value, decimals)
}

// 缩短地址显示
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return ""
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

// 格式化交易哈希
export function formatTxHash(hash: string, chars = 6): string {
  if (!hash) return ""
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`
}

// 获取区块浏览器链接
export function getExplorerUrl(chainId: number, type: "tx" | "address" | "token", value: string): string {
  const explorers: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io", // Sepolia
    137: "https://polygonscan.com",
    80002: "https://amoy.polygonscan.com", // Polygon Amoy
    56: "https://bscscan.com",
    97: "https://testnet.bscscan.com", // BSC Testnet
    42161: "https://arbiscan.io",
    10: "https://optimistic.etherscan.io",
    8453: "https://basescan.org",
  }

  const baseUrl = explorers[chainId] || explorers[1]

  switch (type) {
    case "tx":
      return `${baseUrl}/tx/${value}`
    case "address":
      return `${baseUrl}/address/${value}`
    case "token":
      return `${baseUrl}/token/${value}`
    default:
      return baseUrl
  }
}

// 检查是否为有效的以太坊地址
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// 等待交易确认的辅助函数
export async function waitForTransaction(hash: `0x${string}`, confirmations = 1) {
  // 这个函数在实际使用中会通过 wagmi 的 useWaitForTransactionReceipt hook 来实现
  // 这里只是提供类型定义和接口
  return {
    hash,
    confirmations,
  }
}
