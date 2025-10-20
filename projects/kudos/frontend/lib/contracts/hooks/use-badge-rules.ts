"use client"

import { useReadContract } from "wagmi"
import { useChainId } from "wagmi"
import { BADGE_RULE_REGISTRY_ABI } from "../abis"
import { getContractAddress } from "../addresses"

// Get a specific badge rule
export function useBadgeRule(ruleId?: bigint) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("BADGE_RULE_REGISTRY", chainId)

  return useReadContract({
    address: contractAddress,
    abi: BADGE_RULE_REGISTRY_ABI,
    functionName: "getRule",
    args: ruleId !== undefined ? [ruleId] : undefined,
    query: {
      enabled: !!contractAddress && ruleId !== undefined,
    },
  })
}

// Get total number of rules
export function useBadgeRuleCount() {
  const chainId = useChainId()
  const contractAddress = getContractAddress("BADGE_RULE_REGISTRY", chainId)

  return useReadContract({
    address: contractAddress,
    abi: BADGE_RULE_REGISTRY_ABI,
    functionName: "ruleCount",
    query: {
      enabled: !!contractAddress,
    },
  })
}

// Check if a rule exists
export function useRuleExists(ruleId?: bigint) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("BADGE_RULE_REGISTRY", chainId)

  return useReadContract({
    address: contractAddress,
    abi: BADGE_RULE_REGISTRY_ABI,
    functionName: "ruleExists",
    args: ruleId !== undefined ? [ruleId] : undefined,
    query: {
      enabled: !!contractAddress && ruleId !== undefined,
    },
  })
}

// Get rule ID at index
export function useRuleIdAt(index?: bigint) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("BADGE_RULE_REGISTRY", chainId)

  return useReadContract({
    address: contractAddress,
    abi: BADGE_RULE_REGISTRY_ABI,
    functionName: "ruleIdAt",
    args: index !== undefined ? [index] : undefined,
    query: {
      enabled: !!contractAddress && index !== undefined,
    },
  })
}

// Get all badge rules (by querying count and then each rule)
export function useAllBadgeRules() {
  const { data: count } = useBadgeRuleCount()
  const chainId = useChainId()
  const contractAddress = getContractAddress("BADGE_RULE_REGISTRY", chainId)

  // This would need to be implemented with multiple queries or a custom hook
  // For now, return the count so components can query individual rules
  return {
    count,
    contractAddress,
  }
}
