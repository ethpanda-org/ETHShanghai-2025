import React, { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import { MonitorOutlined } from '@ant-design/icons';
import { useWeb3 } from '../hooks/useWeb3';
import type { MonitoringData, DetectionResult } from '../types';
import './AutoMonitoringPanel.scss';

const AutoMonitoringPanel: React.FC = () => {
  const { isConnected } = useWeb3();
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  const [monitoringData] = useState<MonitoringData>({
    totalTransactions: 3,
    highRiskTransactions: 1,
    blockedTransactions: 0,
    riskScore: 23.3
  });

  const [detectionResults] = useState<DetectionResult[]>([
    {
      id: 1,
      hash: '0x7ba001...0105:36',
      tags: [
        { text: '高风险交易', type: 'danger' },
        { text: '恶意合约', type: 'warning' }
      ],
      result: '恶意交易',
      time: '2025/10/13 14:31:59',
      riskLevel: 'high'
    },
    {
      id: 2,
      hash: '0xab7d86...b013:78',
      tags: [
        { text: '正常交易', type: 'success' }
      ],
      result: '正常',
      time: '2025/10/13 14:31:05',
      riskLevel: 'normal'
    }
  ]);

  const startMonitoring = async () => {
    if (!isConnected) {
      message.warning('请先连接钱包');
      return;
    }
    
    setIsStarting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsMonitoring(true);
      message.success('监控已启动');
    } catch (error) {
      console.error('启动监控失败:', error);
      message.error('启动失败');
    } finally {
      setIsStarting(false);
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    message.success('监控已停止');
  };

  useEffect(() => {
    // 初始化
    return () => {
      // 清理
    };
  }, []);

  return (
    <div className="auto-monitoring-panel">
      {/* 页面标题 */}
      <div className="page-header">
        <div className="header-icon">
          <MonitorOutlined />
        </div>
        <h1 className="page-title">自动监控</h1>
      </div>

      {/* 监控状态和控制 */}
      <div className="monitoring-status">
        <div className={`status-indicator ${isMonitoring ? 'active' : ''}`}>
          <div className="status-dot"></div>
          <div className="status-text">{isMonitoring ? '已启动' : '已停止'}</div>
        </div>
        
        <div className="control-buttons">
          {!isMonitoring ? (
            <Button 
              type="primary"
              onClick={startMonitoring}
              loading={isStarting}
              size="middle"
              className="success-btn"
            >
              启动监控
            </Button>
          ) : (
            <Button 
              onClick={stopMonitoring}
              size="middle"
              className="info-btn"
            >
              停止监控
            </Button>
          )}
        </div>
      </div>

      {/* 实时监控数据 */}
      <div className="stats-section">
        <div className="section-title">
          <div className="title-icon">📊</div>
          <div>实时监控数据</div>
        </div>
        
        <div className="stats-grid">
          <div 
            className="stat-card blue"
            style={{ '--card-index': 0 } as React.CSSProperties}
          >
            <div className="stat-icon">🔍</div>
            <div className="stat-content">
              <div className="stat-value">{monitoringData.totalTransactions}</div>
              <div className="stat-label">总交易数</div>
            </div>
          </div>
          
          <div 
            className="stat-card orange"
            style={{ '--card-index': 1 } as React.CSSProperties}
          >
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-value">{monitoringData.highRiskTransactions}</div>
              <div className="stat-label">高风险交易</div>
            </div>
          </div>
          
          <div 
            className="stat-card blue-light"
            style={{ '--card-index': 2 } as React.CSSProperties}
          >
            <div className="stat-icon">🛡️</div>
            <div className="stat-content">
              <div className="stat-value">{monitoringData.blockedTransactions}</div>
              <div className="stat-label">已拦截交易</div>
            </div>
          </div>
          
          <div 
            className="stat-card purple"
            style={{ '--card-index': 3 } as React.CSSProperties}
          >
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">{monitoringData.riskScore}%</div>
              <div className="stat-label">平均风险等级</div>
            </div>
          </div>
        </div>
      </div>

      {/* 监控检测结果 */}
      <div className="detection-results">
        <div className="section-title">
          <div className="title-icon">🔍</div>
          <div>监控检测结果</div>
        </div>
        
        <div className="results-list">
          {detectionResults.map((result, index) => (
            <div 
              key={result.id}
              className={`result-item ${result.riskLevel}`}
              style={{ '--result-index': index } as React.CSSProperties}
            >
              <div className="result-hash">{result.hash}</div>
              <div className="result-tags">
                {result.tags.map((tag, tagIndex) => (
                  <div 
                    key={`tag-${result.id}-${tagIndex}-${tag.text}`}
                    className={`result-tag ${tag.type}`}
                  >
                    {tag.text}
                  </div>
                ))}
              </div>
              <div className="result-info">
                <div className="result-label">检测结果: {result.result}</div>
                <div className="result-time">{result.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">ETHxAI</span>
          </div>
          
          <div className="footer-links">
            <div className="link-group">
              <h4>Weard OS</h4>
              <ul>
              </ul>
            </div>
            
            <div className="link-group">
              <h4>Weard OS</h4>
              <ul>
              </ul>
            </div>
            
            <div className="link-group">
              <h4>Weard OS</h4>
              <ul>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="copyright">
            <p>&copy; 2024 ETHxAI. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoMonitoringPanel;