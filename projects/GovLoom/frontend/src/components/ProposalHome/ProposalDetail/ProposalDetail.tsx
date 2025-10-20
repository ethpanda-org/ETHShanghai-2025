import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAccount, useReadContract } from 'wagmi';
import { type Address } from 'viem';
import type { Proposal } from '../../../types';
import { DEFAULT_VOTING_SYSTEM, votingSystemAbi } from '../../../config/votingSystem';
import { ConnectButton } from '../../../components/Wallet';
import './style.css';

interface ProposalDetailProps {
  proposal: Proposal;
}

const truncateAddress = (value: string | undefined | null) => {
  if (!value) return 'Unknown';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const ProposalDetail: React.FC<ProposalDetailProps> = ({ proposal }) => {
  const { isConnected } = useAccount();
  const contractAddress = React.useMemo<Address>(() => {
    const override = proposal.onChain?.contractAddress?.trim();
    return (override ?? DEFAULT_VOTING_SYSTEM.address) as Address;
  }, [proposal.onChain?.contractAddress]);

  const chainId = proposal.onChain?.chainId ?? DEFAULT_VOTING_SYSTEM.chainId;

  const {
    data: contractOwner,
  } = useReadContract({
    address: contractAddress,
    abi: votingSystemAbi,
    functionName: 'owner',
    chainId,
    query: {
      enabled: Boolean(contractAddress),
      refetchOnWindowFocus: false,
      refetchInterval: 60000,
    },
  });

  const authorLabel = contractOwner ?? proposal.author;

  return (
    <div className="proposal-detail-component">
      <h1>{proposal.title}</h1>
      <div className="proposal-meta">
        <span className={`status-badge status-${proposal.status.toLowerCase()}`}>
          {proposal.status}
        </span>
        <span>by {truncateAddress(authorLabel)}</span>
        <div className="proposal-connect">
          <ConnectButton />
        </div>
      </div>
      <div className="proposal-description">
        <ReactMarkdown
          className="proposal-markdown"
          remarkPlugins={[remarkGfm]}
        >
          {proposal.description}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ProposalDetail;
