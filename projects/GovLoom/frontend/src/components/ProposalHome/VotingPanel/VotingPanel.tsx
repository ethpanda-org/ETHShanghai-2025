import React from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { zeroAddress, type Address } from 'viem';
import type { Proposal } from '../../../types';
import {
  VOTE_OPTION_LABELS,
  DEFAULT_VOTING_SYSTEM,
  votingSystemAbi,
} from '../../../config/votingSystem';
import './style.css';

type VoteOptionValue = 0 | 1 | 2;

const VOTE_OPTIONS: ReadonlyArray<{ label: string; value: VoteOptionValue }> = [
  { label: 'For', value: 0 },
  { label: 'Against', value: 1 },
  { label: 'Abstain', value: 2 },
] as const;

const numberFormatter = new Intl.NumberFormat();
const formatVoteCount = (value: bigint) => numberFormatter.format(Number(value));

interface VotingPanelProps {
  proposal: Proposal;
  onVoteSuccessful?: () => void;
}

const VotingPanel: React.FC<VotingPanelProps> = ({ proposal, onVoteSuccessful }) => {
  const { address, isConnected } = useAccount();
  const [selectedOption, setSelectedOption] = React.useState<VoteOptionValue | null>(null);
  const [lastSuccessfulOption, setLastSuccessfulOption] = React.useState<VoteOptionValue | null>(null);
  const [submittedOption, setSubmittedOption] = React.useState<VoteOptionValue | null>(null);

  const contractAddress = React.useMemo<Address>(() => {
    const override = proposal.onChain?.contractAddress?.trim();
    return (override ?? DEFAULT_VOTING_SYSTEM.address) as Address;
  }, [proposal.onChain?.contractAddress]);

  const chainId = proposal.onChain?.chainId ?? DEFAULT_VOTING_SYSTEM.chainId;

  const contractProposalId = React.useMemo(() => {
    const source = proposal.onChain?.proposalId ?? proposal.id;
    if (source === undefined || source === null) return null;
    try {
      return BigInt(source);
    } catch {
      return null;
    }
  }, [proposal.onChain?.proposalId, proposal.id]);

  const votingContractConfig = React.useMemo(
    () =>
      ({
        address: contractAddress,
        abi: votingSystemAbi,
      }) as const,
    [contractAddress],
  );

  const {
    data: proposalInfo,
    refetch: refetchProposalInfo,
    isLoading: isProposalLoading,
    error: proposalError,
  } = useReadContract({
    ...votingContractConfig,
    functionName: 'getProposal',
    args: contractProposalId !== null ? [contractProposalId] : undefined,
    chainId,
    query: {
      enabled: contractProposalId !== null,
      refetchInterval: 15000,
    },
  });

  const {
    data: voteDistribution,
    refetch: refetchDistribution,
    isLoading: isDistributionLoading,
    error: distributionError,
  } = useReadContract({
    ...votingContractConfig,
    functionName: 'getVoteDistribution',
    args: contractProposalId !== null ? [contractProposalId] : undefined,
    chainId,
    query: {
      enabled: contractProposalId !== null,
      refetchInterval: 12000,
    },
  });

  const { data: privilegedAccess } = useReadContract({
    ...votingContractConfig,
    functionName: 'hasPrivilegedAccess',
    args: [address ?? zeroAddress],
    chainId,
    query: {
      enabled: Boolean(address),
      refetchInterval: 15000,
      refetchOnWindowFocus: false,
    },
  });

  const {
    writeContract,
    data: pendingHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isTxSuccess,
    error: waitError,
  } = useWaitForTransactionReceipt({
    chainId,
    hash: pendingHash,
    query: {
      enabled: Boolean(pendingHash),
    },
  });

  const isPrivilegedProposal = proposalInfo ? proposalInfo[4] : false;
  const canVote = isConnected && (!isPrivilegedProposal || privilegedAccess === true);

  const [supportVotes, againstVotes, abstainVotes] = voteDistribution ?? [0n, 0n, 0n, 0n, 0n, 0n];
  const totalVotes = supportVotes + againstVotes + abstainVotes;

  const results = React.useMemo(() => {
    const counts: Record<VoteOptionValue, bigint> = {
      0: supportVotes,
      1: againstVotes,
      2: abstainVotes,
    };

    return VOTE_OPTIONS.map((option) => {
      const count = counts[option.value] ?? 0n;
      const percentage = totalVotes > 0n ? Number((count * 10000n) / totalVotes) / 100 : 0;
      return {
        ...option,
        count,
        formattedCount: formatVoteCount(count),
        percentage,
      };
    });
  }, [supportVotes, againstVotes, abstainVotes, totalVotes]);

  const voteDisabled =
    !canVote || selectedOption === null || isWritePending || isConfirming || contractProposalId === null;

  const statusMessage = !isConnected
    ? 'Connect your wallet to participate in this vote.'
    : isPrivilegedProposal && privilegedAccess === false
      ? 'This proposal requires privileged access to vote.'
      : undefined;

  const rawErrorMessage =
    writeError?.message ??
    waitError?.message ??
    proposalError?.message ??
    distributionError?.message;

  const userFriendlyError = React.useMemo(() => {
    if (!rawErrorMessage) return undefined;
    if (rawErrorMessage.toLowerCase().includes('already voted')) {
      return 'This wallet has already voted on this proposal.';
    }
    return rawErrorMessage;
  }, [rawErrorMessage]);

  React.useEffect(() => {
    if (isTxSuccess) {
      if (submittedOption !== null) {
        setLastSuccessfulOption(submittedOption);
      }
      setSubmittedOption(null);
      setSelectedOption(null);
      refetchDistribution();
      refetchProposalInfo();
      onVoteSuccessful?.();
    }
  }, [
    isTxSuccess,
    submittedOption,
    refetchDistribution,
    refetchProposalInfo,
    onVoteSuccessful,
  ]);

  const voteOptionLabel = (value: VoteOptionValue | null) =>
    value !== null ? VOTE_OPTION_LABELS[value] : undefined;

  const handleVote = () => {
    if (contractProposalId === null || selectedOption === null || !canVote) {
      return;
    }

    setSubmittedOption(selectedOption);
    writeContract({
      ...votingContractConfig,
      functionName: isPrivilegedProposal ? 'privilegedVote' : 'vote',
      args: [contractProposalId, selectedOption],
      chainId,
    });
  };

  return (
    <div className="voting-panel-component">
      <h3>Cast your vote</h3>

      {contractProposalId === null && (
        <div className="vote-status-message error">
          Invalid proposal identifier. Unable to load voting data.
        </div>
      )}

      {contractProposalId !== null && (
        <>
          {(isProposalLoading || isDistributionLoading) && (
            <div className="vote-status-message">Loading on-chain voting data…</div>
          )}

          <div className="vote-options">
            {VOTE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`vote-option-button ${selectedOption === option.value ? 'selected' : ''}`}
                onClick={() => setSelectedOption(option.value)}
                disabled={!canVote || isWritePending || isConfirming}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              className="cast-vote-button"
              disabled={voteDisabled}
              onClick={handleVote}
            >
              {isWritePending || isConfirming ? 'Submitting…' : 'Vote'}
            </button>
          </div>

          {lastSuccessfulOption !== null && (
            <div className="voted-message">
              You voted for "{voteOptionLabel(lastSuccessfulOption)}"
            </div>
          )}

          {statusMessage && <div className="vote-status-message warning">{statusMessage}</div>}
          {userFriendlyError && (
            <div className="vote-status-message error">{userFriendlyError}</div>
          )}
        </>
      )}

      <hr />
      <h3>Current Results</h3>
      <div className="vote-results">
        {results.map((option) => (
          <div key={option.value} className="result-item">
            <div className="result-info">
              <span>{option.label}</span>
              <span>{`${option.formattedCount} (${option.percentage.toFixed(2)}%)`}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${option.percentage}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VotingPanel;
