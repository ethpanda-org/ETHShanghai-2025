// hooks/useContracts.js
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import SoccerAgentRegistryABI from '../contracts/SoccerAgentRegistry.json'
import CompetitionABI from '../contracts/competition.json'
import LaunchPadABI from '../contracts/LaunchPad.json'
import ServerReputationRegistryABI from '../contracts/ServerReputationRegistry.json'
import TokenBoundAgentABI from '../contracts/TokenBoundAgent.json'

export const useContracts = () => {
  return {
    SoccerAgentRegistry: {
      address: SoccerAgentRegistryABI.address,
      abi: SoccerAgentRegistryABI.abi
    },
    Competition: {
      address: CompetitionABI.address,
      abi: CompetitionABI.abi
    },
    LaunchPad: {
      address: LaunchPadABI.address,
      abi: LaunchPadABI.abi
    },
    ServerReputationRegistry: {
      address: ServerReputationRegistryABI.address,
      abi: ServerReputationRegistryABI.abi
    },
    TokenBoundAgent: TokenBoundAgentABI.abi
  }
}

// Hook for reading agent info
export const useAgentInfo = (agentId) => {
  const contracts = useContracts()

  // 检查合约地址是否存在
  const hasValidAddress = contracts.SoccerAgentRegistry.address && contracts.SoccerAgentRegistry.address !== ""

  // 使用 useReadContracts 批量读取
  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: contracts.SoccerAgentRegistry.address,
        abi: contracts.SoccerAgentRegistry.abi,
        functionName: 'getSoccerAgentInfo',
        args: [agentId],
      },
      {
        address: contracts.SoccerAgentRegistry.address,
        abi: contracts.SoccerAgentRegistry.abi,
        functionName: 'ownerOf',
        args: [agentId],
      },
      {
        address: contracts.SoccerAgentRegistry.address,
        abi: contracts.SoccerAgentRegistry.abi,
        functionName: 'tokenURI',
        args: [agentId],
      }
    ],
    query: {
      enabled: agentId !== undefined && hasValidAddress
    }
  })

  // 如果合约地址无效，直接返回非加载状态
  if (!hasValidAddress) {
    return {
      agentInfo: null,
      owner: null,
      tokenUri: null,
      isLoading: false,
      error: 'Contract address not available'
    }
  }

  const agentInfo = data?.[0]?.result
  const owner = data?.[1]?.result
  const tokenUri = data?.[2]?.result

  return {
    agentInfo,
    owner,
    tokenUri,
    isLoading,
    error: data?.[0]?.error || data?.[1]?.error || data?.[2]?.error || error
  }
}

// Hook for agent matches
export const useAgentMatches = (agentId) => {
  const contracts = useContracts()
  
  const { data, isLoading } = useReadContract({
    address: contracts.ServerReputationRegistry.address,
    abi: contracts.ServerReputationRegistry.abi,
    functionName: 'getAgentMatches',
    args: [agentId],
    enabled: agentId !== undefined
  })

  return { matches: data || [], isLoading }
}

// Hook for agent match stats
export const useAgentMatchStats = (agentId) => {
  const contracts = useContracts()
  
  const { data, isLoading } = useReadContract({
    address: contracts.ServerReputationRegistry.address,
    abi: contracts.ServerReputationRegistry.abi,
    functionName: 'getAgentMatchStats',
    args: [agentId],
    enabled: agentId !== undefined
  })

  return { stats: data, isLoading }
}

// Hook for token launch info
export const useTokenLaunch = (agentId) => {
  const contracts = useContracts()
  
  const { data, isLoading } = useReadContract({
    address: contracts.LaunchPad.address,
    abi: contracts.LaunchPad.abi,
    functionName: 'getTokenLaunch',
    args: [agentId],
    enabled: agentId !== undefined
  })

  return { tokenLaunch: data, isLoading }
}

// Hook for competition matches
export const useTotalMatches = () => {
  const contracts = useContracts()
  
  const { data, isLoading } = useReadContract({
    address: contracts.Competition.address,
    abi: contracts.Competition.abi,
    functionName: 'getTotalMatches'
  })

  return { total: data, isLoading }
}

// Hook for match queue
export const useMatchQueue = () => {
  const contracts = useContracts()
  
  const { data, isLoading, refetch } = useReadContract({
    address: contracts.Competition.address,
    abi: contracts.Competition.abi,
    functionName: 'getMatchQueue'
  })

  return { queue: data || [], isLoading, refetch }
}

// Hook for getting match details
export const useMatch = (matchId) => {
  const contracts = useContracts()
  
  const { data, isLoading } = useReadContract({
    address: contracts.Competition.address,
    abi: contracts.Competition.abi,
    functionName: 'getMatch',
    args: [matchId],
    enabled: matchId !== undefined
  })

  return { match: data, isLoading }
}

// Hook for pending invitations
export const usePendingInvitations = (agentId) => {
  const contracts = useContracts()
  
  const { data, isLoading, refetch } = useReadContract({
    address: contracts.Competition.address,
    abi: contracts.Competition.abi,
    functionName: 'getPendingInvitations',
    args: [agentId],
    enabled: agentId !== undefined
  })

  return { invitations: data || [], isLoading, refetch }
}

// Hook for agent competition matches
export const useAgentCompetitionMatches = (agentId) => {
  const contracts = useContracts()
  
  const { data, isLoading } = useReadContract({
    address: contracts.Competition.address,
    abi: contracts.Competition.abi,
    functionName: 'getAgentMatches',
    args: [agentId],
    enabled: agentId !== undefined
  })

  return { matchIds: data || [], isLoading }
}

// Hook for user's agents
export const useMyAgents = (address) => {
  const contracts = useContracts()
  
  const { data, isLoading, refetch } = useReadContract({
    address: contracts.SoccerAgentRegistry.address,
    abi: contracts.SoccerAgentRegistry.abi,
    functionName: 'getDeveloperAgents',
    args: [address],
    enabled: !!address
  })

  return { agentIds: data || [], isLoading, refetch }
}

// Write hooks
export const useRegisterAgent = () => {
  const contracts = useContracts()
  const { data: hash, writeContract, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const registerAgent = async (teamName, modelVersion, tokenUri) => {
    return writeContract({
      address: contracts.SoccerAgentRegistry.address,
      abi: contracts.SoccerAgentRegistry.abi,
      functionName: 'registerSoccerAgent',
      args: [teamName, modelVersion, tokenUri]
    })
  }

  return {
    registerAgent,
    isPending: isPending || isConfirming,
    isSuccess,
    hash
  }
}

// Hook for reading total agents
export const useTotalAgents = () => {
  const contracts = useContracts()
  
  const { data, isLoading } = useReadContract({
    address: contracts.SoccerAgentRegistry.address,
    abi: contracts.SoccerAgentRegistry.abi,
    functionName: 'getTotalAgents'
  })

  return { 
    totalAgents: data ? Number(data) : 0, 
    isLoading 
  }
}

export const useLaunchToken = () => {
  const contracts = useContracts()
  const { data: hash, writeContract, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const launchToken = async (agentId) => {
    return writeContract({
      address: contracts.LaunchPad.address,
      abi: contracts.LaunchPad.abi,
      functionName: 'launchToken',
      args: [agentId]
    })
  }

  return {
    launchToken,
    isPending: isPending || isConfirming,
    isSuccess,
    hash
  }
}

export const useMintToken = () => {
  const contracts = useContracts()
  const { data: hash, writeContract, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const mintToken = async (agentId, batches, message, value) => {
    return writeContract({
      address: contracts.LaunchPad.address,
      abi: contracts.LaunchPad.abi,
      functionName: 'mint',
      args: [agentId, batches, message],
      value
    })
  }

  return {
    mintToken,
    isPending: isPending || isConfirming,
    isSuccess,
    hash
  }
}

export const useCreateMatchInvitation = () => {
  const contracts = useContracts()
  const { data: hash, writeContract, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const createInvitation = async (challengerAgentId, opponentAgentId, value) => {
    return writeContract({
      address: contracts.Competition.address,
      abi: contracts.Competition.abi,
      functionName: 'createMatchInvitation',
      args: [challengerAgentId, opponentAgentId],
      value
    })
  }

  return {
    createInvitation,
    isPending: isPending || isConfirming,
    isSuccess,
    hash
  }
}

export const useAcceptMatchInvitation = () => {
  const contracts = useContracts()
  const { data: hash, writeContract, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const acceptInvitation = async (matchId) => {
    return writeContract({
      address: contracts.Competition.address,
      abi: contracts.Competition.abi,
      functionName: 'acceptMatchInvitation',
      args: [matchId]
    })
  }

  return {
    acceptInvitation,
    isPending: isPending || isConfirming,
    isSuccess,
    hash
  }
}

export const useRejectMatchInvitation = () => {
  const contracts = useContracts()
  const { data: hash, writeContract, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const rejectInvitation = async (matchId) => {
    return writeContract({
      address: contracts.Competition.address,
      abi: contracts.Competition.abi,
      functionName: 'rejectMatchInvitation',
      args: [matchId]
    })
  }

  return {
    rejectInvitation,
    isPending: isPending || isConfirming,
    isSuccess,
    hash
  }
}

