import type { Address } from 'viem';
import { bscTestnet } from 'wagmi/chains';

export const VOTING_SYSTEM_ADDRESS = '0xb6f2d30b6c49C135935C4E67F822f1Cd8b51f80b' as Address;
export const VOTING_SYSTEM_CHAIN_ID = bscTestnet.id;
export const VOTING_SYSTEM_LOGS_START_BLOCK = 0n;

export const votingSystemAbi = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'owner', type: 'address' }],
  },
  {
    type: 'function',
    name: 'getProposal',
    stateMutability: 'view',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
      },
    ],
    outputs: [
      { name: 'metadataHash', type: 'string' },
      { name: 'supportVotes', type: 'uint256' },
      { name: 'againstVotes', type: 'uint256' },
      { name: 'abstainVotes', type: 'uint256' },
      { name: 'privilegedOnly', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'getVoteDistribution',
    stateMutability: 'view',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
      },
    ],
    outputs: [
      { name: 'supportVotes', type: 'uint256' },
      { name: 'againstVotes', type: 'uint256' },
      { name: 'abstainVotes', type: 'uint256' },
      { name: 'supportRatioE18', type: 'uint256' },
      { name: 'againstRatioE18', type: 'uint256' },
      { name: 'abstainRatioE18', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'vote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'option', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'privilegedVote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'option', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'hasPrivilegedAccess',
    stateMutability: 'view',
    inputs: [
      {
        name: 'account',
        type: 'address',
      },
    ],
    outputs: [{ name: 'hasAccess', type: 'bool' }],
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: true },
      { name: 'voter', type: 'address', indexed: true },
      { name: 'option', type: 'uint8', indexed: false },
      { name: 'privileged', type: 'bool', indexed: false },
    ],
  },
] as const;

export const votingSystemConfig = {
  address: VOTING_SYSTEM_ADDRESS,
  abi: votingSystemAbi,
} as const;

export const DEFAULT_VOTING_SYSTEM = {
  address: VOTING_SYSTEM_ADDRESS,
  chainId: VOTING_SYSTEM_CHAIN_ID,
  logsStartBlock: VOTING_SYSTEM_LOGS_START_BLOCK,
} as const;

export const VOTE_OPTION_LABELS = {
  0: 'For',
  1: 'Against',
  2: 'Abstain',
} as const;
