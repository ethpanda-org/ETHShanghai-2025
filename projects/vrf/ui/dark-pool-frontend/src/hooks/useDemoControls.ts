import { useState, useCallback } from 'react';
import { blockEngine } from '../services/blockEngine';

export function useDemoControls(initialSpeed: 'normal' | 'fast' | 'ultra-fast' = 'fast') {
  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState<'normal' | 'fast' | 'ultra-fast'>(initialSpeed);

  const handleSpeedChange = useCallback((newSpeed: 'normal' | 'fast' | 'ultra-fast') => {
    setSpeed(newSpeed);

    // Update block engine configuration
    const speedConfig = {
      normal: { BLOCK_DURATION: 5000, EPOCH_MATCHING_DELAY: 1000 },
      fast: { BLOCK_DURATION: 2000, EPOCH_MATCHING_DELAY: 500 },
      'ultra-fast': { BLOCK_DURATION: 1000, EPOCH_MATCHING_DELAY: 200 }
    };

    blockEngine.updateConfig(speedConfig[newSpeed]);
  }, []);

  const handleStartStop = useCallback(() => {
    if (isRunning) {
      blockEngine.stop();
      setIsRunning(false);
    } else {
      blockEngine.start();
      setIsRunning(true);
    }
  }, [isRunning]);

  return {
    isRunning,
    speed,
    handleSpeedChange,
    handleStartStop
  };
}