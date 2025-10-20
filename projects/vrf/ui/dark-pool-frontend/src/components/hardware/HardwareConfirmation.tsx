import React, { useState, useEffect } from 'react';
import {
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn.js';

interface HardwareConfirmationProps {
  transaction: {
    action: string;
    amount: string;
    recipient: string;
    asset?: string;
  };
  onConfirm?: (approved: boolean) => void;
  className?: string;
}

export const HardwareConfirmation: React.FC<HardwareConfirmationProps> = ({
  transaction,
  onConfirm,
  className = ''
}) => {
  const [status, setStatus] = useState<'connecting' | 'ready' | 'waiting' | 'approved' | 'rejected'>('connecting');
  const [deviceName, setDeviceName] = useState<string>('Ledger');
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    // Simulate device connection
    const timer = setTimeout(() => {
      setStatus('ready');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === 'waiting' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && status === 'waiting') {
      setStatus('rejected');
      onConfirm?.(false);
    }
  }, [status, timeLeft, onConfirm]);

  const handleConfirm = async () => {
    setStatus('waiting');

    // Simulate hardware confirmation
    setTimeout(() => {
      if (Math.random() > 0.1) { // 90% success rate for demo
        setStatus('approved');
        onConfirm?.(true);
      } else {
        setStatus('rejected');
        onConfirm?.(false);
      }
    }, 3000);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connecting':
        return <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-400" />;
      case 'ready':
        return <DevicePhoneMobileIcon className="h-8 w-8 text-green-400" />;
      case 'waiting':
        return <DevicePhoneMobileIcon className="h-8 w-8 text-yellow-400 animate-pulse" />;
      case 'approved':
        return <CheckCircleIcon className="h-8 w-8 text-green-400" />;
      case 'rejected':
        return <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting to hardware wallet...';
      case 'ready':
        return `${deviceName} connected and ready`;
      case 'waiting':
        return `Please confirm on your ${deviceName} device (${timeLeft}s)`;
      case 'approved':
        return 'Transaction approved!';
      case 'rejected':
        return 'Transaction rejected or timed out';
    }
  };

  return (
    <div className={cn('bg-gray-900 rounded-xl p-6', className)}>
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          {getStatusIcon()}
        </div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">
          Hardware Wallet Confirmation
        </h3>
        <p className="text-gray-400 text-sm">
          {getStatusMessage()}
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Transaction Details</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Action:</span>
            <span className="text-gray-200">{transaction.action}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Amount:</span>
            <span className="text-gray-200 font-mono">{transaction.amount}</span>
          </div>
          {transaction.asset && (
            <div className="flex justify-between">
              <span className="text-gray-400">Asset:</span>
              <span className="text-gray-200">{transaction.asset}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Recipient:</span>
            <span className="text-gray-200 font-mono text-sm">
              {transaction.recipient.slice(0, 10)}...{transaction.recipient.slice(-8)}
            </span>
          </div>
        </div>
      </div>

      {status === 'ready' && (
        <button
          onClick={handleConfirm}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          Send to Hardware Wallet
        </button>
      )}

      {status === 'waiting' && (
        <div className="space-y-3">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>
          <div className="text-center text-sm text-gray-400">
            Check your {deviceName} device and confirm the transaction
          </div>
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <DevicePhoneMobileIcon className="h-4 w-4" />
            <span>Press both buttons on your {deviceName}</span>
          </div>
        </div>
      )}

      {status === 'approved' && (
        <div className="text-center py-3 bg-green-900/20 border border-green-500/30 rounded-lg">
          <CheckCircleIcon className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <span className="text-green-400 font-medium">Transaction Confirmed</span>
        </div>
      )}

      {status === 'rejected' && (
        <div className="text-center py-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <span className="text-red-400 font-medium">Transaction Failed</span>
          <button
            onClick={() => setStatus('ready')}
            className="mt-2 text-sm text-blue-400 hover:text-blue-300"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};