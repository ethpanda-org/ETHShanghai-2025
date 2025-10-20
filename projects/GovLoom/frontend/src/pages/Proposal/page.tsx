// src/pages/ProposalPage/ProposalPage.tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { daoData } from '../../data/daos';
import { ProposalDetail } from '../../components/ProposalHome';
import { VotingPanel } from '../../components/ProposalHome';
import { VoterList } from '../../components/ProposalHome';
import './style.css';

const ProposalPage: React.FC = () => {
  const { slug, proposalId } = useParams<{ slug: string; proposalId: string }>();
  const dao = daoData.find(d => d.slug === slug);
  const proposal = dao?.proposals.find(p => p.id === parseInt(proposalId || ''));
  const [voterRefreshKey, setVoterRefreshKey] = React.useState(0);

  const handleVoteSuccessful = React.useCallback(() => {
    setVoterRefreshKey((prev) => prev + 1);
  }, []);

  if (!dao || !proposal) {
    return (
      <div className="content-not-found">
        <h1>Proposal not found</h1>
        <Link to={dao ? `/dao/${dao.slug}` : '/explore'}>Go Back</Link>
      </div>
    );
  }

  return (
    <div className="proposal-page-container">
      <div className="proposal-page-header">
        <Link to={`/dao/${slug}`} className="back-link">
          &larr; Back to {dao.name}
        </Link>
      </div>
      <div className="proposal-page-body">
        <main className="proposal-main-content">
          <ProposalDetail proposal={proposal} />
        </main>
        <aside className="proposal-sidebar-content">
          <VotingPanel proposal={proposal} onVoteSuccessful={handleVoteSuccessful} />
          <VoterList proposal={proposal} refreshKey={voterRefreshKey} />
        </aside>
      </div>
    </div>
  );
};

export default ProposalPage;
