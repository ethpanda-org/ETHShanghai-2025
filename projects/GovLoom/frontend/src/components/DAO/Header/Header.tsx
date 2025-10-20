import React from 'react';
import './style.css';
import { ConnectButton } from '../../Wallet';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, onSearchChange }) => {
  return (
    <header className="header-component">
      <div className="header-left">
        <div className="logo">GovLoom</div>
        <nav className="navigation">
          <a href="#" className="nav-link active">Explore</a>
          <a href="#" className="nav-link">Governed by you</a>
          <a href="#" className="nav-link">Leaderboard</a>
        </nav>
      </div>
      <div className="header-right">
        <div className="search-container">
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            placeholder="Search DAOs by name or description"
            className="search-input"
            value={searchQuery}
            onChange={onSearchChange}
          />
        </div>
        <div className="wallet-button-wrapper">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
};

export default Header;
