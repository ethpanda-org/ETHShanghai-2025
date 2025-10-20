'use client';

import { useState, useEffect } from 'react';
import TradingForm from './components/TradingForm';
import StatusPanel from './components/StatusPanel';
import PriceDisplay from './components/PriceDisplay';
import { tradingAPI, GridConfig } from './services/api';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'trade';
  message: string;
}

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'paused' | 'stopped' | 'error'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTradingPair, setCurrentTradingPair] = useState('');
  const [currentPrivateKey, setCurrentPrivateKey] = useState('');
  const [currentStrategyId, setCurrentStrategyId] = useState<string | null>(null);

  // 添加日志
  const addLog = (type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setLogs(prev => [...prev, newLog]);
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
  };

  // 启动策略
  const handleStartStrategy = async (config: GridConfig) => {
    setIsLoading(true);
    setStatus('starting');
    setCurrentTradingPair(config.trading_pair);
    setCurrentPrivateKey(config.private_key);
    addLog('info', '正在启动策略...');

    try {
      const response = await tradingAPI.startStrategy(config);
      
      setStatus('running');
      setCurrentStrategyId(response.strategy_id);
      addLog('success', `✅ 策略启动成功！策略ID: ${response.strategy_id}`);
      addLog('info', `交易对: ${config.trading_pair}`);
      addLog('info', `网格数量: ${config.grid_count}`);
      addLog('info', `价格区间: ${config.lower_price} - ${config.upper_price}`);
      addLog('info', `总投资额: ${config.total_amount}`);
    } catch (error: any) {
      setStatus('error');
      addLog('error', `❌ 策略启动失败: ${error.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 暂停策略
  const handlePauseStrategy = async () => {
    if (!currentStrategyId) {
      addLog('error', '没有运行中的策略');
      return;
    }
    
    try {
      await tradingAPI.pauseStrategy(currentStrategyId);
      setStatus('paused');
      addLog('info', '策略已暂停');
    } catch (error: any) {
      addLog('error', `暂停失败: ${error.message || '未知错误'}`);
    }
  };

  // 恢复策略
  const handleResumeStrategy = async () => {
    if (!currentStrategyId) {
      addLog('error', '没有暂停的策略');
      return;
    }
    
    try {
      await tradingAPI.resumeStrategy(currentStrategyId);
      setStatus('running');
      addLog('info', '策略已恢复');
    } catch (error: any) {
      addLog('error', `恢复失败: ${error.message || '未知错误'}`);
    }
  };

  // 停止策略
  const handleStopStrategy = async () => {
    if (!currentStrategyId) {
      addLog('error', '没有运行中的策略');
      return;
    }
    
    try {
      await tradingAPI.stopStrategy(currentStrategyId);
      setStatus('stopped');
      setCurrentStrategyId(null);
      addLog('info', '策略已停止');
    } catch (error: any) {
      addLog('error', `停止失败: ${error.message || '未知错误'}`);    }
  };

  // 定期检查策略状态
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (status === 'running' && currentStrategyId) {
      interval = setInterval(async () => {
        try {
          const statusResponse = await tradingAPI.getStrategyStatus(currentStrategyId);
          // 这里可以根据需要更新状态
        } catch (error) {
          console.error('获取策略状态失败:', error);
        }
      }, 5000); // 每5秒检查一次
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status, currentStrategyId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              EasyTrader
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                智能交易策略控制台
              </p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              团队: EasyTrader
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：参数配置 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                交易参数配置
              </h2>
              <TradingForm 
                onSubmit={handleStartStrategy}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* 右侧：状态和价格 */}
          <div className="space-y-6">
            {/* 价格显示 */}
            <PriceDisplay tradingPair={currentTradingPair} privateKey={currentPrivateKey} />
            
            {/* 状态面板 */}
            <StatusPanel
              status={status}
              logs={logs}
              onClearLogs={clearLogs}
              onStart={() => {}} // 通过表单启动
              onPause={handlePauseStrategy}
              onStop={handleStopStrategy}
            />
          </div>
        </div>
      </main>

      {/* 底部信息 */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>⚠️ 安全提示：您的 API Key 仅用于本地交易策略执行，不会上传到服务器</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <a
                href="https://github.com/Liuzhichao99/EthShanghai2025EasyTrader"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                GitHub 项目地址
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
