import React from 'react';
import { RangeUtils } from '../../utils/index.js';
import { cn } from '../../utils/cn.js';

interface RangeDisplayProps {
  value: string | number;
  variance?: number;
  precision?: number;
  unit?: string;
  showExact?: boolean;
  className?: string;
  onShowExact?: () => void;
}

export const RangeDisplay: React.FC<RangeDisplayProps> = ({
  value,
  variance = 10,
  precision = 2,
  unit = '',
  showExact = false,
  className = '',
  onShowExact
}) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return <span className={cn('text-gray-500', className)}>***</span>;
  }

  const range = RangeUtils.createRange(numValue, {
    percentage: variance,
    precision
  });

  const formattedRange = RangeUtils.formatRange({ ...range, unit }, precision);

  return (
    <div className={cn('inline-flex items-center', className)}>
      <span className="font-mono text-gray-300">
        {showExact ? (
          <span className="text-green-400">
            {numValue.toFixed(precision)}{unit}
          </span>
        ) : (
          <>
            <span className="text-gray-400">≈</span>
            <span className="ml-1">{formattedRange}</span>
          </>
        )}
      </span>

      {!showExact && onShowExact && (
        <button
          onClick={onShowExact}
          className="ml-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Show exact
        </button>
      )}
    </div>
  );
};