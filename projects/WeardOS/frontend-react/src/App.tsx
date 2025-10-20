import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme, Spin, App as AntdApp } from 'antd';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import './App.scss';

// 懒加载组件以提高性能
const Web3HomePage = lazy(() => import('./components/Web3HomePage'));
const AutoMonitoringPage = lazy(() => import('./components/AutoMonitoringPage'));
const ChatPage = lazy(() => import('./components/ChatPage'));

// 加载中组件
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <Spin size="large" />
  </div>
);

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          colorBgBase: '#0a0a0a',
          borderRadius: 12,
          wireframe: false,
        },
      }}
    >
      <AntdApp>
        <ErrorBoundary>
          <Router>
            <div className="app">
              <Navbar />
              <main className="main-content">
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/" element={<Web3HomePage />} />
                    <Route path="/auto-monitoring" element={<AutoMonitoringPage />} />
                    <Route path="/chat" element={<ChatPage />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </Router>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;