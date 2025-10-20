import React, { useState } from 'react';
import './style.css';

// SVG 图标组件
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

interface AboutPanelProps {
  description: string;
}

const AboutPanel: React.FC<AboutPanelProps> = ({ description }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongText = description.length > 200;
  const displayText = isLongText && !isExpanded ? `${description.substring(0, 200)}...` : description;

  return (
    <div className="about-panel-component">
      <h3 className="panel-title">
        <InfoIcon />
        <span>About</span>
      </h3>
      <p className="panel-description">{displayText}</p>
      {isLongText && (
        <button onClick={() => setIsExpanded(!isExpanded)} className="toggle-button">
          {isExpanded ? 'Read Less' : 'Read More'}
        </button>
      )}
    </div>
  );
};

export default AboutPanel;