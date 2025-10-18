import React, { useState } from 'react';
import AnalysisPage from './pages/AnalysisPage';
import TestConnection from './components/TestConnection';

function App() {
  const [currentPage, setCurrentPage] = useState<'analysis' | 'test'>('analysis');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                ContractGuard AI
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('analysis')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === 'analysis'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                合约分析
              </button>
              <button
                onClick={() => setCurrentPage('test')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === 'test'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                连接测试
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 页面内容 */}
      <main>
        {currentPage === 'analysis' && <AnalysisPage />}
        {currentPage === 'test' && <TestConnection />}
      </main>
    </div>
  );
}

export default App;