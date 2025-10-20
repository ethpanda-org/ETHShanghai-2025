'use client';

import React from 'react';
import { useRive, UseRiveParameters } from '@rive-app/react-canvas';
import { cn } from '@/utils/utils';

interface RiveAnimationProps {
  src: string;
  className?: string;
  autoplay?: boolean;
  stateMachines?: string | string[];
  animations?: string | string[];
  artboard?: string;
  onLoad?: () => void;
  onLoadError?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onLoop?: () => void;
  onStateChange?: (event: unknown) => void;
}

const RiveAnimation: React.FC<RiveAnimationProps> = ({
  src,
  className,
  autoplay = true,
  stateMachines,
  animations,
  artboard,
  onLoad,
  onLoadError,
  onPlay,
  onPause,
  onStop,
  onLoop,
  onStateChange,
}) => {
  const riveParams: UseRiveParameters = {
    src,
    autoplay,
    stateMachines,
    animations,
    artboard,
    onLoad,
    onLoadError,
    onPlay,
    onPause,
    onStop,
    onLoop,
    onStateChange,
  };

  const { RiveComponent } = useRive(riveParams);

  return (
    <div className={cn('w-full h-full', className)}>
      <RiveComponent className="w-full h-full" />
    </div>
  );
};

export default RiveAnimation;

// 导出 rive 实例的 hook，用于更高级的控制
export const useRiveAnimation = (params: UseRiveParameters) => {
  return useRive(params);
};