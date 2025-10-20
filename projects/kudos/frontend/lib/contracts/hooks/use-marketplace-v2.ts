"use client"

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useSignTypedData,
} from "wagmi"
import { useAccount, useChainId } from "wagmi"
import { MARKETPLACE_V2_ABI } from "../abis"
import { getContractAddress } from "../addresses"
import { keccak256, encodePacked } from "viem"
import { toast } from "sonner"

// Get work information
export function useGetWork(workId?: `0x${string}`) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("MARKETPLACE_V2", chainId)

  return useReadContract({
    address: contractAddress,
    abi: MARKETPLACE_V2_ABI,
    functionName: "getWork",
    args: workId ? [workId] : undefined,
    query: {
      enabled: !!contractAddress && !!workId,
    },
  })
}

// Get buyer statistics
export function useBuyerStats(address?: `0x${string}`) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("MARKETPLACE_V2", chainId)

  return useReadContract({
    address: contractAddress,
    abi: MARKETPLACE_V2_ABI,
    functionName: "getBuyerStat",
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address,
    },
  })
}

// Get creator statistics
export function useCreatorStats(address?: `0x${string}`) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("MARKETPLACE_V2", chainId)

  return useReadContract({
    address: contractAddress,
    abi: MARKETPLACE_V2_ABI,
    functionName: "getCreatorStat",
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address,
    },
  })
}

// Get eligible badge rules for user
export function useEligibleRules(address?: `0x${string}`, target?: 0 | 1) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("MARKETPLACE_V2", chainId)

  return useReadContract({
    address: contractAddress,
    abi: MARKETPLACE_V2_ABI,
    functionName: "getEligibleRules",
    args: address && target !== undefined ? [address, target] : undefined,
    query: {
      enabled: !!contractAddress && !!address && target !== undefined,
    },
  })
}

// Generate EIP-712 signature for listing
export function useListWorkSignature() {
  const { signTypedDataAsync } = useSignTypedData()
  const chainId = useChainId()
  const marketplaceAddress = getContractAddress("MARKETPLACE_V2", chainId)

  return async (workData: {
    creator: `0x${string}`
    price: bigint
    nonce: bigint
    metadataURI: string
  }) => {
    if (!marketplaceAddress) throw new Error("Marketplace not deployed")

    const domain = {
      name: "Chaoci Marketplace",
      version: "1",
      chainId,
      verifyingContract: marketplaceAddress,
    }

    const types = {
      Listing: [
        { name: "creator", type: "address" },
        { name: "price", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "metadataURI", type: "string" },
      ],
    }

    console.log("[v0] Signing listing data:", workData)

    const signature = await signTypedDataAsync({
      domain,
      types,
      primaryType: "Listing",
      message: workData,
    })

    console.log("[v0] Signature generated:", signature)
    return signature as `0x${string}`
  }
}

// List work on marketplace
export function useListWork() {
  const chainId = useChainId()
  const address = getContractAddress("MARKETPLACE_V2", chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const listWork = async (
    workId: `0x${string}`,
    listing: {
      creator: `0x${string}`
      price: bigint
      nonce: bigint
      metadataURI: string
    },
    signature: `0x${string}`,
  ) => {
    if (!address) throw new Error("Marketplace not deployed on this network")

    console.log("[v0] Listing work:", { workId, listing, signature })

    return writeContract({
      address,
      abi: MARKETPLACE_V2_ABI,
      functionName: "listWork",
      args: [workId, listing, signature],
    })
  }

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    listWork,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Purchase work
export function usePurchaseWork() {
  const chainId = useChainId()
  const address = getContractAddress("MARKETPLACE_V2", chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const purchase = async (workId: `0x${string}`) => {
    if (!address) throw new Error("Marketplace not deployed on this network")

    console.log("[v0] Purchasing work:", workId)

    return writeContract({
      address,
      abi: MARKETPLACE_V2_ABI,
      functionName: "purchase",
      args: [workId],
    })
  }

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    purchase,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Watch for work listed events
export function useWatchWorkListed(onWorkListed?: (workId: `0x${string}`, creator: `0x${string}`) => void) {
  const chainId = useChainId()
  const address = getContractAddress("MARKETPLACE_V2", chainId)
  const { address: userAddress } = useAccount()

  useWatchContractEvent({
    address,
    abi: MARKETPLACE_V2_ABI,
    eventName: "WorkListed",
    onLogs(logs) {
      logs.forEach((log) => {
        const { workId, creator, price, metadataURI } = log.args
        console.log("[v0] Work listed:", { workId, creator, price, metadataURI })

        if (creator === userAddress) {
          toast.success("作品上架成功！")
          onWorkListed?.(workId, creator)
        }
      })
    },
  })
}

// Watch for purchase completed events
export function useWatchPurchaseCompleted(onPurchase?: (workId: `0x${string}`, buyer: `0x${string}`) => void) {
  const chainId = useChainId()
  const address = getContractAddress("MARKETPLACE_V2", chainId)
  const { address: userAddress } = useAccount()

  useWatchContractEvent({
    address,
    abi: MARKETPLACE_V2_ABI,
    eventName: "PurchaseCompleted",
    onLogs(logs) {
      logs.forEach((log) => {
        const { workId, buyer, creator, amount } = log.args
        console.log("[v0] Purchase completed:", { workId, buyer, creator, amount })

        if (buyer === userAddress) {
          toast.success("购买成功！")
          onPurchase?.(workId, buyer)
        }
      })
    },
  })
}

// Watch for badge issued events (from marketplace)
export function useWatchBadgeIssuedFromMarketplace(onBadgeIssued?: (account: `0x${string}`, ruleId: bigint) => void) {
  const chainId = useChainId()
  const address = getContractAddress("MARKETPLACE_V2", chainId)
  const { address: userAddress } = useAccount()

  useWatchContractEvent({
    address,
    abi: MARKETPLACE_V2_ABI,
    eventName: "BadgeIssued",
    onLogs(logs) {
      logs.forEach((log) => {
        const { account, ruleId, badgeId } = log.args
        console.log("[v0] Badge issued from marketplace:", { account, ruleId, badgeId })

        if (account === userAddress) {
          toast.success("🎉 恭喜获得新徽章！", {
            description: "您的成就已被记录",
          })
          onBadgeIssued?.(account, ruleId)
        }
      })
    },
  })
}

// Generate work ID
export function generateWorkId(creator: `0x${string}`, nonce: bigint): `0x${string}` {
  const timestamp = BigInt(Date.now())
  return keccak256(encodePacked(["address", "uint256", "uint256"], [creator, timestamp, nonce]))
}
