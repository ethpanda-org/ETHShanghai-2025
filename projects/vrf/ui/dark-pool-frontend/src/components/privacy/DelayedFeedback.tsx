import React, { useState, useEffect } from 'react';
import { DelayUtils } from '../../utils/index.js';
import { cn } from '../../utils/cn.js';

interface DelayedFeedbackProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  minDelay?: number;
  maxDelay?: number;
  className?: string;
  children?: React.ReactNode;
}

export const DelayedFeedback: React.FC<DelayedFeedbackProps> = ({
  status,
  message,
  minDelay = 1000,
  maxDelay = 3000,
  className = '',
  children
}) => {
  const [displayStatus, setDisplayStatus] = useState(status);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      if (status !== displayStatus) {
        setIsAnimating(true);
        await DelayUtils.randomDelay(minDelay, maxDelay);
        setDisplayStatus(status);
        setIsAnimating(false);
      }
    };

    updateStatus();
  }, [status, displayStatus, minDelay, maxDelay]);

  const getStatusIcon = () => {
    switch (displayStatus) {
      case 'pending':
        return (
          <div className="animate-pulse">
            <div className="h-2 w-2 bg-yellow-400 rounded-full" />
          </div>
        );
      case 'processing':
        return (
          <div className="animate-spin">
            <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" />
          </div>
        );
      case 'completed':
        return (
          <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse" />
        );
      case 'failed':
        return (
          <div className="h-3 w-3 bg-red-400 rounded-full" />
        );
    }
  };

  const getStatusColor = () => {
    switch (displayStatus) {
      case 'pending':
        return 'text-yellow-400';
      case 'processing':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
    }
  };

  const getStatusMessage = () => {
    if (message) return message;

    switch (displayStatus) {
      case 'pending':
        return 'Initializing...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center space-x-2 transition-all duration-300',
        getStatusColor(),
        isAnimating && 'opacity-50',
        className
      )}
    >
      {getStatusIcon()}
      <span className="text-sm">{getStatusMessage()}</span>
      {children}
    </div>
  );
};