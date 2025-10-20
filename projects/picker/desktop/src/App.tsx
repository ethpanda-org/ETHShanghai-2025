import { useState, useEffect } from 'react'
import './App.css'
import MarketplaceContent from './components/MarketplaceContent'
import ProfileContent from './components/ProfileContent'
import ChatbotContent from './components/ChatbotContent'
import LogStream from './components/LogStream'
import MainContent from './components/MainContent'
import { clientAPI } from './client/api'
import type { UserSystemInfoResponse, UserInfo }  from './types'
import { openUrl } from '@tauri-apps/plugin-opener'

function App() {
  const [activePage, setActivePage] = useState<'home' | 'chatbot' | 'marketplace' | 'profile'>('home')
  
  // 登录状态管理
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [serverConnected, setServerConnected] = useState(false)

  // 表单状态管理
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  // API调用函数
  const handleLogin = async (email: string, password: string) => {
    try {
      const response: UserSystemInfoResponse = await clientAPI.login(email, password);
      setCurrentUser({
        user_id: response.user_info.user_id,
        email: response.user_info.email,
        user_name: response.user_info.user_name || "OpenPick",
        user_type: response.user_info.user_type.toLowerCase() === 'gen' ? 'User' : 'Developer',
        wallet_address: response.user_info.wallet_address,
        premium_balance: response.user_info.premium_balance || 0,
        created_at: response.user_info.created_at,
      });
      setIsLoggedIn(true);
      setShowLoginModal(false);
      // 跳转到Home页面而不是刷新页面
      setActivePage('home');
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. ' + (error instanceof Error ? error.message : 'Please try again.'));
    }
  };

  const handleRegister = async (email: string, username: string, password: string) => {
    try {
      await clientAPI.register(email, username, password, 'gen');
      
      // 注册成功后，显示验证邮箱的弹窗
      setShowSignupModal(false);
      setShowVerifyModal(true);
      setVerifyEmail(email);
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. ' + (error instanceof Error ? error.message : 'Please try again.'));
    }
  };

  const handleVerifyEmail = async (email: string, code: string) => {
    try {
      await clientAPI.verifyEmail(email, code);
      alert('Email verified successfully! You can now login.');
      setShowVerifyModal(false);
      setShowLoginModal(true);
    } catch (error) {
      console.error('Email verification error:', error);
      alert('Verification failed. ' + (error instanceof Error ? error.message : 'Please try again.'));
    }
  };

  const handleLogout = async () => {
    try {
      await clientAPI.logout();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setShowLogoutMenu(false);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed. ' + (error instanceof Error ? error.message : 'Please try again.'));
    }
  };

  // 检查登录状态
  const checkLoginStatus = async () => {
    try {
      const loggedIn = await clientAPI.checkLoginStatus()
      setIsLoggedIn(loggedIn)
      if (loggedIn) {
        const userInfo: UserInfo = await clientAPI.getCurrentUserInfo();
        // const systemInfo = await clientAPI.getSystemInfo();
        // const walletBalance: number = await clientAPI.getWalletBalance(userInfo.wallet_address, systemInfo.chain_url);
        setCurrentUser({
          user_id: userInfo.user_id,
          email: userInfo.email,
          user_name: userInfo.user_name,
          user_type: userInfo.user_type,
          wallet_address: userInfo.wallet_address,
          premium_balance: userInfo.premium_balance,
          created_at: userInfo.created_at,
          // id: userInfo.user_id,
          // username: userInfo.user_name || "OpenPick",
          // avatar: userInfo.user_name.substring(0, 2).toUpperCase() || "OP",
          // wallet: walletBalance ? Math.round(walletBalance / 1e7) / 1e2 : 0,
          // premium: userInfo.premium_balance || 0,
        });
      }
    } catch (error) {
      console.error('Check login status error:', error);
      setIsLoggedIn(false)
    }
  }

  const checkServerStatus = async () => {
    try {
      const status = await clientAPI.checkServerConnection();
      setServerConnected(status.is_connected);
    } catch (error) {
      console.error('Check server status error:', error);
      setServerConnected(false);
    }
  }

  // 组件挂载时检查登录状态和服务器连接状态
  useEffect(() => {
    checkServerStatus()
    checkLoginStatus()
  }, [])

  return (
    <div className="app">
      {/* Top Header */}
      <div className="top-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-text">OpenPick</span>
          </div>
          <nav className="nav-menu">
            <button 
              className={`nav-item ${activePage === 'home' ? 'active' : ''}`}
              onClick={() => setActivePage('home')}
            >
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Home</span>
            </button>
            <button 
              className={`nav-item ${activePage === 'chatbot' ? 'active' : ''}`}
              onClick={() => setActivePage('chatbot')}
            >
              <span className="nav-icon">🤖</span>
              <span className="nav-text">Chatbot</span>
            </button>
            {serverConnected && (
              <button 
                className={`nav-item ${activePage === 'marketplace' ? 'active' : ''}`}
                onClick={() => setActivePage('marketplace')}
              >
                <span className="nav-icon">🛒</span>
                <span className="nav-text">Marketplace</span>
              </button>
            )}
            {serverConnected && (
              <button 
                className={`nav-item ${activePage === 'profile' ? 'active' : ''}`}
                onClick={() => setActivePage('profile')}
              >
                <span className="nav-icon">👤</span>
                <span className="nav-text">Profile</span>
              </button>
            )}
          </nav>
        </div>
        <div className="header-right">
          {isLoggedIn ? (
            <div 
              className="user-info"
              onClick={() => setShowLogoutMenu(!showLogoutMenu)}
              onMouseLeave={() => setTimeout(() => setShowLogoutMenu(false), 2000)}
            >
              <div className="user-avatar">{currentUser?.user_name?.substring(0, 2).toUpperCase() || 'OP'}</div>
              <div className="user-details">
                <span className="username">{currentUser?.user_name || 'OpenPick'}</span>
                <div className="user-stats">
                  <span className="wallet-badge">{currentUser?.user_type}</span>
                  {/* <span className="premium-badge">Premium:{currentUser?.premium || 0}</span> */}
                </div>
              </div>
              {showLogoutMenu && (
                <div className="logout-menu">
                  <button 
                    className="logout-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : serverConnected ? (
            <div className="auth-buttons">
              <button 
                className="login-button"
                onClick={() => setShowLoginModal(true)}
              >
                Login
              </button>
              <button 
                className="signup-button"
                onClick={() => setShowSignupModal(true)}
              >
                Sign Up
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="app-main">
        {/* Sidebar */}
        <div className="sidebar">
        
        <div className="post-section">
          <div className="section-header">
            <span className="section-icon">📝</span>
            <span className="section-title">User Guide</span>
          </div>
          <div 
            className="post-item"
            onClick={async () => {
              // 这里应该打开具体的链接，暂时使用一个示例链接
              // 在实际应用中，您可能需要根据帖子ID或其他标识符来确定要打开的链接
              await openUrl('https://www.openpick.org/zh-cn/docs/guide/configure_picker_environment/')
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="post-meta">
              <span className="post-id">2510106</span>
              <span className="post-action">Update</span>
            </div>
            <div className="post-title">How to configure the Picker task runtime environment</div>
            <div className="post-subtitle">Read more</div>
          </div>
        </div>

        <div className="support-section">
          <div className="section-header">
            <span className="section-icon">🛠️</span>
            <span className="section-title">Official Account</span>
          </div>
          <div className="qr-code">
            <img src="/openpick_qrcode.jpg" alt="QR Code" className="qr-image" />
          </div>
          <div className="support-contact">
            <span className="contact-icon">📧</span>
            <span className="contact-text">Developer Wechat</span>
          </div>
            <div className="qr-code">
            <img src="/dev_wechat.jpg" alt="QR Code" className="qr-image" />
          </div>
        </div>

        </div>

        {/* Main Content */}
        <div className="main-content">
          {activePage === 'home' ? (
            <MainContent activeTab={activePage} />
          ) : activePage === 'chatbot' ? (
              <ChatbotContent activeTab={activePage} />
          ) : activePage === 'marketplace' && serverConnected ? (
            <MarketplaceContent activeTab={activePage} />
          ) : activePage === 'profile' && serverConnected ? (
            <ProfileContent activeTab={activePage} />
          ) : (
            <MainContent activeTab={activePage} />
          )}
        </div>
      </div>

      {/* Bottom Log Stream */}
      <LogStream />

      {/* Login Modal */}
      {showLoginModal && serverConnected && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Login</h2>
              <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  type="email"
                  id="login-email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  type="password"
                  id="login-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button secondary"
                onClick={() => setShowLoginModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-button primary"
                onClick={() => handleLogin(loginEmail, loginPassword)}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {showSignupModal && serverConnected && (
        <div className="modal-overlay" onClick={() => setShowSignupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sign Up</h2>
              <button className="modal-close" onClick={() => setShowSignupModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="signup-email">Email</label>
                <input
                  type="email"
                  id="signup-email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="signup-username">Username</label>
                <input
                  type="text"
                  id="signup-username"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  placeholder="Choose a username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="signup-password">Password</label>
                <input
                  type="password"
                  id="signup-password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Create a password"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button secondary"
                onClick={() => setShowSignupModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-button primary"
                onClick={() => handleRegister(signupEmail, signupUsername, signupPassword)}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Verification Modal */}
      {showVerifyModal && serverConnected && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Verify Email</h2>
              <button className="modal-close" onClick={() => setShowVerifyModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>A verification code has been sent to {verifyEmail}, Please verify and complete registration.</p>
              <div className="form-group">
                <label htmlFor="verify-code">Verification Code</label>
                <input
                  type="text"
                  id="verify-code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="Enter verification code"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button secondary"
                onClick={() => setShowVerifyModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-button primary"
                onClick={() => handleVerifyEmail(verifyEmail, verifyCode)}
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
