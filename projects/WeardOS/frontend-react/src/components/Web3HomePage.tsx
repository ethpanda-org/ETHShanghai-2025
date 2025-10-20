import React, { useState } from 'react';
import { Button, Input, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  BarChartOutlined, 
  RobotOutlined,
  TrophyOutlined,
  SendOutlined
} from '@ant-design/icons';
import './Web3HomePage.scss';

const { Search } = Input;

interface NetworkIcon {
  name: string;
  symbol: string;
  color: string;
  icon: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const Web3HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetworks] = useState<string[]>(['BTC', 'ETH', 'SOL']);

  // 支持的区块链网络
  const networks: NetworkIcon[] = [
    { name: 'Bitcoin', symbol: 'BTC', color: '#f7931a', icon: '₿' },
    { name: 'Ethereum', symbol: 'ETH', color: '#627eea', icon: 'Ξ' },
    { name: 'Solana', symbol: 'SOL', color: '#9945ff', icon: '◎' }
  ];

  // 网络官网链接
  const networkUrls: { [key: string]: string } = {
    'BTC': 'https://bitcoin.org',
    'ETH': 'https://ethereum.org',
    'SOL': 'https://solana.com'
  };

  // 快速操作
  const quickActions: QuickAction[] = [
    {
      id: 'stablecoin',
      title: 'Stablecoin & Yield',
      description: '稳定币收益分析',
      icon: <TrophyOutlined />,
      color: '#52c41a'
    },
    {
      id: 'token-analytics',
      title: 'Token/Holder Analytics',
      description: '代币持有者分析',
      icon: <BarChartOutlined />,
      color: '#1890ff'
    },
    {
      id: 'network-activity',
      title: 'Network Activity Metrics',
      description: '网络活动指标',
      icon: <RobotOutlined />,
      color: '#722ed1'
    }
  ];

  const handleSearch = (value: string) => {
    if (value.trim()) {
      // 跳转到聊天页面并传递搜索内容
      navigate('/chat', { state: { initialMessage: value.trim() } });
    }
  };

  const handleNetworkClick = (symbol: string) => {
    // 跳转到对应的官网
    const url = networkUrls[symbol];
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="web3-homepage">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Explore Weard OS System's
              <br />
              <span className="gradient-text">Intelligent Blockchain Analytics</span>
            </h1>
            <p className="hero-subtitle">
              Decentralized intelligent operating system based on Weard OS, supporting 30+ blockchain networks
            </p>
          </div>

          {/* Network Icons */}
          <div className="network-icons">
            {networks.map((network, index) => (
              <Tooltip key={network.symbol} title={network.name}>
                <div 
                  className={`network-icon ${selectedNetworks.includes(network.symbol) ? 'selected' : ''}`}
                  style={{ 
                    backgroundColor: network.color,
                    animationDelay: `${index * 0.1}s`
                  }}
                  onClick={() => handleNetworkClick(network.symbol)}
                >
                  <span className="network-symbol">{network.icon}</span>
                </div>
              </Tooltip>
            ))}
            {/* <div className="network-icon more-networks">
  
            </div> */}
          </div>

          {/* Search Bar */}
          <div className="search-container">
            <Search
              placeholder="How does Weard OS optimize blockchain transaction performance and security?"
              size="large"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SendOutlined />}
              className="main-search"
            />
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                type="default"
                size="large"
                icon={action.icon}
                className="action-button"
                style={{ borderColor: action.color, color: action.color }}
              >
                {action.title}
              </Button>
            ))}
            <Button
              type="link"
              size="large"
              className="explore-all-btn"
            >
              Explore All Categories →
            </Button>
          </div>
        </div>

        {/* Background Effects */}
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
      </div>
    </div>
  );
};

export default Web3HomePage;