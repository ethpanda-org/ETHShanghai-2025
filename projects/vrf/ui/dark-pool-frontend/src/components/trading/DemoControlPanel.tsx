import React from 'react';
import { PlayIcon, PauseIcon, CogIcon } from '@heroicons/react/24/outline';
import { blockEngine } from '../../services/blockEngine';

interface DemoControlPanelProps {
  isRunning?: boolean;
  onSpeedChange?: (speed: 'normal' | 'fast' | 'ultra-fast') => void;
  currentSpeed?: 'normal' | 'fast' | 'ultra-fast';
}

export const DemoControlPanel: React.FC<DemoControlPanelProps> = ({
  isRunning = true,
  onSpeedChange,
  currentSpeed = 'fast'
}) => {
  const handleStartStop = () => {
    if (isRunning) {
      blockEngine.stop();
    } else {
      blockEngine.start();
    }
  };

  const speedOptions = [
    { value: 'normal', label: 'Normal (5s/block)', description: 'Realistic pace' },
    { value: 'fast', label: 'Fast (2s/block)', description: 'Quick demo' },
    { value: 'ultra-fast', label: 'Ultra-Fast (1s/block)', description: 'Rapid demo' }
  ] as const;

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <CogIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-200">Demo Controls</span>
        </div>
        <button
          onClick={handleStartStop}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isRunning
              ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70'
              : 'bg-green-900/50 text-green-300 hover:bg-green-900/70'
          }`}
        >
          {isRunning ? (
            <>
              <PauseIcon className="h-4 w-4" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4" />
              <span>Start</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-400 mb-2">Generation Speed:</div>
        {speedOptions.map((option) => (
          <label
            key={option.value}
            className="flex items-start space-x-3 cursor-pointer hover:bg-gray-800/50 p-2 rounded transition-colors"
          >
            <input
              type="radio"
              name="speed"
              value={option.value}
              checked={currentSpeed === option.value}
              onChange={(e) => onSpeedChange?.(e.target.value as any)}
              className="mt-0.5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-700 border-gray-600"
            />
            <div>
              <div className="text-sm text-gray-200">{option.label}</div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          <div>• Each epoch = 5 blocks</div>
          <div>• Matching is randomized</div>
          <div>• New epochs generate continuously</div>
        </div>
      </div>
    </div>
  );
};