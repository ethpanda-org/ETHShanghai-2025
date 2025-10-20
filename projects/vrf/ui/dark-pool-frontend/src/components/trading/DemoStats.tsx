import React from 'react';
import type { Epoch } from '../../types/block';

interface DemoStatsProps {
  stats: {
    totalEpochs: number;
    totalOrders: number;
    totalMatched: number;
    matchRate: string;
  };
  historicalEpochs: Epoch[];
}

export const DemoStats: React.FC<DemoStatsProps> = ({ stats, historicalEpochs }) => {
  // Don't display demo stats since we've removed all fabricated trading data
  // This component now shows a message indicating real trading is needed
  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-6">
      <div className="text-center text-gray-500">
        <div className="text-lg font-medium mb-2">No Demo Data</div>
        <div className="text-xs">Trading statistics will appear when real orders are placed</div>
      </div>
    </div>
  );
};