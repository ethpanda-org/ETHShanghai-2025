import React from 'react';
import { parseAbiItem, type Address } from 'viem';
import { usePublicClient } from 'wagmi';
import type { Proposal } from '../../../types';
import {
  VOTE_OPTION_LABELS,
  DEFAULT_VOTING_SYSTEM,
} from '../../../config/votingSystem';
import './style.css';

type VoteOptionValue = 0 | 1 | 2;

const voteCastEvent = parseAbiItem(
  'event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 option, bool privileged)'
);

interface VoterListProps {
  proposal: Proposal;
  refreshKey?: number;
}

interface VoterEntry {
  address: string;
  option: string;
  txHash: `0x${string}`;
}

const truncateValue = (value: string) =>
  value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;

const VoterList: React.FC<VoterListProps> = ({ proposal, refreshKey = 0 }) => {
  const contractAddress = React.useMemo<Address>(() => {
    const override = proposal.onChain?.contractAddress?.trim();
    return (override ?? DEFAULT_VOTING_SYSTEM.address) as Address;
  }, [proposal.onChain?.contractAddress]);

  const chainId = proposal.onChain?.chainId ?? DEFAULT_VOTING_SYSTEM.chainId;

  const rawLogsStartBlock = proposal.onChain?.logsStartBlock;
  const logsStartBlock = React.useMemo(() => {
    const fallback = DEFAULT_VOTING_SYSTEM.logsStartBlock;
    if (typeof rawLogsStartBlock === 'bigint') return rawLogsStartBlock;
    if (typeof rawLogsStartBlock === 'number') return BigInt(rawLogsStartBlock);
    if (typeof rawLogsStartBlock === 'string') {
      try {
        return BigInt(rawLogsStartBlock);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }, [rawLogsStartBlock]);

  const contractProposalId = React.useMemo(() => {
    const source = proposal.onChain?.proposalId ?? proposal.id;
    if (source === undefined || source === null) return null;
    try {
      return BigInt(source);
    } catch {
      return null;
    }
  }, [proposal.onChain?.proposalId, proposal.id]);

  const publicClient = usePublicClient({ chainId });
  const [voters, setVoters] = React.useState<VoterEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchLogsRecursive = React.useCallback(
    async (fromBlock: bigint, toBlock: bigint): Promise<readonly unknown[]> => {
      if (!publicClient) return [];
      if (fromBlock > toBlock) return [];

      try {
        return await publicClient.getLogs({
          address: contractAddress,
          event: voteCastEvent,
          args: { proposalId: contractProposalId! },
          fromBlock,
          toBlock,
        });
      } catch (err) {
        if (err instanceof Error && err.message.toLowerCase().includes('limit exceeded')) {
          if (fromBlock === toBlock) {
            throw err;
          }
          const mid = fromBlock + (toBlock - fromBlock) / 2n;
          const left = await fetchLogsRecursive(fromBlock, mid);
          const right = await fetchLogsRecursive(mid + 1n, toBlock);
          return [...left, ...right];
        }
        throw err;
      }
    },
    [publicClient, contractAddress, contractProposalId],
  );

  const fetchVoters = React.useCallback(async () => {
    if (!publicClient || contractProposalId === null) {
      return;
    }

    const client = publicClient;
    setIsLoading(true);
    setError(null);

    try {
      const latestBlock = await client.getBlockNumber();
      const effectiveStart = logsStartBlock <= latestBlock ? logsStartBlock : latestBlock;

      type LogsResponse = Awaited<ReturnType<typeof client.getLogs>>;
      const logs = await fetchLogsRecursive(effectiveStart, latestBlock) as LogsResponse;

      const entries = logs
        .map((log) => {
          const optionValue = Number(log.args.option) as VoteOptionValue;
          return {
            address: log.args.voter as string,
            option: VOTE_OPTION_LABELS[optionValue] ?? `Option ${optionValue}`,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber ?? 0n,
          };
        })
        .sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return 0;
          return b.blockNumber > a.blockNumber ? 1 : -1;
        })
        .map(({ blockNumber, ...rest }) => rest);

      setVoters(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voters.');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractProposalId, contractAddress, logsStartBlock, fetchLogsRecursive]);

  React.useEffect(() => {
    fetchVoters();
  }, [fetchVoters, refreshKey, contractAddress]);

  let content: React.ReactNode;

  if (contractProposalId === null) {
    content = <div className="voter-placeholder error">Invalid proposal id. Unable to fetch voters.</div>;
  } else if (isLoading) {
    content = <div className="voter-placeholder">Fetching voters…</div>;
  } else if (error) {
    content = <div className="voter-placeholder error">{error}</div>;
  } else if (voters.length === 0) {
    content = <div className="voter-placeholder">No votes recorded on-chain yet.</div>;
  } else {
    content = (
      <div className="voter-items">
        {voters.map((voter) => (
          <div key={`${voter.address}-${voter.txHash}`} className="voter-item">
            <span>{truncateValue(voter.address)}</span>
            <span className="voter-item-option">
              {voter.option}
              <span className="voter-item-tx">{truncateValue(voter.txHash)}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="voter-list-component">
      <h3>Voters</h3>
      {content}
    </div>
  );
};

export default VoterList;
