import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Dropdown, Space, App } from 'antd';
import { WalletOutlined, DownOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useWeb3 } from '../hooks/useWeb3';
import type { MenuProps } from 'antd';
import type { Language } from '../types';
import './Navbar.scss';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isConnected, account, connectWallet, disconnectWallet, isConnecting } = useWeb3();
  const { message } = App.useApp();

  const supportedLanguages: Language[] = [
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' }
  ];

  const currentLanguage = supportedLanguages.find(lang => lang.code === i18n.language) || supportedLanguages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  const handleWalletClick = async () => {
    try {
      if (isConnected) {
        await disconnectWallet();
        message.success(t('wallet.disconnected'));
      } else {
        await connectWallet();
        message.success(t('wallet.connected'));
      }
    } catch (error) {
      console.error('Wallet operation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (isConnected) {
        message.error(`断开连接失败: ${errorMessage}`);
      } else {
        message.error(t('wallet.connectFailed'));
      }
    }
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const languageMenuItems: MenuProps['items'] = supportedLanguages.map(lang => ({
    key: lang.code,
    label: (
      <div className="language-item">
        <div className="flag">{lang.flag}</div>
        <div>{lang.name}</div>
      </div>
    ),
    onClick: () => handleLanguageChange(lang.code)
  }));

  return (
    <nav className="app-navbar">
      <div className="nav-content">
        <div className="nav-brand">
          <Link to="/" className="brand-logo">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <div className="brand-text">Weard OS</div>
          </Link>
          <nav className="nav-menu" role="navigation" aria-label="主导航">
            <Link 
              to="/"
              className={`nav-item ${isActive('/') ? 'active' : ''}`}
            >
              {t('nav.homepage')}
            </Link>
            <Link 
              to="/auto-monitoring"
              className={`nav-item ${isActive('/auto-monitoring') ? 'active' : ''}`}
            >
              {t('nav.autoMonitoring')}
            </Link>
            <Link 
              to="/chat"
              className={`nav-item ${isActive('/chat') ? 'active' : ''}`}
            >
              {t('nav.chat')}
            </Link>
          </nav>
        </div>
        
        <div className="nav-actions">
          {/* 语言选择 */}
          <Dropdown 
            menu={{ items: languageMenuItems }}
            trigger={['click']}
            className="language-selector"
          >
            <Button type="text" className="language-btn">
              <Space>
                <GlobalOutlined />
                <div className="flag">{currentLanguage.flag}</div>
                <div className="lang-name">{currentLanguage.name}</div>
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>

          {/* 连接钱包按钮 */}
          {!isConnected ? (
            <Button
              type="primary"
              className="connect-wallet-btn"
              icon={<WalletOutlined />}
              loading={isConnecting}
              onClick={handleWalletClick}
            >
              {t('wallet.connect')}
            </Button>
          ) : (
            <Space>
              {/* 钱包信息显示 */}
              <Button
                type="default"
                className="wallet-info-btn"
                icon={<WalletOutlined />}
                disabled
              >
                <span className="wallet-info">
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </span>
              </Button>
              
              {/* 断开连接按钮 */}
              <Button
                type="default"
                danger
                className="disconnect-wallet-btn"
                loading={isConnecting}
                onClick={handleWalletClick}
              >
                {t('wallet.disconnect')}
              </Button>
            </Space>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;