import React from 'react';
import DAOCard from '../DAOCard/DAOCard';
import DAORow from '../DAORow/DAORow';
import type { DAO, SortConfig, ViewMode } from '../../../types';
import './style.css';

const SortIcon = ({ direction }: { direction: 'ascending' | 'descending' | 'none' }) => (
    <svg width="16" height="16" viewBox="0 0 16 16" className={`sort-icon direction-${direction}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 4L11.4641 9H4.5359L8 4Z" fill="currentColor" className="arrow-up" />
        <path d="M8 12L4.5359 7H11.4641L8 12Z" fill="currentColor" className="arrow-down" />
    </svg>
);

interface DAOListProps {
  daos: DAO[];
  viewMode: ViewMode;
  sortConfig: SortConfig | null;
  onSort: (key: keyof DAO) => void;
}

const DAOList: React.FC<DAOListProps> = ({ daos, viewMode, sortConfig, onSort }) => {
  const getSortDirection = (key: keyof DAO) => {
    if (!sortConfig || sortConfig.key !== key) return 'none';
    return sortConfig.direction;
  };

  if (viewMode === 'grid') {
    return (
      <div className="dao-list-component dao-list--grid-view">
        {daos.map(dao => ( <DAOCard key={dao.id} {...dao} /> ))}
      </div>
    );
  }

  return (
    <div className="dao-list-component dao-list--table-view">
      <table className="dao-table">
        <thead>
          <tr>
            <th className="sortable-header" onClick={() => onSort('name')}>
              {/* 修正: 内部 div 用于 flex 布局 */}
              <div className="header-content">
                <span>DAO</span>
                <SortIcon direction={getSortDirection('name')} />
              </div>
            </th>
            <th className="sortable-header align-right" onClick={() => onSort('proposalCount')}>
              {/* 修正: 内部 div 用于 flex 布局 */}
              <div className="header-content justify-end">
                <span>Proposals</span>
                <SortIcon direction={getSortDirection('proposalCount')} />
              </div>
            </th>
            <th className="sortable-header align-right" onClick={() => onSort('memberCount')}>
              {/* 修正: 内部 div 用于 flex 布局 */}
              <div className="header-content justify-end">
                <span>Members</span>
                <SortIcon direction={getSortDirection('memberCount')} />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {daos.map(dao => ( <DAORow key={dao.id} dao={dao} /> ))}
        </tbody>
      </table>
    </div>
  );
};

export default DAOList;