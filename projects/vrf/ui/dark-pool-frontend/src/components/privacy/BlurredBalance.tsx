import React, { useState, useCallback } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { ObfuscationUtils, type BlurLevel } from '../../utils/index.js';
import { cn } from '../../utils/cn.js';

interface BlurredBalanceProps {
  value: string | number;
  blurLevel?: keyof BlurLevel;
  unit?: string;
  showToggle?: boolean;
  requireAuth?: boolean;
  className?: string;
  onReveal?: () => void;
  precision?: number;
}

export const BlurredBalance: React.FC<BlurredBalanceProps> = ({
  value,
  blurLevel = 'medium',
  unit = '',
  showToggle = true,
  requireAuth = false,
  className = '',
  onReveal,
  precision = 2
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleReveal = useCallback(() => {
    if (requireAuth) {
      setIsAuthenticating(true);
      onReveal?.();
      // Simulate authentication delay
      setTimeout(() => {
        setIsRevealed(true);
        setIsAuthenticating(false);
      }, 1500);
    } else {
      setIsRevealed(!isRevealed);
    }
  }, [isRevealed, requireAuth, onReveal]);

  const formatValue = (val: string | number): string => {
    const numValue = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(numValue)) return '****';
    return numValue.toFixed(precision);
  };

  const displayValue = isRevealed
    ? formatValue(value) + unit
    : ObfuscationUtils.blurValue(value, blurLevel) + (unit ? ` ${unit}` : '');

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <span
        className={cn(
          'font-mono transition-all duration-300',
          !isRevealed && 'privacy-blur blurred-strong',
          isRevealed && 'text-green-400'
        )}
      >
        {isAuthenticating ? (
          <span className="animate-pulse">Authenticating...</span>
        ) : (
          displayValue
        )}
      </span>

      {showToggle && (
        <button
          onClick={handleReveal}
          className="ml-2 p-1 text-gray-400 hover:text-gray-200 transition-colors"
          title={isRevealed ? 'Hide balance' : 'Show balance'}
        >
          {isRevealed ? (
            <EyeSlashIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
};