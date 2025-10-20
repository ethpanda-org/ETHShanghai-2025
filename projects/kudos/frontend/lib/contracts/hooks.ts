import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { useAccount, useChainId } from "wagmi"
import { CHAOCI_PLATFORM_ABI, BUSINESS_CARD_NFT_ABI, SBT_ABI, MARKETPLACE_ABI, ERC20_ABI } from "./abis"
import { getContractAddress } from "./addresses"
import { parseEther } from "viem"

// 读取内容信息
export function useGetContent(contentId: bigint) {
  const chainId = useChainId()
  const address = getContractAddress("CHAOCI_PLATFORM", chainId)

  return useReadContract({
    address,
    abi: CHAOCI_PLATFORM_ABI,
    functionName: "getContent",
    args: [contentId],
    query: {
      enabled: !!address,
    },
  })
}

// 检查用户是否已购买内容
export function useHasPurchased(contentId: bigint) {
  const chainId = useChainId()
  const { address: userAddress } = useAccount()
  const contractAddress = getContractAddress("CHAOCI_PLATFORM", chainId)

  return useReadContract({
    address: contractAddress,
    abi: CHAOCI_PLATFORM_ABI,
    functionName: "hasPurchased",
    args: userAddress && contentId ? [userAddress, contentId] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// 获取创作者收益
export function useGetCreatorEarnings() {
  const chainId = useChainId()
  const { address: userAddress } = useAccount()
  const contractAddress = getContractAddress("CHAOCI_PLATFORM", chainId)

  return useReadContract({
    address: contractAddress,
    abi: CHAOCI_PLATFORM_ABI,
    functionName: "getCreatorEarnings",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// 创建内容
export function useCreateContent() {
  const chainId = useChainId()
  const address = getContractAddress("CHAOCI_PLATFORM", chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const createContent = async (contentId: bigint, price: string, metadataURI: string) => {
    if (!address) throw new Error("Contract not deployed on this network")

    return writeContract({
      address,
      abi: CHAOCI_PLATFORM_ABI,
      functionName: "createContent",
      args: [contentId, parseEther(price), metadataURI],
    })
  }

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    createContent,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// 购买内容
export function usePurchaseContent() {
  const chainId = useChainId()
  const address = getContractAddress("CHAOCI_PLATFORM", chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const purchaseContent = async (contentId: bigint, price: string) => {
    if (!address) throw new Error("Contract not deployed on this network")

    return writeContract({
      address,
      abi: CHAOCI_PLATFORM_ABI,
      functionName: "purchaseContent",
      args: [contentId],
      value: parseEther(price),
    })
  }

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    purchaseContent,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// 提取收益
export function useWithdrawEarnings() {
  const chainId = useChainId()
  const address = getContractAddress("CHAOCI_PLATFORM", chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const withdrawEarnings = async () => {
    if (!address) throw new Error("Contract not deployed on this network")

    return writeContract({
      address,
      abi: CHAOCI_PLATFORM_ABI,
      functionName: "withdrawEarnings",
    })
  }

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    withdrawEarnings,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// 铸造名片 NFT
export function useMintBusinessCard() {
  const chainId = useChainId()
  const address = getContractAddress("BUSINESS_CARD_NFT", chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const mintBusinessCard = async (to: `0x${string}`, metadataURI: string) => {
    if (!address) throw new Error("Contract not deployed on this network")

    return writeContract({
      address,
      abi: BUSINESS_CARD_NFT_ABI,
      functionName: "mint",
      args: [to, metadataURI],
    })
  }

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    mintBusinessCard,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// 查询 NFT 余额
export function useBusinessCardBalance() {
  const chainId = useChainId()
  const { address: userAddress } = useAccount()
  const contractAddress = getContractAddress("BUSINESS_CARD_NFT", chainId)

  return useReadContract({
    address: contractAddress,
    abi: BUSINESS_CARD_NFT_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// 检查用户是否已绑定 SBT
export function useHasSBT(address?: `0x${string}`) {
  const chainId = useChainId()
  const contractAddress = getContractAddress("SBT", chainId)

  return useReadContract({
    address: contractAddress,
    abi: SBT_ABI,
    functionName: "hasSBT",
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address,
    },
  })
}

// 获取用户 SBT 信息
export function useGetUserSBTInfo() {
  const chainId = useChainId()
  const { address: userAddress } = useAccount()
  const contractAddress = getContractAddress("SBT", chainId)

  return useReadContract({
    address: contractAddress,
    abi: SBT_ABI,
    functionName: "getUserInfo",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// 铸造 SBT（绑定账号）
export function useMintSBT() {
  const chainId = useChainId()
  const address = getContractAddress("SBT", chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const mintSBT = async (to: `0x${string}`, username: string, metadataURI: string) => {
    if (!address) throw new Error("SBT contract not deployed on this network")

    return writeContract({
      address,
      abi: SBT_ABI,
      functionName: "mint",
      args: [to, username, metadataURI],
    })
  }

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    mintSBT,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// 获取代币余额
export function useTokenBalance() {
  const chainId = useChainId()
  const { address: userAddress } = useAccount()
  const contractAddress = getContractAddress("TEST_TOKEN", chainId)

  return useReadContract({
    address: contractAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
      refetchInterval: 10000, // 每10秒刷新一次余额
    },
  })
}

// 授权代币使用
export function useApproveToken() {
  const chainId = useChainId()
  const address = getContractAddress("TEST_TOKEN", chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const approve = async (spender: `0x${string}`, amount: bigint) => {
    if (!address) throw new Error("Token contract not deployed on this network")

    return writeContract({
      address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount],
    })
  }

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    approve,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// 获取产品信息
export function useGetProduct(productId: bigint) {
  const chainId = useChainId()
  const address = getContractAddress("MARKETPLACE", chainId)

  return useReadContract({
    address,
    abi: MARKETPLACE_ABI,
    functionName: "getProduct",
    args: [productId],
    query: {
      enabled: !!address,
    },
  })
}

// 检查用户是否已购买产品
export function useHasPurchasedProduct(productId: bigint) {
  const chainId = useChainId()
  const { address: userAddress } = useAccount()
  const contractAddress = getContractAddress("MARKETPLACE", chainId)

  return useReadContract({
    address: contractAddress,
    abi: MARKETPLACE_ABI,
    functionName: "hasPurchased",
    args: userAddress && productId ? [userAddress, productId] : undefined,
    query: {
      enabled: !!contractAddress && !!userAddress,
    },
  })
}

// 购买产品（使用代币）
export function usePurchaseProduct() {
  const chainId = useChainId()
  const address = getContractAddress("MARKETPLACE", chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const purchaseProduct = async (productId: bigint, amount: bigint) => {
    if (!address) throw new Error("Marketplace contract not deployed on this network")

    return writeContract({
      address,
      abi: MARKETPLACE_ABI,
      functionName: "purchaseProduct",
      args: [productId, amount],
    })
  }

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    purchaseProduct,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}
