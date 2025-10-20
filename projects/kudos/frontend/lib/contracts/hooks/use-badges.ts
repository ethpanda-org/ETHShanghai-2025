"use client"

import { useReadContract, useWatchContractEvent } from "wagmi"
import { useAccount, useChainId } from "wagmi"
import { REPUTATION_BADGE_ABI } from "../abis"
import { getContractAddress } from "../addresses"
import { toast } from "sonner"

// Check if user has a specific badge
export function useHasBadge(address?: `0x${string}`, ruleId?: bigint) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("REPUTATION_BADGE", chainId)

  return useReadContract({
    address: contractAddress,
    abi: REPUTATION_BADGE_ABI,
    functionName: "hasBadge",
    args: address && ruleId !== undefined ? [address, ruleId] : undefined,
    query: {
      enabled: !!contractAddress && !!address && ruleId !== undefined,
    },
  })
}

// Get all badges for a user
export function useUserBadges(address?: `0x${string}`) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("REPUTATION_BADGE", chainId)

  return useReadContract({
    address: contractAddress,
    abi: REPUTATION_BADGE_ABI,
    functionName: "badgesOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address,
    },
  })
}

// Get badge metadata URI
export function useBadgeURI(badgeId?: bigint) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("REPUTATION_BADGE", chainId)

  return useReadContract({
    address: contractAddress,
    abi: REPUTATION_BADGE_ABI,
    functionName: "badgeURI",
    args: badgeId !== undefined ? [badgeId] : undefined,
    query: {
      enabled: !!contractAddress && badgeId !== undefined,
    },
  })
}

// Get total supply of a badge type
export function useBadgeTotalSupply(ruleId?: bigint) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("REPUTATION_BADGE", chainId)

  return useReadContract({
    address: contractAddress,
    abi: REPUTATION_BADGE_ABI,
    functionName: "totalSupply",
    args: ruleId !== undefined ? [ruleId] : undefined,
    query: {
      enabled: !!contractAddress && ruleId !== undefined,
    },
  })
}

// Get user's total badge count
export function useBadgeBalance(address?: `0x${string}`) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("REPUTATION_BADGE", chainId)

  return useReadContract({
    address: contractAddress,
    abi: REPUTATION_BADGE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address,
    },
  })
}

// Watch for badge minted events
export function useWatchBadgeMinted(onBadgeMinted?: (account: `0x${string}`, ruleId: bigint, badgeId: bigint) => void) {
  const chainId = useChainId()
  const address = getContractAddress("REPUTATION_BADGE", chainId)
  const { address: userAddress } = useAccount()

  useWatchContractEvent({
    address,
    abi: REPUTATION_BADGE_ABI,
    eventName: "BadgeMinted",
    onLogs(logs) {
      logs.forEach((log) => {
        const { account, ruleId, badgeId, metadataURI } = log.args
        console.log("[v0] Badge minted:", { account, ruleId, badgeId, metadataURI })

        if (account === userAddress) {
          toast.success("🎉 恭喜获得新徽章！", {
            description: "查看您的个人资料以了解详情",
          })
          onBadgeMinted?.(account, ruleId, badgeId)
        }
      })
    },
  })
}
