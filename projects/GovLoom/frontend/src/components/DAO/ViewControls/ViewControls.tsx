import React from 'react';
import { type ViewMode } from '../../../types';
import './style.css';

const GridIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1H7V7H1V1Z" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M13 1H19V7H13V1Z" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M13 13H19V19H13V13Z" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M1 13H7V19H1V13Z" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);
const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 5H19" strokeWidth="2" strokeLinecap="round"/>
    <path d="M1 10H19" strokeWidth="2" strokeLinecap="round"/>
    <path d="M1 15H19" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

interface ViewControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const ViewControls: React.FC<ViewControlsProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="view-controls-component">
      <button onClick={() => onViewModeChange('grid')} className={`control-button ${viewMode === 'grid' ? 'active' : ''}`} aria-label="Grid View">
        <GridIcon />
      </button>
      <button onClick={() => onViewModeChange('table')} className={`control-button ${viewMode === 'table' ? 'active' : ''}`} aria-label="Table View">
        <ListIcon />
      </button>
    </div>
  );
};

export default ViewControls;