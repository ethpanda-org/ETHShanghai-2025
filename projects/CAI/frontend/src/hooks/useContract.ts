import { useContractRead } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { CAIRegistryABI, AHINAnchorABI, ERC8004AgentABI } from '@/config/abis';

export function useCAIRegistry() {
  const { data: totalDIDs } = useContractRead({
    address: CONTRACT_ADDRESSES.CAIRegistry as `0x${string}`,
    abi: CAIRegistryABI,
    functionName: 'totalDIDs',
  });

  const { data: totalCredentials } = useContractRead({
    address: CONTRACT_ADDRESSES.CAIRegistry as `0x${string}`,
    abi: CAIRegistryABI,
    functionName: 'totalCredentials',
  });

  return { totalDIDs, totalCredentials };
}

export function useAHINAnchor() {
  const { data: currentBlock } = useContractRead({
    address: CONTRACT_ADDRESSES.AHINAnchor as `0x${string}`,
    abi: AHINAnchorABI,
    functionName: 'currentBlockNumber',
  });

  const { data: totalTransactions } = useContractRead({
    address: CONTRACT_ADDRESSES.AHINAnchor as `0x${string}`,
    abi: AHINAnchorABI,
    functionName: 'totalTransactionsAnchored',
  });

  return { currentBlock, totalTransactions };
}

export function useERC8004Agent() {
  const { data: totalTransactions } = useContractRead({
    address: CONTRACT_ADDRESSES.ERC8004Agent as `0x${string}`,
    abi: ERC8004AgentABI,
    functionName: 'totalTransactions',
  });

  return { totalTransactions };
}
