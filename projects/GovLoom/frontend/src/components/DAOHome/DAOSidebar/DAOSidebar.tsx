import React from 'react';
import type { DAO } from '../../../types';
import './DAOSidebar.css';

interface DAOSidebarProps {
  dao: DAO;
}

const DAOSidebar: React.FC<DAOSidebarProps> = ({ dao }) => {
  return (
    <aside className="dao-sidebar-component">
      <div className="sidebar-section">
        <h3>About</h3>
        <p>{dao.longDescription}</p>
      </div>
      <nav className="sidebar-section">
        <h3>Navigation</h3>
        <ul>
          <li><a href="#" className="active">Proposals</a></li>
          <li><a href="#">New Proposal</a></li>
          <li><a href="#">Treasury</a></li>
        </ul>
      </nav>
    </aside>
  );
};

export default DAOSidebar;