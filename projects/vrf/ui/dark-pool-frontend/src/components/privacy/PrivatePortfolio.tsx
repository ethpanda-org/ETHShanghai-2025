import React, { useState, useCallback } from 'react';
import { ChevronDownIcon, ChevronRightIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline';
import { ObfuscationUtils, RangeUtils } from '../../utils/index.js';
import { cn } from '../../utils/cn.js';

interface Position {
  id: string;
  symbol: string;
  size: number;
  value: number;
  pnl: number;
  pnlPercentage: number;
}

interface PrivatePortfolioProps {
  positions: Position[];
  totalValue: number;
  className?: string;
}

type DisclosureLevel = 0 | 1 | 2 | 3;

export const PrivatePortfolio: React.FC<PrivatePortfolioProps> = ({
  positions,
  totalValue,
  className = ''
}) => {
  const [disclosureLevel, setDisclosureLevel] = useState<DisclosureLevel>(0);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  const toggleDisclosure = useCallback(() => {
    setDisclosureLevel(prev => Math.min(prev + 1, 3) as DisclosureLevel);
  }, []);

  const togglePosition = useCallback((positionId: string) => {
    setExpandedPositions(prev => {
      const next = new Set(prev);
      if (next.has(positionId)) {
        next.delete(positionId);
      } else {
        next.add(positionId);
      }
      return next;
    });
  }, []);

  const getDisclosureIcon = () => {
    switch (disclosureLevel) {
      case 0:
        return <LockClosedIcon className="h-4 w-4 text-red-400" />;
      case 1:
        return <LockClosedIcon className="h-4 w-4 text-orange-400" />;
      case 2:
        return <LockClosedIcon className="h-4 w-4 text-yellow-400" />;
      case 3:
        return <LockOpenIcon className="h-4 w-4 text-green-400" />;
    }
  };

  const getDisclosureLabel = () => {
    switch (disclosureLevel) {
      case 0:
        return 'Asset existence only';
      case 1:
        return 'Aggregated values';
      case 2:
        return 'Position details';
      case 3:
        return 'Full disclosure';
    }
  };

  const renderTotalValue = () => {
    switch (disclosureLevel) {
      case 0:
        return <span className="text-gray-500">***</span>;
      case 1:
        return (
          <RangeDisplay
            value={totalValue}
            variance={20}
            unit=" USD"
            className="font-mono"
          />
        );
      case 2:
        return (
          <span className="font-mono text-green-400">
            ${totalValue.toLocaleString()}
          </span>
        );
      case 3:
        return (
          <div className="space-y-1">
            <span className="font-mono text-green-400">
              ${totalValue.toLocaleString()}
            </span>
            <div className="text-xs text-gray-400">
              {positions.length} positions
            </div>
          </div>
        );
    }
  };

  const renderPosition = (position: Position) => {
    const isExpanded = expandedPositions.has(position.id);

    return (
      <div
        key={position.id}
        className="border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors"
      >
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => togglePosition(position.id)}
        >
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-200">{position.symbol}</span>
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
            )}
          </div>

          <div className="flex items-center space-x-4">
            {disclosureLevel >= 1 && (
              <div className="text-right">
                <div className="text-sm text-gray-400">Size</div>
                <div className="font-mono text-sm">
                  {disclosureLevel === 1 ? (
                    ObfuscationUtils.asteriskRepresentation(position.size)
                  ) : (
                    position.size.toFixed(4)
                  )}
                </div>
              </div>
            )}

            <div className="text-right">
              <div className="text-sm text-gray-400">P&L</div>
              <div
                className={cn(
                  'font-mono text-sm',
                  position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                )}
              >
                {disclosureLevel === 0 ? (
                  '***'
                ) : disclosureLevel === 1 ? (
                  position.pnl >= 0 ? '+*' : '-*'
                ) : (
                  `${position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}`
                )}
              </div>
            </div>
          </div>
        </div>

        {isExpanded && disclosureLevel >= 2 && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Value</span>
              <span className="font-mono">
                ${position.value.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">P&L %</span>
              <span
                className={cn(
                  'font-mono',
                  position.pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'
                )}
              >
                {position.pnlPercentage.toFixed(2)}%
              </span>
            </div>
            {disclosureLevel === 3 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Position ID</span>
                <span className="font-mono text-xs text-gray-500">
                  {ObfuscationUtils.maskAddress(position.id)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('bg-gray-900 rounded-xl p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Portfolio</h2>
        <button
          onClick={toggleDisclosure}
          className="flex items-center space-x-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          title={`Current: ${getDisclosureLabel()}. Click to reveal more.`}
        >
          {getDisclosureIcon()}
          <span className="text-sm text-gray-300">{getDisclosureLabel()}</span>
        </button>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-1">Total Value</div>
        <div className="text-2xl font-bold">
          {renderTotalValue()}
        </div>
      </div>

      <div className="space-y-3">
        {positions.map(renderPosition)}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Privacy Level: {disclosureLevel + 1}/4</span>
          <span>Click positions to expand</span>
        </div>
      </div>
    </div>
  );
};