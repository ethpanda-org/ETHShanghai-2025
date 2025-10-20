import type { Abi } from 'viem';
import CAIRegistryArtifact from '@/config/abi/CAIRegistry.json';
import AHINAnchorArtifact from '@/config/abi/AHINAnchor.json';
import ERC8004AgentArtifact from '@/config/abi/ERC8004Agent.json';

export const CAIRegistryABI = CAIRegistryArtifact.abi as Abi;
export const AHINAnchorABI = AHINAnchorArtifact.abi as Abi;
export const ERC8004AgentABI = ERC8004AgentArtifact.abi as Abi;
