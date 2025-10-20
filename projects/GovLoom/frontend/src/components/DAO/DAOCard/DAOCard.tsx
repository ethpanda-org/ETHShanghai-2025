import React from 'react';
import { type DAO } from '../../../types';
import './style.css';
import { Link } from 'react-router-dom'; // 导入 Link
const DAOCard: React.FC<DAO> = ({ slug, logoUrl, name, description, proposalCount, memberCount }) => {
  if (!slug) return null; // 如果没有 slug，则不渲染

  return (
    <Link to={`/dao/${slug}`} className="dao-card-component dao-card-link">
      <div className="card-header">
        <img src={logoUrl} alt={`${name} logo`} className="dao-logo" />
        <div className="dao-info">
            <h3 className="dao-name">{name}</h3>
            <p className="dao-description">{description}</p>
        </div>
      </div>
      <div className="card-footer">
        <div className="stat">
          <span className="stat-value">{proposalCount}</span>
          <span className="stat-label">Proposals</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat">
          <span className="stat-value">{memberCount}</span>
          <span className="stat-label">Members</span>
        </div>
      </div>
    </Link>
  );
};

export default DAOCard;