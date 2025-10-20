"use client"

import { useReadContract } from "wagmi"
import { useChainId } from "wagmi"
import { REPUTATION_DATA_FEED_ABI } from "../abis"
import { getContractAddress } from "../addresses"

// Get aggregated buyer statistics
export function useAggregatedBuyerStats(address?: `0x${string}`) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("REPUTATION_DATA_FEED", chainId)

  return useReadContract({
    address: contractAddress,
    abi: REPUTATION_DATA_FEED_ABI,
    functionName: "getBuyerStat",
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address,
    },
  })
}

// Get aggregated creator statistics
export function useAggregatedCreatorStats(address?: `0x${string}`) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("REPUTATION_DATA_FEED", chainId)

  return useReadContract({
    address: contractAddress,
    abi: REPUTATION_DATA_FEED_ABI,
    functionName: "getCreatorStat",
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address,
    },
  })
}
