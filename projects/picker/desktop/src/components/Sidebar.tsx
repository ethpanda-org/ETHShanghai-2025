import { useState } from 'react'
import './Sidebar.css'

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('home')

  const logEntries = [
    { id: '1', message: 'Starting task "Data Automation Pipeline"...', type: 'info' },
    { id: '2', message: 'Loading configuration from data.config.json', type: 'info' },
    { id: '3', message: 'Connecting to data source... Connected.', type: 'success' },
    { id: '4', message: 'Processing batch #1 (250 records)', type: 'info' },
    { id: '5', message: 'Processing batch #2 (250 records)', type: 'info' },
    { id: '6', message: 'Processing batch #3 (250 records)', type: 'info' },
    { id: '7', message: 'Processing complete. 750 records processed.', type: 'success' },
    { id: '8', message: 'Generating summary report...', type: 'info' },
    { id: '9', message: 'Summary report available at /reports/summary_240301_153042.json', type: 'success' },
    { id: '10', message: 'Task completed successfully in 12.4 seconds.', type: 'success' },
    { id: '11', message: 'Starting scheduled task "Server Monitoring Agent"', type: 'info' }
  ]

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-text">OpenPick</span>
        </div>
        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            🏠 Home
          </button>
          <button 
            className={`nav-item ${activeTab === 'marketplace' ? 'active' : ''}`}
            onClick={() => setActiveTab('marketplace')}
          >
            🛒 Marketplace
          </button>
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
        </nav>
        {/* <div className="user-info">
          <div className="user-avatar">De</div>
          <div className="user-details">
            <span className="username">Deporter</span>
            <div className="user-stats">
              <span className="wallet-badge">Wallet:10</span>
              <span className="premium-badge">Premium:28</span>
            </div>
          </div>
        </div> */}
      </div>

      {/* Post Section */}
      <div className="post-section">
        <div className="section-header">
          <span className="section-icon">📝</span>
          <span className="section-title">Post</span>
        </div>
        <div className="post-item">
          <div className="post-meta">
            <span className="post-id">240301</span>
            <span className="post-action">Update</span>
          </div>
          <div className="post-title">New Features Release</div>
          <div className="post-subtitle">Read more</div>
        </div>
        <div className="post-item">
          <div className="post-meta">
            <span className="post-id">240215</span>
            <span className="post-type">News</span>
          </div>
          <div className="post-title">Community Spotlight</div>
          <div className="post-subtitle">Read more</div>
        </div>
        <div className="post-item">
          <div className="post-meta">
            <span className="post-id">240130</span>
            <span className="post-type">Tutorial</span>
          </div>
          <div className="post-title">Performance Tips</div>
          <div className="post-subtitle">Read more</div>
        </div>
      </div>

      {/* Support Section */}
      <div className="support-section">
        <div className="section-header">
          <span className="section-icon">🛠️</span>
          <span className="section-title">Support</span>
        </div>
        <div className="qr-code">
          <div className="qr-placeholder">
            <div className="qr-pattern">
              <div className="qr-dot"></div>
              <div className="qr-dot"></div>
              <div className="qr-dot"></div>
              <div className="qr-dot"></div>
              <div className="qr-dot"></div>
              <div className="qr-dot"></div>
              <div className="qr-dot"></div>
              <div className="qr-dot"></div>
              <div className="qr-dot"></div>
            </div>
          </div>
        </div>
        <div className="support-contact">
          <span className="contact-icon">📧</span>
          <span className="contact-text">Contact Support</span>
        </div>
        <div className="support-hours">Support Hours: 9AM-6PM EST</div>
      </div>

      {/* Log Stream */}
      <div className="log-stream">
        <div className="log-header">Log Stream</div>
        <div className="log-content">
          {logEntries.map((entry) => (
            <div key={entry.id} className={`log-entry ${entry.type}`}>
              <span className="log-prefix">&gt;</span>
              <span className="log-message">{entry.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Sidebar