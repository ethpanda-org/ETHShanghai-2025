'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'trade';
  message: string;
}

interface StatusPanelProps {
  status: 'idle' | 'starting' | 'running' | 'paused' | 'stopped' | 'error';
  logs: LogEntry[];
  onClearLogs: () => void;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

export default function StatusPanel({ 
  status, 
  logs, 
  onClearLogs, 
  onStart, 
  onPause, 
  onStop 
}: StatusPanelProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'starting':
        return 'bg-blue-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return '未启动';
      case 'starting':
        return '启动中...';
      case 'running':
        return '运行中';
      case 'paused':
        return '已暂停';
      case 'stopped':
        return '已停止';
      case 'error':
        return '错误';
      default:
        return '未知状态';
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'trade':
        return '💰';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">策略状态</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={onStart}
          disabled={status === 'starting' || status === 'running'}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            status === 'starting' || status === 'running'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          启动
        </button>
        <button
          onClick={onPause}
          disabled={status !== 'running'}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            status !== 'running'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          暂停
        </button>
        <button
          onClick={onStop}
          disabled={status === 'idle' || status === 'stopped'}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            status === 'idle' || status === 'stopped'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          停止
        </button>
      </div>

      {/* 日志显示 */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">交易日志</h4>
          <button
            onClick={onClearLogs}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            清空日志
          </button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              暂无日志记录
            </p>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2 text-sm">
                  <span className="flex-shrink-0">{getLogIcon(log.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {log.timestamp}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        log.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        log.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        log.type === 'trade' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {log.type === 'error' ? '错误' :
                         log.type === 'success' ? '成功' :
                         log.type === 'trade' ? '交易' : '信息'}
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-white mt-1">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
