"use client"

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from "wagmi"
import { useAccount, useChainId } from "wagmi"
import { IDENTITY_TOKEN_ABI } from "../abis"
import { getContractAddress } from "../addresses"
import { toast } from "sonner"

// Check if user has identity NFT
export function useHasIdentity(address?: `0x${string}`) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("IDENTITY_TOKEN", chainId)

  return useReadContract({
    address: contractAddress,
    abi: IDENTITY_TOKEN_ABI,
    functionName: "hasIdentity",
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address,
    },
  })
}

// Get user's identity token ID
export function useIdentityTokenId(address?: `0x${string}`) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("IDENTITY_TOKEN", chainId)

  return useReadContract({
    address: contractAddress,
    abi: IDENTITY_TOKEN_ABI,
    functionName: "tokenIdOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address,
    },
  })
}

// Get identity token URI (metadata)
export function useIdentityTokenURI(tokenId?: bigint) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("IDENTITY_TOKEN", chainId)

  return useReadContract({
    address: contractAddress,
    abi: IDENTITY_TOKEN_ABI,
    functionName: "tokenURI",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: !!contractAddress && tokenId !== undefined,
    },
  })
}

// Mint identity NFT for self
export function useMintIdentity() {
  const chainId = useChainId()
  const address = getContractAddress("IDENTITY_TOKEN", chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const mintIdentity = async (metadataURI: string) => {
    if (!address) throw new Error("Identity contract not deployed on this network")

    console.log("[v0] Minting identity NFT with metadata:", metadataURI)

    return writeContract({
      address,
      abi: IDENTITY_TOKEN_ABI,
      functionName: "mintSelf",
      args: [metadataURI],
    })
  }

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    mintIdentity,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Watch for identity minted events
export function useWatchIdentityMinted(onMinted?: (account: `0x${string}`, tokenId: bigint) => void) {
  const chainId = useChainId()
  const address = getContractAddress("IDENTITY_TOKEN", chainId)
  const { address: userAddress } = useAccount()

  useWatchContractEvent({
    address,
    abi: IDENTITY_TOKEN_ABI,
    eventName: "IdentityMinted",
    onLogs(logs) {
      logs.forEach((log) => {
        const { account, tokenId, metadataURI } = log.args
        console.log("[v0] Identity minted:", { account, tokenId, metadataURI })

        if (account === userAddress) {
          toast.success("身份 NFT 铸造成功！")
          onMinted?.(account, tokenId)
        }
      })
    },
  })
}
