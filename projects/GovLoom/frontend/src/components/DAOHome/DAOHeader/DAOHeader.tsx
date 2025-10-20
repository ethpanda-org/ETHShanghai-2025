import React from 'react';
import { Link } from 'react-router-dom';
import type { DAOWithDetails } from '../../../data/daos';
import './style.css';

interface DAOHeaderProps {
  dao: DAOWithDetails;
}

const DAOHeader: React.FC<DAOHeaderProps> = ({ dao }) => {
  return (
    // 使用新的 class 来包裹整个组件
    <div className="dao-header-wrapper">
      <div className="dao-banner" style={{ backgroundImage: `url(${dao.bannerUrl})` }}></div>
      <div className="dao-header-content">
        <div className="dao-logo-container">
          <img src={dao.logoUrl} alt={`${dao.name} Logo`} className="dao-main-logo" />
        </div>
        <h1 className="dao-main-name">{dao.name}</h1>
        <p className="dao-short-description">{dao.description}</p>
        <div className="dao-actions">
          <button className="join-button">Join</button>
          <Link to={`/dao/${dao.slug}/new-proposal`} className="proposal-button">
            New proposal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DAOHeader;
