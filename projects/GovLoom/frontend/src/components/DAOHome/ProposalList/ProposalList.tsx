// TSX/JSX 结构保持不变
import React from 'react';
import { Link } from 'react-router-dom';
import { useReadContract } from 'wagmi';
import type { Proposal } from '../../../types';
import { DEFAULT_VOTING_SYSTEM, votingSystemAbi } from '../../../config/votingSystem';
import './style.css';

interface ProposalListProps {
  proposals: Proposal[];
  daoSlug: string;
}

const truncateAddress = (value: string | undefined | null) => {
  if (!value) return 'Unknown';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

interface ProposalListItemProps {
  proposal: Proposal;
  daoSlug: string;
}

const ProposalListItem: React.FC<ProposalListItemProps> = ({ proposal, daoSlug }) => {
  const contractAddress = React.useMemo(() => {
    const override = proposal.onChain?.contractAddress?.trim();
    return (override ?? DEFAULT_VOTING_SYSTEM.address) as `0x${string}`;
  }, [proposal.onChain?.contractAddress]);

  const chainId = proposal.onChain?.chainId ?? DEFAULT_VOTING_SYSTEM.chainId;

  const { data: owner } = useReadContract({
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

  const displayAuthor = owner ?? proposal.author;

  return (
    <Link to={`/dao/${daoSlug}/proposal/${proposal.id}`} className="proposal-link">
      <div className="proposal-item">
        <div className="proposal-info">
          <span className="proposal-title">{proposal.title}</span>
          <span className="proposal-author">by {truncateAddress(displayAuthor)}</span>
        </div>
        <span className={`status-badge status-${proposal.status.toLowerCase()}`}>{proposal.status}</span>
      </div>
    </Link>
  );
};

const ProposalList: React.FC<ProposalListProps> = ({ proposals, daoSlug }) => {
  return (
    <div className="proposal-list-component">
      <h3>Proposals</h3>
      <div className="proposal-items">
        {proposals.map((p) => (
          <ProposalListItem key={p.id} proposal={p} daoSlug={daoSlug} />
        ))}
      </div>
    </div>
  );
};

export default ProposalList;
