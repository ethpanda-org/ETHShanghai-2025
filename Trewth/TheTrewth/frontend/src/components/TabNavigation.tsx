import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div style={navContainerStyle}>
      <div style={navInnerStyle}>
        <div style={logoStyle}>
          <span style={logoTextStyle}>Trewth</span>
        </div>
        <div style={tabsContainerStyle}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                ...tabButtonStyle,
                ...(activeTab === tab.id ? activeTabStyle : inactiveTabStyle)
              }}
            >
              {tab.icon && <span style={iconStyle}>{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// 样式定义
const navContainerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  width: '100%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  boxShadow: '0 2px 20px rgba(0,0,0,0.15)',
  zIndex: 1000,
};

const navInnerStyle: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '70px',
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const logoTextStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#ffffff',
  letterSpacing: '-0.5px',
};

const tabsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
};

const tabButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  border: 'none',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  outline: 'none',
  position: 'relative',
};

const activeTabStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.95)',
  color: '#764ba2',
  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
  transform: 'translateY(-2px)',
};

const inactiveTabStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.15)',
  color: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
};

const iconStyle: React.CSSProperties = {
  fontSize: '18px',
};

export default TabNavigation;